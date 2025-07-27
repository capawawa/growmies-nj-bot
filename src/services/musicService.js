/**
 * MusicService for GrowmiesNJ Discord Bot
 * 
 * Music Bot System: Core service for voice connection and queue management
 * Integrates with cannabis compliance, age verification, and audio streaming
 */

const { 
  joinVoiceChannel, 
  createAudioPlayer, 
  createAudioResource, 
  AudioPlayerStatus, 
  VoiceConnectionStatus, 
  getVoiceConnection 
} = require('@discordjs/voice');
const { createReadStream } = require('fs');
const ytdl = require('ytdl-core');
const { MusicSession } = require('../database/models/MusicSession');
const { MusicQueue } = require('../database/models/MusicQueue');
const { UserMusicPreferences } = require('../database/models/UserMusicPreferences');
const { User } = require('../database/models/User');
const { AuditLog } = require('../database/models/AuditLog');
const { AgeVerificationService } = require('./ageVerification');

/**
 * Music Service Class
 * Manages voice connections, audio playback, and cannabis compliance
 */
class MusicService {
  constructor() {
    // Store active voice connections and audio players
    this.voiceConnections = new Map();
    this.audioPlayers = new Map();
    this.activeSessions = new Map();
    
    // Cache for user preferences and verification status
    this.userPreferencesCache = new Map();
    this.verificationCache = new Map();
    
    // Cannabis compliance settings
    this.cannabisContentEnabled = process.env.CANNABIS_CONTENT_ENABLED === 'true';
    this.strictComplianceMode = process.env.CANNABIS_STRICT_MODE === 'true';
    
    // Audio quality settings
    this.defaultAudioQuality = 'highestaudio';
    this.maxTrackDuration = 10 * 60 * 1000; // 10 minutes in milliseconds
    
    // Initialize age verification service
    this.ageVerificationService = new AgeVerificationService();
    
    console.log('🎵 MusicService initialized with cannabis compliance enabled:', this.cannabisContentEnabled);
  }

  /**
   * Join voice channel and create music session
   * @param {string} guildId - Discord guild ID
   * @param {string} voiceChannelId - Voice channel ID
   * @param {string} textChannelId - Text channel ID for commands
   * @param {string} userId - User who initiated the session
   * @param {Object} options - Session options
   * @returns {Promise<Object>} - Session result
   */
  async joinVoiceChannel(guildId, voiceChannelId, textChannelId, userId, options = {}) {
    try {
      console.log(`🎵 Joining voice channel ${voiceChannelId} in guild ${guildId}`);

      // Check if there's already an active session
      const existingSession = await MusicSession.findActiveSession(guildId);
      if (existingSession) {
        return {
          success: false,
          error: 'A music session is already active in this server',
          sessionId: existingSession.id
        };
      }

      // Validate cannabis content access if needed
      if (options.isCannabisContent) {
        const canAccess = await this.validateCannabisAccess(userId, guildId);
        if (!canAccess.success) {
          return {
            success: false,
            error: canAccess.error,
            requiresVerification: true
          };
        }
      }

      // Create voice connection
      const connection = joinVoiceChannel({
        channelId: voiceChannelId,
        guildId: guildId,
        adapterCreator: options.guild.voiceAdapterCreator,
        selfDeaf: true
      });

      // Create audio player
      const player = createAudioPlayer();
      
      // Subscribe connection to player
      connection.subscribe(player);

      // Store connection and player
      this.voiceConnections.set(guildId, connection);
      this.audioPlayers.set(guildId, player);

      // Create database session
      const session = await MusicSession.create({
        guild_id: guildId,
        voice_channel_id: voiceChannelId,
        text_channel_id: textChannelId,
        created_by_user_id: userId,
        session_type: options.sessionType || 'general',
        is_cannabis_content: options.isCannabisContent || false,
        requires_21_plus: options.isCannabisContent || false,
        volume_level: options.volume || 50,
        session_metadata: {
          guild_name: options.guild?.name || 'Unknown',
          voice_channel_name: options.voiceChannelName || 'Unknown',
          text_channel_name: options.textChannelName || 'Unknown',
          ...options.metadata
        }
      });

      // Store active session
      this.activeSessions.set(guildId, {
        session,
        connection,
        player,
        currentTrack: null,
        isPlaying: false,
        isPaused: false
      });

      // Set up connection event handlers
      this.setupConnectionHandlers(guildId, connection, player);

      // Log session creation
      await AuditLog.create({
        user_id: userId,
        guild_id: guildId,
        action_type: 'music_session_created',
        target_type: 'voice_channel',
        target_id: voiceChannelId,
        details: {
          session_id: session.id,
          session_type: session.session_type,
          is_cannabis_content: session.is_cannabis_content,
          voice_channel_id: voiceChannelId,
          text_channel_id: textChannelId
        }
      });

      console.log(`✅ Music session created successfully: ${session.id}`);
      
      return {
        success: true,
        sessionId: session.id,
        session: session
      };

    } catch (error) {
      console.error('❌ Error joining voice channel:', error);
      
      // Clean up on error
      await this.cleanup(guildId);
      
      return {
        success: false,
        error: 'Failed to join voice channel: ' + error.message
      };
    }
  }

  /**
   * Leave voice channel and end session
   * @param {string} guildId - Discord guild ID
   * @param {string} reason - Reason for leaving
   * @returns {Promise<boolean>} - Success status
   */
  async leaveVoiceChannel(guildId, reason = 'user_disconnect') {
    try {
      console.log(`🎵 Leaving voice channel in guild ${guildId}, reason: ${reason}`);

      const sessionData = this.activeSessions.get(guildId);
      if (!sessionData) {
        console.warn(`No active session found for guild ${guildId}`);
        return false;
      }

      // Stop current playback
      if (sessionData.player) {
        sessionData.player.stop();
      }

      // Destroy voice connection
      if (sessionData.connection) {
        sessionData.connection.destroy();
      }

      // End database session
      if (sessionData.session) {
        await sessionData.session.endSession(reason);
      }

      // Clean up maps
      this.cleanup(guildId);

      console.log(`✅ Voice channel left successfully for guild ${guildId}`);
      return true;

    } catch (error) {
      console.error('❌ Error leaving voice channel:', error);
      return false;
    }
  }

  /**
   * Play track from URL
   * @param {string} guildId - Discord guild ID
   * @param {string} trackUrl - Track URL
   * @param {Object} trackData - Track metadata
   * @returns {Promise<Object>} - Play result
   */
  async playTrack(guildId, trackUrl, trackData = {}) {
    try {
      console.log(`🎵 Playing track in guild ${guildId}: ${trackUrl}`);

      const sessionData = this.activeSessions.get(guildId);
      if (!sessionData) {
        return {
          success: false,
          error: 'No active music session found'
        };
      }

      // Validate cannabis content if needed
      if (trackData.isCannabisContent) {
        const canAccess = await this.validateCannabisAccess(trackData.requestedBy, guildId);
        if (!canAccess.success) {
          return {
            success: false,
            error: canAccess.error,
            requiresVerification: true
          };
        }
      }

      // Get user preferences for volume
      const preferences = await this.getUserPreferences(trackData.requestedBy, guildId);
      const volume = preferences.getPreferredVolume() / 100;

      // Create audio resource
      let resource;
      if (ytdl.validateURL(trackUrl)) {
        // YouTube URL
        const stream = ytdl(trackUrl, {
          filter: 'audioonly',
          quality: this.defaultAudioQuality,
          highWaterMark: 1 << 25
        });
        
        resource = createAudioResource(stream, {
          metadata: {
            title: trackData.title || 'Unknown Track',
            url: trackUrl,
            requestedBy: trackData.requestedBy
          }
        });
      } else {
        // Direct URL or local file
        resource = createAudioResource(trackUrl, {
          metadata: {
            title: trackData.title || 'Unknown Track',
            url: trackUrl,
            requestedBy: trackData.requestedBy
          }
        });
      }

      // Play the resource
      sessionData.player.play(resource);
      sessionData.currentTrack = {
        url: trackUrl,
        ...trackData
      };
      sessionData.isPlaying = true;
      sessionData.isPaused = false;

      // Add to database queue if not already there
      if (!trackData.skipQueue) {
        await MusicQueue.addToQueue(sessionData.session.id, {
          url: trackUrl,
          title: trackData.title,
          duration: trackData.duration,
          requestedBy: trackData.requestedBy,
          source: trackData.source || 'youtube',
          isCannabisContent: trackData.isCannabisContent || false,
          metadata: trackData
        });
      }

      // Update session current track index
      await sessionData.session.update({
        current_track_index: sessionData.session.current_track_index + 1
      });

      // Log track play
      await AuditLog.create({
        user_id: trackData.requestedBy,
        guild_id: guildId,
        action_type: 'music_track_played',
        target_type: 'track',
        target_id: trackUrl,
        details: {
          session_id: sessionData.session.id,
          track_title: trackData.title,
          track_url: trackUrl,
          is_cannabis_content: trackData.isCannabisContent || false,
          track_duration: trackData.duration
        }
      });

      console.log(`✅ Track playing successfully: ${trackData.title || trackUrl}`);
      
      return {
        success: true,
        track: sessionData.currentTrack
      };

    } catch (error) {
      console.error('❌ Error playing track:', error);
      return {
        success: false,
        error: 'Failed to play track: ' + error.message
      };
    }
  }

  /**
   * Pause current playback
   * @param {string} guildId - Discord guild ID
   * @returns {Promise<boolean>} - Success status
   */
  async pausePlayback(guildId) {
    try {
      const sessionData = this.activeSessions.get(guildId);
      if (!sessionData || !sessionData.isPlaying) {
        return false;
      }

      sessionData.player.pause();
      sessionData.isPaused = true;
      
      await sessionData.session.update({ status: 'paused' });
      
      console.log(`⏸️ Playback paused for guild ${guildId}`);
      return true;
    } catch (error) {
      console.error('❌ Error pausing playback:', error);
      return false;
    }
  }

  /**
   * Resume current playback
   * @param {string} guildId - Discord guild ID
   * @returns {Promise<boolean>} - Success status
   */
  async resumePlayback(guildId) {
    try {
      const sessionData = this.activeSessions.get(guildId);
      if (!sessionData || !sessionData.isPaused) {
        return false;
      }

      sessionData.player.unpause();
      sessionData.isPaused = false;
      
      await sessionData.session.update({ status: 'active' });
      
      console.log(`▶️ Playback resumed for guild ${guildId}`);
      return true;
    } catch (error) {
      console.error('❌ Error resuming playback:', error);
      return false;
    }
  }

  /**
   * Skip current track
   * @param {string} guildId - Discord guild ID
   * @returns {Promise<Object>} - Skip result
   */
  async skipTrack(guildId) {
    try {
      const sessionData = this.activeSessions.get(guildId);
      if (!sessionData || !sessionData.isPlaying) {
        return {
          success: false,
          error: 'No track currently playing'
        };
      }

      const currentTrack = sessionData.currentTrack;
      
      // Stop current track
      sessionData.player.stop();
      
      // Mark current track as played in database
      const queueEntry = await MusicQueue.findOne({
        where: {
          session_id: sessionData.session.id,
          track_url: currentTrack.url,
          played_at: null
        }
      });
      
      if (queueEntry) {
        await queueEntry.markAsPlayed();
      }

      console.log(`⏭️ Track skipped for guild ${guildId}: ${currentTrack.title}`);
      
      return {
        success: true,
        skippedTrack: currentTrack
      };
    } catch (error) {
      console.error('❌ Error skipping track:', error);
      return {
        success: false,
        error: 'Failed to skip track: ' + error.message
      };
    }
  }

  /**
   * Set volume level
   * @param {string} guildId - Discord guild ID
   * @param {number} volume - Volume level (0-100)
   * @returns {Promise<boolean>} - Success status
   */
  async setVolume(guildId, volume) {
    try {
      if (volume < 0 || volume > 100) {
        return false;
      }

      const sessionData = this.activeSessions.get(guildId);
      if (!sessionData) {
        return false;
      }

      // Update session volume
      await sessionData.session.update({ volume_level: volume });
      
      // Note: @discordjs/voice doesn't support runtime volume changes
      // Volume would need to be applied when creating the audio resource
      
      console.log(`🔊 Volume set to ${volume}% for guild ${guildId}`);
      return true;
    } catch (error) {
      console.error('❌ Error setting volume:', error);
      return false;
    }
  }

  /**
   * Get current queue status
   * @param {string} guildId - Discord guild ID
   * @returns {Promise<Object>} - Queue status
   */
  async getQueueStatus(guildId) {
    try {
      const sessionData = this.activeSessions.get(guildId);
      if (!sessionData) {
        return {
          success: false,
          error: 'No active music session'
        };
      }

      const queue = await MusicQueue.getSessionQueue(sessionData.session.id);
      const stats = await MusicQueue.getQueueStats(sessionData.session.id);
      
      return {
        success: true,
        currentTrack: sessionData.currentTrack,
        isPlaying: sessionData.isPlaying,
        isPaused: sessionData.isPaused,
        queue: queue,
        stats: stats,
        session: sessionData.session
      };
    } catch (error) {
      console.error('❌ Error getting queue status:', error);
      return {
        success: false,
        error: 'Failed to get queue status: ' + error.message
      };
    }
  }

  /**
   * Validate cannabis content access
   * @param {string} userId - Discord user ID
   * @param {string} guildId - Discord guild ID
   * @returns {Promise<Object>} - Validation result
   */
  async validateCannabisAccess(userId, guildId) {
    try {
      // Check cache first
      const cacheKey = `${userId}-${guildId}`;
      if (this.verificationCache.has(cacheKey)) {
        const cached = this.verificationCache.get(cacheKey);
        if (Date.now() - cached.timestamp < 5 * 60 * 1000) { // 5 minute cache
          return cached.result;
        }
      }

      // Get user verification status
      const user = await User.findOne({
        where: {
          discord_id: userId,
          guild_id: guildId,
          is_active: true
        }
      });

      if (!user) {
        const result = {
          success: false,
          error: 'User not found. Please use /verify to verify your age.'
        };
        this.verificationCache.set(cacheKey, { result, timestamp: Date.now() });
        return result;
      }

      if (!user.is_21_plus || user.verification_status !== 'verified') {
        const result = {
          success: false,
          error: 'Cannabis content requires 21+ age verification. Please use /verify.'
        };
        this.verificationCache.set(cacheKey, { result, timestamp: Date.now() });
        return result;
      }

      const result = { success: true };
      this.verificationCache.set(cacheKey, { result, timestamp: Date.now() });
      return result;

    } catch (error) {
      console.error('❌ Error validating cannabis access:', error);
      return {
        success: false,
        error: 'Error validating access permissions'
      };
    }
  }

  /**
   * Get user music preferences
   * @param {string} userId - Discord user ID
   * @param {string} guildId - Discord guild ID
   * @returns {Promise<UserMusicPreferences>} - User preferences
   */
  async getUserPreferences(userId, guildId) {
    try {
      const cacheKey = `${userId}-${guildId}`;
      if (this.userPreferencesCache.has(cacheKey)) {
        const cached = this.userPreferencesCache.get(cacheKey);
        if (Date.now() - cached.timestamp < 10 * 60 * 1000) { // 10 minute cache
          return cached.preferences;
        }
      }

      const preferences = await UserMusicPreferences.getOrCreatePreferences(userId, guildId);
      this.userPreferencesCache.set(cacheKey, { preferences, timestamp: Date.now() });
      
      return preferences;
    } catch (error) {
      console.error('❌ Error getting user preferences:', error);
      // Return default preferences on error
      return {
        getPreferredVolume: () => 50,
        shouldFilterExplicit: () => true,
        hasCannabisMusic: () => false
      };
    }
  }

  /**
   * Setup connection event handlers
   * @param {string} guildId - Discord guild ID
   * @param {VoiceConnection} connection - Voice connection
   * @param {AudioPlayer} player - Audio player
   */
  setupConnectionHandlers(guildId, connection, player) {
    // Connection status handlers
    connection.on(VoiceConnectionStatus.Disconnected, async () => {
      console.log(`🔌 Voice connection disconnected for guild ${guildId}`);
      await this.leaveVoiceChannel(guildId, 'connection_lost');
    });

    connection.on(VoiceConnectionStatus.Destroyed, () => {
      console.log(`💥 Voice connection destroyed for guild ${guildId}`);
      this.cleanup(guildId);
    });

    // Player status handlers
    player.on(AudioPlayerStatus.Idle, async () => {
      console.log(`⏹️ Audio player idle for guild ${guildId}`);
      
      const sessionData = this.activeSessions.get(guildId);
      if (sessionData) {
        sessionData.isPlaying = false;
        sessionData.currentTrack = null;
        
        // Try to play next track in queue
        await this.playNextTrack(guildId);
      }
    });

    player.on(AudioPlayerStatus.Playing, () => {
      console.log(`▶️ Audio player playing for guild ${guildId}`);
    });

    player.on('error', (error) => {
      console.error(`❌ Audio player error for guild ${guildId}:`, error);
    });
  }

  /**
   * Play next track in queue
   * @param {string} guildId - Discord guild ID
   * @returns {Promise<boolean>} - Success status
   */
  async playNextTrack(guildId) {
    try {
      const sessionData = this.activeSessions.get(guildId);
      if (!sessionData) {
        return false;
      }

      const nextTrack = await MusicQueue.getNextTrack(sessionData.session.id);
      if (!nextTrack) {
        console.log(`📭 No more tracks in queue for guild ${guildId}`);
        return false;
      }

      // Play the next track
      const result = await this.playTrack(guildId, nextTrack.track_url, {
        title: nextTrack.track_title,
        duration: nextTrack.track_duration_seconds,
        requestedBy: nextTrack.requested_by_user_id,
        source: nextTrack.track_source,
        isCannabisContent: nextTrack.is_cannabis_content,
        skipQueue: true // Don't add to queue again
      });

      if (result.success) {
        // Mark as played
        await nextTrack.markAsPlayed();
      }

      return result.success;
    } catch (error) {
      console.error('❌ Error playing next track:', error);
      return false;
    }
  }

  /**
   * Clean up resources for a guild
   * @param {string} guildId - Discord guild ID
   */
  cleanup(guildId) {
    this.voiceConnections.delete(guildId);
    this.audioPlayers.delete(guildId);
    this.activeSessions.delete(guildId);
    
    // Clear related caches
    for (const [key] of this.userPreferencesCache) {
      if (key.endsWith(`-${guildId}`)) {
        this.userPreferencesCache.delete(key);
      }
    }
    for (const [key] of this.verificationCache) {
      if (key.endsWith(`-${guildId}`)) {
        this.verificationCache.delete(key);
      }
    }
  }

  /**
   * Get active session for guild
   * @param {string} guildId - Discord guild ID
   * @returns {Object|null} - Session data or null
   */
  getActiveSession(guildId) {
    return this.activeSessions.get(guildId) || null;
  }

  /**
   * Check if guild has active session
   * @param {string} guildId - Discord guild ID
   * @returns {boolean} - Has active session
   */
  hasActiveSession(guildId) {
    return this.activeSessions.has(guildId);
  }
}

// Export singleton instance
module.exports = new MusicService();