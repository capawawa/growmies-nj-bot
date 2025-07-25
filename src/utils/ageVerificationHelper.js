/**
 * Age Verification Helper Utility
 * 
 * Centralized utility for checking age verification status across engagement commands
 * Ensures consistent cannabis compliance across all features
 */

const { User } = require('../database/models/User');
const { MessageFlags } = require('discord.js');

class AgeVerificationHelper {
    /**
     * Check if user is verified for cannabis content access
     * @param {string} userId - Discord user ID
     * @param {string} guildId - Discord guild ID
     * @returns {Promise<Object>} - Verification result with status and user data
     */
    static async checkUserVerification(userId, guildId) {
        try {
            const user = await User.findOne({
                where: {
                    discord_id: userId,
                    guild_id: guildId,
                    is_active: true
                }
            });

            if (!user) {
                return {
                    verified: false,
                    reason: 'no_record',
                    message: 'No verification record found',
                    user: null
                };
            }

            if (user.verification_status !== 'verified' || !user.is_21_plus) {
                return {
                    verified: false,
                    reason: 'not_verified',
                    message: 'Age verification required for cannabis content',
                    user: user
                };
            }

            // Check for expired verification
            if (user.isVerificationExpired()) {
                return {
                    verified: false,
                    reason: 'expired',
                    message: 'Age verification has expired',
                    user: user
                };
            }

            return {
                verified: true,
                reason: 'verified',
                message: 'User is verified for cannabis content',
                user: user
            };

        } catch (error) {
            console.error('Error checking user verification:', error);
            return {
                verified: false,
                reason: 'error',
                message: 'Error checking verification status',
                user: null
            };
        }
    }

    /**
     * Handle age verification failure response
     * @param {Object} interaction - Discord interaction object
     * @param {string} reason - Reason for verification failure
     * @param {boolean} ephemeral - Whether response should be ephemeral (default: true)
     * @returns {Promise<void>}
     */
    static async handleVerificationFailure(interaction, reason = 'not_verified', ephemeral = true) {
        try {
            let content;

            switch (reason) {
                case 'no_record':
                    content = `🔞 **Age Verification Required**

You need to complete age verification to access cannabis content.

**To get verified:**
1. Use the \`/verify\` command to start the process
2. Confirm you are 21+ years old
3. Gain access to cannabis community features

*This is required by New Jersey cannabis laws.*`;
                    break;

                case 'not_verified':
                    content = `🔞 **Cannabis Content Restricted**

This feature contains cannabis-related content that requires age verification (21+).

**To access this content:**
1. Complete age verification with \`/verify\`
2. Confirm you are 21+ years old
3. Return to use this feature

*Age verification protects minors and ensures legal compliance.*`;
                    break;

                case 'expired':
                    content = `⚠️ **Verification Expired**

Your age verification has expired and needs to be renewed.

**To renew verification:**
1. Use the \`/verify\` command again
2. Re-confirm your 21+ status
3. Continue accessing cannabis content

*Annual renewal ensures ongoing compliance.*`;
                    break;

                case 'error':
                default:
                    content = `⚠️ **Verification Check Failed**

There was an error checking your age verification status.

**What to do:**
1. Try the command again in a few moments
2. If the problem persists, contact a moderator
3. You may need to re-verify your age

*Error Code: ${Date.now()}*`;
                    break;
            }

            const replyOptions = {
                content,
                flags: ephemeral ? MessageFlags.Ephemeral : undefined
            };

            if (interaction.replied || interaction.deferred) {
                await interaction.editReply(replyOptions);
            } else {
                await interaction.reply(replyOptions);
            }

        } catch (error) {
            console.error('Error handling verification failure response:', error);
            // Fallback response
            try {
                const fallbackContent = '🔞 **Cannabis content requires age verification (21+).** Use `/verify` to get started.';
                if (interaction.replied || interaction.deferred) {
                    await interaction.editReply({ 
                        content: fallbackContent,
                        flags: ephemeral ? MessageFlags.Ephemeral : undefined
                    });
                } else {
                    await interaction.reply({ 
                        content: fallbackContent,
                        flags: ephemeral ? MessageFlags.Ephemeral : undefined
                    });
                }
            } catch (fallbackError) {
                console.error('Failed to send fallback verification message:', fallbackError);
            }
        }
    }

    /**
     * Check if content requires age verification (cannabis-related)
     * @param {string} contentType - Type of content being accessed
     * @param {Object} metadata - Additional content metadata
     * @returns {boolean} - Whether content requires verification
     */
    static requiresVerification(contentType, metadata = {}) {
        const cannabisContentTypes = [
            'strain-info',
            'strain-guess',
            'cannabis-quiz',
            'cannabis-challenge',
            'cannabis-vote',
            'cannabis-discussion',
            'cultivation-guide',
            'product-review',
            'consumption-advice'
        ];

        // Check direct content type
        if (cannabisContentTypes.includes(contentType)) {
            return true;
        }

        // Check metadata for cannabis indicators
        if (metadata.category && metadata.category.toLowerCase().includes('cannabis')) {
            return true;
        }

        if (metadata.tags && metadata.tags.some(tag => 
            ['cannabis', 'marijuana', 'weed', 'strain', 'cultivation', 'growing'].includes(tag.toLowerCase())
        )) {
            return true;
        }

        // Check content for cannabis keywords (basic detection)
        if (metadata.content) {
            const cannabisKeywords = [
                'cannabis', 'marijuana', 'weed', 'strain', 'cultivation', 
                'growing', 'harvest', 'thc', 'cbd', 'terpene', 'cannabinoid'
            ];
            const contentLower = metadata.content.toLowerCase();
            if (cannabisKeywords.some(keyword => contentLower.includes(keyword))) {
                return true;
            }
        }

        return false;
    }

    /**
     * Create age verification check middleware for commands
     * @param {string} contentType - Type of content being protected
     * @returns {Function} - Middleware function
     */
    static createVerificationMiddleware(contentType) {
        return async (interaction, next) => {
            const verificationResult = await this.checkUserVerification(
                interaction.user.id,
                interaction.guild.id
            );

            if (!verificationResult.verified) {
                await this.handleVerificationFailure(interaction, verificationResult.reason);
                return false; // Stop execution
            }

            // Add user data to interaction for downstream use
            interaction.verifiedUser = verificationResult.user;
            
            if (typeof next === 'function') {
                return next();
            }
            
            return true; // Continue execution
        };
    }

    /**
     * Log age verification enforcement for audit purposes
     * @param {string} userId - Discord user ID
     * @param {string} guildId - Discord guild ID
     * @param {string} command - Command that was blocked
     * @param {string} reason - Reason for blocking
     * @returns {Promise<void>}
     */
    static async logVerificationEnforcement(userId, guildId, command, reason) {
        try {
            const { AuditLog } = require('../database/models/AuditLog');
            
            await AuditLog.create({
                user_id: userId,
                guild_id: guildId,
                action_type: 'age_verification_enforcement',
                target_type: 'command',
                target_id: command,
                details: {
                    enforcement_reason: reason,
                    blocked_command: command,
                    enforcement_timestamp: new Date().toISOString(),
                    compliance_action: 'cannabis_content_blocked'
                },
                metadata: {
                    user_agent: 'discord_bot',
                    compliance_version: '2024.1',
                    legal_basis: 'NJ Cannabis Regulation CRC 17:30'
                }
            });

            console.log(`🔞 Age verification enforcement logged: ${userId} blocked from ${command} (${reason})`);

        } catch (error) {
            console.error('Error logging verification enforcement:', error);
            // Non-critical error, don't throw
        }
    }
}

module.exports = { AgeVerificationHelper };