/**
 * UserMusicPreferences Model for GrowmiesNJ Discord Bot
 * 
 * Music Bot System: Store user music preferences and settings
 * Handles volume preferences, cannabis music settings, and personalization
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../connection');

/**
 * UserMusicPreferences model for storing user music settings
 * Integrates with cannabis compliance and personalization features
 */
class UserMusicPreferences extends Model {
  /**
   * Check if user has cannabis music enabled
   * @returns {boolean} - True if cannabis music is enabled
   */
  hasCannabisMusic() {
    return this.cannabis_music_enabled;
  }

  /**
   * Check if user wants explicit content filtered
   * @returns {boolean} - True if explicit content should be filtered
   */
  shouldFilterExplicit() {
    return this.explicit_content_filter;
  }

  /**
   * Get user's preferred volume
   * @returns {number} - Volume level (0-100)
   */
  getPreferredVolume() {
    return this.preferred_volume;
  }

  /**
   * Check if source is blocked by user
   * @param {string} source - Track source (youtube, spotify, etc.)
   * @returns {boolean} - True if source is blocked
   */
  isSourceBlocked(source) {
    return this.blocked_sources.includes(source);
  }

  /**
   * Check if genre is in favorites
   * @param {string} genre - Music genre
   * @returns {boolean} - True if genre is favorite
   */
  isFavoriteGenre(genre) {
    return this.favorite_genres.includes(genre.toLowerCase());
  }

  /**
   * Get or create user preferences
   * @param {string} userId - Discord user ID
   * @param {string} guildId - Discord guild ID
   * @returns {Promise<UserMusicPreferences>} - User preferences
   */
  static async getOrCreatePreferences(userId, guildId) {
    const [preferences, created] = await this.findOrCreate({
      where: {
        user_id: userId,
        guild_id: guildId
      },
      defaults: {
        user_id: userId,
        guild_id: guildId,
        preferred_volume: 50,
        auto_queue_enabled: false,
        meditation_mode_enabled: false,
        explicit_content_filter: true,
        favorite_genres: [],
        blocked_sources: [],
        cannabis_music_enabled: false
      }
    });

    if (created) {
      console.log(`Created new music preferences for user ${userId}`);
    }

    return preferences;
  }

  /**
   * Update user's favorite genres
   * @param {string} userId - Discord user ID
   * @param {string} guildId - Discord guild ID
   * @param {Array<string>} genres - Array of favorite genres
   * @returns {Promise<boolean>} - Success status
   */
  static async updateFavoriteGenres(userId, guildId, genres) {
    try {
      const preferences = await this.getOrCreatePreferences(userId, guildId);
      
      // Normalize genres to lowercase
      const normalizedGenres = genres.map(genre => genre.toLowerCase());
      
      await preferences.update({
        favorite_genres: normalizedGenres
      });

      return true;
    } catch (error) {
      console.error('Error updating favorite genres:', error);
      return false;
    }
  }

  /**
   * Update user's blocked sources
   * @param {string} userId - Discord user ID
   * @param {string} guildId - Discord guild ID
   * @param {Array<string>} sources - Array of blocked sources
   * @returns {Promise<boolean>} - Success status
   */
  static async updateBlockedSources(userId, guildId, sources) {
    try {
      const preferences = await this.getOrCreatePreferences(userId, guildId);
      
      await preferences.update({
        blocked_sources: sources
      });

      return true;
    } catch (error) {
      console.error('Error updating blocked sources:', error);
      return false;
    }
  }

  /**
   * Enable or disable cannabis music for user
   * @param {string} userId - Discord user ID
   * @param {string} guildId - Discord guild ID
   * @param {boolean} enabled - Enable/disable cannabis music
   * @returns {Promise<boolean>} - Success status
   */
  static async setCannabisMusic(userId, guildId, enabled) {
    try {
      const preferences = await this.getOrCreatePreferences(userId, guildId);
      
      await preferences.update({
        cannabis_music_enabled: enabled
      });

      return true;
    } catch (error) {
      console.error('Error updating cannabis music setting:', error);
      return false;
    }
  }

  /**
   * Update user's preferred volume
   * @param {string} userId - Discord user ID
   * @param {string} guildId - Discord guild ID
   * @param {number} volume - Volume level (0-100)
   * @returns {Promise<boolean>} - Success status
   */
  static async setPreferredVolume(userId, guildId, volume) {
    try {
      if (volume < 0 || volume > 100) {
        throw new Error('Volume must be between 0 and 100');
      }

      const preferences = await this.getOrCreatePreferences(userId, guildId);
      
      await preferences.update({
        preferred_volume: volume
      });

      return true;
    } catch (error) {
      console.error('Error updating preferred volume:', error);
      return false;
    }
  }

  /**
   * Get users with cannabis music enabled
   * @param {string} guildId - Discord guild ID
   * @returns {Promise<UserMusicPreferences[]>} - Users with cannabis music enabled
   */
  static async getUsersWithCannabisMusic(guildId) {
    return await this.findAll({
      where: {
        guild_id: guildId,
        cannabis_music_enabled: true
      }
    });
  }

  /**
   * Get guild music preferences statistics
   * @param {string} guildId - Discord guild ID
   * @returns {Promise<Object>} - Preferences statistics
   */
  static async getGuildPreferencesStats(guildId) {
    try {
      const [
        totalUsers,
        cannabisEnabled,
        autoQueueEnabled,
        meditationEnabled,
        explicitFiltered
      ] = await Promise.all([
        this.count({ where: { guild_id: guildId } }),
        this.count({ where: { guild_id: guildId, cannabis_music_enabled: true } }),
        this.count({ where: { guild_id: guildId, auto_queue_enabled: true } }),
        this.count({ where: { guild_id: guildId, meditation_mode_enabled: true } }),
        this.count({ where: { guild_id: guildId, explicit_content_filter: true } })
      ]);

      // Get favorite genres distribution
      const users = await this.findAll({
        where: { guild_id: guildId },
        attributes: ['favorite_genres']
      });

      const genreCount = {};
      users.forEach(user => {
        user.favorite_genres.forEach(genre => {
          genreCount[genre] = (genreCount[genre] || 0) + 1;
        });
      });

      return {
        totalUsers,
        cannabisEnabled,
        autoQueueEnabled,
        meditationEnabled,
        explicitFiltered,
        popularGenres: Object.entries(genreCount)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10)
          .map(([genre, count]) => ({ genre, count }))
      };
    } catch (error) {
      console.error('Error getting guild preferences stats:', error);
      return {
        totalUsers: 0,
        cannabisEnabled: 0,
        autoQueueEnabled: 0,
        meditationEnabled: 0,
        explicitFiltered: 0,
        popularGenres: []
      };
    }
  }

  /**
   * Reset user preferences to defaults
   * @param {string} userId - Discord user ID
   * @param {string} guildId - Discord guild ID
   * @returns {Promise<boolean>} - Success status
   */
  static async resetPreferences(userId, guildId) {
    try {
      const preferences = await this.findOne({
        where: {
          user_id: userId,
          guild_id: guildId
        }
      });

      if (!preferences) return false;

      await preferences.update({
        preferred_volume: 50,
        auto_queue_enabled: false,
        meditation_mode_enabled: false,
        explicit_content_filter: true,
        favorite_genres: [],
        blocked_sources: [],
        cannabis_music_enabled: false
      });

      return true;
    } catch (error) {
      console.error('Error resetting user preferences:', error);
      return false;
    }
  }
}

/**
 * Initialize UserMusicPreferences model with database connection
 * @param {Sequelize} sequelize - Database connection instance
 * @returns {UserMusicPreferences} - Initialized UserMusicPreferences model
 */
function initUserMusicPreferencesModel(sequelize) {
  UserMusicPreferences.init({
    user_id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
      comment: 'Discord user ID (composite primary key with guild_id)'
    },
    guild_id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
      comment: 'Discord guild ID (composite primary key with user_id)'
    },
    preferred_volume: {
      type: DataTypes.INTEGER,
      defaultValue: 50,
      validate: {
        min: 0,
        max: 100
      },
      comment: 'User preferred volume level (0-100)'
    },
    auto_queue_enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether auto-queue is enabled for user'
    },
    meditation_mode_enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether meditation mode is enabled'
    },
    explicit_content_filter: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Whether to filter explicit content'
    },
    favorite_genres: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Array of user favorite music genres'
    },
    blocked_sources: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Array of blocked music sources'
    },
    cannabis_music_enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether user has enabled cannabis-related music content'
    }
  }, {
    sequelize,
    modelName: 'UserMusicPreferences',
    tableName: 'user_music_preferences',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,

    indexes: [
      {
        name: 'idx_user_music_prefs_guild',
        fields: ['guild_id']
      },
      {
        name: 'idx_user_music_prefs_cannabis',
        fields: ['cannabis_music_enabled'],
        where: { cannabis_music_enabled: true }
      },
      {
        name: 'idx_user_music_prefs_auto_queue',
        fields: ['auto_queue_enabled'],
        where: { auto_queue_enabled: true }
      },
      {
        name: 'idx_user_music_prefs_meditation',
        fields: ['meditation_mode_enabled'],
        where: { meditation_mode_enabled: true }
      },
      {
        name: 'idx_user_music_prefs_explicit_filter',
        fields: ['explicit_content_filter']
      },
      {
        name: 'idx_user_music_prefs_volume',
        fields: ['preferred_volume']
      }
    ],

    // Model validation rules
    validate: {
      // Ensure valid volume range
      volumeRangeValidation() {
        if (this.preferred_volume < 0 || this.preferred_volume > 100) {
          throw new Error('Preferred volume must be between 0 and 100');
        }
      },

      // Validate favorite genres array
      favoriteGenresValidation() {
        if (this.favorite_genres && !Array.isArray(this.favorite_genres)) {
          throw new Error('Favorite genres must be an array');
        }
      },

      // Validate blocked sources array
      blockedSourcesValidation() {
        if (this.blocked_sources && !Array.isArray(this.blocked_sources)) {
          throw new Error('Blocked sources must be an array');
        }
      }
    },

    // Model hooks for business logic
    hooks: {
      beforeCreate: async (preferences) => {
        // Ensure arrays are properly initialized
        if (!preferences.favorite_genres) {
          preferences.favorite_genres = [];
        }
        if (!preferences.blocked_sources) {
          preferences.blocked_sources = [];
        }

        // Normalize favorite genres to lowercase
        if (preferences.favorite_genres.length > 0) {
          preferences.favorite_genres = preferences.favorite_genres.map(genre => 
            genre.toLowerCase()
          );
        }
      },

      beforeUpdate: async (preferences) => {
        // Normalize favorite genres to lowercase on update
        if (preferences.changed('favorite_genres') && preferences.favorite_genres.length > 0) {
          preferences.favorite_genres = preferences.favorite_genres.map(genre => 
            genre.toLowerCase()
          );
        }

        // Limit favorite genres to reasonable number
        if (preferences.favorite_genres && preferences.favorite_genres.length > 20) {
          preferences.favorite_genres = preferences.favorite_genres.slice(0, 20);
        }

        // Limit blocked sources to reasonable number
        if (preferences.blocked_sources && preferences.blocked_sources.length > 10) {
          preferences.blocked_sources = preferences.blocked_sources.slice(0, 10);
        }
      }
    }
  });

  return UserMusicPreferences;
}

module.exports = { UserMusicPreferences, initUserMusicPreferencesModel };