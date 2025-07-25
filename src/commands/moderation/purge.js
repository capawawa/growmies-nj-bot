/**
 * Purge Command for GrowmiesNJ Discord Bot
 * 
 * Bulk deletes messages with cannabis compliance tracking and comprehensive audit logging
 * Integrates with existing moderation service and evidence preservation
 */

const { SlashCommandBuilder, PermissionFlagsBits, InteractionContextType } = require('discord.js');
const ModerationService = require('../../services/moderationService');
const { EmbedUtils, BRAND_COLORS } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('purge')
        .setDescription('Bulk delete messages with cannabis compliance tracking and audit logging')
        .setContexts(InteractionContextType.Guild)
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Number of messages to delete (1-100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the message purge (minimum 10 characters)')
                .setRequired(true)
                .setMinLength(10)
                .setMaxLength(1000)
        )
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Only delete messages from this specific user')
                .setRequired(false)
        )
        .addBooleanOption(option =>
            option.setName('bots_only')
                .setDescription('Only delete messages from bots')
                .setRequired(false)
        )
        .addBooleanOption(option =>
            option.setName('preserve_evidence')
                .setDescription('Save deleted messages as evidence (default: true)')
                .setRequired(false)
        )
        .addBooleanOption(option =>
            option.setName('educational')
                .setDescription('Mark as educational violation cleanup (cannabis content guidelines)')
                .setRequired(false)
        ),

    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });

            const amount = interaction.options.getInteger('amount');
            const reason = interaction.options.getString('reason');
            const targetUser = interaction.options.getUser('user');
            const botsOnly = interaction.options.getBoolean('bots_only') ?? false;
            const preserveEvidence = interaction.options.getBoolean('preserve_evidence') ?? true;
            const isEducational = interaction.options.getBoolean('educational') ?? false;

            console.log(`🌿 Purge command executed by ${interaction.user.tag} in #${interaction.channel.name}`);

            // Validate channel permissions
            if (!interaction.channel.isTextBased()) {
                const errorEmbed = EmbedUtils.createErrorEmbed(
                    'Invalid Channel',
                    'This command can only be used in text channels.'
                );
                return await interaction.editReply({ embeds: [errorEmbed] });
            }

            // Check bot permissions
            const botMember = interaction.guild.members.me;
            if (!botMember.permissionsIn(interaction.channel).has([PermissionFlagsBits.ManageMessages, PermissionFlagsBits.ReadMessageHistory])) {
                const errorEmbed = EmbedUtils.createErrorEmbed(
                    'Insufficient Bot Permissions',
                    'The bot needs "Manage Messages" and "Read Message History" permissions in this channel.'
                );
                return await interaction.editReply({ embeds: [errorEmbed] });
            }

            // Validate conflicting options
            if (targetUser && botsOnly) {
                const errorEmbed = EmbedUtils.createErrorEmbed(
                    'Conflicting Options',
                    'You cannot specify both a target user and "bots only" option.'
                );
                return await interaction.editReply({ embeds: [errorEmbed] });
            }

            // Fetch messages for analysis and potential deletion
            let messagesToDelete = [];
            let messagesAnalyzed = 0;
            let preservedMessages = [];

            try {
                // Fetch messages from the channel
                const messages = await interaction.channel.messages.fetch({ 
                    limit: Math.min(amount * 2, 100), // Fetch more to account for filtering
                    before: interaction.id // Don't include the command message
                });

                // Filter messages based on criteria
                for (const [messageId, message] of messages) {
                    messagesAnalyzed++;

                    // Skip messages older than 14 days (Discord API limitation)
                    if (Date.now() - message.createdTimestamp > 14 * 24 * 60 * 60 * 1000) {
                        continue;
                    }

                    // Apply filters
                    let includeMessage = true;

                    if (targetUser && message.author.id !== targetUser.id) {
                        includeMessage = false;
                    }

                    if (botsOnly && !message.author.bot) {
                        includeMessage = false;
                    }

                    if (includeMessage) {
                        // Preserve message data if evidence preservation is enabled
                        if (preserveEvidence) {
                            const messageData = {
                                id: message.id,
                                content: message.content,
                                author: {
                                    id: message.author.id,
                                    username: message.author.username,
                                    discriminator: message.author.discriminator,
                                    bot: message.author.bot,
                                    avatarURL: message.author.displayAvatarURL({ dynamic: true })
                                },
                                createdTimestamp: message.createdTimestamp,
                                editedTimestamp: message.editedTimestamp,
                                attachments: message.attachments.map(att => ({
                                    id: att.id,
                                    name: att.name,
                                    url: att.url,
                                    size: att.size,
                                    contentType: att.contentType
                                })),
                                embeds: message.embeds.length,
                                reactions: message.reactions.cache.size,
                                pinned: message.pinned,
                                type: message.type,
                                channelId: message.channel.id,
                                guildId: message.guild.id
                            };
                            preservedMessages.push(messageData);
                        }

                        messagesToDelete.push(message);

                        // Stop when we have enough messages
                        if (messagesToDelete.length >= amount) {
                            break;
                        }
                    }
                }
            } catch (fetchError) {
                console.error('Failed to fetch messages:', fetchError);
                const errorEmbed = EmbedUtils.createErrorEmbed(
                    'Message Fetch Failed',
                    'Failed to fetch messages from this channel. Please try again.'
                );
                return await interaction.editReply({ embeds: [errorEmbed] });
            }

            if (messagesToDelete.length === 0) {
                const errorEmbed = EmbedUtils.createErrorEmbed(
                    'No Messages Found',
                    'No messages matching your criteria were found for deletion.'
                );
                return await interaction.editReply({ embeds: [errorEmbed] });
            }

            // Perform bulk deletion
            let deletedCount = 0;
            let deleteErrors = [];

            try {
                if (messagesToDelete.length === 1) {
                    // Single message deletion
                    await messagesToDelete[0].delete();
                    deletedCount = 1;
                } else {
                    // Bulk deletion (Discord API allows up to 100 messages at once, max 14 days old)
                    const recentMessages = messagesToDelete.filter(msg => 
                        Date.now() - msg.createdTimestamp < 14 * 24 * 60 * 60 * 1000
                    );
                    
                    if (recentMessages.length > 1) {
                        const deleted = await interaction.channel.bulkDelete(recentMessages, true);
                        deletedCount = deleted.size;
                    } else if (recentMessages.length === 1) {
                        await recentMessages[0].delete();
                        deletedCount = 1;
                    }

                    // Handle older messages individually if any
                    const olderMessages = messagesToDelete.filter(msg => 
                        Date.now() - msg.createdTimestamp >= 14 * 24 * 60 * 60 * 1000
                    );
                    
                    for (const message of olderMessages) {
                        try {
                            await message.delete();
                            deletedCount++;
                        } catch (error) {
                            deleteErrors.push(`Message ${message.id}: ${error.message}`);
                        }
                    }
                }
            } catch (deleteError) {
                console.error('Failed to delete messages:', deleteError);
                const errorEmbed = EmbedUtils.createErrorEmbed(
                    'Message Deletion Failed',
                    `Failed to delete messages: ${deleteError.message}`
                );
                return await interaction.editReply({ embeds: [errorEmbed] });
            }

            // Initialize moderation service
            const moderationService = new ModerationService();

            // Prepare case data with cannabis compliance flags
            const caseData = {
                guildId: interaction.guild.id,
                targetUserId: targetUser?.id || null,
                moderatorId: interaction.user.id,
                actionType: isEducational ? 'EDUCATIONAL_PURGE' : 'PURGE',
                reason: reason,
                channelId: interaction.channel.id,
                messagesDeleted: deletedCount,
                messagesAnalyzed: messagesAnalyzed,
                evidence: preserveEvidence ? JSON.stringify(preservedMessages) : null,
                filterCriteria: {
                    targetUser: targetUser?.id || null,
                    botsOnly: botsOnly,
                    amount: amount
                },
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
                console.error('Failed to create moderation case after purge completed');
                // Purge was already completed, so we continue but log the issue
            }

            const moderationCase = result.case;
            const complianceFlags = result.cannabisCompliance;

            // Create success embed with cannabis theming
            const successEmbed = {
                color: BRAND_COLORS.WARNING,
                title: '🧹 Message Purge Completed',
                description: `Successfully deleted ${deletedCount} message${deletedCount !== 1 ? 's' : ''} from ${interaction.channel.name} with cannabis compliance tracking.`,
                fields: [
                    {
                        name: '📊 Purge Statistics',
                        value: [
                            `**Messages Deleted:** ${deletedCount}`,
                            `**Messages Analyzed:** ${messagesAnalyzed}`,
                            `**Target User:** ${targetUser ? targetUser.tag : 'All users'}`,
                            `**Filter:** ${botsOnly ? 'Bots only' : 'All message types'}`
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '📋 Case Details',
                        value: [
                            `**Case Number:** ${moderationCase?.case_number || 'N/A'}`,
                            `**Channel:** ${interaction.channel.name}`,
                            `**Evidence Preserved:** ${preserveEvidence ? 'Yes' : 'No'}`,
                            `**Action Type:** ${isEducational ? '🎓 Educational Purge' : '🧹 Standard Purge'}`
                        ].join('\n'),
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

            // Add deletion errors if any occurred
            if (deleteErrors.length > 0) {
                successEmbed.fields.push({
                    name: '⚠️ Deletion Errors',
                    value: deleteErrors.slice(0, 3).join('\n') + (deleteErrors.length > 3 ? `\n...and ${deleteErrors.length - 3} more` : ''),
                    inline: false
                });
            }

            // Add evidence preservation details
            if (preserveEvidence && preservedMessages.length > 0) {
                const evidenceSummary = [
                    `**Messages Preserved:** ${preservedMessages.length}`,
                    `**Content Types:** Text, Attachments, Embeds`,
                    `**Metadata:** Author info, timestamps, reactions`,
                    `**Storage:** Secure moderation database`
                ];

                successEmbed.fields.push({
                    name: '💾 Evidence Preservation',
                    value: evidenceSummary.join('\n'),
                    inline: true
                });
            }

            // Add cannabis compliance information if applicable
            if (complianceFlags?.ageRelated || complianceFlags?.educationalViolation || complianceFlags?.legalAreaViolation) {
                const complianceInfo = [];
                if (complianceFlags.ageRelated) complianceInfo.push('🔞 Age-Related Content Cleaned');
                if (complianceFlags.educationalViolation) complianceInfo.push('🎓 Educational Content Violation');
                if (complianceFlags.legalAreaViolation) complianceInfo.push('⚖️ Legal Area Violation');

                successEmbed.fields.push({
                    name: '🌿 Cannabis Compliance Flags',
                    value: complianceInfo.join('\n'),
                    inline: false
                });
            }

            // Add audit information
            successEmbed.fields.push({
                name: '📋 Audit Information',
                value: [
                    `**Moderator:** ${interaction.user.tag}`,
                    `**Timestamp:** <t:${Math.floor(Date.now() / 1000)}:F>`,
                    `**Channel:** #${interaction.channel.name} (${interaction.channel.id})`,
                    `**Compliance Tracking:** Enabled`
                ].join('\n'),
                inline: false
            });

            await interaction.editReply({ embeds: [successEmbed] });

            console.log(`✅ Purge completed successfully - Case: ${moderationCase?.case_number || 'N/A'}, Messages: ${deletedCount}, Channel: #${interaction.channel.name}, Moderator: ${interaction.user.tag}`);

        } catch (error) {
            console.error('❌ Error in purge command:', error);
            
            const errorEmbed = EmbedUtils.createErrorEmbed(
                'Purge Failed',
                error.message.includes('Missing required permissions') 
                    ? 'You do not have the required permissions to delete messages in this channel.'
                    : 'An error occurred while purging messages. Please try again or contact an administrator.',
                'PURGE_ERROR'
            );

            try {
                await interaction.editReply({ embeds: [errorEmbed] });
            } catch (followUpError) {
                console.error('❌ Failed to send purge error response:', followUpError);
            }
        }
    },
};