/**
 * XP Calculation Engine Service for GrowmiesNJ Discord Bot
 * 
 * Cannabis-themed leveling system with anti-spam protection and tier progression
 * Handles XP calculation, level progression, and role management integration
 * 
 * Cannabis Industry Compliance:
 * - Respects age verification requirements (21+ for cannabis content)
 * - Integrates with existing audit trail system
 * - Follows secure defaults and rate limiting
 */

const { User } = require('../database/models/User');
const { LevelingConfig } = require('../database/models/LevelingConfig');
const { AuditLog } = require('../database/models/AuditLog');
const { RoleManagementService, ROLE_CONFIG } = require('./roleManagement');
const { EmbedUtils } = require('../utils/embeds');

/**
 * XP Sources for tracking different activity types
 */
const XP_SOURCES = {
    MESSAGE: 'message',
    VOICE_ACTIVITY: 'voice_activity',
    REACTION_RECEIVED: 'reaction_received',
    DAILY_BONUS: 'daily_bonus',
    ADMIN_ADJUSTMENT: 'admin_adjustment'
};

/**
 * Cannabis progression tier mappings
 */
const TIER_ROLE_MAPPING = {
    'Seedling': ROLE_CONFIG.SEEDLING,
    'Growing': ROLE_CONFIG.GROWING,
    'Established': ROLE_CONFIG.ESTABLISHED,
    'Harvested': ROLE_CONFIG.HARVESTED
};

/**
 * XP Calculation Engine Service Class
 * Manages XP calculation, level progression, and cannabis tier advancement
 */
class XPCalculationService {
    constructor() {
        this.roleManager = new RoleManagementService();
        this.cooldownCache = new Map(); // In-memory cooldown tracking
        this.CACHE_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
        
        // Start cache cleanup interval
        this.startCacheCleanup();
    }

    /**
     * Calculate and award XP for message activity
     * @param {GuildMember} member - Discord guild member
     * @param {Guild} guild - Discord guild
     * @param {Object} messageData - Message metadata
     * @returns {Promise<Object>} - XP calculation result
     */
    async calculateMessageXP(member, guild, messageData = {}) {
        try {
            console.log(`🌿 Calculating message XP for ${member.user.tag} in ${guild.name}`);

            // Get guild leveling configuration
            const config = await LevelingConfig.findByGuildId(guild.id);
            if (!config.isLevelingEnabled()) {
                return { success: false, reason: 'Leveling disabled for this guild' };
            }

            // Check age verification requirement
            if (config.require_age_verification) {
                const user = await this.getUserRecord(member.user.id, guild.id);
                if (!user || user.verification_status !== 'verified' || !user.is_21_plus) {
                    return { success: false, reason: 'Age verification required for XP gain' };
                }
            }

            // Check anti-spam cooldown
            const cooldownKey = `${member.user.id}-${guild.id}`;
            if (this.isOnCooldown(cooldownKey, config.xp_cooldown_seconds)) {
                return { success: false, reason: 'Anti-spam cooldown active' };
            }

            // Calculate XP amount with randomization
            const baseXP = config.xp_per_message;
            const variation = Math.floor(baseXP * 0.25); // ±25% variation
            const randomOffset = Math.floor(Math.random() * (variation * 2 + 1)) - variation;
            const finalXP = Math.max(1, baseXP + randomOffset);

            // Award XP and check for level up
            const result = await this.awardXP(
                member, 
                guild, 
                finalXP, 
                XP_SOURCES.MESSAGE, 
                config,
                messageData
            );

            // Set cooldown
            this.setCooldown(cooldownKey, config.xp_cooldown_seconds);

            console.log(`✅ Message XP calculated: ${finalXP} XP awarded to ${member.user.tag}`);
            return result;

        } catch (error) {
            console.error('❌ Error calculating message XP:', error);
            throw error;
        }
    }

    /**
     * Calculate and award XP for voice activity
     * @param {GuildMember} member - Discord guild member
     * @param {Guild} guild - Discord guild
     * @param {number} minutesActive - Minutes in voice channel
     * @returns {Promise<Object>} - XP calculation result
     */
    async calculateVoiceXP(member, guild, minutesActive) {
        try {
            console.log(`🎤 Calculating voice XP for ${member.user.tag}: ${minutesActive} minutes`);

            const config = await LevelingConfig.findByGuildId(guild.id);
            if (!config.isLevelingEnabled() || !config.voice_xp_enabled) {
                return { success: false, reason: 'Voice XP disabled' };
            }

            // Check age verification
            if (config.require_age_verification) {
                const user = await this.getUserRecord(member.user.id, guild.id);
                if (!user || user.verification_status !== 'verified' || !user.is_21_plus) {
                    return { success: false, reason: 'Age verification required for voice XP' };
                }
            }

            // Calculate voice XP
            const xpAmount = Math.floor(minutesActive * config.voice_xp_per_minute);
            if (xpAmount <= 0) {
                return { success: false, reason: 'Insufficient voice activity time' };
            }

            return await this.awardXP(
                member, 
                guild, 
                xpAmount, 
                XP_SOURCES.VOICE_ACTIVITY, 
                config,
                { minutes_active: minutesActive }
            );

        } catch (error) {
            console.error('❌ Error calculating voice XP:', error);
            throw error;
        }
    }

    /**
     * Calculate and award XP for receiving helpful reactions
     * @param {GuildMember} member - Discord guild member
     * @param {Guild} guild - Discord guild
     * @param {number} reactionCount - Number of helpful reactions received
     * @returns {Promise<Object>} - XP calculation result
     */
    async calculateReactionXP(member, guild, reactionCount = 1) {
        try {
            console.log(`👍 Calculating reaction XP for ${member.user.tag}: ${reactionCount} reactions`);

            const config = await LevelingConfig.findByGuildId(guild.id);
            if (!config.isLevelingEnabled() || !config.reaction_xp_enabled) {
                return { success: false, reason: 'Reaction XP disabled' };
            }

            // Check age verification
            if (config.require_age_verification) {
                const user = await this.getUserRecord(member.user.id, guild.id);
                if (!user || user.verification_status !== 'verified' || !user.is_21_plus) {
                    return { success: false, reason: 'Age verification required for reaction XP' };
                }
            }

            const xpAmount = reactionCount * config.xp_per_reaction_received;
            
            return await this.awardXP(
                member, 
                guild, 
                xpAmount, 
                XP_SOURCES.REACTION_RECEIVED, 
                config,
                { reaction_count: reactionCount }
            );

        } catch (error) {
            console.error('❌ Error calculating reaction XP:', error);
            throw error;
        }
    }

    /**
     * Award XP to user and handle level progression
     * @param {GuildMember} member - Discord guild member
     * @param {Guild} guild - Discord guild
     * @param {number} xpAmount - XP to award
     * @param {string} source - XP source type
     * @param {LevelingConfig} config - Guild leveling configuration
     * @param {Object} metadata - Additional metadata
     * @returns {Promise<Object>} - Award result with level progression info
     */
    async awardXP(member, guild, xpAmount, source, config, metadata = {}) {
        try {
            // Get or create user record
            let user = await this.getUserRecord(member.user.id, guild.id);
            if (!user) {
                user = await this.createUserRecord(member, guild);
            }

            // Calculate level before XP award
            const previousLevel = user.current_level;
            const previousTier = user.level_tier;
            const previousTotalXP = user.total_xp;

            // Award XP and update counters
            const newTotalXP = previousTotalXP + xpAmount;
            const newLevel = config.calculateLevelFromXP(newTotalXP);
            const newTier = config.getTierFromLevel(newLevel);

            // Update user record
            const updateData = {
                total_xp: newTotalXP,
                current_level: newLevel,
                level_tier: newTier,
                last_xp_gain: new Date(),
                last_activity_at: new Date()
            };

            // Update activity counters based on source
            switch (source) {
                case XP_SOURCES.MESSAGE:
                    updateData.messages_count = user.messages_count + 1;
                    break;
                case XP_SOURCES.VOICE_ACTIVITY:
                    updateData.voice_time_minutes = user.voice_time_minutes + (metadata.minutes_active || 0);
                    break;
                case XP_SOURCES.REACTION_RECEIVED:
                    updateData.reactions_received = user.reactions_received + (metadata.reaction_count || 1);
                    break;
            }

            await user.update(updateData);

            // Check for level up and tier progression
            const leveledUp = newLevel > previousLevel;
            const tierChanged = newTier !== previousTier;

            let roleUpdateResult = null;
            if (tierChanged) {
                roleUpdateResult = await this.updateTierRoles(member, guild, previousTier, newTier);
            }

            // Log XP award for audit trail
            await this.logXPAward(member, guild, xpAmount, source, {
                previous_level: previousLevel,
                new_level: newLevel,
                previous_tier: previousTier,
                new_tier: newTier,
                leveled_up: leveledUp,
                tier_changed: tierChanged,
                ...metadata
            });

            // Send level up notification if enabled
            if (leveledUp && config.level_up_notifications_enabled) {
                await this.sendLevelUpNotification(member, guild, config, {
                    level: newLevel,
                    tier: newTier,
                    xp_gained: xpAmount,
                    tier_changed: tierChanged
                });
            }

            const result = {
                success: true,
                xp_awarded: xpAmount,
                total_xp: newTotalXP,
                previous_level: previousLevel,
                new_level: newLevel,
                previous_tier: previousTier,
                new_tier: newTier,
                leveled_up: leveledUp,
                tier_changed: tierChanged,
                role_update: roleUpdateResult
            };

            console.log(`🌿 XP awarded successfully: ${JSON.stringify(result)}`);
            return result;

        } catch (error) {
            console.error('❌ Error awarding XP:', error);
            throw error;
        }
    }

    /**
     * Update cannabis tier roles when user progresses
     * @param {GuildMember} member - Discord guild member
     * @param {Guild} guild - Discord guild
     * @param {string} previousTier - Previous cannabis tier
     * @param {string} newTier - New cannabis tier
     * @returns {Promise<Object>} - Role update result
     */
    async updateTierRoles(member, guild, previousTier, newTier) {
        try {
            console.log(`🏷️ Updating tier roles: ${member.user.tag} ${previousTier} → ${newTier}`);

            const rolesToRemove = [];
            const rolesToAdd = [];

            // Remove previous tier role
            const previousRoleId = TIER_ROLE_MAPPING[previousTier];
            if (previousRoleId && member.roles.cache.has(previousRoleId)) {
                const previousRole = guild.roles.cache.get(previousRoleId);
                if (previousRole) {
                    rolesToRemove.push(previousRole);
                }
            }

            // Add new tier role
            const newRoleId = TIER_ROLE_MAPPING[newTier];
            if (newRoleId) {
                const newRole = guild.roles.cache.get(newRoleId);
                if (newRole && !member.roles.cache.has(newRoleId)) {
                    rolesToAdd.push(newRole);
                }
            }

            // Apply role changes
            const results = {
                removed: [],
                added: [],
                failed: []
            };

            // Remove old roles
            for (const role of rolesToRemove) {
                try {
                    await member.roles.remove(role, `Cannabis tier progression: ${previousTier} → ${newTier}`);
                    results.removed.push(role.name);
                    console.log(`🗑️ Removed ${role.name} from ${member.user.tag}`);
                } catch (error) {
                    console.error(`❌ Failed to remove role ${role.name}:`, error);
                    results.failed.push(`Remove ${role.name}: ${error.message}`);
                }
            }

            // Add new roles
            for (const role of rolesToAdd) {
                try {
                    await member.roles.add(role, `Cannabis tier progression: ${previousTier} → ${newTier}`);
                    results.added.push(role.name);
                    console.log(`✅ Added ${role.name} to ${member.user.tag}`);
                } catch (error) {
                    console.error(`❌ Failed to add role ${role.name}:`, error);
                    results.failed.push(`Add ${role.name}: ${error.message}`);
                }
            }

            // Log role changes for audit
            if (results.removed.length > 0 || results.added.length > 0) {
                await AuditLog.logRoleAssignment(
                    member.user.id,
                    guild.id,
                    'leveling_system',
                    results.added.map(name => 
                        Object.entries(TIER_ROLE_MAPPING).find(([tier, roleId]) => 
                            guild.roles.cache.get(roleId)?.name === name
                        )?.[1]
                    ).filter(Boolean),
                    {
                        reason: `Cannabis tier progression: ${previousTier} → ${newTier}`,
                        removed_roles: results.removed,
                        added_roles: results.added,
                        failed_operations: results.failed
                    }
                );
            }

            return {
                success: results.failed.length === 0,
                ...results
            };

        } catch (error) {
            console.error('❌ Error updating tier roles:', error);
            return {
                success: false,
                error: error.message,
                removed: [],
                added: [],
                failed: ['System error during role update']
            };
        }
    }

    /**
     * Send level up notification
     * @param {GuildMember} member - Discord guild member
     * @param {Guild} guild - Discord guild
     * @param {LevelingConfig} config - Guild leveling configuration
     * @param {Object} levelData - Level up data
     * @returns {Promise<void>}
     */
    async sendLevelUpNotification(member, guild, config, levelData) {
        try {
            const notificationConfig = config.getLevelUpConfig();
            
            // Create cannabis-themed level up embed
            const embed = EmbedUtils.createSuccessEmbed(
                `🌿 Level Up! Welcome to Level ${levelData.level}!`,
                `Congratulations ${member.displayName}! You've grown in the cannabis community!\n\n` +
                `**🌱 New Level:** ${levelData.level}\n` +
                `**🏷️ Cannabis Tier:** ${levelData.tier}\n` +
                `**✨ XP Gained:** +${levelData.xp_gained}\n\n` +
                (levelData.tier_changed ? 
                    `🎉 **Tier Progression!** You've advanced to **${levelData.tier}** status in our cannabis community!\n\n` :
                    '') +
                `Keep participating to continue growing! 🌱→🌿`
            )
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 128 }))
            .setTimestamp()
            .setFooter({ 
                text: `GrowmiesNJ Cannabis Community • Level ${levelData.level}`,
                iconURL: guild.iconURL({ dynamic: true, size: 64 })
            });

            // Send to announcement channel if configured
            if (notificationConfig.channel_id) {
                const announcementChannel = guild.channels.cache.get(notificationConfig.channel_id);
                if (announcementChannel && announcementChannel.isTextBased()) {
                    await announcementChannel.send({
                        content: `${member} leveled up!`,
                        embeds: [embed]
                    });
                }
            }

            // Send DM if enabled
            if (notificationConfig.dm_notifications_enabled) {
                try {
                    await member.send({
                        embeds: [embed]
                    });
                } catch (dmError) {
                    console.log(`📧 Could not send DM to ${member.user.tag}: DMs may be disabled`);
                }
            }

            console.log(`🎉 Level up notification sent for ${member.user.tag} (Level ${levelData.level})`);

        } catch (error) {
            console.error('❌ Error sending level up notification:', error);
        }
    }

    /**
     * Get user record for XP tracking
     * @param {string} userId - Discord user ID
     * @param {string} guildId - Discord guild ID
     * @returns {Promise<User|null>} - User record
     */
    async getUserRecord(userId, guildId) {
        try {
            return await User.findOne({
                where: {
                    discord_id: userId,
                    guild_id: guildId,
                    is_active: true
                }
            });
        } catch (error) {
            console.error('❌ Error getting user record:', error);
            return null;
        }
    }

    /**
     * Create user record for new participant
     * @param {GuildMember} member - Discord guild member
     * @param {Guild} guild - Discord guild
     * @returns {Promise<User>} - Created user record
     */
    async createUserRecord(member, guild) {
        try {
            const userData = {
                discord_id: member.user.id,
                guild_id: guild.id,
                username: member.user.username,
                display_name: member.displayName,
                verification_status: 'pending',
                is_21_plus: false,
                total_xp: 0,
                current_level: 1,
                level_tier: 'Seedling',
                messages_count: 0,
                voice_time_minutes: 0,
                reactions_received: 0,
                level_up_notifications: true
            };

            const user = await User.create(userData);
            console.log(`📝 Created XP tracking record for ${member.user.tag}`);
            return user;

        } catch (error) {
            console.error('❌ Error creating user record:', error);
            throw error;
        }
    }

    /**
     * Log XP award for audit trail
     * @param {GuildMember} member - Discord guild member
     * @param {Guild} guild - Discord guild
     * @param {number} xpAmount - XP amount awarded
     * @param {string} source - XP source
     * @param {Object} metadata - Additional metadata
     * @returns {Promise<void>}
     */
    async logXPAward(member, guild, xpAmount, source, metadata) {
        try {
            await AuditLog.logAdminAction(
                'leveling_system',
                guild.id,
                'xp_award',
                member.user.id,
                {
                    xp_amount: xpAmount,
                    xp_source: source,
                    ...metadata
                }
            );
        } catch (error) {
            console.error('❌ Error logging XP award:', error);
        }
    }

    /**
     * Check if user is on XP cooldown
     * @param {string} cooldownKey - Unique cooldown key
     * @param {number} cooldownSeconds - Cooldown duration in seconds
     * @returns {boolean} - True if on cooldown
     */
    isOnCooldown(cooldownKey, cooldownSeconds) {
        const cooldownData = this.cooldownCache.get(cooldownKey);
        if (!cooldownData) return false;

        const timeElapsed = (Date.now() - cooldownData.timestamp) / 1000;
        return timeElapsed < cooldownSeconds;
    }

    /**
     * Set XP cooldown for user
     * @param {string} cooldownKey - Unique cooldown key
     * @param {number} cooldownSeconds - Cooldown duration in seconds
     * @returns {void}
     */
    setCooldown(cooldownKey, cooldownSeconds) {
        this.cooldownCache.set(cooldownKey, {
            timestamp: Date.now(),
            duration: cooldownSeconds
        });
    }

    /**
     * Start cache cleanup interval to prevent memory leaks
     * @returns {void}
     */
    startCacheCleanup() {
        setInterval(() => {
            const now = Date.now();
            for (const [key, data] of this.cooldownCache.entries()) {
                const timeElapsed = (now - data.timestamp) / 1000;
                if (timeElapsed > data.duration) {
                    this.cooldownCache.delete(key);
                }
            }
        }, this.CACHE_CLEANUP_INTERVAL);
    }

    /**
     * Get XP statistics for user
     * @param {string} userId - Discord user ID
     * @param {string} guildId - Discord guild ID
     * @returns {Promise<Object>} - User XP statistics
     */
    async getUserXPStats(userId, guildId) {
        try {
            const user = await this.getUserRecord(userId, guildId);
            if (!user) {
                return { found: false };
            }

            const config = await LevelingConfig.findByGuildId(guildId);
            const xpForNextLevel = config.calculateXPForLevel(user.current_level + 1);
            const xpProgress = user.total_xp - config.calculateXPForLevel(user.current_level);
            const xpNeeded = xpForNextLevel - user.total_xp;

            return {
                found: true,
                level: user.current_level,
                tier: user.level_tier,
                total_xp: user.total_xp,
                xp_progress: xpProgress,
                xp_needed: xpNeeded,
                xp_for_next_level: xpForNextLevel,
                messages_count: user.messages_count,
                voice_time_minutes: user.voice_time_minutes,
                reactions_received: user.reactions_received,
                last_xp_gain: user.last_xp_gain
            };

        } catch (error) {
            console.error('❌ Error getting user XP stats:', error);
            return { found: false, error: error.message };
        }
    }
}

module.exports = { 
    XPCalculationService, 
    XP_SOURCES, 
    TIER_ROLE_MAPPING 
};