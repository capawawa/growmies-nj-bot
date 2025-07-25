/**
 * MessageCreate Event for GrowmiesNJ Discord Bot
 * 
 * Cannabis-themed XP tracking system that monitors user message activity
 * Awards XP based on community participation and cannabis tier progression
 */

const { Events } = require('discord.js');
const { XPCalculationService } = require('../services/xpCalculation');
const { LevelingConfig } = require('../database/models/LevelingConfig');
const { User } = require('../database/models/User');
const { AuditLog } = require('../database/models/AuditLog');

// In-memory cooldown tracking (cleared on bot restart)
const userCooldowns = new Map();

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        try {
            // Skip processing for bots, system messages, and DMs
            if (message.author.bot || !message.guild || message.system) {
                return;
            }

            // Skip if message is empty or only contains attachments
            if (!message.content.trim() && message.attachments.size === 0) {
                return;
            }

            // Initialize XP service
            const xpService = new XPCalculationService();
            
            // Get guild leveling configuration
            const config = await LevelingConfig.findByGuildId(message.guild.id);
            
            // Skip if leveling is disabled for this guild
            if (!config.isLevelingEnabled()) {
                return;
            }

            // Check if channel is excluded from XP gain
            if (config.isChannelExcluded(message.channel.id)) {
                return;
            }

            const userId = message.author.id;
            const guildId = message.guild.id;
            const cooldownKey = `${userId}-${guildId}`;

            // Check cooldown
            if (userCooldowns.has(cooldownKey)) {
                const cooldownExpires = userCooldowns.get(cooldownKey);
                if (Date.now() < cooldownExpires) {
                    // User is still on cooldown
                    return;
                }
            }

            // Set cooldown (60 seconds default)
            const cooldownDuration = config.message_cooldown_seconds * 1000;
            userCooldowns.set(cooldownKey, Date.now() + cooldownDuration);

            console.log(`💬 Processing message XP for ${message.author.tag} in #${message.channel.name}`);

            // Calculate and award XP for the message
            const xpResult = await xpService.calculateMessageXP(
                userId,
                guildId,
                message.content,
                {
                    channelId: message.channel.id,
                    channelName: message.channel.name,
                    messageId: message.id,
                    messageLength: message.content.length,
                    hasAttachments: message.attachments.size > 0,
                    hasEmbeds: message.embeds.length > 0,
                    mentionsCount: message.mentions.users.size,
                    timestamp: message.createdAt
                }
            );

            if (!xpResult.success) {
                console.warn(`⚠️ XP calculation failed for ${message.author.tag}: ${xpResult.reason}`);
                return;
            }

            // Check for level up
            if (xpResult.leveledUp) {
                await this.handleLevelUp(message, xpResult, config);
            }

            // Check for tier progression
            if (xpResult.tierProgressed) {
                await this.handleTierProgression(message, xpResult, config);
            }

            // Log successful XP gain
            console.log(`✅ ${message.author.tag} gained ${xpResult.xpGained} XP (Level ${xpResult.newLevel}, ${xpResult.newTier})`);

        } catch (error) {
            console.error('❌ Error in messageCreate event:', error);
            
            // Log error for monitoring but don't interrupt message flow
            try {
                if (message.client.database && message.client.database.models.AuditLog) {
                    await AuditLog.create({
                        guild_id: message.guild?.id || 'unknown',
                        user_id: message.author?.id || 'unknown',
                        action_type: 'system_error',
                        details: {
                            error: 'messageCreate_xp_tracking_error',
                            message: error.message,
                            stack: error.stack,
                            channel_id: message.channel?.id,
                            message_id: message.id
                        }
                    });
                }
            } catch (auditError) {
                console.error('❌ Failed to log XP tracking error to audit:', auditError);
            }
        }
    },

    /**
     * Handle level up notifications and rewards
     * @param {Message} message - Discord message object
     * @param {Object} xpResult - XP calculation result
     * @param {LevelingConfig} config - Guild leveling configuration
     */
    async handleLevelUp(message, xpResult, config) {
        try {
            if (!config.level_up_notifications_enabled) {
                return;
            }

            const user = message.author;
            const levelUpChannel = config.level_up_channel_id ? 
                message.guild.channels.cache.get(config.level_up_channel_id) : 
                message.channel;

            if (!levelUpChannel) {
                console.warn(`⚠️ Level up channel not found for ${message.guild.name}`);
                return;
            }

            // Create cannabis-themed level up embed
            const levelUpEmbed = {
                color: this.getTierColor(xpResult.newTier),
                title: '🌱 Cannabis Community Level Up!',
                description: `${user} has grown stronger in the community! 🌿`,
                fields: [
                    {
                        name: '📈 New Level',
                        value: `**Level ${xpResult.newLevel}**`,
                        inline: true
                    },
                    {
                        name: '🌿 Cannabis Tier',
                        value: `${this.getTierEmoji(xpResult.newTier)} **${xpResult.newTier}**`,
                        inline: true
                    },
                    {
                        name: '⭐ Total XP',
                        value: `**${xpResult.totalXP.toLocaleString()}** XP`,
                        inline: true
                    }
                ],
                footer: {
                    text: 'GrowmiesNJ Cannabis Community • Keep Growing!',
                    icon_url: message.guild.iconURL({ dynamic: true })
                },
                timestamp: new Date().toISOString()
            };

            // Add level milestone rewards info
            if (this.isLevelMilestone(xpResult.newLevel)) {
                levelUpEmbed.fields.push({
                    name: '🎁 Milestone Reward',
                    value: this.getMilestoneReward(xpResult.newLevel),
                    inline: false
                });
            }

            await levelUpChannel.send({ embeds: [levelUpEmbed] });

            // Log level up for audit trail
            await AuditLog.create({
                guild_id: message.guild.id,
                user_id: user.id,
                action_type: 'level_up',
                performed_by: 'system',
                details: {
                    old_level: xpResult.oldLevel,
                    new_level: xpResult.newLevel,
                    tier: xpResult.newTier,
                    total_xp: xpResult.totalXP,
                    channel_id: message.channel.id,
                    trigger_message_id: message.id
                }
            });

            console.log(`🎉 Level up notification sent for ${user.tag} (Level ${xpResult.newLevel})`);

        } catch (error) {
            console.error('❌ Error handling level up:', error);
        }
    },

    /**
     * Handle tier progression notifications and role assignments
     * @param {Message} message - Discord message object
     * @param {Object} xpResult - XP calculation result
     * @param {LevelingConfig} config - Guild leveling configuration
     */
    async handleTierProgression(message, xpResult, config) {
        try {
            const user = message.author;
            const member = message.member;

            // Get role management service for cannabis tier roles
            const { RoleManagementService } = require('../services/roleManagement');
            const roleService = new RoleManagementService();

            // Attempt to assign new tier role
            const roleResult = await roleService.assignProgressionRole(
                member,
                xpResult.newTier,
                `Cannabis tier progression to ${xpResult.newTier}`
            );

            if (roleResult.success) {
                console.log(`🏅 Tier role assigned: ${user.tag} is now ${xpResult.newTier}`);
            } else {
                console.warn(`⚠️ Failed to assign tier role for ${user.tag}: ${roleResult.reason}`);
            }

            // Send tier progression notification if enabled
            if (config.level_up_notifications_enabled) {
                const tierChannel = config.level_up_channel_id ? 
                    message.guild.channels.cache.get(config.level_up_channel_id) : 
                    message.channel;

                if (tierChannel) {
                    const tierEmbed = {
                        color: this.getTierColor(xpResult.newTier),
                        title: '🌳 Cannabis Tier Progression!',
                        description: `${user} has achieved a new cannabis community tier! 🏆`,
                        fields: [
                            {
                                name: '🌿 New Cannabis Tier',
                                value: `${this.getTierEmoji(xpResult.newTier)} **${xpResult.newTier}**`,
                                inline: true
                            },
                            {
                                name: '📊 Level',
                                value: `**Level ${xpResult.newLevel}**`,
                                inline: true
                            },
                            {
                                name: '⭐ Total XP',
                                value: `**${xpResult.totalXP.toLocaleString()}** XP`,
                                inline: true
                            },
                            {
                                name: '🎯 Tier Benefits',
                                value: this.getTierBenefits(xpResult.newTier),
                                inline: false
                            }
                        ],
                        footer: {
                            text: 'GrowmiesNJ Cannabis Community • New Heights Achieved!',
                            icon_url: message.guild.iconURL({ dynamic: true })
                        },
                        timestamp: new Date().toISOString()
                    };

                    await tierChannel.send({ embeds: [tierEmbed] });
                }
            }

            // Log tier progression for audit trail
            await AuditLog.create({
                guild_id: message.guild.id,
                user_id: user.id,
                action_type: 'tier_progression',
                performed_by: 'system',
                details: {
                    old_tier: xpResult.oldTier,
                    new_tier: xpResult.newTier,
                    level: xpResult.newLevel,
                    total_xp: xpResult.totalXP,
                    role_assigned: roleResult.success,
                    role_details: roleResult,
                    channel_id: message.channel.id,
                    trigger_message_id: message.id
                }
            });

            console.log(`🌟 Tier progression complete for ${user.tag}: ${xpResult.oldTier} → ${xpResult.newTier}`);

        } catch (error) {
            console.error('❌ Error handling tier progression:', error);
        }
    },

    /**
     * Get tier color for embeds
     * @param {string} tier - Cannabis tier name
     * @returns {number} Color hex value
     */
    getTierColor(tier) {
        const colors = {
            'Seedling': 0x27ae60,    // Green
            'Growing': 0x2ecc71,     // Emerald
            'Established': 0x16a085, // Dark green
            'Harvested': 0xf39c12    // Orange/Gold
        };
        return colors[tier] || 0x95a5a6;
    },

    /**
     * Get tier emoji
     * @param {string} tier - Cannabis tier name
     * @returns {string} Tier emoji
     */
    getTierEmoji(tier) {
        const emojis = {
            'Seedling': '🌱',
            'Growing': '🌿',
            'Established': '🌳',
            'Harvested': '🏆'
        };
        return emojis[tier] || '🌱';
    },

    /**
     * Check if level is a milestone
     * @param {number} level - User level
     * @returns {boolean} Is milestone level
     */
    isLevelMilestone(level) {
        const milestones = [5, 10, 15, 20, 25, 30, 40, 50, 75, 100];
        return milestones.includes(level);
    },

    /**
     * Get milestone reward description
     * @param {number} level - Milestone level
     * @returns {string} Reward description
     */
    getMilestoneReward(level) {
        const rewards = {
            5: '🌱 Welcome to the community! First growth milestone achieved.',
            10: '🌿 Seedling tier mastered! Growing stronger every day.',
            15: '💚 Dedicated community member recognition.',
            20: '🌳 Growing tier achievement unlocked!',
            25: '⭐ Active community contributor status.',
            30: '🏅 Established tier reached! Community veteran status.',
            40: '💎 Premium community features unlocked.',
            50: '🏆 Harvested tier achieved! Master cultivator status.',
            75: '👑 Elite community member recognition.',
            100: '🌟 Cannabis community legend status!'
        };
        return rewards[level] || '🎁 Special milestone reward unlocked!';
    },

    /**
     * Get tier benefits description
     * @param {string} tier - Cannabis tier name
     * @returns {string} Benefits description
     */
    getTierBenefits(tier) {
        const benefits = {
            'Seedling': '🌱 New member perks and beginner guides access',
            'Growing': '🌿 Active participant benefits and intermediate content',
            'Established': '🌳 Respected contributor perks and advanced resources',
            'Harvested': '🏆 Elite veteran status with exclusive community features'
        };
        return benefits[tier] || 'Cannabis community benefits unlocked!';
    }
};