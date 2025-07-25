/**
 * Role Management Service for GrowmiesNJ Discord Bot
 * 
 * Enhanced Welcome System - Auto-role assignment and management
 * Handles two-zone access system with age-based and activity-based roles
 */

const { User } = require('../database/models/User');
const { AuditLog } = require('../database/models/AuditLog');
const { EmbedUtils } = require('../utils/embeds');

/**
 * Role Configuration for GrowmiesNJ Server
 * Environment variables should define these role IDs
 */
const ROLE_CONFIG = {
    // Age-based access roles
    MEMBER: process.env.MEMBER_ROLE_ID || null,                    // 18+ general access
    CANNABIS_ACCESS: process.env.CANNABIS_ACCESS_ROLE_ID || null,  // 21+ cannabis discussions
    
    // Activity-based progression roles
    SEEDLING: process.env.SEEDLING_ROLE_ID || null,               // New verified members
    GROWING: process.env.GROWING_ROLE_ID || null,                 // Active participants
    ESTABLISHED: process.env.ESTABLISHED_ROLE_ID || null,         // Long-term contributors
    HARVESTED: process.env.HARVESTED_ROLE_ID || null,             // Community veterans
    
    // Legacy compatibility
    AGE_VERIFICATION: process.env.AGE_VERIFICATION_ROLE_ID || null // Original verification role
};

/**
 * Role hierarchy levels for progression system
 */
const PROGRESSION_LEVELS = {
    SEEDLING: 0,     // New verified members
    GROWING: 1,      // Active participants (30+ messages, 7+ days)
    ESTABLISHED: 2,  // Long-term contributors (100+ messages, 30+ days)
    HARVESTED: 3     // Community veterans (500+ messages, 90+ days, helping others)
};

/**
 * Role Management Service Class
 * Handles role assignment, progression, and compliance tracking
 */
class RoleManagementService {
    constructor() {
        this.validateConfiguration();
    }

    /**
     * Validate role configuration on service initialization
     * @throws {Error} - If critical roles are not configured
     */
    validateConfiguration() {
        const criticalRoles = ['MEMBER', 'CANNABIS_ACCESS', 'SEEDLING'];
        const missingRoles = criticalRoles.filter(roleKey => !ROLE_CONFIG[roleKey]);
        
        if (missingRoles.length > 0) {
            console.warn(`⚠️ Missing role configuration for: ${missingRoles.join(', ')}`);
            console.warn('Some role management features may not work properly');
        }
    }

    /**
     * Assign roles upon age verification completion
     * @param {GuildMember} member - Discord guild member
     * @param {Guild} guild - Discord guild
     * @param {Object} verificationData - Verification data from User model
     * @returns {Promise<Object>} - Assignment result with success status and assigned roles
     */
    async assignVerificationRoles(member, guild, verificationData) {
        try {
            console.log(`🏷️ Starting role assignment for ${member.user.tag}`);
            
            const assignedRoles = [];
            const failedRoles = [];
            const rolesToAssign = this.determineVerificationRoles(verificationData);

            // Assign each role individually with error handling
            for (const roleConfig of rolesToAssign) {
                try {
                    const role = guild.roles.cache.get(roleConfig.id);
                    if (!role) {
                        console.error(`❌ Role not found: ${roleConfig.name} (${roleConfig.id})`);
                        failedRoles.push(roleConfig);
                        continue;
                    }

                    // Check if user already has this role
                    if (member.roles.cache.has(roleConfig.id)) {
                        console.log(`✅ User ${member.user.tag} already has ${roleConfig.name} role`);
                        assignedRoles.push(roleConfig);
                        continue;
                    }

                    // Assign the role
                    await member.roles.add(role, `Age verification: ${roleConfig.reason}`);
                    assignedRoles.push(roleConfig);
                    console.log(`✅ Assigned ${roleConfig.name} role to ${member.user.tag}`);

                    // Add delay to prevent rate limiting
                    await this.sleep(100);

                } catch (roleError) {
                    console.error(`❌ Failed to assign ${roleConfig.name} role:`, roleError);
                    failedRoles.push(roleConfig);
                }
            }

            // Update user record with assigned roles
            await this.updateUserRoles(member.user.id, guild.id, assignedRoles);

            // Log role assignments for audit trail
            await this.logRoleAssignments(member, guild, assignedRoles, failedRoles);

            const result = {
                success: assignedRoles.length > 0,
                assignedRoles: assignedRoles.map(r => r.name),
                failedRoles: failedRoles.map(r => r.name),
                totalAttempted: rolesToAssign.length,
                partialSuccess: assignedRoles.length > 0 && failedRoles.length > 0
            };

            console.log(`🏷️ Role assignment complete for ${member.user.tag}: ${assignedRoles.length}/${rolesToAssign.length} successful`);
            return result;

        } catch (error) {
            console.error('❌ Error in role assignment:', error);
            throw error;
        }
    }

    /**
     * Determine which roles to assign based on verification data
     * @param {Object} verificationData - User verification data
     * @returns {Array<Object>} - Array of role configurations to assign
     */
    determineVerificationRoles(verificationData) {
        const roles = [];

        // All verified users get Member role (18+)
        if (ROLE_CONFIG.MEMBER) {
            roles.push({
                id: ROLE_CONFIG.MEMBER,
                name: 'Member',
                reason: '18+ age verification completed'
            });
        }

        // 21+ users get additional Cannabis Access role
        if (verificationData.is_21_plus && ROLE_CONFIG.CANNABIS_ACCESS) {
            roles.push({
                id: ROLE_CONFIG.CANNABIS_ACCESS,
                name: 'Cannabis Access',
                reason: '21+ age verification for cannabis discussions'
            });
        }

        // All verified users start with Seedling progression role
        if (ROLE_CONFIG.SEEDLING) {
            roles.push({
                id: ROLE_CONFIG.SEEDLING,
                name: 'Seedling',
                reason: 'Starting progression rank for new verified member'
            });
        }

        // Legacy compatibility - assign original verification role if configured
        if (ROLE_CONFIG.AGE_VERIFICATION) {
            roles.push({
                id: ROLE_CONFIG.AGE_VERIFICATION,
                name: 'Age Verified',
                reason: 'Legacy age verification role for backwards compatibility'
            });
        }

        return roles;
    }

    /**
     * Check and update member progression based on activity
     * @param {GuildMember} member - Discord guild member
     * @param {Guild} guild - Discord guild
     * @returns {Promise<Object>} - Progression update result
     */
    async checkAndUpdateProgression(member, guild) {
        try {
            // Get user record from database
            const user = await User.findOne({
                where: {
                    discord_id: member.user.id,
                    guild_id: guild.id,
                    is_active: true,
                    verification_status: 'verified'
                }
            });

            if (!user) {
                console.log(`❌ No verified user record found for ${member.user.tag}`);
                return { success: false, reason: 'User not found or not verified' };
            }

            // Calculate progression metrics (placeholder - would need message tracking)
            const progressionData = await this.calculateProgressionMetrics(user);
            const currentLevel = this.getCurrentProgressionLevel(member);
            const targetLevel = this.determineProgressionLevel(progressionData);

            if (targetLevel > currentLevel) {
                return await this.updateProgressionLevel(member, guild, targetLevel, progressionData);
            }

            return { success: true, reason: 'No progression update needed', currentLevel };

        } catch (error) {
            console.error('❌ Error checking progression:', error);
            return { success: false, reason: 'Error checking progression', error: error.message };
        }
    }

    /**
     * Update user roles in database
     * @param {string} userId - Discord user ID
     * @param {string} guildId - Discord guild ID
     * @param {Array<Object>} assignedRoles - Successfully assigned roles
     * @returns {Promise<void>}
     */
    async updateUserRoles(userId, guildId, assignedRoles) {
        try {
            const roleIds = assignedRoles.map(role => role.id);
            
            await User.update(
                { 
                    assigned_roles: roleIds,
                    last_activity_at: new Date()
                },
                { 
                    where: { 
                        discord_id: userId, 
                        guild_id: guildId 
                    } 
                }
            );

            console.log(`📝 Updated user roles in database for ${userId}`);
        } catch (error) {
            console.error('❌ Failed to update user roles in database:', error);
        }
    }

    /**
     * Log role assignments for audit trail
     * @param {GuildMember} member - Discord guild member
     * @param {Guild} guild - Discord guild
     * @param {Array<Object>} assignedRoles - Successfully assigned roles
     * @param {Array<Object>} failedRoles - Failed role assignments
     * @returns {Promise<void>}
     */
    async logRoleAssignments(member, guild, assignedRoles, failedRoles) {
        try {
            // Log successful assignments
            if (assignedRoles.length > 0) {
                await AuditLog.logRoleAssignment(
                    member.user.id,
                    guild.id,
                    'system', // Bot system action
                    assignedRoles.map(r => r.id),
                    {
                        reason: 'Age verification role assignment',
                        roles: assignedRoles.map(r => ({
                            id: r.id,
                            name: r.name,
                            reason: r.reason
                        })),
                        timestamp: new Date().toISOString()
                    }
                );
            }

            // Log failed assignments for troubleshooting
            if (failedRoles.length > 0) {
                await AuditLog.logVerificationAttempt(
                    member.user.id,
                    guild.id,
                    'system',
                    'warning',
                    {
                        action: 'role_assignment_partial_failure',
                        failed_roles: failedRoles.map(r => ({
                            id: r.id,
                            name: r.name
                        })),
                        assigned_roles: assignedRoles.map(r => r.name),
                        requires_manual_review: true
                    }
                );
            }

        } catch (error) {
            console.error('❌ Failed to log role assignments:', error);
        }
    }

    /**
     * Remove verification roles (for role cleanup or sanctions)
     * @param {GuildMember} member - Discord guild member
     * @param {Guild} guild - Discord guild
     * @param {string} reason - Reason for role removal
     * @returns {Promise<Object>} - Removal result
     */
    async removeVerificationRoles(member, guild, reason = 'Role removal requested') {
        try {
            const rolesToRemove = Object.values(ROLE_CONFIG).filter(roleId => 
                roleId && member.roles.cache.has(roleId)
            );

            const removedRoles = [];
            const failedRemovals = [];

            for (const roleId of rolesToRemove) {
                try {
                    const role = guild.roles.cache.get(roleId);
                    if (role) {
                        await member.roles.remove(role, reason);
                        removedRoles.push(role.name);
                        console.log(`🗑️ Removed ${role.name} from ${member.user.tag}`);
                    }
                } catch (roleError) {
                    console.error(`❌ Failed to remove role ${roleId}:`, roleError);
                    failedRemovals.push(roleId);
                }
            }

            // Update database
            await User.update(
                { 
                    assigned_roles: [],
                    verification_status: 'pending',
                    last_activity_at: new Date()
                },
                { 
                    where: { 
                        discord_id: member.user.id, 
                        guild_id: guild.id 
                    } 
                }
            );

            // Log removal
            await AuditLog.logRoleAssignment(
                member.user.id,
                guild.id,
                'system',
                [],
                {
                    action: 'role_removal',
                    reason: reason,
                    removed_roles: removedRoles,
                    failed_removals: failedRemovals
                }
            );

            return {
                success: removedRoles.length > 0,
                removedRoles,
                failedRemovals
            };

        } catch (error) {
            console.error('❌ Error removing verification roles:', error);
            throw error;
        }
    }

    /**
     * Get current progression level of member
     * @param {GuildMember} member - Discord guild member
     * @returns {number} - Current progression level
     */
    getCurrentProgressionLevel(member) {
        const progressionRoles = [
            { id: ROLE_CONFIG.HARVESTED, level: PROGRESSION_LEVELS.HARVESTED },
            { id: ROLE_CONFIG.ESTABLISHED, level: PROGRESSION_LEVELS.ESTABLISHED },
            { id: ROLE_CONFIG.GROWING, level: PROGRESSION_LEVELS.GROWING },
            { id: ROLE_CONFIG.SEEDLING, level: PROGRESSION_LEVELS.SEEDLING }
        ];

        for (const roleConfig of progressionRoles) {
            if (roleConfig.id && member.roles.cache.has(roleConfig.id)) {
                return roleConfig.level;
            }
        }

        return -1; // No progression role found
    }

    /**
     * Calculate progression metrics for user
     * @param {User} user - User database record
     * @returns {Promise<Object>} - Progression metrics
     */
    async calculateProgressionMetrics(user) {
        // Placeholder implementation - would integrate with message tracking system
        const daysSinceVerification = user.verified_at 
            ? Math.floor((new Date() - user.verified_at) / (1000 * 60 * 60 * 24))
            : 0;

        return {
            daysSinceVerification,
            messageCount: 0,        // Would come from message tracking
            helpfulActions: 0,      // Would come from reaction tracking
            channelParticipation: 0 // Would come from channel activity tracking
        };
    }

    /**
     * Determine target progression level based on metrics
     * @param {Object} metrics - User progression metrics
     * @returns {number} - Target progression level
     */
    determineProgressionLevel(metrics) {
        // Progression logic based on activity metrics
        if (metrics.daysSinceVerification >= 90 && 
            metrics.messageCount >= 500 && 
            metrics.helpfulActions >= 50) {
            return PROGRESSION_LEVELS.HARVESTED;
        } else if (metrics.daysSinceVerification >= 30 && 
                   metrics.messageCount >= 100) {
            return PROGRESSION_LEVELS.ESTABLISHED;
        } else if (metrics.daysSinceVerification >= 7 && 
                   metrics.messageCount >= 30) {
            return PROGRESSION_LEVELS.GROWING;
        } else {
            return PROGRESSION_LEVELS.SEEDLING;
        }
    }

    /**
     * Update member progression level
     * @param {GuildMember} member - Discord guild member
     * @param {Guild} guild - Discord guild
     * @param {number} targetLevel - Target progression level
     * @param {Object} metrics - Progression metrics
     * @returns {Promise<Object>} - Update result
     */
    async updateProgressionLevel(member, guild, targetLevel, metrics) {
        // Implementation for progression updates
        // This would remove old progression role and add new one
        console.log(`📈 Progression update needed for ${member.user.tag}: level ${targetLevel}`);
        
        return {
            success: true,
            reason: 'Progression update feature coming soon',
            targetLevel,
            metrics
        };
    }

    /**
     * Utility function to add delay between operations
     * @param {number} ms - Milliseconds to sleep
     * @returns {Promise<void>}
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get role management status for user
     * @param {string} userId - Discord user ID
     * @param {string} guildId - Discord guild ID
     * @returns {Promise<Object>} - Role status information
     */
    async getRoleStatus(userId, guildId) {
        try {
            const user = await User.findOne({
                where: { discord_id: userId, guild_id: guildId, is_active: true }
            });

            if (!user) {
                return { found: false };
            }

            return {
                found: true,
                verificationStatus: user.verification_status,
                is21Plus: user.is_21_plus,
                assignedRoles: user.assigned_roles || [],
                verifiedAt: user.verified_at,
                lastActivity: user.last_activity_at
            };

        } catch (error) {
            console.error('❌ Error getting role status:', error);
            return { found: false, error: error.message };
        }
    }
}

module.exports = { 
    RoleManagementService, 
    ROLE_CONFIG, 
    PROGRESSION_LEVELS 
};