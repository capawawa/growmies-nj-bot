const { Client, GatewayIntentBits, EmbedBuilder, WebhookClient } = require('discord.js');
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

class HealthMonitoringSystem {
    constructor() {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.GuildMembers
            ]
        });

        this.guild = null;
        this.healthApp = express();
        this.healthCheckPort = process.env.HEALTH_CHECK_PORT || 3000;
        this.monitoringWebhook = null;
        
        // Monitoring configuration
        this.monitoringConfig = {
            healthCheckEndpoint: '/health',
            metricsEndpoint: '/metrics',
            statusEndpoint: '/status',
            checkInterval: 60000, // 1 minute
            alertThresholds: {
                memoryUsage: 85, // percentage
                cpuUsage: 80,    // percentage
                responseTime: 5000, // milliseconds
                errorRate: 10    // percentage
            },
            retentionPeriod: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
        };

        // Health metrics storage
        this.metrics = {
            startTime: new Date(),
            totalRequests: 0,
            totalErrors: 0,
            responseTimeHistory: [],
            memoryUsageHistory: [],
            cpuUsageHistory: [],
            botUptime: 0,
            lastHealthCheck: null,
            alertsSent: []
        };

        // Service status tracking
        this.serviceStatus = {
            discordBot: 'unknown',
            discordAPI: 'unknown',
            database: 'unknown',
            webServer: 'unknown',
            thirdPartyBots: {},
            instagramIntegration: 'unknown'
        };
    }

    async initialize() {
        console.log('🔍 Initializing Health Monitoring System...');
        
        await this.client.login(process.env.DISCORD_TOKEN);
        this.guild = await this.client.guilds.fetch(process.env.DISCORD_GUILD_ID);
        
        if (process.env.MONITORING_WEBHOOK) {
            this.monitoringWebhook = new WebhookClient({ url: process.env.MONITORING_WEBHOOK });
        }
        
        console.log(`✅ Connected to guild: ${this.guild.name}`);
        
        // Setup health check endpoints
        this.setupHealthEndpoints();
        
        // Start monitoring services
        this.startMonitoring();
        
        return this;
    }

    setupHealthEndpoints() {
        console.log('🛣️ Setting up health check endpoints...');
        
        // Basic health check endpoint
        this.healthApp.get(this.monitoringConfig.healthCheckEndpoint, (req, res) => {
            const healthStatus = this.getHealthStatus();
            const statusCode = healthStatus.overall === 'healthy' ? 200 : 503;
            
            res.status(statusCode).json({
                status: healthStatus.overall,
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                services: this.serviceStatus,
                version: require('../package.json').version || '1.0.0'
            });
        });

        // Detailed metrics endpoint
        this.healthApp.get(this.monitoringConfig.metricsEndpoint, (req, res) => {
            const metrics = this.getDetailedMetrics();
            res.json(metrics);
        });

        // Status dashboard endpoint
        this.healthApp.get(this.monitoringConfig.statusEndpoint, (req, res) => {
            const statusPage = this.generateStatusPage();
            res.send(statusPage);
        });

        // Start health check server
        this.healthApp.listen(this.healthCheckPort, () => {
            console.log(`✅ Health check server running on port ${this.healthCheckPort}`);
        });
    }

    getHealthStatus() {
        const memoryUsage = this.getMemoryUsage();
        const cpuUsage = this.getCPUUsage();
        const responseTime = this.getAverageResponseTime();
        const errorRate = this.getErrorRate();
        
        let overall = 'healthy';
        const issues = [];
        
        if (memoryUsage > this.monitoringConfig.alertThresholds.memoryUsage) {
            overall = 'degraded';
            issues.push(`High memory usage: ${memoryUsage}%`);
        }
        
        if (cpuUsage > this.monitoringConfig.alertThresholds.cpuUsage) {
            overall = 'degraded';
            issues.push(`High CPU usage: ${cpuUsage}%`);
        }
        
        if (responseTime > this.monitoringConfig.alertThresholds.responseTime) {
            overall = 'degraded';
            issues.push(`High response time: ${responseTime}ms`);
        }
        
        if (errorRate > this.monitoringConfig.alertThresholds.errorRate) {
            overall = 'unhealthy';
            issues.push(`High error rate: ${errorRate}%`);
        }
        
        if (this.serviceStatus.discordBot !== 'healthy') {
            overall = 'unhealthy';
            issues.push('Discord bot connection issues');
        }
        
        return {
            overall,
            issues,
            lastCheck: new Date().toISOString()
        };
    }

    getDetailedMetrics() {
        return {
            system: {
                platform: os.platform(),
                arch: os.arch(),
                nodeVersion: process.version,
                uptime: process.uptime(),
                memory: {
                    used: process.memoryUsage(),
                    total: os.totalmem(),
                    free: os.freemem()
                },
                cpu: {
                    usage: this.getCPUUsage(),
                    cores: os.cpus().length
                }
            },
            application: {
                startTime: this.metrics.startTime,
                totalRequests: this.metrics.totalRequests,
                totalErrors: this.metrics.totalErrors,
                errorRate: this.getErrorRate(),
                averageResponseTime: this.getAverageResponseTime()
            },
            discord: {
                botStatus: this.serviceStatus.discordBot,
                guildCount: this.client.guilds.cache.size,
                ping: this.client.ws.ping,
                lastReady: this.client.readyAt
            },
            services: this.serviceStatus
        };
    }

    generateStatusPage() {
        const health = this.getHealthStatus();
        const metrics = this.getDetailedMetrics();
        
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Growmies NJ Bot - Status</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
                .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .header { text-align: center; margin-bottom: 30px; }
                .status-indicator { display: inline-block; width: 12px; height: 12px; border-radius: 50%; margin-right: 8px; }
                .healthy { background-color: #28a745; }
                .degraded { background-color: #ffc107; }
                .unhealthy { background-color: #dc3545; }
                .metric { margin: 10px 0; padding: 10px; background: #f8f9fa; border-radius: 4px; }
                .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
            </style>
            <script>
                setTimeout(() => location.reload(), 30000); // Auto-refresh every 30 seconds
            </script>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🌱 Growmies NJ Bot Status</h1>
                    <p><span class="status-indicator ${health.overall}"></span>Overall Status: ${health.overall.toUpperCase()}</p>
                    <p>Last Updated: ${new Date().toLocaleString()}</p>
                </div>
                
                <div class="grid">
                    <div class="metric">
                        <h3>🤖 Discord Bot</h3>
                        <p>Status: ${this.serviceStatus.discordBot}</p>
                        <p>Ping: ${this.client.ws.ping}ms</p>
                        <p>Uptime: ${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m</p>
                    </div>
                    
                    <div class="metric">
                        <h3>💾 Memory Usage</h3>
                        <p>${this.getMemoryUsage()}% of ${Math.round(os.totalmem() / 1024 / 1024 / 1024)}GB</p>
                    </div>
                    
                    <div class="metric">
                        <h3>⚡ Performance</h3>
                        <p>Requests: ${this.metrics.totalRequests}</p>
                        <p>Error Rate: ${this.getErrorRate()}%</p>
                        <p>Avg Response: ${this.getAverageResponseTime()}ms</p>
                    </div>
                    
                    <div class="metric">
                        <h3>🔗 Services</h3>
                        <p>Discord API: ${this.serviceStatus.discordAPI}</p>
                        <p>Instagram: ${this.serviceStatus.instagramIntegration}</p>
                        <p>Web Server: ${this.serviceStatus.webServer}</p>
                    </div>
                </div>
                
                ${health.issues.length > 0 ? `
                <div class="metric" style="background: #f8d7da; color: #721c24;">
                    <h3>⚠️ Current Issues</h3>
                    <ul>${health.issues.map(issue => `<li>${issue}</li>`).join('')}</ul>
                </div>
                ` : ''}
            </div>
        </body>
        </html>
        `;
    }

    startMonitoring() {
        console.log('👁️ Starting continuous monitoring...');
        
        // Monitor Discord bot connection
        this.monitorDiscordConnection();
        
        // Monitor system resources
        setInterval(() => {
            this.recordSystemMetrics();
            this.checkHealthThresholds();
        }, this.monitoringConfig.checkInterval);
        
        // Monitor third-party services
        setInterval(() => {
            this.monitorThirdPartyServices();
        }, 5 * 60 * 1000); // Every 5 minutes
        
        // Cleanup old metrics
        setInterval(() => {
            this.cleanupOldMetrics();
        }, 60 * 60 * 1000); // Every hour
    }

    monitorDiscordConnection() {
        this.client.on('ready', () => {
            this.serviceStatus.discordBot = 'healthy';
            this.serviceStatus.discordAPI = 'healthy';
            console.log('✅ Discord bot connection healthy');
        });

        this.client.on('disconnect', () => {
            this.serviceStatus.discordBot = 'unhealthy';
            this.sendAlert('Discord bot disconnected', 'critical');
        });

        this.client.on('error', (error) => {
            this.serviceStatus.discordBot = 'degraded';
            this.sendAlert(`Discord bot error: ${error.message}`, 'warning');
        });

        this.client.on('warn', (warning) => {
            console.warn('⚠️ Discord warning:', warning);
        });
    }

    async monitorThirdPartyServices() {
        console.log('🔍 Monitoring third-party services...');
        
        try {
            // Check Discord API status
            const discordApiCheck = await this.checkDiscordAPI();
            this.serviceStatus.discordAPI = discordApiCheck ? 'healthy' : 'degraded';
            
            // Check bot presence in guild
            const botChecks = await this.checkThirdPartyBots();
            this.serviceStatus.thirdPartyBots = botChecks;
            
            // Check Instagram integration
            this.serviceStatus.instagramIntegration = 'healthy'; // Simplified for this example
            
            // Update web server status
            this.serviceStatus.webServer = 'healthy';
            
        } catch (error) {
            console.error('❌ Third-party service monitoring failed:', error.message);
        }
    }

    async checkDiscordAPI() {
        try {
            await this.client.application.fetch();
            return true;
        } catch (error) {
            return false;
        }
    }

    async checkThirdPartyBots() {
        const botIds = {
            'Carl-bot': '235148962103951360',
            'Sesh': '791661919772278815',
            'Statbot': '585742646102548500',
            'Xenon': '416358583220043796'
        };

        const statuses = {};
        
        for (const [botName, botId] of Object.entries(botIds)) {
            try {
                const member = await this.guild.members.fetch(botId);
                statuses[botName] = member && member.presence?.status !== 'offline' ? 'healthy' : 'offline';
            } catch (error) {
                statuses[botName] = 'missing';
            }
        }
        
        return statuses;
    }

    recordSystemMetrics() {
        const now = Date.now();
        
        // Record memory usage
        const memoryUsage = this.getMemoryUsage();
        this.metrics.memoryUsageHistory.push({ timestamp: now, value: memoryUsage });
        
        // Record CPU usage (simplified)
        const cpuUsage = this.getCPUUsage();
        this.metrics.cpuUsageHistory.push({ timestamp: now, value: cpuUsage });
        
        // Update last health check
        this.metrics.lastHealthCheck = new Date().toISOString();
    }

    checkHealthThresholds() {
        const health = this.getHealthStatus();
        
        if (health.overall === 'unhealthy') {
            this.sendAlert('System unhealthy: ' + health.issues.join(', '), 'critical');
        } else if (health.overall === 'degraded') {
            this.sendAlert('System degraded: ' + health.issues.join(', '), 'warning');
        }
    }

    async sendAlert(message, severity = 'info') {
        console.log(`🚨 Alert [${severity}]: ${message}`);
        
        // Prevent spam by checking recent alerts
        const recentAlert = this.metrics.alertsSent.find(alert => 
            alert.message === message && 
            Date.now() - alert.timestamp < 10 * 60 * 1000 // 10 minutes
        );
        
        if (recentAlert) {
            return; // Skip duplicate alert
        }
        
        // Record alert
        this.metrics.alertsSent.push({
            message,
            severity,
            timestamp: Date.now()
        });
        
        // Send to monitoring webhook if configured
        if (this.monitoringWebhook) {
            const embed = new EmbedBuilder()
                .setTitle(`🚨 ${severity.toUpperCase()} Alert`)
                .setDescription(message)
                .setColor(severity === 'critical' ? 0xFF0000 : severity === 'warning' ? 0xFFA500 : 0x00FF00)
                .setTimestamp()
                .addFields([
                    {
                        name: '🖥️ System Info',
                        value: `Memory: ${this.getMemoryUsage()}%\nCPU: ${this.getCPUUsage()}%\nUptime: ${Math.floor(process.uptime() / 3600)}h`,
                        inline: true
                    },
                    {
                        name: '🤖 Bot Status',
                        value: `Discord: ${this.serviceStatus.discordBot}\nPing: ${this.client.ws.ping}ms`,
                        inline: true
                    }
                ]);
            
            try {
                await this.monitoringWebhook.send({ embeds: [embed] });
            } catch (error) {
                console.error('❌ Failed to send alert webhook:', error.message);
            }
        }
    }

    cleanupOldMetrics() {
        const cutoff = Date.now() - this.monitoringConfig.retentionPeriod;
        
        this.metrics.memoryUsageHistory = this.metrics.memoryUsageHistory.filter(m => m.timestamp > cutoff);
        this.metrics.cpuUsageHistory = this.metrics.cpuUsageHistory.filter(m => m.timestamp > cutoff);
        this.metrics.responseTimeHistory = this.metrics.responseTimeHistory.filter(m => m.timestamp > cutoff);
        this.metrics.alertsSent = this.metrics.alertsSent.filter(a => a.timestamp > cutoff);
    }

    getMemoryUsage() {
        const used = process.memoryUsage().heapUsed;
        const total = os.totalmem();
        return Math.round((used / total) * 100);
    }

    getCPUUsage() {
        // Simplified CPU usage calculation
        const cpus = os.cpus();
        let totalIdle = 0;
        let totalTick = 0;
        
        cpus.forEach(cpu => {
            for (const type in cpu.times) {
                totalTick += cpu.times[type];
            }
            totalIdle += cpu.times.idle;
        });
        
        const idle = totalIdle / cpus.length;
        const total = totalTick / cpus.length;
        
        return Math.round(100 - (100 * idle / total));
    }

    getAverageResponseTime() {
        if (this.metrics.responseTimeHistory.length === 0) return 0;
        
        const recent = this.metrics.responseTimeHistory.slice(-10); // Last 10 measurements
        const sum = recent.reduce((acc, curr) => acc + curr.value, 0);
        return Math.round(sum / recent.length);
    }

    getErrorRate() {
        if (this.metrics.totalRequests === 0) return 0;
        return Math.round((this.metrics.totalErrors / this.metrics.totalRequests) * 100);
    }

    async saveConfiguration() {
        console.log('💾 Saving monitoring configuration...');
        
        const config = {
            monitoringSystem: {
                healthCheckPort: this.healthCheckPort,
                endpoints: {
                    health: `http://localhost:${this.healthCheckPort}${this.monitoringConfig.healthCheckEndpoint}`,
                    metrics: `http://localhost:${this.healthCheckPort}${this.monitoringConfig.metricsEndpoint}`,
                    status: `http://localhost:${this.healthCheckPort}${this.monitoringConfig.statusEndpoint}`
                },
                alertThresholds: this.monitoringConfig.alertThresholds,
                checkInterval: this.monitoringConfig.checkInterval
            },
            setupInstructions: [
                '1. Configure monitoring webhook in Discord',
                '2. Set up external monitoring (UptimeRobot, Pingdom, etc.)',
                '3. Configure log aggregation and analysis',
                '4. Set up automated restart procedures',
                '5. Test alert notification system',
                '6. Configure backup monitoring systems'
            ],
            externalMonitoring: {
                uptimeRobot: {
                    url: `http://localhost:${this.healthCheckPort}/health`,
                    interval: 5, // minutes
                    alertContacts: 'Discord webhook, email'
                },
                logAggregation: {
                    enabled: false,
                    service: 'CloudWatch, Papertrail, or Loggly',
                    retention: '30 days'
                }
            }
        };
        
        const configPath = path.join(__dirname, '..', 'config', 'monitoring.json');
        await fs.mkdir(path.dirname(configPath), { recursive: true });
        await fs.writeFile(configPath, JSON.stringify(config, null, 2));
        
        console.log('✅ Monitoring configuration saved');
        return config;
    }

    async execute() {
        try {
            console.log('🔍 Starting Health Monitoring System Setup...');
            
            await this.initialize();
            const config = await this.saveConfiguration();
            
            console.log('\n🎉 Health Monitoring System Active!');
            console.log(`📊 Status dashboard: http://localhost:${this.healthCheckPort}/status`);
            console.log(`🔍 Health endpoint: http://localhost:${this.healthCheckPort}/health`);
            console.log(`📈 Metrics endpoint: http://localhost:${this.healthCheckPort}/metrics`);
            
            // Keep the process running
            return new Promise((resolve) => {
                process.on('SIGINT', () => {
                    console.log('🛑 Shutting down monitoring system...');
                    this.client.destroy();
                    resolve(config);
                });
            });
            
        } catch (error) {
            console.error('❌ Monitoring system setup failed:', error.message);
            throw error;
        }
    }
}

// Execute if run directly
if (require.main === module) {
    const monitor = new HealthMonitoringSystem();
    monitor.execute()
        .then((config) => {
            console.log('✅ Monitoring system setup completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Setup failed:', error.message);
            process.exit(1);
        });
}

module.exports = HealthMonitoringSystem;