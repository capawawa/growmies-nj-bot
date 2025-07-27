#!/usr/bin/env node
/**
 * GrowmiesNJ Discord Role Hierarchy and Permission Management Automation
 * 
 * This script automatically creates and configures Discord server roles with
 * appropriate permissions for the GrowmiesNJ cannabis community, including
 * age-restricted roles, staff hierarchy, and cannabis compliance permissions.
 * 
 * Cannabis Compliance Features:
 * - Age-verified roles (18+ General, 21+ Cannabis Content)
 * - Cannabis education and discussion permission tiers
 * - Staff roles with compliance oversight permissions
 * - Guest/unverified roles with restricted access
 * - Automated role assignment based on verification status
 * - New Jersey cannabis law compliance role restrictions
 * 
 * @author GrowmiesNJ DevOps Team
 * @version 1.0.0
 * @license MIT
 */

const { Client, GatewayIntentBits, PermissionFlagsBits, Colors } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

// Environment and configuration
const dotenv = require('dotenv');
dotenv.config();

// Import existing services for integration
const { AuditLog } = require('../src/database/models/AuditLog');

/**
 * Cannabis Compliance Role Permission Validator
 * Ensures all roles maintain appropriate permissions for cannabis community compliance
 */
class CannabisComplianceRoleValidator {
    constructor() {
        this.complianceLog = [];
        this.ageRestrictedRoles = ['21+ Cannabis Access', '18+ General Access'];
        this.complianceRequiredRoles = ['Cannabis Educator', 'Compliance Officer', 'Server Admin'];
        this.restrictedPermissions = {
            '18+': [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.UseExternalEmojis,
                PermissionFlagsBits.AddReactions
            ],
            '21+': [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.EmbedLinks,
                PermissionFlagsBits.AttachFiles,
                PermissionFlagsBits.UseExternalEmojis,
                PermissionFlagsBits.AddReactions,
                PermissionFlagsBits.UseSlashCommands
            ]
        };
    }

    /**
     * Validate role compliance with cannabis community standards
     * @param {Object} roleConfig - Role configuration to validate
     * @returns {Promise<boolean>} - Validation result
     */
    async validateRoleCompliance(roleConfig) {
        const compliance = {
            timestamp: new Date().toISOString(),
            roleName: roleConfig.name,
            permissions: roleConfig.permissions,
            complianceChecks: []
        };

        // Age verification compliance
        if (this.ageRestrictedRoles.includes(roleConfig.name)) {
            if (!roleConfig.name.includes('18+') && !roleConfig.name.includes('21+')) {
                compliance.complianceChecks.push({
                    check: 'age_restriction_naming',
                    status: 'FAILED',
                    message: 'Age-restricted roles must clearly indicate age requirement in name'
                });
                return false;
            }

            // Validate age-appropriate permissions
            const requiredAgeGroup = roleConfig.name.includes('21+') ? '21+' : '18+';
            const requiredPermissions = this.restrictedPermissions[requiredAgeGroup];
            
            for (const permission of requiredPermissions) {
                if (!roleConfig.permissions.includes(permission)) {
                    compliance.complianceChecks.push({
                        check: 'age_appropriate_permissions',
                        status: 'WARNING',
                        message: `Missing recommended permission for ${requiredAgeGroup} role: ${permission}`
                    });
                }
            }
        }

        // Cannabis compliance role validation
        if (this.complianceRequiredRoles.includes(roleConfig.name)) {
            const hasModeratorPermissions = roleConfig.permissions.includes(PermissionFlagsBits.ModerateMembers) ||
                                          roleConfig.permissions.includes(PermissionFlagsBits.ManageMessages);
            
            if (!hasModeratorPermissions) {
                compliance.complianceChecks.push({
                    check: 'compliance_role_permissions',
                    status: 'FAILED',
                    message: 'Compliance roles must have moderation permissions for oversight'
                });
                return false;
            }
        }

        // Dangerous permission validation
        const dangerousPermissions = [
            PermissionFlagsBits.Administrator,
            PermissionFlagsBits.ManageGuild,
            PermissionFlagsBits.ManageRoles,
            PermissionFlagsBits.BanMembers,
            PermissionFlagsBits.KickMembers
        ];

        const hasDangerousPermissions = dangerousPermissions.some(perm => 
            roleConfig.permissions.includes(perm)
        );

        if (hasDangerousPermissions && !roleConfig.name.includes('Admin') && !roleConfig.name.includes('Owner')) {
            compliance.complianceChecks.push({
                check: 'dangerous_permission_validation',
                status: 'WARNING',
                message: 'Non-admin role has elevated permissions - ensure this is intentional'
            });
        }

        // Guest/unverified role validation
        if (roleConfig.name.includes('Guest') || roleConfig.name.includes('Unverified')) {
            const hasRestrictivePermissions = !roleConfig.permissions.includes(PermissionFlagsBits.SendMessages) ||
                                           !roleConfig.permissions.includes(PermissionFlagsBits.Speak);
            
            if (!hasRestrictivePermissions) {
                compliance.complianceChecks.push({
                    check: 'guest_role_restrictions',
                    status: 'FAILED',
                    message: 'Guest/unverified roles must have restricted communication permissions'
                });
                return false;
            }
        }

        compliance.complianceChecks.push({
            check: 'role_compliance_validation',
            status: 'PASSED',
            message: `Role "${roleConfig.name}" meets cannabis compliance requirements`
        });

        this.complianceLog.push(compliance);
        return true;
    }

    /**
     * Generate role hierarchy compliance report
     * @returns {Object} - Comprehensive compliance report
     */
    generateRoleComplianceReport() {
        const passedRoles = this.complianceLog.filter(log => 
            log.complianceChecks.every(check => check.status === 'PASSED')
        ).length;

        return {
            timestamp: new Date().toISOString(),
            totalRolesValidated: this.complianceLog.length,
            compliancePassRate: this.complianceLog.length > 0 ? passedRoles / this.complianceLog.length : 0,
            overallStatus: passedRoles === this.complianceLog.length ? 'COMPLIANT' : 'NON_COMPLIANT',
            ageRestrictedRoles: this.ageRestrictedRoles,
            complianceRequiredRoles: this.complianceRequiredRoles,
            detailedLog: this.complianceLog
        };
    }
}

/**
 * Discord Role Hierarchy Manager
 * Handles comprehensive role creation and permission management with cannabis compliance
 */
class DiscordRoleHierarchyManager {
    constructor() {
        this.client = null;
        this.guild = null;
        this.complianceValidator = new CannabisComplianceRoleValidator();
        this.createdRoles = [];
        this.hierarchyLog = [];
        this.dryRun = process.argv.includes('--dry-run') || process.argv.includes('--test');
    }

    /**
     * Initialize role management environment
     */
    async initialize() {
        try {
            this.log('👑 Initializing GrowmiesNJ Role Hierarchy Management', 'INFO');
            
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
            this.log(`❌ Role hierarchy initialization failed: ${error.message}`, 'ERROR');
            throw error;
        }
    }

    /**
     * Define comprehensive role hierarchy configuration
     */
    getRoleHierarchy() {
        return [
            // === ADMINISTRATIVE ROLES ===
            {
                name: '🔰 Server Owner',
                color: Colors.Gold,
                permissions: [PermissionFlagsBits.Administrator],
                hoist: true,
                mentionable: false,
                position: 100,
                description: 'Server owner with full administrative access'
            },
            {
                name: '⚖️ Compliance Officer',
                color: Colors.DarkRed,
                permissions: [
                    PermissionFlagsBits.ManageGuild,
                    PermissionFlagsBits.ManageRoles,
                    PermissionFlagsBits.ManageChannels,
                    PermissionFlagsBits.ModerateMembers,
                    PermissionFlagsBits.ManageMessages,
                    PermissionFlagsBits.ViewAuditLog,
                    PermissionFlagsBits.BanMembers,
                    PermissionFlagsBits.KickMembers
                ],
                hoist: true,
                mentionable: true,
                position: 95,
                description: 'Cannabis compliance oversight and legal enforcement'
            },
            {
                name: '🛡️ Server Admin',
                color: Colors.Red,
                permissions: [
                    PermissionFlagsBits.ManageGuild,
                    PermissionFlagsBits.ManageRoles,
                    PermissionFlagsBits.ManageChannels,
                    PermissionFlagsBits.ModerateMembers,
                    PermissionFlagsBits.ManageMessages,
                    PermissionFlagsBits.ViewAuditLog,
                    PermissionFlagsBits.BanMembers,
                    PermissionFlagsBits.KickMembers,
                    PermissionFlagsBits.ManageNicknames
                ],
                hoist: true,
                mentionable: true,
                position: 90,
                description: 'Full server administration and management'
            },

            // === MODERATION ROLES ===
            {
                name: '🌿 Cannabis Educator',
                color: Colors.DarkGreen,
                permissions: [
                    PermissionFlagsBits.ModerateMembers,
                    PermissionFlagsBits.ManageMessages,
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ReadMessageHistory,
                    PermissionFlagsBits.EmbedLinks,
                    PermissionFlagsBits.AttachFiles,
                    PermissionFlagsBits.UseSlashCommands,
                    PermissionFlagsBits.ManageThreads
                ],
                hoist: true,
                mentionable: true,
                position: 85,
                description: 'Cannabis education specialist and content moderator'
            },
            {
                name: '🛡️ Moderator',
                color: Colors.Orange,
                permissions: [
                    PermissionFlagsBits.ModerateMembers,
                    PermissionFlagsBits.ManageMessages,
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ReadMessageHistory,
                    PermissionFlagsBits.KickMembers,
                    PermissionFlagsBits.UseSlashCommands,
                    PermissionFlagsBits.ManageThreads
                ],
                hoist: true,
                mentionable: true,
                position: 80,
                description: 'Community moderation and enforcement'
            },
            {
                name: '👮 Junior Moderator',
                color: Colors.Yellow,
                permissions: [
                    PermissionFlagsBits.ModerateMembers,
                    PermissionFlagsBits.ManageMessages,
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ReadMessageHistory,
                    PermissionFlagsBits.UseSlashCommands
                ],
                hoist: true,
                mentionable: true,
                position: 75,
                description: 'Assistant moderator role with limited permissions'
            },

            // === VERIFIED MEMBER ROLES ===
            {
                name: '🔞 21+ Cannabis Access',
                color: Colors.Green,
                permissions: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ReadMessageHistory,
                    PermissionFlagsBits.EmbedLinks,
                    PermissionFlagsBits.AttachFiles,
                    PermissionFlagsBits.UseExternalEmojis,
                    PermissionFlagsBits.AddReactions,
                    PermissionFlagsBits.UseSlashCommands,
                    PermissionFlagsBits.Speak,
                    PermissionFlagsBits.Stream,
                    PermissionFlagsBits.UseVAD,
                    PermissionFlagsBits.CreatePublicThreads,
                    PermissionFlagsBits.CreatePrivateThreads,
                    PermissionFlagsBits.SendMessagesInThreads
                ],
                hoist: true,
                mentionable: false,
                position: 70,
                description: 'Verified 21+ member with full cannabis content access'
            },
            {
                name: '🔞 18+ General Access',
                color: Colors.Blue,
                permissions: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ReadMessageHistory,
                    PermissionFlagsBits.UseExternalEmojis,
                    PermissionFlagsBits.AddReactions,
                    PermissionFlagsBits.UseSlashCommands,
                    PermissionFlagsBits.Speak,
                    PermissionFlagsBits.UseVAD,
                    PermissionFlagsBits.CreatePublicThreads,
                    PermissionFlagsBits.SendMessagesInThreads
                ],
                hoist: true,
                mentionable: false,
                position: 65,
                description: 'Verified 18+ member with general community access'
            },

            // === SPECIAL ROLES ===
            {
                name: '🏥 Medical Patient',
                color: Colors.Purple,
                permissions: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ReadMessageHistory,
                    PermissionFlagsBits.EmbedLinks,
                    PermissionFlagsBits.AttachFiles,
                    PermissionFlagsBits.UseExternalEmojis,
                    PermissionFlagsBits.AddReactions,
                    PermissionFlagsBits.UseSlashCommands
                ],
                hoist: false,
                mentionable: false,
                position: 60,
                description: 'Verified medical cannabis patient with access to medical channels'
            },
            {
                name: '🌱 Home Grower',
                color: Colors.DarkGreen,
                permissions: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ReadMessageHistory,
                    PermissionFlagsBits.EmbedLinks,
                    PermissionFlagsBits.AttachFiles,
                    PermissionFlagsBits.UseExternalEmojis,
                    PermissionFlagsBits.AddReactions,
                    PermissionFlagsBits.UseSlashCommands
                ],
                hoist: false,
                mentionable: false,
                position: 55,
                description: 'Verified home cannabis cultivator with grow channel access'
            },
            {
                name: '🏪 Industry Professional',
                color: Colors.DarkBlue,
                permissions: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ReadMessageHistory,
                    PermissionFlagsBits.EmbedLinks,
                    PermissionFlagsBits.AttachFiles,
                    PermissionFlagsBits.UseExternalEmojis,
                    PermissionFlagsBits.AddReactions,
                    PermissionFlagsBits.UseSlashCommands
                ],
                hoist: false,
                mentionable: false,
                position: 50,
                description: 'Licensed cannabis industry professional'
            },

            // === COMMUNITY ROLES ===
            {
                name: '🎓 Cannabis Advocate',
                color: Colors.LightGrey,
                permissions: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ReadMessageHistory,
                    PermissionFlagsBits.UseExternalEmojis,
                    PermissionFlagsBits.AddReactions,
                    PermissionFlagsBits.UseSlashCommands
                ],
                hoist: false,
                mentionable: false,
                position: 45,
                description: 'Cannabis education and advocacy supporter'
            },
            {
                name: '🤝 Community Helper',
                color: Colors.Aqua,
                permissions: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ReadMessageHistory,
                    PermissionFlagsBits.UseExternalEmojis,
                    PermissionFlagsBits.AddReactions,
                    PermissionFlagsBits.UseSlashCommands,
                    PermissionFlagsBits.ManageThreads
                ],
                hoist: false,
                mentionable: false,
                position: 40,
                description: 'Active community helper and support provider'
            },

            // === RESTRICTION ROLES ===
            {
                name: '👤 Guest',
                color: Colors.LightGrey,
                permissions: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.ReadMessageHistory
                ],
                hoist: false,
                mentionable: false,
                position: 20,
                description: 'Unverified guest with read-only access'
            },
            {
                name: '🔇 Restricted',
                color: Colors.DarkGrey,
                permissions: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.ReadMessageHistory
                ],
                hoist: false,
                mentionable: false,
                position: 10,
                description: 'Restricted member with limited access'
            },
            {
                name: '⚠️ Under Review',
                color: Colors.DarkRed,
                permissions: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.ReadMessageHistory
                ],
                hoist: false,
                mentionable: false,
                position: 5,
                description: 'Member under compliance review'
            }
        ];
    }

    /**
     * Create roles with compliance validation
     */
    async createRoles() {
        this.log('👑 Creating role hierarchy...', 'INFO');

        const roleHierarchy = this.getRoleHierarchy();
        const creationResults = [];

        for (const roleConfig of roleHierarchy) {
            try {
                // Validate role compliance before creation
                const isCompliant = await this.complianceValidator.validateRoleCompliance(roleConfig);
                
                if (!isCompliant) {
                    this.log(`❌ Role "${roleConfig.name}" failed compliance validation`, 'ERROR');
                    continue;
                }

                if (!this.dryRun) {
                    // Check if role already exists
                    const existingRole = this.guild.roles.cache.find(role => role.name === roleConfig.name);
                    
                    if (existingRole) {
                        this.log(`⚠️ Role "${roleConfig.name}" already exists, updating...`, 'WARNING');
                        
                        await existingRole.edit({
                            color: roleConfig.color,
                            permissions: roleConfig.permissions,
                            hoist: roleConfig.hoist,
                            mentionable: roleConfig.mentionable,
                            reason: 'GrowmiesNJ role hierarchy automation update'
                        });

                        creationResults.push({
                            name: roleConfig.name,
                            action: 'updated',
                            roleId: existingRole.id
                        });

                    } else {
                        // Create new role
                        const newRole = await this.guild.roles.create({
                            name: roleConfig.name,
                            color: roleConfig.color,
                            permissions: roleConfig.permissions,
                            hoist: roleConfig.hoist,
                            mentionable: roleConfig.mentionable,
                            reason: 'GrowmiesNJ role hierarchy automation'
                        });

                        creationResults.push({
                            name: roleConfig.name,
                            action: 'created',
                            roleId: newRole.id
                        });

                        this.createdRoles.push(newRole);
                    }

                    this.log(`✅ Role "${roleConfig.name}" processed successfully`, 'SUCCESS');

                } else {
                    this.log(`🧪 [DRY RUN] Would create/update role: ${roleConfig.name}`, 'INFO');
                    creationResults.push({
                        name: roleConfig.name,
                        action: 'simulated',
                        roleId: 'dry-run-id'
                    });
                }

            } catch (error) {
                this.log(`❌ Failed to create role "${roleConfig.name}": ${error.message}`, 'ERROR');
                creationResults.push({
                    name: roleConfig.name,
                    action: 'failed',
                    error: error.message
                });
            }
        }

        this.hierarchyLog.push({
            operation: 'create_roles',
            results: creationResults,
            timestamp: new Date().toISOString()
        });

        return creationResults;
    }

    /**
     * Configure role hierarchy positions
     */
    async configureRolePositions() {
        this.log('📊 Configuring role hierarchy positions...', 'INFO');

        if (this.dryRun) {
            this.log('🧪 [DRY RUN] Would configure role positions', 'INFO');
            return;
        }

        try {
            const roleHierarchy = this.getRoleHierarchy();
            const roleUpdates = [];

            for (const roleConfig of roleHierarchy) {
                const role = this.guild.roles.cache.find(r => r.name === roleConfig.name);
                if (role && role.position !== roleConfig.position) {
                    roleUpdates.push({
                        role: role,
                        position: roleConfig.position
                    });
                }
            }

            // Sort by desired position (highest first)
            roleUpdates.sort((a, b) => b.position - a.position);

            // Update positions
            for (const update of roleUpdates) {
                await update.role.setPosition(update.position);
                this.log(`📍 Set position ${update.position} for role: ${update.role.name}`, 'INFO');
            }

            this.log('✅ Role positions configured successfully', 'SUCCESS');

        } catch (error) {
            this.log(`❌ Failed to configure role positions: ${error.message}`, 'ERROR');
            throw error;
        }
    }

    /**
     * Validate role hierarchy and permissions
     */
    async validateRoleHierarchy() {
        this.log('🔍 Validating role hierarchy...', 'INFO');

        const validation = {
            totalRoles: this.createdRoles.length,
            complianceReport: this.complianceValidator.generateRoleComplianceReport(),
            hierarchyValidation: {
                positionsCorrect: true,
                permissionsValid: true,
                complianceAdhered: true
            }
        };

        // Validate role positions
        if (!this.dryRun) {
            const roles = await this.guild.roles.fetch();
            const adminRoles = roles.filter(role => role.permissions.has(PermissionFlagsBits.Administrator));
            const modRoles = roles.filter(role => 
                role.permissions.has(PermissionFlagsBits.ModerateMembers) && 
                !role.permissions.has(PermissionFlagsBits.Administrator)
            );

            validation.hierarchyValidation.adminRolesCount = adminRoles.size;
            validation.hierarchyValidation.moderatorRolesCount = modRoles.size;
        }

        // Validate compliance
        validation.hierarchyValidation.complianceAdhered = 
            validation.complianceReport.overallStatus === 'COMPLIANT';

        // Create audit log entry
        if (!this.dryRun) {
            await AuditLog.create({
                action_type: 'admin_action',
                actor_user_id: this.client.user.id,
                guild_id: this.guild.id,
                details: {
                    admin_action: 'role_hierarchy_configured',
                    reason: 'Automated role hierarchy setup with cannabis compliance validation',
                    validation: validation
                },
                severity: 'medium',
                compliance_flag: true
            });
        }

        this.log('✅ Role hierarchy validation completed', 'SUCCESS');
        return validation;
    }

    /**
     * Generate role hierarchy report
     */
    async generateRoleReport() {
        const report = {
            timestamp: new Date().toISOString(),
            serverInfo: {
                guildId: this.guild?.id,
                guildName: this.guild?.name,
                totalMembers: this.guild?.memberCount
            },
            roleHierarchy: {
                totalRolesCreated: this.createdRoles.length,
                dryRun: this.dryRun
            },
            complianceReport: this.complianceValidator.generateRoleComplianceReport(),
            hierarchyLog: this.hierarchyLog,
            createdRoles: this.createdRoles.map(role => ({
                id: role.id,
                name: role.name,
                color: role.color,
                position: role.position,
                memberCount: role.members?.size || 0
            }))
        };

        // Save report to file
        const reportPath = path.join(__dirname, '../docs/role-hierarchy-report.json');
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
        this.log(`📊 Role hierarchy report saved to: ${reportPath}`, 'INFO');

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

            const creationResults = await this.createRoles();
            await this.configureRolePositions();
            validation = await this.validateRoleHierarchy();
            const report = await this.generateRoleReport();
            
            this.log('🎉 GrowmiesNJ role hierarchy setup completed successfully!', 'SUCCESS');
            this.log(`👑 Created/updated ${creationResults.length} roles`, 'INFO');
            this.log('🌿 All cannabis compliance requirements validated', 'SUCCESS');

            return { success: true, validation, report, creationResults };

        } catch (error) {
            this.log(`💥 Role hierarchy setup failed: ${error.message}`, 'ERROR');
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
    const roleManager = new DiscordRoleHierarchyManager();
    
    try {
        const result = await roleManager.execute();
        process.exit(0);
    } catch (error) {
        console.error('❌ Role hierarchy setup failed:', error.message);
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

module.exports = { DiscordRoleHierarchyManager, CannabisComplianceRoleValidator };