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