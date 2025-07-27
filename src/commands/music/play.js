/**
 * Play Command for GrowmiesNJ Discord Bot
 * 
 * Music Bot System: Play music from YouTube/URL with cannabis compliance
 * Features age verification, queue management, and XP rewards
 */

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const ytdl = require('ytdl-core');
const ytsr = require('ytsr');
const musicService = require('../../services/musicService');
const EngagementService = require('../../services/engagementService');
const { WelcomeEmbeds, BRAND_COLORS } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('🎵 Play music in voice channel with cannabis community features')
    .addStringOption(option =>
      option
        .setName('query')
        .setDescription('Song name, artist, or YouTube URL to play')
        .setRequired(true)
    )
    .addBooleanOption(option =>
      option
        .setName('cannabis_content')
        .setDescription('Mark this track as cannabis-related content (21+ required)')
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName('session_type')
        .setDescription('Type of music session')
        .setRequired(false)
        .addChoices(
          { name: '🎵 General Music', value: 'general' },
          { name: '🧘 Meditation Session', value: 'meditation' },
          { name: '📚 Educational Content', value: 'educational' }
        )
    )
    .addIntegerOption(option =>
      option
        .setName('volume')
        .setDescription('Set initial volume (0-100)')
        .setRequired(false)
        .setMinValue(0)
        .setMaxValue(100)
    ),

  async execute(interaction) {
    try {
      const userId = interaction.user.id;
      const guildId = interaction.guild.id;
      const query = interaction.options.getString('query');
      const isCannabisContent = interaction.options.getBoolean('cannabis_content') || false;
      const sessionType = interaction.options.getString('session_type') || 'general';
      const volume = interaction.options.getInteger('volume') || 50;

      await interaction.deferReply();

      // Check if user is in a voice channel
      const member = interaction.member;
      if (!member.voice.channel) {
        return await interaction.editReply({
          embeds: [this.createErrorEmbed(
            'Voice Channel Required',
            '🔊 You must be in a voice channel to play music!\n\nJoin a voice channel and try again.'
          )]
        });
      }

      // Check bot permissions
      const voiceChannel = member.voice.channel;
      const permissions = voiceChannel.permissionsFor(interaction.guild.members.me);
      
      if (!permissions.has([PermissionFlagsBits.Connect, PermissionFlagsBits.Speak])) {
        return await interaction.editReply({
          embeds: [this.createErrorEmbed(
            'Missing Permissions',
            '🚫 I need **Connect** and **Speak** permissions in that voice channel!\n\nPlease check my permissions and try again.'
          )]
        });
      }

      // Handle cannabis content and session type verification
      if (isCannabisContent || sessionType === 'meditation' || sessionType === 'educational') {
        const canAccess = await musicService.validateCannabisAccess(userId, guildId);
        if (!canAccess.success) {
          return await interaction.editReply({
            embeds: [this.createErrorEmbed(
              'Age Verification Required',
              `🔞 ${canAccess.error}\n\nCannabis-related content requires 21+ verification for legal compliance.`,
              'Use `/verify` to complete age verification'
            )]
          });
        }
      }

      // Search for the track
      const searchResult = await this.searchTrack(query);
      if (!searchResult.success) {
        return await interaction.editReply({
          embeds: [this.createErrorEmbed(
            'Track Not Found',
            `🔍 Could not find "${query}"\n\nTry a different search term or YouTube URL.`,
            searchResult.error
          )]
        });
      }

      const track = searchResult.track;

      // Check if there's already an active session
      let sessionResult;
      if (!musicService.hasActiveSession(guildId)) {
        // Create new session
        sessionResult = await musicService.joinVoiceChannel(
          guildId,
          voiceChannel.id,
          interaction.channel.id,
          userId,
          {
            guild: interaction.guild,
            voiceChannelName: voiceChannel.name,
            textChannelName: interaction.channel.name,
            sessionType: sessionType,
            isCannabisContent: isCannabisContent,
            volume: volume,
            metadata: {
              initial_track: track.title,
              created_via: 'play_command'
            }
          }
        );

        if (!sessionResult.success) {
          return await interaction.editReply({
            embeds: [this.createErrorEmbed(
              'Session Creation Failed',
              `❌ ${sessionResult.error}\n\nPlease try again or contact support.`
            )]
          });
        }
      }

      // Play the track
      const playResult = await musicService.playTrack(guildId, track.url, {
        title: track.title,
        duration: track.duration,
        requestedBy: userId,
        source: track.source,
        isCannabisContent: isCannabisContent,
        thumbnail: track.thumbnail,
        artist: track.artist,
        metadata: {
          session_type: sessionType,
          added_via: 'play_command'
        }
      });

      if (!playResult.success) {
        return await interaction.editReply({
          embeds: [this.createErrorEmbed(
            'Playback Failed',
            `❌ ${playResult.error}\n\nTry a different track or check your connection.`
          )]
        });
      }

      // Award XP for music engagement
      const xpAmount = this.calculateMusicXP(track, sessionType, isCannabisContent);
      await EngagementService.trackEngagementActivity(
        userId,
        guildId,
        'music_play',
        interaction.channelId,
        {
          track_title: track.title,
          track_url: track.url,
          session_type: sessionType,
          is_cannabis_content: isCannabisContent,
          xp_earned: xpAmount
        }
      );

      // Create success embed
      const embed = this.createPlayEmbed(track, member, sessionType, isCannabisContent, xpAmount);

      // Create control buttons
      const actionRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`music_pause_${userId}`)
            .setLabel('⏸️ Pause')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`music_skip_${userId}`)
            .setLabel('⏭️ Skip')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`music_queue_${userId}`)
            .setLabel('📜 Queue')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`music_stop_${userId}`)
            .setLabel('⏹️ Stop')
            .setStyle(ButtonStyle.Danger)
        );

      await interaction.editReply({
        embeds: [embed],
        components: [actionRow]
      });

    } catch (error) {
      console.error('Error executing play command:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor(BRAND_COLORS.ERROR)
        .setTitle('❌ Music System Error')
        .setDescription('An unexpected error occurred while trying to play music.')
        .addFields({
          name: '🔄 Troubleshooting',
          value: '• Check if the URL is valid\n• Ensure the bot has proper permissions\n• Try a different track\n• Contact support if issues persist',
          inline: false
        })
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
   * Search for a track using query or URL
   * @param {string} query - Search query or URL
   * @returns {Promise<Object>} - Search result
   */
  async searchTrack(query) {
    try {
      // Check if it's a direct YouTube URL
      if (ytdl.validateURL(query)) {
        const info = await ytdl.getInfo(query);
        const videoDetails = info.videoDetails;
        
        return {
          success: true,
          track: {
            title: videoDetails.title,
            url: query,
            duration: parseInt(videoDetails.lengthSeconds),
            thumbnail: videoDetails.thumbnails[0]?.url,
            artist: videoDetails.author.name,
            source: 'youtube'
          }
        };
      }

      // Search YouTube
      const searchResults = await ytsr(query, { limit: 1 });
      if (!searchResults.items.length) {
        return {
          success: false,
          error: 'No results found for your search'
        };
      }

      const video = searchResults.items[0];
      
      // Validate the URL is playable
      if (!ytdl.validateURL(video.url)) {
        return {
          success: false,
          error: 'Found track is not playable'
        };
      }

      return {
        success: true,
        track: {
          title: video.title,
          url: video.url,
          duration: this.parseDuration(video.duration),
          thumbnail: video.bestThumbnail.url,
          artist: video.author.name,
          source: 'youtube'
        }
      };

    } catch (error) {
      console.error('Error searching for track:', error);
      return {
        success: false,
        error: 'Search service temporarily unavailable'
      };
    }
  },

  /**
   * Parse duration string to seconds
   * @param {string} duration - Duration string (e.g., "3:45")
   * @returns {number} - Duration in seconds
   */
  parseDuration(duration) {
    if (!duration) return 0;
    
    const parts = duration.split(':').reverse();
    let seconds = 0;
    
    for (let i = 0; i < parts.length; i++) {
      seconds += parseInt(parts[i]) * Math.pow(60, i);
    }
    
    return seconds;
  },

  /**
   * Calculate XP reward for music activity
   * @param {Object} track - Track information
   * @param {string} sessionType - Session type
   * @param {boolean} isCannabisContent - Is cannabis content
   * @returns {number} - XP amount
   */
  calculateMusicXP(track, sessionType, isCannabisContent) {
    let baseXP = 5; // Base XP for playing music
    
    // Session type bonuses
    if (sessionType === 'meditation') baseXP += 3;
    if (sessionType === 'educational') baseXP += 2;
    
    // Cannabis content bonus for verified users
    if (isCannabisContent) baseXP += 2;
    
    // Duration bonus (longer tracks = more XP, capped)
    if (track.duration) {
      const durationMinutes = track.duration / 60;
      const durationBonus = Math.min(Math.floor(durationMinutes / 2), 5);
      baseXP += durationBonus;
    }
    
    return baseXP;
  },

  /**
   * Create success embed for playing track
   * @param {Object} track - Track information
   * @param {GuildMember} member - User who requested
   * @param {string} sessionType - Session type
   * @param {boolean} isCannabisContent - Is cannabis content
   * @param {number} xpAmount - XP earned
   * @returns {EmbedBuilder} - Success embed
   */
  createPlayEmbed(track, member, sessionType, isCannabisContent, xpAmount) {
    const embed = new EmbedBuilder()
      .setColor(BRAND_COLORS.SUCCESS)
      .setTitle('🎵 Now Playing')
      .setDescription(`**${track.title}**`)
      .addFields(
        {
          name: '🎤 Artist',
          value: track.artist || 'Unknown Artist',
          inline: true
        },
        {
          name: '⏱️ Duration',
          value: track.duration ? this.formatDuration(track.duration) : 'Unknown',
          inline: true
        },
        {
          name: '🌟 XP Earned',
          value: `+${xpAmount} XP`,
          inline: true
        },
        {
          name: '👤 Requested by',
          value: member.displayName,
          inline: true
        },
        {
          name: '🎭 Session Type',
          value: this.getSessionTypeDisplay(sessionType),
          inline: true
        },
        {
          name: '🔊 Source',
          value: track.source.charAt(0).toUpperCase() + track.source.slice(1),
          inline: true
        }
      );

    // Add thumbnail if available
    if (track.thumbnail) {
      embed.setThumbnail(track.thumbnail);
    }

    // Add cannabis content notice
    if (isCannabisContent) {
      embed.addFields({
        name: '🌿 Cannabis Content',
        value: '⚠️ This track contains cannabis-related content (21+ verified)',
        inline: false
      });
      embed.setColor(BRAND_COLORS.PRIMARY_GREEN);
    }

    embed.setFooter({
      text: 'GrowmiesNJ • Use the buttons below to control playback',
      iconURL: member.user.displayAvatarURL()
    })
    .setTimestamp();

    return embed;
  },

  /**
   * Create error embed
   * @param {string} title - Error title
   * @param {string} description - Error description
   * @param {string} footer - Optional footer text
   * @returns {EmbedBuilder} - Error embed
   */
  createErrorEmbed(title, description, footer = null) {
    const embed = new EmbedBuilder()
      .setColor(BRAND_COLORS.ERROR)
      .setTitle(`❌ ${title}`)
      .setDescription(description)
      .setFooter({
        text: footer || 'GrowmiesNJ • Music Bot System'
      })
      .setTimestamp();

    return embed;
  },

  /**
   * Format duration seconds to readable string
   * @param {number} seconds - Duration in seconds
   * @returns {string} - Formatted duration
   */
  formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  },

  /**
   * Get display text for session type
   * @param {string} sessionType - Session type
   * @returns {string} - Display text
   */
  getSessionTypeDisplay(sessionType) {
    const types = {
      'general': '🎵 General Music',
      'meditation': '🧘 Meditation Session',
      'educational': '📚 Educational Content'
    };
    return types[sessionType] || '🎵 General Music';
  }
};