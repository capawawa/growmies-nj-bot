/**
 * Volume Command for GrowmiesNJ Discord Bot
 * 
 * Music Bot System: Control audio volume with user preferences
 * Features volume validation, cannabis compliance, and preference saving
 */

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const musicService = require('../../services/musicService');
const { UserMusicPreferences } = require('../../database/models/UserMusicPreferences');
const EngagementService = require('../../services/engagementService');
const { BRAND_COLORS } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('🔊 Control music volume')
    .addSubcommand(subcommand =>
      subcommand
        .setName('set')
        .setDescription('Set the volume level (0-100)')
        .addIntegerOption(option =>
          option
            .setName('level')
            .setDescription('Volume level (0-100)')
            .setRequired(true)
            .setMinValue(0)
            .setMaxValue(100)
        )
        .addBooleanOption(option =>
          option
            .setName('save_preference')
            .setDescription('Save this volume as your default preference')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('up')
        .setDescription('Increase volume by 10%')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('down')
        .setDescription('Decrease volume by 10%')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('mute')
        .setDescription('Mute or unmute the audio')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('show')
        .setDescription('Display current volume settings')
    ),

  async execute(interaction) {
    try {
      const subcommand = interaction.options.getSubcommand();
      const userId = interaction.user.id;
      const guildId = interaction.guild.id;

      await interaction.deferReply();

      // Check if there's an active music session
      if (!musicService.hasActiveSession(guildId)) {
        return await interaction.editReply({
          embeds: [this.createErrorEmbed(
            'No Active Session',
            '🔇 There is no active music session in this server.\n\nUse `/play` to start playing music!'
          )]
        });
      }

      // Check if user is in the same voice channel
      const member = interaction.guild.members.cache.get(userId);
      const botVoiceChannel = musicService.getVoiceChannel(guildId);
      
      if (!member.voice.channel) {
        return await interaction.editReply({
          embeds: [this.createErrorEmbed(
            'Not in Voice Channel',
            '🔊 You must be in a voice channel to control volume.\n\nJoin the voice channel and try again!'
          )]
        });
      }

      if (botVoiceChannel && member.voice.channel.id !== botVoiceChannel.id) {
        return await interaction.editReply({
          embeds: [this.createErrorEmbed(
            'Wrong Voice Channel',
            `🔊 You must be in **${botVoiceChannel.name}** to control volume.\n\nJoin the same voice channel as the bot!`
          )]
        });
      }

      // Route to appropriate subcommand handler
      switch (subcommand) {
        case 'set':
          await this.handleSetVolume(interaction, userId, guildId);
          break;
        case 'up':
          await this.handleVolumeUp(interaction, userId, guildId);
          break;
        case 'down':
          await this.handleVolumeDown(interaction, userId, guildId);
          break;
        case 'mute':
          await this.handleMute(interaction, userId, guildId);
          break;
        case 'show':
          await this.handleShowVolume(interaction, userId, guildId);
          break;
        default:
          await interaction.editReply({
            embeds: [this.createErrorEmbed('Unknown Command', 'Invalid subcommand specified.')]
          });
      }

    } catch (error) {
      console.error('Error executing volume command:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor(BRAND_COLORS.ERROR)
        .setTitle('❌ Volume Command Error')
        .setDescription('An unexpected error occurred while controlling volume.')
        .setFooter({
          text: 'GrowmiesNJ • Music Bot System',
          iconURL: interaction.client.user.displayAvatarURL()
        })
        .setTimestamp();

      if (interaction.deferred) {
        await interaction.editReply({ embeds: [errorEmbed] });
      } else {
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      }
    }
  },

  /**
   * Handle set volume subcommand
   */
  async handleSetVolume(interaction, userId, guildId) {
    const level = interaction.options.getInteger('level');
    const savePreference = interaction.options.getBoolean('save_preference') || false;

    try {
      // Set the volume
      const volumeResult = await musicService.setVolume(guildId, level);
      
      if (!volumeResult.success) {
        return await interaction.editReply({
          embeds: [this.createErrorEmbed(
            'Volume Set Failed',
            `❌ ${volumeResult.error}\n\nPlease try again.`
          )]
        });
      }

      // Save user preference if requested
      if (savePreference) {
        await UserMusicPreferences.updateVolumePreference(userId, guildId, level);
      }

      // Award XP for volume control
      await EngagementService.trackEngagementActivity(
        userId,
        guildId,
        'music_volume_set',
        interaction.channelId,
        {
          volume_level: level,
          saved_preference: savePreference,
          xp_earned: 1
        }
      );

      // Create volume confirmation embed
      const embed = new EmbedBuilder()
        .setColor(this.getVolumeColor(level))
        .setTitle(`🔊 Volume Set to ${level}%`)
        .setDescription(`Audio volume has been adjusted by <@${userId}>.`)
        .addFields(
          {
            name: '🎚️ Volume Level',
            value: this.getVolumeDisplay(level),
            inline: true
          },
          {
            name: '💾 Preference',
            value: savePreference ? '✅ Saved as default' : '❌ Not saved',
            inline: true
          },
          {
            name: '🌟 XP Earned',
            value: '+1 XP',
            inline: true
          }
        );

      embed.setFooter({
        text: 'GrowmiesNJ • Volume Control',
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

      // Add volume control buttons
      const components = this.createVolumeComponents(level);

      await interaction.editReply({ 
        embeds: [embed],
        components: components
      });

    } catch (error) {
      console.error('Error setting volume:', error);
      await interaction.editReply({
        embeds: [this.createErrorEmbed(
          'Volume Set Failed',
          'Failed to set the volume. Please try again.'
        )]
      });
    }
  },

  /**
   * Handle volume up subcommand
   */
  async handleVolumeUp(interaction, userId, guildId) {
    try {
      const currentVolume = await musicService.getCurrentVolume(guildId);
      const newVolume = Math.min(100, currentVolume + 10);

      if (newVolume === currentVolume) {
        return await interaction.editReply({
          embeds: [this.createErrorEmbed(
            'Volume Already at Maximum',
            '🔊 Volume is already at 100% (maximum level).\n\nUse `/volume set` to set a specific level.'
          )]
        });
      }

      await this.setVolumeAndRespond(interaction, userId, guildId, newVolume, `Volume increased to ${newVolume}%`);

    } catch (error) {
      console.error('Error increasing volume:', error);
      await interaction.editReply({
        embeds: [this.createErrorEmbed(
          'Volume Up Failed',
          'Failed to increase volume. Please try again.'
        )]
      });
    }
  },

  /**
   * Handle volume down subcommand
   */
  async handleVolumeDown(interaction, userId, guildId) {
    try {
      const currentVolume = await musicService.getCurrentVolume(guildId);
      const newVolume = Math.max(0, currentVolume - 10);

      if (newVolume === currentVolume) {
        return await interaction.editReply({
          embeds: [this.createErrorEmbed(
            'Volume Already at Minimum',
            '🔇 Volume is already at 0% (minimum level).\n\nUse `/volume set` to set a specific level.'
          )]
        });
      }

      await this.setVolumeAndRespond(interaction, userId, guildId, newVolume, `Volume decreased to ${newVolume}%`);

    } catch (error) {
      console.error('Error decreasing volume:', error);
      await interaction.editReply({
        embeds: [this.createErrorEmbed(
          'Volume Down Failed',
          'Failed to decrease volume. Please try again.'
        )]
      });
    }
  },

  /**
   * Handle mute subcommand
   */
  async handleMute(interaction, userId, guildId) {
    try {
      const currentVolume = await musicService.getCurrentVolume(guildId);
      const isMuted = currentVolume === 0;
      
      if (isMuted) {
        // Unmute: restore to user's preferred volume or 50%
        const userPrefs = await UserMusicPreferences.getOrCreatePreferences(userId, guildId);
        const targetVolume = userPrefs.preferred_volume || 50;
        
        await this.setVolumeAndRespond(interaction, userId, guildId, targetVolume, `Audio unmuted (${targetVolume}%)`);
      } else {
        // Mute: set to 0%
        await this.setVolumeAndRespond(interaction, userId, guildId, 0, 'Audio muted');
      }

    } catch (error) {
      console.error('Error toggling mute:', error);
      await interaction.editReply({
        embeds: [this.createErrorEmbed(
          'Mute Toggle Failed',
          'Failed to mute/unmute audio. Please try again.'
        )]
      });
    }
  },

  /**
   * Handle show volume subcommand
   */
  async handleShowVolume(interaction, userId, guildId) {
    try {
      const currentVolume = await musicService.getCurrentVolume(guildId);
      const userPrefs = await UserMusicPreferences.getOrCreatePreferences(userId, guildId);
      
      const embed = new EmbedBuilder()
        .setColor(this.getVolumeColor(currentVolume))
        .setTitle('🔊 Volume Settings')
        .setDescription('Current audio volume and your preferences.')
        .addFields(
          {
            name: '🎚️ Current Volume',
            value: this.getVolumeDisplay(currentVolume),
            inline: true
          },
          {
            name: '💾 Your Preferred Volume',
            value: userPrefs.preferred_volume ? `${userPrefs.preferred_volume}%` : 'Not set',
            inline: true
          },
          {
            name: '🔇 Status',
            value: currentVolume === 0 ? '🔇 Muted' : '🔊 Playing',
            inline: true
          }
        );

      embed.setFooter({
        text: 'GrowmiesNJ • Volume Display',
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

      // Add volume control buttons
      const components = this.createVolumeComponents(currentVolume);

      await interaction.editReply({ 
        embeds: [embed],
        components: components
      });

    } catch (error) {
      console.error('Error showing volume:', error);
      await interaction.editReply({
        embeds: [this.createErrorEmbed(
          'Show Volume Failed',
          'Failed to display volume settings. Please try again.'
        )]
      });
    }
  },

  /**
   * Set volume and create response
   */
  async setVolumeAndRespond(interaction, userId, guildId, volume, description) {
    const volumeResult = await musicService.setVolume(guildId, volume);
    
    if (!volumeResult.success) {
      return await interaction.editReply({
        embeds: [this.createErrorEmbed(
          'Volume Change Failed',
          `❌ ${volumeResult.error}\n\nPlease try again.`
        )]
      });
    }

    // Award XP for volume control
    await EngagementService.trackEngagementActivity(
      userId,
      guildId,
      'music_volume_adjust',
      interaction.channelId,
      {
        volume_level: volume,
        xp_earned: 1
      }
    );

    const embed = new EmbedBuilder()
      .setColor(this.getVolumeColor(volume))
      .setTitle(`🔊 ${description}`)
      .addFields(
        {
          name: '🎚️ Volume Level',
          value: this.getVolumeDisplay(volume),
          inline: true
        },
        {
          name: '🌟 XP Earned',
          value: '+1 XP',
          inline: true
        }
      );

    embed.setFooter({
      text: 'GrowmiesNJ • Volume Control',
      iconURL: interaction.user.displayAvatarURL()
    })
    .setTimestamp();

    const components = this.createVolumeComponents(volume);

    await interaction.editReply({ 
      embeds: [embed],
      components: components
    });
  },

  /**
   * Create volume control components
   */
  createVolumeComponents(currentVolume) {
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('volume_down')
          .setLabel('🔉 Down')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(currentVolume <= 0),
        new ButtonBuilder()
          .setCustomId('volume_mute')
          .setLabel(currentVolume === 0 ? '🔊 Unmute' : '🔇 Mute')
          .setStyle(currentVolume === 0 ? ButtonStyle.Success : ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('volume_up')
          .setLabel('🔊 Up')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(currentVolume >= 100)
      );

    return [row];
  },

  /**
   * Get color based on volume level
   */
  getVolumeColor(volume) {
    if (volume === 0) return BRAND_COLORS.ERROR;
    if (volume <= 30) return BRAND_COLORS.WARNING;
    if (volume <= 70) return BRAND_COLORS.SUCCESS;
    return BRAND_COLORS.PRIMARY_GREEN;
  },

  /**
   * Get visual volume display
   */
  getVolumeDisplay(volume) {
    const bars = Math.ceil(volume / 10);
    const volumeBars = '█'.repeat(bars) + '░'.repeat(10 - bars);
    return `${volume}% \`${volumeBars}\``;
  },

  /**
   * Create error embed
   */
  createErrorEmbed(title, description) {
    return new EmbedBuilder()
      .setColor(BRAND_COLORS.ERROR)
      .setTitle(`❌ ${title}`)
      .setDescription(description)
      .setFooter({ text: 'GrowmiesNJ • Music Volume System' })
      .setTimestamp();
  }
};