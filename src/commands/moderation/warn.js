/**
 * Warn Command for GrowmiesNJ Discord Bot
 * 
 * Issues warnings to users with cannabis compliance tracking and educational approach
 * Integrates with existing moderation service and audit logging for regulatory compliance
 */

const { SlashCommandBuilder, PermissionFlagsBits, InteractionContextType } = require('discord.js');
const ModerationService = require('../../services/moderationService');
const { EmbedUtils, BRAND_COLORS } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Issue a warning to a user with cannabis compliance tracking')
        .setContexts(InteractionContextType.Guild)
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to warn')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the warning (minimum 10 characters)')
                .setRequired(true)
                .setMinLength(10)
                .setMaxLength(1000)
        )
        .addBooleanOption(option =>
            option.setName('educational')
                .setDescription('Mark as educational violation (cannabis content guidelines)')
                .setRequired(false)
        )
        .addBooleanOption(option =>
            option.setName('dm_user')
                .setDescription('Send a private message to the user about the warning (default: true)')
                .setRequired(false)
        ),

    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });

            const targetUser = interaction.options.getUser('user');
            const reason = interaction.options.getString('reason');
            const isEducational = interaction.options.getBoolean('educational') ?? false;
            const shouldDM = interaction.options.getBoolean('dm_user') ?? true;

            console.log(`🌿 Warn command executed by ${interaction.user.tag} targeting ${targetUser.tag}`);

            // Validate target user
            if (targetUser.id === interaction.user.id) {
                const errorEmbed = EmbedUtils.createErrorEmbed(
                    'Invalid Target',
                    'You cannot warn yourself. Please contact another moderator if you need assistance.'
                );
                return await interaction.editReply({ embeds: [errorEmbed] });
            }

            if (targetUser.bot) {
                const errorEmbed = EmbedUtils.createErrorEmbed(
                    'Invalid Target', 
                    'You cannot warn bot users. Bots do not require cannabis compliance warnings.'
                );
                return await interaction.editReply({ embeds: [errorEmbed] });
            }

            // Get target member to check permissions
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

            // Prevent warning users with higher or equal permissions
            if (targetMember.roles.highest.position >= interaction.member.roles.highest.position) {
                const errorEmbed = EmbedUtils.createErrorEmbed(
                    'Insufficient Permissions',
                    'You cannot warn users with equal or higher permissions than yourself.'
                );
                return await interaction.editReply({ embeds: [errorEmbed] });
            }

            // Initialize moderation service
            const moderationService = new ModerationService();

            // Prepare case data with cannabis compliance flags
            const caseData = {
                guildId: interaction.guild.id,
                targetUserId: targetUser.id,
                moderatorId: interaction.user.id,
                actionType: isEducational ? 'EDUCATIONAL_WARNING' : 'WARN',
                reason: reason,
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
                throw new Error('Failed to create moderation case');
            }

            const moderationCase = result.case;
            const complianceFlags = result.cannabisCompliance;

            // Create success embed with cannabis theming
            const successEmbed = {
                color: BRAND_COLORS.SUCCESS,
                title: '⚠️ Warning Issued Successfully',
                description: `Warning issued to ${targetUser.tag} with cannabis compliance tracking.`,
                fields: [
                    {
                        name: '👤 Target User',
                        value: `${targetUser.tag} (${targetUser.id})`,
                        inline: true
                    },
                    {
                        name: '📋 Case Number',
                        value: moderationCase.case_number,
                        inline: true
                    },
                    {
                        name: '⚖️ Action Type',
                        value: isEducational ? '🎓 Educational Warning' : '⚠️ Standard Warning',
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

            // Add cannabis compliance information if applicable
            if (complianceFlags.ageRelated || complianceFlags.educationalViolation || complianceFlags.legalAreaViolation) {
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

            // Send DM to user if requested
            let dmResult = null;
            if (shouldDM) {
                try {
                    const dmEmbed = {
                        color: BRAND_COLORS.WARNING,
                        title: '⚠️ Warning Received - GrowmiesNJ',
                        description: `You have received a ${isEducational ? 'educational' : 'standard'} warning in **${interaction.guild.name}**.`,
                        fields: [
                            {
                                name: '📝 Reason',
                                value: reason,
                                inline: false
                            },
                            {
                                name: '📋 Case Number',
                                value: moderationCase.case_number,
                                inline: true
                            },
                            {
                                name: '👮 Issued By',
                                value: interaction.user.tag,
                                inline: true
                            }
                        ],
                        footer: {
                            text: 'This is an automated message. If you believe this warning was issued in error, please contact server staff.'
                        },
                        timestamp: new Date().toISOString()
                    };

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

                successEmbed.fields.push({
                    name: '📨 Direct Message',
                    value: dmResult,
                    inline: true
                });
            }

            await interaction.editReply({ embeds: [successEmbed] });

            console.log(`✅ Warning issued successfully - Case: ${moderationCase.case_number}, User: ${targetUser.tag}, Moderator: ${interaction.user.tag}`);

        } catch (error) {
            console.error('❌ Error in warn command:', error);
            
            const errorEmbed = EmbedUtils.createErrorEmbed(
                'Warning Failed',
                error.message.includes('Missing required permissions') 
                    ? 'You do not have the required permissions to issue warnings.'
                    : 'An error occurred while issuing the warning. Please try again or contact an administrator.',
                'WARN_ERROR'
            );

            try {
                await interaction.editReply({ embeds: [errorEmbed] });
            } catch (followUpError) {
                console.error('❌ Failed to send warn error response:', followUpError);
            }
        }
    },
};