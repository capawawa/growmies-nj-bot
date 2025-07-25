/**
 * Ban Command for GrowmiesNJ Discord Bot
 * 
 * Permanently or temporarily bans users with cannabis compliance tracking and appeals integration
 * Integrates with existing moderation service and comprehensive evidence preservation
 */

const { SlashCommandBuilder, PermissionFlagsBits, InteractionContextType } = require('discord.js');
const ModerationService = require('../../services/moderationService');
const { EmbedUtils, BRAND_COLORS } = require('../../utils/embeds');

// Duration parsing utility for temporary bans
function parseDuration(durationString) {
    if (!durationString || durationString.toLowerCase() === 'permanent') {
        return null; // Permanent ban
    }

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
    
    // Maximum temporary ban: 365 days
    if (milliseconds < 1000 || milliseconds > 365 * 24 * 60 * 60 * 1000) {
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
    if (!duration) return 'Permanent';
    
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
        .setName('ban')
        .setDescription('Ban a user from the server with cannabis compliance tracking and appeals integration')
        .setContexts(InteractionContextType.Guild)
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to ban from the server')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the ban (minimum 10 characters)')
                .setRequired(true)
                .setMinLength(10)
                .setMaxLength(1000)
        )
        .addStringOption(option =>
            option.setName('duration')
                .setDescription('Ban duration (e.g., 7d, 30d, permanent) - Leave empty for permanent')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('evidence')
                .setDescription('Additional evidence or context (URLs, message IDs, etc.)')
                .setRequired(false)
                .setMaxLength(500)
        )
        .addIntegerOption(option =>
            option.setName('delete_days')
                .setDescription('Days of message history to delete (0-7)')
                .setRequired(false)
                .setMinValue(0)
                .setMaxValue(7)
        )
        .addBooleanOption(option =>
            option.setName('educational')
                .setDescription('Mark as educational violation (cannabis content guidelines)')
                .setRequired(false)
        )
        .addBooleanOption(option =>
            option.setName('dm_user')
                .setDescription('Send a private message to the user about the ban (default: true)')
                .setRequired(false)
        ),

    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });

            const targetUser = interaction.options.getUser('user');
            const reason = interaction.options.getString('reason');
            const durationInput = interaction.options.getString('duration');
            const evidence = interaction.options.getString('evidence');
            const deleteDays = interaction.options.getInteger('delete_days') ?? 0;
            const isEducational = interaction.options.getBoolean('educational') ?? false;
            const shouldDM = interaction.options.getBoolean('dm_user') ?? true;

            console.log(`🌿 Ban command executed by ${interaction.user.tag} targeting ${targetUser.tag}`);

            // Parse duration for temporary bans
            let duration = null;
            if (durationInput) {
                duration = parseDuration(durationInput);
                if (duration === null && durationInput.toLowerCase() !== 'permanent') {
                    const errorEmbed = EmbedUtils.createErrorEmbed(
                        'Invalid Duration',
                        [
                            'Please use a valid duration format:',
                            '• **7d** - 7 days',
                            '• **30d** - 30 days', 
                            '• **permanent** - Permanent ban',
                            '',
                            'Maximum temporary ban: 365 days'
                        ].join('\n')
                    );
                    return await interaction.editReply({ embeds: [errorEmbed] });
                }
            }

            const isPermanent = !duration;

            // Validate target user
            if (targetUser.id === interaction.user.id) {
                const errorEmbed = EmbedUtils.createErrorEmbed(
                    'Invalid Target',
                    'You cannot ban yourself. Please contact another moderator if you need assistance.'
                );
                return await interaction.editReply({ embeds: [errorEmbed] });
            }

            if (targetUser.bot) {
                const errorEmbed = EmbedUtils.createErrorEmbed(
                    'Invalid Target',
                    'You cannot ban bot users. Please use proper bot management procedures.'
                );
                return await interaction.editReply({ embeds: [errorEmbed] });
            }

            // Check if target is the server owner
            if (targetUser.id === interaction.guild.ownerId) {
                const errorEmbed = EmbedUtils.createErrorEmbed(
                    'Cannot Ban Owner',
                    'You cannot ban the server owner.'
                );
                return await interaction.editReply({ embeds: [errorEmbed] });
            }

            // Get target member if they're in the server (for permission checks and evidence)
            let targetMember = null;
            let userEvidence = null;
            
            try {
                targetMember = await interaction.guild.members.fetch(targetUser.id);
                
                // Prevent banning users with higher or equal permissions
                if (targetMember.roles.highest.position >= interaction.member.roles.highest.position) {
                    const errorEmbed = EmbedUtils.createErrorEmbed(
                        'Insufficient Permissions',
                        'You cannot ban users with equal or higher permissions than yourself.'
                    );
                    return await interaction.editReply({ embeds: [errorEmbed] });
                }

                // Gather user evidence for tracking
                userEvidence = {
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
            } catch (error) {
                // User not in server, gather basic evidence
                userEvidence = {
                    username: targetUser.username,
                    discriminator: targetUser.discriminator,
                    displayName: targetUser.displayName,
                    avatarURL: targetUser.displayAvatarURL({ dynamic: true }),
                    joinedAt: null,
                    accountCreated: targetUser.createdAt,
                    roles: [],
                    permissions: [],
                    nickname: null,
                    premiumSince: null,
                    wasNotInServer: true
                };
            }

            // Check if user is already banned
            try {
                const existingBan = await interaction.guild.bans.fetch(targetUser.id);
                if (existingBan) {
                    const errorEmbed = EmbedUtils.createErrorEmbed(
                        'User Already Banned',
                        'This user is already banned from the server. Use `/unban` to remove the existing ban first.'
                    );
                    return await interaction.editReply({ embeds: [errorEmbed] });
                }
            } catch (error) {
                // User not banned, continue
            }

            // Send DM before banning (if requested and user is in server)
            let dmResult = null;
            if (shouldDM && targetMember) {
                try {
                    const banExpiry = duration ? new Date(Date.now() + duration.milliseconds) : null;
                    
                    const dmEmbed = {
                        color: BRAND_COLORS.ERROR,
                        title: '🔨 You Have Been Banned - GrowmiesNJ',
                        description: `You have been ${isPermanent ? 'permanently banned' : 'temporarily banned'} from **${interaction.guild.name}**.`,
                        fields: [
                            {
                                name: '📝 Reason',
                                value: reason,
                                inline: false
                            },
                            {
                                name: '⏱️ Duration',
                                value: isPermanent ? 'Permanent' : formatDuration(duration),
                                inline: true
                            },
                            {
                                name: '👮 Banned By',
                                value: interaction.user.tag,
                                inline: true
                            }
                        ],
                        footer: {
                            text: 'You may appeal this ban by contacting server staff through other channels.'
                        },
                        timestamp: new Date().toISOString()
                    };

                    if (!isPermanent) {
                        dmEmbed.fields.push({
                            name: '📅 Ban Expires',
                            value: `<t:${Math.floor(banExpiry.getTime() / 1000)}:F>`,
                            inline: true
                        });
                    }

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

                    // Add appeals information
                    dmEmbed.fields.push({
                        name: '📩 Appeals Process',
                        value: [
                            '• Appeals must be made in writing',
                            '• Include acknowledgment of community guidelines',
                            '• Demonstrate understanding of cannabis compliance requirements',
                            '• Contact server staff through official channels',
                            '• Appeals are reviewed within 7-14 business days'
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

            // Apply Discord ban
            try {
                const banReason = `${reason} | Moderator: ${interaction.user.tag}${evidence ? ` | Evidence: ${evidence}` : ''}${isPermanent ? '' : ` | Duration: ${formatDuration(duration)}`}`;
                await interaction.guild.members.ban(targetUser.id, {
                    reason: banReason,
                    deleteMessageDays: deleteDays
                });
            } catch (banError) {
                console.error('Failed to ban user:', banError);
                const errorEmbed = EmbedUtils.createErrorEmbed(
                    'Ban Failed',
                    'Failed to ban the user. Please check that the bot has sufficient permissions.'
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
                actionType: isEducational ? 'EDUCATIONAL_BAN' : (isPermanent ? 'PERMANENT_BAN' : 'TEMPORARY_BAN'),
                reason: reason,
                duration: duration ? duration.milliseconds : null,
                expiresAt: duration ? new Date(Date.now() + duration.milliseconds) : null,
                evidence: evidence || null,
                userEvidence: JSON.stringify(userEvidence),
                deleteMessageDays: deleteDays,
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
                console.error('Failed to create moderation case after ban applied');
                // Ban was already applied, so we continue but log the issue
            }

            const moderationCase = result.case;
            const complianceFlags = result.cannabisCompliance;

            // Create success embed with cannabis theming
            const successEmbed = {
                color: BRAND_COLORS.ERROR,
                title: '🔨 User Banned Successfully',
                description: `${targetUser.tag} has been ${isPermanent ? 'permanently banned' : 'temporarily banned'} from the server with cannabis compliance tracking.`,
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
                        value: isPermanent ? 'Permanent' : formatDuration(duration),
                        inline: true
                    },
                    {
                        name: '⚖️ Action Type',
                        value: isEducational ? '🎓 Educational Ban' : (isPermanent ? '🔨 Permanent Ban' : '⏰ Temporary Ban'),
                        inline: true
                    },
                    {
                        name: '🗑️ Messages Deleted',
                        value: `${deleteDays} day${deleteDays !== 1 ? 's' : ''}`,
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

            // Add expiry time for temporary bans
            if (!isPermanent) {
                const expiryTime = new Date(Date.now() + duration.milliseconds);
                successEmbed.fields.push({
                    name: '📅 Ban Expires',
                    value: `<t:${Math.floor(expiryTime.getTime() / 1000)}:F>`,
                    inline: true
                });
                successEmbed.fields.push({
                    name: '🕒 Relative Time',
                    value: `<t:${Math.floor(expiryTime.getTime() / 1000)}:R>`,
                    inline: true
                });
            }

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
                userEvidence.joinedAt ? `**Joined Server:** <t:${Math.floor(userEvidence.joinedAt.getTime() / 1000)}:R>` : '**Status:** Not in server',
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
                    value: dmResult || 'Not sent (user not in server)',
                    inline: true
                });
            }

            // Add appeals information
            successEmbed.fields.push({
                name: '📩 Appeals Process',
                value: 'User has been informed of the appeals process and cannabis compliance requirements.',
                inline: false
            });

            await interaction.editReply({ embeds: [successEmbed] });

            console.log(`✅ Ban applied successfully - Case: ${moderationCase?.case_number || 'N/A'}, User: ${targetUser.tag}, Duration: ${isPermanent ? 'Permanent' : formatDuration(duration)}, Moderator: ${interaction.user.tag}`);

        } catch (error) {
            console.error('❌ Error in ban command:', error);
            
            const errorEmbed = EmbedUtils.createErrorEmbed(
                'Ban Failed',
                error.message.includes('Missing required permissions') 
                    ? 'You do not have the required permissions to ban users.'
                    : 'An error occurred while banning the user. Please try again or contact an administrator.',
                'BAN_ERROR'
            );

            try {
                await interaction.editReply({ embeds: [errorEmbed] });
            } catch (followUpError) {
                console.error('❌ Failed to send ban error response:', followUpError);
            }
        }
    },
};