const express = require('express');
const { Client } = require('discord.js');
const instagramRoutes = require('./routes/instagram');

class HealthMonitor {
    constructor(client, sequelize = null) {
        this.client = client;
        this.sequelize = sequelize;
        this.app = express();
        this.startTime = Date.now();
        this.stats = {
            totalCommands: 0,
            errors: 0,
            restarts: 0,
            databaseErrors: 0
        };
        
        // Database health cache to prevent excessive queries
        this.databaseHealthCache = {
            status: null,
            lastCheck: 0,
            cacheDurationMs: 30000 // 30 seconds
        };
        
        this.setupRoutes();
    }

    // Database health check with caching and timeout
    async checkDatabaseHealth() {
        const now = Date.now();
        
        // Return cached result if still valid
        if (this.databaseHealthCache.lastCheck + this.databaseHealthCache.cacheDurationMs > now) {
            return this.databaseHealthCache.status;
        }

        if (!this.sequelize) {
            const result = {
                status: 'not_configured',
                message: 'Database not configured',
                responseTime: 0,
                connected: false
            };
            this.databaseHealthCache.status = result;
            this.databaseHealthCache.lastCheck = now;
            return result;
        }

        try {
            const startTime = Date.now();
            
            // Use authenticate() which runs 'SELECT 1+1 AS result' query
            await Promise.race([
                this.sequelize.authenticate(),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Database timeout')), 5000)
                )
            ]);
            
            const responseTime = Date.now() - startTime;
            
            // Get connection pool information if available
            let poolInfo = {};
            try {
                if (this.sequelize.connectionManager && this.sequelize.connectionManager.pool) {
                    const pool = this.sequelize.connectionManager.pool;
                    poolInfo = {
                        totalConnections: pool.size || 0,
                        activeConnections: pool.used || 0,
                        availableConnections: pool.available || 0,
                        pendingAcquires: pool.pending || 0
                    };
                }
            } catch (poolError) {
                console.warn('Could not retrieve connection pool info:', poolError.message);
            }

            const result = {
                status: 'healthy',
                message: 'Database connection successful',
                responseTime,
                connected: true,
                pool: poolInfo
            };

            this.databaseHealthCache.status = result;
            this.databaseHealthCache.lastCheck = now;
            return result;

        } catch (error) {
            this.stats.databaseErrors++;
            console.error('Database health check failed:', error);
            
            const result = {
                status: 'unhealthy',
                message: error.message || 'Database connection failed',
                responseTime: 5000, // Timeout duration
                connected: false,
                error: error.name || 'DatabaseError'
            };

            this.databaseHealthCache.status = result;
            this.databaseHealthCache.lastCheck = now;
            return result;
        }
    }

    setupRoutes() {
        // Middleware for parsing JSON
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true }));
        
        // Add Instagram webhook routes
        try {
            this.app.use('/instagram', instagramRoutes);
            console.log('📷 Instagram webhook routes mounted at /instagram');
        } catch (error) {
            console.error('❌ Failed to mount Instagram routes:', error);
        }
        
        // Basic health check with database status
        this.app.get('/health', async (req, res) => {
            try {
                const uptime = Date.now() - this.startTime;
                const botStatus = this.client.ws.status === 0 ? 'healthy' : 'unhealthy';
                const dbHealth = await this.checkDatabaseHealth();
                
                // Overall status is healthy only if both bot and database are healthy
                const overallStatus = (botStatus === 'healthy' && ['healthy', 'not_configured'].includes(dbHealth.status))
                    ? 'healthy' : 'unhealthy';
                
                res.json({
                    status: overallStatus,
                    uptime: Math.floor(uptime / 1000),
                    timestamp: new Date().toISOString(),
                    bot: {
                        status: botStatus,
                        ready: this.client.isReady(),
                        username: this.client.user?.username || 'not-ready',
                        guilds: this.client.guilds.cache.size,
                        ping: this.client.ws.ping
                    },
                    database: dbHealth
                });
            } catch (error) {
                console.error('Health check error:', error);
                res.status(500).json({
                    status: 'error',
                    message: 'Health check failed',
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Detailed metrics with database information
        this.app.get('/metrics', async (req, res) => {
            try {
                const memoryUsage = process.memoryUsage();
                const uptime = Date.now() - this.startTime;
                const dbHealth = await this.checkDatabaseHealth();
                
                res.json({
                    system: {
                        memory: {
                            rss: Math.round(memoryUsage.rss / 1024 / 1024),
                            heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
                            heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024)
                        },
                        uptime: Math.floor(uptime / 1000),
                        nodeVersion: process.version,
                        platform: process.platform
                    },
                    bot: {
                        ready: this.client.isReady(),
                        username: this.client.user?.username || 'not-ready',
                        id: this.client.user?.id || 'not-ready',
                        guilds: this.client.guilds.cache.size,
                        channels: this.client.channels.cache.size,
                        users: this.client.users.cache.size,
                        ping: this.client.ws.ping,
                        commands: this.stats.totalCommands,
                        errors: this.stats.errors,
                        restarts: this.stats.restarts
                    },
                    database: {
                        status: dbHealth.status,
                        connected: dbHealth.connected,
                        responseTime: dbHealth.responseTime,
                        errors: this.stats.databaseErrors,
                        lastCheck: new Date(this.databaseHealthCache.lastCheck).toISOString(),
                        cacheAge: Date.now() - this.databaseHealthCache.lastCheck,
                        pool: dbHealth.pool || {}
                    },
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error('Metrics endpoint error:', error);
                res.status(500).json({
                    error: 'Failed to retrieve metrics',
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Status page with database information
        this.app.get('/status', async (req, res) => {
            try {
                const uptime = Date.now() - this.startTime;
                const dbHealth = await this.checkDatabaseHealth();
                
                const formatUptime = (ms) => {
                    const seconds = Math.floor(ms / 1000);
                    const minutes = Math.floor(seconds / 60);
                    const hours = Math.floor(minutes / 60);
                    const days = Math.floor(hours / 24);
                    
                    return `${days}d ${hours % 24}h ${minutes % 60}m ${seconds % 60}s`;
                };

                const getDatabaseStatusClass = (status) => {
                    if (status === 'healthy') return 'status-healthy';
                    if (status === 'not_configured') return 'status-warning';
                    return 'status-unhealthy';
                };

                const getDatabaseStatusText = (status) => {
                    if (status === 'healthy') return '✅ Connected';
                    if (status === 'not_configured') return '⚠️ Not Configured';
                    return '❌ Disconnected';
                };

                const html = `
<!DOCTYPE html>
<html>
<head>
    <title>GrowmiesSprout Bot Status</title>
    <meta http-equiv="refresh" content="30">
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #2c2f33;
            color: #ffffff;
            padding: 20px;
            margin: 0;
        }
        .container {
            max-width: 1000px;
            margin: 0 auto;
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
        }
        .status-card {
            background-color: #23272a;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        }
        .status-healthy {
            border-left: 4px solid #43b581;
        }
        .status-unhealthy {
            border-left: 4px solid #f04747;
        }
        .status-warning {
            border-left: 4px solid #faa61a;
        }
        .metric {
            display: flex;
            justify-content: space-between;
            margin: 10px 0;
            padding: 10px;
            background-color: #2c2f33;
            border-radius: 4px;
        }
        .metric-label {
            color: #99aab5;
        }
        .metric-value {
            font-weight: bold;
            color: #7289da;
        }
        .emoji {
            font-size: 24px;
            margin-right: 10px;
        }
        .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }
        @media (max-width: 768px) {
            .grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1><span class="emoji">🌱</span>GrowmiesSprout Bot Status</h1>
            <p>Auto-refreshes every 30 seconds</p>
        </div>
        
        <div class="grid">
            <div class="status-card ${this.client.isReady() ? 'status-healthy' : 'status-unhealthy'}">
                <h2>🤖 Bot Status: ${this.client.isReady() ? '✅ Online' : '❌ Offline'}</h2>
                <div class="metric">
                    <span class="metric-label">Bot Name:</span>
                    <span class="metric-value">${this.client.user?.username || 'Not Ready'}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Uptime:</span>
                    <span class="metric-value">${formatUptime(uptime)}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Discord Ping:</span>
                    <span class="metric-value">${this.client.ws.ping}ms</span>
                </div>
            </div>

            <div class="status-card ${getDatabaseStatusClass(dbHealth.status)}">
                <h2>🗃️ Database: ${getDatabaseStatusText(dbHealth.status)}</h2>
                <div class="metric">
                    <span class="metric-label">Response Time:</span>
                    <span class="metric-value">${dbHealth.responseTime}ms</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Database Errors:</span>
                    <span class="metric-value">${this.stats.databaseErrors}</span>
                </div>
                ${dbHealth.pool && Object.keys(dbHealth.pool).length > 0 ? `
                <div class="metric">
                    <span class="metric-label">Active Connections:</span>
                    <span class="metric-value">${dbHealth.pool.activeConnections || 0}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Pool Size:</span>
                    <span class="metric-value">${dbHealth.pool.totalConnections || 0}</span>
                </div>
                ` : ''}
            </div>
        </div>

        <div class="status-card">
            <h2>📊 Statistics</h2>
            <div class="grid">
                <div>
                    <div class="metric">
                        <span class="metric-label">Connected Servers:</span>
                        <span class="metric-value">${this.client.guilds.cache.size}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Cached Channels:</span>
                        <span class="metric-value">${this.client.channels.cache.size}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Cached Users:</span>
                        <span class="metric-value">${this.client.users.cache.size}</span>
                    </div>
                </div>
                <div>
                    <div class="metric">
                        <span class="metric-label">Commands Processed:</span>
                        <span class="metric-value">${this.stats.totalCommands}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Bot Errors:</span>
                        <span class="metric-value">${this.stats.errors}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Restarts:</span>
                        <span class="metric-value">${this.stats.restarts}</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="status-card">
            <h2>💻 System</h2>
            <div class="metric">
                <span class="metric-label">Memory Usage:</span>
                <span class="metric-value">${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB</span>
            </div>
            <div class="metric">
                <span class="metric-label">Node.js Version:</span>
                <span class="metric-value">${process.version}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Platform:</span>
                <span class="metric-value">${process.platform}</span>
            </div>
        </div>

        <div style="text-align: center; margin-top: 40px; color: #99aab5;">
            <p>Last updated: ${new Date().toLocaleString()}</p>
            <p>Database last checked: ${dbHealth.status !== 'not_configured' ? new Date(this.databaseHealthCache.lastCheck).toLocaleString() : 'N/A'}</p>
        </div>
    </div>
</body>
</html>
                `;

                res.send(html);
            } catch (error) {
                console.error('Status page error:', error);
                res.status(500).send('<h1>Status page error</h1><p>Unable to load status information</p>');
            }
        });
    }

    start(port = 3000) {
        this.server = this.app.listen(port, () => {
            console.log(`📊 Health monitoring server running on port ${port}`);
            console.log(`   - Health check: http://localhost:${port}/health`);
            console.log(`   - Metrics: http://localhost:${port}/metrics`);
            console.log(`   - Status page: http://localhost:${port}/status`);
        });
    }

    stop() {
        if (this.server) {
            this.server.close();
        }
    }

    incrementCommands() {
        this.stats.totalCommands++;
    }

    incrementErrors() {
        this.stats.errors++;
    }

    incrementRestarts() {
        this.stats.restarts++;
    }
    incrementDatabaseErrors() {
        this.stats.databaseErrors++;
    }

    // Get database health status (cached)
    getDatabaseStatus() {
        return this.databaseHealthCache.status;
    }

    // Force refresh database health check
    async refreshDatabaseHealth() {
        this.databaseHealthCache.lastCheck = 0; // Force refresh
        return await this.checkDatabaseHealth();
    }
}

module.exports = HealthMonitor;