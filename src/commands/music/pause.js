/**
 * Pause Command for GrowmiesNJ Discord Bot
 * 
 * Music Bot System: Pause/resume music playback with session management
 * Features state tracking, cannabis compliance, and user permissions
 */

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const musicService = require('../../services/musicService');
const EngagementService = require('../../services/engagementService');
const { BRAND_COLORS } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pause')
    .setDescription('⏸️ Pause or resume music playback')
    .addStringOption(option =>
      option
        .setName('action')
        .setDescription('Pause or resume playback')
        .setRequired(false)
        .addChoices(
          { name: '⏸️ Pause', value: 'pause' },
          { name: '▶️ Resume', value: 'resume' },
          { name: '🔄 Toggle', value: 'toggle' }
        )
    ),

  async execute(interaction) {
    try {
      const userId = interaction.user.id;
      const guildId = interaction.guild.id;
      const action = interaction.options.getString('action') || 'toggle';

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

      // Get current queue status
      const queueStatus = await musicService.getQueueStatus(guildId);
      if (!queueStatus.success) {
        return await interaction.editReply({
          embeds: [this.createErrorEmbed(
            'Pause Failed',
            `❌ ${queueStatus.error}\n\nPlease try again or contact support.`
          )]
        });
      }

      // Check if there's a track loaded
      if (!queueStatus.currentTrack) {
        return await interaction.editReply({
          embeds: [this.createErrorEmbed(
            'Nothing to Pause',
            '📭 No track is currently loaded.\n\nUse `/play` to start playing music!'
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
            '🔊 You must be in a voice channel to control playback.\n\nJoin the voice channel and try again!'
          )]
        });
      }

      if (botVoiceChannel && member.voice.channel.id !== botVoiceChannel.id) {
        return await interaction.editReply({
          embeds: [this.createErrorEmbed(
            'Wrong Voice Channel',
            `🔊 You must be in **${botVoiceChannel.name}** to control playback.\n\nJoin the same voice channel as the bot!`
          )]
        });
      }

      // Determine the action to take
      const currentlyPlaying = queueStatus.isPlaying;
      let targetAction = action;
      
      if (action === 'toggle') {
        targetAction = currentlyPlaying ? 'pause' : 'resume';
      }

      // Validate action makes sense
      if (targetAction === 'pause' && !currentlyPlaying) {
        return await interaction.editReply({
          embeds: [this.createErrorEmbed(
            'Already Paused',
            '⏸️ Music is already paused.\n\nUse `/pause resume` to resume playback!'
          )]
        });
      }

      if (targetAction === 'resume' && currentlyPlaying) {
        return await interaction.editReply({
          embeds: [this.createErrorEmbed(
            'Already Playing',
            '▶️ Music is already playing.\n\nUse `/pause` to pause playback!'
          )]
        });
      }

      // Execute the pause/resume action
      if (targetAction === 'pause') {
        await this.executePause(interaction, queueStatus, userId, guildId);
      } else {
        await this.executeResume(interaction, queueStatus, userId, guildId);
      }

    } catch (error) {
      console.error('Error executing pause command:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor(BRAND_COLORS.ERROR)
        .setTitle('❌ Pause Command Error')
        .setDescription('An unexpected error occurred while controlling playback.')
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
   * Execute pause action
   */
  async executePause(interaction, queueStatus, userId, guildId) {
    const currentTrack = queueStatus.currentTrack;
    
    try {
      // Pause the audio player
      const pauseResult = await musicService.pausePlayback(guildId, {
        pausedBy: userId,
        timestamp: new Date()
      });

      if (!pauseResult.success) {
        return await interaction.editReply({
          embeds: [this.createErrorEmbed(
            'Pause Failed',
            `❌ ${pauseResult.error}\n\nPlease try again.`
          )]
        });
      }

      // Award XP for playback control
      await EngagementService.trackEngagementActivity(
        userId,
        guildId,
        'music_pause',
        interaction.channelId,
        {
          track_title: currentTrack.track_title,
          xp_earned: 1
        }
      );

      // Create pause confirmation embed
      const embed = new EmbedBuilder()
        .setColor(BRAND_COLORS.WARNING)
        .setTitle('⏸️ Music Paused')
        .setDescription(`Playback has been paused by <@${userId}>.`)
        .addFields(
          {
            name: '🎵 Current Track',
            value: `**${currentTrack.track_title}**\n${currentTrack.track_artist || 'Unknown Artist'}`,
            inline: true
          },
          {
            name: '⏱️ Paused At',
            value: pauseResult.position ? this.formatDuration(pauseResult.position) : 'Unknown',
            inline: true
          },
          {
            name: '🌟 XP Earned',
            value: '+1 XP',
            inline: true
          }
        );

      if (currentTrack.track_thumbnail_url) {
        embed.setThumbnail(currentTrack.track_thumbnail_url);
      }

      embed.setFooter({
        text: 'GrowmiesNJ • Music paused',
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

      // Add resume button
      const components = this.createPlaybackComponents(true);

      await interaction.editReply({ 
        embeds: [embed],
        components: components
      });

    } catch (error) {
      console.error('Error executing pause:', error);
      await interaction.editReply({
        embeds: [this.createErrorEmbed(
          'Pause Failed',
          'Failed to pause the music. Please try again.'
        )]
      });
    }
  },

  /**
   * Execute resume action
   */
  async executeResume(interaction, queueStatus, userId, guildId) {
    const currentTrack = queueStatus.currentTrack;
    
    try {
      // Resume the audio player
      const resumeResult = await musicService.resumePlayback(guildId, {
        resumedBy: userId,
        timestamp: new Date()
      });

      if (!resumeResult.success) {
        return await interaction.editReply({
          embeds: [this.createErrorEmbed(
            'Resume Failed',
            `❌ ${resumeResult.error}\n\nPlease try again.`
          )]
        });
      }

      // Award XP for playback control
      await EngagementService.trackEngagementActivity(
        userId,
        guildId,
        'music_resume',
        interaction.channelId,
        {
          track_title: currentTrack.track_title,
          xp_earned: 1
        }
      );

      // Create resume confirmation embed
      const embed = new EmbedBuilder()
        .setColor(BRAND_COLORS.SUCCESS)
        .setTitle('▶️ Music Resumed')
        .setDescription(`Playback has been resumed by <@${userId}>.`)
        .addFields(
          {
            name: '🎵 Current Track',
            value: `**${currentTrack.track_title}**\n${currentTrack.track_artist || 'Unknown Artist'}`,
            inline: true
          },
          {
            name: '⏱️ Position',
            value: resumeResult.position ? this.formatDuration(resumeResult.position) : 'Unknown',
            inline: true
          },
          {
            name: '🌟 XP Earned',
            value: '+1 XP',
            inline: true
          }
        );

      if (currentTrack.track_thumbnail_url) {
        embed.setThumbnail(currentTrack.track_thumbnail_url);
      }

      // Add cannabis content warning if applicable
      if (currentTrack.is_cannabis_content) {
        embed.addFields({
          name: '🌿 Cannabis Content',
          value: '⚠️ This track contains cannabis-related content (21+ verified)',
          inline: false
        });
      }

      embed.setFooter({
        text: 'GrowmiesNJ • Music resumed',
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

      // Add pause button
      const components = this.createPlaybackComponents(false);

      await interaction.editReply({ 
        embeds: [embed],
        components: components
      });

    } catch (error) {
      console.error('Error executing resume:', error);
      await interaction.editReply({
        embeds: [this.createErrorEmbed(
          'Resume Failed',
          'Failed to resume the music. Please try again.'
        )]
      });
    }
  },

  /**
   * Create playback control components
   */
  createPlaybackComponents(isPaused) {
    const row = new ActionRowBuilder();
    
    if (isPaused) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId('music_resume')
          .setLabel('Resume')
          .setStyle(ButtonStyle.Success)
          .setEmoji('▶️'),
        new ButtonBuilder()
          .setCustomId('music_stop')
          .setLabel('Stop')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('⏹️'),
        new ButtonBuilder()
          .setCustomId('music_skip')
          .setLabel('Skip')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('⏭️')
      );
    } else {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId('music_pause')
          .setLabel('Pause')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('⏸️'),
        new ButtonBuilder()
          .setCustomId('music_stop')
          .setLabel('Stop')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('⏹️'),
        new ButtonBuilder()
          .setCustomId('music_skip')
          .setLabel('Skip')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('⏭️')
      );
    }

    // Add queue and now playing buttons
    row.addComponents(
      new ButtonBuilder()
        .setCustomId('music_queue')
        .setLabel('Queue')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('📜')
    );

    return [row];
  },

  /**
   * Format duration seconds to readable string
   */
  formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  },

  /**
   * Create error embed
   */
  createErrorEmbed(title, description) {
    return new EmbedBuilder()
      .setColor(BRAND_COLORS.ERROR)
      .setTitle(`❌ ${title}`)
      .setDescription(description)
      .setFooter({ text: 'GrowmiesNJ • Music Pause System' })
      .setTimestamp();
  }
};