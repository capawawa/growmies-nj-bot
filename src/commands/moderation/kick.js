/**
 * Kick Command for GrowmiesNJ Discord Bot
 * 
 * Removes users from the server with cannabis compliance tracking and evidence preservation
 * Integrates with existing moderation service and comprehensive audit logging
 */

const { SlashCommandBuilder, PermissionFlagsBits, InteractionContextType } = require('discord.js');
const ModerationService = require('../../services/moderationService');
const { EmbedUtils, BRAND_COLORS } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Remove a user from the server with cannabis compliance tracking')
        .setContexts(InteractionContextType.Guild)
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to kick from the server')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the kick (minimum 10 characters)')
                .setRequired(true)
                .setMinLength(10)
                .setMaxLength(1000)
        )
        .addStringOption(option =>
            option.setName('evidence')
                .setDescription('Additional evidence or context (URLs, message IDs, etc.)')
                .setRequired(false)
                .setMaxLength(500)
        )
        .addBooleanOption(option =>
            option.setName('educational')
                .setDescription('Mark as educational violation (cannabis content guidelines)')
                .setRequired(false)
        )
        .addBooleanOption(option =>
            option.setName('dm_user')
                .setDescription('Send a private message to the user about the kick (default: true)')
                .setRequired(false)
        ),

    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });

            const targetUser = interaction.options.getUser('user');
            const reason = interaction.options.getString('reason');
            const evidence = interaction.options.getString('evidence');
            const isEducational = interaction.options.getBoolean('educational') ?? false;
            const shouldDM = interaction.options.getBoolean('dm_user') ?? true;

            console.log(`🌿 Kick command executed by ${interaction.user.tag} targeting ${targetUser.tag}`);

            // Validate target user
            if (targetUser.id === interaction.user.id) {
                const errorEmbed = EmbedUtils.createErrorEmbed(
                    'Invalid Target',
                    'You cannot kick yourself. Please contact another moderator if you need assistance.'
                );
                return await interaction.editReply({ embeds: [errorEmbed] });
            }

            if (targetUser.bot) {
                const errorEmbed = EmbedUtils.createErrorEmbed(
                    'Invalid Target',
                    'You cannot kick bot users. Please use proper bot management procedures.'
                );
                return await interaction.editReply({ embeds: [errorEmbed] });
            }

            // Get target member to check permissions and gather user data
            let targetMember;
            try {
                targetMember = await interaction.guild.members.fetch(targetUser.id);
            } catch (error) {
                const errorEmbed = EmbedUtils.createErrorEmbed(
                    'User Not Found',
                    'The specified user is not a member of this server.'
                );
                return await interaction.editReply({ embeds: [errorEmbed] });
            }

            // Prevent kicking users with higher or equal permissions
            if (targetMember.roles.highest.position >= interaction.member.roles.highest.position) {
                const errorEmbed = EmbedUtils.createErrorEmbed(
                    'Insufficient Permissions',
                    'You cannot kick users with equal or higher permissions than yourself.'
                );
                return await interaction.editReply({ embeds: [errorEmbed] });
            }

            // Check if target is the server owner
            if (targetUser.id === interaction.guild.ownerId) {
                const errorEmbed = EmbedUtils.createErrorEmbed(
                    'Cannot Kick Owner',
                    'You cannot kick the server owner.'
                );
                return await interaction.editReply({ embeds: [errorEmbed] });
            }

            // Gather user evidence for tracking
            const userEvidence = {
                username: targetUser.username,
                discriminator: targetUser.discriminator,
                displayName: targetMember.displayName,
                avatarURL: targetUser.displayAvatarURL({ dynamic: true }),
                joinedAt: targetMember.joinedAt,
                accountCreated: targetUser.createdAt,
                roles: targetMember.roles.cache.map(role => ({
                    id: role.id,
                    name: role.name,
                    position: role.position
                })).filter(role => role.name !== '@everyone'),
                permissions: targetMember.permissions.toArray(),
                nickname: targetMember.nickname,
                premiumSince: targetMember.premiumSince
            };

            // Send DM before kicking (if requested)
            let dmResult = null;
            if (shouldDM) {
                try {
                    const dmEmbed = {
                        color: BRAND_COLORS.ERROR,
                        title: '🚪 You Have Been Kicked - GrowmiesNJ',
                        description: `You have been kicked from **${interaction.guild.name}**.`,
                        fields: [
                            {
                                name: '📝 Reason',
                                value: reason,
                                inline: false
                            },
                            {
                                name: '👮 Kicked By',
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
                            text: 'You may rejoin the server if you wish to follow community guidelines.'
                        },
                        timestamp: new Date().toISOString()
                    };

                    // Add evidence if provided
                    if (evidence) {
                        dmEmbed.fields.push({
                            name: '📋 Evidence/Context',
                            value: evidence,
                            inline: false
                        });
                    }

                    // Add educational note for cannabis compliance
                    if (isEducational) {
                        dmEmbed.fields.push({
                            name: '🌿 Cannabis Community Guidelines',
                            value: [
                                '• Cannabis discussions are for educational purposes only',
                                '• All participants must be 21+ and verified',
                                '• No medical advice or commercial transactions',
                                '• Follow all New Jersey state laws and regulations',
                                '• Respectful and responsible community participation'
                            ].join('\n'),
                            inline: false
                        });
                    }

                    await targetUser.send({ embeds: [dmEmbed] });
                    dmResult = 'Message sent successfully';
                } catch (dmError) {
                    console.warn(`Failed to send DM to ${targetUser.tag}:`, dmError.message);
                    dmResult = 'Failed to send (DMs may be disabled)';
                }
            }

            // Apply Discord kick
            try {
                await targetMember.kick(`${reason} | Moderator: ${interaction.user.tag}${evidence ? ` | Evidence: ${evidence}` : ''}`);
            } catch (kickError) {
                console.error('Failed to kick user:', kickError);
                const errorEmbed = EmbedUtils.createErrorEmbed(
                    'Kick Failed',
                    'Failed to kick the user. Please check that the bot has sufficient permissions and the user is still in the server.'
                );
                return await interaction.editReply({ embeds: [errorEmbed] });
            }

            // Initialize moderation service
            const moderationService = new ModerationService();

            // Prepare case data with cannabis compliance flags and evidence
            const caseData = {
                guildId: interaction.guild.id,
                targetUserId: targetUser.id,
                moderatorId: interaction.user.id,
                actionType: isEducational ? 'EDUCATIONAL_KICK' : 'KICK',
                reason: reason,
                evidence: evidence || null,
                userEvidence: JSON.stringify(userEvidence),
                cannabisFlags: {
                    educationalViolation: isEducational,
                    ageRelated: false, // Will be auto-detected by service
                    legalAreaViolation: false // Will be auto-detected by service
                }
            };

            // Create moderation case using the service
            const result = await moderationService.createCase(
                caseData,
                interaction.guild,
                interaction.member
            );

            if (!result.success) {
                console.error('Failed to create moderation case after kick applied');
                // Kick was already applied, so we continue but log the issue
            }

            const moderationCase = result.case;
            const complianceFlags = result.cannabisCompliance;

            // Create success embed with cannabis theming
            const successEmbed = {
                color: BRAND_COLORS.ERROR,
                title: '🚪 User Kicked Successfully',
                description: `${targetUser.tag} has been kicked from the server with cannabis compliance tracking.`,
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
                        name: '⚖️ Action Type',
                        value: isEducational ? '🎓 Educational Kick' : '🚪 Standard Kick',
                        inline: true
                    },
                    {
                        name: '📝 Reason',
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

            // Add evidence if provided
            if (evidence) {
                successEmbed.fields.push({
                    name: '📋 Evidence/Context',
                    value: evidence,
                    inline: false
                });
            }

            // Add user evidence summary
            const evidenceSummary = [
                `**Account Created:** <t:${Math.floor(userEvidence.accountCreated.getTime() / 1000)}:R>`,
                `**Joined Server:** <t:${Math.floor(userEvidence.joinedAt.getTime() / 1000)}:R>`,
                `**Roles:** ${userEvidence.roles.length > 0 ? userEvidence.roles.map(r => r.name).join(', ') : 'None'}`,
                `**Nickname:** ${userEvidence.nickname || 'None'}`
            ];

            successEmbed.fields.push({
                name: '👤 User Evidence Preserved',
                value: evidenceSummary.join('\n'),
                inline: false
            });

            // Add cannabis compliance information if applicable
            if (complianceFlags?.ageRelated || complianceFlags?.educationalViolation || complianceFlags?.legalAreaViolation) {
                const complianceInfo = [];
                if (complianceFlags.ageRelated) complianceInfo.push('🔞 Age Verification Required');
                if (complianceFlags.educationalViolation) complianceInfo.push('🎓 Educational Content Violation');
                if (complianceFlags.legalAreaViolation) complianceInfo.push('⚖️ Legal Area Violation');

                successEmbed.fields.push({
                    name: '🌿 Cannabis Compliance Flags',
                    value: complianceInfo.join('\n'),
                    inline: false
                });
            }

            // Add DM result if attempted
            if (shouldDM) {
                successEmbed.fields.push({
                    name: '📨 Direct Message',
                    value: dmResult,
                    inline: true
                });
            }

            await interaction.editReply({ embeds: [successEmbed] });

            console.log(`✅ Kick applied successfully - Case: ${moderationCase?.case_number || 'N/A'}, User: ${targetUser.tag}, Moderator: ${interaction.user.tag}`);

        } catch (error) {
            console.error('❌ Error in kick command:', error);
            
            const errorEmbed = EmbedUtils.createErrorEmbed(
                'Kick Failed',
                error.message.includes('Missing required permissions') 
                    ? 'You do not have the required permissions to kick users.'
                    : 'An error occurred while kicking the user. Please try again or contact an administrator.',
                'KICK_ERROR'
            );

            try {
                await interaction.editReply({ embeds: [errorEmbed] });
            } catch (followUpError) {
                console.error('❌ Failed to send kick error response:', followUpError);
            }
        }
    },
};