/**
 * Skip Command for GrowmiesNJ Discord Bot
 * 
 * Music Bot System: Skip current track and advance to next in queue
 * Features voting system, cannabis compliance, and session management
 */

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const musicService = require('../../services/musicService');
const { MusicQueue } = require('../../database/models/MusicQueue');
const EngagementService = require('../../services/engagementService');
const { BRAND_COLORS } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('⏭️ Skip the current track')
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for skipping (optional)')
        .setRequired(false)
    )
    .addBooleanOption(option =>
      option
        .setName('force')
        .setDescription('Force skip without voting (admin only)')
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      const userId = interaction.user.id;
      const guildId = interaction.guild.id;
      const reason = interaction.options.getString('reason') || 'No reason provided';
      const forceSkip = interaction.options.getBoolean('force') || false;

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
            'Skip Failed',
            `❌ ${queueStatus.error}\n\nPlease try again or contact support.`
          )]
        });
      }

      // Check if there's a track currently playing
      if (!queueStatus.currentTrack || !queueStatus.isPlaying) {
        return await interaction.editReply({
          embeds: [this.createErrorEmbed(
            'Nothing Playing',
            '⏸️ No track is currently playing.\n\nUse `/play` to start playing music!'
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
            '🔊 You must be in a voice channel to skip tracks.\n\nJoin the voice channel and try again!'
          )]
        });
      }

      if (botVoiceChannel && member.voice.channel.id !== botVoiceChannel.id) {
        return await interaction.editReply({
          embeds: [this.createErrorEmbed(
            'Wrong Voice Channel',
            `🔊 You must be in **${botVoiceChannel.name}** to skip tracks.\n\nJoin the same voice channel as the bot!`
          )]
        });
      }

      // Check for force skip permissions (admin/DJ role)
      if (forceSkip) {
        const hasPermission = await this.checkSkipPermissions(interaction.member);
        if (!hasPermission) {
          return await interaction.editReply({
            embeds: [this.createErrorEmbed(
              'Insufficient Permissions',
              '🛡️ You need administrator permissions or a DJ role to force skip.\n\nUse `/skip` without the force option to vote for a skip.'
            )]
          });
        }

        // Execute force skip
        return await this.executeForceSkip(interaction, queueStatus, userId, guildId, reason);
      }

      // Check if user is the track requester (can skip their own tracks)
      if (queueStatus.currentTrack.requested_by_user_id === userId) {
        return await this.executeOwnerSkip(interaction, queueStatus, userId, guildId, reason);
      }

      // Execute voting skip
      await this.executeVotingSkip(interaction, queueStatus, userId, guildId, reason);

    } catch (error) {
      console.error('Error executing skip command:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor(BRAND_COLORS.ERROR)
        .setTitle('❌ Skip Command Error')
        .setDescription('An unexpected error occurred while skipping the track.')
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
   * Execute force skip (admin/DJ only)
   */
  async executeForceSkip(interaction, queueStatus, userId, guildId, reason) {
    const currentTrack = queueStatus.currentTrack;
    
    try {
      // Skip to next track
      const skipResult = await musicService.skipTrack(guildId, {
        skippedBy: userId,
        reason: reason,
        type: 'force',
        timestamp: new Date()
      });

      if (!skipResult.success) {
        return await interaction.editReply({
          embeds: [this.createErrorEmbed(
            'Skip Failed',
            `❌ ${skipResult.error}\n\nPlease try again.`
          )]
        });
      }

      // Award XP for skip action
      await EngagementService.trackEngagementActivity(
        userId,
        guildId,
        'music_force_skip',
        interaction.channelId,
        {
          track_title: currentTrack.track_title,
          reason: reason,
          xp_earned: 2
        }
      );

      // Create skip confirmation embed
      const embed = new EmbedBuilder()
        .setColor(BRAND_COLORS.WARNING)
        .setTitle('⏭️ Track Force Skipped')
        .setDescription(`**${currentTrack.track_title}** has been force skipped by an administrator.`)
        .addFields(
          {
            name: '🎵 Skipped Track',
            value: `${currentTrack.track_title}\n${currentTrack.track_artist || 'Unknown Artist'}`,
            inline: true
          },
          {
            name: '📝 Reason',
            value: reason,
            inline: true
          },
          {
            name: '🌟 XP Earned',
            value: '+2 XP',
            inline: true
          }
        );

      // Add next track info if available
      if (skipResult.nextTrack) {
        embed.addFields({
          name: '⏭️ Now Playing',
          value: `**${skipResult.nextTrack.title}**\n${skipResult.nextTrack.artist || 'Unknown Artist'}`,
          inline: false
        });
      } else {
        embed.addFields({
          name: '📜 Queue Status',
          value: 'No more tracks in queue. Session will end.',
          inline: false
        });
      }

      embed.setFooter({
        text: 'GrowmiesNJ • Force Skip Executed',
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error executing force skip:', error);
      await interaction.editReply({
        embeds: [this.createErrorEmbed(
          'Force Skip Failed',
          'Failed to force skip the track. Please try again.'
        )]
      });
    }
  },

  /**
   * Execute owner skip (track requester)
   */
  async executeOwnerSkip(interaction, queueStatus, userId, guildId, reason) {
    const currentTrack = queueStatus.currentTrack;
    
    try {
      // Skip to next track
      const skipResult = await musicService.skipTrack(guildId, {
        skippedBy: userId,
        reason: reason,
        type: 'owner',
        timestamp: new Date()
      });

      if (!skipResult.success) {
        return await interaction.editReply({
          embeds: [this.createErrorEmbed(
            'Skip Failed',
            `❌ ${skipResult.error}\n\nPlease try again.`
          )]
        });
      }

      // Award XP for skip action
      await EngagementService.trackEngagementActivity(
        userId,
        guildId,
        'music_owner_skip',
        interaction.channelId,
        {
          track_title: currentTrack.track_title,
          reason: reason,
          xp_earned: 1
        }
      );

      // Create skip confirmation embed
      const embed = new EmbedBuilder()
        .setColor(BRAND_COLORS.SUCCESS)
        .setTitle('⏭️ Track Skipped')
        .setDescription(`**${currentTrack.track_title}** has been skipped by the requester.`)
        .addFields(
          {
            name: '🎵 Skipped Track',
            value: `${currentTrack.track_title}\n${currentTrack.track_artist || 'Unknown Artist'}`,
            inline: true
          },
          {
            name: '📝 Reason',
            value: reason,
            inline: true
          },
          {
            name: '🌟 XP Earned',
            value: '+1 XP',
            inline: true
          }
        );

      // Add next track info if available
      if (skipResult.nextTrack) {
        embed.addFields({
          name: '⏭️ Now Playing',
          value: `**${skipResult.nextTrack.title}**\n${skipResult.nextTrack.artist || 'Unknown Artist'}`,
          inline: false
        });
      }

      embed.setFooter({
        text: 'GrowmiesNJ • Owner Skip',
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error executing owner skip:', error);
      await interaction.editReply({
        embeds: [this.createErrorEmbed(
          'Owner Skip Failed',
          'Failed to skip your track. Please try again.'
        )]
      });
    }
  },

  /**
   * Execute voting skip system
   */
  async executeVotingSkip(interaction, queueStatus, userId, guildId, reason) {
    const currentTrack = queueStatus.currentTrack;
    const voiceChannel = musicService.getVoiceChannel(guildId);
    
    // Count users in voice channel (excluding bots)
    const voiceMembers = voiceChannel.members.filter(member => !member.user.bot);
    const totalVoters = voiceMembers.size;
    const requiredVotes = Math.ceil(totalVoters * 0.5); // 50% majority

    // Check if user already voted to skip
    const existingVote = await musicService.getSkipVote(guildId, userId);
    if (existingVote) {
      return await interaction.editReply({
        embeds: [this.createErrorEmbed(
          'Already Voted',
          '🗳️ You have already voted to skip this track.\n\nWait for more votes or use `/nowplaying` to see current vote count.'
        )]
      });
    }

    // Add skip vote
    await musicService.addSkipVote(guildId, userId, reason);
    const currentVotes = await musicService.getSkipVoteCount(guildId);

    // Award XP for participation
    await EngagementService.trackEngagementActivity(
      userId,
      guildId,
      'music_skip_vote',
      interaction.channelId,
      {
        track_title: currentTrack.track_title,
        votes_needed: requiredVotes,
        current_votes: currentVotes,
        xp_earned: 1
      }
    );

    // Check if enough votes to skip
    if (currentVotes >= requiredVotes) {
      // Execute the skip
      const skipResult = await musicService.skipTrack(guildId, {
        skippedBy: 'vote',
        reason: 'Vote skip executed',
        type: 'vote',
        votes: currentVotes,
        timestamp: new Date()
      });

      if (!skipResult.success) {
        return await interaction.editReply({
          embeds: [this.createErrorEmbed(
            'Skip Failed',
            `❌ ${skipResult.error}\n\nVote was successful but skip execution failed.`
          )]
        });
      }

      // Create skip success embed
      const embed = new EmbedBuilder()
        .setColor(BRAND_COLORS.SUCCESS)
        .setTitle('⏭️ Track Vote Skipped')
        .setDescription(`**${currentTrack.track_title}** has been skipped by community vote!`)
        .addFields(
          {
            name: '🗳️ Vote Results',
            value: `${currentVotes}/${requiredVotes} votes received`,
            inline: true
          },
          {
            name: '🌟 XP Earned',
            value: '+1 XP',
            inline: true
          }
        );

      // Add next track info if available
      if (skipResult.nextTrack) {
        embed.addFields({
          name: '⏭️ Now Playing',
          value: `**${skipResult.nextTrack.title}**\n${skipResult.nextTrack.artist || 'Unknown Artist'}`,
          inline: false
        });
      }

      embed.setFooter({
        text: 'GrowmiesNJ • Vote Skip Successful',
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } else {
      // Vote registered, waiting for more votes
      const embed = new EmbedBuilder()
        .setColor(BRAND_COLORS.INFO)
        .setTitle('🗳️ Skip Vote Registered')
        .setDescription(`Your vote to skip **${currentTrack.track_title}** has been registered!`)
        .addFields(
          {
            name: '📊 Vote Progress',
            value: `${currentVotes}/${requiredVotes} votes needed`,
            inline: true
          },
          {
            name: '📝 Your Reason',
            value: reason,
            inline: true
          },
          {
            name: '🌟 XP Earned',
            value: '+1 XP',
            inline: true
          }
        );

      embed.setFooter({
        text: 'GrowmiesNJ • Waiting for more votes',
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

      // Add voting buttons
      const components = this.createVotingComponents(currentVotes, requiredVotes);
      
      await interaction.editReply({ 
        embeds: [embed],
        components: components
      });
    }
  },

  /**
   * Create voting interaction components
   */
  createVotingComponents(currentVotes, requiredVotes) {
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('skip_vote_info')
          .setLabel(`${currentVotes}/${requiredVotes} votes`)
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('🗳️')
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId('nowplaying_info')
          .setLabel('Now Playing')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🎵')
      );

    return [row];
  },

  /**
   * Check if user has skip permissions
   */
  async checkSkipPermissions(member) {
    // Check for administrator permission
    if (member.permissions.has('Administrator')) {
      return true;
    }

    // Check for DJ role (case insensitive)
    const djRole = member.roles.cache.find(role => 
      role.name.toLowerCase().includes('dj') || 
      role.name.toLowerCase().includes('music')
    );
    
    return !!djRole;
  },

  /**
   * Create error embed
   */
  createErrorEmbed(title, description) {
    return new EmbedBuilder()
      .setColor(BRAND_COLORS.ERROR)
      .setTitle(`❌ ${title}`)
      .setDescription(description)
      .setFooter({ text: 'GrowmiesNJ • Music Skip System' })
      .setTimestamp();
  }
};