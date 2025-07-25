/**
 * Guild Member Add Event Handler for GrowmiesNJ Discord Bot
 * 
 * Enhanced Welcome System - Sends welcome messages with rich embeds
 * Handles new member onboarding with cannabis compliance messaging
 */

const { Events } = require('discord.js');
const { WelcomeEmbeds, EmbedUtils } = require('../utils/embeds');
const { RoleManagementService } = require('../services/roleManagement');
const { User } = require('../database/models/User');
const { AuditLog } = require('../database/models/AuditLog');

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        try {
            console.log(`👋 New member joined: ${member.user.tag} (${member.user.id}) in ${member.guild.name}`);
            
            // Initialize services
            const roleManager = new RoleManagementService();

            // Log member join for audit trail
            await AuditLog.create({
                action: 'member_join',
                target_user_id: member.user.id,
                guild_id: member.guild.id,
                moderator_id: null, // System action
                reason: 'New member joined server',
                metadata: {
                    username: member.user.username,
                    tag: member.user.tag,
                    account_created: member.user.createdAt,
                    join_timestamp: new Date().toISOString(),
                    member_count: member.guild.memberCount
                }
            });

            // Check if user is returning member (database record exists)
            const existingUser = await User.findOne({
                where: {
                    discord_id: member.user.id,
                    guild_id: member.guild.id
                }
            });

            if (existingUser && existingUser.verification_status === 'verified') {
                await handleReturningVerifiedMember(member, existingUser, roleManager);
            } else {
                await handleNewMember(member);
            }

            // Send welcome message to welcome channel
            await sendWelcomeChannelMessage(member);

            // Send DM welcome message (optional)
            await sendDirectMessage(member);

            console.log(`✅ Welcome process completed for ${member.user.tag}`);

        } catch (error) {
            console.error(`❌ Error in guildMemberAdd for ${member.user.tag}:`, error);
            
            // Log error for debugging
            try {
                await AuditLog.create({
                    action: 'welcome_error',
                    target_user_id: member.user.id,
                    guild_id: member.guild.id,
                    moderator_id: null,
                    reason: 'Error during welcome process',
                    metadata: {
                        error_message: error.message,
                        error_stack: error.stack,
                        timestamp: new Date().toISOString()
                    }
                });
            } catch (logError) {
                console.error('❌ Failed to log welcome error:', logError);
            }
        }
    }
};

/**
 * Handle returning verified member - restore roles and send returning member message
 * @param {GuildMember} member - Discord guild member
 * @param {User} existingUser - Existing user record from database
 * @param {RoleManagementService} roleManager - Role management service instance
 */
async function handleReturningVerifiedMember(member, existingUser, roleManager) {
    try {
        console.log(`🔄 Handling returning verified member: ${member.user.tag}`);

        // Restore verification roles based on database record
        const roleResult = await roleManager.assignVerificationRoles(
            member, 
            member.guild, 
            existingUser
        );

        if (roleResult.success) {
            console.log(`✅ Restored roles for returning member ${member.user.tag}: ${roleResult.assignedRoles.join(', ')}`);
            
            // Update last activity
            await existingUser.update({
                last_activity_at: new Date(),
                username: member.user.username,
                display_name: member.user.displayName || member.user.globalName
            });

            // Send returning member welcome message to appropriate channel
            const welcomeChannel = await findWelcomeChannel(member.guild);
            if (welcomeChannel) {
                const returningEmbed = EmbedUtils.createSuccessEmbed(
                    'Welcome Back!',
                    `Hey ${member.displayName || member.user.username}! 👋\n\n` +
                    `Welcome back to **${member.guild.name}**! Your verification status has been ` +
                    `restored and you have access to all your previous areas.\n\n` +
                    `**Restored Access:**\n${roleResult.assignedRoles.map(role => `• ${role}`).join('\n')}\n\n` +
                    `Feel free to jump back into the conversations you left off! 🌿`
                );

                await welcomeChannel.send({ 
                    content: `<@${member.user.id}>`,
                    embeds: [returningEmbed] 
                });
            }

        } else {
            console.error(`❌ Failed to restore roles for ${member.user.tag}`);
            
            // Send error message to welcome channel
            const welcomeChannel = await findWelcomeChannel(member.guild);
            if (welcomeChannel) {
                const errorEmbed = EmbedUtils.createWarningEmbed(
                    'Welcome Back - Manual Review Required',
                    `Welcome back ${member.displayName || member.user.username}!\n\n` +
                    `Your previous verification status was found, but there was an issue restoring ` +
                    `your roles automatically. A moderator will review your access shortly.\n\n` +
                    `**Previous Status:** Verified Member\n` +
                    `**Action Required:** Manual role restoration\n\n` +
                    `Please contact a moderator if this isn't resolved within 24 hours.`
                );

                await welcomeChannel.send({ 
                    content: `<@${member.user.id}>`,
                    embeds: [errorEmbed] 
                });
            }
        }

    } catch (error) {
        console.error('❌ Error handling returning verified member:', error);
        throw error;
    }
}

/**
 * Handle new member - send standard welcome message
 * @param {GuildMember} member - Discord guild member
 */
async function handleNewMember(member) {
    try {
        console.log(`🆕 Handling new member: ${member.user.tag}`);

        // Create initial user record if it doesn't exist
        await User.findOrCreate({
            where: {
                discord_id: member.user.id,
                guild_id: member.guild.id
            },
            defaults: {
                username: member.user.username,
                display_name: member.user.displayName || member.user.globalName,
                verification_status: 'pending',
                is_21_plus: false,
                is_active: true,
                verification_metadata: {
                    join_date: new Date().toISOString(),
                    discord_tag: member.user.tag,
                    account_age_days: Math.floor((new Date() - member.user.createdAt) / (1000 * 60 * 60 * 24))
                }
            }
        });

        console.log(`📝 User record created for new member ${member.user.tag}`);

    } catch (error) {
        console.error('❌ Error handling new member:', error);
        throw error;
    }
}

/**
 * Send welcome message to the welcome channel
 * @param {GuildMember} member - Discord guild member
 */
async function sendWelcomeChannelMessage(member) {
    try {
        const welcomeChannel = await findWelcomeChannel(member.guild);
        if (!welcomeChannel) {
            console.warn('⚠️ Welcome channel not found - skipping channel welcome message');
            return;
        }

        console.log(`📢 Sending welcome message to ${welcomeChannel.name} for ${member.user.tag}`);

        // Create welcome embed
        const welcomeEmbed = WelcomeEmbeds.createWelcomeEmbed(member, member.guild);

        // Send welcome message with member mention
        await welcomeChannel.send({
            content: `🌿 Welcome to the community, <@${member.user.id}>! 🌱`,
            embeds: [welcomeEmbed]
        });

        // Add reaction for engagement
        const sentMessage = await welcomeChannel.messages.fetch({ limit: 1 });
        const welcomeMessage = sentMessage.first();
        if (welcomeMessage && welcomeMessage.author.id === member.guild.members.me.id) {
            try {
                await welcomeMessage.react('🌿');
                await welcomeMessage.react('👋');
            } catch (reactionError) {
                console.warn('⚠️ Failed to add reactions to welcome message:', reactionError);
            }
        }

        console.log(`✅ Welcome message sent to ${welcomeChannel.name}`);

    } catch (error) {
        console.error('❌ Error sending welcome channel message:', error);
        throw error;
    }
}

/**
 * Send direct message welcome to the new member
 * @param {GuildMember} member - Discord guild member
 */
async function sendDirectMessage(member) {
    try {
        console.log(`📨 Attempting to send DM welcome to ${member.user.tag}`);

        // Create DM-specific welcome embed
        const dmEmbed = WelcomeEmbeds.createVerificationInstructionsEmbed(member.guild)
            .setTitle('🌿 Welcome to Growmies NJ!')
            .setDescription(
                `Hello ${member.displayName || member.user.username}!\n\n` +
                `Thank you for joining **${member.guild.name}** - New Jersey's premier cannabis community! 🌱\n\n` +
                `**To get started and access all our cannabis education and discussion areas:**\n\n` +
                `🔞 **Age Verification Required**\n` +
                `• Use the \`/verify\` command in any channel\n` +
                `• Must be 21+ for cannabis consumption discussions\n` +
                `• 18+ for general cannabis education\n\n` +
                `**Why verification is required:**\n` +
                `• New Jersey law requires 21+ for cannabis discussions\n` +
                `• Ensures community safety and legal compliance\n` +
                `• Discord Terms of Service requirements\n\n` +
                `Welcome to the community! 🌿`
            );

        // Attempt to send DM
        await member.send({ embeds: [dmEmbed] });
        console.log(`✅ DM welcome sent to ${member.user.tag}`);

        // Log successful DM
        await AuditLog.create({
            action: 'welcome_dm_sent',
            target_user_id: member.user.id,
            guild_id: member.guild.id,
            moderator_id: null,
            reason: 'Welcome DM sent successfully',
            metadata: {
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        // DM failures are common (user privacy settings) - log but don't throw
        console.warn(`⚠️ Could not send DM welcome to ${member.user.tag}:`, error.message);
        
        // Log DM failure for analytics
        try {
            await AuditLog.create({
                action: 'welcome_dm_failed',
                target_user_id: member.user.id,
                guild_id: member.guild.id,
                moderator_id: null,
                reason: 'Welcome DM failed - likely privacy settings',
                metadata: {
                    error_message: error.message,
                    timestamp: new Date().toISOString()
                }
            });
        } catch (logError) {
            console.error('❌ Failed to log DM failure:', logError);
        }
    }
}

/**
 * Find the welcome channel in the guild
 * @param {Guild} guild - Discord guild
 * @returns {Promise<TextChannel|null>} - Welcome channel or null if not found
 */
async function findWelcomeChannel(guild) {
    try {
        // Try multiple common welcome channel names
        const welcomeChannelNames = [
            'welcome',
            'general',
            'lobby',
            'introductions',
            'new-members',
            'welcome-zone'
        ];

        // First try to find by exact name match
        for (const channelName of welcomeChannelNames) {
            const channel = guild.channels.cache.find(ch => 
                ch.name.toLowerCase() === channelName && ch.isTextBased()
            );
            if (channel) {
                console.log(`📍 Found welcome channel: ${channel.name}`);
                return channel;
            }
        }

        // Try to find by partial name match
        for (const channelName of welcomeChannelNames) {
            const channel = guild.channels.cache.find(ch => 
                ch.name.toLowerCase().includes(channelName) && ch.isTextBased()
            );
            if (channel) {
                console.log(`📍 Found welcome channel by partial match: ${channel.name}`);
                return channel;
            }
        }

        // Fallback to system channel if set
        if (guild.systemChannel) {
            console.log(`📍 Using system channel as fallback: ${guild.systemChannel.name}`);
            return guild.systemChannel;
        }

        // Last resort - use first text channel where bot can send messages
        const firstTextChannel = guild.channels.cache.find(ch => 
            ch.isTextBased() && 
            ch.permissionsFor(guild.members.me).has(['SendMessages', 'EmbedLinks'])
        );

        if (firstTextChannel) {
            console.log(`📍 Using first available text channel: ${firstTextChannel.name}`);
            return firstTextChannel;
        }

        console.warn('⚠️ No suitable welcome channel found');
        return null;

    } catch (error) {
        console.error('❌ Error finding welcome channel:', error);
        return null;
    }
}