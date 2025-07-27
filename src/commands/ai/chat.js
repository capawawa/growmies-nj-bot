/**
 * Chat Command for GrowmiesNJ Discord Bot
 * 
 * LLM Chat Integration: Conversational AI assistant with context memory and cannabis compliance
 * Maintains conversation history for more natural, ongoing interactions
 */

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, InteractionContextType } = require('discord.js');
const LLMService = require('../../services/llmService');
const { WelcomeEmbeds, BRAND_COLORS } = require('../../utils/embeds');
const { AgeVerificationHelper } = require('../../utils/ageVerificationHelper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('chat')
    .setDescription('💬 Have a conversation with the AI assistant (maintains context)')
    .setContexts(InteractionContextType.Guild)
    .addStringOption(option =>
      option
        .setName('message')
        .setDescription('Your message to the AI assistant')
        .setRequired(true)
        .setMinLength(3)
        .setMaxLength(2000)
    )
    .addStringOption(option =>
      option
        .setName('conversation_type')
        .setDescription('Type of conversation for specialized assistance')
        .setRequired(false)
        .addChoices(
          { name: '💬 General Conversation', value: 'general' },
          { name: '🌿 Cannabis Education', value: 'cannabis_education' },
          { name: '🧬 Strain Discussion', value: 'strain_advice' },
          { name: '🌱 Growing Discussion', value: 'grow_tips' },
          { name: '⚖️ Legal Discussion', value: 'legal_info' }
        )
    )
    .addBooleanOption(option =>
      option
        .setName('private')
        .setDescription('Make the conversation private (only you can see it)')
        .setRequired(false)
    )
    .addBooleanOption(option =>
      option
        .setName('view_context')
        .setDescription('View current conversation context and statistics')
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      const message = interaction.options.getString('message');
      const conversationType = interaction.options.getString('conversation_type') || 'general';
      const isPrivate = interaction.options.getBoolean('private') || false;
      const viewContext = interaction.options.getBoolean('view_context') || false;

      // Log the chat interaction attempt
      console.log(`💬 Chat command executed by ${interaction.user.tag}: "${message.substring(0, 50)}..." (Type: ${conversationType})`);

      await interaction.deferReply({ ephemeral: isPrivate });

      // Initialize LLM service
      const llmService = new LLMService();

      // Handle context viewing
      if (viewContext) {
        return await this.showConversationContext(interaction, llmService);
      }

      // Check if AI service is available
      if (!llmService.isOpenAIAvailable()) {
        const unavailableEmbed = new EmbedBuilder()
          .setColor(BRAND_COLORS.WARNING)
          .setTitle('🤖 AI Service Unavailable')
          .setDescription('The AI assistant is currently not available. The service may not be configured or dependencies may be missing.')
          .addFields(
            {
              name: '🔧 Administrator Note',
              value: 'Please ensure OpenAI API key is configured and dependencies are installed:\n```\nnpm install openai tiktoken natural\n```',
              inline: false
            },
            {
              name: '💡 Alternative',
              value: 'You can still have conversations in the community channels where other members can help!',
              inline: false
            }
          )
          .setFooter({
            text: 'GrowmiesNJ • AI Chat Assistant',
            iconURL: interaction.client.user.displayAvatarURL()
          })
          .setTimestamp();

        return await interaction.editReply({ embeds: [unavailableEmbed] });
      }

      // Check age verification for cannabis conversations using existing system
      const requiresAgeVerification = ['cannabis_education', 'strain_advice', 'grow_tips', 'legal_info'].includes(conversationType);
      
      if (requiresAgeVerification) {
        const verificationResult = await AgeVerificationHelper.checkUserVerification(
          interaction.user.id,
          interaction.guild.id
        );

        if (!verificationResult.verified) {
          await AgeVerificationHelper.handleVerificationFailure(interaction, verificationResult.reason);
          
          // Log verification enforcement
          await AgeVerificationHelper.logVerificationEnforcement(
            interaction.user.id,
            interaction.guild.id,
            'ai-chat',
            verificationResult.reason
          );
          return;
        }
      }

      // Prepare request data
      const requestData = {
        userId: interaction.user.id,
        guildId: interaction.guild.id,
        channelId: interaction.channel.id,
        message: message,
        conversationType: conversationType,
        requiresAgeVerification: requiresAgeVerification,
      };

      // Process the chat request
      const response = await llmService.processChat(
        requestData,
        interaction.user,
        interaction.guild
      );

      if (!response.success) {
        // Handle specific error cases (age verification now handled above)

        // General error handling
        const errorEmbed = new EmbedBuilder()
          .setColor(BRAND_COLORS.ERROR)
          .setTitle('❌ AI Chat Error')
          .setDescription(response.userMessage || 'An error occurred while processing your message.')
          .addFields({
            name: '🔄 Try Again',
            value: 'Please try sending your message again or contact support if the issue persists.',
            inline: false
          })
          .setFooter({
            text: 'GrowmiesNJ • AI Chat Error',
            iconURL: interaction.client.user.displayAvatarURL()
          })
          .setTimestamp();

        return await interaction.editReply({ embeds: [errorEmbed] });
      }

      // Create conversation response embed
      const responseEmbed = new EmbedBuilder()
        .setColor(this.getEmbedColorForType(conversationType))
        .setTitle(this.getEmbedTitleForType(conversationType))
        .setDescription(response.response);

      // Add conversation context information
      if (response.conversation) {
        responseEmbed.addFields(
          {
            name: '💬 Your Message',
            value: message.length > 150 ? message.substring(0, 150) + '...' : message,
            inline: false
          },
          {
            name: '📊 Conversation Stats',
            value: `**Messages:** ${response.conversation.messageCount}\n**Tokens Used:** ${response.conversation.tokensUsed}\n**Type:** ${this.getTypeDisplayName(conversationType)}`,
            inline: true
          }
        );
      }

      // Add compliance information if applicable
      if (response.compliance && (response.compliance.cannabisContent || response.compliance.ageVerificationRequired || response.compliance.filtered)) {
        const complianceInfo = [];
        if (response.compliance.cannabisContent) {
          complianceInfo.push('🌿 Cannabis content detected');
        }
        if (response.compliance.ageVerificationRequired) {
          complianceInfo.push('🔞 21+ verification confirmed');
        }
        if (response.compliance.filtered) {
          complianceInfo.push('🛡️ Content filtered for compliance');
        }

        responseEmbed.addFields({
          name: '🛡️ Compliance Status',
          value: complianceInfo.join('\n'),
          inline: true
        });
      }

      responseEmbed.setFooter({
        text: `GrowmiesNJ • AI Chat • ${isPrivate ? 'Private' : 'Public'} • ID: ${response.conversation?.id || 'N/A'}`,
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

      // Create action buttons for conversation management
      const actionRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`chat_continue_${interaction.user.id}`)
            .setLabel('💬 Continue Chat')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`chat_context_${interaction.user.id}`)
            .setLabel('📊 View Context')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`chat_clear_${interaction.user.id}`)
            .setLabel('🗑️ Clear Context')
            .setStyle(ButtonStyle.Danger)
        );

      // Send the main response
      await interaction.editReply({ 
        embeds: [responseEmbed],
        components: [actionRow]
      });

      // Send additional parts if the response was too long
      if (response.additionalParts && response.additionalParts.length > 0) {
        for (let i = 0; i < response.additionalParts.length; i++) {
          const additionalEmbed = new EmbedBuilder()
            .setColor(this.getEmbedColorForType(conversationType))
            .setTitle(`💬 AI Response (Continued ${i + 2})`)
            .setDescription(response.additionalParts[i])
            .setFooter({
              text: 'GrowmiesNJ • AI Chat (Continued)',
              iconURL: interaction.user.displayAvatarURL()
            })
            .setTimestamp();

          await interaction.followUp({ 
            embeds: [additionalEmbed], 
            ephemeral: isPrivate 
          });
        }
      }

      // Add follow-up suggestions if available
      if (response.suggestions && response.suggestions.followUp && response.suggestions.followUp.length > 0) {
        const suggestionsEmbed = new EmbedBuilder()
          .setColor(BRAND_COLORS.ACCENT_BLUE)
          .setTitle('💡 Follow-up Suggestions')
          .setDescription('Here are some related topics you might want to explore:')
          .addFields({
            name: '🔍 Suggested Questions',
            value: response.suggestions.followUp.map(suggestion => `• ${suggestion}`).join('\n'),
            inline: false
          })
          .setFooter({
            text: 'GrowmiesNJ • AI Chat Suggestions',
            iconURL: interaction.client.user.displayAvatarURL()
          })
          .setTimestamp();

        await interaction.followUp({ 
          embeds: [suggestionsEmbed], 
          ephemeral: true 
        });
      }

      // Add reactions based on suggestions
      if (response.suggestions && response.suggestions.reactions && !isPrivate) {
        try {
          const message = await interaction.fetchReply();
          for (const reaction of response.suggestions.reactions.slice(0, 3)) {
            await message.react(reaction);
          }
        } catch (reactionError) {
          console.warn('Failed to add reaction suggestions:', reactionError.message);
        }
      }

      console.log(`✅ Chat command completed successfully for ${interaction.user.tag} - Type: ${conversationType}, Messages: ${response.conversation?.messageCount}, Compliance: ${JSON.stringify(response.compliance)}`);

    } catch (error) {
      console.error('❌ Error in chat command:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor(BRAND_COLORS.ERROR)
        .setTitle('❌ Unexpected Chat Error')
        .setDescription('An unexpected error occurred during the conversation.')
        .addFields(
          {
            name: '🔄 What you can do',
            value: [
              '• Try sending your message again',
              '• Use `/chat view_context:true` to check conversation status',
              '• Use `/clear-context` if the conversation seems stuck',
              '• Contact a moderator if the problem persists'
            ].join('\n'),
            inline: false
          },
          {
            name: '💡 Alternative',
            value: 'You can always have conversations in the community channels where other members can help!',
            inline: false
          }
        )
        .setFooter({
          text: 'GrowmiesNJ • AI Chat Error',
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
        console.error('❌ Failed to send chat error response:', followUpError);
      }
    }
  },

  /**
   * Show conversation context and statistics
   */
  async showConversationContext(interaction, llmService) {
    try {
      const stats = await llmService.getConversationStats(
        interaction.user.id,
        interaction.guild.id
      );

      if (!stats.success) {
        throw new Error(stats.error || 'Failed to get conversation stats');
      }

      const contextEmbed = new EmbedBuilder()
        .setColor(BRAND_COLORS.PRIMARY_GREEN)
        .setTitle('📊 Your Conversation Context')
        .setDescription('Here\'s information about your current AI conversations in this server.')
        .addFields(
          {
            name: '🤖 AI Service Status',
            value: stats.aiAvailable ? '✅ Available' : '❌ Unavailable',
            inline: true
          },
          {
            name: '💬 Active Conversations',
            value: stats.stats.totalConversations?.toString() || '0',
            inline: true
          },
          {
            name: '📝 Total Messages',
            value: stats.stats.totalMessages?.toString() || '0',
            inline: true
          },
          {
            name: '🔢 Tokens Used',
            value: stats.stats.totalTokens?.toString() || '0',
            inline: true
          },
          {
            name: '🌿 Cannabis Conversations',
            value: stats.stats.cannabisConversations?.toString() || '0',
            inline: true
          },
          {
            name: '🕒 Last Activity',
            value: stats.stats.lastActivity || 'Never',
            inline: true
          }
        );

      // Add preferences information
      if (stats.preferences) {
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
            name: '⚙️ Your Preferences',
            value: prefsInfo.join('\n'),
            inline: false
          });
        }
      }

      // Add usage tips
      contextEmbed.addFields({
        name: '💡 Context Tips',
        value: [
          '• Each channel maintains separate conversation context',
          '• Cannabis conversations require 21+ verification',
          '• Use `/clear-context` to start fresh conversations',
          '• Use `/ai-settings` to customize your AI preferences',
          '• Private conversations (`private:true`) are only visible to you'
        ].join('\n'),
        inline: false
      });

      contextEmbed.setFooter({
        text: 'GrowmiesNJ • AI Conversation Context',
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

      await interaction.editReply({ embeds: [contextEmbed] });

    } catch (error) {
      console.error('Error showing conversation context:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor(BRAND_COLORS.ERROR)
        .setTitle('❌ Context Error')
        .setDescription('Unable to retrieve conversation context information.')
        .addFields({
          name: '🔄 Try Again',
          value: 'Please try again or contact support if the issue persists.',
          inline: false
        })
        .setFooter({
          text: 'GrowmiesNJ • Context Error',
          iconURL: interaction.client.user.displayAvatarURL()
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },

  /**
   * Get embed color for conversation type
   */
  getEmbedColorForType(type) {
    switch (type) {
      case 'cannabis_education':
        return BRAND_COLORS.PRIMARY_GREEN;
      case 'strain_advice':
        return '#9D4EDD'; // Purple for strains
      case 'grow_tips':
        return '#52B788'; // Green for growing
      case 'legal_info':
        return '#F77F00'; // Orange for legal
      default:
        return BRAND_COLORS.ACCENT_BLUE;
    }
  },

  /**
   * Get embed title for conversation type
   */
  getEmbedTitleForType(type) {
    switch (type) {
      case 'cannabis_education':
        return '🌿 Cannabis Education Chat';
      case 'strain_advice':
        return '🧬 Strain Discussion Chat';
      case 'grow_tips':
        return '🌱 Growing Discussion Chat';
      case 'legal_info':
        return '⚖️ Legal Discussion Chat';
      default:
        return '💬 AI Chat Assistant';
    }
  },

  /**
   * Get display name for conversation type
   */
  getTypeDisplayName(type) {
    switch (type) {
      case 'cannabis_education':
        return '🌿 Cannabis Education';
      case 'strain_advice':
        return '🧬 Strain Discussion';
      case 'grow_tips':
        return '🌱 Growing Discussion';
      case 'legal_info':
        return '⚖️ Legal Discussion';
      default:
        return '💬 General Chat';
    }
  }
};