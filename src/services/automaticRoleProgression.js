/**
 * Automatic Role Progression Service for GrowmiesNJ Discord Bot
 * 
 * Cannabis-themed progression system that automatically updates user roles
 * based on activity, time, and community participation metrics
 * 
 * Cannabis Industry Compliance:
 * - Respects age verification requirements (21+ for cannabis roles)
 * - Integrates with audit trail system for all role changes
 * - Follows secure progression rules and anti-abuse measures
 */

const { User } = require('../database/models/User');
const { LevelingConfig } = require('../database/models/LevelingConfig');
const { AuditLog } = require('../database/models/AuditLog');
const { RoleManagementService, ROLE_CONFIG, PROGRESSION_LEVELS } = require('./roleManagement');
const { XPCalculationService, TIER_ROLE_MAPPING } = require('./xpCalculation');
const { EmbedUtils } = require('../utils/embeds');

/**
 * Progression criteria for cannabis-themed tiers
 */
const PROGRESSION_CRITERIA = {
    Growing: {
        min_level: 11,
        min_days_active: 7,
        min_messages: 30,
        min_total_xp: 500
    },
    Established: {
        min_level: 26,
        min_days_active: 30,
        min_messages: 100,
        min_total_xp: 2500,
        min_voice_minutes: 60
    },
    Harvested: {
        min_level: 51,
        min_days_active: 90,
        min_messages: 500,
        min_total_xp: 10000,
        min_voice_minutes: 300,
        min_reactions_received: 50
    }
};

/**
 * Progression check intervals
 */
const CHECK_INTERVALS = {
    REAL_TIME: 'real_time',       // Triggered by XP events
    HOURLY: 'hourly',             // Every hour for active users
    DAILY: 'daily',               // Daily batch processing
    WEEKLY: 'weekly'              // Weekly comprehensive review
};

/**
 * Automatic Role Progression Service Class
 * Handles scheduled role progression checks and bulk updates
 */
class AutomaticRoleProgressionService {
    constructor() {
        this.roleManager = new RoleManagementService();
        this.xpService = new XPCalculationService();
        this.progressionQueue = new Map(); // Queue for pending progressions
        this.isProcessing = false;
        
        console.log('🏷️ Automatic Role Progression Service initialized');
    }

    /**
     * Process role progression for all eligible users in a guild
     * @param {Guild} guild - Discord guild
     * @param {string} checkType - Type of progression check
     * @returns {Promise<Object>} - Progression results summary
     */
    async processGuildProgression(guild, checkType = CHECK_INTERVALS.DAILY) {
        try {
            console.log(`🏷️ Starting ${checkType} role progression check for ${guild.name}`);

            if (this.isProcessing) {
                console.log('⏳ Progression check already in progress, skipping');
                return { success: false, reason: 'Already processing' };
            }

            this.isProcessing = true;

            // Get guild leveling configuration
            const config = await LevelingConfig.findByGuildId(guild.id);
            if (!config.isLevelingEnabled()) {
                this.isProcessing = false;
                return { success: false, reason: 'Leveling disabled for guild' };
            }

            // Get all eligible users for progression check
            const eligibleUsers = await this.getEligibleUsers(guild.id, checkType);
            console.log(`📊 Found ${eligibleUsers.length} users eligible for progression check`);

            const results = {
                total_checked: eligibleUsers.length,
                progressions: [],
                errors: [],
                summary: {
                    Seedling: { promoted_from: 0, promoted_to: 0 },
                    Growing: { promoted_from: 0, promoted_to: 0 },
                    Established: { promoted_from: 0, promoted_to: 0 },
                    Harvested: { promoted_from: 0, promoted_to: 0 }
                }
            };

            // Process each user individually
            for (const user of eligibleUsers) {
                try {
                    const member = await guild.members.fetch(user.discord_id).catch(() => null);
                    if (!member) {
                        console.log(`👻 User ${user.discord_id} no longer in guild, skipping`);
                        continue;
                    }

                    const progressionResult = await this.checkUserProgression(member, guild, user, config);
                    if (progressionResult.progressed) {
                        results.progressions.push(progressionResult);
                        results.summary[progressionResult.previous_tier].promoted_from++;
                        results.summary[progressionResult.new_tier].promoted_to++;
                    }

                    // Add small delay to prevent rate limiting
                    await this.sleep(100);

                } catch (userError) {
                    console.error(`❌ Error processing user ${user.discord_id}:`, userError);
                    results.errors.push({
                        user_id: user.discord_id,
                        error: userError.message
                    });
                }
            }

            // Log progression summary
            await this.logProgressionSummary(guild, checkType, results);

            this.isProcessing = false;
            console.log(`✅ Role progression check completed: ${results.progressions.length} progressions, ${results.errors.length} errors`);

            return {
                success: true,
                check_type: checkType,
                ...results
            };

        } catch (error) {
            this.isProcessing = false;
            console.error('❌ Error in guild progression processing:', error);
            throw error;
        }
    }

    /**
     * Check individual user for role progression eligibility
     * @param {GuildMember} member - Discord guild member
     * @param {Guild} guild - Discord guild
     * @param {User} user - User database record
     * @param {LevelingConfig} config - Guild leveling configuration
     * @returns {Promise<Object>} - Progression check result
     */
    async checkUserProgression(member, guild, user, config) {
        try {
            // Age verification check for cannabis content
            if (config.require_age_verification && 
                (user.verification_status !== 'verified' || !user.is_21_plus)) {
                return {
                    progressed: false,
                    reason: 'Age verification required for cannabis role progression'
                };
            }

            // Calculate user activity metrics
            const metrics = await this.calculateUserMetrics(user);
            
            // Determine target tier based on level and activity
            const currentTier = user.level_tier;
            const targetTier = this.determineTargetTier(user.current_level, metrics);

            if (targetTier === currentTier) {
                return {
                    progressed: false,
                    reason: 'User already at correct tier for their level and activity'
                };
            }

            // Check if progression meets criteria
            const meetsRequirements = this.checkProgressionRequirements(targetTier, metrics);
            if (!meetsRequirements.eligible) {
                return {
                    progressed: false,
                    reason: `Requirements not met: ${meetsRequirements.missing.join(', ')}`
                };
            }

            // Perform role progression
            const roleUpdateResult = await this.updateUserTier(member, guild, user, currentTier, targetTier);

            if (roleUpdateResult.success) {
                // Update user record
                await user.update({
                    level_tier: targetTier,
                    last_activity_at: new Date()
                });

                // Log successful progression
                await this.logRoleProgression(member, guild, currentTier, targetTier, metrics);

                return {
                    progressed: true,
                    user_id: user.discord_id,
                    username: user.username,
                    previous_tier: currentTier,
                    new_tier: targetTier,
                    level: user.current_level,
                    metrics,
                    role_update: roleUpdateResult
                };
            } else {
                return {
                    progressed: false,
                    reason: `Role update failed: ${roleUpdateResult.error}`
                };
            }

        } catch (error) {
            console.error(`❌ Error checking user progression for ${member.user.tag}:`, error);
            return {
                progressed: false,
                reason: `System error: ${error.message}`
            };
        }
    }

    /**
     * Get users eligible for progression check
     * @param {string} guildId - Discord guild ID
     * @param {string} checkType - Type of progression check
     * @returns {Promise<User[]>} - Eligible users
     */
    async getEligibleUsers(guildId, checkType) {
        try {
            const { Op } = require('@sequelize/core');
            
            let whereConditions = {
                guild_id: guildId,
                is_active: true,
                verification_status: 'verified',
                is_21_plus: true, // Cannabis community requirement
                current_level: { [Op.gte]: 1 }
            };

            // Add time-based filters for different check types
            const now = new Date();
            switch (checkType) {
                case CHECK_INTERVALS.HOURLY:
                    const oneHourAgo = new Date(now - 60 * 60 * 1000);
                    whereConditions.last_activity_at = { [Op.gte]: oneHourAgo };
                    break;
                    
                case CHECK_INTERVALS.DAILY:
                    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
                    whereConditions.last_activity_at = { [Op.gte]: oneDayAgo };
                    break;
                    
                case CHECK_INTERVALS.WEEKLY:
                    // Check all verified users for weekly review
                    break;
            }

            return await User.findAll({
                where: whereConditions,
                order: [['total_xp', 'DESC'], ['current_level', 'DESC']]
            });

        } catch (error) {
            console.error('❌ Error getting eligible users:', error);
            return [];
        }
    }

    /**
     * Calculate user activity metrics for progression evaluation
     * @param {User} user - User database record
     * @returns {Object} - Activity metrics
     */
    calculateUserMetrics(user) {
        const now = new Date();
        const verifiedAt = user.verified_at || user.created_at;
        const daysActive = Math.floor((now - verifiedAt) / (1000 * 60 * 60 * 24));

        return {
            days_active: daysActive,
            level: user.current_level,
            total_xp: user.total_xp,
            messages_count: user.messages_count,
            voice_time_minutes: user.voice_time_minutes,
            reactions_received: user.reactions_received,
            xp_per_day: daysActive > 0 ? Math.floor(user.total_xp / daysActive) : 0,
            activity_score: this.calculateActivityScore(user)
        };
    }

    /**
     * Calculate overall activity score for user
     * @param {User} user - User database record
     * @returns {number} - Activity score (0-100)
     */
    calculateActivityScore(user) {
        // Weighted activity score based on multiple factors
        const messageScore = Math.min(user.messages_count / 10, 30); // Max 30 points
        const voiceScore = Math.min(user.voice_time_minutes / 60, 25); // Max 25 points
        const reactionScore = Math.min(user.reactions_received / 5, 20); // Max 20 points
        const xpScore = Math.min(user.total_xp / 1000, 25); // Max 25 points

        return Math.floor(messageScore + voiceScore + reactionScore + xpScore);
    }

    /**
     * Determine target tier based on level and activity
     * @param {number} level - User level
     * @param {Object} metrics - User activity metrics
     * @returns {string} - Target cannabis tier
     */
    determineTargetTier(level, metrics) {
        if (level >= 51 && metrics.activity_score >= 70) {
            return 'Harvested';
        } else if (level >= 26 && metrics.activity_score >= 50) {
            return 'Established';
        } else if (level >= 11 && metrics.activity_score >= 30) {
            return 'Growing';
        } else {
            return 'Seedling';
        }
    }

    /**
     * Check if user meets progression requirements for target tier
     * @param {string} targetTier - Target cannabis tier
     * @param {Object} metrics - User activity metrics
     * @returns {Object} - Eligibility check result
     */
    checkProgressionRequirements(targetTier, metrics) {
        const requirements = PROGRESSION_CRITERIA[targetTier];
        if (!requirements) {
            return { eligible: true, missing: [] };
        }

        const missing = [];

        if (metrics.level < requirements.min_level) {
            missing.push(`Level ${requirements.min_level} required (current: ${metrics.level})`);
        }
        if (metrics.days_active < requirements.min_days_active) {
            missing.push(`${requirements.min_days_active} days activity required (current: ${metrics.days_active})`);
        }
        if (metrics.messages_count < requirements.min_messages) {
            missing.push(`${requirements.min_messages} messages required (current: ${metrics.messages_count})`);
        }
        if (metrics.total_xp < requirements.min_total_xp) {
            missing.push(`${requirements.min_total_xp} XP required (current: ${metrics.total_xp})`);
        }
        if (requirements.min_voice_minutes && metrics.voice_time_minutes < requirements.min_voice_minutes) {
            missing.push(`${requirements.min_voice_minutes} voice minutes required (current: ${metrics.voice_time_minutes})`);
        }
        if (requirements.min_reactions_received && metrics.reactions_received < requirements.min_reactions_received) {
            missing.push(`${requirements.min_reactions_received} helpful reactions required (current: ${metrics.reactions_received})`);
        }

        return {
            eligible: missing.length === 0,
            missing
        };
    }

    /**
     * Update user tier roles
     * @param {GuildMember} member - Discord guild member
     * @param {Guild} guild - Discord guild
     * @param {User} user - User database record
     * @param {string} currentTier - Current cannabis tier
     * @param {string} targetTier - Target cannabis tier
     * @returns {Promise<Object>} - Role update result
     */
    async updateUserTier(member, guild, user, currentTier, targetTier) {
        try {
            console.log(`🏷️ Updating ${member.user.tag}: ${currentTier} → ${targetTier}`);

            // Use the XP service role update logic for consistency
            return await this.xpService.updateTierRoles(member, guild, currentTier, targetTier);

        } catch (error) {
            console.error('❌ Error updating user tier:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Log role progression for audit trail
     * @param {GuildMember} member - Discord guild member
     * @param {Guild} guild - Discord guild
     * @param {string} currentTier - Current tier
     * @param {string} targetTier - Target tier
     * @param {Object} metrics - User metrics
     * @returns {Promise<void>}
     */
    async logRoleProgression(member, guild, currentTier, targetTier, metrics) {
        try {
            await AuditLog.logRoleAssignment(
                member.user.id,
                guild.id,
                'automatic_progression_system',
                [TIER_ROLE_MAPPING[targetTier]].filter(Boolean),
                {
                    reason: `Automatic cannabis tier progression: ${currentTier} → ${targetTier}`,
                    progression_type: 'automatic',
                    previous_tier: currentTier,
                    new_tier: targetTier,
                    user_metrics: metrics,
                    timestamp: new Date().toISOString()
                }
            );
        } catch (error) {
            console.error('❌ Error logging role progression:', error);
        }
    }

    /**
     * Log progression summary for analytics
     * @param {Guild} guild - Discord guild
     * @param {string} checkType - Check type
     * @param {Object} results - Progression results
     * @returns {Promise<void>}
     */
    async logProgressionSummary(guild, checkType, results) {
        try {
            await AuditLog.logAdminAction(
                'automatic_progression_system',
                guild.id,
                'progression_summary',
                null,
                {
                    check_type: checkType,
                    total_checked: results.total_checked,
                    total_progressions: results.progressions.length,
                    total_errors: results.errors.length,
                    tier_summary: results.summary,
                    timestamp: new Date().toISOString()
                }
            );
        } catch (error) {
            console.error('❌ Error logging progression summary:', error);
        }
    }

    /**
     * Queue user for progression check
     * @param {string} userId - Discord user ID
     * @param {string} guildId - Discord guild ID
     * @param {string} reason - Reason for check
     * @returns {void}
     */
    queueProgressionCheck(userId, guildId, reason = 'activity_trigger') {
        const queueKey = `${userId}-${guildId}`;
        this.progressionQueue.set(queueKey, {
            user_id: userId,
            guild_id: guildId,
            reason,
            queued_at: new Date()
        });

        console.log(`📝 Queued progression check for ${userId} in ${guildId}: ${reason}`);
    }

    /**
     * Process queued progression checks
     * @param {Client} client - Discord client
     * @returns {Promise<void>}
     */
    async processQueue(client) {
        if (this.progressionQueue.size === 0) return;

        console.log(`🏃 Processing ${this.progressionQueue.size} queued progression checks`);

        for (const [queueKey, queueItem] of this.progressionQueue.entries()) {
            try {
                const guild = client.guilds.cache.get(queueItem.guild_id);
                if (!guild) {
                    this.progressionQueue.delete(queueKey);
                    continue;
                }

                const member = await guild.members.fetch(queueItem.user_id).catch(() => null);
                if (!member) {
                    this.progressionQueue.delete(queueKey);
                    continue;
                }

                const user = await User.findOne({
                    where: {
                        discord_id: queueItem.user_id,
                        guild_id: queueItem.guild_id,
                        is_active: true
                    }
                });

                if (user) {
                    const config = await LevelingConfig.findByGuildId(guild.id);
                    await this.checkUserProgression(member, guild, user, config);
                }

                this.progressionQueue.delete(queueKey);
                await this.sleep(500); // Rate limiting

            } catch (error) {
                console.error(`❌ Error processing queue item ${queueKey}:`, error);
                this.progressionQueue.delete(queueKey);
            }
        }
    }

    /**
     * Get progression statistics for guild
     * @param {string} guildId - Discord guild ID
     * @returns {Promise<Object>} - Progression statistics
     */
    async getProgressionStats(guildId) {
        try {
            const { fn, col } = require('@sequelize/core');
            
            const tierDistribution = await User.findAll({
                where: {
                    guild_id: guildId,
                    is_active: true,
                    verification_status: 'verified'
                },
                attributes: [
                    'level_tier',
                    [fn('COUNT', '*'), 'count']
                ],
                group: ['level_tier'],
                raw: true
            });

            const totalUsers = tierDistribution.reduce((sum, tier) => sum + parseInt(tier.count), 0);

            return {
                total_users: totalUsers,
                tier_distribution: tierDistribution.reduce((acc, tier) => {
                    acc[tier.level_tier] = {
                        count: parseInt(tier.count),
                        percentage: totalUsers > 0 ? ((parseInt(tier.count) / totalUsers) * 100).toFixed(1) : 0
                    };
                    return acc;
                }, {}),
                queue_size: this.progressionQueue.size
            };

        } catch (error) {
            console.error('❌ Error getting progression stats:', error);
            return { error: error.message };
        }
    }

    /**
     * Utility function to add delay
     * @param {number} ms - Milliseconds to sleep
     * @returns {Promise<void>}
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = { 
    AutomaticRoleProgressionService, 
    PROGRESSION_CRITERIA, 
    CHECK_INTERVALS 
};