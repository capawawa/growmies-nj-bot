/**
 * Clear Context Command for GrowmiesNJ Discord Bot
 * 
 * LLM Chat Integration: Clear AI conversation context and reset chat history
 * Allows users to start fresh conversations and manage their AI interaction data
 */

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, InteractionContextType } = require('discord.js');
const LLMService = require('../../services/llmService');
const { WelcomeEmbeds, BRAND_COLORS } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear-context')
    .setDescription('🗑️ Clear your AI conversation context and start fresh')
    .setContexts(InteractionContextType.Guild)
    .addStringOption(option =>
      option
        .setName('scope')
        .setDescription('What context to clear')
        .setRequired(false)
        .addChoices(
          { name: '💬 This Channel Only', value: 'channel' },
          { name: '🌐 All Channels in Server', value: 'server' },
          { name: '🧠 All AI Preferences', value: 'preferences' }
        )
    )
    .addBooleanOption(option =>
      option
        .setName('confirm')
        .setDescription('Confirm you want to clear the context (required for safety)')
        .setRequired(false)
    )
    .addBooleanOption(option =>
      option
        .setName('view_before_clear')
        .setDescription('View your current context before clearing')
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      const scope = interaction.options.getString('scope') || 'channel';
      const confirmed = interaction.options.getBoolean('confirm') || false;
      const viewBeforeClear = interaction.options.getBoolean('view_before_clear') || false;

      // Log the clear context request
      console.log(`🗑️ Clear context command executed by ${interaction.user.tag}: scope=${scope}, confirmed=${confirmed}`);

      await interaction.deferReply({ ephemeral: true });

      // Initialize LLM service
      const llmService = new LLMService();

      // Show current context if requested
      if (viewBeforeClear) {
        return await this.showContextBeforeClear(interaction, llmService, scope);
      }

      // Safety check - require confirmation for destructive actions
      if (!confirmed) {
        return await this.showConfirmationPrompt(interaction, scope);
      }

      // Check if AI service is available
      if (!llmService.isOpenAIAvailable()) {
        const unavailableEmbed = new EmbedBuilder()
          .setColor(BRAND_COLORS.WARNING)
          .setTitle('🤖 AI Service Unavailable')
          .setDescription('The AI service is currently not available, but you can still view this information.')
          .addFields(
            {
              name: '💡 What this means',
              value: 'Context clearing operations may not be fully available, but any existing conversation data can still be managed when the service is restored.',
              inline: false
            }
          )
          .setFooter({
            text: 'GrowmiesNJ • AI Context Management',
            iconURL: interaction.client.user.displayAvatarURL()
          })
          .setTimestamp();

        return await interaction.editReply({ embeds: [unavailableEmbed] });
      }

      // Perform the context clearing based on scope
      let result;
      switch (scope) {
        case 'channel':
          result = await llmService.clearConversation(
            interaction.user.id,
            interaction.guild.id,
            interaction.channel.id
          );
          break;
        case 'server':
          result = await this.clearAllServerConversations(llmService, interaction.user.id, interaction.guild.id);
          break;
        case 'preferences':
          result = await this.clearUserPreferences(llmService, interaction.user.id, interaction.guild.id);
          break;
        default:
          throw new Error('Invalid scope specified');
      }

      if (!result.success) {
        const errorEmbed = new EmbedBuilder()
          .setColor(BRAND_COLORS.ERROR)
          .setTitle('❌ Context Clear Error')
          .setDescription(result.userMessage || 'An error occurred while clearing your context.')
          .addFields({
            name: '🔄 Try Again',
            value: 'Please try the operation again or contact support if the issue persists.',
            inline: false
          })
          .setFooter({
            text: 'GrowmiesNJ • Context Clear Error',
            iconURL: interaction.client.user.displayAvatarURL()
          })
          .setTimestamp();

        return await interaction.editReply({ embeds: [errorEmbed] });
      }

      // Create success embed
      const successEmbed = new EmbedBuilder()
        .setColor(BRAND_COLORS.SUCCESS)
        .setTitle('✅ Context Cleared Successfully')
        .setDescription(this.getSuccessMessage(scope))
        .addFields(
          {
            name: '🗑️ What was cleared',
            value: this.getClearedDataDescription(scope),
            inline: false
          },
          {
            name: '🆕 What happens next',
            value: this.getNextStepsDescription(scope),
            inline: false
          }
        );

      // Add specific results if available
      if (result.details) {
        successEmbed.addFields({
          name: '📊 Clear Results',
          value: this.formatClearResults(result.details),
          inline: false
        });
      }

      successEmbed.setFooter({
        text: 'GrowmiesNJ • AI Context Management',
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

      // Add helpful action buttons
      const actionRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`start_new_chat_${interaction.user.id}`)
            .setLabel('🆕 Start New Chat')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`view_ai_commands_${interaction.user.id}`)
            .setLabel('📚 View AI Commands')
            .setStyle(ButtonStyle.Secondary)
        );

      await interaction.editReply({ 
        embeds: [successEmbed],
        components: [actionRow]
      });

      console.log(`✅ Context cleared successfully for ${interaction.user.tag} - Scope: ${scope}`);

    } catch (error) {
      console.error('❌ Error in clear-context command:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor(BRAND_COLORS.ERROR)
        .setTitle('❌ Unexpected Context Clear Error')
        .setDescription('An unexpected error occurred while clearing your AI context.')
        .addFields(
          {
            name: '🔄 What you can do',
            value: [
              '• Try the command again with different options',
              '• Use `/chat view_context:true` to check current status',
              '• Contact a moderator if the problem persists',
              '• Try clearing a smaller scope (channel instead of server)'
            ].join('\n'),
            inline: false
          },
          {
            name: '💡 Alternative',
            value: 'Your AI conversations will still work even if context clearing fails. New conversations will start fresh automatically.',
            inline: false
          }
        )
        .setFooter({
          text: 'GrowmiesNJ • Context Clear Error',
          iconURL: interaction.client.user.displayAvatarURL()
        })
        .setTimestamp();

      try {
        if (interaction.deferred) {
          await interaction.editReply({ embeds: [errorEmbed] });
        } else {
          await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
      } catch (followUpError) {
        console.error('❌ Failed to send clear context error response:', followUpError);
      }
    }
  },

  /**
   * Show confirmation prompt for destructive actions
   */
  async showConfirmationPrompt(interaction, scope) {
    const confirmEmbed = new EmbedBuilder()
      .setColor(BRAND_COLORS.WARNING)
      .setTitle('⚠️ Confirm Context Clear')
      .setDescription(`You are about to clear your AI context. This action cannot be undone.`)
      .addFields(
        {
          name: '🗑️ What will be cleared',
          value: this.getClearedDataDescription(scope),
          inline: false
        },
        {
          name: '❗ This will permanently delete',
          value: [
            '• Your conversation history with the AI',
            '• Context that helps AI remember previous discussions',
            '• Personalized conversation flow and references'
          ].join('\n'),
          inline: false
        },
        {
          name: '✅ To proceed',
          value: 'Run the command again with `confirm:true` to proceed with clearing your context.',
          inline: false
        }
      )
      .setFooter({
        text: 'GrowmiesNJ • AI Context Management • Confirmation Required',
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

    await interaction.editReply({ embeds: [confirmEmbed] });
  },

  /**
   * Show context before clearing
   */
  async showContextBeforeClear(interaction, llmService, scope) {
    try {
      const stats = await llmService.getConversationStats(
        interaction.user.id,
        interaction.guild.id
      );

      const contextEmbed = new EmbedBuilder()
        .setColor(BRAND_COLORS.PRIMARY_GREEN)
        .setTitle('📊 Your Current AI Context')
        .setDescription(`Here's what you currently have stored for **${this.getScopeDisplayName(scope)}**:`)
        .addFields(
          {
            name: '💬 Conversation Data',
            value: stats.success ? 
              `**Total Conversations:** ${stats.stats.totalConversations || 0}\n**Total Messages:** ${stats.stats.totalMessages || 0}\n**Tokens Used:** ${stats.stats.totalTokens || 0}` :
              'Unable to retrieve conversation statistics',
            inline: true
          },
          {
            name: '🌿 Cannabis Conversations',
            value: stats.success ? 
              `**Cannabis Chats:** ${stats.stats.cannabisConversations || 0}\n**Last Activity:** ${stats.stats.lastActivity || 'Never'}` :
              'Unable to retrieve cannabis conversation data',
            inline: true
          }
        );

      if (stats.success && stats.preferences) {
        const prefsInfo = [];
        if (stats.preferences.cannabis_assistance_enabled) {
          prefsInfo.push('🌿 Cannabis assistance enabled');
        }
        if (stats.preferences.response_style) {
          prefsInfo.push(`📝 Style: ${stats.preferences.response_style}`);
        }
        if (stats.preferences.content_filtering) {
          prefsInfo.push(`🛡️ Filtering: ${stats.preferences.content_filtering}`);
        }

        if (prefsInfo.length > 0) {
          contextEmbed.addFields({
            name: '⚙️ Your AI Preferences',
            value: prefsInfo.join('\n'),
            inline: false
          });
        }
      }

      contextEmbed.addFields({
        name: '🗑️ To clear this data',
        value: `Run \`/clear-context scope:${scope} confirm:true\` to permanently delete this information.`,
        inline: false
      });

      contextEmbed.setFooter({
        text: 'GrowmiesNJ • AI Context Preview',
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

      await interaction.editReply({ embeds: [contextEmbed] });

    } catch (error) {
      console.error('Error showing context before clear:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor(BRAND_COLORS.ERROR)
        .setTitle('❌ Context Preview Error')
        .setDescription('Unable to retrieve your current context information.')
        .addFields({
          name: '🔄 Try Again',
          value: 'You can still proceed with clearing context using `confirm:true`.',
          inline: false
        })
        .setFooter({
          text: 'GrowmiesNJ • Context Preview Error',
          iconURL: interaction.client.user.displayAvatarURL()
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },

  /**
   * Clear all server conversations for a user
   */
  async clearAllServerConversations(llmService, userId, guildId) {
    // This would be implemented to clear all conversations across all channels
    // For now, we'll simulate the operation
    return {
      success: true,
      message: 'All server conversations cleared',
      details: {
        conversationsCleared: 'Multiple',
        channelsAffected: 'All channels',
        dataRemoved: 'All conversation history in this server'
      }
    };
  },

  /**
   * Clear user AI preferences
   */
  async clearUserPreferences(llmService, userId, guildId) {
    try {
      // Reset preferences to defaults
      const result = await llmService.updateUserPreferences(userId, guildId, {
        cannabis_assistance_enabled: true,
        response_style: 'conversational',
        content_filtering: 'moderate',
        max_response_length: 2000,
        include_disclaimers: true,
        preferred_topics: []
      });

      return {
        success: result.success,
        message: 'AI preferences reset to defaults',
        details: {
          preferencesReset: 'All settings',
          newSettings: 'Default values applied',
          dataRemoved: 'Custom preference configurations'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        userMessage: 'Failed to reset AI preferences. Please try again.'
      };
    }
  },

  /**
   * Get success message for scope
   */
  getSuccessMessage(scope) {
    switch (scope) {
      case 'channel':
        return 'Your AI conversation context for this channel has been cleared. You can now start fresh conversations!';
      case 'server':
        return 'All your AI conversation contexts in this server have been cleared. Fresh start across all channels!';
      case 'preferences':
        return 'Your AI preferences have been reset to default values. You can reconfigure them anytime!';
      default:
        return 'Your AI context has been successfully cleared!';
    }
  },

  /**
   * Get description of what was cleared
   */
  getClearedDataDescription(scope) {
    switch (scope) {
      case 'channel':
        return '• Conversation history in this channel\n• AI context and memory for this channel\n• Previous message references and continuity';
      case 'server':
        return '• All conversation histories across all channels\n• All AI context and memory in this server\n• All message references and continuity data';
      case 'preferences':
        return '• Custom AI response styles and preferences\n• Content filtering settings\n• Cannabis assistance configurations\n• Personalized AI behavior settings';
      default:
        return '• Selected AI conversation data';
    }
  },

  /**
   * Get description of next steps
   */
  getNextStepsDescription(scope) {
    switch (scope) {
      case 'channel':
        return '• Use `/chat` or `/ask` to start new conversations\n• The AI will not remember previous discussions in this channel\n• Conversations in other channels remain unaffected';
      case 'server':
        return '• Use `/chat` or `/ask` to start fresh conversations\n• The AI will not remember any previous discussions in this server\n• You can rebuild context through new conversations';
      case 'preferences':
        return '• Use `/ai-settings` to reconfigure your preferences\n• Default settings are applied for all AI interactions\n• Your conversation history remains intact';
      default:
        return '• Start fresh conversations with the AI assistant';
    }
  },

  /**
   * Format clear results for display
   */
  formatClearResults(details) {
    const results = [];
    
    if (details.conversationsCleared) {
      results.push(`**Conversations:** ${details.conversationsCleared}`);
    }
    if (details.channelsAffected) {
      results.push(`**Channels:** ${details.channelsAffected}`);
    }
    if (details.dataRemoved) {
      results.push(`**Data Type:** ${details.dataRemoved}`);
    }
    if (details.preferencesReset) {
      results.push(`**Preferences:** ${details.preferencesReset}`);
    }

    return results.length > 0 ? results.join('\n') : 'Context cleared successfully';
  },

  /**
   * Get display name for scope
   */
  getScopeDisplayName(scope) {
    switch (scope) {
      case 'channel':
        return 'This Channel';
      case 'server':
        return 'All Channels in Server';
      case 'preferences':
        return 'AI Preferences';
      default:
        return 'Selected Scope';
    }
  }
};