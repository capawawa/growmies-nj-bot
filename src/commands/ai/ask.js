/**
 * Ask Command for GrowmiesNJ Discord Bot
 * 
 * LLM Chat Integration: AI assistant for one-off questions with cannabis compliance
 * Features age verification, content filtering, and educational cannabis information
 */

const { SlashCommandBuilder, EmbedBuilder, InteractionContextType } = require('discord.js');
const LLMService = require('../../services/llmService');
const { WelcomeEmbeds, BRAND_COLORS } = require('../../utils/embeds');
const { AgeVerificationHelper } = require('../../utils/ageVerificationHelper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ask')
    .setDescription('🤖 Ask the AI assistant a question with cannabis compliance')
    .setContexts(InteractionContextType.Guild)
    .addStringOption(option =>
      option
        .setName('question')
        .setDescription('Your question for the AI assistant')
        .setRequired(true)
        .setMinLength(5)
        .setMaxLength(2000)
    )
    .addStringOption(option =>
      option
        .setName('type')
        .setDescription('Type of question for specialized assistance')
        .setRequired(false)
        .addChoices(
          { name: '💬 General Question', value: 'general' },
          { name: '🌿 Cannabis Education', value: 'cannabis_education' },
          { name: '🧬 Strain Information', value: 'strain_advice' },
          { name: '🌱 Growing Tips', value: 'grow_tips' },
          { name: '⚖️ Legal Information', value: 'legal_info' }
        )
    )
    .addBooleanOption(option =>
      option
        .setName('private')
        .setDescription('Make the response private (only you can see it)')
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      const question = interaction.options.getString('question');
      const questionType = interaction.options.getString('type') || 'general';
      const isPrivate = interaction.options.getBoolean('private') || false;

      // Log the AI interaction attempt
      console.log(`🤖 Ask command executed by ${interaction.user.tag}: "${question.substring(0, 50)}..." (Type: ${questionType})`);

      await interaction.deferReply({ ephemeral: isPrivate });

      // Initialize LLM service
      const llmService = new LLMService();

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
              value: 'You can still ask questions in the community channels where other members can help!',
              inline: false
            }
          )
          .setFooter({
            text: 'GrowmiesNJ • AI Assistant',
            iconURL: interaction.client.user.displayAvatarURL()
          })
          .setTimestamp();

        return await interaction.editReply({ embeds: [unavailableEmbed] });
      }

      // Check age verification for cannabis content using existing system
      const requiresAgeVerification = ['cannabis_education', 'strain_advice', 'grow_tips', 'legal_info'].includes(questionType);
      
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
            'ai-ask',
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
        message: question,
        conversationType: questionType,
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
          .setTitle('❌ AI Assistant Error')
          .setDescription(response.userMessage || 'An error occurred while processing your question.')
          .addFields({
            name: '🔄 Try Again',
            value: 'Please try asking your question again or contact support if the issue persists.',
            inline: false
          })
          .setFooter({
            text: 'GrowmiesNJ • AI Assistant Error',
            iconURL: interaction.client.user.displayAvatarURL()
          })
          .setTimestamp();

        return await interaction.editReply({ embeds: [errorEmbed] });
      }

      // Create success response embed
      const responseEmbed = new EmbedBuilder()
        .setColor(this.getEmbedColorForType(questionType))
        .setTitle(this.getEmbedTitleForType(questionType))
        .setDescription(response.response)
        .addFields(
          {
            name: '❓ Your Question',
            value: question.length > 100 ? question.substring(0, 100) + '...' : question,
            inline: false
          }
        );

      // Add compliance information if applicable
      if (response.compliance) {
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

        if (complianceInfo.length > 0) {
          responseEmbed.addFields({
            name: '🛡️ Compliance Status',
            value: complianceInfo.join('\n'),
            inline: true
          });
        }
      }

      // Add conversation info
      if (response.conversation) {
        responseEmbed.addFields({
          name: '💬 Conversation Stats',
          value: `Messages: ${response.conversation.messageCount}\nTokens Used: ${response.conversation.tokensUsed}`,
          inline: true
        });
      }

      // Add question type badge
      responseEmbed.addFields({
        name: '🏷️ Question Type',
        value: this.getTypeDisplayName(questionType),
        inline: true
      });

      responseEmbed.setFooter({
        text: `GrowmiesNJ • AI Assistant • ${isPrivate ? 'Private Response' : 'Public Response'}`,
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

      // Send the main response
      await interaction.editReply({ embeds: [responseEmbed] });

      // Send additional parts if the response was too long
      if (response.additionalParts && response.additionalParts.length > 0) {
        for (let i = 0; i < response.additionalParts.length; i++) {
          const additionalEmbed = new EmbedBuilder()
            .setColor(this.getEmbedColorForType(questionType))
            .setTitle(`🤖 AI Response (Continued ${i + 2})`)
            .setDescription(response.additionalParts[i])
            .setFooter({
              text: 'GrowmiesNJ • AI Assistant (Continued)',
              iconURL: interaction.user.displayAvatarURL()
            })
            .setTimestamp();

          await interaction.followUp({ 
            embeds: [additionalEmbed], 
            ephemeral: isPrivate 
          });
        }
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

      console.log(`✅ Ask command completed successfully for ${interaction.user.tag} - Type: ${questionType}, Compliance: ${JSON.stringify(response.compliance)}`);

    } catch (error) {
      console.error('❌ Error in ask command:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor(BRAND_COLORS.ERROR)
        .setTitle('❌ Unexpected Error')
        .setDescription('An unexpected error occurred while processing your question.')
        .addFields(
          {
            name: '🔄 What you can do',
            value: [
              '• Try asking your question again',
              '• Use simpler language or break up complex questions',
              '• Contact a moderator if the problem persists'
            ].join('\n'),
            inline: false
          },
          {
            name: '💡 Alternative',
            value: 'You can always ask questions in the community channels where other members can help!',
            inline: false
          }
        )
        .setFooter({
          text: 'GrowmiesNJ • AI Assistant Error',
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
        console.error('❌ Failed to send ask error response:', followUpError);
      }
    }
  },

  /**
   * Get embed color for question type
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
   * Get embed title for question type
   */
  getEmbedTitleForType(type) {
    switch (type) {
      case 'cannabis_education':
        return '🌿 Cannabis Education Response';
      case 'strain_advice':
        return '🧬 Strain Information Response';
      case 'grow_tips':
        return '🌱 Growing Tips Response';
      case 'legal_info':
        return '⚖️ Legal Information Response';
      default:
        return '🤖 AI Assistant Response';
    }
  },

  /**
   * Get display name for question type
   */
  getTypeDisplayName(type) {
    switch (type) {
      case 'cannabis_education':
        return '🌿 Cannabis Education';
      case 'strain_advice':
        return '🧬 Strain Information';
      case 'grow_tips':
        return '🌱 Growing Tips';
      case 'legal_info':
        return '⚖️ Legal Information';
      default:
        return '💬 General Question';
    }
  }
};