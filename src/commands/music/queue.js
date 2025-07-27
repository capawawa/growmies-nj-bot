/**
 * Queue Command for GrowmiesNJ Discord Bot
 * 
 * Music Bot System: Display and manage music queue with interactive controls
 * Features queue manipulation, cannabis content filtering, and pagination
 */

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const musicService = require('../../services/musicService');
const { MusicQueue } = require('../../database/models/MusicQueue');
const EngagementService = require('../../services/engagementService');
const { BRAND_COLORS } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('📜 View and manage the music queue')
    .addSubcommand(subcommand =>
      subcommand
        .setName('show')
        .setDescription('Display the current music queue')
        .addIntegerOption(option =>
          option
            .setName('page')
            .setDescription('Page number to display (default: 1)')
            .setRequired(false)
            .setMinValue(1)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add a track to the queue')
        .addStringOption(option =>
          option
            .setName('query')
            .setDescription('Song name, artist, or YouTube URL')
            .setRequired(true)
        )
        .addBooleanOption(option =>
          option
            .setName('cannabis_content')
            .setDescription('Mark as cannabis-related content (21+ required)')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove a track from the queue')
        .addIntegerOption(option =>
          option
            .setName('position')
            .setDescription('Position in queue to remove (1-based)')
            .setRequired(true)
            .setMinValue(1)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('clear')
        .setDescription('Clear all tracks from the queue')
        .addBooleanOption(option =>
          option
            .setName('confirm')
            .setDescription('Confirm clearing the entire queue')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('shuffle')
        .setDescription('Shuffle the remaining tracks in the queue')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('history')
        .setDescription('View recently played tracks')
        .addIntegerOption(option =>
          option
            .setName('count')
            .setDescription('Number of tracks to show (default: 10)')
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(25)
        )
    ),

  async execute(interaction) {
    try {
      const subcommand = interaction.options.getSubcommand();
      const userId = interaction.user.id;
      const guildId = interaction.guild.id;

      await interaction.deferReply();

      // Check if there's an active session
      if (!musicService.hasActiveSession(guildId)) {
        return await interaction.editReply({
          embeds: [this.createInfoEmbed(
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
            'Queue Access Failed',
            `❌ ${queueStatus.error}\n\nPlease try again or contact support.`
          )]
        });
      }

      // Route to appropriate subcommand handler
      switch (subcommand) {
        case 'show':
          await this.handleShowQueue(interaction, queueStatus, userId);
          break;
        case 'add':
          await this.handleAddToQueue(interaction, queueStatus, userId, guildId);
          break;
        case 'remove':
          await this.handleRemoveFromQueue(interaction, queueStatus, userId, guildId);
          break;
        case 'clear':
          await this.handleClearQueue(interaction, queueStatus, userId, guildId);
          break;
        case 'shuffle':
          await this.handleShuffleQueue(interaction, queueStatus, userId, guildId);
          break;
        case 'history':
          await this.handleShowHistory(interaction, queueStatus, userId, guildId);
          break;
        default:
          await interaction.editReply({
            embeds: [this.createErrorEmbed('Unknown Command', 'Invalid subcommand specified.')]
          });
      }

    } catch (error) {
      console.error('Error executing queue command:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor(BRAND_COLORS.ERROR)
        .setTitle('❌ Queue Command Error')
        .setDescription('An unexpected error occurred while managing the queue.')
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
   * Handle show queue subcommand
   */
  async handleShowQueue(interaction, queueStatus, userId) {
    const page = interaction.options.getInteger('page') || 1;
    const itemsPerPage = 10;
    
    const embed = this.createQueueEmbed(queueStatus, page, itemsPerPage);
    const components = this.createQueueComponents(queueStatus, page, itemsPerPage, userId);

    await interaction.editReply({
      embeds: [embed],
      components: components
    });
  },

  /**
   * Handle add to queue subcommand
   */
  async handleAddToQueue(interaction, queueStatus, userId, guildId) {
    const query = interaction.options.getString('query');
    const isCannabisContent = interaction.options.getBoolean('cannabis_content') || false;

    // Import play command's search functionality
    const playCommand = require('./play');
    const searchResult = await playCommand.searchTrack(query);

    if (!searchResult.success) {
      return await interaction.editReply({
        embeds: [this.createErrorEmbed(
          'Track Not Found',
          `🔍 Could not find "${query}"\n\nTry a different search term or YouTube URL.`
        )]
      });
    }

    // Add to queue using MusicQueue model
    try {
      await MusicQueue.addToQueue(queueStatus.session.id, {
        url: searchResult.track.url,
        title: searchResult.track.title,
        duration: searchResult.track.duration,
        requestedBy: userId,
        source: searchResult.track.source,
        isCannabisContent: isCannabisContent,
        metadata: searchResult.track
      });

      // Award XP for queue management
      await EngagementService.trackEngagementActivity(
        userId,
        guildId,
        'music_queue_add',
        interaction.channelId,
        {
          track_title: searchResult.track.title,
          is_cannabis_content: isCannabisContent,
          xp_earned: 3
        }
      );

      const embed = new EmbedBuilder()
        .setColor(BRAND_COLORS.SUCCESS)
        .setTitle('✅ Track Added to Queue')
        .setDescription(`**${searchResult.track.title}** has been added to the queue!`)
        .addFields(
          {
            name: '🎤 Artist',
            value: searchResult.track.artist || 'Unknown Artist',
            inline: true
          },
          {
            name: '⏱️ Duration',
            value: searchResult.track.duration ? this.formatDuration(searchResult.track.duration) : 'Unknown',
            inline: true
          },
          {
            name: '🌟 XP Earned',
            value: '+3 XP',
            inline: true
          }
        );

      if (isCannabisContent) {
        embed.addFields({
          name: '🌿 Cannabis Content',
          value: '⚠️ Marked as cannabis-related content (21+ verified)',
          inline: false
        });
      }

      if (searchResult.track.thumbnail) {
        embed.setThumbnail(searchResult.track.thumbnail);
      }

      embed.setFooter({
        text: 'GrowmiesNJ • Track queued successfully',
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error adding to queue:', error);
      await interaction.editReply({
        embeds: [this.createErrorEmbed(
          'Queue Add Failed',
          'Failed to add track to queue. Please try again.'
        )]
      });
    }
  },

  /**
   * Handle remove from queue subcommand
   */
  async handleRemoveFromQueue(interaction, queueStatus, userId, guildId) {
    const position = interaction.options.getInteger('position');

    try {
      const removed = await MusicQueue.removeFromQueue(queueStatus.session.id, position);
      
      if (!removed) {
        return await interaction.editReply({
          embeds: [this.createErrorEmbed(
            'Remove Failed',
            `❌ No track found at position ${position} in the queue.`
          )]
        });
      }

      // Award XP for queue management
      await EngagementService.trackEngagementActivity(
        userId,
        guildId,
        'music_queue_remove',
        interaction.channelId,
        {
          position: position,
          xp_earned: 2
        }
      );

      const embed = new EmbedBuilder()
        .setColor(BRAND_COLORS.WARNING)
        .setTitle('🗑️ Track Removed from Queue')
        .setDescription(`Track at position **${position}** has been removed from the queue.`)
        .addFields({
          name: '🌟 XP Earned',
          value: '+2 XP',
          inline: true
        })
        .setFooter({
          text: 'GrowmiesNJ • Queue updated',
          iconURL: interaction.user.displayAvatarURL()
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error removing from queue:', error);
      await interaction.editReply({
        embeds: [this.createErrorEmbed(
          'Remove Failed',
          'Failed to remove track from queue. Please try again.'
        )]
      });
    }
  },

  /**
   * Handle clear queue subcommand
   */
  async handleClearQueue(interaction, queueStatus, userId, guildId) {
    const confirm = interaction.options.getBoolean('confirm');

    if (!confirm) {
      return await interaction.editReply({
        embeds: [this.createErrorEmbed(
          'Confirmation Required',
          '⚠️ You must confirm clearing the queue by setting the `confirm` option to `true`.\n\nThis action cannot be undone!'
        )]
      });
    }

    try {
      const clearedCount = await MusicQueue.clearQueue(queueStatus.session.id, true);

      // Award XP for queue management
      await EngagementService.trackEngagementActivity(
        userId,
        guildId,
        'music_queue_clear',
        interaction.channelId,
        {
          tracks_cleared: clearedCount,
          xp_earned: 5
        }
      );

      const embed = new EmbedBuilder()
        .setColor(BRAND_COLORS.WARNING)
        .setTitle('🧹 Queue Cleared')
        .setDescription(`Successfully cleared **${clearedCount}** track${clearedCount !== 1 ? 's' : ''} from the queue.`)
        .addFields({
          name: '🌟 XP Earned',
          value: '+5 XP',
          inline: true
        })
        .setFooter({
          text: 'GrowmiesNJ • Queue management',
          iconURL: interaction.user.displayAvatarURL()
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error clearing queue:', error);
      await interaction.editReply({
        embeds: [this.createErrorEmbed(
          'Clear Failed',
          'Failed to clear the queue. Please try again.'
        )]
      });
    }
  },

  /**
   * Handle shuffle queue subcommand
   */
  async handleShuffleQueue(interaction, queueStatus, userId, guildId) {
    try {
      const shuffled = await MusicQueue.shuffleQueue(queueStatus.session.id);

      if (!shuffled) {
        return await interaction.editReply({
          embeds: [this.createErrorEmbed(
            'Shuffle Failed',
            '❌ Unable to shuffle the queue. Make sure there are tracks in the queue.'
          )]
        });
      }

      // Award XP for queue management
      await EngagementService.trackEngagementActivity(
        userId,
        guildId,
        'music_queue_shuffle',
        interaction.channelId,
        {
          xp_earned: 3
        }
      );

      const embed = new EmbedBuilder()
        .setColor(BRAND_COLORS.SUCCESS)
        .setTitle('🔀 Queue Shuffled')
        .setDescription('🎲 The queue has been shuffled! Tracks will now play in a random order.')
        .addFields({
          name: '🌟 XP Earned',
          value: '+3 XP',
          inline: true
        })
        .setFooter({
          text: 'GrowmiesNJ • Mix it up!',
          iconURL: interaction.user.displayAvatarURL()
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error shuffling queue:', error);
      await interaction.editReply({
        embeds: [this.createErrorEmbed(
          'Shuffle Failed',
          'Failed to shuffle the queue. Please try again.'
        )]
      });
    }
  },

  /**
   * Handle show history subcommand
   */
  async handleShowHistory(interaction, queueStatus, userId, guildId) {
    const count = interaction.options.getInteger('count') || 10;

    try {
      // Get played tracks from database
      const playedTracks = await MusicQueue.findAll({
        where: {
          session_id: queueStatus.session.id,
          played_at: { [require('@sequelize/core').Op.ne]: null }
        },
        order: [['played_at', 'DESC']],
        limit: count
      });

      if (playedTracks.length === 0) {
        return await interaction.editReply({
          embeds: [this.createInfoEmbed(
            'No History',
            '📜 No tracks have been played in this session yet.\n\nStart playing music to build up your history!'
          )]
        });
      }

      const embed = this.createHistoryEmbed(playedTracks, queueStatus);
      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error getting queue history:', error);
      await interaction.editReply({
        embeds: [this.createErrorEmbed(
          'History Failed',
          'Failed to retrieve queue history. Please try again.'
        )]
      });
    }
  },

  /**
   * Create queue display embed
   */
  createQueueEmbed(queueStatus, page, itemsPerPage) {
    const { queue, stats, currentTrack, isPlaying } = queueStatus;
    const totalPages = Math.ceil(stats.unplayedTracks / itemsPerPage);
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageQueue = queue.slice(startIndex, endIndex);

    const embed = new EmbedBuilder()
      .setColor(BRAND_COLORS.PRIMARY_GREEN)
      .setTitle('📜 Music Queue')
      .setDescription(this.getQueueDescription(queueStatus));

    // Current track info
    if (currentTrack && isPlaying) {
      embed.addFields({
        name: '🎵 Currently Playing',
        value: `**${currentTrack.title}**\n${currentTrack.artist ? `by ${currentTrack.artist}` : 'Unknown Artist'}`,
        inline: false
      });
    }

    // Queue items
    if (pageQueue.length > 0) {
      const queueList = pageQueue.map((track, index) => {
        const position = startIndex + index + 1;
        const cannabis = track.is_cannabis_content ? '🌿 ' : '';
        const duration = track.track_duration_seconds ? this.formatDuration(track.track_duration_seconds) : 'Unknown';
        return `**${position}.** ${cannabis}${track.track_title}\n⏱️ ${duration} • Requested by <@${track.requested_by_user_id}>`;
      }).join('\n\n');

      embed.addFields({
        name: `📋 Queue (${stats.unplayedTracks} tracks)`,
        value: queueList.length > 0 ? queueList : 'Queue is empty',
        inline: false
      });
    }

    // Queue statistics
    embed.addFields(
      {
        name: '📊 Statistics',
        value: `🎵 **Total:** ${stats.totalTracks}\n✅ **Played:** ${stats.playedTracks}\n⏳ **Remaining:** ${stats.unplayedTracks}`,
        inline: true
      },
      {
        name: '⏱️ Estimated Time',
        value: `${stats.estimatedPlaytime} minutes`,
        inline: true
      }
    );

    // Pagination info
    if (totalPages > 1) {
      embed.setFooter({
        text: `GrowmiesNJ • Page ${page}/${totalPages} • Use buttons to navigate`
      });
    } else {
      embed.setFooter({ text: 'GrowmiesNJ • Music Queue System' });
    }

    embed.setTimestamp();
    return embed;
  },

  /**
   * Create queue control components
   */
  createQueueComponents(queueStatus, page, itemsPerPage, userId) {
    const components = [];
    const totalPages = Math.ceil(queueStatus.stats.unplayedTracks / itemsPerPage);

    // Navigation buttons
    if (totalPages > 1) {
      const navRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`queue_prev_${userId}_${page}`)
            .setLabel('◀️ Previous')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page <= 1),
          new ButtonBuilder()
            .setCustomId(`queue_next_${userId}_${page}`)
            .setLabel('Next ▶️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page >= totalPages)
        );
      components.push(navRow);
    }

    // Action buttons
    const actionRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`queue_shuffle_${userId}`)
          .setLabel('🔀 Shuffle')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`queue_clear_${userId}`)
          .setLabel('🧹 Clear')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(`queue_refresh_${userId}`)
          .setLabel('🔄 Refresh')
          .setStyle(ButtonStyle.Secondary)
      );
    components.push(actionRow);

    return components;
  },

  /**
   * Create history embed
   */
  createHistoryEmbed(playedTracks, queueStatus) {
    const embed = new EmbedBuilder()
      .setColor(BRAND_COLORS.INFO)
      .setTitle('📜 Recently Played Tracks')
      .setDescription(`History from current session (${queueStatus.session.session_type})`);

    const historyList = playedTracks.map((track, index) => {
      const cannabis = track.is_cannabis_content ? '🌿 ' : '';
      const duration = track.track_duration_seconds ? this.formatDuration(track.track_duration_seconds) : 'Unknown';
      const playedAt = new Date(track.played_at).toLocaleTimeString();
      return `**${index + 1}.** ${cannabis}${track.track_title}\n⏱️ ${duration} • Played at ${playedAt}`;
    }).join('\n\n');

    embed.addFields({
      name: '🎵 Track History',
      value: historyList,
      inline: false
    });

    embed.setFooter({
      text: 'GrowmiesNJ • Session History',
    })
    .setTimestamp();

    return embed;
  },

  /**
   * Get queue description text
   */
  getQueueDescription(queueStatus) {
    const { stats, session } = queueStatus;
    
    if (stats.unplayedTracks === 0) {
      return '🎵 The queue is empty! Use `/queue add` to add tracks or `/play` to start fresh.';
    }

    let description = `🎪 **Session:** ${this.getSessionTypeDisplay(session.session_type)}\n`;
    
    if (session.is_cannabis_content) {
      description += '🌿 **Cannabis Content:** 21+ verified session\n';
    }
    
    description += `🎵 **Up Next:** ${stats.unplayedTracks} track${stats.unplayedTracks !== 1 ? 's' : ''} queued`;
    
    return description;
  },

  /**
   * Create error embed
   */
  createErrorEmbed(title, description) {
    return new EmbedBuilder()
      .setColor(BRAND_COLORS.ERROR)
      .setTitle(`❌ ${title}`)
      .setDescription(description)
      .setFooter({ text: 'GrowmiesNJ • Music Queue System' })
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
      .setFooter({ text: 'GrowmiesNJ • Music Queue System' })
      .setTimestamp();
  },

  /**
   * Format duration seconds to readable string
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
   */
  getSessionTypeDisplay(sessionType) {
    const types = {
      'general': '🎵 General Music',
      'meditation': '🧘 Meditation',
      'educational': '📚 Educational'
    };
    return types[sessionType] || '🎵 General Music';
  }
};