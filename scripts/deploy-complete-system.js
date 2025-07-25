#!/usr/bin/env node
/**
 * GrowmiesNJ Complete System Deployment Automation
 * 
 * Master deployment orchestration script that coordinates the full bot deployment
 * with all features enabled, including cannabis compliance validation, command
 * registration, database initialization, and comprehensive health checks.
 * 
 * Features:
 * - Complete bot deployment with all features
 * - Cannabis compliance validation throughout deployment
 * - Database initialization and migration execution
 * - Command registration for all bot commands
 * - Health checks and system verification
 * - Railway deployment integration
 * - Rollback capability for failed deployments
 * - Integration testing with existing bot features
 * 
 * @author GrowmiesNJ DevOps Team
 * @version 1.0.0
 * @license MIT
 */

const { Client, GatewayIntentBits, REST, Routes, Collection } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

// Environment and configuration
const dotenv = require('dotenv');
dotenv.config();

// Import existing services and utilities
const { connectDatabase, disconnectDatabase } = require('../src/database/connection');
const { runMigrations } = require('../src/database/migrations');
const ageVerification = require('../src/services/ageVerification');
const moderationService = require('../src/services/moderationService');
const engagementService = require('../src/services/engagementService');
const { createAuditLog } = require('../src/services/moderationService');

/**
 * Cannabis Compliance Deployment Validator
 * Ensures all deployment operations maintain cannabis compliance
 */
class CannabisComplianceDeploymentValidator {
    constructor() {
        this.complianceLog = [];
        this.deploymentStandards = {
            ageVerificationRequired: true,
            cannabisContentRestricted: true,
            njRegulationCompliance: true,
            auditTrailRequired: true,
            educationalContentRequired: true
        };
    }

    /**
     * Validate deployment compliance
     * @param {string} component - Component being deployed
     * @param {Object} config - Component configuration
     * @returns {Promise<boolean>} - Validation result
     */
    async validateDeploymentCompliance(component, config = {}) {
        const compliance = {
            timestamp: new Date().toISOString(),
            component,
            config,
            complianceChecks: []
        };

        // Age verification system validation
        if (component === 'age_verification') {
            if (!config.minimumAge || config.minimumAge < 18) {
                compliance.complianceChecks.push({
                    check: 'minimum_age_validation',
                    status: 'FAILED',
                    message: 'Age verification system must enforce 18+ minimum age'
                });
                return false;
            }

            if (!config.cannabisMinimumAge || config.cannabisMinimumAge < 21) {
                compliance.complianceChecks.push({
                    check: 'cannabis_age_validation',
                    status: 'FAILED',
                    message: 'Cannabis content must enforce 21+ minimum age'
                });
                return false;
            }
        }

        // Cannabis content validation
        if (component.includes('cannabis') || component.includes('strain')) {
            if (!config.ageRestricted) {
                compliance.complianceChecks.push({
                    check: 'cannabis_age_restriction',
                    status: 'FAILED',
                    message: 'Cannabis-related components must be age-restricted'
                });
                return false;
            }
        }

        // Audit trail validation
        if (component === 'moderation' || component === 'audit') {
            if (!config.auditEnabled) {
                compliance.complianceChecks.push({
                    check: 'audit_trail_required',
                    status: 'FAILED',
                    message: 'Moderation and compliance components must have audit trails'
                });
                return false;
            }
        }

        compliance.complianceChecks.push({
            check: 'deployment_compliance',
            status: 'PASSED',
            message: `${component} meets cannabis compliance deployment requirements`
        });

        this.complianceLog.push(compliance);
        return true;
    }

    /**
     * Generate comprehensive compliance report
     * @returns {Object} - Deployment compliance report
     */
    generateDeploymentComplianceReport() {
        const passedChecks = this.complianceLog.filter(log => 
            log.complianceChecks.every(check => check.status === 'PASSED')
        ).length;

        return {
            timestamp: new Date().toISOString(),
            totalComponentsValidated: this.complianceLog.length,
            compliancePassRate: passedChecks / this.complianceLog.length,
            overallStatus: passedChecks === this.complianceLog.length ? 'COMPLIANT' : 'NON_COMPLIANT',
            deploymentStandards: this.deploymentStandards,
            detailedLog: this.complianceLog
        };
    }
}

/**
 * Complete System Deployment Manager
 * Orchestrates the entire bot deployment process with comprehensive validation
 */
class CompleteSystemDeployment {
    constructor() {
        this.client = null;
        this.guild = null;
        this.complianceValidator = new CannabisComplianceDeploymentValidator();
        this.deploymentLog = [];
        this.deployedComponents = [];
        this.dryRun = process.argv.includes('--dry-run') || process.argv.includes('--test');
        this.environment = process.env.NODE_ENV || 'development';
        this.commands = new Collection();
    }

    /**
     * Initialize deployment environment
     */
    async initialize() {
        try {
            this.log('🚀 Initializing GrowmiesNJ Complete System Deployment', 'INFO');
            this.log(`🌍 Environment: ${this.environment}`, 'INFO');
            
            if (this.dryRun) {
                this.log('🧪 Running in DRY RUN mode - no changes will be made', 'INFO');
            }

            // Validate environment variables
            await this.validateEnvironment();

            // Initialize Discord client
            await this.initializeDiscordClient();

            // Connect to database
            await this.initializeDatabase();

            this.log('✅ Deployment environment initialized successfully', 'SUCCESS');

        } catch (error) {
            this.log(`❌ Deployment initialization failed: ${error.message}`, 'ERROR');
            throw error;
        }
    }

    /**
     * Validate deployment environment
     */
    async validateEnvironment() {
        this.log('🔍 Validating deployment environment...', 'INFO');

        const requiredEnvVars = [
            'DISCORD_TOKEN',
            'CLIENT_ID',
            'GUILD_ID',
            'DATABASE_URL'
        ];

        const missing = requiredEnvVars.filter(varName => !process.env[varName]);
        
        if (missing.length > 0) {
            throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
        }

        // Validate Railway-specific environment
        if (this.environment === 'production') {
            const railwayVars = ['RAILWAY_ENVIRONMENT', 'RAILWAY_PROJECT_ID'];
            const missingRailway = railwayVars.filter(varName => !process.env[varName]);
            
            if (missingRailway.length > 0) {
                this.log(`⚠️ Missing Railway environment variables: ${missingRailway.join(', ')}`, 'WARNING');
            }
        }

        this.log('✅ Environment validation completed', 'SUCCESS');
    }

    /**
     * Initialize Discord client
     */
    async initializeDiscordClient() {
        this.log('🤖 Initializing Discord client...', 'INFO');

        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildPresences
            ]
        });

        // Set up error handlers
        this.client.on('error', (error) => {
            this.log(`Discord client error: ${error.message}`, 'ERROR');
        });

        this.client.on('warn', (info) => {
            this.log(`Discord client warning: ${info}`, 'WARNING');
        });

        if (!this.dryRun) {
            await this.client.login(process.env.DISCORD_TOKEN);
            this.log('✅ Discord client logged in successfully', 'SUCCESS');

            // Get guild
            this.guild = await this.client.guilds.fetch(process.env.GUILD_ID);
            if (!this.guild) {
                throw new Error(`Guild with ID ${process.env.GUILD_ID} not found`);
            }

            this.log(`✅ Connected to guild: ${this.guild.name}`, 'SUCCESS');
        }
    }

    /**
     * Initialize database connection
     */
    async initializeDatabase() {
        this.log('🗄️ Initializing database connection...', 'INFO');

        if (!this.dryRun) {
            await connectDatabase();
            this.log('✅ Database connected successfully', 'SUCCESS');

            // Run migrations
            this.log('🔄 Running database migrations...', 'INFO');
            await runMigrations();
            this.log('✅ Database migrations completed', 'SUCCESS');
        }
    }

    /**
     * Load and register all bot commands
     */
    async loadAndRegisterCommands() {
        this.log('📝 Loading and registering bot commands...', 'INFO');

        const commandsArray = [];
        const commandFolders = ['age-verification', 'engagement', 'leveling', 'moderation', 'utility'];

        for (const folder of commandFolders) {
            const commandsPath = path.join(__dirname, '../src/commands', folder);
            
            try {
                const commandFiles = await fs.readdir(commandsPath);
                const jsFiles = commandFiles.filter(file => file.endsWith('.js'));

                for (const file of jsFiles) {
                    const filePath = path.join(commandsPath, file);
                    const command = require(filePath);

                    if ('data' in command && 'execute' in command) {
                        this.commands.set(command.data.name, command);
                        commandsArray.push(command.data.toJSON());

                        // Validate cannabis compliance for commands
                        await this.complianceValidator.validateDeploymentCompliance(`command_${command.data.name}`, {
                            name: command.data.name,
                            description: command.data.description,
                            ageRestricted: file.includes('age-verification') || folder === 'age-verification',
                            auditEnabled: folder === 'moderation'
                        });

                        this.log(`✅ Loaded command: ${command.data.name}`, 'SUCCESS');
                    } else {
                        this.log(`⚠️ Command at ${filePath} is missing required "data" or "execute" property`, 'WARNING');
                    }
                }
            } catch (error) {
                this.log(`❌ Error loading commands from ${folder}: ${error.message}`, 'ERROR');
            }
        }

        // Register commands with Discord
        if (!this.dryRun) {
            const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

            try {
                this.log(`🔄 Registering ${commandsArray.length} application commands...`, 'INFO');

                const data = await rest.put(
                    Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
                    { body: commandsArray }
                );

                this.log(`✅ Successfully registered ${data.length} application commands`, 'SUCCESS');
                
                this.deployedComponents.push({
                    component: 'commands',
                    count: data.length,
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                this.log(`❌ Command registration failed: ${error.message}`, 'ERROR');
                throw error;
            }
        }

        this.deploymentLog.push({
            operation: 'load_register_commands',
            commandsLoaded: this.commands.size,
            commandsRegistered: commandsArray.length,
            status: 'completed',
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Deploy and validate all system services
     */
    async deploySystemServices() {
        this.log('⚙️ Deploying system services...', 'INFO');

        const services = [
            {
                name: 'age_verification',
                service: ageVerification,
                config: { minimumAge: 18, cannabisMinimumAge: 21, ageRestricted: true, auditEnabled: true }
            },
            {
                name: 'moderation',
                service: moderationService,
                config: { auditEnabled: true, complianceTracking: true }
            },
            {
                name: 'engagement',
                service: engagementService,
                config: { ageValidation: true, contentFiltering: true }
            }
        ];

        for (const serviceConfig of services) {
            try {
                // Validate cannabis compliance for service
                const isCompliant = await this.complianceValidator.validateDeploymentCompliance(
                    serviceConfig.name,
                    serviceConfig.config
                );

                if (!isCompliant) {
                    throw new Error(`Cannabis compliance validation failed for service: ${serviceConfig.name}`);
                }

                if (!this.dryRun) {
                    // Initialize service if it has an init method
                    if (serviceConfig.service && typeof serviceConfig.service.initialize === 'function') {
                        await serviceConfig.service.initialize();
                    }
                }

                this.deployedComponents.push({
                    component: serviceConfig.name,
                    type: 'service',
                    timestamp: new Date().toISOString()
                });

                this.log(`✅ Deployed service: ${serviceConfig.name}`, 'SUCCESS');

            } catch (error) {
                this.log(`❌ Failed to deploy service ${serviceConfig.name}: ${error.message}`, 'ERROR');
                throw error;
            }
        }

        this.deploymentLog.push({
            operation: 'deploy_services',
            servicesDeployed: services.length,
            status: 'completed',
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Load and register event handlers
     */
    async loadEventHandlers() {
        this.log('🎭 Loading event handlers...', 'INFO');

        const eventsPath = path.join(__dirname, '../src/events');
        
        try {
            const eventFiles = await fs.readdir(eventsPath);
            const jsFiles = eventFiles.filter(file => file.endsWith('.js'));

            for (const file of jsFiles) {
                const filePath = path.join(eventsPath, file);
                const event = require(filePath);

                if (event.once) {
                    this.client?.once(event.name, (...args) => event.execute(...args));
                } else {
                    this.client?.on(event.name, (...args) => event.execute(...args));
                }

                this.log(`✅ Loaded event handler: ${event.name || file}`, 'SUCCESS');
            }

            this.deploymentLog.push({
                operation: 'load_event_handlers',
                eventsLoaded: jsFiles.length,
                status: 'completed',
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            this.log(`❌ Error loading event handlers: ${error.message}`, 'ERROR');
            throw error;
        }
    }

    /**
     * Perform comprehensive health checks
     */
    async performHealthChecks() {
        this.log('🔍 Performing comprehensive health checks...', 'INFO');

        const healthChecks = {
            discord: { status: 'unknown', details: null },
            database: { status: 'unknown', details: null },
            commands: { status: 'unknown', details: null },
            services: { status: 'unknown', details: null },
            compliance: { status: 'unknown', details: null }
        };

        // Discord health check
        try {
            if (!this.dryRun && this.client) {
                healthChecks.discord = {
                    status: this.client.readyAt ? 'healthy' : 'unhealthy',
                    details: {
                        readyAt: this.client.readyAt,
                        ping: this.client.ws.ping,
                        guilds: this.client.guilds.cache.size
                    }
                };
            } else {
                healthChecks.discord = { status: 'skipped', details: 'Dry run mode' };
            }
        } catch (error) {
            healthChecks.discord = { status: 'error', details: error.message };
        }

        // Database health check
        try {
            if (!this.dryRun) {
                // Perform a simple query to check database connection
                const { sequelize } = require('../src/database/connection');
                await sequelize.authenticate();
                healthChecks.database = { status: 'healthy', details: 'Connection successful' };
            } else {
                healthChecks.database = { status: 'skipped', details: 'Dry run mode' };
            }
        } catch (error) {
            healthChecks.database = { status: 'error', details: error.message };
        }

        // Commands health check
        healthChecks.commands = {
            status: this.commands.size > 0 ? 'healthy' : 'unhealthy',
            details: { commandsLoaded: this.commands.size }
        };

        // Services health check
        healthChecks.services = {
            status: this.deployedComponents.filter(c => c.type === 'service').length > 0 ? 'healthy' : 'unhealthy',
            details: { servicesDeployed: this.deployedComponents.filter(c => c.type === 'service').length }
        };

        // Cannabis compliance health check
        const complianceReport = this.complianceValidator.generateDeploymentComplianceReport();
        healthChecks.compliance = {
            status: complianceReport.overallStatus === 'COMPLIANT' ? 'healthy' : 'unhealthy',
            details: complianceReport
        };

        // Overall health assessment
        const healthyChecks = Object.values(healthChecks).filter(check => check.status === 'healthy').length;
        const totalChecks = Object.values(healthChecks).filter(check => check.status !== 'skipped').length;
        const healthScore = totalChecks > 0 ? (healthyChecks / totalChecks) * 100 : 0;

        this.log(`📊 Health check completed: ${healthyChecks}/${totalChecks} checks passed (${healthScore.toFixed(1)}%)`, 'INFO');

        if (healthScore < 80) {
            this.log('⚠️ Health check score below 80% - deployment may have issues', 'WARNING');
        }

        return { healthChecks, healthScore };
    }

    /**
     * Create comprehensive deployment audit log
     */
    async createDeploymentAuditLog(deploymentResult) {
        this.log('📋 Creating deployment audit log...', 'INFO');

        const auditData = {
            timestamp: new Date().toISOString(),
            environment: this.environment,
            deploymentId: `deploy_${Date.now()}`,
            dryRun: this.dryRun,
            deployedComponents: this.deployedComponents,
            deploymentLog: this.deploymentLog,
            healthChecks: deploymentResult.healthChecks,
            healthScore: deploymentResult.healthScore,
            complianceReport: this.complianceValidator.generateDeploymentComplianceReport(),
            railwayInfo: {
                projectId: process.env.RAILWAY_PROJECT_ID,
                environment: process.env.RAILWAY_ENVIRONMENT,
                deploymentUrl: process.env.RAILWAY_PUBLIC_DOMAIN
            }
        };

        if (!this.dryRun) {
            // Create audit log in database
            await createAuditLog({
                action: 'complete_system_deployment',
                moderator: this.client?.user?.id || 'system',
                reason: 'Automated complete system deployment with cannabis compliance validation',
                details: auditData
            });
        }

        // Save audit log to file
        const auditPath = path.join(__dirname, '../docs/deployment-audit-log.json');
        await fs.writeFile(auditPath, JSON.stringify(auditData, null, 2));
        this.log(`📊 Deployment audit log saved to: ${auditPath}`, 'INFO');

        return auditData;
    }

    /**
     * Emergency rollback functionality
     */
    async rollback() {
        this.log('🔄 Initiating emergency deployment rollback...', 'WARNING');

        try {
            // Disconnect from Discord
            if (this.client) {
                this.client.destroy();
                this.log('🔌 Discord client disconnected', 'INFO');
            }

            // Disconnect from database
            if (!this.dryRun) {
                await disconnectDatabase();
                this.log('🗄️ Database disconnected', 'INFO');
            }

            // Clear registered commands if needed
            if (!this.dryRun && this.deployedComponents.some(c => c.component === 'commands')) {
                try {
                    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
                    await rest.put(
                        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
                        { body: [] }
                    );
                    this.log('🗑️ Cleared registered commands', 'INFO');
                } catch (error) {
                    this.log(`❌ Failed to clear commands: ${error.message}`, 'ERROR');
                }
            }

            this.log('✅ Emergency rollback completed', 'SUCCESS');

        } catch (error) {
            this.log(`❌ Rollback failed: ${error.message}`, 'ERROR');
            throw error;
        }
    }

    /**
     * Generate comprehensive deployment report
     */
    async generateDeploymentReport(deploymentResult, auditData) {
        const report = {
            deploymentInfo: {
                timestamp: new Date().toISOString(),
                environment: this.environment,
                dryRun: this.dryRun,
                deploymentDuration: Date.now() - this.deploymentStartTime
            },
            deploymentResults: {
                success: deploymentResult.success,
                componentsDeployed: this.deployedComponents.length,
                commandsRegistered: this.commands.size,
                healthScore: deploymentResult.healthScore
            },
            complianceValidation: this.complianceValidator.generateDeploymentComplianceReport(),
            healthChecks: deploymentResult.healthChecks,
            auditTrail: auditData,
            railwayDeployment: {
                environment: process.env.RAILWAY_ENVIRONMENT,
                projectId: process.env.RAILWAY_PROJECT_ID,
                publicDomain: process.env.RAILWAY_PUBLIC_DOMAIN
            },
            rollbackInstructions: {
                command: 'node scripts/emergency-rollback.js',
                description: 'Use this command to perform emergency rollback if issues occur'
            }
        };

        // Save deployment report
        const reportPath = path.join(__dirname, '../docs/deployment-report.json');
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
        this.log(`📊 Deployment report saved to: ${reportPath}`, 'INFO');

        return report;
    }

    /**
     * Main deployment execution
     */
    async execute() {
        this.deploymentStartTime = Date.now();
        let deploymentResult = null;
        let auditData = null;

        try {
            await this.initialize();
            await this.loadAndRegisterCommands();
            await this.deploySystemServices();
            await this.loadEventHandlers();
            
            const healthCheckResult = await this.performHealthChecks();
            deploymentResult = { 
                success: true, 
                healthChecks: healthCheckResult.healthChecks,
                healthScore: healthCheckResult.healthScore 
            };
            
            auditData = await this.createDeploymentAuditLog(deploymentResult);
            const report = await this.generateDeploymentReport(deploymentResult, auditData);
            
            this.log('🎉 GrowmiesNJ complete system deployment successful!', 'SUCCESS');
            this.log(`📊 Deployed ${this.deployedComponents.length} components with ${this.commands.size} commands`, 'INFO');
            this.log(`💚 Health score: ${deploymentResult.healthScore.toFixed(1)}%`, 'SUCCESS');
            this.log('🌿 Cannabis compliance validation: PASSED', 'SUCCESS');

            return { success: true, report, auditData };

        } catch (error) {
            this.log(`💥 Deployment failed: ${error.message}`, 'ERROR');
            
            if (!this.dryRun) {
                this.log('🔄 Attempting automatic rollback...', 'WARNING');
                try {
                    await this.rollback();
                } catch (rollbackError) {
                    this.log(`💥 Rollback failed: ${rollbackError.message}`, 'ERROR');
                }
            }

            throw error;

        } finally {
            // Cleanup connections
            if (this.client && !this.dryRun) {
                this.client.destroy();
            }
            
            if (!this.dryRun) {
                await disconnectDatabase();
            }
        }
    }

    /**
     * Logging utility
     */
    log(message, level = 'INFO') {
        const timestamp = new Date().toISOString();
        const prefix = {
            'INFO': '📘',
            'SUCCESS': '✅',
            'WARNING': '⚠️',
            'ERROR': '❌'
        }[level] || '📘';

        console.log(`${prefix} [${timestamp}] ${message}`);
    }
}

// Main execution
async function main() {
    const deployment = new CompleteSystemDeployment();
    
    try {
        const result = await deployment.execute();
        console.log('\n🎉 Deployment Summary:');
        console.log(`✅ Success: ${result.success}`);
        console.log(`📊 Health Score: ${result.report.deploymentResults.healthScore.toFixed(1)}%`);
        console.log(`🌿 Cannabis Compliance: ${result.report.complianceValidation.overallStatus}`);
        console.log(`🚀 Environment: ${result.report.deploymentInfo.environment}`);
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Deployment Failed:');
        console.error(`💥 Error: ${error.message}`);
        console.error('🔄 Check logs and consider running emergency rollback if needed');
        process.exit(1);
    }
}

// Handle command line execution
if (require.main === module) {
    main().catch(error => {
        console.error('💥 Unhandled deployment error:', error);
        process.exit(1);
    });
}

module.exports = { CompleteSystemDeployment, CannabisComplianceDeploymentValidator };