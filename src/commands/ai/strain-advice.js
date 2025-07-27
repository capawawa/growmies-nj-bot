/**
 * Strain Advice Command for GrowmiesNJ Discord Bot
 * 
 * LLM Chat Integration: Cannabis strain information with AI assistance and 21+ verification
 * Provides detailed strain data, effects, growing tips, and compliance-filtered responses
 */

const { SlashCommandBuilder, EmbedBuilder, InteractionContextType, PermissionFlagsBits } = require('discord.js');
const LLMService = require('../../services/llmService');
const { WelcomeEmbeds, BRAND_COLORS } = require('../../utils/embeds');
const { AgeVerificationHelper } = require('../../utils/ageVerificationHelper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('strain-advice')
    .setDescription('🧬 Get AI-powered cannabis strain information and advice (21+ required)')
    .setContexts(InteractionContextType.Guild)
    .addStringOption(option =>
      option
        .setName('strain')
        .setDescription('Name of the cannabis strain to get information about')
        .setRequired(true)
        .setMinLength(2)
        .setMaxLength(100)
    )
    .addStringOption(option =>
      option
        .setName('focus')
        .setDescription('What aspect of the strain are you most interested in?')
        .setRequired(false)
        .addChoices(
          { name: '🌿 General Information', value: 'general' },
          { name: '🧪 Effects & Potency', value: 'effects' },
          { name: '🌱 Growing Information', value: 'growing' },
          { name: '🧬 Genetics & Lineage', value: 'genetics' },
          { name: '🎯 Medical Properties', value: 'medical' },
          { name: '👃 Flavor & Aroma', value: 'flavor' }
        )
    )
    .addBooleanOption(option =>
      option
        .setName('growing_tips')
        .setDescription('Include cultivation tips and growing advice')
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
      const strainName = interaction.options.getString('strain');
      const focus = interaction.options.getString('focus') || 'general';
      const includeGrowingTips = interaction.options.getBoolean('growing_tips') || false;
      const isPrivate = interaction.options.getBoolean('private') || false;

      // Log the strain advice request
      console.log(`🧬 Strain advice command executed by ${interaction.user.tag}: "${strainName}" (Focus: ${focus})`);

      await interaction.deferReply({ ephemeral: isPrivate });

      // Initialize LLM service
      const llmService = new LLMService();

      // Check if AI service is available
      if (!llmService.isOpenAIAvailable()) {
        const unavailableEmbed = new EmbedBuilder()
          .setColor(BRAND_COLORS.WARNING)
          .setTitle('🤖 AI Strain Database Unavailable')
          .setDescription('The AI strain advisory service is currently not available. The service may not be configured or dependencies may be missing.')
          .addFields(
            {
              name: '🔧 Administrator Note',
              value: 'Please ensure OpenAI API key is configured and dependencies are installed:\n```\nnpm install openai tiktoken natural\n```',
              inline: false
            },
            {
              name: '💡 Alternative Resources',
              value: [
                '• Ask experienced growers in the community channels',
                '• Check strain databases like Leafly or AllBud',
                '• Consult cannabis cultivation guides',
                '• Visit local dispensaries for strain information'
              ].join('\n'),
              inline: false
            }
          )
          .setFooter({
            text: 'GrowmiesNJ • Cannabis Strain Advisory',
            iconURL: interaction.client.user.displayAvatarURL()
          })
          .setTimestamp();

        return await interaction.editReply({ embeds: [unavailableEmbed] });
      }

      // Build detailed strain inquiry prompt
      const strainInquiry = this.buildStrainInquiry(strainName, focus, includeGrowingTips);

      // Prepare request data for strain advice (requires 21+ verification)
      const requestData = {
        userId: interaction.user.id,
        guildId: interaction.guild.id,
        channelId: interaction.channel.id,
        message: strainInquiry,
        conversationType: 'strain_advice',
        requiresAgeVerification: true, // Always required for strain information
      };

      // Process the strain advice request
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
            .setDescription('Cannabis strain information requires 21+ age verification for compliance with New Jersey cannabis laws.')
            .addFields(
              {
                name: '🌿 Why Age Verification is Required',
                value: [
                  '• Cannabis strain information is considered cannabis content',
                  '• New Jersey law requires 21+ for cannabis discussions',
                  '• Strain data includes THC/CBD content and effects',
                  '• Growing information involves cultivation knowledge',
                  '• Compliance protects both users and the community'
                ].join('\n'),
                inline: false
              },
              {
                name: '✅ Get Verified for Strain Access',
                value: 'Contact a moderator to complete your 21+ age verification and unlock:\n• Detailed strain information\n• Growing tips and cultivation advice\n• Effects and medical properties\n• Genetics and lineage data',
                inline: false
              },
              {
                name: '📚 General Cannabis Education',
                value: 'While waiting for verification, you can use `/ask` for general cannabis education that doesn\'t require age verification.',
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
          .setTitle('❌ Strain Advisory Error')
          .setDescription(response.userMessage || 'An error occurred while retrieving strain information.')
          .addFields({
            name: '🔄 Try Again',
            value: 'Please try your strain inquiry again or contact support if the issue persists.',
            inline: false
          })
          .setFooter({
            text: 'GrowmiesNJ • Strain Advisory Error',
            iconURL: interaction.client.user.displayAvatarURL()
          })
          .setTimestamp();

        return await interaction.editReply({ embeds: [errorEmbed] });
      }

      // Create strain information embed
      const strainEmbed = new EmbedBuilder()
        .setColor('#9D4EDD') // Purple for strain information
        .setTitle(`🧬 ${strainName} - Strain Information`)
        .setDescription(response.response);

      // Add strain query details
      strainEmbed.addFields(
        {
          name: '🔍 Your Inquiry',
          value: `**Strain:** ${strainName}\n**Focus:** ${this.getFocusDisplayName(focus)}${includeGrowingTips ? '\n**Growing Tips:** Included' : ''}`,
          inline: true
        }
      );

      // Add compliance and verification status
      if (response.compliance) {
        const complianceInfo = [];
        complianceInfo.push('🔞 21+ verification confirmed');
        complianceInfo.push('🌿 Cannabis strain content');
        if (response.compliance.filtered) {
          complianceInfo.push('🛡️ Content filtered for compliance');
        }

        strainEmbed.addFields({
          name: '🛡️ Compliance Status',
          value: complianceInfo.join('\n'),
          inline: true
        });
      }

      // Add conversation stats
      if (response.conversation) {
        strainEmbed.addFields({
          name: '📊 Advisory Stats',
          value: `**Session Messages:** ${response.conversation.messageCount}\n**Tokens Used:** ${response.conversation.tokensUsed}`,
          inline: true
        });
      }

      // Add important disclaimers for strain information
      strainEmbed.addFields({
        name: '⚠️ Important Disclaimers',
        value: [
          '• Strain effects may vary by individual and cultivation',
          '• This information is for educational purposes only',
          '• Not medical advice - consult healthcare professionals',
          '• Follow all local and state cannabis laws',
          '• New Jersey residents: comply with state regulations'
        ].join('\n'),
        inline: false
      });

      strainEmbed.setFooter({
        text: `GrowmiesNJ • Cannabis Strain Advisory • ${isPrivate ? 'Private' : 'Public'} • 21+ Verified`,
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

      // Send the main response
      await interaction.editReply({ embeds: [strainEmbed] });

      // Send additional parts if the response was too long
      if (response.additionalParts && response.additionalParts.length > 0) {
        for (let i = 0; i < response.additionalParts.length; i++) {
          const additionalEmbed = new EmbedBuilder()
            .setColor('#9D4EDD')
            .setTitle(`🧬 ${strainName} - Additional Information (${i + 2})`)
            .setDescription(response.additionalParts[i])
            .setFooter({
              text: 'GrowmiesNJ • Strain Advisory (Continued)',
              iconURL: interaction.user.displayAvatarURL()
            })
            .setTimestamp();

          await interaction.followUp({ 
            embeds: [additionalEmbed], 
            ephemeral: isPrivate 
          });
        }
      }

      // Add follow-up suggestions specific to strain advice
      if (response.suggestions && response.suggestions.followUp) {
        const suggestionsEmbed = new EmbedBuilder()
          .setColor(BRAND_COLORS.ACCENT_BLUE)
          .setTitle('🌿 Related Strain Topics')
          .setDescription(`Explore more about ${strainName} or similar strains:`)
          .addFields({
            name: '🔍 Suggested Follow-ups',
            value: response.suggestions.followUp.map(suggestion => `• ${suggestion}`).join('\n'),
            inline: false
          })
          .addFields({
            name: '🛠️ Available Commands',
            value: [
              '• `/grow-tips` - Get cultivation advice',
              '• `/legal-info` - Cannabis law information',
              '• `/chat` - Continue the conversation',
              '• `/ask` - Ask specific questions'
            ].join('\n'),
            inline: false
          })
          .setFooter({
            text: 'GrowmiesNJ • Strain Exploration Suggestions',
            iconURL: interaction.client.user.displayAvatarURL()
          })
          .setTimestamp();

        await interaction.followUp({ 
          embeds: [suggestionsEmbed], 
          ephemeral: true 
        });
      }

      // Add reactions for strain information
      if (!isPrivate) {
        try {
          const message = await interaction.fetchReply();
          const strainReactions = ['🧬', '🌿', '👍', '📚'];
          for (const reaction of strainReactions) {
            await message.react(reaction);
          }
        } catch (reactionError) {
          console.warn('Failed to add strain advice reactions:', reactionError.message);
        }
      }

      console.log(`✅ Strain advice completed successfully for ${interaction.user.tag} - Strain: ${strainName}, Focus: ${focus}, Compliance: ${JSON.stringify(response.compliance)}`);

    } catch (error) {
      console.error('❌ Error in strain-advice command:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor(BRAND_COLORS.ERROR)
        .setTitle('❌ Unexpected Strain Advisory Error')
        .setDescription('An unexpected error occurred while retrieving strain information.')
        .addFields(
          {
            name: '🔄 What you can do',
            value: [
              '• Check the strain name spelling and try again',
              '• Try a different focus area or simpler query',
              '• Use `/ask` for general cannabis questions',
              '• Contact a moderator if the problem persists'
            ].join('\n'),
            inline: false
          },
          {
            name: '🌿 Alternative Resources',
            value: [
              '• Ask experienced growers in community channels',
              '• Check online strain databases',
              '• Visit local dispensaries for strain information'
            ].join('\n'),
            inline: false
          }
        )
        .setFooter({
          text: 'GrowmiesNJ • Strain Advisory Error',
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
        console.error('❌ Failed to send strain advice error response:', followUpError);
      }
    }
  },

  /**
   * Build a detailed strain inquiry prompt
   */
  buildStrainInquiry(strainName, focus, includeGrowingTips) {
    let inquiry = `Please provide detailed information about the cannabis strain "${strainName}".`;

    // Add focus-specific requests
    switch (focus) {
      case 'effects':
        inquiry += ' Focus on the effects, potency, THC/CBD content, and how users typically experience this strain.';
        break;
      case 'growing':
        inquiry += ' Focus on cultivation information including growing difficulty, yield expectations, flowering time, and optimal growing conditions.';
        break;
      case 'genetics':
        inquiry += ' Focus on the genetic lineage, parent strains, breeding history, and genetic characteristics.';
        break;
      case 'medical':
        inquiry += ' Focus on potential medical applications, terpene profiles, and therapeutic properties (educational purposes only, not medical advice).';
        break;
      case 'flavor':
        inquiry += ' Focus on the flavor profile, aroma characteristics, terpenes, and sensory experience.';
        break;
      default:
        inquiry += ' Provide comprehensive information covering effects, genetics, growing characteristics, and general strain profile.';
    }

    // Add growing tips if requested
    if (includeGrowingTips) {
      inquiry += ' Please include specific cultivation tips, growing techniques, and advice for successfully growing this strain.';
    }

    // Add compliance requirements
    inquiry += ' Please ensure all information is educational, compliant with cannabis laws, and includes appropriate disclaimers.';

    return inquiry;
  },

  /**
   * Get display name for focus area
   */
  getFocusDisplayName(focus) {
    switch (focus) {
      case 'effects':
        return '🧪 Effects & Potency';
      case 'growing':
        return '🌱 Growing Information';
      case 'genetics':
        return '🧬 Genetics & Lineage';
      case 'medical':
        return '🎯 Medical Properties';
      case 'flavor':
        return '👃 Flavor & Aroma';
      default:
        return '🌿 General Information';
    }
  }
};