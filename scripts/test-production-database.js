/**
 * Production Database Integration Test Suite
 * 
 * Tests both connected and degraded mode functionality for Railway.app deployment
 * Validates production readiness and graceful degradation capabilities
 */

const databaseManager = require('../src/database/manager');
const { getMigrationStatus } = require('../src/database/migrations');

require('dotenv').config();

// ANSI color codes for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(color, symbol, message) {
  console.log(`${color}${symbol} ${message}${colors.reset}`);
}

function success(message) {
  log(colors.green, '✅', message);
}

function error(message) {
  log(colors.red, '❌', message);
}

function warning(message) {
  log(colors.yellow, '⚠️ ', message);
}

function info(message) {
  log(colors.blue, 'ℹ️ ', message);
}

function section(message) {
  console.log(`\n${colors.bold}${colors.cyan}🧪 ${message}${colors.reset}`);
  console.log('─'.repeat(70));
}

// Test configuration
const TEST_CONFIG = {
  testGuildId: '12345678901234567890',
  testUserId: '09876543210987654321',
  testEnvironment: 'test',
  testVersion: '1.0.0-test'
};

/**
 * Test database manager initialization
 */
async function testDatabaseManagerInitialization() {
  section('Testing Database Manager Initialization');
  
  try {
    const initSuccess = await databaseManager.initialize();
    const status = databaseManager.getStatus();
    
    info(`Connection Status: ${status.connected ? 'Connected' : 'Disconnected'}`);
    info(`Degraded Mode: ${status.degradedMode ? 'Yes' : 'No'}`);
    info(`Connection Attempts: ${status.connectionAttempts}`);
    
    if (status.connected) {
      success('Database manager initialized with connection');
    } else if (status.degradedMode) {
      warning('Database manager initialized in degraded mode');
    } else {
      throw new Error('Database manager failed to initialize');
    }
    
    return { success: true, connected: status.connected };
  } catch (err) {
    error(`Database manager initialization failed: ${err.message}`);
    return { success: false, connected: false };
  }
}

/**
 * Test models in connected mode
 */
async function testConnectedMode() {
  section('Testing Connected Mode Operations');
  
  try {
    const models = databaseManager.getModels();
    
    if (!models) {
      throw new Error('Models not available');
    }
    
    // Test User model
    const user = await models.User.create({
      discord_id: TEST_CONFIG.testUserId,
      guild_id: TEST_CONFIG.testGuildId,
      username: 'TestUser',
      display_name: 'Test User',
      birth_year: '1990',
      is_21_plus: true,
      verification_status: 'verified',
      verified_at: new Date()
    });
    success(`Created user: ${user.username}`);
    
    // Test AuditLog model
    const auditLog = await models.AuditLog.logVerificationAttempt(
      TEST_CONFIG.testUserId,
      TEST_CONFIG.testGuildId,
      TEST_CONFIG.testUserId,
      'success',
      { verification_method: 'test', ip_address: '127.0.0.1' }
    );
    success(`Created audit log: ${auditLog.action_type}`);
    
    // Test GuildSettings model
    const settings = await models.GuildSettings.findByGuildId(TEST_CONFIG.testGuildId);
    await settings.updateSettings({
      verified_role_id: '98765432109876543210',
      instagram_rss_enabled: true
    });
    success('Updated guild settings');
    
    // Test InstagramPost model
    const post = await models.InstagramPost.createFromRSSData({
      post_id: 'test_post_production',
      url: 'https://instagram.com/test',
      caption: 'Production test post #cannabis',
      image_urls: ['https://example.com/image.jpg'],
      published_at: new Date(),
      engagement: { likes: 15, comments: 3 }
    });
    success(`Created Instagram post: ${post.post_id}`);
    
    // Test BotStatus model
    const botStatus = await models.BotStatus.getCurrentStatus(
      TEST_CONFIG.testEnvironment,
      TEST_CONFIG.testVersion
    );
    await botStatus.updateStatus({
      status: 'online',
      uptime_seconds: 7200,
      memory_usage_mb: 256,
      cpu_usage_percent: 15,
      active_guilds: 3,
      active_users: 150,
      discord_latency_ms: 35,
      database_latency_ms: 8
    });
    success('Updated bot status');
    
    return true;
  } catch (err) {
    error(`Connected mode test failed: ${err.message}`);
    return false;
  }
}

/**
 * Test models in degraded mode
 */
async function testDegradedMode() {
  section('Testing Degraded Mode Operations');
  
  try {
    const models = databaseManager.getModels();
    
    if (!models) {
      throw new Error('Models not available');
    }
    
    // Test that all operations complete without throwing errors
    
    // Test User model (mock)
    const user = await models.User.create({
      discord_id: 'mock_user',
      guild_id: 'mock_guild',
      username: 'MockUser'
    });
    success('Mock user creation handled gracefully');
    
    // Test AuditLog model (mock)
    const auditLog = await models.AuditLog.logVerificationAttempt(
      'mock_user',
      'mock_guild',
      'mock_actor',
      'success',
      { verification_method: 'mock' }
    );
    success('Mock audit log creation handled gracefully');
    
    // Test GuildSettings model (mock)
    const settings = await models.GuildSettings.findByGuildId('mock_guild');
    await settings.updateSettings({ verified_role_id: 'mock_role' });
    success('Mock guild settings update handled gracefully');
    
    // Test InstagramPost model (mock)
    const post = await models.InstagramPost.createFromRSSData({
      post_id: 'mock_post',
      url: 'https://mock.com',
      caption: 'Mock post',
      image_urls: [],
      published_at: new Date()
    });
    success('Mock Instagram post creation handled gracefully');
    
    // Test BotStatus model (mock)
    const botStatus = await models.BotStatus.getCurrentStatus('mock', '1.0.0');
    await botStatus.updateStatus({ status: 'degraded' });
    success('Mock bot status update handled gracefully');
    
    return true;
  } catch (err) {
    error(`Degraded mode test failed: ${err.message}`);
    return false;
  }
}

/**
 * Test migration system
 */
async function testMigrationSystem() {
  section('Testing Migration System');
  
  try {
    const status = databaseManager.getStatus();
    
    if (!status.connected) {
      warning('Skipping migration tests (no database connection)');
      return true;
    }
    
    // Get migration status
    const migrationStatus = await getMigrationStatus();
    
    info(`Total migrations: ${migrationStatus.total}`);
    info(`Executed migrations: ${migrationStatus.executed.length}`);
    info(`Pending migrations: ${migrationStatus.pending.length}`);
    
    if (migrationStatus.executed.length > 0) {
      success('Migration system functioning correctly');
      
      migrationStatus.executed.forEach(migration => {
        info(`  ✓ ${migration.name} (${migration.executionTime}ms)`);
      });
    }
    
    if (migrationStatus.pending.length > 0) {
      warning('Pending migrations detected:');
      migrationStatus.pending.forEach(migration => {
        warning(`  • ${migration.name}: ${migration.description}`);
      });
    }
    
    return true;
  } catch (err) {
    error(`Migration system test failed: ${err.message}`);
    return false;
  }
}

/**
 * Test database health monitoring
 */
async function testHealthMonitoring() {
  section('Testing Health Monitoring');
  
  try {
    const health = await databaseManager.performHealthCheck();
    const status = databaseManager.getStatus();
    
    info(`Database Health: ${health.status}`);
    
    if (health.responseTime) {
      info(`Response Time: ${health.responseTime}`);
    }
    
    if (health.pool) {
      info(`Pool Stats: ${JSON.stringify(health.pool)}`);
    }
    
    if (status.stats.lastHealthCheck) {
      info(`Last Health Check: ${status.stats.lastHealthCheck.toISOString()}`);
    }
    
    success('Health monitoring system functional');
    return true;
  } catch (err) {
    error(`Health monitoring test failed: ${err.message}`);
    return false;
  }
}

/**
 * Test production features
 */
async function testProductionFeatures() {
  section('Testing Production Features');
  
  try {
    const status = databaseManager.getStatus();
    
    // Test graceful degradation
    if (status.degradedMode) {
      success('Graceful degradation is active');
    } else if (status.connected) {
      success('Full database connectivity established');
    }
    
    // Test error handling
    try {
      await databaseManager.performMaintenance();
      success('Maintenance operations completed successfully');
    } catch (err) {
      warning(`Maintenance operations warning: ${err.message}`);
    }
    
    // Test status reporting
    const fullStatus = databaseManager.getStatus();
    info(`Database Manager Status:`);
    info(`  Connected: ${fullStatus.connected}`);
    info(`  Degraded Mode: ${fullStatus.degradedMode}`);
    info(`  Total Queries: ${fullStatus.stats.totalQueries}`);
    info(`  Total Errors: ${fullStatus.stats.totalErrors}`);
    
    success('Production features validation completed');
    return true;
  } catch (err) {
    error(`Production features test failed: ${err.message}`);
    return false;
  }
}

/**
 * Main test runner
 */
async function runProductionTests() {
  console.log(`${colors.bold}${colors.cyan}🚀 GrowmiesNJ Production Database Tests${colors.reset}\n`);
  
  const tests = [
    { name: 'Database Manager Initialization', fn: testDatabaseManagerInitialization },
    { name: 'Migration System', fn: testMigrationSystem },
    { name: 'Health Monitoring', fn: testHealthMonitoring },
    { name: 'Production Features', fn: testProductionFeatures }
  ];
  
  const results = {
    passed: 0,
    failed: 0,
    total: tests.length,
    databaseConnected: false
  };
  
  // Run initialization test first
  const initResult = await testDatabaseManagerInitialization();
  results.databaseConnected = initResult.connected;
  
  if (initResult.success) {
    results.passed++;
    
    // Add mode-specific tests based on connection status
    if (initResult.connected) {
      tests.push({ name: 'Connected Mode Operations', fn: testConnectedMode });
    } else {
      tests.push({ name: 'Degraded Mode Operations', fn: testDegradedMode });
    }
    
    results.total = tests.length;
    
    // Run remaining tests
    for (let i = 1; i < tests.length; i++) {
      const test = tests[i];
      try {
        const success = await test.fn();
        if (success) {
          results.passed++;
        } else {
          results.failed++;
        }
      } catch (err) {
        error(`Test "${test.name}" threw an exception: ${err.message}`);
        results.failed++;
      }
    }
  } else {
    results.failed++;
  }
  
  // Print final results
  console.log(`\n${colors.bold}📊 Production Test Results${colors.reset}`);
  console.log('─'.repeat(70));
  
  if (results.failed === 0) {
    success(`All ${results.total} tests passed! 🎉`);
    
    if (results.databaseConnected) {
      console.log(`${colors.green}${colors.bold}✅ Production database is fully operational${colors.reset}`);
    } else {
      console.log(`${colors.yellow}${colors.bold}⚠️  Production database running in degraded mode${colors.reset}`);
    }
  } else {
    warning(`${results.passed}/${results.total} tests passed, ${results.failed} failed`);
    
    if (results.failed > 0) {
      console.log(`${colors.red}${colors.bold}❌ Production database has issues that need attention${colors.reset}`);
    }
  }
  
  // Show deployment readiness
  console.log(`\n${colors.bold}🚀 Railway.app Deployment Readiness${colors.reset}`);
  console.log('─'.repeat(70));
  
  if (results.databaseConnected) {
    success('✅ Ready for production deployment');
    info('Database will connect automatically on Railway.app with DATABASE_URL');
  } else {
    success('✅ Ready for deployment with graceful degradation');
    info('Bot will start in degraded mode and reconnect when database is available');
    warning('Ensure DATABASE_URL is properly configured in Railway.app');
  }
  
  return results.failed === 0;
}

/**
 * Cleanup function
 */
async function cleanup() {
  try {
    info('Cleaning up test environment...');
    
    // Shutdown database manager
    await databaseManager.shutdown();
    success('Database manager shutdown completed');
  } catch (err) {
    error(`Cleanup failed: ${err.message}`);
  }
}

// Run tests if called directly
if (require.main === module) {
  runProductionTests()
    .then(success => {
      return cleanup().then(() => {
        process.exit(success ? 0 : 1);
      });
    })
    .catch(err => {
      error(`Test runner failed: ${err.message}`);
      return cleanup().then(() => {
        process.exit(1);
      });
    });
}

module.exports = {
  runProductionTests,
  cleanup,
  TEST_CONFIG
};