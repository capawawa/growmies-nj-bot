/**
 * Legal Info Command for GrowmiesNJ Discord Bot
 * 
 * LLM Chat Integration: Cannabis legal information with AI assistance and 21+ verification
 * Provides New Jersey cannabis law guidance, compliance info, and legal disclaimers
 */

const { SlashCommandBuilder, EmbedBuilder, InteractionContextType } = require('discord.js');
const LLMService = require('../../services/llmService');
const { WelcomeEmbeds, BRAND_COLORS } = require('../../utils/embeds');
const { AgeVerificationHelper } = require('../../utils/ageVerificationHelper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('legal-info')
    .setDescription('⚖️ Get AI-powered cannabis legal information for New Jersey (21+ required)')
    .setContexts(InteractionContextType.Guild)
    .addStringOption(option =>
      option
        .setName('question')
        .setDescription('Your cannabis legal question (general information only)')
        .setRequired(true)
        .setMinLength(10)
        .setMaxLength(300)
    )
    .addStringOption(option =>
      option
        .setName('legal_area')
        .setDescription('What area of cannabis law are you asking about?')
        .setRequired(false)
        .addChoices(
          { name: '🏠 Home Cultivation', value: 'cultivation' },
          { name: '🏪 Dispensary & Purchase', value: 'dispensary' },
          { name: '🚗 Transportation & Travel', value: 'transportation' },
          { name: '🏢 Employment & Workplace', value: 'employment' },
          { name: '🏛️ Public Use & Consumption', value: 'public_use' },
          { name: '📋 Licensing & Permits', value: 'licensing' },
          { name: '⚖️ General NJ Cannabis Law', value: 'general' }
        )
    )
    .addBooleanOption(option =>
      option
        .setName('include_federal')
        .setDescription('Include federal law considerations')
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
      const question = interaction.options.getString('question');
      const legalArea = interaction.options.getString('legal_area') || 'general';
      const includeFederal = interaction.options.getBoolean('include_federal') || false;
      const isPrivate = interaction.options.getBoolean('private') || false;

      // Log the legal info request
      console.log(`⚖️ Legal info command executed by ${interaction.user.tag}: "${question.substring(0, 50)}..." (Area: ${legalArea})`);

      await interaction.deferReply({ ephemeral: isPrivate });

      // Initialize LLM service
      const llmService = new LLMService();

      // Check if AI service is available
      if (!llmService.isOpenAIAvailable()) {
        const unavailableEmbed = new EmbedBuilder()
          .setColor(BRAND_COLORS.WARNING)
          .setTitle('🤖 AI Legal Advisory Unavailable')
          .setDescription('The AI legal information service is currently not available. The service may not be configured or dependencies may be missing.')
          .addFields(
            {
              name: '🔧 Administrator Note',
              value: 'Please ensure OpenAI API key is configured and dependencies are installed:\n```\nnpm install openai tiktoken natural\n```',
              inline: false
            },
            {
              name: '⚖️ Alternative Legal Resources',
              value: [
                '• New Jersey Cannabis Regulatory Commission (NJ-CRC)',
                '• Official state cannabis law documentation',
                '• Consult with cannabis law attorneys',
                '• Visit official NJ.gov cannabis information',
                '• Contact local legal aid organizations'
              ].join('\n'),
              inline: false
            },
            {
              name: '🚨 Important Notice',
              value: 'For specific legal advice, always consult with qualified legal professionals. This service provides general information only.',
              inline: false
            }
          )
          .setFooter({
            text: 'GrowmiesNJ • Cannabis Legal Information',
            iconURL: interaction.client.user.displayAvatarURL()
          })
          .setTimestamp();

        return await interaction.editReply({ embeds: [unavailableEmbed] });
      }

      // Build detailed legal inquiry prompt
      const legalInquiry = this.buildLegalInquiry(question, legalArea, includeFederal);

      // Prepare request data for legal info (requires 21+ verification)
      const requestData = {
        userId: interaction.user.id,
        guildId: interaction.guild.id,
        channelId: interaction.channel.id,
        message: legalInquiry,
        conversationType: 'legal_info',
        requiresAgeVerification: true, // Always required for legal information
      };

      // Process the legal info request
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
            .setDescription('Cannabis legal information requires 21+ age verification for compliance with New Jersey cannabis laws.')
            .addFields(
              {
                name: '⚖️ Why Age Verification is Required',
                value: [
                  '• Cannabis legal information involves controlled substance law',
                  '• NJ cannabis laws apply specifically to 21+ individuals',
                  '• Legal compliance discussions require age verification',
                  '• Regulations and penalties vary by age group',
                  '• Responsible legal guidance requires verified adults'
                ].join('\n'),
                inline: false
              },
              {
                name: '✅ Get Verified for Legal Access',
                value: 'Contact a moderator to complete your 21+ age verification and unlock:\n• New Jersey cannabis law information\n• Compliance guidance and requirements\n• Legal considerations for cannabis activities\n• Current regulations and updates\n• General legal education resources',
                inline: false
              },
              {
                name: '📚 General Legal Resources',
                value: 'While waiting for verification, you can research general cannabis law through official NJ government websites and legal resources.',
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
          .setTitle('❌ Legal Information Error')
          .setDescription(response.userMessage || 'An error occurred while retrieving legal information.')
          .addFields({
            name: '🔄 Try Again',
            value: 'Please try your legal inquiry again or contact support if the issue persists.',
            inline: false
          })
          .setFooter({
            text: 'GrowmiesNJ • Legal Information Error',
            iconURL: interaction.client.user.displayAvatarURL()
          })
          .setTimestamp();

        return await interaction.editReply({ embeds: [errorEmbed] });
      }

      // Create legal information embed
      const legalInfoEmbed = new EmbedBuilder()
        .setColor('#F77F00') // Orange for legal information
        .setTitle('⚖️ Cannabis Legal Information')
        .setDescription(response.response);

      // Add legal query details
      legalInfoEmbed.addFields(
        {
          name: '🔍 Your Legal Question',
          value: question.length > 150 ? question.substring(0, 150) + '...' : question,
          inline: false
        },
        {
          name: '📊 Query Details',
          value: `**Legal Area:** ${this.getLegalAreaDisplayName(legalArea)}${includeFederal ? '\n**Federal Law:** Included' : '\n**Federal Law:** NJ State Focus'}`,
          inline: true
        }
      );

      // Add compliance and verification status
      if (response.compliance) {
        const complianceInfo = [];
        complianceInfo.push('🔞 21+ verification confirmed');
        complianceInfo.push('⚖️ Cannabis legal content');
        if (response.compliance.filtered) {
          complianceInfo.push('🛡️ Content filtered for compliance');
        }

        legalInfoEmbed.addFields({
          name: '🛡️ Compliance Status',
          value: complianceInfo.join('\n'),
          inline: true
        });
      }

      // Add conversation stats
      if (response.conversation) {
        legalInfoEmbed.addFields({
          name: '📈 Advisory Stats',
          value: `**Session Messages:** ${response.conversation.messageCount}\n**Tokens Used:** ${response.conversation.tokensUsed}`,
          inline: true
        });
      }

      // Add critical legal disclaimers
      legalInfoEmbed.addFields({
        name: '🚨 CRITICAL LEGAL DISCLAIMERS',
        value: [
          '**⚠️ NOT LEGAL ADVICE:** This information is educational only',
          '**👨‍⚖️ CONSULT ATTORNEYS:** For legal advice, consult qualified lawyers',
          '**📅 LAWS CHANGE:** Cannabis laws evolve frequently - verify current law',
          '**🏛️ LOCAL VARIES:** Municipal laws may differ from state law',
          '**⚖️ FEDERAL CONFLICT:** Federal and state laws may conflict',
          '**🎯 YOUR RESPONSIBILITY:** You are responsible for legal compliance'
        ].join('\n'),
        inline: false
      });

      // Add New Jersey specific legal resources
      legalInfoEmbed.addFields({
        name: '📚 Official NJ Cannabis Legal Resources',
        value: [
          '• **NJ Cannabis Regulatory Commission (NJ-CRC)**',
          '• **Official NJ.gov Cannabis Information**',
          '• **New Jersey Administrative Code**',
          '• **Municipal Cannabis Ordinances**',
          '• **NJ Cannabis Industry Association**'
        ].join('\n'),
        inline: false
      });

      legalInfoEmbed.setFooter({
        text: `GrowmiesNJ • Cannabis Legal Information • ${isPrivate ? 'Private' : 'Public'} • 21+ Verified • NOT LEGAL ADVICE`,
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

      // Send the main response
      await interaction.editReply({ embeds: [legalInfoEmbed] });

      // Send additional parts if the response was too long
      if (response.additionalParts && response.additionalParts.length > 0) {
        for (let i = 0; i < response.additionalParts.length; i++) {
          const additionalEmbed = new EmbedBuilder()
            .setColor('#F77F00')
            .setTitle(`⚖️ Legal Information - Additional Details (${i + 2})`)
            .setDescription(response.additionalParts[i])
            .addFields({
              name: '🚨 Disclaimer Reminder',
              value: 'This is general information only, not legal advice. Consult qualified attorneys for legal guidance.',
              inline: false
            })
            .setFooter({
              text: 'GrowmiesNJ • Legal Information (Continued) • NOT LEGAL ADVICE',
              iconURL: interaction.user.displayAvatarURL()
            })
            .setTimestamp();

          await interaction.followUp({ 
            embeds: [additionalEmbed], 
            ephemeral: isPrivate 
          });
        }
      }

      // Add legal-specific follow-up information
      const legalFollowUpEmbed = new EmbedBuilder()
        .setColor(BRAND_COLORS.WARNING)
        .setTitle('⚖️ Important Legal Follow-up Information')
        .setDescription('Additional resources and considerations for cannabis legal matters:')
        .addFields(
          {
            name: '👨‍⚖️ When to Consult an Attorney',
            value: [
              '• Facing criminal charges or legal proceedings',
              '• Starting a cannabis business or operation',
              '• Property or employment legal issues',
              '• Complex compliance questions',
              '• Any situation requiring legal representation'
            ].join('\n'),
            inline: false
          },
          {
            name: '📅 Staying Current with Cannabis Law',
            value: [
              '• Subscribe to NJ-CRC updates and newsletters',
              '• Follow official state cannabis communications',
              '• Monitor municipal law changes in your area',
              '• Join professional cannabis legal associations',
              '• Attend cannabis law educational seminars'
            ].join('\n'),
            inline: false
          },
          {
            name: '🛠️ Related Commands',
            value: [
              '• `/grow-tips` - Legal cultivation guidance',
              '• `/strain-advice` - Compliance considerations',
              '• `/chat` - Continue legal discussions',
              '• `/ask` - General cannabis law questions'
            ].join('\n'),
            inline: false
          }
        )
        .setFooter({
          text: 'GrowmiesNJ • Legal Resource Information',
          iconURL: interaction.client.user.displayAvatarURL()
        })
        .setTimestamp();

      await interaction.followUp({ 
        embeds: [legalFollowUpEmbed], 
        ephemeral: true 
      });

      // Add reactions for legal information
      if (!isPrivate) {
        try {
          const message = await interaction.fetchReply();
          const legalReactions = ['⚖️', '📚', '🏛️', '👨‍⚖️'];
          for (const reaction of legalReactions) {
            await message.react(reaction);
          }
        } catch (reactionError) {
          console.warn('Failed to add legal info reactions:', reactionError.message);
        }
      }

      console.log(`✅ Legal info completed successfully for ${interaction.user.tag} - Question: ${question.substring(0, 30)}, Area: ${legalArea}, Federal: ${includeFederal}, Compliance: ${JSON.stringify(response.compliance)}`);

    } catch (error) {
      console.error('❌ Error in legal-info command:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor(BRAND_COLORS.ERROR)
        .setTitle('❌ Unexpected Legal Information Error')
        .setDescription('An unexpected error occurred while retrieving legal information.')
        .addFields(
          {
            name: '🔄 What you can do',
            value: [
              '• Rephrase your legal question and try again',
              '• Try a different legal area or simpler query',
              '• Use `/ask` for general cannabis questions',
              '• Contact a moderator if the problem persists'
            ].join('\n'),
            inline: false
          },
          {
            name: '⚖️ Alternative Resources',
            value: [
              '• Consult the NJ Cannabis Regulatory Commission',
              '• Visit official NJ.gov cannabis information',
              '• Contact cannabis law attorneys',
              '• Check municipal cannabis ordinances'
            ].join('\n'),
            inline: false
          },
          {
            name: '🚨 Remember',
            value: 'For specific legal advice, always consult with qualified legal professionals.',
            inline: false
          }
        )
        .setFooter({
          text: 'GrowmiesNJ • Legal Information Error',
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
        console.error('❌ Failed to send legal info error response:', followUpError);
      }
    }
  },

  /**
   * Build a detailed legal inquiry prompt
   */
  buildLegalInquiry(question, legalArea, includeFederal) {
    let inquiry = `Please provide general educational information about New Jersey cannabis law regarding: ${question}.`;

    // Add legal area specific context
    switch (legalArea) {
      case 'cultivation':
        inquiry += ' Focus on home cultivation laws, plant limits, growing regulations, and residential cultivation compliance in New Jersey.';
        break;
      case 'dispensary':
        inquiry += ' Focus on dispensary regulations, purchase limits, retail cannabis laws, and consumer protections in New Jersey.';
        break;
      case 'transportation':
        inquiry += ' Focus on cannabis transportation laws, vehicle possession limits, travel restrictions, and interstate considerations.';
        break;
      case 'employment':
        inquiry += ' Focus on workplace cannabis policies, employee rights, drug testing laws, and employment protections in New Jersey.';
        break;
      case 'public_use':
        inquiry += ' Focus on public consumption laws, where cannabis use is permitted/prohibited, and social consumption regulations.';
        break;
      case 'licensing':
        inquiry += ' Focus on cannabis business licensing, permit requirements, regulatory compliance, and commercial cannabis operations.';
        break;
      default:
        inquiry += ' Provide comprehensive information about relevant New Jersey cannabis laws and regulations.';
    }

    // Add federal law considerations if requested
    if (includeFederal) {
      inquiry += ' Please also include relevant federal law considerations, conflicts between state and federal law, and important federal legal context.';
    }

    // Add important legal disclaimers and limitations
    inquiry += ' IMPORTANT: This must be presented as general educational information only, NOT legal advice. Include clear disclaimers that this information should not replace consultation with qualified legal professionals. Emphasize that laws change frequently and users should verify current regulations. Include warnings about the importance of consulting attorneys for specific legal situations.';

    return inquiry;
  },

  /**
   * Get display name for legal area
   */
  getLegalAreaDisplayName(area) {
    switch (area) {
      case 'cultivation':
        return '🏠 Home Cultivation';
      case 'dispensary':
        return '🏪 Dispensary & Purchase';
      case 'transportation':
        return '🚗 Transportation & Travel';
      case 'employment':
        return '🏢 Employment & Workplace';
      case 'public_use':
        return '🏛️ Public Use & Consumption';
      case 'licensing':
        return '📋 Licensing & Permits';
      default:
        return '⚖️ General NJ Cannabis Law';
    }
  }
};