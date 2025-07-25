/**
 * Unban Command for GrowmiesNJ Discord Bot
 * 
 * Removes bans from users with cannabis compliance re-verification and tracking
 * Integrates with existing moderation service and comprehensive audit logging
 */

const { SlashCommandBuilder, PermissionFlagsBits, InteractionContextType } = require('discord.js');
const ModerationService = require('../../services/moderationService');
const { EmbedUtils, BRAND_COLORS } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Remove a ban from a user with cannabis compliance re-verification')
        .setContexts(InteractionContextType.Guild)
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to unban (must currently be banned)')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the unban (minimum 10 characters)')
                .setRequired(true)
                .setMinLength(10)
                .setMaxLength(1000)
        )
        .addBooleanOption(option =>
            option.setName('require_reverification')
                .setDescription('Require cannabis compliance re-verification upon return (default: true)')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('conditions')
                .setDescription('Special conditions or requirements for the unban')
                .setRequired(false)
                .setMaxLength(500)
        )
        .addBooleanOption(option =>
            option.setName('dm_user')
                .setDescription('Send a private message to the user about the unban (default: true)')
                .setRequired(false)
        ),

    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });

            const targetUser = interaction.options.getUser('user');
            const reason = interaction.options.getString('reason');
            const requireReverification = interaction.options.getBoolean('require_reverification') ?? true;
            const conditions = interaction.options.getString('conditions');
            const shouldDM = interaction.options.getBoolean('dm_user') ?? true;

            console.log(`🌿 Unban command executed by ${interaction.user.tag} targeting ${targetUser.tag}`);

            // Validate target user
            if (targetUser.id === interaction.user.id) {
                const errorEmbed = EmbedUtils.createErrorEmbed(
                    'Invalid Target',
                    'You cannot unban yourself. This should not be possible if you are executing commands.'
                );
                return await interaction.editReply({ embeds: [errorEmbed] });
            }

            if (targetUser.bot) {
                const errorEmbed = EmbedUtils.createErrorEmbed(
                    'Invalid Target',
                    'You cannot unban bot users. Bots do not require cannabis compliance unbanning procedures.'
                );
                return await interaction.editReply({ embeds: [errorEmbed] });
            }

            // Verify user is actually banned
            let banInfo = null;
            try {
                banInfo = await interaction.guild.bans.fetch(targetUser.id);
            } catch (error) {
                const errorEmbed = EmbedUtils.createErrorEmbed(
                    'User Not Banned',
                    'The specified user is not currently banned from this server.'
                );
                return await interaction.editReply({ embeds: [errorEmbed] });
            }

            // Get original ban information
            const originalBanReason = banInfo.reason || 'No reason provided';

            // Initialize moderation service to check for existing ban cases
            const moderationService = new ModerationService();

            // Look up existing ban cases for context
            let existingBanCases = [];
            try {
                // This would typically query the moderation service for ban cases
                // For now, we'll create a placeholder for the lookup
                console.log(`Looking up existing ban cases for user ${targetUser.id}`);
            } catch (error) {
                console.warn('Failed to lookup existing ban cases:', error.message);
            }

            // Apply Discord unban
            try {
                await interaction.guild.members.unban(targetUser.id, `${reason} | Moderator: ${interaction.user.tag}${conditions ? ` | Conditions: ${conditions}` : ''}`);
            } catch (unbanError) {
                console.error('Failed to unban user:', unbanError);
                const errorEmbed = EmbedUtils.createErrorEmbed(
                    'Unban Failed',
                    'Failed to unban the user. Please check that the bot has sufficient permissions and the user is actually banned.'
                );
                return await interaction.editReply({ embeds: [errorEmbed] });
            }

            // Prepare case data for the unban action
            const caseData = {
                guildId: interaction.guild.id,
                targetUserId: targetUser.id,
                moderatorId: interaction.user.id,
                actionType: 'UNBAN',
                reason: reason,
                conditions: conditions || null,
                originalBanReason: originalBanReason,
                requiresReverification: requireReverification,
                cannabisFlags: {
                    educationalViolation: false,
                    ageRelated: requireReverification, // Age verification required if re-verification needed
                    legalAreaViolation: false
                }
            };

            // Create moderation case using the service
            const result = await moderationService.createCase(
                caseData,
                interaction.guild,
                interaction.member
            );

            if (!result.success) {
                console.error('Failed to create moderation case after unban applied');
                // Unban was already applied, so we continue but log the issue
            }

            const moderationCase = result.case;
            const complianceFlags = result.cannabisCompliance;

            // Send DM to user about the unban
            let dmResult = null;
            if (shouldDM) {
                try {
                    const dmEmbed = {
                        color: BRAND_COLORS.SUCCESS,
                        title: '🎉 Your Ban Has Been Lifted - GrowmiesNJ',
                        description: `Your ban from **${interaction.guild.name}** has been removed. You may now rejoin the server.`,
                        fields: [
                            {
                                name: '📝 Unban Reason',
                                value: reason,
                                inline: false
                            },
                            {
                                name: '👮 Unbanned By',
                                value: interaction.user.tag,
                                inline: true
                            },
                            {
                                name: '📅 Date',
                                value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
                                inline: true
                            }
                        ],
                        footer: {
                            text: 'Welcome back! Please review community guidelines before rejoining.'
                        },
                        timestamp: new Date().toISOString()
                    };

                    // Add original ban information
                    if (originalBanReason && originalBanReason !== 'No reason provided') {
                        dmEmbed.fields.push({
                            name: '📋 Original Ban Reason',
                            value: originalBanReason,
                            inline: false
                        });
                    }

                    // Add conditions if specified
                    if (conditions) {
                        dmEmbed.fields.push({
                            name: '⚠️ Special Conditions',
                            value: conditions,
                            inline: false
                        });
                    }

                    // Add cannabis compliance re-verification requirements
                    if (requireReverification) {
                        dmEmbed.fields.push({
                            name: '🌿 Cannabis Compliance Re-Verification Required',
                            value: [
                                '🔞 **Age Verification:** You must re-verify you are 21+ years old',
                                '📚 **Community Guidelines:** Review updated cannabis community guidelines',
                                '⚖️ **Legal Compliance:** Acknowledge New Jersey cannabis laws and regulations',
                                '🎓 **Educational Focus:** Confirm understanding of educational-only discussions',
                                '🤝 **Respectful Participation:** Commit to respectful community engagement'
                            ].join('\n'),
                            inline: false
                        });

                        dmEmbed.fields.push({
                            name: '📋 Re-Verification Process',
                            value: [
                                '1. Rejoin the server using the invite link',
                                '2. Complete the age verification process in the verification channel',
                                '3. Read and acknowledge the updated community guidelines',
                                '4. Access will be restored once verification is complete',
                                '5. Contact staff if you experience any issues'
                            ].join('\n'),
                            inline: false
                        });
                    }

                    // Add community guidelines reminder
                    dmEmbed.fields.push({
                        name: '🌿 Community Guidelines Reminder',
                        value: [
                            '• Cannabis discussions are for educational purposes only',
                            '• All participants must be 21+ and verified',
                            '• No medical advice or commercial transactions',
                            '• Follow all New Jersey state laws and regulations',
                            '• Maintain respectful and responsible participation',
                            '• Report any violations to server staff immediately'
                        ].join('\n'),
                        inline: false
                    });

                    await targetUser.send({ embeds: [dmEmbed] });
                    dmResult = 'Message sent successfully';
                } catch (dmError) {
                    console.warn(`Failed to send DM to ${targetUser.tag}:`, dmError.message);
                    dmResult = 'Failed to send (DMs may be disabled)';
                }
            }

            // Create success embed with cannabis theming
            const successEmbed = {
                color: BRAND_COLORS.SUCCESS,
                title: '🎉 User Unbanned Successfully',
                description: `${targetUser.tag} has been unbanned from the server with cannabis compliance tracking.`,
                fields: [
                    {
                        name: '👤 Target User',
                        value: `${targetUser.tag} (${targetUser.id})`,
                        inline: true
                    },
                    {
                        name: '📋 Case Number',
                        value: moderationCase?.case_number || 'N/A',
                        inline: true
                    },
                    {
                        name: '🔄 Re-Verification Required',
                        value: requireReverification ? '✅ Yes' : '❌ No',
                        inline: true
                    },
                    {
                        name: '📝 Unban Reason',
                        value: reason,
                        inline: false
                    }
                ],
                footer: {
                    text: 'Growmies NJ Cannabis Community • Cannabis Compliance Tracking',
                    iconURL: interaction.guild.iconURL({ dynamic: true })
                },
                timestamp: new Date().toISOString()
            };

            // Add original ban information
            if (originalBanReason && originalBanReason !== 'No reason provided') {
                successEmbed.fields.push({
                    name: '📋 Original Ban Reason',
                    value: originalBanReason,
                    inline: false
                });
            }

            // Add conditions if specified
            if (conditions) {
                successEmbed.fields.push({
                    name: '⚠️ Special Conditions',
                    value: conditions,
                    inline: false
                });
            }

            // Add cannabis compliance information
            if (requireReverification) {
                successEmbed.fields.push({
                    name: '🌿 Cannabis Compliance Requirements',
                    value: [
                        '🔞 Age re-verification required upon return',
                        '📚 Community guidelines acknowledgment required',
                        '⚖️ Legal compliance confirmation required',
                        '🎓 Educational focus understanding required'
                    ].join('\n'),
                    inline: false
                });
            }

            // Add compliance flags if applicable
            if (complianceFlags?.ageRelated || complianceFlags?.educationalViolation || complianceFlags?.legalAreaViolation) {
                const complianceInfo = [];
                if (complianceFlags.ageRelated) complianceInfo.push('🔞 Age Re-Verification Required');
                if (complianceFlags.educationalViolation) complianceInfo.push('🎓 Educational Content Review Required');
                if (complianceFlags.legalAreaViolation) complianceInfo.push('⚖️ Legal Compliance Review Required');

                successEmbed.fields.push({
                    name: '🌿 Cannabis Compliance Flags',
                    value: complianceInfo.join('\n'),
                    inline: false
                });
            }

            // Add DM result
            if (shouldDM) {
                successEmbed.fields.push({
                    name: '📨 Direct Message',
                    value: dmResult,
                    inline: true
                });
            }

            // Add next steps information
            successEmbed.fields.push({
                name: '📋 Next Steps',
                value: [
                    '• User has been notified of the unban',
                    requireReverification ? '• User must complete re-verification process' : '• User may rejoin immediately',
                    '• Monitor for compliance with community guidelines',
                    '• Document any follow-up actions if needed'
                ].join('\n'),
                inline: false
            });

            await interaction.editReply({ embeds: [successEmbed] });

            console.log(`✅ Unban applied successfully - Case: ${moderationCase?.case_number || 'N/A'}, User: ${targetUser.tag}, Moderator: ${interaction.user.tag}, Re-verification: ${requireReverification}`);

        } catch (error) {
            console.error('❌ Error in unban command:', error);
            
            const errorEmbed = EmbedUtils.createErrorEmbed(
                'Unban Failed',
                error.message.includes('Missing required permissions') 
                    ? 'You do not have the required permissions to unban users.'
                    : 'An error occurred while unbanning the user. Please try again or contact an administrator.',
                'UNBAN_ERROR'
            );

            try {
                await interaction.editReply({ embeds: [errorEmbed] });
            } catch (followUpError) {
                console.error('❌ Failed to send unban error response:', followUpError);
            }
        }
    },
};