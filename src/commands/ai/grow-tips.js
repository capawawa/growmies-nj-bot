/**
 * Grow Tips Command for GrowmiesNJ Discord Bot
 * 
 * LLM Chat Integration: Cannabis cultivation advice with AI assistance and 21+ verification
 * Provides growing tips, cultivation techniques, and compliance-filtered horticultural guidance
 */

const { SlashCommandBuilder, EmbedBuilder, InteractionContextType } = require('discord.js');
const LLMService = require('../../services/llmService');
const { WelcomeEmbeds, BRAND_COLORS } = require('../../utils/embeds');
const { AgeVerificationHelper } = require('../../utils/ageVerificationHelper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('grow-tips')
    .setDescription('🌱 Get AI-powered cannabis cultivation tips and growing advice (21+ required)')
    .setContexts(InteractionContextType.Guild)
    .addStringOption(option =>
      option
        .setName('topic')
        .setDescription('What cultivation topic do you need help with?')
        .setRequired(true)
        .setMinLength(5)
        .setMaxLength(200)
    )
    .addStringOption(option =>
      option
        .setName('grow_stage')
        .setDescription('What stage of growth are you asking about?')
        .setRequired(false)
        .addChoices(
          { name: '🌱 Seedling & Germination', value: 'seedling' },
          { name: '🌿 Vegetative Growth', value: 'vegetative' },
          { name: '🌸 Flowering Stage', value: 'flowering' },
          { name: '🌾 Harvest & Curing', value: 'harvest' },
          { name: '🏠 General Indoor Growing', value: 'indoor' },
          { name: '☀️ Outdoor Growing', value: 'outdoor' },
          { name: '🔧 Equipment & Setup', value: 'equipment' }
        )
    )
    .addStringOption(option =>
      option
        .setName('experience_level')
        .setDescription('Your growing experience level')
        .setRequired(false)
        .addChoices(
          { name: '🌱 Beginner (New to growing)', value: 'beginner' },
          { name: '🌿 Intermediate (Some experience)', value: 'intermediate' },
          { name: '🌳 Advanced (Experienced grower)', value: 'advanced' }
        )
    )
    .addBooleanOption(option =>
      option
        .setName('include_troubleshooting')
        .setDescription('Include troubleshooting and problem-solving advice')
        .setRequired(false)
    )
    .addBooleanOption(option =>
      option
        .setName('private')
        .setDescription('Make the response private (only you can see it)')
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      const topic = interaction.options.getString('topic');
      const growStage = interaction.options.getString('grow_stage') || 'general';
      const experienceLevel = interaction.options.getString('experience_level') || 'intermediate';
      const includeTroubleshooting = interaction.options.getBoolean('include_troubleshooting') || false;
      const isPrivate = interaction.options.getBoolean('private') || false;

      // Log the grow tips request
      console.log(`🌱 Grow tips command executed by ${interaction.user.tag}: "${topic.substring(0, 50)}..." (Stage: ${growStage}, Level: ${experienceLevel})`);

      await interaction.deferReply({ ephemeral: isPrivate });

      // Initialize LLM service
      const llmService = new LLMService();

      // Check if AI service is available
      if (!llmService.isOpenAIAvailable()) {
        const unavailableEmbed = new EmbedBuilder()
          .setColor(BRAND_COLORS.WARNING)
          .setTitle('🤖 AI Cultivation Advisory Unavailable')
          .setDescription('The AI cultivation advisory service is currently not available. The service may not be configured or dependencies may be missing.')
          .addFields(
            {
              name: '🔧 Administrator Note',
              value: 'Please ensure OpenAI API key is configured and dependencies are installed:\n```\nnpm install openai tiktoken natural\n```',
              inline: false
            },
            {
              name: '🌱 Alternative Growing Resources',
              value: [
                '• Ask experienced growers in the community channels',
                '• Consult cannabis cultivation guides and books',
                '• Check growing forums and online communities',
                '• Visit local hydroponic stores for advice',
                '• Follow reputable cultivation YouTube channels'
              ].join('\n'),
              inline: false
            }
          )
          .setFooter({
            text: 'GrowmiesNJ • Cannabis Cultivation Advisory',
            iconURL: interaction.client.user.displayAvatarURL()
          })
          .setTimestamp();

        return await interaction.editReply({ embeds: [unavailableEmbed] });
      }

      // Build detailed cultivation inquiry prompt
      const cultivationInquiry = this.buildCultivationInquiry(
        topic, 
        growStage, 
        experienceLevel, 
        includeTroubleshooting
      );

      // Prepare request data for grow tips (requires 21+ verification)
      const requestData = {
        userId: interaction.user.id,
        guildId: interaction.guild.id,
        channelId: interaction.channel.id,
        message: cultivationInquiry,
        conversationType: 'grow_tips',
        requiresAgeVerification: true, // Always required for cultivation advice
      };

      // Process the grow tips request
      const response = await llmService.processChat(
        requestData,
        interaction.user,
        interaction.guild
      );

      if (!response.success) {
        // Handle age verification requirement
        if (response.requiresAgeVerification) {
          const ageVerificationEmbed = new EmbedBuilder()
            .setColor(BRAND_COLORS.WARNING)
            .setTitle('🔞 21+ Age Verification Required')
            .setDescription('Cannabis cultivation advice requires 21+ age verification for compliance with New Jersey cannabis laws.')
            .addFields(
              {
                name: '🌱 Why Age Verification is Required',
                value: [
                  '• Cannabis cultivation is regulated under NJ law',
                  '• Growing advice involves controlled substance cultivation',
                  '• Legal cultivation requires 21+ age in New Jersey',
                  '• Equipment and techniques are cannabis-specific',
                  '• Compliance protects both users and the community'
                ].join('\n'),
                inline: false
              },
              {
                name: '✅ Get Verified for Growing Access',
                value: 'Contact a moderator to complete your 21+ age verification and unlock:\n• Detailed cultivation techniques\n• Stage-specific growing advice\n• Equipment recommendations\n• Troubleshooting and problem-solving\n• Legal compliance guidance',
                inline: false
              },
              {
                name: '🌿 General Horticulture',
                value: 'While waiting for verification, you can research general horticulture and plant growing techniques that apply to many plants.',
                inline: false
              }
            )
            .setFooter({
              text: 'GrowmiesNJ • Cannabis Compliance • 21+ Verification Required',
              iconURL: interaction.guild.iconURL({ dynamic: true })
            })
            .setTimestamp();

          return await interaction.editReply({ embeds: [ageVerificationEmbed] });
        }

        // General error handling
        const errorEmbed = new EmbedBuilder()
          .setColor(BRAND_COLORS.ERROR)
          .setTitle('❌ Cultivation Advisory Error')
          .setDescription(response.userMessage || 'An error occurred while retrieving cultivation advice.')
          .addFields({
            name: '🔄 Try Again',
            value: 'Please try your cultivation inquiry again or contact support if the issue persists.',
            inline: false
          })
          .setFooter({
            text: 'GrowmiesNJ • Cultivation Advisory Error',
            iconURL: interaction.client.user.displayAvatarURL()
          })
          .setTimestamp();

        return await interaction.editReply({ embeds: [errorEmbed] });
      }

      // Create cultivation advice embed
      const growTipsEmbed = new EmbedBuilder()
        .setColor('#52B788') // Green for growing
        .setTitle('🌱 Cannabis Cultivation Advice')
        .setDescription(response.response);

      // Add cultivation query details
      growTipsEmbed.addFields(
        {
          name: '🔍 Your Growing Question',
          value: topic.length > 150 ? topic.substring(0, 150) + '...' : topic,
          inline: false
        },
        {
          name: '📊 Query Details',
          value: `**Stage:** ${this.getStageDisplayName(growStage)}\n**Experience:** ${this.getExperienceDisplayName(experienceLevel)}${includeTroubleshooting ? '\n**Troubleshooting:** Included' : ''}`,
          inline: true
        }
      );

      // Add compliance and verification status
      if (response.compliance) {
        const complianceInfo = [];
        complianceInfo.push('🔞 21+ verification confirmed');
        complianceInfo.push('🌱 Cannabis cultivation content');
        if (response.compliance.filtered) {
          complianceInfo.push('🛡️ Content filtered for compliance');
        }

        growTipsEmbed.addFields({
          name: '🛡️ Compliance Status',
          value: complianceInfo.join('\n'),
          inline: true
        });
      }

      // Add conversation stats
      if (response.conversation) {
        growTipsEmbed.addFields({
          name: '📈 Advisory Stats',
          value: `**Session Messages:** ${response.conversation.messageCount}\n**Tokens Used:** ${response.conversation.tokensUsed}`,
          inline: true
        });
      }

      // Add important disclaimers for cultivation advice
      growTipsEmbed.addFields({
        name: '⚠️ Important Legal Disclaimers',
        value: [
          '• Follow all New Jersey cannabis cultivation laws',
          '• Ensure you have proper licenses and permits',
          '• Home cultivation limits apply (check current NJ law)',
          '• This advice is for educational purposes only',
          '• Cultivation methods may vary by location and setup',
          '• Always prioritize safety and legal compliance'
        ].join('\n'),
        inline: false
      });

      growTipsEmbed.setFooter({
        text: `GrowmiesNJ • Cannabis Cultivation Advisory • ${isPrivate ? 'Private' : 'Public'} • 21+ Verified`,
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

      // Send the main response
      await interaction.editReply({ embeds: [growTipsEmbed] });

      // Send additional parts if the response was too long
      if (response.additionalParts && response.additionalParts.length > 0) {
        for (let i = 0; i < response.additionalParts.length; i++) {
          const additionalEmbed = new EmbedBuilder()
            .setColor('#52B788')
            .setTitle(`🌱 Cultivation Advice - Additional Tips (${i + 2})`)
            .setDescription(response.additionalParts[i])
            .setFooter({
              text: 'GrowmiesNJ • Cultivation Advisory (Continued)',
              iconURL: interaction.user.displayAvatarURL()
            })
            .setTimestamp();

          await interaction.followUp({ 
            embeds: [additionalEmbed], 
            ephemeral: isPrivate 
          });
        }
      }

      // Add cultivation-specific follow-up suggestions
      if (response.suggestions && response.suggestions.followUp) {
        const suggestionsEmbed = new EmbedBuilder()
          .setColor(BRAND_COLORS.ACCENT_BLUE)
          .setTitle('🌿 Related Cultivation Topics')
          .setDescription('Explore more cultivation techniques and growing advice:')
          .addFields({
            name: '🔍 Suggested Follow-ups',
            value: response.suggestions.followUp.map(suggestion => `• ${suggestion}`).join('\n'),
            inline: false
          })
          .addFields({
            name: '🛠️ Available Commands',
            value: [
              '• `/strain-advice` - Get strain-specific growing info',
              '• `/legal-info` - Cannabis cultivation laws',
              '• `/chat` - Continue the cultivation discussion',
              '• `/ask` - Ask specific growing questions'
            ].join('\n'),
            inline: false
          })
          .addFields({
            name: '📚 Cultivation Resources',
            value: [
              '• Check grow journals in community channels',
              '• Share your growing experiences',
              '• Ask for equipment recommendations',
              '• Discuss troubleshooting with other growers'
            ].join('\n'),
            inline: false
          })
          .setFooter({
            text: 'GrowmiesNJ • Cultivation Learning Suggestions',
            iconURL: interaction.client.user.displayAvatarURL()
          })
          .setTimestamp();

        await interaction.followUp({ 
          embeds: [suggestionsEmbed], 
          ephemeral: true 
        });
      }

      // Add reactions for cultivation advice
      if (!isPrivate) {
        try {
          const message = await interaction.fetchReply();
          const growReactions = ['🌱', '🌿', '💚', '👨‍🌾', '📚'];
          for (const reaction of growReactions) {
            await message.react(reaction);
          }
        } catch (reactionError) {
          console.warn('Failed to add grow tips reactions:', reactionError.message);
        }
      }

      console.log(`✅ Grow tips completed successfully for ${interaction.user.tag} - Topic: ${topic.substring(0, 30)}, Stage: ${growStage}, Level: ${experienceLevel}, Compliance: ${JSON.stringify(response.compliance)}`);

    } catch (error) {
      console.error('❌ Error in grow-tips command:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor(BRAND_COLORS.ERROR)
        .setTitle('❌ Unexpected Cultivation Advisory Error')
        .setDescription('An unexpected error occurred while retrieving cultivation advice.')
        .addFields(
          {
            name: '🔄 What you can do',
            value: [
              '• Rephrase your growing question and try again',
              '• Try a different grow stage or experience level',
              '• Use `/ask` for general cannabis questions',
              '• Contact a moderator if the problem persists'
            ].join('\n'),
            inline: false
          },
          {
            name: '🌱 Alternative Resources',
            value: [
              '• Ask experienced growers in community channels',
              '• Check cannabis cultivation guides online',
              '• Visit local hydroponic stores for advice',
              '• Join cannabis growing forums and communities'
            ].join('\n'),
            inline: false
          }
        )
        .setFooter({
          text: 'GrowmiesNJ • Cultivation Advisory Error',
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
        console.error('❌ Failed to send grow tips error response:', followUpError);
      }
    }
  },

  /**
   * Build a detailed cultivation inquiry prompt
   */
  buildCultivationInquiry(topic, growStage, experienceLevel, includeTroubleshooting) {
    let inquiry = `I need cannabis cultivation advice about: ${topic}.`;

    // Add experience level context
    switch (experienceLevel) {
      case 'beginner':
        inquiry += ' I am new to cannabis growing, so please provide beginner-friendly explanations with step-by-step guidance.';
        break;
      case 'intermediate':
        inquiry += ' I have some growing experience but want to improve my techniques and knowledge.';
        break;
      case 'advanced':
        inquiry += ' I am an experienced grower looking for advanced techniques and optimization strategies.';
        break;
    }

    // Add grow stage specific context
    switch (growStage) {
      case 'seedling':
        inquiry += ' Focus on seedling care, germination techniques, and early plant development.';
        break;
      case 'vegetative':
        inquiry += ' Focus on vegetative growth stage including nutrition, lighting, training techniques, and plant health.';
        break;
      case 'flowering':
        inquiry += ' Focus on flowering stage including bloom nutrition, light cycles, environmental control, and bud development.';
        break;
      case 'harvest':
        inquiry += ' Focus on harvest timing, curing techniques, drying methods, and post-harvest processing.';
        break;
      case 'indoor':
        inquiry += ' Focus on indoor growing setups, equipment, environmental control, and space optimization.';
        break;
      case 'outdoor':
        inquiry += ' Focus on outdoor cultivation including weather considerations, soil preparation, and natural growing methods.';
        break;
      case 'equipment':
        inquiry += ' Focus on growing equipment recommendations, setup advice, and technical considerations.';
        break;
      default:
        inquiry += ' Provide comprehensive growing advice covering relevant cultivation aspects.';
    }

    // Add troubleshooting if requested
    if (includeTroubleshooting) {
      inquiry += ' Please include troubleshooting advice, common problems to watch for, and solutions for potential issues.';
    }

    // Add compliance and legal requirements
    inquiry += ' Please ensure all advice complies with New Jersey cannabis laws, includes safety considerations, and emphasizes legal cultivation practices. Include appropriate disclaimers about following local laws and regulations.';

    return inquiry;
  },

  /**
   * Get display name for grow stage
   */
  getStageDisplayName(stage) {
    switch (stage) {
      case 'seedling':
        return '🌱 Seedling & Germination';
      case 'vegetative':
        return '🌿 Vegetative Growth';
      case 'flowering':
        return '🌸 Flowering Stage';
      case 'harvest':
        return '🌾 Harvest & Curing';
      case 'indoor':
        return '🏠 Indoor Growing';
      case 'outdoor':
        return '☀️ Outdoor Growing';
      case 'equipment':
        return '🔧 Equipment & Setup';
      default:
        return '🌱 General Growing';
    }
  },

  /**
   * Get display name for experience level
   */
  getExperienceDisplayName(level) {
    switch (level) {
      case 'beginner':
        return '🌱 Beginner';
      case 'intermediate':
        return '🌿 Intermediate';
      case 'advanced':
        return '🌳 Advanced';
      default:
        return '🌿 Intermediate';
    }
  }
};