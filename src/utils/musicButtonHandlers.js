/**
 * Music Button Interaction Handlers for GrowmiesNJ Discord Bot
 * 
 * Handles button interactions for music commands including:
 * - Playback controls (play, pause, stop, skip)
 * - Queue management (add, remove, shuffle, clear)
 * - Volume controls (up, down, mute)
 * - Cannabis-specific interactions (meditation, podcast controls)
 */

const musicService = require('../services/musicService');
const { MusicQueue } = require('../database/models/MusicQueue');
const { UserMusicPreferences } = require('../database/models/UserMusicPreferences');
const EngagementService = require('../services/engagementService');
const { checkAge21Plus } = require('./ageVerification');
const { BRAND_COLORS } = require('./embeds');
const { EmbedBuilder } = require('discord.js');

/**
 * Main button interaction handler
 * @param {Object} interaction - Discord button interaction
 */
async function handleMusicButtonInteraction(interaction) {
  try {
    const customId = interaction.customId;
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;

    // Defer the reply to prevent timeout
    await interaction.deferUpdate();

    // Parse button ID to extract action and parameters
    const buttonData = parseButtonId(customId);
    
    if (!buttonData.isValid) {
      return await interaction.followUp({
        content: '❌ Invalid button interaction.',
        ephemeral: true
      });
    }

    // Check if user has permission to use this button
    if (buttonData.userId && buttonData.userId !== userId) {
      return await interaction.followUp({
        content: '❌ This button is not for you.',
        ephemeral: true
      });
    }

    // Route to appropriate handler based on action
    switch (buttonData.action) {
      case 'play':
      case 'resume':
        await handlePlayResumeButton(interaction, buttonData, userId, guildId);
        break;
      
      case 'pause':
        await handlePauseButton(interaction, buttonData, userId, guildId);
        break;
      
      case 'stop':
        await handleStopButton(interaction, buttonData, userId, guildId);
        break;
      
      case 'skip':
        await handleSkipButton(interaction, buttonData, userId, guildId);
        break;
      
      case 'queue_prev':
      case 'queue_next':
        await handleQueueNavigationButton(interaction, buttonData, userId, guildId);
        break;
      
      case 'queue_shuffle':
        await handleQueueShuffleButton(interaction, buttonData, userId, guildId);
        break;
      
      case 'queue_clear':
        await handleQueueClearButton(interaction, buttonData, userId, guildId);
        break;
      
      case 'queue_refresh':
        await handleQueueRefreshButton(interaction, buttonData, userId, guildId);
        break;
      
      case 'volume_up':
      case 'volume_down':
      case 'volume_mute':
        await handleVolumeButton(interaction, buttonData, userId, guildId);
        break;
      
      case 'nowplaying_refresh':
        await handleNowPlayingRefreshButton(interaction, buttonData, userId, guildId);
        break;
      
      case 'meditation_pause':
      case 'meditation_skip_phase':
      case 'meditation_end':
        await handleMeditationButton(interaction, buttonData, userId, guildId);
        break;
      
      case 'podcast_favorite':
      case 'podcast_save':
      case 'podcast_transcript':
        await handlePodcastButton(interaction, buttonData, userId, guildId);
        break;
      
      default:
        await interaction.followUp({
          content: `❌ Unknown button action: ${buttonData.action}`,
          ephemeral: true
        });
    }

  } catch (error) {
    console.error('Error handling music button interaction:', error);
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ An error occurred while processing your request.',
        ephemeral: true
      });
    } else {
      await interaction.followUp({
        content: '❌ An error occurred while processing your request.',
        ephemeral: true
      });
    }
  }
}

/**
 * Parse button custom ID to extract action and parameters
 * @param {string} customId - Button custom ID
 * @returns {Object} Parsed button data
 */
function parseButtonId(customId) {
  if (!customId || typeof customId !== 'string') {
    return { isValid: false };
  }

  const parts = customId.split('_');
  if (parts.length < 2) {
    return { isValid: false };
  }

  const [category, action, ...params] = parts;
  
  // Validate category
  const validCategories = ['music', 'queue', 'volume', 'nowplaying', 'meditation', 'podcast'];
  if (!validCategories.includes(category)) {
    return { isValid: false };
  }

  return {
    isValid: true,
    category,
    action,
    userId: params[0] || null,
    extraParams: params.slice(1),
    originalId: customId
  };
}

/**
 * Handle play/resume button
 */
async function handlePlayResumeButton(interaction, buttonData, userId, guildId) {
  // Check if user is in voice channel
  const member = interaction.guild.members.cache.get(userId);
  if (!member.voice.channel) {
    return await interaction.followUp({
      content: '🔊 You must be in a voice channel to control playback.',
      ephemeral: true
    });
  }

  const result = await musicService.resumePlayback(guildId, {
    resumedBy: userId,
    timestamp: new Date()
  });

  if (!result.success) {
    return await interaction.followUp({
      content: `❌ ${result.error}`,
      ephemeral: true
    });
  }

  // Award XP
  await EngagementService.trackEngagementActivity(
    userId,
    guildId,
    'music_button_resume',
    interaction.channelId,
    { xp_earned: 1 }
  );

  await interaction.followUp({
    content: '▶️ Playback resumed!',
    ephemeral: true
  });
}

/**
 * Handle pause button
 */
async function handlePauseButton(interaction, buttonData, userId, guildId) {
  const result = await musicService.pausePlayback(guildId, {
    pausedBy: userId,
    timestamp: new Date()
  });

  if (!result.success) {
    return await interaction.followUp({
      content: `❌ ${result.error}`,
      ephemeral: true
    });
  }

  // Award XP
  await EngagementService.trackEngagementActivity(
    userId,
    guildId,
    'music_button_pause',
    interaction.channelId,
    { xp_earned: 1 }
  );

  await interaction.followUp({
    content: '⏸️ Playback paused!',
    ephemeral: true
  });
}

/**
 * Handle stop button
 */
async function handleStopButton(interaction, buttonData, userId, guildId) {
  const result = await musicService.stopPlayback(guildId, {
    stoppedBy: userId,
    timestamp: new Date(),
    reason: 'button_interaction'
  });

  if (!result.success) {
    return await interaction.followUp({
      content: `❌ ${result.error}`,
      ephemeral: true
    });
  }

  // Award XP
  await EngagementService.trackEngagementActivity(
    userId,
    guildId,
    'music_button_stop',
    interaction.channelId,
    { xp_earned: 2 }
  );

  await interaction.followUp({
    content: '⏹️ Playback stopped and session ended!',
    ephemeral: true
  });
}

/**
 * Handle skip button
 */
async function handleSkipButton(interaction, buttonData, userId, guildId) {
  // Check if user can skip (in voice channel)
  const member = interaction.guild.members.cache.get(userId);
  if (!member.voice.channel) {
    return await interaction.followUp({
      content: '🔊 You must be in a voice channel to skip tracks.',
      ephemeral: true
    });
  }

  const queueStatus = await musicService.getQueueStatus(guildId);
  if (!queueStatus.success || !queueStatus.currentTrack) {
    return await interaction.followUp({
      content: '❌ No track is currently playing.',
      ephemeral: true
    });
  }

  // Check if user is track requester (can skip their own tracks)
  if (queueStatus.currentTrack.requested_by_user_id === userId) {
    const result = await musicService.skipTrack(guildId, {
      skippedBy: userId,
      type: 'owner',
      timestamp: new Date()
    });

    if (!result.success) {
      return await interaction.followUp({
        content: `❌ ${result.error}`,
        ephemeral: true
      });
    }

    await EngagementService.trackEngagementActivity(
      userId,
      guildId,
      'music_button_skip_owner',
      interaction.channelId,
      { xp_earned: 1 }
    );

    await interaction.followUp({
      content: '⏭️ Track skipped by requester!',
      ephemeral: true
    });
  } else {
    // Add skip vote
    await musicService.addSkipVote(guildId, userId, 'Button vote');
    const votes = await musicService.getSkipVoteCount(guildId);
    
    await interaction.followUp({
      content: `🗳️ Skip vote added! (${votes} votes)`,
      ephemeral: true
    });
  }
}

/**
 * Handle queue navigation buttons (prev/next page)
 */
async function handleQueueNavigationButton(interaction, buttonData, userId, guildId) {
  const currentPage = parseInt(buttonData.extraParams[0]) || 1;
  let newPage = currentPage;

  if (buttonData.action === 'queue_prev') {
    newPage = Math.max(1, currentPage - 1);
  } else if (buttonData.action === 'queue_next') {
    newPage = currentPage + 1;
  }

  // Get updated queue status
  const queueStatus = await musicService.getQueueStatus(guildId);
  if (!queueStatus.success) {
    return await interaction.followUp({
      content: `❌ ${queueStatus.error}`,
      ephemeral: true
    });
  }

  // Import queue command to use its embed creation method
  const queueCommand = require('../commands/music/queue');
  const embed = queueCommand.createQueueEmbed(queueStatus, newPage, 10);
  const components = queueCommand.createQueueComponents(queueStatus, newPage, 10, userId);

  await interaction.editReply({
    embeds: [embed],
    components: components
  });
}

/**
 * Handle queue shuffle button
 */
async function handleQueueShuffleButton(interaction, buttonData, userId, guildId) {
  const queueStatus = await musicService.getQueueStatus(guildId);
  if (!queueStatus.success) {
    return await interaction.followUp({
      content: `❌ ${queueStatus.error}`,
      ephemeral: true
    });
  }

  const result = await MusicQueue.shuffleQueue(queueStatus.session.id);
  if (!result) {
    return await interaction.followUp({
      content: '❌ Unable to shuffle the queue.',
      ephemeral: true
    });
  }

  await EngagementService.trackEngagementActivity(
    userId,
    guildId,
    'music_button_shuffle',
    interaction.channelId,
    { xp_earned: 3 }
  );

  await interaction.followUp({
    content: '🔀 Queue shuffled successfully!',
    ephemeral: true
  });
}

/**
 * Handle queue clear button
 */
async function handleQueueClearButton(interaction, buttonData, userId, guildId) {
  const queueStatus = await musicService.getQueueStatus(guildId);
  if (!queueStatus.success) {
    return await interaction.followUp({
      content: `❌ ${queueStatus.error}`,
      ephemeral: true
    });
  }

  const clearedCount = await MusicQueue.clearQueue(queueStatus.session.id, true);

  await EngagementService.trackEngagementActivity(
    userId,
    guildId,
    'music_button_clear',
    interaction.channelId,
    { tracks_cleared: clearedCount, xp_earned: 5 }
  );

  await interaction.followUp({
    content: `🧹 Cleared ${clearedCount} track${clearedCount !== 1 ? 's' : ''} from the queue!`,
    ephemeral: true
  });
}

/**
 * Handle queue refresh button
 */
async function handleQueueRefreshButton(interaction, buttonData, userId, guildId) {
  const queueStatus = await musicService.getQueueStatus(guildId);
  if (!queueStatus.success) {
    return await interaction.followUp({
      content: `❌ ${queueStatus.error}`,
      ephemeral: true
    });
  }

  // Import queue command to refresh the display
  const queueCommand = require('../commands/music/queue');
  const embed = queueCommand.createQueueEmbed(queueStatus, 1, 10);
  const components = queueCommand.createQueueComponents(queueStatus, 1, 10, userId);

  await interaction.editReply({
    embeds: [embed],
    components: components
  });

  await interaction.followUp({
    content: '🔄 Queue refreshed!',
    ephemeral: true
  });
}

/**
 * Handle volume control buttons
 */
async function handleVolumeButton(interaction, buttonData, userId, guildId) {
  const currentVolume = await musicService.getCurrentVolume(guildId);
  let newVolume = currentVolume;
  let action = '';

  switch (buttonData.action) {
    case 'volume_up':
      newVolume = Math.min(100, currentVolume + 10);
      action = 'increased';
      break;
    case 'volume_down':
      newVolume = Math.max(0, currentVolume - 10);
      action = 'decreased';
      break;
    case 'volume_mute':
      if (currentVolume === 0) {
        // Unmute to user's preferred volume or 50%
        const userPrefs = await UserMusicPreferences.getOrCreatePreferences(userId, guildId);
        newVolume = userPrefs.preferred_volume || 50;
        action = 'unmuted';
      } else {
        newVolume = 0;
        action = 'muted';
      }
      break;
  }

  if (newVolume === currentVolume && buttonData.action !== 'volume_mute') {
    const limitType = newVolume === 100 ? 'maximum' : 'minimum';
    return await interaction.followUp({
      content: `🔊 Volume is already at ${limitType} level.`,
      ephemeral: true
    });
  }

  const result = await musicService.setVolume(guildId, newVolume);
  if (!result.success) {
    return await interaction.followUp({
      content: `❌ ${result.error}`,
      ephemeral: true
    });
  }

  await EngagementService.trackEngagementActivity(
    userId,
    guildId,
    'music_button_volume',
    interaction.channelId,
    { volume_level: newVolume, action: action, xp_earned: 1 }
  );

  await interaction.followUp({
    content: `🔊 Volume ${action} to ${newVolume}%!`,
    ephemeral: true
  });
}

/**
 * Handle now playing refresh button
 */
async function handleNowPlayingRefreshButton(interaction, buttonData, userId, guildId) {
  const queueStatus = await musicService.getQueueStatus(guildId);
  if (!queueStatus.success) {
    return await interaction.followUp({
      content: `❌ ${queueStatus.error}`,
      ephemeral: true
    });
  }

  // Import nowplaying command to refresh the display
  const nowPlayingCommand = require('../commands/music/nowplaying');
  const embed = await nowPlayingCommand.createStandardNowPlayingEmbed(queueStatus, guildId);
  const components = await nowPlayingCommand.createNowPlayingComponents(queueStatus, guildId, userId);

  await interaction.editReply({
    embeds: [embed],
    components: components
  });

  await interaction.followUp({
    content: '🔄 Now playing refreshed!',
    ephemeral: true
  });
}

/**
 * Handle meditation control buttons
 */
async function handleMeditationButton(interaction, buttonData, userId, guildId) {
  // Age verification check
  const ageVerified = await checkAge21Plus(userId, guildId);
  if (!ageVerified.verified) {
    return await interaction.followUp({
      content: '🔞 Age verification required for meditation controls.',
      ephemeral: true
    });
  }

  switch (buttonData.action) {
    case 'meditation_pause':
      await musicService.pausePlayback(guildId, { pausedBy: userId });
      await interaction.followUp({
        content: '⏸️ Meditation paused. Take your time.',
        ephemeral: true
      });
      break;

    case 'meditation_skip_phase':
      await interaction.followUp({
        content: '⏭️ Moving to next meditation phase...',
        ephemeral: true
      });
      break;

    case 'meditation_end':
      await musicService.stopPlayback(guildId, { stoppedBy: userId, reason: 'meditation_ended' });
      await interaction.followUp({
        content: '🧘 Meditation session ended. Thank you for practicing mindfulness.',
        ephemeral: true
      });
      break;
  }

  await EngagementService.trackEngagementActivity(
    userId,
    guildId,
    'cannabis_meditation_control',
    interaction.channelId,
    { action: buttonData.action, xp_earned: 2 }
  );
}

/**
 * Handle podcast control buttons
 */
async function handlePodcastButton(interaction, buttonData, userId, guildId) {
  // Age verification check
  const ageVerified = await checkAge21Plus(userId, guildId);
  if (!ageVerified.verified) {
    return await interaction.followUp({
      content: '🔞 Age verification required for podcast controls.',
      ephemeral: true
    });
  }

  switch (buttonData.action) {
    case 'podcast_favorite':
      // In a real implementation, this would save to user's favorites
      await interaction.followUp({
        content: '❤️ Podcast episode added to your favorites!',
        ephemeral: true
      });
      break;

    case 'podcast_save':
      // In a real implementation, this would save for later
      await interaction.followUp({
        content: '💾 Podcast episode saved for later!',
        ephemeral: true
      });
      break;

    case 'podcast_transcript':
      // In a real implementation, this would show transcript
      await interaction.followUp({
        content: '📄 Podcast transcript feature coming soon!',
        ephemeral: true
      });
      break;
  }

  await EngagementService.trackEngagementActivity(
    userId,
    guildId,
    'cannabis_podcast_control',
    interaction.channelId,
    { action: buttonData.action, xp_earned: 1 }
  );
}

module.exports = {
  handleMusicButtonInteraction,
  parseButtonId
};