/**
 * Production Database Manager for GrowmiesNJ Discord Bot
 * 
 * Handles database lifecycle, graceful degradation, and production optimizations
 * Designed for Railway.app deployment with local development fallbacks
 */

const { sequelize, initializeAllModels, testConnection, getHealthStatus } = require('./connection');
const { runMigrations, getMigrationStatus } = require('./migrations');

/**
 * Database Manager - Centralized database operations and lifecycle management
 */
class DatabaseManager {
  constructor() {
    this.isConnected = false;
    this.models = null;
    this.degradedMode = false;
    this.connectionAttempts = 0;
    this.maxConnectionAttempts = 5;
    this.reconnectInterval = 30000; // 30 seconds
    this.healthCheckInterval = 60000; // 1 minute
    this.cleanupInterval = 3600000; // 1 hour
    
    this.intervals = {
      healthCheck: null,
      cleanup: null,
      reconnect: null
    };
    
    this.stats = {
      connectionEstablished: null,
      lastHealthCheck: null,
      totalQueries: 0,
      totalErrors: 0,
      averageResponseTime: 0
    };
  }

  /**
   * Initialize database connection and run setup procedures
   */
  async initialize() {
    try {
      console.log('[DatabaseManager] 🚀 Initializing database connection...');
      
      // Test initial connection
      const connectionSuccess = await this.connectWithRetry();
      
      if (connectionSuccess) {
        await this.setupProduction();
        this.startBackgroundTasks();
        console.log('[DatabaseManager] ✅ Database fully initialized');
        return true;
      } else {
        await this.enableDegradedMode();
        return false;
      }
    } catch (error) {
      console.error('[DatabaseManager] ❌ Initialization failed:', error.message);
      await this.enableDegradedMode();
      return false;
    }
  }

  /**
   * Connect with exponential backoff retry logic
   */
  async connectWithRetry() {
    for (let attempt = 1; attempt <= this.maxConnectionAttempts; attempt++) {
      try {
        console.log(`[DatabaseManager] 🔄 Connection attempt ${attempt}/${this.maxConnectionAttempts}`);
        
        const success = await testConnection(1); // Single attempt per retry
        
        if (success) {
          this.isConnected = true;
          this.connectionAttempts = 0;
          this.stats.connectionEstablished = new Date();
          
          // Initialize models
          this.models = initializeAllModels();
          
          console.log('[DatabaseManager] ✅ Database connection established');
          return true;
        }
      } catch (error) {
        console.warn(`[DatabaseManager] ⚠️  Connection attempt ${attempt} failed:`, error.message);
      }
      
      if (attempt < this.maxConnectionAttempts) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 30000); // Exponential backoff, max 30s
        console.log(`[DatabaseManager] ⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    this.connectionAttempts = this.maxConnectionAttempts;
    return false;
  }

  /**
   * Setup production environment (migrations, indexes, etc.)
   */
  async setupProduction() {
    try {
      console.log('[DatabaseManager] 🔧 Setting up production environment...');
      
      // Run database migrations
      await runMigrations();
      
      // Verify all models are working
      await this.verifyModels();
      
      // Run initial cleanup if needed
      await this.performMaintenance();
      
      console.log('[DatabaseManager] ✅ Production setup completed');
    } catch (error) {
      console.error('[DatabaseManager] ❌ Production setup failed:', error.message);
      throw error;
    }
  }

  /**
   * Verify all models are properly initialized
   */
  async verifyModels() {
    if (!this.models) {
      throw new Error('Models not initialized');
    }
    
    try {
      const modelChecks = [
        { name: 'User', check: () => this.models.User.count() },
        { name: 'AuditLog', check: () => this.models.AuditLog.count() },
        { name: 'GuildSettings', check: () => this.models.GuildSettings.count() },
        { name: 'InstagramPost', check: () => this.models.InstagramPost.count() },
        { name: 'BotStatus', check: () => this.models.BotStatus.count() }
      ];
      
      for (const { name, check } of modelChecks) {
        await check();
        console.log(`[DatabaseManager] ✅ ${name} model verified`);
      }
    } catch (error) {
      console.error('[DatabaseManager] ❌ Model verification failed:', error.message);
      throw error;
    }
  }

  /**
   * Enable degraded mode when database is unavailable
   */
  async enableDegradedMode() {
    console.warn('[DatabaseManager] ⚠️  Enabling degraded mode - database unavailable');
    
    this.degradedMode = true;
    this.isConnected = false;
    
    // Start reconnection attempts
    this.startReconnectionAttempts();
    
    // Create mock models for graceful degradation
    this.models = this.createMockModels();
    
    console.log('[DatabaseManager] ✅ Degraded mode enabled');
  }

  /**
   * Create mock models that log operations but don't fail
   */
  createMockModels() {
    const mockModel = {
      create: async (data) => {
        console.log('[DatabaseManager] 📝 Mock: Create operation logged');
        return { id: 'mock', ...data, save: async () => {}, toJSON: () => data };
      },
      findOne: async () => {
        console.log('[DatabaseManager] 🔍 Mock: Find operation logged');
        return null;
      },
      findAll: async () => {
        console.log('[DatabaseManager] 🔍 Mock: FindAll operation logged');
        return [];
      },
      count: async () => {
        console.log('[DatabaseManager] 📊 Mock: Count operation logged');
        return 0;
      },
      update: async () => {
        console.log('[DatabaseManager] ✏️  Mock: Update operation logged');
        return [0];
      },
      destroy: async () => {
        console.log('[DatabaseManager] 🗑️  Mock: Delete operation logged');
        return 0;
      }
    };
    
    return {
      User: { ...mockModel, findByGuildId: async () => null },
      AuditLog: { 
        ...mockModel, 
        logVerificationAttempt: async () => ({ id: 'mock', action_type: 'mock' }),
        logAdminAction: async () => ({ id: 'mock', action_type: 'mock' }),
        getLogsForGuild: async () => [],
        getLogsForUser: async () => []
      },
      GuildSettings: { 
        ...mockModel, 
        findByGuildId: async () => ({
          guild_id: 'mock',
          verification_enabled: true,
          updateSettings: async () => {},
          isVerificationEnabled: () => true,
          getAdminRoles: () => [],
          getConfigSummary: () => ({})
        })
      },
      InstagramPost: { 
        ...mockModel,
        createFromRSSData: async () => ({ id: 'mock', post_id: 'mock' }),
        findUnpostedForGuild: async () => [],
        getRecentPosts: async () => [],
        getPostingStats: async () => ({ total_posts: 0 })
      },
      BotStatus: { 
        ...mockModel,
        getCurrentStatus: async () => ({
          environment: 'mock',
          status: 'degraded',
          updateStatus: async () => {},
          recordError: async () => {},
          getHealthScore: () => 50,
          isHealthy: () => false,
          checkAlerts: () => [],
          getStatusSummary: () => ({ status: 'degraded' })
        }),
        getUptimeStats: async () => ({ uptime_percentage: 0 })
      }
    };
  }

  /**
   * Start background tasks for monitoring and maintenance
   */
  startBackgroundTasks() {
    if (!this.isConnected) return;
    
    // Health check interval
    this.intervals.healthCheck = setInterval(async () => {
      await this.performHealthCheck();
    }, this.healthCheckInterval);
    
    // Cleanup interval
    this.intervals.cleanup = setInterval(async () => {
      await this.performMaintenance();
    }, this.cleanupInterval);
    
    console.log('[DatabaseManager] ✅ Background tasks started');
  }

  /**
   * Start reconnection attempts when in degraded mode
   */
  startReconnectionAttempts() {
    if (this.intervals.reconnect) return;
    
    this.intervals.reconnect = setInterval(async () => {
      if (this.degradedMode) {
        console.log('[DatabaseManager] 🔄 Attempting to reconnect...');
        
        const success = await this.connectWithRetry();
        if (success) {
          await this.recoverFromDegradedMode();
        }
      }
    }, this.reconnectInterval);
  }

  /**
   * Recover from degraded mode when connection is restored
   */
  async recoverFromDegradedMode() {
    try {
      console.log('[DatabaseManager] 🔄 Recovering from degraded mode...');
      
      this.degradedMode = false;
      
      // Reinitialize models
      this.models = initializeAllModels();
      
      // Run any pending migrations
      await runMigrations();
      
      // Clear reconnection interval
      if (this.intervals.reconnect) {
        clearInterval(this.intervals.reconnect);
        this.intervals.reconnect = null;
      }
      
      // Restart background tasks
      this.startBackgroundTasks();
      
      console.log('[DatabaseManager] ✅ Recovered from degraded mode');
    } catch (error) {
      console.error('[DatabaseManager] ❌ Recovery failed:', error.message);
      await this.enableDegradedMode();
    }
  }

  /**
   * Perform health check
   */
  async performHealthCheck() {
    try {
      const health = await getHealthStatus();
      this.stats.lastHealthCheck = new Date();
      
      if (health.status === 'unhealthy') {
        console.warn('[DatabaseManager] ⚠️  Database health check failed');
        this.stats.totalErrors++;
      }
      
      return health;
    } catch (error) {
      console.error('[DatabaseManager] ❌ Health check failed:', error.message);
      this.stats.totalErrors++;
      return { status: 'unhealthy', error: error.message };
    }
  }

  /**
   * Perform database maintenance tasks
   */
  async performMaintenance() {
    if (!this.isConnected || this.degradedMode) {
      console.log('[DatabaseManager] ⏭️  Skipping maintenance (no connection)');
      return;
    }
    
    try {
      console.log('[DatabaseManager] 🧹 Performing database maintenance...');
      
      // Clean up old audit logs (non-compliance ones)
      const auditCleanup = await sequelize.query('SELECT cleanup_old_audit_logs(365);', {
        type: sequelize.QueryTypes.SELECT
      });
      
      // Clean up old Instagram posts
      const instagramCleanup = await sequelize.query('SELECT cleanup_old_instagram_posts(90);', {
        type: sequelize.QueryTypes.SELECT
      });
      
      // Clean up old bot status records
      const statusCleanup = await sequelize.query('SELECT cleanup_old_bot_status(30);', {
        type: sequelize.QueryTypes.SELECT
      });
      
      console.log('[DatabaseManager] ✅ Maintenance completed:', {
        auditLogs: auditCleanup[0]?.cleanup_old_audit_logs || 0,
        instagramPosts: instagramCleanup[0]?.cleanup_old_instagram_posts || 0,
        botStatus: statusCleanup[0]?.cleanup_old_bot_status || 0
      });
    } catch (error) {
      console.error('[DatabaseManager] ⚠️  Maintenance failed:', error.message);
    }
  }

  /**
   * Get database status and statistics
   */
  getStatus() {
    return {
      connected: this.isConnected,
      degradedMode: this.degradedMode,
      connectionAttempts: this.connectionAttempts,
      stats: this.stats,
      migrationStatus: this.isConnected ? getMigrationStatus() : null
    };
  }

  /**
   * Get models (works in both normal and degraded mode)
   */
  getModels() {
    return this.models;
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    try {
      console.log('[DatabaseManager] 🛑 Shutting down...');
      
      // Clear all intervals
      Object.values(this.intervals).forEach(interval => {
        if (interval) clearInterval(interval);
      });
      
      // Close database connection
      if (this.isConnected) {
        await sequelize.close();
        console.log('[DatabaseManager] ✅ Database connection closed');
      }
      
      this.isConnected = false;
      this.degradedMode = false;
      
      console.log('[DatabaseManager] ✅ Shutdown completed');
    } catch (error) {
      console.error('[DatabaseManager] ❌ Shutdown failed:', error.message);
    }
  }
}

// Export singleton instance
const databaseManager = new DatabaseManager();

module.exports = databaseManager;