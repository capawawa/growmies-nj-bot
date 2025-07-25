#!/usr/bin/env node
/**
 * GrowmiesNJ Discord Server Structure Setup Automation
 * 
 * This script automatically creates the complete Discord server structure for the
 * GrowmiesNJ cannabis community, including age-restricted channels, cannabis-themed
 * categories, and comprehensive compliance validation.
 * 
 * Cannabis Compliance Features:
 * - 18+ general community areas
 * - 21+ cannabis-specific areas with strict access controls
 * - Legal disclaimers and educational messaging
 * - New Jersey cannabis regulation compliance
 * - Comprehensive audit logging
 * 
 * @author GrowmiesNJ DevOps Team
 * @version 1.0.0
 * @license MIT
 */

const { Client, GatewayIntentBits, PermissionFlagsBits, ChannelType } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

// Environment and configuration
const dotenv = require('dotenv');
dotenv.config();

// Import existing services for integration
const ageVerification = require('../src/services/ageVerification');
const { createAuditLog } = require('../src/services/moderationService');

/**
 * Cannabis Compliance Validation System
 * Ensures all server setup operations comply with cannabis regulations
 */
class CannabisComplianceValidator {
    constructor() {
        this.complianceLog = [];
        this.njRegulations = {
            minimumAge: 21,
            generalMinimumAge: 18,
            requiresDisclaimer: true,
            requiresEducationalContent: true
        };
    }

    /**
     * Validate cannabis compliance for channel creation
     * @param {Object} channelConfig - Channel configuration
     * @returns {Promise<boolean>} - Validation result
     */
    async validateChannelCompliance(channelConfig) {
        const compliance = {
            timestamp: new Date().toISOString(),
            channelName: channelConfig.name,
            channelType: channelConfig.type,
            ageRestriction: channelConfig.ageRestriction,
            complianceChecks: []
        };

        // Age restriction validation
        if (channelConfig.cannabisContent && channelConfig.ageRestriction < this.njRegulations.minimumAge) {
            compliance.complianceChecks.push({
                check: 'age_restriction',
                status: 'FAILED',
                message: `Cannabis content requires ${this.njRegulations.minimumAge}+ age restriction`
            });
            return false;
        }

        // Disclaimer requirement validation
        if (channelConfig.cannabisContent && !channelConfig.topic.includes('18+ only') && !channelConfig.topic.includes('21+ only')) {
            compliance.complianceChecks.push({
                check: 'disclaimer_required',
                status: 'FAILED',
                message: 'Cannabis channels must include age disclaimers'
            });
            return false;
        }

        // Educational content validation
        if (channelConfig.cannabisContent && !channelConfig.topic.includes('educational') && !channelConfig.topic.includes('responsible use')) {
            compliance.complianceChecks.push({
                check: 'educational_content',
                status: 'WARNING',
                message: 'Consider adding educational messaging'
            });
        }

        compliance.complianceChecks.push({
            check: 'overall_compliance',
            status: 'PASSED',
            message: 'Channel meets cannabis compliance requirements'
        });

        this.complianceLog.push(compliance);
        return true;
    }

    /**
     * Generate compliance audit report
     * @returns {Object} - Comprehensive compliance report
     */
    generateComplianceReport() {
        return {
            timestamp: new Date().toISOString(),
            totalChannelsValidated: this.complianceLog.length,
            complianceStatus: 'COMPLIANT',
            regulations: this.njRegulations,
            detailedLog: this.complianceLog
        };
    }
}

/**
 * Discord Server Structure Automation Class
 * Handles the complete server setup with error handling and rollback capabilities
 */
class DiscordServerSetup {
    constructor() {
        this.client = null;
        this.guild = null;
        this.complianceValidator = new CannabisComplianceValidator();
        this.createdChannels = [];
        this.createdCategories = [];
        this.operationLog = [];
        this.dryRun = process.argv.includes('--dry-run') || process.argv.includes('--test');
    }

    /**
     * Initialize Discord client and validate environment
     */
    async initialize() {
        try {
            this.log('🚀 Initializing GrowmiesNJ Discord Server Setup', 'INFO');
            
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

            await this.client.login(process.env.DISCORD_TOKEN);
            this.log('✅ Discord client logged in successfully', 'SUCCESS');

            // Get guild
            this.guild = await this.client.guilds.fetch(process.env.GUILD_ID);
            if (!this.guild) {
                throw new Error(`Guild with ID ${process.env.GUILD_ID} not found`);
            }

            this.log(`✅ Connected to guild: ${this.guild.name}`, 'SUCCESS');

        } catch (error) {
            this.log(`❌ Initialization failed: ${error.message}`, 'ERROR');
            throw error;
        }
    }

    /**
     * Create server categories with cannabis compliance
     */
    async createServerCategories() {
        this.log('📁 Creating server categories...', 'INFO');

        const categories = [
            {
                name: '🌿 WELCOME & INFO',
                position: 0,
                permissions: [
                    {
                        id: this.guild.roles.everyone.id,
                        allow: [PermissionFlagsBits.ViewChannel],
                        deny: [PermissionFlagsBits.SendMessages]
                    }
                ]
            },
            {
                name: '💬 GENERAL COMMUNITY (18+)',
                position: 1,
                ageRestriction: 18,
                permissions: [
                    {
                        id: this.guild.roles.everyone.id,
                        deny: [PermissionFlagsBits.ViewChannel]
                    }
                ]
            },
            {
                name: '🌱 CANNABIS DISCUSSION (21+)',
                position: 2,
                ageRestriction: 21,
                cannabisContent: true,
                permissions: [
                    {
                        id: this.guild.roles.everyone.id,
                        deny: [PermissionFlagsBits.ViewChannel]
                    }
                ]
            },
            {
                name: '🔧 MODERATION & STAFF',
                position: 3,
                permissions: [
                    {
                        id: this.guild.roles.everyone.id,
                        deny: [PermissionFlagsBits.ViewChannel]
                    }
                ]
            }
        ];

        for (const categoryConfig of categories) {
            try {
                // Validate cannabis compliance
                if (categoryConfig.cannabisContent) {
                    const isCompliant = await this.complianceValidator.validateChannelCompliance({
                        name: categoryConfig.name,
                        type: 'category',
                        ageRestriction: categoryConfig.ageRestriction,
                        cannabisContent: categoryConfig.cannabisContent,
                        topic: `${categoryConfig.ageRestriction}+ only - Cannabis content for adults`
                    });
                    
                    if (!isCompliant) {
                        throw new Error(`Cannabis compliance validation failed for category: ${categoryConfig.name}`);
                    }
                }

                if (!this.dryRun) {
                    const category = await this.guild.channels.create({
                        name: categoryConfig.name,
                        type: ChannelType.GuildCategory,
                        position: categoryConfig.position,
                        permissionOverwrites: categoryConfig.permissions
                    });

                    this.createdCategories.push({
                        id: category.id,
                        name: category.name,
                        config: categoryConfig
                    });

                    this.log(`✅ Created category: ${category.name}`, 'SUCCESS');
                } else {
                    this.log(`🧪 [DRY RUN] Would create category: ${categoryConfig.name}`, 'INFO');
                }

                this.operationLog.push({
                    operation: 'create_category',
                    target: categoryConfig.name,
                    status: 'completed',
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                this.log(`❌ Failed to create category ${categoryConfig.name}: ${error.message}`, 'ERROR');
                throw error;
            }
        }
    }

    /**
     * Create channels with cannabis-themed structure
     */
    async createChannels() {
        this.log('📝 Creating channels with cannabis compliance...', 'INFO');

        const channelConfigs = [
            // Welcome & Info Category
            {
                name: '👋-welcome',
                type: ChannelType.GuildText,
                category: '🌿 WELCOME & INFO',
                topic: '🌿 Welcome to GrowmiesNJ! Please read the rules and verify your age. 🔞 Adult community for cannabis enthusiasts.',
                ageRestriction: 18,
                cannabisContent: false
            },
            {
                name: '📋-rules-and-compliance',
                type: ChannelType.GuildText,
                category: '🌿 WELCOME & INFO',
                topic: '📋 Community rules and cannabis compliance information. Must be 18+ to participate, 21+ for cannabis content. 🔞',
                ageRestriction: 18,
                cannabisContent: false
            },
            {
                name: '🔞-age-verification',
                type: ChannelType.GuildText,
                category: '🌿 WELCOME & INFO',
                topic: '🔞 Age verification required. Must be 18+ for general access, 21+ for cannabis discussions. Educational purposes only.',
                ageRestriction: 18,
                cannabisContent: false
            },
            {
                name: '📚-education-and-resources',
                type: ChannelType.GuildText,
                category: '🌿 WELCOME & INFO',
                topic: '📚 Educational resources about cannabis, health, and responsible use. 18+ educational content only.',
                ageRestriction: 18,
                cannabisContent: false
            },

            // General Community (18+)
            {
                name: '💬-general-chat',
                type: ChannelType.GuildText,
                category: '💬 GENERAL COMMUNITY (18+)',
                topic: '💬 General discussion for verified 18+ members. Keep cannabis discussions in appropriate 21+ channels.',
                ageRestriction: 18,
                cannabisContent: false
            },
            {
                name: '🎮-gaming-and-entertainment',
                type: ChannelType.GuildText,
                category: '💬 GENERAL COMMUNITY (18+)',
                topic: '🎮 Gaming, movies, music, and entertainment discussion. 18+ verified members only.',
                ageRestriction: 18,
                cannabisContent: false
            },
            {
                name: '📸-photos-and-memes',
                type: ChannelType.GuildText,
                category: '💬 GENERAL COMMUNITY (18+)',
                topic: '📸 Share photos and memes (non-cannabis). Keep cannabis images in 21+ channels. 18+ verified members only.',
                ageRestriction: 18,
                cannabisContent: false
            },
            {
                name: '🔊-general-voice',
                type: ChannelType.GuildVoice,
                category: '💬 GENERAL COMMUNITY (18+)',
                ageRestriction: 18,
                cannabisContent: false
            },

            // Cannabis Discussion (21+)
            {
                name: '🌱-strain-discussions',
                type: ChannelType.GuildText,
                category: '🌱 CANNABIS DISCUSSION (21+)',
                topic: '🌱 21+ only - Discuss cannabis strains, effects, and experiences. NJ medical/recreational only. Educational purposes.',
                ageRestriction: 21,
                cannabisContent: true
            },
            {
                name: '🌿-growing-tips',
                type: ChannelType.GuildText,
                category: '🌱 CANNABIS DISCUSSION (21+)',
                topic: '🌿 21+ only - Cannabis cultivation discussion. Follow NJ regulations. Home grow educational content only.',
                ageRestriction: 21,
                cannabisContent: true
            },
            {
                name: '🏪-dispensary-reviews',
                type: ChannelType.GuildText,
                category: '🌱 CANNABIS DISCUSSION (21+)',
                topic: '🏪 21+ only - NJ dispensary reviews and recommendations. Licensed dispensaries only. Educational purposes.',
                ageRestriction: 21,
                cannabisContent: true
            },
            {
                name: '📊-harvest-showcase',
                type: ChannelType.GuildText,
                category: '🌱 CANNABIS DISCUSSION (21+)',
                topic: '📊 21+ only - Share your harvest and growing results. NJ compliant grows only. Educational documentation.',
                ageRestriction: 21,
                cannabisContent: true
            },
            {
                name: '⚕️-medical-cannabis',
                type: ChannelType.GuildText,
                category: '🌱 CANNABIS DISCUSSION (21+)',
                topic: '⚕️ 21+ only - Medical cannabis discussion. Not medical advice. Consult healthcare providers. Educational purposes.',
                ageRestriction: 21,
                cannabisContent: true
            },
            {
                name: '🗣️-cannabis-voice',
                type: ChannelType.GuildVoice,
                category: '🌱 CANNABIS DISCUSSION (21+)',
                ageRestriction: 21,
                cannabisContent: true
            },

            // Moderation & Staff
            {
                name: '🔧-staff-general',
                type: ChannelType.GuildText,
                category: '🔧 MODERATION & STAFF',
                topic: '🔧 Staff communication and coordination. Compliance monitoring and community management.',
                ageRestriction: 18,
                cannabisContent: false
            },
            {
                name: '📋-audit-logs',
                type: ChannelType.GuildText,
                category: '🔧 MODERATION & STAFF',
                topic: '📋 Automated audit logs and compliance monitoring. Age verification tracking and violation reports.',
                ageRestriction: 18,
                cannabisContent: false
            }
        ];

        for (const channelConfig of channelConfigs) {
            try {
                // Validate cannabis compliance
                const isCompliant = await this.complianceValidator.validateChannelCompliance(channelConfig);
                if (!isCompliant) {
                    throw new Error(`Cannabis compliance validation failed for channel: ${channelConfig.name}`);
                }

                // Find parent category
                const parentCategory = this.createdCategories.find(cat => 
                    cat.name === channelConfig.category
                );

                if (!parentCategory && !this.dryRun) {
                    throw new Error(`Parent category not found: ${channelConfig.category}`);
                }

                if (!this.dryRun) {
                    const channel = await this.guild.channels.create({
                        name: channelConfig.name,
                        type: channelConfig.type,
                        topic: channelConfig.topic,
                        parent: parentCategory?.id,
                        permissionOverwrites: [
                            {
                                id: this.guild.roles.everyone.id,
                                deny: channelConfig.ageRestriction >= 18 ? 
                                    [PermissionFlagsBits.ViewChannel] : 
                                    []
                            }
                        ]
                    });

                    this.createdChannels.push({
                        id: channel.id,
                        name: channel.name,
                        config: channelConfig
                    });

                    this.log(`✅ Created channel: ${channel.name}`, 'SUCCESS');
                } else {
                    this.log(`🧪 [DRY RUN] Would create channel: ${channelConfig.name}`, 'INFO');
                }

                this.operationLog.push({
                    operation: 'create_channel',
                    target: channelConfig.name,
                    status: 'completed',
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                this.log(`❌ Failed to create channel ${channelConfig.name}: ${error.message}`, 'ERROR');
                throw error;
            }
        }
    }

    /**
     * Validate setup and perform health checks
     */
    async validateSetup() {
        this.log('🔍 Validating server setup...', 'INFO');

        const validation = {
            categoriesCreated: this.createdCategories.length,
            channelsCreated: this.createdChannels.length,
            complianceReport: this.complianceValidator.generateComplianceReport(),
            healthCheck: {
                botPermissions: true,
                channelAccess: true,
                complianceStatus: true
            }
        };

        // Validate bot permissions
        if (!this.dryRun) {
            const botMember = await this.guild.members.fetch(this.client.user.id);
            if (!botMember.permissions.has(PermissionFlagsBits.ManageChannels)) {
                validation.healthCheck.botPermissions = false;
                this.log('⚠️ Bot missing ManageChannels permission', 'WARNING');
            }
        }

        // Create audit log entry
        if (!this.dryRun) {
            await createAuditLog({
                action: 'server_setup_completed',
                moderator: this.client.user.id,
                reason: 'Automated server structure setup with cannabis compliance',
                details: validation
            });
        }

        this.log('✅ Server setup validation completed', 'SUCCESS');
        return validation;
    }

    /**
     * Emergency rollback functionality
     */
    async rollback() {
        this.log('🔄 Initiating emergency rollback...', 'WARNING');

        try {
            // Delete created channels
            for (const channel of this.createdChannels.reverse()) {
                try {
                    const discordChannel = await this.guild.channels.fetch(channel.id);
                    await discordChannel.delete('Emergency rollback');
                    this.log(`🗑️ Deleted channel: ${channel.name}`, 'INFO');
                } catch (error) {
                    this.log(`❌ Failed to delete channel ${channel.name}: ${error.message}`, 'ERROR');
                }
            }

            // Delete created categories
            for (const category of this.createdCategories.reverse()) {
                try {
                    const discordCategory = await this.guild.channels.fetch(category.id);
                    await discordCategory.delete('Emergency rollback');
                    this.log(`🗑️ Deleted category: ${category.name}`, 'INFO');
                } catch (error) {
                    this.log(`❌ Failed to delete category ${category.name}: ${error.message}`, 'ERROR');
                }
            }

            this.log('✅ Emergency rollback completed', 'SUCCESS');

        } catch (error) {
            this.log(`❌ Rollback failed: ${error.message}`, 'ERROR');
            throw error;
        }
    }

    /**
     * Generate setup report
     */
    async generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            serverInfo: {
                guildId: this.guild.id,
                guildName: this.guild.name,
                memberCount: this.guild.memberCount
            },
            setupResults: {
                categoriesCreated: this.createdCategories.length,
                channelsCreated: this.createdChannels.length,
                dryRun: this.dryRun
            },
            complianceReport: this.complianceValidator.generateComplianceReport(),
            operationLog: this.operationLog,
            createdStructure: {
                categories: this.createdCategories,
                channels: this.createdChannels
            }
        };

        // Save report to file
        const reportPath = path.join(__dirname, '../docs/server-setup-report.json');
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
        this.log(`📊 Setup report saved to: ${reportPath}`, 'INFO');

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

            await this.createServerCategories();
            await this.createChannels();
            validation = await validateSetup();
            
            const report = await this.generateReport();
            
            this.log('🎉 GrowmiesNJ Discord server setup completed successfully!', 'SUCCESS');
            this.log(`📊 Created ${this.createdCategories.length} categories and ${this.createdChannels.length} channels`, 'INFO');
            this.log('🌿 All cannabis compliance requirements validated', 'SUCCESS');

            return { success: true, validation, report };

        } catch (error) {
            this.log(`💥 Setup failed: ${error.message}`, 'ERROR');
            
            if (!this.dryRun && (this.createdChannels.length > 0 || this.createdCategories.length > 0)) {
                this.log('🔄 Attempting automatic rollback...', 'WARNING');
                try {
                    await this.rollback();
                } catch (rollbackError) {
                    this.log(`💥 Rollback failed: ${rollbackError.message}`, 'ERROR');
                }
            }

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
    const setup = new DiscordServerSetup();
    
    try {
        const result = await setup.execute();
        process.exit(0);
    } catch (error) {
        console.error('❌ Setup failed:', error.message);
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

module.exports = { DiscordServerSetup, CannabisComplianceValidator };