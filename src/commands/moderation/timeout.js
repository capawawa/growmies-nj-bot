/**
 * Timeout Command for GrowmiesNJ Discord Bot
 * 
 * Temporarily restricts users with cannabis compliance tracking and duration parsing
 * Integrates with existing moderation service and Discord timeout functionality
 */

const { SlashCommandBuilder, PermissionFlagsBits, InteractionContextType } = require('discord.js');
const ModerationService = require('../../services/moderationService');
const { EmbedUtils, BRAND_COLORS } = require('../../utils/embeds');

// Duration parsing utility
function parseDuration(durationString) {
    const regex = /^(\d+)([smhd])$/i;
    const match = durationString.match(regex);
    
    if (!match) {
        return null;
    }
    
    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    
    const multipliers = {
        's': 1000,           // seconds
        'm': 60 * 1000,      // minutes
        'h': 60 * 60 * 1000, // hours
        'd': 24 * 60 * 60 * 1000 // days
    };
    
    const milliseconds = value * multipliers[unit];
    
    // Discord timeout limits: minimum 1 second, maximum 28 days
    if (milliseconds < 1000 || milliseconds > 28 * 24 * 60 * 60 * 1000) {
        return null;
    }
    
    return {
        milliseconds,
        value,
        unit,
        readable: `${value}${unit}`
    };
}

// Format duration for display
function formatDuration(duration) {
    const units = {
        's': 'second',
        'm': 'minute', 
        'h': 'hour',
        'd': 'day'
    };
    
    const unitName = units[duration.unit];
    return `${duration.value} ${unitName}${duration.value > 1 ? 's' : ''}`;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('Temporarily restrict a user with cannabis compliance tracking')
        .setContexts(InteractionContextType.Guild)
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to timeout')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('duration')
                .setDescription('Timeout duration (e.g., 10m, 2h, 1d) - Max 28 days')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the timeout (minimum 10 characters)')
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
                .setDescription('Send a private message to the user about the timeout (default: true)')
                .setRequired(false)
        ),

    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });

            const targetUser = interaction.options.getUser('user');
            const durationInput = interaction.options.getString('duration');
            const reason = interaction.options.getString('reason');
            const isEducational = interaction.options.getBoolean('educational') ?? false;
            const shouldDM = interaction.options.getBoolean('dm_user') ?? true;

            console.log(`🌿 Timeout command executed by ${interaction.user.tag} targeting ${targetUser.tag}`);

            // Parse duration
            const duration = parseDuration(durationInput);
            if (!duration) {
                const errorEmbed = EmbedUtils.createErrorEmbed(
                    'Invalid Duration',
                    [
                        'Please use a valid duration format:',
                        '• **10s** - 10 seconds',
                        '• **30m** - 30 minutes', 
                        '• **2h** - 2 hours',
                        '• **1d** - 1 day',
                        '',
                        'Maximum duration: 28 days'
                    ].join('\n')
                );
                return await interaction.editReply({ embeds: [errorEmbed] });
            }

            // Validate target user
            if (targetUser.id === interaction.user.id) {
                const errorEmbed = EmbedUtils.createErrorEmbed(
                    'Invalid Target',
                    'You cannot timeout yourself. Please contact another moderator if you need assistance.'
                );
                return await interaction.editReply({ embeds: [errorEmbed] });
            }

            if (targetUser.bot) {
                const errorEmbed = EmbedUtils.createErrorEmbed(
                    'Invalid Target',
                    'You cannot timeout bot users. Bots do not require cannabis compliance timeouts.'
                );
                return await interaction.editReply({ embeds: [errorEmbed] });
            }

            // Get target member to check permissions and apply timeout
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

            // Prevent timing out users with higher or equal permissions
            if (targetMember.roles.highest.position >= interaction.member.roles.highest.position) {
                const errorEmbed = EmbedUtils.createErrorEmbed(
                    'Insufficient Permissions',
                    'You cannot timeout users with equal or higher permissions than yourself.'
                );
                return await interaction.editReply({ embeds: [errorEmbed] });
            }

            // Check if user is already timed out
            if (targetMember.communicationDisabledUntil && targetMember.communicationDisabledUntil > new Date()) {
                const currentTimeout = new Date(targetMember.communicationDisabledUntil);
                const errorEmbed = EmbedUtils.createErrorEmbed(
                    'User Already Timed Out',
                    `This user is already timed out until <t:${Math.floor(currentTimeout.getTime() / 1000)}:F>. Remove the existing timeout first if you need to apply a new one.`
                );
                return await interaction.editReply({ embeds: [errorEmbed] });
            }

            // Calculate timeout end time
            const timeoutUntil = new Date(Date.now() + duration.milliseconds);

            // Apply Discord timeout first
            try {
                await targetMember.timeout(duration.milliseconds, `${reason} | Moderator: ${interaction.user.tag}`);
            } catch (timeoutError) {
                console.error('Failed to apply Discord timeout:', timeoutError);
                const errorEmbed = EmbedUtils.createErrorEmbed(
                    'Timeout Failed',
                    'Failed to apply Discord timeout. Please check that the bot has sufficient permissions.'
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
                actionType: isEducational ? 'EDUCATIONAL_TIMEOUT' : 'TIMEOUT',
                reason: reason,
                duration: duration.milliseconds,
                expiresAt: timeoutUntil,
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
                console.error('Failed to create moderation case after timeout applied');
                // Timeout was already applied, so we continue but log the issue
            }

            const moderationCase = result.case;
            const complianceFlags = result.cannabisCompliance;

            // Create success embed with cannabis theming
            const successEmbed = {
                color: BRAND_COLORS.WARNING,
                title: '⏰ Timeout Applied Successfully',
                description: `${targetUser.tag} has been timed out for ${formatDuration(duration)} with cannabis compliance tracking.`,
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
                        name: '⏱️ Duration',
                        value: formatDuration(duration),
                        inline: true
                    },
                    {
                        name: '⚖️ Action Type',
                        value: isEducational ? '🎓 Educational Timeout' : '⏰ Standard Timeout',
                        inline: true
                    },
                    {
                        name: '📅 Expires',
                        value: `<t:${Math.floor(timeoutUntil.getTime() / 1000)}:F>`,
                        inline: true
                    },
                    {
                        name: '🕒 Relative Time',
                        value: `<t:${Math.floor(timeoutUntil.getTime() / 1000)}:R>`,
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

            // Send DM to user if requested
            let dmResult = null;
            if (shouldDM) {
                try {
                    const dmEmbed = {
                        color: BRAND_COLORS.WARNING,
                        title: '⏰ You Have Been Timed Out - GrowmiesNJ',
                        description: `You have been timed out in **${interaction.guild.name}** for ${formatDuration(duration)}.`,
                        fields: [
                            {
                                name: '📝 Reason',
                                value: reason,
                                inline: false
                            },
                            {
                                name: '⏱️ Duration',
                                value: formatDuration(duration),
                                inline: true
                            },
                            {
                                name: '📅 Expires',
                                value: `<t:${Math.floor(timeoutUntil.getTime() / 1000)}:F>`,
                                inline: true
                            },
                            {
                                name: '📋 Case Number',
                                value: moderationCase?.case_number || 'N/A',
                                inline: true
                            },
                            {
                                name: '👮 Issued By',
                                value: interaction.user.tag,
                                inline: true
                            }
                        ],
                        footer: {
                            text: 'This is an automated message. The timeout will be automatically removed when it expires.'
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

            console.log(`✅ Timeout applied successfully - Case: ${moderationCase?.case_number || 'N/A'}, User: ${targetUser.tag}, Duration: ${formatDuration(duration)}, Moderator: ${interaction.user.tag}`);

        } catch (error) {
            console.error('❌ Error in timeout command:', error);
            
            const errorEmbed = EmbedUtils.createErrorEmbed(
                'Timeout Failed',
                error.message.includes('Missing required permissions') 
                    ? 'You do not have the required permissions to timeout users.'
                    : 'An error occurred while applying the timeout. Please try again or contact an administrator.',
                'TIMEOUT_ERROR'
            );

            try {
                await interaction.editReply({ embeds: [errorEmbed] });
            } catch (followUpError) {
                console.error('❌ Failed to send timeout error response:', followUpError);
            }
        }
    },
};