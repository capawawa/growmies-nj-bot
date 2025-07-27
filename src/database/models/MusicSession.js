/**
 * MusicSession Model for GrowmiesNJ Discord Bot
 * 
 * Music Bot System: Track active music sessions per guild
 * Manages voice channel connections, session metadata, and cannabis compliance
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../connection');

/**
 * MusicSession model for tracking active music sessions
 * Integrates with cannabis compliance and age verification systems
 */
class MusicSession extends Model {
  /**
   * Check if session is currently active
   * @returns {boolean} - True if session is active
   */
  isActive() {
    return this.status === 'active';
  }

  /**
   * Check if session requires cannabis age verification
   * @returns {boolean} - True if 21+ verification required
   */
  requiresCannabisVerification() {
    return this.is_cannabis_content || this.requires_21_plus;
  }

  /**
   * Get session duration in minutes
   * @returns {number|null} - Duration in minutes, null if not ended
   */
  getDurationMinutes() {
    if (!this.ended_at) return null;
    const startTime = new Date(this.started_at);
    const endTime = new Date(this.ended_at);
    return Math.floor((endTime - startTime) / (1000 * 60));
  }

  /**
   * Find active session for a guild
   * @param {string} guildId - Discord guild ID
   * @returns {Promise<MusicSession|null>} - Active session or null
   */
  static async findActiveSession(guildId) {
    return await this.findOne({
      where: {
        guild_id: guildId,
        status: 'active'
      },
      order: [['started_at', 'DESC']]
    });
  }

  /**
   * Get session statistics for a guild
   * @param {string} guildId - Discord guild ID
   * @param {number} days - Days to look back (default 30)
   * @returns {Promise<Object>} - Session statistics
   */
  static async getSessionStats(guildId, days = 30) {
    const { fn, col, Op } = require('@sequelize/core');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await this.findAll({
      where: {
        guild_id: guildId,
        started_at: {
          [Op.gte]: startDate
        }
      },
      attributes: [
        'session_type',
        [fn('COUNT', '*'), 'count'],
        [fn('AVG', fn('EXTRACT', 'EPOCH', col('ended_at')) - fn('EXTRACT', 'EPOCH', col('started_at'))), 'avg_duration'],
        [fn('SUM', fn('EXTRACT', 'EPOCH', col('ended_at')) - fn('EXTRACT', 'EPOCH', col('started_at'))), 'total_duration']
      ],
      group: ['session_type'],
      raw: true
    });

    return stats.reduce((acc, stat) => {
      acc[stat.session_type] = {
        count: parseInt(stat.count),
        avgDuration: stat.avg_duration ? Math.floor(stat.avg_duration / 60) : 0, // Convert to minutes
        totalDuration: stat.total_duration ? Math.floor(stat.total_duration / 60) : 0 // Convert to minutes
      };
      return acc;
    }, {});
  }

  /**
   * End session and update statistics
   * @param {string} reason - Reason for ending session
   * @returns {Promise<boolean>} - Success status
   */
  async endSession(reason = 'user_disconnect') {
    try {
      await this.update({
        status: 'ended',
        ended_at: new Date(),
        session_metadata: {
          ...this.session_metadata,
          end_reason: reason,
          final_track_index: this.current_track_index
        }
      });
      return true;
    } catch (error) {
      console.error('Error ending music session:', error);
      return false;
    }
  }
}

/**
 * Initialize MusicSession model with database connection
 * @param {Sequelize} sequelize - Database connection instance
 * @returns {MusicSession} - Initialized MusicSession model
 */
function initMusicSessionModel(sequelize) {
  MusicSession.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: 'Unique session identifier'
    },
    guild_id: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Discord guild/server ID'
    },
    voice_channel_id: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Discord voice channel ID where music is playing'
    },
    text_channel_id: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Discord text channel ID for music commands'
    },
    created_by_user_id: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Discord user ID who created the session'
    },
    session_type: {
      type: DataTypes.ENUM('general', 'meditation', 'educational'),
      defaultValue: 'general',
      comment: 'Type of music session for cannabis community features'
    },
    is_cannabis_content: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether session contains cannabis-related content'
    },
    requires_21_plus: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether session requires 21+ age verification'
    },
    status: {
      type: DataTypes.ENUM('active', 'paused', 'ended'),
      defaultValue: 'active',
      comment: 'Current session status'
    },
    current_track_index: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Index of currently playing track in queue'
    },
    volume_level: {
      type: DataTypes.INTEGER,
      defaultValue: 50,
      validate: {
        min: 0,
        max: 100
      },
      comment: 'Current volume level (0-100)'
    },
    session_metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Additional session data (loop mode, shuffle, etc.)'
    },
    started_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      comment: 'When the session started'
    },
    ended_at: {
      type: DataTypes.DATE,
      comment: 'When the session ended'
    }
  }, {
    sequelize,
    modelName: 'MusicSession',
    tableName: 'music_sessions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,

    indexes: [
      {
        name: 'idx_music_sessions_guild',
        fields: ['guild_id']
      },
      {
        name: 'idx_music_sessions_status',
        fields: ['status']
      },
      {
        name: 'idx_music_sessions_active',
        fields: ['guild_id', 'status'],
        where: { status: 'active' }
      },
      {
        name: 'idx_music_sessions_voice_channel',
        fields: ['voice_channel_id']
      },
      {
        name: 'idx_music_sessions_creator',
        fields: ['created_by_user_id']
      },
      {
        name: 'idx_music_sessions_cannabis',
        fields: ['is_cannabis_content', 'requires_21_plus']
      },
      {
        name: 'idx_music_sessions_type',
        fields: ['session_type']
      },
      {
        name: 'idx_music_sessions_started',
        fields: ['started_at']
      }
    ],

    // Model validation rules
    validate: {
      // Ensure cannabis content sessions require 21+ verification
      cannabisContentValidation() {
        if (this.is_cannabis_content && !this.requires_21_plus) {
          throw new Error('Cannabis content sessions must require 21+ verification');
        }
      },

      // Validate volume level
      volumeLevelValidation() {
        if (this.volume_level < 0 || this.volume_level > 100) {
          throw new Error('Volume level must be between 0 and 100');
        }
      },

      // Validate session end time
      sessionTimeValidation() {
        if (this.ended_at && this.ended_at < this.started_at) {
          throw new Error('Session end time cannot be before start time');
        }
      }
    },

    // Model hooks for business logic
    hooks: {
      beforeCreate: async (session) => {
        // Set cannabis verification requirements based on session type
        if (session.session_type === 'meditation' || session.session_type === 'educational') {
          session.is_cannabis_content = true;
          session.requires_21_plus = true;
        }

        // Initialize session metadata
        if (!session.session_metadata || Object.keys(session.session_metadata).length === 0) {
          session.session_metadata = {
            loop_mode: 'none',
            shuffle_enabled: false,
            created_timestamp: new Date().toISOString(),
            bot_version: process.env.npm_package_version || '1.0.0'
          };
        }
      },

      beforeUpdate: async (session) => {
        // Auto-end session if voice channel becomes empty
        if (session.changed('status') && session.status === 'ended' && !session.ended_at) {
          session.ended_at = new Date();
        }

        // Update metadata on status changes
        if (session.changed('status')) {
          session.session_metadata = {
            ...session.session_metadata,
            last_status_change: new Date().toISOString(),
            status_change_reason: session.session_metadata.status_change_reason || 'system'
          };
        }
      }
    }
  });

  return MusicSession;
}

module.exports = { MusicSession, initMusicSessionModel };