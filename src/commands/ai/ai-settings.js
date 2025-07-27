/**
 * AI Settings Command for GrowmiesNJ Discord Bot
 * 
 * LLM Chat Integration: Manage AI assistant preferences and personalization settings
 * Allows users to customize their AI interaction experience and cannabis content preferences
 */

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, InteractionContextType } = require('discord.js');
const LLMService = require('../../services/llmService');
const { WelcomeEmbeds, BRAND_COLORS } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ai-settings')
    .setDescription('⚙️ View and customize your AI assistant preferences')
    .setContexts(InteractionContextType.Guild)
    .addStringOption(option =>
      option
        .setName('setting')
        .setDescription('Which setting would you like to change?')
        .setRequired(false)
        .addChoices(
          { name: '🌿 Cannabis Assistance', value: 'cannabis_assistance' },
          { name: '💬 Response Style', value: 'response_style' },
          { name: '🛡️ Content Filtering', value: 'content_filtering' },
          { name: '📏 Response Length', value: 'response_length' },
          { name: '⚠️ Include Disclaimers', value: 'disclaimers' },
          { name: '🏷️ Preferred Topics', value: 'topics' }
        )
    )
    .addStringOption(option =>
      option
        .setName('value')
        .setDescription('New value for the setting')
        .setRequired(false)
    )
    .addBooleanOption(option =>
      option
        .setName('reset_all')
        .setDescription('Reset all settings to default values')
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      const setting = interaction.options.getString('setting');
      const value = interaction.options.getString('value');
      const resetAll = interaction.options.getBoolean('reset_all') || false;

      // Log the AI settings request
      console.log(`⚙️ AI settings command executed by ${interaction.user.tag}: setting=${setting}, reset=${resetAll}`);

      await interaction.deferReply({ ephemeral: true });

      // Initialize LLM service
      const llmService = new LLMService();

      // Handle reset all settings
      if (resetAll) {
        return await this.resetAllSettings(interaction, llmService);
      }

      // Handle specific setting change
      if (setting && value) {
        return await this.updateSpecificSetting(interaction, llmService, setting, value);
      }

      // Default: Show current settings and configuration options
      return await this.showSettingsInterface(interaction, llmService);

    } catch (error) {
      console.error('❌ Error in ai-settings command:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor(BRAND_COLORS.ERROR)
        .setTitle('❌ AI Settings Error')
        .setDescription('An unexpected error occurred while managing your AI settings.')
        .addFields(
          {
            name: '🔄 What you can do',
            value: [
              '• Try the command again without parameters',
              '• Use simpler setting values',
              '• Contact a moderator if the problem persists',
              '• Your current settings remain unchanged'
            ].join('\n'),
            inline: false
          }
        )
        .setFooter({
          text: 'GrowmiesNJ • AI Settings Error',
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
        console.error('❌ Failed to send AI settings error response:', followUpError);
      }
    }
  },

  /**
   * Show the main settings interface
   */
  async showSettingsInterface(interaction, llmService) {
    try {
      // Check if AI service is available
      if (!llmService.isOpenAIAvailable()) {
        const unavailableEmbed = new EmbedBuilder()
          .setColor(BRAND_COLORS.WARNING)
          .setTitle('🤖 AI Service Unavailable')
          .setDescription('The AI service is currently not available, but you can still view your stored preferences.')
          .addFields(
            {
              name: '💡 What this means',
              value: 'Your settings are stored and will be applied when the AI service becomes available.',
              inline: false
            }
          )
          .setFooter({
            text: 'GrowmiesNJ • AI Settings',
            iconURL: interaction.client.user.displayAvatarURL()
          })
          .setTimestamp();

        return await interaction.editReply({ embeds: [unavailableEmbed] });
      }

      // Get current user preferences
      const currentPrefs = await llmService.getUserPreferences(
        interaction.user.id,
        interaction.guild.id
      );

      // Create settings overview embed
      const settingsEmbed = new EmbedBuilder()
        .setColor(BRAND_COLORS.PRIMARY_GREEN)
        .setTitle('⚙️ Your AI Assistant Settings')
        .setDescription('Here are your current AI preferences. You can customize these settings to personalize your experience.')
        .addFields(
          {
            name: '🌿 Cannabis Assistance',
            value: currentPrefs.cannabis_assistance_enabled ? '✅ Enabled' : '❌ Disabled',
            inline: true
          },
          {
            name: '💬 Response Style',
            value: this.formatResponseStyle(currentPrefs.response_style),
            inline: true
          },
          {
            name: '🛡️ Content Filtering',
            value: this.formatContentFiltering(currentPrefs.content_filtering),
            inline: true
          },
          {
            name: '📏 Max Response Length',
            value: `${currentPrefs.max_response_length || 2000} characters`,
            inline: true
          },
          {
            name: '⚠️ Include Disclaimers',
            value: currentPrefs.include_disclaimers !== false ? '✅ Enabled' : '❌ Disabled',
            inline: true
          },
          {
            name: '🏷️ Preferred Topics',
            value: currentPrefs.preferred_topics && currentPrefs.preferred_topics.length > 0 
              ? currentPrefs.preferred_topics.slice(0, 3).join(', ') + (currentPrefs.preferred_topics.length > 3 ? '...' : '')
              : 'None set',
            inline: true
          }
        );

      // Add cannabis-specific info if enabled
      if (currentPrefs.cannabis_assistance_enabled) {
        settingsEmbed.addFields({
          name: '🌿 Cannabis Features Available',
          value: [
            '• `/strain-advice` - Detailed strain information',
            '• `/grow-tips` - Cultivation guidance', 
            '• `/legal-info` - New Jersey cannabis law',
            '• Enhanced cannabis context in conversations'
          ].join('\n'),
          inline: false
        });
      }

      settingsEmbed.addFields({
        name: '🔧 How to Change Settings',
        value: [
          '• Use the buttons below for quick changes',
          '• Use `/ai-settings setting:<name> value:<value>` for specific updates',
          '• Use `/ai-settings reset_all:true` to restore defaults'
        ].join('\n'),
        inline: false
      });

      settingsEmbed.setFooter({
        text: 'GrowmiesNJ • AI Assistant Preferences',
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

      // Create action buttons for common settings
      const actionRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`toggle_cannabis_${interaction.user.id}`)
            .setLabel(currentPrefs.cannabis_assistance_enabled ? '🌿 Disable Cannabis' : '🌿 Enable Cannabis')
            .setStyle(currentPrefs.cannabis_assistance_enabled ? ButtonStyle.Secondary : ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`change_style_${interaction.user.id}`)
            .setLabel('💬 Change Style')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`reset_settings_${interaction.user.id}`)
            .setLabel('🔄 Reset All')
            .setStyle(ButtonStyle.Danger)
        );

      await interaction.editReply({ 
        embeds: [settingsEmbed],
        components: [actionRow]
      });

      console.log(`✅ AI settings interface shown for ${interaction.user.tag}`);

    } catch (error) {
      console.error('Error showing settings interface:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor(BRAND_COLORS.ERROR)
        .setTitle('❌ Settings Interface Error')
        .setDescription('Unable to retrieve your current AI settings.')
        .addFields({
          name: '🔄 Try Again',
          value: 'Please try the command again or contact support if the issue persists.',
          inline: false
        })
        .setFooter({
          text: 'GrowmiesNJ • Settings Interface Error',
          iconURL: interaction.client.user.displayAvatarURL()
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },

  /**
   * Update a specific setting
   */
  async updateSpecificSetting(interaction, llmService, setting, value) {
    try {
      // Validate and convert the setting value
      const validatedValue = this.validateSettingValue(setting, value);
      if (!validatedValue.valid) {
        const errorEmbed = new EmbedBuilder()
          .setColor(BRAND_COLORS.ERROR)
          .setTitle('❌ Invalid Setting Value')
          .setDescription(validatedValue.error)
          .addFields({
            name: '📋 Valid Options',
            value: this.getValidOptionsForSetting(setting),
            inline: false
          })
          .setFooter({
            text: 'GrowmiesNJ • AI Settings Validation',
            iconURL: interaction.client.user.displayAvatarURL()
          })
          .setTimestamp();

        return await interaction.editReply({ embeds: [errorEmbed] });
      }

      // Update the setting
      const updatePayload = {};
      updatePayload[this.mapSettingToField(setting)] = validatedValue.value;

      const result = await llmService.updateUserPreferences(
        interaction.user.id,
        interaction.guild.id,
        updatePayload
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to update setting');
      }

      // Create success embed
      const successEmbed = new EmbedBuilder()
        .setColor(BRAND_COLORS.SUCCESS)
        .setTitle('✅ Setting Updated Successfully')
        .setDescription(`Your **${this.getSettingDisplayName(setting)}** has been updated.`)
        .addFields(
          {
            name: '🔄 Changed Setting',
            value: `**${this.getSettingDisplayName(setting)}:** ${this.formatSettingValue(setting, validatedValue.value)}`,
            inline: false
          },
          {
            name: '💡 What this means',
            value: this.getSettingDescription(setting, validatedValue.value),
            inline: false
          }
        )
        .setFooter({
          text: 'GrowmiesNJ • AI Settings Updated',
          iconURL: interaction.user.displayAvatarURL()
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [successEmbed] });

      console.log(`✅ AI setting updated for ${interaction.user.tag}: ${setting} = ${validatedValue.value}`);

    } catch (error) {
      console.error('Error updating specific setting:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor(BRAND_COLORS.ERROR)
        .setTitle('❌ Setting Update Error')
        .setDescription('Failed to update your AI setting.')
        .addFields({
          name: '🔄 Try Again',
          value: 'Please verify the setting name and value, then try again.',
          inline: false
        })
        .setFooter({
          text: 'GrowmiesNJ • Setting Update Error',
          iconURL: interaction.client.user.displayAvatarURL()
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },

  /**
   * Reset all settings to defaults
   */
  async resetAllSettings(interaction, llmService) {
    try {
      const defaultSettings = {
        cannabis_assistance_enabled: true,
        response_style: 'conversational',
        content_filtering: 'moderate',
        max_response_length: 2000,
        include_disclaimers: true,
        preferred_topics: []
      };

      const result = await llmService.updateUserPreferences(
        interaction.user.id,
        interaction.guild.id,
        defaultSettings
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to reset settings');
      }

      const resetEmbed = new EmbedBuilder()
        .setColor(BRAND_COLORS.SUCCESS)
        .setTitle('✅ Settings Reset Successfully')
        .setDescription('All your AI assistant settings have been restored to their default values.')
        .addFields(
          {
            name: '🔄 Default Settings Applied',
            value: [
              '🌿 **Cannabis Assistance:** Enabled',
              '💬 **Response Style:** Conversational',
              '🛡️ **Content Filtering:** Moderate',
              '📏 **Response Length:** 2000 characters',
              '⚠️ **Disclaimers:** Enabled',
              '🏷️ **Preferred Topics:** None'
            ].join('\n'),
            inline: false
          },
          {
            name: '⚙️ Customize Again',
            value: 'You can use `/ai-settings` anytime to personalize your AI experience.',
            inline: false
          }
        )
        .setFooter({
          text: 'GrowmiesNJ • AI Settings Reset',
          iconURL: interaction.user.displayAvatarURL()
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [resetEmbed] });

      console.log(`✅ AI settings reset for ${interaction.user.tag}`);

    } catch (error) {
      console.error('Error resetting settings:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor(BRAND_COLORS.ERROR)
        .setTitle('❌ Settings Reset Error')
        .setDescription('Failed to reset your AI settings to defaults.')
        .addFields({
          name: '🔄 Try Again',
          value: 'Please try the reset operation again or contact support.',
          inline: false
        })
        .setFooter({
          text: 'GrowmiesNJ • Settings Reset Error',
          iconURL: interaction.client.user.displayAvatarURL()
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },

  /**
   * Validate setting value
   */
  validateSettingValue(setting, value) {
    switch (setting) {
      case 'cannabis_assistance':
        const boolValue = value.toLowerCase();
        if (['true', 'false', 'yes', 'no', 'enabled', 'disabled'].includes(boolValue)) {
          return { 
            valid: true, 
            value: ['true', 'yes', 'enabled'].includes(boolValue) 
          };
        }
        return { valid: false, error: 'Cannabis assistance must be true/false, yes/no, or enabled/disabled.' };

      case 'response_style':
        if (['educational', 'conversational', 'technical'].includes(value.toLowerCase())) {
          return { valid: true, value: value.toLowerCase() };
        }
        return { valid: false, error: 'Response style must be educational, conversational, or technical.' };

      case 'content_filtering':
        if (['strict', 'moderate', 'minimal'].includes(value.toLowerCase())) {
          return { valid: true, value: value.toLowerCase() };
        }
        return { valid: false, error: 'Content filtering must be strict, moderate, or minimal.' };

      case 'response_length':
        const length = parseInt(value);
        if (length >= 100 && length <= 2000) {
          return { valid: true, value: length };
        }
        return { valid: false, error: 'Response length must be between 100 and 2000 characters.' };

      case 'disclaimers':
        const disclaimerValue = value.toLowerCase();
        if (['true', 'false', 'yes', 'no', 'enabled', 'disabled'].includes(disclaimerValue)) {
          return { 
            valid: true, 
            value: ['true', 'yes', 'enabled'].includes(disclaimerValue) 
          };
        }
        return { valid: false, error: 'Disclaimers must be true/false, yes/no, or enabled/disabled.' };

      case 'topics':
        const topics = value.split(',').map(t => t.trim()).filter(t => t.length > 0);
        if (topics.length <= 10) {
          return { valid: true, value: topics };
        }
        return { valid: false, error: 'Maximum 10 topics allowed. Separate with commas.' };

      default:
        return { valid: false, error: 'Unknown setting.' };
    }
  },

  /**
   * Map setting names to database fields
   */
  mapSettingToField(setting) {
    const mapping = {
      'cannabis_assistance': 'cannabis_assistance_enabled',
      'response_style': 'response_style',
      'content_filtering': 'content_filtering',
      'response_length': 'max_response_length',
      'disclaimers': 'include_disclaimers',
      'topics': 'preferred_topics'
    };
    return mapping[setting] || setting;
  },

  /**
   * Get display name for setting
   */
  getSettingDisplayName(setting) {
    const names = {
      'cannabis_assistance': 'Cannabis Assistance',
      'response_style': 'Response Style',
      'content_filtering': 'Content Filtering',
      'response_length': 'Max Response Length',
      'disclaimers': 'Include Disclaimers',
      'topics': 'Preferred Topics'
    };
    return names[setting] || setting;
  },

  /**
   * Format setting value for display
   */
  formatSettingValue(setting, value) {
    switch (setting) {
      case 'cannabis_assistance':
      case 'disclaimers':
        return value ? 'Enabled' : 'Disabled';
      case 'response_style':
        return value.charAt(0).toUpperCase() + value.slice(1);
      case 'content_filtering':
        return value.charAt(0).toUpperCase() + value.slice(1);
      case 'response_length':
        return `${value} characters`;
      case 'topics':
        return Array.isArray(value) ? value.join(', ') : value;
      default:
        return value.toString();
    }
  },

  /**
   * Format response style for display
   */
  formatResponseStyle(style) {
    switch (style) {
      case 'educational':
        return '📚 Educational';
      case 'conversational':
        return '💬 Conversational';
      case 'technical':
        return '🔧 Technical';
      default:
        return '💬 Conversational';
    }
  },

  /**
   * Format content filtering for display
   */
  formatContentFiltering(filtering) {
    switch (filtering) {
      case 'strict':
        return '🔒 Strict';
      case 'moderate':
        return '🛡️ Moderate';
      case 'minimal':
        return '🔓 Minimal';
      default:
        return '🛡️ Moderate';
    }
  },

  /**
   * Get valid options for a setting
   */
  getValidOptionsForSetting(setting) {
    switch (setting) {
      case 'cannabis_assistance':
      case 'disclaimers':
        return 'true, false, yes, no, enabled, disabled';
      case 'response_style':
        return 'educational, conversational, technical';
      case 'content_filtering':
        return 'strict, moderate, minimal';
      case 'response_length':
        return 'Number between 100 and 2000';
      case 'topics':
        return 'Comma-separated list of topics (max 10)';
      default:
        return 'See command documentation';
    }
  },

  /**
   * Get description of what a setting does
   */
  getSettingDescription(setting, value) {
    switch (setting) {
      case 'cannabis_assistance':
        return value 
          ? 'Cannabis features are enabled. You can use strain advice, grow tips, and legal info commands.'
          : 'Cannabis features are disabled. Only general AI assistance is available.';
      case 'response_style':
        switch (value) {
          case 'educational':
            return 'AI responses will focus on detailed explanations and learning opportunities.';
          case 'technical':
            return 'AI responses will be more technical and detailed with scientific accuracy.';
          default:
            return 'AI responses will use a friendly, conversational tone.';
        }
      case 'content_filtering':
        switch (value) {
          case 'strict':
            return 'Maximum content filtering with comprehensive disclaimers and safety warnings.';
          case 'minimal':
            return 'Minimal content filtering while maintaining legal compliance.';
          default:
            return 'Balanced content filtering with appropriate safety measures.';
        }
      case 'response_length':
        return `AI responses will be limited to ${value} characters to match your preference.`;
      case 'disclaimers':
        return value 
          ? 'Legal and safety disclaimers will be included in cannabis-related responses.'
          : 'Minimal disclaimers will be used (not recommended for cannabis content).';
      case 'topics':
        return Array.isArray(value) && value.length > 0
          ? `AI will prioritize these topics: ${value.join(', ')}`
          : 'No topic preferences set - AI will respond to all topics equally.';
      default:
        return 'Setting updated successfully.';
    }
  }
};