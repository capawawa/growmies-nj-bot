/**
 * Age Verification Service for GrowmiesNJ Discord Bot
 * 
 * Phase 3A: Complete age verification system with button handlers
 * Handles 21+ verification, role assignment, and legal compliance audit trails
 */

const { User } = require('../database/models/User');
const { AuditLog } = require('../database/models/AuditLog');
const { MessageFlags } = require('discord.js');
const { RoleManagementService } = require('./roleManagement');
const { WelcomeEmbeds, EmbedUtils } = require('../utils/embeds');

/**
 * Age Verification Service Class
 * Manages verification workflow, database integration, and audit logging
 */
class AgeVerificationService {
    constructor() {
        this.VERIFICATION_COOLDOWN = 60 * 1000; // 1 minute cooldown between attempts
        this.MAX_DAILY_ATTEMPTS = 5;
        this.roleManager = new RoleManagementService();
    }

    /**
     * Handle age verification confirmation (user clicked "I am 21+")
     * @param {ButtonInteraction} interaction - Discord button interaction
     * @returns {Promise<boolean>} - Success status
     */
    async handleAgeConfirmation(interaction) {
        try {
            console.log(`🌿 Age verification confirmation by ${interaction.user.tag} (${interaction.user.id})`);

            // Check rate limiting
            const canAttempt = await this.checkRateLimit(interaction.user.id, interaction.guild.id);
            if (!canAttempt) {
                await interaction.reply({
                    content: '⏱️ **Rate Limit Exceeded**\n\nYou have attempted verification too many times. Please wait 24 hours before trying again.\n\nIf you need assistance, please contact an administrator.',
                    flags: MessageFlags.Ephemeral
                });
                return false;
            }

            // Check if user is already verified in database
            const existingUser = await this.getUserVerificationStatus(interaction.user.id, interaction.guild.id);
            if (existingUser && existingUser.verification_status === 'verified') {
                await interaction.reply({
                    content: '✅ **Already Verified**\n\nYou are already verified as 21+ years old. You have access to all cannabis community content.',
                    flags: MessageFlags.Ephemeral
                });
                return true;
            }

            // Create or update user verification record
            const user = await this.createOrUpdateUser(interaction.user, interaction.guild.id, 'verified');
            
            // Use enhanced role management system for auto-role assignment
            const roleResult = await this.roleManager.assignVerificationRoles(
                interaction.member,
                interaction.guild,
                user
            );
            
            if (roleResult.success) {
                // Log successful verification
                await AuditLog.logVerificationAttempt(
                    interaction.user.id,
                    interaction.guild.id,
                    interaction.user.id,
                    'success',
                    {
                        verification_method: 'button_confirmation',
                        ip_address: interaction.user.ipAddress || null,
                        user_agent: interaction.user.userAgent || null,
                        attempt_number: user.verification_attempts + 1,
                        assigned_roles: roleResult.assignedRoles
                    }
                );

                // Send enhanced success message with role information
                const successEmbed = WelcomeEmbeds.createRoleAssignmentSuccessEmbed(
                    interaction.member,
                    roleResult.assignedRoles
                );

                await interaction.reply({
                    embeds: [successEmbed],
                    flags: MessageFlags.Ephemeral
                });

                console.log(`✅ Age verification completed successfully for ${interaction.user.tag}: ${roleResult.assignedRoles.join(', ')}`);
                return true;
            } else {
                // Handle partial success or complete failure
                const errorEmbed = roleResult.partialSuccess
                    ? EmbedUtils.createWarningEmbed(
                        'Verification Partially Complete',
                        `Your age verification was successful, but there were issues assigning some roles.\n\n` +
                        `**Successfully Assigned:** ${roleResult.assignedRoles.join(', ') || 'None'}\n` +
                        `**Failed Assignments:** ${roleResult.failedRoles.join(', ') || 'None'}\n\n` +
                        `A moderator will review and fix any missing roles. Your verification is complete and valid.\n\n` +
                        `**Reference ID:** \`VRF-${Date.now()}\``
                    )
                    : EmbedUtils.createErrorEmbed(
                        'Verification Issue',
                        `Your age verification was recorded, but there was an issue assigning your roles. ` +
                        `Please contact an administrator for assistance.\n\n` +
                        `**Reference ID:** \`VRF-${Date.now()}\``,
                        `VRF-${Date.now()}`
                    );

                await interaction.reply({
                    embeds: [errorEmbed],
                    flags: MessageFlags.Ephemeral
                });

                // Update user status based on role assignment result
                if (roleResult.partialSuccess) {
                    await user.update({
                        verification_notes: `Partial role assignment: ${roleResult.assignedRoles.join(', ')}`
                    });
                } else {
                    await user.update({
                        verification_status: 'pending',
                        verification_notes: 'Complete role assignment failed - manual intervention required'
                    });
                }

                console.error(`❌ Role assignment ${roleResult.partialSuccess ? 'partially' : 'completely'} failed for ${interaction.user.tag}`);
                return roleResult.partialSuccess;
            }

        } catch (error) {
            console.error('❌ Error in age verification confirmation:', error);

            // Log failed verification attempt
            try {
                await AuditLog.logVerificationAttempt(
                    interaction.user.id,
                    interaction.guild.id,
                    interaction.user.id,
                    'failure',
                    {
                        verification_method: 'button_confirmation',
                        failure_reason: 'system_error',
                        error_message: error.message
                    }
                );
            } catch (logError) {
                console.error('❌ Failed to log verification error:', logError);
            }

            await interaction.reply({
                content: '⚠️ **System Error**\n\nThere was an error processing your verification. Please try again later or contact an administrator.\n\n**Error Code:** `SYS-' + Date.now() + '`',
                flags: MessageFlags.Ephemeral
            });

            return false;
        }
    }

    /**
     * Handle age verification denial (user clicked "Under 21")
     * @param {ButtonInteraction} interaction - Discord button interaction
     * @returns {Promise<boolean>} - Success status
     */
    async handleAgeDenial(interaction) {
        try {
            console.log(`🚫 Age verification denial by ${interaction.user.tag} (${interaction.user.id})`);

            // Create or update user record with rejected status
            await this.createOrUpdateUser(interaction.user, interaction.guild.id, 'rejected');

            // Log the denial for compliance
            await AuditLog.logVerificationAttempt(
                interaction.user.id,
                interaction.guild.id,
                interaction.user.id,
                'failure',
                {
                    verification_method: 'button_denial',
                    failure_reason: 'user_under_21',
                    compliance_note: 'User self-reported as under 21'
                }
            );

            await interaction.reply({
                content: this.getDenialMessage(),
                flags: MessageFlags.Ephemeral
            });

            console.log(`📝 Age verification denial logged for ${interaction.user.tag}`);
            return true;

        } catch (error) {
            console.error('❌ Error in age verification denial:', error);

            await interaction.reply({
                content: '⚠️ **System Error**\n\nThere was an error processing your response. Please contact an administrator.\n\n**Error Code:** `DEN-' + Date.now() + '`',
                flags: MessageFlags.Ephemeral
            });

            return false;
        }
    }

    /**
     * Check if user can attempt verification (rate limiting)
     * @param {string} userId - Discord user ID
     * @param {string} guildId - Discord guild ID
     * @returns {Promise<boolean>} - Can attempt verification
     */
    async checkRateLimit(userId, guildId) {
        try {
            const user = await User.findOne({
                where: { 
                    discord_id: userId, 
                    guild_id: guildId 
                }
            });

            if (!user) return true; // First attempt

            return user.canAttemptVerification();
        } catch (error) {
            console.error('❌ Error checking rate limit:', error);
            return true; // Allow attempt on error
        }
    }

    /**
     * Get user verification status from database
     * @param {string} userId - Discord user ID
     * @param {string} guildId - Discord guild ID
     * @returns {Promise<User|null>} - User record or null
     */
    async getUserVerificationStatus(userId, guildId) {
        try {
            return await User.findOne({
                where: { 
                    discord_id: userId, 
                    guild_id: guildId,
                    is_active: true
                }
            });
        } catch (error) {
            console.error('❌ Error getting user verification status:', error);
            return null;
        }
    }

    /**
     * Create or update user verification record
     * @param {DiscordUser} discordUser - Discord user object
     * @param {string} guildId - Discord guild ID
     * @param {string} status - Verification status
     * @returns {Promise<User>} - User record
     */
    async createOrUpdateUser(discordUser, guildId, status) {
        try {
            const userData = {
                discord_id: discordUser.id,
                guild_id: guildId,
                username: discordUser.username,
                display_name: discordUser.displayName || discordUser.globalName,
                verification_status: status,
                is_21_plus: status === 'verified',
                verification_method: 'button_interaction',
                last_attempt_at: new Date(),
                verification_metadata: {
                    discord_tag: discordUser.tag,
                    verification_timestamp: new Date().toISOString(),
                    bot_version: process.env.npm_package_version || '1.0.0'
                }
            };

            if (status === 'verified') {
                userData.verified_at = new Date();
                userData.birth_year = new Date().getFullYear() - 21; // Minimum birth year for 21+
            }

            const [user, created] = await User.upsert(userData, {
                returning: true
            });

            // Increment attempt counter if not verified
            if (status !== 'verified') {
                await user.increment('verification_attempts');
            }

            console.log(`📝 User verification record ${created ? 'created' : 'updated'} for ${discordUser.tag}`);
            return user;

        } catch (error) {
            console.error('❌ Error creating/updating user record:', error);
            throw error;
        }
    }

    /**
     * Assign verified role to user
     * @param {GuildMember} member - Discord guild member
     * @param {Guild} guild - Discord guild
     * @returns {Promise<boolean>} - Success status
     */
    async assignVerifiedRole(member, guild) {
        try {
            const verifiedRoleId = process.env.AGE_VERIFICATION_ROLE_ID;
            if (!verifiedRoleId) {
                console.error('❌ AGE_VERIFICATION_ROLE_ID not configured');
                return false;
            }

            const role = guild.roles.cache.get(verifiedRoleId);
            if (!role) {
                console.error(`❌ Verified role not found: ${verifiedRoleId}`);
                return false;
            }

            // Check if user already has the role
            if (member.roles.cache.has(verifiedRoleId)) {
                console.log(`✅ User ${member.user.tag} already has verified role`);
                return true;
            }

            await member.roles.add(role, 'Age verification completed - 21+ confirmed');
            console.log(`✅ Verified role assigned to ${member.user.tag}`);
            return true;

        } catch (error) {
            console.error('❌ Error assigning verified role:', error);
            return false;
        }
    }

    /**
     * Get success message for verified users
     * @returns {string} - Success message
     */
    getSuccessMessage() {
        return `🎉 **Age Verification Complete!**

✅ You have been successfully verified as 21+ years old
🌿 You now have access to all cannabis community content
🔓 Restricted channels are now available to you

**Legal Compliance Notice:**
• Cannabis is legal in New Jersey for adults 21+
• Always follow federal, state, and local laws
• This community is for educational purposes only

**Welcome to the Growmies NJ community!** 🌱

*This verification is private and secure • Your privacy is protected*`;
    }

    /**
     * Get denial message for under 21 users
     * @returns {string} - Denial message
     */
    getDenialMessage() {
        return `🚫 **Age Verification Required**

Thank you for your honesty. Unfortunately, you must be **21 years or older** to access cannabis-related content in this community.

**New Jersey Cannabis Laws:**
• Cannabis possession and use is only legal for adults 21+
• This restriction is required by state law
• We take legal compliance seriously

**You are welcome to:**
• Participate in general community discussions
• Access public channels and content
• Return when you reach the age of 21

**Questions?** Contact our moderation team for assistance.

*This community follows all applicable laws and Discord Terms of Service*`;
    }
}

module.exports = { AgeVerificationService };