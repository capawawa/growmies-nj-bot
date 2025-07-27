/**
 * Now Playing Command for GrowmiesNJ Discord Bot
 * 
 * Music Bot System: Display current track info with interactive controls
 * Features track details, progress bar, cannabis content warnings, and vote tracking
 */

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const musicService = require('../../services/musicService');
const { MusicQueue } = require('../../database/models/MusicQueue');
const EngagementService = require('../../services/engagementService');
const { BRAND_COLORS } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('🎵 Show currently playing track with controls')
    .addBooleanOption(option =>
      option
        .setName('detailed')
        .setDescription('Show detailed track information and statistics')
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      const userId = interaction.user.id;
      const guildId = interaction.guild.id;
      const showDetailed = interaction.options.getBoolean('detailed') || false;

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
            'Status Check Failed',
            `❌ ${queueStatus.error}\n\nPlease try again or contact support.`
          )]
        });
      }

      // Check if there's a track loaded
      if (!queueStatus.currentTrack) {
        return await interaction.editReply({
          embeds: [this.createInfoEmbed(
            'No Track Playing',
            '📭 No track is currently loaded in the queue.\n\nUse `/play` to start playing music!'
          )]
        });
      }

      // Award XP for checking now playing
      await EngagementService.trackEngagementActivity(
        userId,
        guildId,
        'music_nowplaying_check',
        interaction.channelId,
        {
          track_title: queueStatus.currentTrack.track_title,
          is_detailed: showDetailed,
          xp_earned: 1
        }
      );

      // Create the now playing embed
      const embed = showDetailed 
        ? await this.createDetailedNowPlayingEmbed(queueStatus, guildId)
        : await this.createStandardNowPlayingEmbed(queueStatus, guildId);

      // Create interactive components
      const components = await this.createNowPlayingComponents(queueStatus, guildId, userId);

      await interaction.editReply({
        embeds: [embed],
        components: components
      });

    } catch (error) {
      console.error('Error executing nowplaying command:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor(BRAND_COLORS.ERROR)
        .setTitle('❌ Now Playing Command Error')
        .setDescription('An unexpected error occurred while displaying track information.')
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
   * Create standard now playing embed
   */
  async createStandardNowPlayingEmbed(queueStatus, guildId) {
    const { currentTrack, isPlaying, isPaused, session, stats } = queueStatus;
    
    const embed = new EmbedBuilder()
      .setColor(isPlaying ? BRAND_COLORS.SUCCESS : BRAND_COLORS.WARNING)
      .setTitle('🎵 Now Playing')
      .setDescription(`**${currentTrack.track_title}**\n${currentTrack.track_artist || 'Unknown Artist'}`);

    // Add track thumbnail if available
    if (currentTrack.track_thumbnail_url) {
      embed.setThumbnail(currentTrack.track_thumbnail_url);
    }

    // Get playback position and duration
    const position = await musicService.getPlaybackPosition(guildId);
    const duration = currentTrack.track_duration_seconds || 0;

    // Add progress information
    if (position && duration) {
      const progressBar = this.createProgressBar(position, duration);
      embed.addFields({
        name: '⏱️ Progress',
        value: `${this.formatDuration(position)} / ${this.formatDuration(duration)}\n${progressBar}`,
        inline: false
      });
    }

    // Add basic track info
    embed.addFields(
      {
        name: '🎤 Requested By',
        value: `<@${currentTrack.requested_by_user_id}>`,
        inline: true
      },
      {
        name: '🎭 Status',
        value: this.getPlaybackStatus(isPlaying, isPaused),
        inline: true
      },
      {
        name: '📊 Queue',
        value: `${stats.unplayedTracks} tracks remaining`,
        inline: true
      }
    );

    // Add cannabis content warning if applicable
    if (currentTrack.is_cannabis_content) {
      embed.addFields({
        name: '🌿 Cannabis Content Warning',
        value: '⚠️ This track contains cannabis-related content\n🔞 Age verification (21+) required',
        inline: false
      });
    }

    // Add session info
    embed.addFields({
      name: '🎪 Session Info',
      value: `**Type:** ${this.getSessionTypeDisplay(session.session_type)}\n**Duration:** ${this.formatDuration(session.total_duration_seconds || 0)}`,
      inline: false
    });

    embed.setFooter({
      text: 'GrowmiesNJ • Now Playing',
      iconURL: 'https://cdn.discordapp.com/emojis/music.png'
    })
    .setTimestamp();

    return embed;
  },

  /**
   * Create detailed now playing embed
   */
  async createDetailedNowPlayingEmbed(queueStatus, guildId) {
    const { currentTrack, isPlaying, isPaused, session, stats } = queueStatus;
    
    const embed = new EmbedBuilder()
      .setColor(isPlaying ? BRAND_COLORS.SUCCESS : BRAND_COLORS.WARNING)
      .setTitle('🎵 Now Playing (Detailed)')
      .setDescription(`**${currentTrack.track_title}**\n${currentTrack.track_artist || 'Unknown Artist'}`);

    // Add track thumbnail if available
    if (currentTrack.track_thumbnail_url) {
      embed.setThumbnail(currentTrack.track_thumbnail_url);
    }

    // Get playback position and duration
    const position = await musicService.getPlaybackPosition(guildId);
    const duration = currentTrack.track_duration_seconds || 0;

    // Add detailed progress information
    if (position && duration) {
      const progressBar = this.createProgressBar(position, duration);
      const remainingTime = duration - position;
      embed.addFields({
        name: '⏱️ Detailed Progress',
        value: `**Current:** ${this.formatDuration(position)}\n**Total:** ${this.formatDuration(duration)}\n**Remaining:** ${this.formatDuration(remainingTime)}\n${progressBar}`,
        inline: false
      });
    }

    // Add detailed track information
    embed.addFields(
      {
        name: '🎤 Track Details',
        value: `**Requested By:** <@${currentTrack.requested_by_user_id}>\n**Source:** ${currentTrack.track_source || 'YouTube'}\n**Added:** ${this.formatTimestamp(currentTrack.created_at)}`,
        inline: true
      },
      {
        name: '🎭 Playback Status',
        value: `**Status:** ${this.getPlaybackStatus(isPlaying, isPaused)}\n**Volume:** ${await musicService.getCurrentVolume(guildId)}%\n**Loops:** ${currentTrack.loop_count || 0}`,
        inline: true
      }
    );

    // Add queue statistics
    embed.addFields({
      name: '📊 Queue Statistics',
      value: `**Total Tracks:** ${stats.totalTracks}\n**Played:** ${stats.playedTracks}\n**Remaining:** ${stats.unplayedTracks}\n**Estimated Time:** ${stats.estimatedPlaytime} minutes`,
      inline: false
    });

    // Add skip vote information if applicable
    const skipVotes = await musicService.getSkipVoteCount(guildId);
    if (skipVotes > 0) {
      const voiceChannel = musicService.getVoiceChannel(guildId);
      const totalVoters = voiceChannel ? voiceChannel.members.filter(m => !m.user.bot).size : 1;
      const requiredVotes = Math.ceil(totalVoters * 0.5);
      
      embed.addFields({
        name: '🗳️ Skip Votes',
        value: `**Current Votes:** ${skipVotes}/${requiredVotes}\n**Progress:** ${Math.round((skipVotes / requiredVotes) * 100)}%`,
        inline: true
      });
    }

    // Add cannabis content detailed warning if applicable
    if (currentTrack.is_cannabis_content) {
      embed.addFields({
        name: '🌿 Cannabis Content Details',
        value: '⚠️ **Content Warning:** This track contains cannabis-related content\n🔞 **Age Requirement:** 21+ verification required\n🛡️ **Compliance:** Content filtered for legal compliance',
        inline: false
      });
    }

    // Add detailed session information
    embed.addFields({
      name: '🎪 Session Details',
      value: `**Type:** ${this.getSessionTypeDisplay(session.session_type)}\n**Started:** ${this.formatTimestamp(session.created_at)}\n**Duration:** ${this.formatDuration(session.total_duration_seconds || 0)}\n**Cannabis Session:** ${session.is_cannabis_content ? '✅ Yes' : '❌ No'}`,
      inline: false
    });

    embed.setFooter({
      text: 'GrowmiesNJ • Detailed Now Playing',
      iconURL: 'https://cdn.discordapp.com/emojis/music.png'
    })
    .setTimestamp();

    return embed;
  },

  /**
   * Create now playing interactive components
   */
  async createNowPlayingComponents(queueStatus, guildId, userId) {
    const { isPlaying, isPaused, stats } = queueStatus;
    const components = [];

    // Primary control row
    const controlRow = new ActionRowBuilder();
    
    if (isPlaying) {
      controlRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`music_pause_${userId}`)
          .setLabel('Pause')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('⏸️')
      );
    } else {
      controlRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`music_resume_${userId}`)
          .setLabel('Resume')
          .setStyle(ButtonStyle.Success)
          .setEmoji('▶️')
      );
    }

    controlRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`music_skip_${userId}`)
        .setLabel('Skip')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('⏭️'),
      new ButtonBuilder()
        .setCustomId(`music_stop_${userId}`)
        .setLabel('Stop')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('⏹️')
    );

    components.push(controlRow);

    // Secondary control row
    const secondaryRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`music_volume_${userId}`)
          .setLabel('Volume')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('🔊'),
        new ButtonBuilder()
          .setCustomId(`music_queue_${userId}`)
          .setLabel(`Queue (${stats.unplayedTracks})`)
          .setStyle(ButtonStyle.Primary)
          .setEmoji('📜'),
        new ButtonBuilder()
          .setCustomId(`nowplaying_refresh_${userId}`)
          .setLabel('Refresh')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('🔄')
      );

    components.push(secondaryRow);

    return components;
  },

  /**
   * Create progress bar visualization
   */
  createProgressBar(position, duration, length = 20) {
    if (!position || !duration || duration === 0) {
      return '`░░░░░░░░░░░░░░░░░░░░`';
    }

    const progress = Math.min(position / duration, 1);
    const filled = Math.round(progress * length);
    const empty = length - filled;
    
    return `\`${'█'.repeat(filled)}${'░'.repeat(empty)}\``;
  },

  /**
   * Get playback status display
   */
  getPlaybackStatus(isPlaying, isPaused) {
    if (isPlaying) return '▶️ Playing';
    if (isPaused) return '⏸️ Paused';
    return '⏹️ Stopped';
  },

  /**
   * Get display text for session type
   */
  getSessionTypeDisplay(sessionType) {
    const types = {
      'general': '🎵 General Music',
      'meditation': '🧘 Meditation',
      'educational': '📚 Educational'
    };
    return types[sessionType] || '🎵 General Music';
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
   * Format timestamp to readable string
   */
  formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
  },

  /**
   * Create error embed
   */
  createErrorEmbed(title, description) {
    return new EmbedBuilder()
      .setColor(BRAND_COLORS.ERROR)
      .setTitle(`❌ ${title}`)
      .setDescription(description)
      .setFooter({ text: 'GrowmiesNJ • Now Playing System' })
      .setTimestamp();
  },

  /**
   * Create info embed
   */
  createInfoEmbed(title, description) {
    return new EmbedBuilder()
      .setColor(BRAND_COLORS.INFO)
      .setTitle(`ℹ️ ${title}`)
      .setDescription(description)
      .setFooter({ text: 'GrowmiesNJ • Now Playing System' })
      .setTimestamp();
  }
};