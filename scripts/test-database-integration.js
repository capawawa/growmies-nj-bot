const { sequelize, testConnection, initializeAllModels } = require('../src/database/connection');
const HealthMonitor = require('../src/health');

require('dotenv').config();

// Store initialized models
let models = {};

// Initialize all models before testing
async function initializeModels() {
    try {
        models = initializeAllModels();
        console.log('✅ All models initialized successfully');
        return true;
    } catch (error) {
        console.error('❌ Model initialization failed:', error.message);
        return false;
    }
}

// Test configuration
const TEST_CONFIG = {
    testGuildId: '12345678901234567890',
    testUserId: '09876543210987654321',
    testEnvironment: 'test',
    testVersion: '1.0.0-test'
};

// ANSI color codes for console output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
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
    console.log(`\n${colors.bold}${colors.blue}🧪 ${message}${colors.reset}`);
    console.log('─'.repeat(60));
}

// Test database connection
async function testDatabaseConnection() {
    section('Testing Database Connection');
    
    try {
        await testConnection();
        success('Database connection established successfully');
        return true;
    } catch (err) {
        error(`Database connection failed: ${err.message}`);
        return false;
    }
}

// Test model synchronization
async function testModelSynchronization() {
    section('Testing Model Synchronization');
    
    try {
        // Force sync in test environment to ensure clean tables
        await sequelize.sync({ force: true });
        success('Database models synchronized successfully');
        
        // Verify tables were created
        const tables = await sequelize.getQueryInterface().showAllTables();
        info(`Created tables: ${tables.join(', ')}`);
        
        return true;
    } catch (err) {
        error(`Model synchronization failed: ${err.message}`);
        return false;
    }
}

// Test User model operations
async function testUserModel() {
    section('Testing User Model');
    
    try {
        const { User } = models;
        
        // Create a test user
        const user = await User.create({
            discord_id: TEST_CONFIG.testUserId,
            guild_id: TEST_CONFIG.testGuildId,
            username: 'TestUser',
            display_name: 'Test User',
            birth_year: '1990',
            is_21_plus: true,
            verification_status: 'pending'
        });
        success(`Created user: ${user.username} (${user.discord_id})`);
        
        // Update user to verified status
        user.verification_status = 'verified';
        user.verified_at = new Date();
        await user.save();
        success('User verification completed');
        
        // Find user by Discord ID
        const foundUser = await User.findOne({
            where: { discord_id: TEST_CONFIG.testUserId }
        });
        if (foundUser && foundUser.verification_status === 'verified') {
            success('User lookup and verification status confirmed');
        } else {
            throw new Error('User lookup failed or verification status incorrect');
        }
        
        // Test user methods
        const expired = foundUser.isVerificationExpired();
        const canAttempt = foundUser.canAttemptVerification();
        info(`User verification expired: ${expired}, can attempt: ${canAttempt}`);
        
        return true;
    } catch (err) {
        error(`User model test failed: ${err.message}`);
        return false;
    }
}

// Test AuditLog model operations
async function testAuditLogModel() {
    section('Testing AuditLog Model');
    
    try {
        const { AuditLog } = models;
        
        // Create audit log entry using static method
        const auditLog = await AuditLog.logVerificationAttempt(
            TEST_CONFIG.testUserId,
            TEST_CONFIG.testGuildId,
            TEST_CONFIG.testUserId,
            'success',
            {
                verification_method: 'manual',
                attempts: 1,
                ip_address: '127.0.0.1',
                user_agent: 'Test Agent'
            }
        );
        success(`Created audit log entry: ${auditLog.action_type}`);
        
        // Create admin action log
        const adminLog = await AuditLog.logAdminAction(
            TEST_CONFIG.testUserId,
            TEST_CONFIG.testGuildId,
            'user_verification_approval',
            TEST_CONFIG.testUserId,
            { reason: 'Test verification approval' }
        );
        success(`Created admin action log: ${adminLog.action_type}`);
        
        // Retrieve recent audit logs
        const recentLogs = await AuditLog.getLogsForGuild(TEST_CONFIG.testGuildId, 10);
        if (recentLogs.length > 0) {
            success(`Retrieved ${recentLogs.length} recent audit log entries`);
        } else {
            throw new Error('No audit logs found');
        }
        
        // Test logs for specific user
        const userLogs = await AuditLog.getLogsForUser(TEST_CONFIG.testUserId, 5);
        info(`Found ${userLogs.length} logs for test user`);
        
        return true;
    } catch (err) {
        error(`AuditLog model test failed: ${err.message}`);
        return false;
    }
}

// Test GuildSettings model operations
async function testGuildSettingsModel() {
    section('Testing GuildSettings Model');
    
    try {
        const { GuildSettings } = models;
        
        // Create guild settings using findByGuildId (creates if not exists)
        const settings = await GuildSettings.findByGuildId(TEST_CONFIG.testGuildId);
        success(`Guild settings initialized for guild: ${settings.guild_id}`);
        
        // Update settings using correct API
        await settings.updateSettings({
            verified_role_id: '98765432109876543210',
            verification_channel_id: '11111111111111111111',
            instagram_rss_enabled: true,
            log_channel_id: '33333333333333333333'
        });
        success('Guild settings updated successfully');
        
        // Verify settings were saved
        const updatedSettings = await GuildSettings.findByGuildId(TEST_CONFIG.testGuildId);
        if (updatedSettings.verified_role_id === '98765432109876543210' &&
            updatedSettings.verification_enabled === true) {
            success('Guild settings persistence verified');
        } else {
            throw new Error('Guild settings not properly saved');
        }
        
        // Test helper methods
        const isVerificationEnabled = updatedSettings.isVerificationEnabled();
        const adminRoles = updatedSettings.getAdminRoles();
        const configSummary = updatedSettings.getConfigSummary();
        
        info(`Verification enabled: ${isVerificationEnabled}`);
        info(`Admin roles count: ${adminRoles.length}`);
        info(`Config summary keys: ${Object.keys(configSummary).length}`);
        
        return true;
    } catch (err) {
        error(`GuildSettings model test failed: ${err.message}`);
        return false;
    }
}

// Test InstagramPost model operations
async function testInstagramPostModel() {
    section('Testing InstagramPost Model');
    
    try {
        const { InstagramPost } = models;
        
        // Create Instagram post using createFromRSSData method
        const rssData = {
            post_id: 'test_post_123',
            url: 'https://instagram.com/test_post_123',
            caption: 'Test post for GrowmiesNJ #cannabis #nj',
            image_urls: ['https://example.com/test-image.jpg'],
            published_at: new Date(),
            engagement: { likes: 10, comments: 2 }
        };
        
        const post = await InstagramPost.createFromRSSData(rssData);
        success(`Created Instagram post: ${post.post_id}`);
        
        // Mark as posted to guild
        await post.markAsPosted(TEST_CONFIG.testGuildId, 'discord_message_123');
        success('Instagram post marked as posted to Discord guild');
        
        // Find unposted posts for guild
        const unpostedPosts = await InstagramPost.findUnpostedForGuild(TEST_CONFIG.testGuildId, 5);
        info(`Found ${unpostedPosts.length} unposted Instagram posts for guild`);
        
        // Test post methods
        const isPosted = post.isPostedToGuild(TEST_CONFIG.testGuildId);
        const requiresApproval = post.requiresApproval();
        const discordEmbed = post.getDiscordEmbed();
        
        info(`Post is posted to guild: ${isPosted}`);
        info(`Post requires approval: ${requiresApproval}`);
        info(`Discord embed has ${Object.keys(discordEmbed).length} fields`);
        
        // Test static methods
        const recentPosts = await InstagramPost.getRecentPosts(7, TEST_CONFIG.testGuildId);
        const stats = await InstagramPost.getPostingStats(TEST_CONFIG.testGuildId);
        
        info(`Recent posts: ${recentPosts.length}`);
        info(`Posting stats: ${JSON.stringify(stats)}`);
        
        return true;
    } catch (err) {
        error(`InstagramPost model test failed: ${err.message}`);
        return false;
    }
}

// Test BotStatus model operations
async function testBotStatusModel() {
    section('Testing BotStatus Model');
    
    try {
        const { BotStatus } = models;
        
        // Get current bot status
        const botStatus = await BotStatus.getCurrentStatus(
            TEST_CONFIG.testEnvironment,
            TEST_CONFIG.testVersion
        );
        success(`Bot status initialized for ${botStatus.environment}`);
        
        // Update status with metrics
        await botStatus.updateStatus({
            status: 'online',
            uptime_seconds: 3600,
            memory_usage_mb: 128.5,
            cpu_usage_percent: 25.3,
            active_guilds: 5,
            active_users: 250,
            discord_latency_ms: 45,
            database_latency_ms: 12,
            error_count_24h: 0
        });
        success('Bot status metrics updated');
        
        // Record an error
        await botStatus.recordError('test_error', 'Test error for database validation', {
            test: true,
            timestamp: new Date()
        });
        success('Error recorded in bot status');
        
        // Test status methods
        const healthScore = botStatus.getHealthScore();
        const isHealthy = botStatus.isHealthy();
        const alerts = botStatus.checkAlerts();
        const statusSummary = botStatus.getStatusSummary();
        
        info(`Health score: ${healthScore}`);
        info(`Is healthy: ${isHealthy}`);
        info(`Active alerts: ${alerts.length}`);
        info(`Status summary keys: ${Object.keys(statusSummary).length}`);
        
        // Test static methods
        const uptimeStats = await BotStatus.getUptimeStats(7);
        info(`Uptime stats: ${JSON.stringify(uptimeStats)}`);
        
        return true;
    } catch (err) {
        error(`BotStatus model test failed: ${err.message}`);
        return false;
    }
}

// Test health monitoring integration
async function testHealthMonitoring() {
    section('Testing Health Monitoring Integration');
    
    try {
        // Create mock client for health monitor
        const mockClient = {
            ws: { ping: 50 },
            guilds: { cache: { size: 5 } },
            users: { cache: { size: 250 } }
        };
        
        // Initialize health monitor with database
        const healthMonitor = new HealthMonitor(mockClient, sequelize);
        success('Health monitor initialized with database integration');
        
        // Test database health check
        const dbHealth = await healthMonitor.checkDatabaseHealth();
        if (dbHealth.healthy) {
            success(`Database health check passed - Response time: ${dbHealth.responseTime}ms`);
        } else {
            throw new Error(`Database health check failed: ${dbHealth.error}`);
        }
        
        // Test overall health check
        const overallHealth = await healthMonitor.getHealthInfo();
        if (overallHealth.database && overallHealth.database.healthy) {
            success('Overall health monitoring includes database status');
        } else {
            throw new Error('Health monitoring not properly integrated');
        }
        
        return true;
    } catch (err) {
        error(`Health monitoring test failed: ${err.message}`);
        return false;
    }
}

// Test database connection pool
async function testConnectionPool() {
    section('Testing Database Connection Pool');
    
    try {
        const pool = sequelize.connectionManager.pool;
        
        info(`Connection pool configuration:`);
        info(`  - Max connections: ${pool.options.max}`);
        info(`  - Min connections: ${pool.options.min}`);
        info(`  - Acquire timeout: ${pool.options.acquire}ms`);
        info(`  - Idle timeout: ${pool.options.idle}ms`);
        
        // Get current pool status
        info(`Current pool status:`);
        info(`  - Active connections: ${pool.used.length}`);
        info(`  - Available connections: ${pool.available.length}`);
        info(`  - Pending acquires: ${pool.pending.length}`);
        
        success('Connection pool status retrieved successfully');
        return true;
    } catch (err) {
        error(`Connection pool test failed: ${err.message}`);
        return false;
    }
}

// Main test runner
async function runDatabaseTests() {
    console.log(`${colors.bold}${colors.blue}🧪 GrowmiesNJ Database Integration Tests${colors.reset}\n`);
    
    // Initialize models before running tests
    const modelsInitialized = await initializeModels();
    if (!modelsInitialized) {
        error('Model initialization failed - aborting tests');
        return false;
    }
    
    const tests = [
        { name: 'Database Connection', fn: testDatabaseConnection },
        { name: 'Model Synchronization', fn: testModelSynchronization },
        { name: 'User Model', fn: testUserModel },
        { name: 'AuditLog Model', fn: testAuditLogModel },
        { name: 'GuildSettings Model', fn: testGuildSettingsModel },
        { name: 'InstagramPost Model', fn: testInstagramPostModel },
        { name: 'BotStatus Model', fn: testBotStatusModel },
        { name: 'Health Monitoring', fn: testHealthMonitoring },
        { name: 'Connection Pool', fn: testConnectionPool }
    ];
    
    const results = {
        passed: 0,
        failed: 0,
        total: tests.length
    };
    
    for (const test of tests) {
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
    
    // Print final results
    console.log(`\n${colors.bold}📊 Test Results${colors.reset}`);
    console.log('─'.repeat(60));
    
    if (results.failed === 0) {
        success(`All ${results.total} tests passed! 🎉`);
        console.log(`${colors.green}${colors.bold}✅ Database integration is fully functional${colors.reset}`);
    } else {
        warning(`${results.passed}/${results.total} tests passed, ${results.failed} failed`);
        if (results.failed > 0) {
            console.log(`${colors.red}${colors.bold}❌ Database integration has issues that need to be resolved${colors.reset}`);
        }
    }
    
    return results.failed === 0;
}

// Cleanup function
async function cleanup() {
    try {
        info('Cleaning up test data...');
        
        // Close database connection
        await sequelize.close();
        success('Database connection closed');
    } catch (err) {
        error(`Cleanup failed: ${err.message}`);
    }
}

// Run tests if called directly
if (require.main === module) {
    runDatabaseTests()
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
    runDatabaseTests,
    cleanup,
    TEST_CONFIG
};