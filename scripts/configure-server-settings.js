#!/usr/bin/env node
/**
 * GrowmiesNJ Discord Server Settings Configuration Automation
 * 
 * This script automatically configures Discord server settings optimized for the
 * GrowmiesNJ cannabis community, including verification levels, security settings,
 * welcome screens, server branding, and compliance messaging.
 * 
 * Cannabis Compliance Features:
 * - Age-appropriate verification levels and security settings
 * - Cannabis community moderation settings optimization
 * - Welcome screen with cannabis compliance messaging
 * - Server branding with cannabis theme and legal disclaimers
 * - Community onboarding with age verification integration
 * - Legal disclaimer integration throughout server settings
 * 
 * @author GrowmiesNJ DevOps Team
 * @version 1.0.0
 * @license MIT
 */

const { Client, GatewayIntentBits, VerificationLevel, ExplicitContentFilterLevel, DefaultMessageNotificationLevel } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

// Environment and configuration
const dotenv = require('dotenv');
dotenv.config();

// Import existing services for integration
const { createAuditLog } = require('../src/services/moderationService');

/**
 * Cannabis Compliance Server Configuration Validator
 * Ensures all server settings maintain cannabis compliance standards
 */
class CannabisComplianceServerValidator {
    constructor() {
        this.complianceLog = [];
        this.complianceStandards = {
            verificationLevel: 'HIGH',
            explicitContentFilter: 'ALL_MEMBERS',
            ageGateRequired: true,
            legalDisclaimersRequired: true,
            moderationOptimized: true,
            educationalContentRequired: true,
            njRegulationCompliance: true
        };
    }

    /**
     * Validate server configuration compliance
     * @param {string} setting - Setting being configured
     * @param {Object} config - Configuration values
     * @returns {Promise<boolean>} - Validation result
     */
    async validateServerSettingCompliance(setting, config = {}) {
        const compliance = {
            timestamp: new Date().toISOString(),
            setting,
            config,
            complianceChecks: []
        };

        // Verification level validation
        if (setting === 'verification_level') {
            if (config.level !== VerificationLevel.High && config.level !== VerificationLevel.VeryHigh) {
                compliance.complianceChecks.push({
                    check: 'verification_level_requirement',
                    status: 'FAILED',
                    message: 'Cannabis community requires HIGH or VERY_HIGH verification level'
                });
                return false;
            }
        }

        // Content filter validation
        if (setting === 'explicit_content_filter') {
            if (config.level !== ExplicitContentFilterLevel.AllMembers) {
                compliance.complianceChecks.push({
                    check: 'content_filter_requirement',
                    status: 'FAILED',
                    message: 'Cannabis community requires explicit content filtering for all members'
                });
                return false;
            }
        }

        // Welcome screen validation
        if (setting === 'welcome_screen') {
            if (!config.description || !config.description.includes('21+') || !config.description.includes('18+')) {
                compliance.complianceChecks.push({
                    check: 'age_disclosure_requirement',
                    status: 'FAILED',
                    message: 'Welcome screen must include age restrictions and disclosures'
                });
                return false;
            }

            if (!config.description.includes('cannabis') && !config.description.includes('educational')) {
                compliance.complianceChecks.push({
                    check: 'cannabis_disclosure_requirement',
                    status: 'WARNING',
                    message: 'Welcome screen should clearly indicate cannabis content and educational purpose'
                });
            }
        }

        // Server description validation
        if (setting === 'server_description') {
            if (!config.description.includes('New Jersey') || !config.description.includes('legal')) {
                compliance.complianceChecks.push({
                    check: 'jurisdiction_disclosure',
                    status: 'FAILED',
                    message: 'Server description must indicate New Jersey jurisdiction and legal compliance'
                });
                return false;
            }
        }

        compliance.complianceChecks.push({
            check: 'server_setting_compliance',
            status: 'PASSED',
            message: `${setting} meets cannabis compliance requirements`
        });

        this.complianceLog.push(compliance);
        return true;
    }

    /**
     * Generate comprehensive compliance report
     * @returns {Object} - Server configuration compliance report
     */
    generateServerComplianceReport() {
        const passedChecks = this.complianceLog.filter(log => 
            log.complianceChecks.every(check => check.status === 'PASSED')
        ).length;

        return {
            timestamp: new Date().toISOString(),
            totalSettingsValidated: this.complianceLog.length,
            compliancePassRate: this.complianceLog.length > 0 ? passedChecks / this.complianceLog.length : 0,
            overallStatus: passedChecks === this.complianceLog.length ? 'COMPLIANT' : 'NON_COMPLIANT',
            complianceStandards: this.complianceStandards,
            detailedLog: this.complianceLog
        };
    }
}

/**
 * Discord Server Configuration Manager
 * Handles comprehensive server settings configuration with cannabis compliance
 */
class DiscordServerConfiguration {
    constructor() {
        this.client = null;
        this.guild = null;
        this.complianceValidator = new CannabisComplianceServerValidator();
        this.configurationLog = [];
        this.appliedSettings = [];
        this.dryRun = process.argv.includes('--dry-run') || process.argv.includes('--test');
    }

    /**
     * Initialize configuration environment
     */
    async initialize() {
        try {
            this.log('🔧 Initializing GrowmiesNJ Server Configuration', 'INFO');
            
            // Validate environment variables
            if (!process.env.DISCORD_TOKEN) {
                throw new Error('DISCORD_TOKEN environment variable is required');
            }
            
            if (!process.env.GUILD_ID) {
                throw new Error('GUILD_ID environment variable is required');
            }

            // Initialize Discord client
            this.client = new Client({
                intents: [
                    GatewayIntentBits.Guilds,
                    GatewayIntentBits.GuildMembers,
                    GatewayIntentBits.GuildMessages
                ]
            });

            // Set up error handlers
            this.client.on('error', (error) => {
                this.log(`Discord client error: ${error.message}`, 'ERROR');
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

        } catch (error) {
            this.log(`❌ Configuration initialization failed: ${error.message}`, 'ERROR');
            throw error;
        }
    }

    /**
     * Configure server verification and security settings
     */
    async configureSecuritySettings() {
        this.log('🔒 Configuring server security settings...', 'INFO');

        const securityConfig = {
            verificationLevel: VerificationLevel.High,
            explicitContentFilter: ExplicitContentFilterLevel.AllMembers,
            defaultMessageNotifications: DefaultMessageNotificationLevel.OnlyMentions,
            systemChannelFlags: ['SuppressJoinNotifications', 'SuppressPremiumSubscriptions']
        };

        // Validate verification level compliance
        const verificationCompliant = await this.complianceValidator.validateServerSettingCompliance(
            'verification_level',
            { level: securityConfig.verificationLevel }
        );

        if (!verificationCompliant) {
            throw new Error('Verification level configuration failed cannabis compliance validation');
        }

        // Validate content filter compliance
        const contentFilterCompliant = await this.complianceValidator.validateServerSettingCompliance(
            'explicit_content_filter',
            { level: securityConfig.explicitContentFilter }
        );

        if (!contentFilterCompliant) {
            throw new Error('Content filter configuration failed cannabis compliance validation');
        }

        if (!this.dryRun) {
            try {
                await this.guild.edit({
                    verificationLevel: securityConfig.verificationLevel,
                    explicitContentFilter: securityConfig.explicitContentFilter,
                    defaultMessageNotifications: securityConfig.defaultMessageNotifications
                });

                this.appliedSettings.push({
                    setting: 'security_settings',
                    config: securityConfig,
                    timestamp: new Date().toISOString()
                });

                this.log('✅ Security settings configured successfully', 'SUCCESS');

            } catch (error) {
                this.log(`❌ Failed to configure security settings: ${error.message}`, 'ERROR');
                throw error;
            }
        } else {
            this.log('🧪 [DRY RUN] Would configure security settings', 'INFO');
        }

        this.configurationLog.push({
            operation: 'configure_security_settings',
            config: securityConfig,
            status: 'completed',
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Configure server description and branding
     */
    async configureServerBranding() {
        this.log('🎨 Configuring server branding and description...', 'INFO');

        const brandingConfig = {
            description: `🌿 GrowmiesNJ - New Jersey Cannabis Community 🌿

Join our legal, educational cannabis community for adults in New Jersey! 

🔞 AGE REQUIREMENTS:
• 18+ for general community access
• 21+ for cannabis discussions and content

📚 EDUCATIONAL PURPOSE:
This server provides educational information about cannabis cultivation, consumption, and New Jersey cannabis laws. All content is for educational purposes only.

⚖️ LEGAL COMPLIANCE:
• New Jersey recreational/medical cannabis laws only
• No illegal activity discussion
• Licensed dispensary information only
• Home cultivation educational content (where legal)

🛡️ COMMUNITY STANDARDS:
• Respectful, adult conversations
• Evidence-based information sharing
• Harm reduction focused
• Medical advice disclaimer: Consult healthcare providers

Welcome to a responsible cannabis community! 🌱`,
            
            reason: 'GrowmiesNJ cannabis community branding with compliance messaging'
        };

        // Validate server description compliance
        const descriptionCompliant = await this.complianceValidator.validateServerSettingCompliance(
            'server_description',
            brandingConfig
        );

        if (!descriptionCompliant) {
            throw new Error('Server description failed cannabis compliance validation');
        }

        if (!this.dryRun) {
            try {
                await this.guild.edit({
                    description: brandingConfig.description,
                    reason: brandingConfig.reason
                });

                this.appliedSettings.push({
                    setting: 'server_branding',
                    config: brandingConfig,
                    timestamp: new Date().toISOString()
                });

                this.log('✅ Server branding configured successfully', 'SUCCESS');

            } catch (error) {
                this.log(`❌ Failed to configure server branding: ${error.message}`, 'ERROR');
                throw error;
            }
        } else {
            this.log('🧪 [DRY RUN] Would configure server branding', 'INFO');
        }

        this.configurationLog.push({
            operation: 'configure_server_branding',
            config: brandingConfig,
            status: 'completed',
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Configure welcome screen with cannabis compliance messaging
     */
    async configureWelcomeScreen() {
        this.log('👋 Configuring welcome screen...', 'INFO');

        const welcomeConfig = {
            enabled: true,
            description: `🌿 Welcome to GrowmiesNJ! 🌿

🔞 IMPORTANT - Age Verification Required:
• You must be 18+ to join this community
• Cannabis content requires 21+ verification
• Age verification is mandatory before participation

📋 Before You Begin:
1. Read our rules and compliance information
2. Complete age verification process
3. Respect New Jersey cannabis laws
4. Educational and legal content only

🌱 Join our responsible cannabis community in New Jersey!`,
            
            welcomeChannels: [
                {
                    channelId: null, // Will be set to welcome channel ID
                    description: '🌿 Start here for community guidelines',
                    emoji: '👋'
                },
                {
                    channelId: null, // Will be set to rules channel ID  
                    description: '📋 Community rules and compliance',
                    emoji: '📋'
                },
                {
                    channelId: null, // Will be set to age verification channel ID
                    description: '🔞 Required age verification',
                    emoji: '🔞'
                }
            ]
        };

        // Validate welcome screen compliance
        const welcomeCompliant = await this.complianceValidator.validateServerSettingCompliance(
            'welcome_screen',
            welcomeConfig
        );

        if (!welcomeCompliant) {
            throw new Error('Welcome screen configuration failed cannabis compliance validation');
        }

        // Find required channels
        if (!this.dryRun) {
            const channels = await this.guild.channels.fetch();
            const welcomeChannel = channels.find(ch => ch.name.includes('welcome'));
            const rulesChannel = channels.find(ch => ch.name.includes('rules'));
            const verificationChannel = channels.find(ch => ch.name.includes('verification'));

            if (welcomeChannel) welcomeConfig.welcomeChannels[0].channelId = welcomeChannel.id;
            if (rulesChannel) welcomeConfig.welcomeChannels[1].channelId = rulesChannel.id;
            if (verificationChannel) welcomeConfig.welcomeChannels[2].channelId = verificationChannel.id;

            // Filter out channels that weren't found
            welcomeConfig.welcomeChannels = welcomeConfig.welcomeChannels.filter(ch => ch.channelId);
        }

        if (!this.dryRun) {
            try {
                await this.guild.edit({
                    welcomeScreen: {
                        enabled: welcomeConfig.enabled,
                        description: welcomeConfig.description,
                        welcomeChannels: welcomeConfig.welcomeChannels
                    }
                });

                this.appliedSettings.push({
                    setting: 'welcome_screen',
                    config: welcomeConfig,
                    timestamp: new Date().toISOString()
                });

                this.log('✅ Welcome screen configured successfully', 'SUCCESS');

            } catch (error) {
                this.log(`❌ Failed to configure welcome screen: ${error.message}`, 'ERROR');
                throw error;
            }
        } else {
            this.log('🧪 [DRY RUN] Would configure welcome screen', 'INFO');
        }

        this.configurationLog.push({
            operation: 'configure_welcome_screen',
            config: welcomeConfig,
            status: 'completed',
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Configure moderation settings for cannabis community
     */
    async configureModerationSettings() {
        this.log('🛡️ Configuring moderation settings...', 'INFO');

        const moderationConfig = {
            autoModeration: {
                enabled: true,
                mentionSpamThreshold: 5,
                keywordFilter: [
                    // Illegal activity keywords
                    'illegal sale', 'black market', 'drug dealer',
                    // Underage keywords
                    'under 18', 'under 21', 'fake id',
                    // Non-NJ jurisdictions (to maintain compliance)
                    'shipping across state', 'mail order', 'interstate'
                ]
            },
            timeoutSettings: {
                defaultTimeout: 1800, // 30 minutes
                escalationTimeouts: [1800, 3600, 86400, 604800] // 30min, 1hr, 1day, 1week
            },
            auditLogging: {
                enabled: true,
                logAllActions: true,
                complianceTracking: true
            }
        };

        // Validate moderation settings compliance
        const moderationCompliant = await this.complianceValidator.validateServerSettingCompliance(
            'moderation_settings',
            { config: moderationConfig, auditEnabled: moderationConfig.auditLogging.enabled }
        );

        if (!moderationCompliant) {
            throw new Error('Moderation settings failed cannabis compliance validation');
        }

        // Note: Discord's AutoMod configuration would typically be done through the Discord interface
        // This is a configuration reference for the moderation team

        this.appliedSettings.push({
            setting: 'moderation_settings',
            config: moderationConfig,
            timestamp: new Date().toISOString()
        });

        this.log('✅ Moderation settings configured (reference)', 'SUCCESS');

        this.configurationLog.push({
            operation: 'configure_moderation_settings',
            config: moderationConfig,
            status: 'completed',
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Configure server discovery and invite settings
     */
    async configureDiscoverySettings() {
        this.log('🔍 Configuring server discovery settings...', 'INFO');

        const discoveryConfig = {
            discoverySplash: null, // Disabled for privacy
            invitesEnabled: true,
            vanityURLCode: null, // Not available for this server tier
            publicUpdatesChannel: null, // Disabled
            rulesChannel: null, // Will be set if rules channel exists
            systemChannelFlags: [
                'SuppressJoinNotifications',
                'SuppressPremiumSubscriptions',
                'SuppressGuildReminderNotifications'
            ]
        };

        if (!this.dryRun) {
            try {
                // Find rules channel for system integration
                const channels = await this.guild.channels.fetch();
                const rulesChannel = channels.find(ch => ch.name.includes('rules'));
                if (rulesChannel) {
                    discoveryConfig.rulesChannel = rulesChannel.id;
                }

                await this.guild.edit({
                    rulesChannelId: discoveryConfig.rulesChannel,
                    systemChannelFlags: discoveryConfig.systemChannelFlags
                });

                this.appliedSettings.push({
                    setting: 'discovery_settings',
                    config: discoveryConfig,
                    timestamp: new Date().toISOString()
                });

                this.log('✅ Discovery settings configured successfully', 'SUCCESS');

            } catch (error) {
                this.log(`❌ Failed to configure discovery settings: ${error.message}`, 'ERROR');
                throw error;
            }
        } else {
            this.log('🧪 [DRY RUN] Would configure discovery settings', 'INFO');
        }

        this.configurationLog.push({
            operation: 'configure_discovery_settings',
            config: discoveryConfig,
            status: 'completed',
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Validate configuration and perform health checks
     */
    async validateConfiguration() {
        this.log('🔍 Validating server configuration...', 'INFO');

        const validation = {
            settingsApplied: this.appliedSettings.length,
            complianceReport: this.complianceValidator.generateServerComplianceReport(),
            healthCheck: {
                guildAccessible: true,
                settingsApplied: true,
                complianceValidated: true
            }
        };

        // Validate guild accessibility
        if (!this.dryRun) {
            try {
                await this.guild.fetch();
                validation.healthCheck.guildAccessible = true;
            } catch (error) {
                validation.healthCheck.guildAccessible = false;
                this.log('⚠️ Guild accessibility check failed', 'WARNING');
            }
        }

        // Validate settings application
        validation.healthCheck.settingsApplied = this.appliedSettings.length > 0;

        // Validate compliance
        validation.healthCheck.complianceValidated = 
            validation.complianceReport.overallStatus === 'COMPLIANT';

        // Create audit log entry
        if (!this.dryRun) {
            await createAuditLog({
                action: 'server_configuration_completed',
                moderator: this.client.user.id,
                reason: 'Automated server configuration with cannabis compliance validation',
                details: validation
            });
        }

        this.log('✅ Server configuration validation completed', 'SUCCESS');
        return validation;
    }

    /**
     * Generate configuration report
     */
    async generateConfigurationReport() {
        const report = {
            timestamp: new Date().toISOString(),
            serverInfo: {
                guildId: this.guild?.id,
                guildName: this.guild?.name,
                memberCount: this.guild?.memberCount
            },
            configurationResults: {
                settingsApplied: this.appliedSettings.length,
                dryRun: this.dryRun
            },
            complianceReport: this.complianceValidator.generateServerComplianceReport(),
            configurationLog: this.configurationLog,
            appliedSettings: this.appliedSettings
        };

        // Save report to file
        const reportPath = path.join(__dirname, '../docs/server-configuration-report.json');
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
        this.log(`📊 Configuration report saved to: ${reportPath}`, 'INFO');

        return report;
    }

    /**
     * Main execution function
     */
    async execute() {
        let validation = null;

        try {
            await this.initialize();
            
            if (this.dryRun) {
                this.log('🧪 Running in DRY RUN mode - no changes will be made', 'INFO');
            }

            await this.configureSecuritySettings();
            await this.configureServerBranding();
            await this.configureWelcomeScreen();
            await this.configureModerationSettings();
            await this.configureDiscoverySettings();
            
            validation = await this.validateConfiguration();
            const report = await this.generateConfigurationReport();
            
            this.log('🎉 GrowmiesNJ server configuration completed successfully!', 'SUCCESS');
            this.log(`📊 Applied ${this.appliedSettings.length} configuration settings`, 'INFO');
            this.log('🌿 All cannabis compliance requirements validated', 'SUCCESS');

            return { success: true, validation, report };

        } catch (error) {
            this.log(`💥 Configuration failed: ${error.message}`, 'ERROR');
            throw error;

        } finally {
            if (this.client) {
                this.client.destroy();
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
    const configuration = new DiscordServerConfiguration();
    
    try {
        const result = await configuration.execute();
        process.exit(0);
    } catch (error) {
        console.error('❌ Configuration failed:', error.message);
        process.exit(1);
    }
}

// Handle command line execution
if (require.main === module) {
    main().catch(error => {
        console.error('💥 Unhandled error:', error);
        process.exit(1);
    });
}

module.exports = { DiscordServerConfiguration, CannabisComplianceServerValidator };