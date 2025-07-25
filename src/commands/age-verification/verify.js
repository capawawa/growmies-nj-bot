const { SlashCommandBuilder, InteractionContextType, MessageFlags } = require('discord.js');
const { User } = require('../../database/models/User');
const { AuditLog } = require('../../database/models/AuditLog');
const { WelcomeEmbeds } = require('../../utils/embeds');
const { RoleManagementService } = require('../../services/roleManagement');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Verify that you are 21+ years old to access cannabis community content')
        .setContexts(InteractionContextType.Guild)
        .setDefaultMemberPermissions(null), // Available to all members
    
    async execute(interaction) {
        try {
            // Always respond privately for age verification
            await interaction.deferReply({ ephemeral: true });
            
            const member = interaction.member;
            const guild = interaction.guild;
            
            // Check if user is already verified
            const verifiedRoleId = process.env.AGE_VERIFICATION_ROLE_ID;
            if (!verifiedRoleId) {
                await interaction.editReply({
                    content: '⚠️ Age verification system is not properly configured. Please contact an administrator.',
                    flags: MessageFlags.Ephemeral
                });
                return;
            }
            
            const verifiedRole = guild.roles.cache.get(verifiedRoleId);
            if (!verifiedRole) {
                await interaction.editReply({
                    content: '⚠️ Verification role not found. Please contact an administrator.',
                    flags: MessageFlags.Ephemeral
                });
                return;
            }
            
            // Check database verification status first
            let userRecord = null;
            try {
                userRecord = await User.findOne({
                    where: {
                        discord_id: interaction.user.id,
                        guild_id: guild.id,
                        is_active: true
                    }
                });
            } catch (dbError) {
                console.error('❌ Database error checking user verification:', dbError);
                // Continue with role-only check as fallback
            }

            // Check if user is verified in database OR has the Discord role
            const isVerifiedInDb = userRecord && userRecord.verification_status === 'verified';
            const hasDiscordRole = member.roles.cache.has(verifiedRoleId);

            if (isVerifiedInDb || hasDiscordRole) {
                // If verified in database but missing Discord role, try to assign it
                if (isVerifiedInDb && !hasDiscordRole) {
                    try {
                        await member.roles.add(verifiedRole, 'Database verification - role sync');
                        console.log(`🔄 Role synced for verified user ${interaction.user.tag}`);
                        
                        // Log role sync
                        await AuditLog.logRoleAssignment(
                            interaction.user.id,
                            guild.id,
                            'system',
                            [verifiedRoleId],
                            { reason: 'Database verification - role synchronization' }
                        );
                    } catch (roleError) {
                        console.error('❌ Failed to sync role for verified user:', roleError);
                    }
                }

                // If has role but not verified in database, create database record
                if (hasDiscordRole && !isVerifiedInDb) {
                    try {
                        await User.upsert({
                            discord_id: interaction.user.id,
                            guild_id: guild.id,
                            username: interaction.user.username,
                            display_name: interaction.user.displayName || interaction.user.globalName,
                            verification_status: 'verified',
                            verified_at: new Date(),
                            is_21_plus: true,
                            verification_method: 'role_sync',
                            birth_year: new Date().getFullYear() - 21, // Minimum birth year for 21+
                            verification_metadata: {
                                discord_tag: interaction.user.tag,
                                sync_timestamp: new Date().toISOString(),
                                source: 'existing_role'
                            }
                        });
                        console.log(`🔄 Database record created for existing verified user ${interaction.user.tag}`);
                    } catch (syncError) {
                        console.error('❌ Failed to sync database for verified user:', syncError);
                    }
                }

                await interaction.editReply({
                    content: '✅ **Already Verified**\n\nYou are already verified as 21+ years old and have access to cannabis community content.\n\n*Your verification status is synchronized across our systems.*',
                    flags: MessageFlags.Ephemeral
                });
                return;
            }

            // Check if user was rejected or has too many attempts
            if (userRecord) {
                if (userRecord.verification_status === 'rejected') {
                    await interaction.editReply({
                        content: '🚫 **Verification Previously Denied**\n\nYou previously indicated you are under 21 years old. You must be 21+ to access cannabis content.\n\nIf this was an error, please contact an administrator.',
                        flags: MessageFlags.Ephemeral
                    });
                    return;
                }

                if (!userRecord.canAttemptVerification()) {
                    const hoursRemaining = Math.ceil((24 - ((new Date() - userRecord.last_attempt_at) / (1000 * 60 * 60))));
                    await interaction.editReply({
                        content: `⏱️ **Rate Limit Exceeded**\n\nYou have attempted verification too many times. Please wait ${hoursRemaining} hours before trying again.\n\nIf you need assistance, please contact an administrator.`,
                        flags: MessageFlags.Ephemeral
                    });
                    return;
                }
            }
            
            // Enhanced age verification confirmation using our embed templates
            const verificationEmbed = WelcomeEmbeds.createEnhancedVerificationEmbed();
            
            const verificationButtons = {
                type: 1, // Action Row
                components: [
                    {
                        type: 2, // Button
                        style: 3, // Success (Green)
                        label: '✅ I Verify - I am 21+',
                        custom_id: 'age_verify_confirm',
                        emoji: '🌿'
                    },
                    {
                        type: 2, // Button
                        style: 4, // Danger (Red)
                        label: '❌ Under 21',
                        custom_id: 'age_verify_deny',
                        emoji: '🚫'
                    }
                ]
            };
            
            await interaction.editReply({
                embeds: [verificationEmbed],
                components: [verificationButtons],
                flags: MessageFlags.Ephemeral
            });
            
            // Log verification attempt (without personal info)
            console.log(`🔒 Age verification initiated by user ${interaction.user.tag} (${interaction.user.id}) in guild ${guild.name}`);
            
        } catch (error) {
            console.error('❌ Error in verify command:', error);
            
            const errorResponse = {
                content: '⚠️ An error occurred during verification. Please try again or contact an administrator.',
                flags: MessageFlags.Ephemeral
            };
            
            try {
                if (interaction.deferred) {
                    await interaction.editReply(errorResponse);
                } else {
                    await interaction.reply(errorResponse);
                }
            } catch (followUpError) {
                console.error('❌ Failed to send error response:', followUpError);
            }
        }
    },
};