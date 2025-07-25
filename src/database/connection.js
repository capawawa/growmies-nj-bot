/**
 * Database Connection Configuration for GrowmiesNJ Discord Bot
 * 
 * Phase 3A: PostgreSQL + Sequelize integration with Railway.app deployment
 * Handles DATABASE_URL parsing, connection pooling, and graceful error handling
 */

const { Sequelize, DataTypes } = require('sequelize');

// Environment variables with fallbacks for development
const DATABASE_URL = process.env.DATABASE_URL;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Connection pool configuration for Railway.app production
const poolConfig = {
  max: NODE_ENV === 'production' ? 10 : 5,  // Maximum connections in pool
  min: 1,                                   // Minimum connections maintained
  acquire: 30000,                          // Maximum time to get connection (ms)
  idle: 10000,                            // Maximum idle time before release (ms)
};

// Logging configuration
const loggingConfig = NODE_ENV === 'development' 
  ? console.log 
  : false;  // Disable SQL logging in production

// Database connection options
let sequelizeOptions = {
  dialect: 'postgres',
  logging: loggingConfig,
  pool: poolConfig,
  
  // Railway.app and production optimizations
  dialectOptions: {
    ssl: NODE_ENV === 'production' ? {
      require: true,
      rejectUnauthorized: false  // Railway.app SSL compatibility
    } : false,
    keepAlive: true,
    statement_timeout: 30000,
    query_timeout: 30000,
  },

  // Connection retry configuration
  retry: {
    max: 5,
    timeout: 60000,
    match: [
      /ConnectionError/,
      /ConnectionRefusedError/,
      /TimeoutError/,
      /SequelizeConnectionError/
    ]
  },

  // Query and transaction timeouts
  define: {
    freezeTableName: true,    // Prevent table name pluralization
    timestamps: true,         // Automatic createdAt/updatedAt
    underscored: true,       // Use snake_case for column names
  }
};

// Initialize Sequelize instance
let sequelize;

if (DATABASE_URL) {
  // Production: Parse Railway.app DATABASE_URL
  console.log('[Database] Connecting using DATABASE_URL...');
  sequelize = new Sequelize(DATABASE_URL, sequelizeOptions);
} else {
  // Development: Use individual connection parameters
  console.log('[Database] Using development configuration...');
  sequelize = new Sequelize({
    ...sequelizeOptions,
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'growmies_nj_dev',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
  });
}

/**
 * Test database connection with retry logic
 * @param {number} retries - Number of retry attempts remaining
 * @returns {Promise<boolean>} - Connection success status
 */
async function testConnection(retries = 3) {
  try {
    await sequelize.authenticate();
    console.log('[Database] ✅ Connection established successfully');
    return true;
  } catch (error) {
    console.error(`[Database] ❌ Connection failed:`, error.message);
    
    if (retries > 0) {
      console.log(`[Database] 🔄 Retrying connection... (${retries} attempts remaining)`);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      return await testConnection(retries - 1);
    }
    
    console.error('[Database] 💥 All connection attempts failed');
    return false;
  }
}

/**
 * Initialize database connection and sync models
 * @param {boolean} force - Force recreate tables (development only)
 * @returns {Promise<boolean>} - Initialization success status
 */
async function initializeDatabase(force = false) {
  try {
    // Test connection first
    const connectionSuccess = await testConnection();
    if (!connectionSuccess) {
      throw new Error('Database connection failed');
    }

    // Sync models with database
    if (NODE_ENV === 'development' && force) {
      console.log('[Database] 🔄 Force syncing models (development)...');
      await sequelize.sync({ force: true });
      console.log('[Database] ✅ Models force synced');
    } else {
      console.log('[Database] 🔄 Syncing models...');
      await sequelize.sync({ alter: NODE_ENV === 'development' });
      console.log('[Database] ✅ Models synced');
    }

    return true;
  } catch (error) {
    console.error('[Database] ❌ Initialization failed:', error.message);
    return false;
  }
}

/**
 * Gracefully close database connection
 * @returns {Promise<void>}
 */
async function closeConnection() {
  try {
    await sequelize.close();
    console.log('[Database] 🔒 Connection closed gracefully');
  } catch (error) {
    console.error('[Database] ❌ Error closing connection:', error.message);
  }
}

/**
 * Get database health status for monitoring
 * @returns {Promise<Object>} - Health status object
 */
async function getHealthStatus() {
  try {
    const startTime = Date.now();
    await sequelize.authenticate();
    const responseTime = Date.now() - startTime;
    
    const poolStats = sequelize.connectionManager.pool;
    
    return {
      status: 'healthy',
      responseTime: `${responseTime}ms`,
      pool: {
        size: poolStats?.size || 0,
        available: poolStats?.available?.length || 0,
        using: poolStats?.used?.length || 0,
        waiting: poolStats?.pending?.length || 0,
      },
      dialect: 'postgresql',
      version: sequelize.getDialect(),
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      pool: null,
      dialect: 'postgresql',
      version: null,
    };
  }
}

// Graceful shutdown handling
process.on('SIGINT', async () => {
  console.log('[Database] 🛑 SIGINT received, closing database connection...');
  await closeConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('[Database] 🛑 SIGTERM received, closing database connection...');
  await closeConnection();
  process.exit(0);
});

// Initialize all models
function initializeAllModels() {
  try {
    console.log('[Database] Initializing models...');
    
    // Import and initialize all models
    const { User, initUserModel } = require('./models/User');
    const { AuditLog, initAuditLogModel } = require('./models/AuditLog');
    const { GuildSettings, initGuildSettingsModel } = require('./models/GuildSettings');
    const { InstagramPost, initInstagramPostModel } = require('./models/InstagramPost');
    const { BotStatus, initBotStatusModel } = require('./models/BotStatus');

    // Initialize models with sequelize instance
    const UserModel = initUserModel(sequelize);
    const AuditLogModel = initAuditLogModel(sequelize);
    const GuildSettingsModel = initGuildSettingsModel(sequelize);
    const InstagramPostModel = initInstagramPostModel(sequelize);
    const BotStatusModel = initBotStatusModel(sequelize);

    console.log('[Database] ✅ All models initialized successfully');
    
    return {
      User: UserModel,
      AuditLog: AuditLogModel,
      GuildSettings: GuildSettingsModel,
      InstagramPost: InstagramPostModel,
      BotStatus: BotStatusModel
    };
  } catch (error) {
    console.error('[Database] ❌ Model initialization failed:', error.message);
    throw error;
  }
}

// Export Sequelize instance and utilities
module.exports = {
  sequelize,
  initializeDatabase,
  initializeAllModels,
  testConnection,
  closeConnection,
  getHealthStatus,
  Sequelize,    // Re-export for model definitions
  DataTypes,    // Export DataTypes for model definitions
};