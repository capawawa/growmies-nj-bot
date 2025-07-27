/**
 * MusicQueue Model for GrowmiesNJ Discord Bot
 * 
 * Music Bot System: Manage music queue with track information
 * Handles track metadata, cannabis content filtering, and queue persistence
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../connection');

/**
 * MusicQueue model for managing music tracks in queue
 * Integrates with cannabis compliance and track metadata
 */
class MusicQueue extends Model {
  /**
   * Check if track has been played
   * @returns {boolean} - True if track has been played
   */
  isPlayed() {
    return this.played_at !== null;
  }

  /**
   * Get track duration in human readable format
   * @returns {string} - Duration as MM:SS or HH:MM:SS
   */
  getFormattedDuration() {
    if (!this.track_duration_seconds) return 'Unknown';
    
    const hours = Math.floor(this.track_duration_seconds / 3600);
    const minutes = Math.floor((this.track_duration_seconds % 3600) / 60);
    const seconds = this.track_duration_seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Check if track requires cannabis age verification
   * @returns {boolean} - True if 21+ verification required
   */
  requiresCannabisVerification() {
    return this.is_cannabis_content;
  }

  /**
   * Get queue for a session
   * @param {string} sessionId - Music session UUID
   * @param {boolean} includeHistory - Include played tracks
   * @returns {Promise<MusicQueue[]>} - Queue tracks
   */
  static async getSessionQueue(sessionId, includeHistory = false) {
    const whereClause = { session_id: sessionId };
    
    if (!includeHistory) {
      whereClause.played_at = null;
    }

    return await this.findAll({
      where: whereClause,
      order: [['queue_position', 'ASC'], ['added_at', 'ASC']]
    });
  }

  /**
   * Get next track in queue
   * @param {string} sessionId - Music session UUID
   * @returns {Promise<MusicQueue|null>} - Next track or null
   */
  static async getNextTrack(sessionId) {
    return await this.findOne({
      where: {
        session_id: sessionId,
        played_at: null
      },
      order: [['queue_position', 'ASC'], ['added_at', 'ASC']]
    });
  }

  /**
   * Add track to queue
   * @param {string} sessionId - Music session UUID
   * @param {Object} trackData - Track information
   * @returns {Promise<MusicQueue>} - Created queue entry
   */
  static async addToQueue(sessionId, trackData) {
    // Get next position in queue
    const lastTrack = await this.findOne({
      where: { session_id: sessionId },
      order: [['queue_position', 'DESC']]
    });

    const nextPosition = lastTrack ? lastTrack.queue_position + 1 : 1;

    // Create queue entry
    return await this.create({
      session_id: sessionId,
      track_url: trackData.url,
      track_title: trackData.title || 'Unknown Track',
      track_duration_seconds: trackData.duration || null,
      requested_by_user_id: trackData.requestedBy,
      queue_position: nextPosition,
      track_source: trackData.source || 'youtube',
      is_cannabis_content: trackData.isCannabisContent || false,
      track_metadata: {
        thumbnail: trackData.thumbnail || null,
        artist: trackData.artist || null,
        album: trackData.album || null,
        original_url: trackData.originalUrl || trackData.url,
        added_timestamp: new Date().toISOString(),
        ...trackData.metadata
      }
    });
  }

  /**
   * Remove track from queue
   * @param {string} sessionId - Music session UUID
   * @param {number} position - Queue position to remove
   * @returns {Promise<boolean>} - Success status
   */
  static async removeFromQueue(sessionId, position) {
    try {
      const track = await this.findOne({
        where: {
          session_id: sessionId,
          queue_position: position,
          played_at: null
        }
      });

      if (!track) return false;

      await track.destroy();

      // Reorder remaining tracks
      await this.reorderQueue(sessionId);
      return true;
    } catch (error) {
      console.error('Error removing track from queue:', error);
      return false;
    }
  }

  /**
   * Shuffle queue
   * @param {string} sessionId - Music session UUID
   * @returns {Promise<boolean>} - Success status
   */
  static async shuffleQueue(sessionId) {
    try {
      const unplayedTracks = await this.findAll({
        where: {
          session_id: sessionId,
          played_at: null
        }
      });

      if (unplayedTracks.length <= 1) return true;

      // Shuffle positions
      const shuffledPositions = [...Array(unplayedTracks.length)].map((_, i) => i + 1);
      for (let i = shuffledPositions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledPositions[i], shuffledPositions[j]] = [shuffledPositions[j], shuffledPositions[i]];
      }

      // Update positions
      for (let i = 0; i < unplayedTracks.length; i++) {
        await unplayedTracks[i].update({
          queue_position: shuffledPositions[i]
        });
      }

      return true;
    } catch (error) {
      console.error('Error shuffling queue:', error);
      return false;
    }
  }

  /**
   * Clear entire queue
   * @param {string} sessionId - Music session UUID
   * @param {boolean} keepHistory - Keep played tracks
   * @returns {Promise<number>} - Number of tracks removed
   */
  static async clearQueue(sessionId, keepHistory = true) {
    try {
      const whereClause = { session_id: sessionId };
      
      if (keepHistory) {
        whereClause.played_at = null;
      }

      const deletedCount = await this.destroy({
        where: whereClause
      });

      return deletedCount;
    } catch (error) {
      console.error('Error clearing queue:', error);
      return 0;
    }
  }

  /**
   * Reorder queue positions after removal
   * @param {string} sessionId - Music session UUID
   * @returns {Promise<boolean>} - Success status
   */
  static async reorderQueue(sessionId) {
    try {
      const tracks = await this.findAll({
        where: {
          session_id: sessionId,
          played_at: null
        },
        order: [['queue_position', 'ASC']]
      });

      for (let i = 0; i < tracks.length; i++) {
        await tracks[i].update({
          queue_position: i + 1
        });
      }

      return true;
    } catch (error) {
      console.error('Error reordering queue:', error);
      return false;
    }
  }

  /**
   * Mark track as played
   * @returns {Promise<boolean>} - Success status
   */
  async markAsPlayed() {
    try {
      await this.update({
        played_at: new Date(),
        track_metadata: {
          ...this.track_metadata,
          played_timestamp: new Date().toISOString()
        }
      });
      return true;
    } catch (error) {
      console.error('Error marking track as played:', error);
      return false;
    }
  }

  /**
   * Get queue statistics
   * @param {string} sessionId - Music session UUID
   * @returns {Promise<Object>} - Queue statistics
   */
  static async getQueueStats(sessionId) {
    try {
      const [totalTracks, playedTracks, unplayedTracks, totalDuration] = await Promise.all([
        this.count({ where: { session_id: sessionId } }),
        this.count({ where: { session_id: sessionId, played_at: { [require('@sequelize/core').Op.ne]: null } } }),
        this.count({ where: { session_id: sessionId, played_at: null } }),
        this.sum('track_duration_seconds', { where: { session_id: sessionId, played_at: null } })
      ]);

      return {
        totalTracks,
        playedTracks,
        unplayedTracks,
        totalDuration: totalDuration || 0,
        estimatedPlaytime: totalDuration ? Math.ceil(totalDuration / 60) : 0 // Minutes
      };
    } catch (error) {
      console.error('Error getting queue statistics:', error);
      return {
        totalTracks: 0,
        playedTracks: 0,
        unplayedTracks: 0,
        totalDuration: 0,
        estimatedPlaytime: 0
      };
    }
  }
}

/**
 * Initialize MusicQueue model with database connection
 * @param {Sequelize} sequelize - Database connection instance
 * @returns {MusicQueue} - Initialized MusicQueue model
 */
function initMusicQueueModel(sequelize) {
  MusicQueue.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: 'Unique queue entry identifier'
    },
    session_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'music_sessions',
        key: 'id'
      },
      onDelete: 'CASCADE',
      comment: 'Reference to music session'
    },
    track_url: {
      type: DataTypes.STRING(500),
      allowNull: false,
      comment: 'URL of the track (YouTube, Spotify, etc.)'
    },
    track_title: {
      type: DataTypes.STRING(200),
      comment: 'Title of the track'
    },
    track_duration_seconds: {
      type: DataTypes.INTEGER,
      comment: 'Track duration in seconds'
    },
    requested_by_user_id: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Discord user ID who added the track'
    },
    queue_position: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Position in the queue (1-based)'
    },
    track_source: {
      type: DataTypes.ENUM('youtube', 'spotify', 'soundcloud', 'local', 'url'),
      defaultValue: 'youtube',
      comment: 'Source platform of the track'
    },
    is_cannabis_content: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether track contains cannabis-related content'
    },
    track_metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Additional track metadata (thumbnail, artist, etc.)'
    },
    added_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      comment: 'When track was added to queue'
    },
    played_at: {
      type: DataTypes.DATE,
      comment: 'When track was played (null if not played yet)'
    }
  }, {
    sequelize,
    modelName: 'MusicQueue',
    tableName: 'music_queues',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,

    indexes: [
      {
        name: 'idx_music_queue_session',
        fields: ['session_id']
      },
      {
        name: 'idx_music_queue_position',
        fields: ['session_id', 'queue_position']
      },
      {
        name: 'idx_music_queue_unplayed',
        fields: ['session_id', 'played_at'],
        where: { played_at: null }
      },
      {
        name: 'idx_music_queue_requested_by',
        fields: ['requested_by_user_id']
      },
      {
        name: 'idx_music_queue_cannabis',
        fields: ['is_cannabis_content']
      },
      {
        name: 'idx_music_queue_source',
        fields: ['track_source']
      },
      {
        name: 'idx_music_queue_added',
        fields: ['added_at']
      }
    ],

    // Model validation rules
    validate: {
      // Ensure valid queue position
      queuePositionValidation() {
        if (this.queue_position < 1) {
          throw new Error('Queue position must be 1 or greater');
        }
      },

      // Validate track duration
      trackDurationValidation() {
        if (this.track_duration_seconds !== null && this.track_duration_seconds < 0) {
          throw new Error('Track duration cannot be negative');
        }
      },

      // Validate URL format
      trackUrlValidation() {
        if (this.track_url && !this.track_url.match(/^https?:\/\/.+/)) {
          throw new Error('Track URL must be a valid HTTP/HTTPS URL');
        }
      }
    },

    // Model hooks for business logic
    hooks: {
      beforeCreate: async (track) => {
        // Initialize metadata if empty
        if (!track.track_metadata || Object.keys(track.track_metadata).length === 0) {
          track.track_metadata = {
            added_timestamp: new Date().toISOString(),
            source_verified: false,
            quality: 'standard'
          };
        }

        // Auto-detect cannabis content based on title/metadata
        if (!track.is_cannabis_content && track.track_title) {
          const cannabisKeywords = ['cannabis', 'marijuana', 'weed', 'ganja', 'hemp', 'thc', 'cbd', 'strain'];
          const titleLower = track.track_title.toLowerCase();
          track.is_cannabis_content = cannabisKeywords.some(keyword => titleLower.includes(keyword));
        }
      },

      beforeUpdate: async (track) => {
        // Update metadata when track is played
        if (track.changed('played_at') && track.played_at) {
          track.track_metadata = {
            ...track.track_metadata,
            played_timestamp: track.played_at.toISOString(),
            play_completed: true
          };
        }
      }
    }
  });

  return MusicQueue;
}

module.exports = { MusicQueue, initMusicQueueModel };