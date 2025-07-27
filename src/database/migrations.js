/**
 * Database Migration System for GrowmiesNJ Discord Bot
 * 
 * Handles schema creation, updates, and data migrations for production deployment
 * Compatible with Railway.app PostgreSQL and includes rollback capabilities
 */

const { sequelize, initializeAllModels } = require('./connection');

/**
 * Migration tracking table to ensure migrations run only once
 */
const MIGRATION_TABLE = 'migration_history';

/**
 * Create migration history table if it doesn't exist
 */
async function createMigrationTable() {
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS ${MIGRATION_TABLE} (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT NOW(),
        checksum VARCHAR(64),
        execution_time_ms INTEGER
      );
    `);
    console.log('[Migrations] ✅ Migration history table ready');
  } catch (error) {
    console.error('[Migrations] ❌ Failed to create migration history table:', error.message);
    throw error;
  }
}

/**
 * Check if migration has already been executed
 */
async function isMigrationExecuted(migrationName) {
  try {
    const result = await sequelize.query(
      `SELECT 1 FROM ${MIGRATION_TABLE} WHERE migration_name = ?`,
      {
        replacements: [migrationName],
        type: sequelize.QueryTypes.SELECT
      }
    );
    return result.length > 0;
  } catch (error) {
    console.error(`[Migrations] Error checking migration ${migrationName}:`, error.message);
    return false;
  }
}

/**
 * Record successful migration execution
 */
async function recordMigration(migrationName, executionTime, checksum = null) {
  try {
    await sequelize.query(
      `INSERT INTO ${MIGRATION_TABLE} (migration_name, execution_time_ms, checksum) VALUES (?, ?, ?)`,
      {
        replacements: [migrationName, executionTime, checksum],
        type: sequelize.QueryTypes.INSERT
      }
    );
    console.log(`[Migrations] ✅ Recorded migration: ${migrationName} (${executionTime}ms)`);
  } catch (error) {
    console.error(`[Migrations] Error recording migration ${migrationName}:`, error.message);
    throw error;
  }
}

/**
 * Migration definitions with rollback capabilities
 */
const migrations = [
  {
    name: '001_initial_schema',
    description: 'Create initial database schema with all tables',
    up: async () => {
      console.log('[Migration 001] Creating initial schema...');
      
      // Initialize all models which will create tables
      const models = initializeAllModels();
      
      // Force sync in migration context (only for initial setup)
      await sequelize.sync({ force: false, alter: true });
      
      console.log('[Migration 001] ✅ Initial schema created');
    },
    down: async () => {
      console.log('[Migration 001] Rolling back initial schema...');
      
      // Drop all tables (use with extreme caution)
      const tables = ['users', 'audit_logs', 'guild_settings', 'instagram_posts', 'bot_status'];
      
      for (const table of tables) {
        try {
          await sequelize.query(`DROP TABLE IF EXISTS ${table} CASCADE;`);
          console.log(`[Migration 001] Dropped table: ${table}`);
        } catch (error) {
          console.warn(`[Migration 001] Could not drop table ${table}:`, error.message);
        }
      }
      
      console.log('[Migration 001] ✅ Schema rollback completed');
    }
  },
  
  {
    name: '002_add_indexes',
    description: 'Add performance indexes to critical tables',
    up: async () => {
      console.log('[Migration 002] Adding performance indexes...');
      
      const indexes = [
        // User indexes
        'CREATE INDEX IF NOT EXISTS idx_users_guild_verification ON users(guild_id, verification_status);',
        'CREATE INDEX IF NOT EXISTS idx_users_verification_expires ON users(verification_expires) WHERE verification_expires IS NOT NULL;',
        'CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active) WHERE is_active = true;',
        
        // AuditLog indexes
        'CREATE INDEX IF NOT EXISTS idx_audit_logs_guild_action_time ON audit_logs(guild_id, action_type, created_at);',
        'CREATE INDEX IF NOT EXISTS idx_audit_logs_target_time ON audit_logs(target_user_id, created_at);',
        'CREATE INDEX IF NOT EXISTS idx_audit_logs_compliance ON audit_logs(compliance_flag, created_at);',
        
        // InstagramPost indexes
        'CREATE INDEX IF NOT EXISTS idx_instagram_posts_guild_status ON instagram_posts(is_approved, created_at);',
        'CREATE INDEX IF NOT EXISTS idx_instagram_posts_published ON instagram_posts(published_at DESC);',
        
        // BotStatus indexes
        'CREATE INDEX IF NOT EXISTS idx_bot_status_env_time ON bot_status(environment, created_at);',
        'CREATE INDEX IF NOT EXISTS idx_bot_status_health ON bot_status(status, created_at);'
      ];
      
      for (const indexQuery of indexes) {
        try {
          await sequelize.query(indexQuery);
          console.log(`[Migration 002] ✅ Created index`);
        } catch (error) {
          console.warn(`[Migration 002] Index creation warning:`, error.message);
        }
      }
      
      console.log('[Migration 002] ✅ Performance indexes added');
    },
    down: async () => {
      console.log('[Migration 002] Removing performance indexes...');
      
      const dropIndexes = [
        'DROP INDEX IF EXISTS idx_users_guild_verification;',
        'DROP INDEX IF EXISTS idx_users_verification_expires;',
        'DROP INDEX IF EXISTS idx_users_active;',
        'DROP INDEX IF EXISTS idx_audit_logs_guild_action_time;',
        'DROP INDEX IF EXISTS idx_audit_logs_target_time;',
        'DROP INDEX IF EXISTS idx_audit_logs_compliance;',
        'DROP INDEX IF EXISTS idx_instagram_posts_guild_status;',
        'DROP INDEX IF EXISTS idx_instagram_posts_published;',
        'DROP INDEX IF EXISTS idx_bot_status_env_time;',
        'DROP INDEX IF EXISTS idx_bot_status_health;'
      ];
      
      for (const dropQuery of dropIndexes) {
        try {
          await sequelize.query(dropQuery);
        } catch (error) {
          console.warn(`[Migration 002] Index removal warning:`, error.message);
        }
      }
      
      console.log('[Migration 002] ✅ Indexes removed');
    }
  },
  
  {
    name: '003_data_cleanup_procedures',
    description: 'Create stored procedures for data cleanup and maintenance',
    up: async () => {
      console.log('[Migration 003] Creating data cleanup procedures...');
      
      // Create function for cleaning up old audit logs
      await sequelize.query(`
        CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(retention_days INTEGER DEFAULT 365)
        RETURNS INTEGER AS $$
        DECLARE
          deleted_count INTEGER;
        BEGIN
          DELETE FROM audit_logs 
          WHERE created_at < NOW() - INTERVAL '1 day' * retention_days
          AND compliance_flag = false;
          
          GET DIAGNOSTICS deleted_count = ROW_COUNT;
          RETURN deleted_count;
        END;
        $$ LANGUAGE plpgsql;
      `);
      
      // Create function for cleaning up old Instagram posts
      await sequelize.query(`
        CREATE OR REPLACE FUNCTION cleanup_old_instagram_posts(retention_days INTEGER DEFAULT 90)
        RETURNS INTEGER AS $$
        DECLARE
          deleted_count INTEGER;
        BEGIN
          DELETE FROM instagram_posts 
          WHERE created_at < NOW() - INTERVAL '1 day' * retention_days;
          
          GET DIAGNOSTICS deleted_count = ROW_COUNT;
          RETURN deleted_count;
        END;
        $$ LANGUAGE plpgsql;
      `);
      
      // Create function for cleaning up old bot status records
      await sequelize.query(`
        CREATE OR REPLACE FUNCTION cleanup_old_bot_status(retention_days INTEGER DEFAULT 30)
        RETURNS INTEGER AS $$
        DECLARE
          deleted_count INTEGER;
        BEGIN
          -- Keep latest status for each environment, delete older records
          DELETE FROM bot_status 
          WHERE created_at < NOW() - INTERVAL '1 day' * retention_days
          AND id NOT IN (
            SELECT DISTINCT ON (environment) id 
            FROM bot_status 
            ORDER BY environment, created_at DESC
          );
          
          GET DIAGNOSTICS deleted_count = ROW_COUNT;
          RETURN deleted_count;
        END;
        $$ LANGUAGE plpgsql;
      `);
      
      console.log('[Migration 003] ✅ Data cleanup procedures created');
    },
    down: async () => {
      console.log('[Migration 003] Removing data cleanup procedures...');
      
      await sequelize.query('DROP FUNCTION IF EXISTS cleanup_old_audit_logs(INTEGER);');
      await sequelize.query('DROP FUNCTION IF EXISTS cleanup_old_instagram_posts(INTEGER);');
      await sequelize.query('DROP FUNCTION IF EXISTS cleanup_old_bot_status(INTEGER);');
      
      console.log('[Migration 003] ✅ Data cleanup procedures removed');
    }
  },
  
  {
    name: '004_leveling_system',
    description: 'Add cannabis-themed leveling system tables and fields',
    up: async () => {
      console.log('[Migration 004] Adding leveling system...');
      
      // Add leveling fields to users table
      const levelingFields = [
        'ALTER TABLE users ADD COLUMN IF NOT EXISTS total_xp INTEGER DEFAULT 0;',
        'ALTER TABLE users ADD COLUMN IF NOT EXISTS current_level INTEGER DEFAULT 1;',
        'ALTER TABLE users ADD COLUMN IF NOT EXISTS current_tier VARCHAR(20) DEFAULT \'seedling\';',
        'ALTER TABLE users ADD COLUMN IF NOT EXISTS last_xp_gain TIMESTAMP;',
        'ALTER TABLE users ADD COLUMN IF NOT EXISTS message_count INTEGER DEFAULT 0;',
        'ALTER TABLE users ADD COLUMN IF NOT EXISTS voice_minutes INTEGER DEFAULT 0;',
        'ALTER TABLE users ADD COLUMN IF NOT EXISTS reaction_count INTEGER DEFAULT 0;',
        'ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active TIMESTAMP DEFAULT NOW();'
      ];
      
      for (const fieldQuery of levelingFields) {
        try {
          await sequelize.query(fieldQuery);
          console.log('[Migration 004] ✅ Added leveling field to users');
        } catch (error) {
          console.warn('[Migration 004] Field addition warning:', error.message);
        }
      }
      
      // Create leveling_configs table
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS leveling_configs (
          id SERIAL PRIMARY KEY,
          guild_id VARCHAR(32) UNIQUE NOT NULL,
          enabled BOOLEAN DEFAULT true,
          base_xp INTEGER DEFAULT 15,
          max_xp INTEGER DEFAULT 25,
          cooldown_seconds INTEGER DEFAULT 60,
          level_multiplier DECIMAL(3,2) DEFAULT 1.5,
          seedling_role_id VARCHAR(32),
          growing_role_id VARCHAR(32),
          established_role_id VARCHAR(32),
          harvested_role_id VARCHAR(32),
          announcement_channel_id VARCHAR(32),
          leaderboard_channel_id VARCHAR(32),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);
      console.log('[Migration 004] ✅ Created leveling_configs table');
      
      // Add leveling system indexes
      const levelingIndexes = [
        'CREATE INDEX IF NOT EXISTS idx_users_total_xp ON users(total_xp DESC);',
        'CREATE INDEX IF NOT EXISTS idx_users_current_level ON users(current_level DESC);',
        'CREATE INDEX IF NOT EXISTS idx_users_current_tier ON users(current_tier);',
        'CREATE INDEX IF NOT EXISTS idx_users_guild_xp ON users(guild_id, total_xp DESC);',
        'CREATE INDEX IF NOT EXISTS idx_users_guild_level ON users(guild_id, current_level DESC);',
        'CREATE INDEX IF NOT EXISTS idx_users_last_xp_gain ON users(last_xp_gain) WHERE last_xp_gain IS NOT NULL;',
        'CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active) WHERE last_active IS NOT NULL;',
        'CREATE INDEX IF NOT EXISTS idx_leveling_configs_guild ON leveling_configs(guild_id);',
        'CREATE INDEX IF NOT EXISTS idx_leveling_configs_enabled ON leveling_configs(enabled) WHERE enabled = true;'
      ];
      
      for (const indexQuery of levelingIndexes) {
        try {
          await sequelize.query(indexQuery);
          console.log('[Migration 004] ✅ Created leveling index');
        } catch (error) {
          console.warn('[Migration 004] Index creation warning:', error.message);
        }
      }
      
      console.log('[Migration 004] ✅ Cannabis leveling system migration completed');
    },
    down: async () => {
      console.log('[Migration 004] Rolling back leveling system...');
      
      // Drop leveling indexes
      const dropLevelingIndexes = [
        'DROP INDEX IF EXISTS idx_users_total_xp;',
        'DROP INDEX IF EXISTS idx_users_current_level;',
        'DROP INDEX IF EXISTS idx_users_current_tier;',
        'DROP INDEX IF EXISTS idx_users_guild_xp;',
        'DROP INDEX IF EXISTS idx_users_guild_level;',
        'DROP INDEX IF EXISTS idx_users_last_xp_gain;',
        'DROP INDEX IF EXISTS idx_users_last_active;',
        'DROP INDEX IF EXISTS idx_leveling_configs_guild;',
        'DROP INDEX IF EXISTS idx_leveling_configs_enabled;'
      ];
      
      for (const dropQuery of dropLevelingIndexes) {
        try {
          await sequelize.query(dropQuery);
        } catch (error) {
          console.warn('[Migration 004] Index removal warning:', error.message);
        }
      }
      
      // Drop leveling_configs table
      await sequelize.query('DROP TABLE IF EXISTS leveling_configs CASCADE;');
      console.log('[Migration 004] Dropped leveling_configs table');
      
      // Remove leveling fields from users table
      const removeLevelingFields = [
        'ALTER TABLE users DROP COLUMN IF EXISTS total_xp;',
        'ALTER TABLE users DROP COLUMN IF EXISTS current_level;',
        'ALTER TABLE users DROP COLUMN IF EXISTS current_tier;',
        'ALTER TABLE users DROP COLUMN IF EXISTS last_xp_gain;',
        'ALTER TABLE users DROP COLUMN IF EXISTS message_count;',
        'ALTER TABLE users DROP COLUMN IF EXISTS voice_minutes;',
        'ALTER TABLE users DROP COLUMN IF EXISTS reaction_count;',
        'ALTER TABLE users DROP COLUMN IF EXISTS last_active;'
      ];
      
      for (const fieldQuery of removeLevelingFields) {
        try {
          await sequelize.query(fieldQuery);
        } catch (error) {
          console.warn('[Migration 004] Field removal warning:', error.message);
        }
      }
      
      console.log('[Migration 004] ✅ Leveling system rollback completed');
    }
  },
  
  {
    name: '005_music_bot_system',
    description: 'Add music bot system tables and relationships',
    up: async () => {
      console.log('[Migration 005] Adding music bot system...');
      
      // Create music_sessions table
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS music_sessions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          guild_id VARCHAR(20) NOT NULL,
          voice_channel_id VARCHAR(20) NOT NULL,
          text_channel_id VARCHAR(20) NOT NULL,
          created_by_user_id VARCHAR(20) NOT NULL,
          session_type VARCHAR(20) DEFAULT 'general' CHECK (session_type IN ('general', 'meditation', 'educational')),
          is_cannabis_content BOOLEAN DEFAULT false,
          requires_21_plus BOOLEAN DEFAULT false,
          status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended')),
          current_track_index INTEGER DEFAULT 0,
          volume_level INTEGER DEFAULT 50 CHECK (volume_level >= 0 AND volume_level <= 100),
          session_metadata JSONB DEFAULT '{}',
          started_at TIMESTAMP DEFAULT NOW(),
          ended_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);
      console.log('[Migration 005] ✅ Created music_sessions table');
      
      // Create music_queues table
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS music_queues (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          session_id UUID NOT NULL REFERENCES music_sessions(id) ON DELETE CASCADE,
          track_url VARCHAR(500) NOT NULL,
          track_title VARCHAR(200),
          track_duration_seconds INTEGER,
          requested_by_user_id VARCHAR(20) NOT NULL,
          queue_position INTEGER NOT NULL CHECK (queue_position >= 1),
          track_source VARCHAR(20) DEFAULT 'youtube' CHECK (track_source IN ('youtube', 'spotify', 'soundcloud', 'local', 'url')),
          is_cannabis_content BOOLEAN DEFAULT false,
          track_metadata JSONB DEFAULT '{}',
          added_at TIMESTAMP DEFAULT NOW(),
          played_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);
      console.log('[Migration 005] ✅ Created music_queues table');
      
      // Create user_music_preferences table
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS user_music_preferences (
          user_id VARCHAR(20) NOT NULL,
          guild_id VARCHAR(20) NOT NULL,
          preferred_volume INTEGER DEFAULT 50 CHECK (preferred_volume >= 0 AND preferred_volume <= 100),
          auto_queue_enabled BOOLEAN DEFAULT false,
          meditation_mode_enabled BOOLEAN DEFAULT false,
          explicit_content_filter BOOLEAN DEFAULT true,
          favorite_genres JSONB DEFAULT '[]',
          blocked_sources JSONB DEFAULT '[]',
          cannabis_music_enabled BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          PRIMARY KEY (user_id, guild_id),
          FOREIGN KEY (user_id) REFERENCES users(discord_id)
        );
      `);
      console.log('[Migration 005] ✅ Created user_music_preferences table');
      
      // Add music system indexes
      const musicIndexes = [
        // Music Sessions indexes
        'CREATE INDEX IF NOT EXISTS idx_music_sessions_guild ON music_sessions(guild_id);',
        'CREATE INDEX IF NOT EXISTS idx_music_sessions_status ON music_sessions(status);',
        'CREATE INDEX IF NOT EXISTS idx_music_sessions_active ON music_sessions(guild_id, status) WHERE status = \'active\';',
        'CREATE INDEX IF NOT EXISTS idx_music_sessions_voice_channel ON music_sessions(voice_channel_id);',
        'CREATE INDEX IF NOT EXISTS idx_music_sessions_creator ON music_sessions(created_by_user_id);',
        'CREATE INDEX IF NOT EXISTS idx_music_sessions_cannabis ON music_sessions(is_cannabis_content, requires_21_plus);',
        'CREATE INDEX IF NOT EXISTS idx_music_sessions_type ON music_sessions(session_type);',
        'CREATE INDEX IF NOT EXISTS idx_music_sessions_started ON music_sessions(started_at);',
        
        // Music Queue indexes
        'CREATE INDEX IF NOT EXISTS idx_music_queue_session ON music_queues(session_id);',
        'CREATE INDEX IF NOT EXISTS idx_music_queue_position ON music_queues(session_id, queue_position);',
        'CREATE INDEX IF NOT EXISTS idx_music_queue_unplayed ON music_queues(session_id, played_at) WHERE played_at IS NULL;',
        'CREATE INDEX IF NOT EXISTS idx_music_queue_requested_by ON music_queues(requested_by_user_id);',
        'CREATE INDEX IF NOT EXISTS idx_music_queue_cannabis ON music_queues(is_cannabis_content);',
        'CREATE INDEX IF NOT EXISTS idx_music_queue_source ON music_queues(track_source);',
        'CREATE INDEX IF NOT EXISTS idx_music_queue_added ON music_queues(added_at);',
        
        // User Music Preferences indexes
        'CREATE INDEX IF NOT EXISTS idx_user_music_prefs_guild ON user_music_preferences(guild_id);',
        'CREATE INDEX IF NOT EXISTS idx_user_music_prefs_cannabis ON user_music_preferences(cannabis_music_enabled) WHERE cannabis_music_enabled = true;',
        'CREATE INDEX IF NOT EXISTS idx_user_music_prefs_auto_queue ON user_music_preferences(auto_queue_enabled) WHERE auto_queue_enabled = true;',
        'CREATE INDEX IF NOT EXISTS idx_user_music_prefs_meditation ON user_music_preferences(meditation_mode_enabled) WHERE meditation_mode_enabled = true;',
        'CREATE INDEX IF NOT EXISTS idx_user_music_prefs_explicit_filter ON user_music_preferences(explicit_content_filter);',
        'CREATE INDEX IF NOT EXISTS idx_user_music_prefs_volume ON user_music_preferences(preferred_volume);'
      ];
      
      for (const indexQuery of musicIndexes) {
        try {
          await sequelize.query(indexQuery);
          console.log('[Migration 005] ✅ Created music system index');
        } catch (error) {
          console.warn('[Migration 005] Index creation warning:', error.message);
        }
      }
      
      console.log('[Migration 005] ✅ Music bot system migration completed');
    },
    down: async () => {
      console.log('[Migration 005] Rolling back music bot system...');
      
      // Drop music system indexes
      const dropMusicIndexes = [
        // Music Sessions indexes
        'DROP INDEX IF EXISTS idx_music_sessions_guild;',
        'DROP INDEX IF EXISTS idx_music_sessions_status;',
        'DROP INDEX IF EXISTS idx_music_sessions_active;',
        'DROP INDEX IF EXISTS idx_music_sessions_voice_channel;',
        'DROP INDEX IF EXISTS idx_music_sessions_creator;',
        'DROP INDEX IF EXISTS idx_music_sessions_cannabis;',
        'DROP INDEX IF EXISTS idx_music_sessions_type;',
        'DROP INDEX IF EXISTS idx_music_sessions_started;',
        
        // Music Queue indexes
        'DROP INDEX IF EXISTS idx_music_queue_session;',
        'DROP INDEX IF EXISTS idx_music_queue_position;',
        'DROP INDEX IF EXISTS idx_music_queue_unplayed;',
        'DROP INDEX IF EXISTS idx_music_queue_requested_by;',
        'DROP INDEX IF EXISTS idx_music_queue_cannabis;',
        'DROP INDEX IF EXISTS idx_music_queue_source;',
        'DROP INDEX IF EXISTS idx_music_queue_added;',
        
        // User Music Preferences indexes
        'DROP INDEX IF EXISTS idx_user_music_prefs_guild;',
        'DROP INDEX IF EXISTS idx_user_music_prefs_cannabis;',
        'DROP INDEX IF EXISTS idx_user_music_prefs_auto_queue;',
        'DROP INDEX IF EXISTS idx_user_music_prefs_meditation;',
        'DROP INDEX IF EXISTS idx_user_music_prefs_explicit_filter;',
        'DROP INDEX IF EXISTS idx_user_music_prefs_volume;'
      ];
      
      for (const dropQuery of dropMusicIndexes) {
        try {
          await sequelize.query(dropQuery);
        } catch (error) {
          console.warn('[Migration 005] Index removal warning:', error.message);
        }
      }
      
      // Drop music system tables (order matters due to foreign keys)
      await sequelize.query('DROP TABLE IF EXISTS user_music_preferences CASCADE;');
      console.log('[Migration 005] Dropped user_music_preferences table');
      
      await sequelize.query('DROP TABLE IF EXISTS music_queues CASCADE;');
      console.log('[Migration 005] Dropped music_queues table');
      
      await sequelize.query('DROP TABLE IF EXISTS music_sessions CASCADE;');
      console.log('[Migration 005] Dropped music_sessions table');
      
      console.log('[Migration 005] ✅ Music bot system rollback completed');
    }
  },
  
  {
    name: '006_llm_chat_system',
    description: 'Add LLM chat integration tables and relationships',
    up: async () => {
      console.log('[Migration 006] Adding LLM chat system...');
      
      // Create llm_conversations table
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS llm_conversations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id VARCHAR(20) NOT NULL,
          guild_id VARCHAR(20) NOT NULL,
          channel_id VARCHAR(20) NOT NULL,
          conversation_type VARCHAR(20) DEFAULT 'general' CHECK (conversation_type IN ('general', 'cannabis_education', 'strain_advice', 'legal_info', 'grow_tips')),
          requires_21_plus BOOLEAN DEFAULT false,
          context_window_size INTEGER DEFAULT 10 CHECK (context_window_size >= 1 AND context_window_size <= 50),
          total_messages INTEGER DEFAULT 0,
          total_tokens_used INTEGER DEFAULT 0,
          started_at TIMESTAMP DEFAULT NOW(),
          last_message_at TIMESTAMP DEFAULT NOW(),
          ended_at TIMESTAMP,
          is_active BOOLEAN DEFAULT true,
          conversation_metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);
      console.log('[Migration 006] ✅ Created llm_conversations table');
      
      // Create llm_messages table
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS llm_messages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          conversation_id UUID NOT NULL REFERENCES llm_conversations(id) ON DELETE CASCADE,
          message_role VARCHAR(20) NOT NULL CHECK (message_role IN ('user', 'assistant', 'system')),
          message_content TEXT NOT NULL,
          tokens_used INTEGER DEFAULT 0,
          contains_cannabis_content BOOLEAN DEFAULT false,
          compliance_filtered BOOLEAN DEFAULT false,
          message_metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);
      console.log('[Migration 006] ✅ Created llm_messages table');
      
      // Create llm_user_preferences table
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS llm_user_preferences (
          user_id VARCHAR(20) NOT NULL,
          guild_id VARCHAR(20) NOT NULL,
          cannabis_assistance_enabled BOOLEAN DEFAULT false,
          preferred_response_style VARCHAR(20) DEFAULT 'casual' CHECK (preferred_response_style IN ('casual', 'educational', 'technical')),
          max_response_length INTEGER DEFAULT 2000 CHECK (max_response_length >= 100 AND max_response_length <= 4000),
          enable_strain_recommendations BOOLEAN DEFAULT false,
          enable_legal_advice BOOLEAN DEFAULT false,
          content_filter_level VARCHAR(20) DEFAULT 'moderate' CHECK (content_filter_level IN ('strict', 'moderate', 'relaxed')),
          conversation_history_enabled BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          PRIMARY KEY (user_id, guild_id),
          FOREIGN KEY (user_id) REFERENCES users(discord_id)
        );
      `);
      console.log('[Migration 006] ✅ Created llm_user_preferences table');
      
      // Create cannabis_knowledge_base table
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS cannabis_knowledge_base (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          topic_category VARCHAR(20) NOT NULL CHECK (topic_category IN ('strains', 'cultivation', 'legal', 'medical', 'consumption', 'safety')),
          topic_title VARCHAR(200) NOT NULL,
          content_text TEXT NOT NULL,
          requires_21_plus BOOLEAN DEFAULT true,
          source_url VARCHAR(500),
          last_verified_at TIMESTAMP,
          accuracy_rating INTEGER DEFAULT 5 CHECK (accuracy_rating >= 1 AND accuracy_rating <= 10),
          usage_count INTEGER DEFAULT 0,
          is_active BOOLEAN DEFAULT true,
          created_by_user_id VARCHAR(20),
          approved_by_admin BOOLEAN DEFAULT false,
          tags TEXT[] DEFAULT '{}',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);
      console.log('[Migration 006] ✅ Created cannabis_knowledge_base table');
      
      // Add LLM system indexes
      const llmIndexes = [
        // LLM Conversations indexes
        'CREATE INDEX IF NOT EXISTS idx_llm_conversation_user_guild ON llm_conversations(user_id, guild_id);',
        'CREATE INDEX IF NOT EXISTS idx_llm_conversation_channel ON llm_conversations(channel_id);',
        'CREATE INDEX IF NOT EXISTS idx_llm_conversation_active ON llm_conversations(is_active) WHERE is_active = true;',
        'CREATE INDEX IF NOT EXISTS idx_llm_conversation_type ON llm_conversations(conversation_type);',
        'CREATE INDEX IF NOT EXISTS idx_llm_conversation_cannabis ON llm_conversations(requires_21_plus) WHERE requires_21_plus = true;',
        'CREATE INDEX IF NOT EXISTS idx_llm_conversation_last_message ON llm_conversations(last_message_at);',
        'CREATE INDEX IF NOT EXISTS idx_llm_conversation_user_active ON llm_conversations(user_id, guild_id, is_active);',
        'CREATE INDEX IF NOT EXISTS idx_llm_conversation_channel_active ON llm_conversations(channel_id, is_active, last_message_at);',
        
        // LLM Messages indexes
        'CREATE INDEX IF NOT EXISTS idx_llm_message_conversation ON llm_messages(conversation_id);',
        'CREATE INDEX IF NOT EXISTS idx_llm_message_role ON llm_messages(message_role);',
        'CREATE INDEX IF NOT EXISTS idx_llm_message_cannabis ON llm_messages(contains_cannabis_content) WHERE contains_cannabis_content = true;',
        'CREATE INDEX IF NOT EXISTS idx_llm_message_filtered ON llm_messages(compliance_filtered) WHERE compliance_filtered = true;',
        'CREATE INDEX IF NOT EXISTS idx_llm_message_created ON llm_messages(created_at);',
        'CREATE INDEX IF NOT EXISTS idx_llm_message_conversation_created ON llm_messages(conversation_id, created_at);',
        'CREATE INDEX IF NOT EXISTS idx_llm_message_conversation_role ON llm_messages(conversation_id, message_role, created_at);',
        'CREATE INDEX IF NOT EXISTS idx_llm_message_tokens ON llm_messages(tokens_used) WHERE tokens_used > 0;',
        
        // LLM User Preferences indexes
        'CREATE INDEX IF NOT EXISTS idx_llm_user_prefs_guild ON llm_user_preferences(guild_id);',
        'CREATE INDEX IF NOT EXISTS idx_llm_user_prefs_cannabis ON llm_user_preferences(cannabis_assistance_enabled) WHERE cannabis_assistance_enabled = true;',
        'CREATE INDEX IF NOT EXISTS idx_llm_user_prefs_strain_recs ON llm_user_preferences(enable_strain_recommendations) WHERE enable_strain_recommendations = true;',
        'CREATE INDEX IF NOT EXISTS idx_llm_user_prefs_legal_advice ON llm_user_preferences(enable_legal_advice) WHERE enable_legal_advice = true;',
        'CREATE INDEX IF NOT EXISTS idx_llm_user_prefs_response_style ON llm_user_preferences(preferred_response_style);',
        'CREATE INDEX IF NOT EXISTS idx_llm_user_prefs_filter_level ON llm_user_preferences(content_filter_level);',
        'CREATE INDEX IF NOT EXISTS idx_llm_user_prefs_guild_cannabis ON llm_user_preferences(guild_id, cannabis_assistance_enabled);',
        
        // Cannabis Knowledge Base indexes
        'CREATE INDEX IF NOT EXISTS idx_cannabis_knowledge_category ON cannabis_knowledge_base(topic_category);',
        'CREATE INDEX IF NOT EXISTS idx_cannabis_knowledge_active_approved ON cannabis_knowledge_base(is_active, approved_by_admin) WHERE is_active = true AND approved_by_admin = true;',
        'CREATE INDEX IF NOT EXISTS idx_cannabis_knowledge_21_plus ON cannabis_knowledge_base(requires_21_plus);',
        'CREATE INDEX IF NOT EXISTS idx_cannabis_knowledge_accuracy ON cannabis_knowledge_base(accuracy_rating);',
        'CREATE INDEX IF NOT EXISTS idx_cannabis_knowledge_usage ON cannabis_knowledge_base(usage_count);',
        'CREATE INDEX IF NOT EXISTS idx_cannabis_knowledge_title ON cannabis_knowledge_base(topic_title);',
        'CREATE INDEX IF NOT EXISTS idx_cannabis_knowledge_tags ON cannabis_knowledge_base USING gin(tags);',
        'CREATE INDEX IF NOT EXISTS idx_cannabis_knowledge_verified ON cannabis_knowledge_base(last_verified_at);',
        'CREATE INDEX IF NOT EXISTS idx_cannabis_knowledge_category_rating ON cannabis_knowledge_base(topic_category, accuracy_rating, usage_count);',
        'CREATE INDEX IF NOT EXISTS idx_cannabis_knowledge_search ON cannabis_knowledge_base(topic_category, is_active, approved_by_admin, accuracy_rating);'
      ];
      
      for (const indexQuery of llmIndexes) {
        try {
          await sequelize.query(indexQuery);
          console.log('[Migration 006] ✅ Created LLM system index');
        } catch (error) {
          console.warn('[Migration 006] Index creation warning:', error.message);
        }
      }
      
      console.log('[Migration 006] ✅ LLM chat system migration completed');
    },
    down: async () => {
      console.log('[Migration 006] Rolling back LLM chat system...');
      
      // Drop LLM system indexes
      const dropLlmIndexes = [
        // LLM Conversations indexes
        'DROP INDEX IF EXISTS idx_llm_conversation_user_guild;',
        'DROP INDEX IF EXISTS idx_llm_conversation_channel;',
        'DROP INDEX IF EXISTS idx_llm_conversation_active;',
        'DROP INDEX IF EXISTS idx_llm_conversation_type;',
        'DROP INDEX IF EXISTS idx_llm_conversation_cannabis;',
        'DROP INDEX IF EXISTS idx_llm_conversation_last_message;',
        'DROP INDEX IF EXISTS idx_llm_conversation_user_active;',
        'DROP INDEX IF EXISTS idx_llm_conversation_channel_active;',
        
        // LLM Messages indexes
        'DROP INDEX IF EXISTS idx_llm_message_conversation;',
        'DROP INDEX IF EXISTS idx_llm_message_role;',
        'DROP INDEX IF EXISTS idx_llm_message_cannabis;',
        'DROP INDEX IF EXISTS idx_llm_message_filtered;',
        'DROP INDEX IF EXISTS idx_llm_message_created;',
        'DROP INDEX IF EXISTS idx_llm_message_conversation_created;',
        'DROP INDEX IF EXISTS idx_llm_message_conversation_role;',
        'DROP INDEX IF EXISTS idx_llm_message_tokens;',
        
        // LLM User Preferences indexes
        'DROP INDEX IF EXISTS idx_llm_user_prefs_guild;',
        'DROP INDEX IF EXISTS idx_llm_user_prefs_cannabis;',
        'DROP INDEX IF EXISTS idx_llm_user_prefs_strain_recs;',
        'DROP INDEX IF EXISTS idx_llm_user_prefs_legal_advice;',
        'DROP INDEX IF EXISTS idx_llm_user_prefs_response_style;',
        'DROP INDEX IF EXISTS idx_llm_user_prefs_filter_level;',
        'DROP INDEX IF EXISTS idx_llm_user_prefs_guild_cannabis;',
        
        // Cannabis Knowledge Base indexes
        'DROP INDEX IF EXISTS idx_cannabis_knowledge_category;',
        'DROP INDEX IF EXISTS idx_cannabis_knowledge_active_approved;',
        'DROP INDEX IF EXISTS idx_cannabis_knowledge_21_plus;',
        'DROP INDEX IF EXISTS idx_cannabis_knowledge_accuracy;',
        'DROP INDEX IF EXISTS idx_cannabis_knowledge_usage;',
        'DROP INDEX IF EXISTS idx_cannabis_knowledge_title;',
        'DROP INDEX IF EXISTS idx_cannabis_knowledge_tags;',
        'DROP INDEX IF EXISTS idx_cannabis_knowledge_verified;',
        'DROP INDEX IF EXISTS idx_cannabis_knowledge_category_rating;',
        'DROP INDEX IF EXISTS idx_cannabis_knowledge_search;'
      ];
      
      for (const dropQuery of dropLlmIndexes) {
        try {
          await sequelize.query(dropQuery);
        } catch (error) {
          console.warn('[Migration 006] Index removal warning:', error.message);
        }
      }
      
      // Drop LLM system tables (order matters due to foreign keys)
      await sequelize.query('DROP TABLE IF EXISTS llm_messages CASCADE;');
      console.log('[Migration 006] Dropped llm_messages table');
      
      await sequelize.query('DROP TABLE IF EXISTS llm_user_preferences CASCADE;');
      console.log('[Migration 006] Dropped llm_user_preferences table');
      
      await sequelize.query('DROP TABLE IF EXISTS cannabis_knowledge_base CASCADE;');
      console.log('[Migration 006] Dropped cannabis_knowledge_base table');
      
      await sequelize.query('DROP TABLE IF EXISTS llm_conversations CASCADE;');
      console.log('[Migration 006] Dropped llm_conversations table');
      
      console.log('[Migration 006] ✅ LLM chat system rollback completed');
    }
  },
  
  {
    name: '007_economy_system',
    description: 'Add cannabis-compliant economy system tables and relationships',
    up: async () => {
      console.log('[Migration 007] Adding economy system...');
      
      // Create economies table (user economy tracking)
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS economies (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id VARCHAR(20) NOT NULL,
          guild_id VARCHAR(20) NOT NULL,
          grow_coins INTEGER DEFAULT 0 CHECK (grow_coins >= 0),
          premium_seeds INTEGER DEFAULT 0 CHECK (premium_seeds >= 0),
          total_earned INTEGER DEFAULT 0 CHECK (total_earned >= 0),
          total_spent INTEGER DEFAULT 0 CHECK (total_spent >= 0),
          daily_streak INTEGER DEFAULT 0 CHECK (daily_streak >= 0),
          work_streak INTEGER DEFAULT 0 CHECK (work_streak >= 0),
          last_daily_reward TIMESTAMP,
          last_work_time TIMESTAMP,
          lifetime_purchases INTEGER DEFAULT 0,
          lifetime_gifts_sent INTEGER DEFAULT 0,
          lifetime_gifts_received INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(user_id, guild_id),
          FOREIGN KEY (user_id) REFERENCES users(discord_id)
        );
      `);
      console.log('[Migration 007] ✅ Created economies table');
      
      // Create economy_items table (shop items)
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS economy_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(100) NOT NULL,
          description TEXT NOT NULL,
          category VARCHAR(30) NOT NULL CHECK (category IN ('tools', 'decorations', 'cannabis_collectibles', 'profile_items', 'consumables', 'special')),
          rarity VARCHAR(20) DEFAULT 'common' CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
          grow_coin_price INTEGER DEFAULT 0 CHECK (grow_coin_price >= 0),
          premium_seed_price INTEGER DEFAULT 0 CHECK (premium_seed_price >= 0),
          age_restricted BOOLEAN DEFAULT false,
          is_active BOOLEAN DEFAULT true,
          is_purchasable BOOLEAN DEFAULT true,
          is_tradeable BOOLEAN DEFAULT true,
          is_giftable BOOLEAN DEFAULT true,
          max_quantity INTEGER DEFAULT 1 CHECK (max_quantity >= 1),
          effect_duration_hours INTEGER,
          effect_description TEXT,
          emoji VARCHAR(10),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          CONSTRAINT valid_price CHECK (grow_coin_price > 0 OR premium_seed_price > 0)
        );
      `);
      console.log('[Migration 007] ✅ Created economy_items table');
      
      // Create economy_transactions table (transaction history)
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS economy_transactions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id VARCHAR(20) NOT NULL,
          guild_id VARCHAR(20) NOT NULL,
          transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('purchase', 'gift_sent', 'gift_received', 'daily_reward', 'work_reward', 'admin_adjustment', 'trade_sent', 'trade_received')),
          grow_coins_change INTEGER DEFAULT 0,
          premium_seeds_change INTEGER DEFAULT 0,
          item_id UUID,
          item_quantity INTEGER DEFAULT 1,
          related_user_id VARCHAR(20),
          description TEXT,
          compliance_notes TEXT,
          age_verified_at_time BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT NOW(),
          FOREIGN KEY (user_id) REFERENCES users(discord_id),
          FOREIGN KEY (item_id) REFERENCES economy_items(id)
        );
      `);
      console.log('[Migration 007] ✅ Created economy_transactions table');
      
      // Create user_inventories table (user-owned items)
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS user_inventories (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id VARCHAR(20) NOT NULL,
          guild_id VARCHAR(20) NOT NULL,
          item_id UUID NOT NULL,
          quantity INTEGER DEFAULT 1 CHECK (quantity >= 0),
          acquired_at TIMESTAMP DEFAULT NOW(),
          last_used TIMESTAMP,
          uses_remaining INTEGER,
          is_equipped BOOLEAN DEFAULT false,
          trade_locked_until TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          FOREIGN KEY (user_id) REFERENCES users(discord_id),
          FOREIGN KEY (item_id) REFERENCES economy_items(id),
          UNIQUE(user_id, guild_id, item_id)
        );
      `);
      console.log('[Migration 007] ✅ Created user_inventories table');
      
      // Create economy_shops table (shop configuration)
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS economy_shops (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          guild_id VARCHAR(20) NOT NULL,
          category VARCHAR(30) NOT NULL,
          display_name VARCHAR(50) NOT NULL,
          description TEXT,
          age_restricted BOOLEAN DEFAULT false,
          is_active BOOLEAN DEFAULT true,
          featured_item_ids UUID[] DEFAULT '{}',
          sort_order INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(guild_id, category)
        );
      `);
      console.log('[Migration 007] ✅ Created economy_shops table');
      
      // Add economy system indexes for performance
      const economyIndexes = [
        // Economies table indexes
        'CREATE INDEX IF NOT EXISTS idx_economies_user_guild ON economies(user_id, guild_id);',
        'CREATE INDEX IF NOT EXISTS idx_economies_guild_coins ON economies(guild_id, grow_coins DESC);',
        'CREATE INDEX IF NOT EXISTS idx_economies_guild_seeds ON economies(guild_id, premium_seeds DESC);',
        'CREATE INDEX IF NOT EXISTS idx_economies_daily_streak ON economies(daily_streak DESC);',
        'CREATE INDEX IF NOT EXISTS idx_economies_work_streak ON economies(work_streak DESC);',
        'CREATE INDEX IF NOT EXISTS idx_economies_last_daily ON economies(last_daily_reward) WHERE last_daily_reward IS NOT NULL;',
        'CREATE INDEX IF NOT EXISTS idx_economies_last_work ON economies(last_work_time) WHERE last_work_time IS NOT NULL;',
        'CREATE INDEX IF NOT EXISTS idx_economies_total_earned ON economies(total_earned DESC);',
        'CREATE INDEX IF NOT EXISTS idx_economies_leaderboard ON economies(guild_id, grow_coins DESC, premium_seeds DESC);',
        
        // Economy Items table indexes
        'CREATE INDEX IF NOT EXISTS idx_economy_items_category ON economy_items(category);',
        'CREATE INDEX IF NOT EXISTS idx_economy_items_rarity ON economy_items(rarity);',
        'CREATE INDEX IF NOT EXISTS idx_economy_items_active ON economy_items(is_active) WHERE is_active = true;',
        'CREATE INDEX IF NOT EXISTS idx_economy_items_purchasable ON economy_items(is_purchasable, is_active);',
        'CREATE INDEX IF NOT EXISTS idx_economy_items_age_restricted ON economy_items(age_restricted);',
        'CREATE INDEX IF NOT EXISTS idx_economy_items_price_range ON economy_items(grow_coin_price, premium_seed_price);',
        'CREATE INDEX IF NOT EXISTS idx_economy_items_shop_display ON economy_items(category, is_active, is_purchasable);',
        
        // Economy Transactions table indexes
        'CREATE INDEX IF NOT EXISTS idx_economy_transactions_user_guild ON economy_transactions(user_id, guild_id);',
        'CREATE INDEX IF NOT EXISTS idx_economy_transactions_type ON economy_transactions(transaction_type);',
        'CREATE INDEX IF NOT EXISTS idx_economy_transactions_created ON economy_transactions(created_at DESC);',
        'CREATE INDEX IF NOT EXISTS idx_economy_transactions_item ON economy_transactions(item_id) WHERE item_id IS NOT NULL;',
        'CREATE INDEX IF NOT EXISTS idx_economy_transactions_related_user ON economy_transactions(related_user_id) WHERE related_user_id IS NOT NULL;',
        'CREATE INDEX IF NOT EXISTS idx_economy_transactions_user_type ON economy_transactions(user_id, transaction_type, created_at);',
        'CREATE INDEX IF NOT EXISTS idx_economy_transactions_compliance ON economy_transactions(age_verified_at_time, created_at);',
        'CREATE INDEX IF NOT EXISTS idx_economy_transactions_guild_activity ON economy_transactions(guild_id, created_at DESC);',
        
        // User Inventories table indexes
        'CREATE INDEX IF NOT EXISTS idx_user_inventories_user_guild ON user_inventories(user_id, guild_id);',
        'CREATE INDEX IF NOT EXISTS idx_user_inventories_item ON user_inventories(item_id);',
        'CREATE INDEX IF NOT EXISTS idx_user_inventories_equipped ON user_inventories(is_equipped, user_id) WHERE is_equipped = true;',
        'CREATE INDEX IF NOT EXISTS idx_user_inventories_quantity ON user_inventories(quantity) WHERE quantity > 0;',
        'CREATE INDEX IF NOT EXISTS idx_user_inventories_trade_locked ON user_inventories(trade_locked_until) WHERE trade_locked_until IS NOT NULL;',
        'CREATE INDEX IF NOT EXISTS idx_user_inventories_last_used ON user_inventories(last_used) WHERE last_used IS NOT NULL;',
        'CREATE INDEX IF NOT EXISTS idx_user_inventories_user_item ON user_inventories(user_id, guild_id, item_id);',
        
        // Economy Shops table indexes
        'CREATE INDEX IF NOT EXISTS idx_economy_shops_guild ON economy_shops(guild_id);',
        'CREATE INDEX IF NOT EXISTS idx_economy_shops_category ON economy_shops(category);',
        'CREATE INDEX IF NOT EXISTS idx_economy_shops_active ON economy_shops(is_active) WHERE is_active = true;',
        'CREATE INDEX IF NOT EXISTS idx_economy_shops_age_restricted ON economy_shops(age_restricted);',
        'CREATE INDEX IF NOT EXISTS idx_economy_shops_sort ON economy_shops(guild_id, sort_order, category);',
        'CREATE INDEX IF NOT EXISTS idx_economy_shops_featured ON economy_shops USING gin(featured_item_ids);'
      ];
      
      for (const indexQuery of economyIndexes) {
        try {
          await sequelize.query(indexQuery);
          console.log('[Migration 007] ✅ Created economy system index');
        } catch (error) {
          console.warn('[Migration 007] Index creation warning:', error.message);
        }
      }
      
      // Create default shop categories for each guild (will be populated later)
      await sequelize.query(`
        INSERT INTO economy_shops (guild_id, category, display_name, description, age_restricted, sort_order)
        SELECT DISTINCT
          u.guild_id,
          'tools' as category,
          'Grow Tools' as display_name,
          'Essential tools for any cannabis enthusiast' as description,
          false as age_restricted,
          1 as sort_order
        FROM users u
        WHERE u.guild_id IS NOT NULL
        ON CONFLICT (guild_id, category) DO NOTHING;
      `);
      
      await sequelize.query(`
        INSERT INTO economy_shops (guild_id, category, display_name, description, age_restricted, sort_order)
        SELECT DISTINCT
          u.guild_id,
          'decorations' as category,
          'Profile Decorations' as display_name,
          'Customize your profile with these items' as description,
          false as age_restricted,
          2 as sort_order
        FROM users u
        WHERE u.guild_id IS NOT NULL
        ON CONFLICT (guild_id, category) DO NOTHING;
      `);
      
      await sequelize.query(`
        INSERT INTO economy_shops (guild_id, category, display_name, description, age_restricted, sort_order)
        SELECT DISTINCT
          u.guild_id,
          'cannabis_collectibles' as category,
          'Cannabis Collectibles' as display_name,
          'Premium cannabis-themed collectibles (21+ only)' as description,
          true as age_restricted,
          3 as sort_order
        FROM users u
        WHERE u.guild_id IS NOT NULL
        ON CONFLICT (guild_id, category) DO NOTHING;
      `);
      
      console.log('[Migration 007] ✅ Created default shop categories');
      
      console.log('[Migration 007] ✅ Economy system migration completed');
    },
    down: async () => {
      console.log('[Migration 007] Rolling back economy system...');
      
      // Drop economy system indexes
      const dropEconomyIndexes = [
        // Economies table indexes
        'DROP INDEX IF EXISTS idx_economies_user_guild;',
        'DROP INDEX IF EXISTS idx_economies_guild_coins;',
        'DROP INDEX IF EXISTS idx_economies_guild_seeds;',
        'DROP INDEX IF EXISTS idx_economies_daily_streak;',
        'DROP INDEX IF EXISTS idx_economies_work_streak;',
        'DROP INDEX IF EXISTS idx_economies_last_daily;',
        'DROP INDEX IF EXISTS idx_economies_last_work;',
        'DROP INDEX IF EXISTS idx_economies_total_earned;',
        'DROP INDEX IF EXISTS idx_economies_leaderboard;',
        
        // Economy Items table indexes
        'DROP INDEX IF EXISTS idx_economy_items_category;',
        'DROP INDEX IF EXISTS idx_economy_items_rarity;',
        'DROP INDEX IF EXISTS idx_economy_items_active;',
        'DROP INDEX IF EXISTS idx_economy_items_purchasable;',
        'DROP INDEX IF EXISTS idx_economy_items_age_restricted;',
        'DROP INDEX IF EXISTS idx_economy_items_price_range;',
        'DROP INDEX IF EXISTS idx_economy_items_shop_display;',
        
        // Economy Transactions table indexes
        'DROP INDEX IF EXISTS idx_economy_transactions_user_guild;',
        'DROP INDEX IF EXISTS idx_economy_transactions_type;',
        'DROP INDEX IF EXISTS idx_economy_transactions_created;',
        'DROP INDEX IF EXISTS idx_economy_transactions_item;',
        'DROP INDEX IF EXISTS idx_economy_transactions_related_user;',
        'DROP INDEX IF EXISTS idx_economy_transactions_user_type;',
        'DROP INDEX IF EXISTS idx_economy_transactions_compliance;',
        'DROP INDEX IF EXISTS idx_economy_transactions_guild_activity;',
        
        // User Inventories table indexes
        'DROP INDEX IF EXISTS idx_user_inventories_user_guild;',
        'DROP INDEX IF EXISTS idx_user_inventories_item;',
        'DROP INDEX IF EXISTS idx_user_inventories_equipped;',
        'DROP INDEX IF EXISTS idx_user_inventories_quantity;',
        'DROP INDEX IF EXISTS idx_user_inventories_trade_locked;',
        'DROP INDEX IF EXISTS idx_user_inventories_last_used;',
        'DROP INDEX IF EXISTS idx_user_inventories_user_item;',
        
        // Economy Shops table indexes
        'DROP INDEX IF EXISTS idx_economy_shops_guild;',
        'DROP INDEX IF EXISTS idx_economy_shops_category;',
        'DROP INDEX IF EXISTS idx_economy_shops_active;',
        'DROP INDEX IF EXISTS idx_economy_shops_age_restricted;',
        'DROP INDEX IF EXISTS idx_economy_shops_sort;',
        'DROP INDEX IF EXISTS idx_economy_shops_featured;'
      ];
      
      for (const dropQuery of dropEconomyIndexes) {
        try {
          await sequelize.query(dropQuery);
        } catch (error) {
          console.warn('[Migration 007] Index removal warning:', error.message);
        }
      }
      
      // Drop economy system tables (order matters due to foreign keys)
      await sequelize.query('DROP TABLE IF EXISTS user_inventories CASCADE;');
      console.log('[Migration 007] Dropped user_inventories table');
      
      await sequelize.query('DROP TABLE IF EXISTS economy_transactions CASCADE;');
      console.log('[Migration 007] Dropped economy_transactions table');
      
      await sequelize.query('DROP TABLE IF EXISTS economy_shops CASCADE;');
      console.log('[Migration 007] Dropped economy_shops table');
      
      await sequelize.query('DROP TABLE IF EXISTS economy_items CASCADE;');
      console.log('[Migration 007] Dropped economy_items table');
      
      await sequelize.query('DROP TABLE IF EXISTS economies CASCADE;');
      console.log('[Migration 007] Dropped economies table');
      
      console.log('[Migration 007] ✅ Economy system rollback completed');
    }
  }
];

/**
 * Run all pending migrations
 */
async function runMigrations() {
  try {
    console.log('[Migrations] 🚀 Starting database migrations...');
    
    // Create migration table first
    await createMigrationTable();
    
    let executedCount = 0;
    
    for (const migration of migrations) {
      const isExecuted = await isMigrationExecuted(migration.name);
      
      if (isExecuted) {
        console.log(`[Migrations] ⏭️  Skipping ${migration.name} (already executed)`);
        continue;
      }
      
      console.log(`[Migrations] 🔄 Executing ${migration.name}: ${migration.description}`);
      const startTime = Date.now();
      
      try {
        await migration.up();
        const executionTime = Date.now() - startTime;
        await recordMigration(migration.name, executionTime);
        executedCount++;
      } catch (error) {
        console.error(`[Migrations] ❌ Failed to execute ${migration.name}:`, error.message);
        throw error;
      }
    }
    
    if (executedCount === 0) {
      console.log('[Migrations] ✅ No pending migrations');
    } else {
      console.log(`[Migrations] ✅ Executed ${executedCount} migration(s) successfully`);
    }
    
    return true;
  } catch (error) {
    console.error('[Migrations] ❌ Migration failed:', error.message);
    throw error;
  }
}

/**
 * Rollback last migration (use with caution)
 */
async function rollbackLastMigration() {
  try {
    console.log('[Migrations] 🔄 Rolling back last migration...');
    
    // Get last executed migration
    const result = await sequelize.query(
      `SELECT migration_name FROM ${MIGRATION_TABLE} ORDER BY executed_at DESC LIMIT 1`,
      { type: sequelize.QueryTypes.SELECT }
    );
    
    if (result.length === 0) {
      console.log('[Migrations] ⚠️  No migrations to rollback');
      return false;
    }
    
    const lastMigration = result[0].migration_name;
    const migration = migrations.find(m => m.name === lastMigration);
    
    if (!migration) {
      throw new Error(`Migration definition not found for: ${lastMigration}`);
    }
    
    if (!migration.down) {
      throw new Error(`No rollback defined for migration: ${lastMigration}`);
    }
    
    console.log(`[Migrations] 🔄 Rolling back ${lastMigration}...`);
    await migration.down();
    
    // Remove from migration history
    await sequelize.query(
      `DELETE FROM ${MIGRATION_TABLE} WHERE migration_name = ?`,
      { replacements: [lastMigration] }
    );
    
    console.log(`[Migrations] ✅ Rolled back ${lastMigration}`);
    return true;
  } catch (error) {
    console.error('[Migrations] ❌ Rollback failed:', error.message);
    throw error;
  }
}

/**
 * Get migration status
 */
async function getMigrationStatus() {
  try {
    const executed = await sequelize.query(
      `SELECT migration_name, executed_at, execution_time_ms FROM ${MIGRATION_TABLE} ORDER BY executed_at`,
      { type: sequelize.QueryTypes.SELECT }
    );
    
    const pending = migrations.filter(m => 
      !executed.some(e => e.migration_name === m.name)
    );
    
    return {
      executed: executed.map(e => ({
        name: e.migration_name,
        executedAt: e.executed_at,
        executionTime: e.execution_time_ms
      })),
      pending: pending.map(p => ({
        name: p.name,
        description: p.description
      })),
      total: migrations.length
    };
  } catch (error) {
    console.error('[Migrations] Error getting migration status:', error.message);
    throw error;
  }
}

module.exports = {
  runMigrations,
  rollbackLastMigration,
  getMigrationStatus,
  migrations
};