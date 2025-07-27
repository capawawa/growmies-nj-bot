/**
 * Stop Command for GrowmiesNJ Discord Bot
 * 
 * Music Bot System: Stop music and disconnect from voice channel
 * Features session cleanup, statistics logging, and XP rewards
 */

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const musicService = require('../../services/musicService');
const EngagementService = require('../../services/engagementService');
const { BRAND_COLORS } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('⏹️ Stop music and disconnect from voice channel')
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for stopping the session')
        .setRequired(false)
        .addChoices(
          { name: '✅ Session Complete', value: 'session_complete' },
          { name: '🚪 Leaving Channel', value: 'user_leaving' },
          { name: '🔄 Switching Activity', value: 'switching_activity' },
          { name: '⚠️ Technical Issues', value: 'technical_issues' },
          { name: '🎵 Done Listening', value: 'done_listening' }
        )
    )
    .addBooleanOption(option =>
      option
        .setName('save_queue')
        .setDescription('Save current queue for later (if available)')
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      const userId = interaction.user.id;
      const guildId = interaction.guild.id;
      const reason = interaction.options.getString('reason') || 'user_stop';
      const saveQueue = interaction.options.getBoolean('save_queue') || false;

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

      // Get current session data for statistics
      const queueStatus = await musicService.getQueueStatus(guildId);
      const sessionData = queueStatus.success ? queueStatus : null;

      // Check if user has permission to stop (creator or admin)
      const canStop = await this.checkStopPermission(interaction, sessionData);
      if (!canStop.allowed) {
        return await interaction.editReply({
          embeds: [this.createErrorEmbed(
            'Insufficient Permissions',
            canStop.message
          )]
        });
      }

      // Stop the music session
      const stopResult = await musicService.leaveVoiceChannel(guildId, reason);
      
      if (!stopResult) {
        return await interaction.editReply({
          embeds: [this.createErrorEmbed(
            'Stop Failed',
            '❌ Failed to stop the music session.\n\nPlease try again or contact support.'
          )]
        });
      }

      // Calculate session statistics
      const sessionStats = this.calculateSessionStats(sessionData);

      // Award XP for session participation
      const xpAmount = this.calculateStopXP(sessionStats, reason, userId === sessionData?.session?.created_by_user_id);
      if (xpAmount > 0) {
        await EngagementService.trackEngagementActivity(
          userId,
          guildId,
          'music_session_ended',
          interaction.channelId,
          {
            reason: reason,
            session_duration: sessionStats.duration,
            tracks_played: sessionStats.tracksPlayed,
            was_creator: userId === sessionData?.session?.created_by_user_id,
            xp_earned: xpAmount
          }
        );
      }

      // Create success embed with session summary
      const embed = this.createStopEmbed(
        interaction.user,
        sessionStats,
        reason,
        xpAmount,
        saveQueue
      );

      // Create action buttons for follow-up actions
      const actionRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`music_play_again_${userId}`)
            .setLabel('🎵 Play Again')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`music_stats_${userId}`)
            .setLabel('📊 Session Stats')
            .setStyle(ButtonStyle.Secondary)
        );

      // Add save queue button if requested and queue exists
      if (saveQueue && sessionStats.tracksInQueue > 0) {
        actionRow.addComponents(
          new ButtonBuilder()
            .setCustomId(`music_restore_queue_${userId}`)
            .setLabel('💾 Restore Queue')
            .setStyle(ButtonStyle.Secondary)
        );
      }

      await interaction.editReply({
        embeds: [embed],
        components: [actionRow]
      });

    } catch (error) {
      console.error('Error executing stop command:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor(BRAND_COLORS.ERROR)
        .setTitle('❌ Stop Command Error')
        .setDescription('An unexpected error occurred while stopping the music session.')
        .addFields({
          name: '🔄 What you can try',
          value: '• Try the command again\n• Check if the bot is still in voice channel\n• Contact support if the issue persists',
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
   * Check if user has permission to stop the session
   * @param {CommandInteraction} interaction - Discord interaction
   * @param {Object} sessionData - Current session data
   * @returns {Promise<Object>} - Permission result
   */
  async checkStopPermission(interaction, sessionData) {
    const userId = interaction.user.id;
    const member = interaction.member;

    // Server administrators can always stop
    if (member.permissions.has('Administrator')) {
      return { allowed: true };
    }

    // Session creator can always stop
    if (sessionData?.session?.created_by_user_id === userId) {
      return { allowed: true };
    }

    // Check if user is in the same voice channel
    const botVoiceChannel = sessionData?.session?.voice_channel_id;
    const userVoiceChannel = member.voice.channel?.id;

    if (botVoiceChannel && userVoiceChannel === botVoiceChannel) {
      return { allowed: true };
    }

    // Moderators can stop if needed
    if (member.permissions.has('ManageMessages')) {
      return { allowed: true };
    }

    return {
      allowed: false,
      message: '🚫 You can only stop the music session if you:\n• Created the session\n• Are in the same voice channel\n• Have moderation permissions\n\nThis helps prevent disruption of ongoing sessions.'
    };
  },

  /**
   * Calculate session statistics
   * @param {Object} sessionData - Session data
   * @returns {Object} - Session statistics
   */
  calculateSessionStats(sessionData) {
    if (!sessionData || !sessionData.session) {
      return {
        duration: 0,
        tracksPlayed: 0,
        tracksInQueue: 0,
        sessionType: 'unknown'
      };
    }

    const session = sessionData.session;
    const queue = sessionData.queue || [];
    const stats = sessionData.stats || {};

    // Calculate session duration
    const startTime = new Date(session.started_at);
    const endTime = new Date();
    const duration = Math.floor((endTime - startTime) / 1000 / 60); // Minutes

    return {
      duration: duration,
      tracksPlayed: stats.playedTracks || 0,
      tracksInQueue: stats.unplayedTracks || 0,
      totalTracks: stats.totalTracks || 0,
      sessionType: session.session_type || 'general',
      isCannabisContent: session.is_cannabis_content || false
    };
  },

  /**
   * Calculate XP reward for stopping session
   * @param {Object} sessionStats - Session statistics
   * @param {string} reason - Stop reason
   * @param {boolean} wasCreator - Was user the session creator
   * @returns {number} - XP amount
   */
  calculateStopXP(sessionStats, reason, wasCreator) {
    let baseXP = 2; // Base XP for participating

    // Duration bonus (1 XP per 5 minutes, capped at 10)
    const durationBonus = Math.min(Math.floor(sessionStats.duration / 5), 10);
    baseXP += durationBonus;

    // Tracks played bonus
    const tracksBonus = Math.min(sessionStats.tracksPlayed * 2, 15);
    baseXP += tracksBonus;

    // Creator bonus
    if (wasCreator) {
      baseXP += 5;
    }

    // Reason bonus/penalty
    const reasonModifiers = {
      'session_complete': 1.2,
      'done_listening': 1.1,
      'user_leaving': 1.0,
      'switching_activity': 0.9,
      'technical_issues': 0.8
    };

    const modifier = reasonModifiers[reason] || 1.0;
    baseXP = Math.floor(baseXP * modifier);

    // Cannabis content bonus
    if (sessionStats.isCannabisContent) {
      baseXP += 2;
    }

    return Math.max(1, baseXP);
  },

  /**
   * Create success embed for stopped session
   * @param {User} user - User who stopped session
   * @param {Object} sessionStats - Session statistics
   * @param {string} reason - Stop reason
   * @param {number} xpAmount - XP earned
   * @param {boolean} saveQueue - Queue saved status
   * @returns {EmbedBuilder} - Success embed
   */
  createStopEmbed(user, sessionStats, reason, xpAmount, saveQueue) {
    const embed = new EmbedBuilder()
      .setColor(BRAND_COLORS.WARNING)
      .setTitle('⏹️ Music Session Ended')
      .setDescription(this.getReasonMessage(reason))
      .addFields(
        {
          name: '📊 Session Summary',
          value: `⏱️ **Duration:** ${sessionStats.duration} minutes\n🎵 **Tracks Played:** ${sessionStats.tracksPlayed}\n📜 **Queue Remaining:** ${sessionStats.tracksInQueue}`,
          inline: true
        },
        {
          name: '🎭 Session Details',
          value: `🎪 **Type:** ${this.getSessionTypeDisplay(sessionStats.sessionType)}\n${sessionStats.isCannabisContent ? '🌿 **Cannabis Content:** Yes' : '🎵 **General Music:** Yes'}`,
          inline: true
        },
        {
          name: '🌟 XP Earned',
          value: `+${xpAmount} XP`,
          inline: true
        }
      );

    if (saveQueue && sessionStats.tracksInQueue > 0) {
      embed.addFields({
        name: '💾 Queue Saved',
        value: `Your queue with ${sessionStats.tracksInQueue} track${sessionStats.tracksInQueue !== 1 ? 's' : ''} has been saved!\nUse the "Restore Queue" button to continue later.`,
        inline: false
      });
    }

    embed.setFooter({
      text: 'GrowmiesNJ • Thanks for using the music bot!',
      iconURL: user.displayAvatarURL()
    })
    .setTimestamp();

    return embed;
  },

  /**
   * Create error embed
   * @param {string} title - Error title
   * @param {string} description - Error description
   * @returns {EmbedBuilder} - Error embed
   */
  createErrorEmbed(title, description) {
    return new EmbedBuilder()
      .setColor(BRAND_COLORS.ERROR)
      .setTitle(`❌ ${title}`)
      .setDescription(description)
      .setFooter({
        text: 'GrowmiesNJ • Music Bot System'
      })
      .setTimestamp();
  },

  /**
   * Create info embed
   * @param {string} title - Info title
   * @param {string} description - Info description
   * @returns {EmbedBuilder} - Info embed
   */
  createInfoEmbed(title, description) {
    return new EmbedBuilder()
      .setColor(BRAND_COLORS.INFO)
      .setTitle(`ℹ️ ${title}`)
      .setDescription(description)
      .setFooter({
        text: 'GrowmiesNJ • Music Bot System'
      })
      .setTimestamp();
  },

  /**
   * Get reason message for display
   * @param {string} reason - Stop reason
   * @returns {string} - Display message
   */
  getReasonMessage(reason) {
    const messages = {
      'session_complete': '✅ Session completed successfully! Hope you enjoyed the music.',
      'user_leaving': '🚪 User left the voice channel. Session ended gracefully.',
      'switching_activity': '🔄 Switching to a different activity. See you later!',
      'technical_issues': '⚠️ Session ended due to technical issues. Try again later.',
      'done_listening': '🎵 Finished listening to music. Thanks for tuning in!',
      'user_stop': '⏹️ Music session stopped by user request.'
    };
    return messages[reason] || messages['user_stop'];
  },

  /**
   * Get display text for session type
   * @param {string} sessionType - Session type
   * @returns {string} - Display text
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