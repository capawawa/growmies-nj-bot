/**
 * LevelingConfig Model for GrowmiesNJ Discord Bot
 * 
 * Guild-specific configuration for cannabis-themed leveling system
 * Manages XP rates, tier thresholds, and leveling features per Discord server
 * 
 * Cannabis Industry Compliance:
 * - Integrates with age verification system
 * - Secure default settings for cannabis community engagement
 * - Audit trail integration for configuration changes
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../connection');

class LevelingConfig extends Model {
  /**
   * Find leveling config by Discord guild ID
   * Creates default config if none exists
   * 
   * @param {string} guildId - Discord guild snowflake ID
   * @returns {Promise<LevelingConfig>} Leveling config instance
   */
  static async findByGuildId(guildId) {
    try {
      let config = await this.findOne({
        where: { guild_id: guildId }
      });

      if (!config) {
        config = await this.createDefault(guildId);
      }

      return config;
    } catch (error) {
      console.error(`[LevelingConfig] Error finding config for guild ${guildId}:`, error);
      throw error;
    }
  }

  /**
   * Create default leveling configuration for a new guild
   * 
   * @param {string} guildId - Discord guild snowflake ID
   * @returns {Promise<LevelingConfig>} New leveling config instance
   */
  static async createDefault(guildId) {
    try {
      const config = await this.create({
        guild_id: guildId,
        leveling_enabled: true,
        xp_per_message: 20,
        xp_cooldown_seconds: 60,
        level_curve_multiplier: 1.0,
        tier_thresholds: {
          Seedling: { min: 1, max: 10 },
          Growing: { min: 11, max: 25 },
          Established: { min: 26, max: 50 },
          Harvested: { min: 51, max: 100 }
        },
        voice_xp_enabled: true,
        voice_xp_per_minute: 5,
        reaction_xp_enabled: true,
        xp_per_reaction_received: 1,
        level_up_notifications_enabled: true,
        leaderboard_enabled: true
      });

      console.log(`[LevelingConfig] Created default config for guild ${guildId}`);
      return config;
    } catch (error) {
      console.error(`[LevelingConfig] Error creating default config for guild ${guildId}:`, error);
      throw error;
    }
  }

  /**
   * Update specific setting with validation
   * 
   * @param {string} key - Setting key to update
   * @param {any} value - New value
   * @returns {Promise<LevelingConfig>} Updated instance
   */
  async updateSetting(key, value) {
    try {
      // Validate XP ranges to prevent abuse
      if (key === 'xp_per_message' && (value < 5 || value > 50)) {
        throw new Error('XP per message must be between 5 and 50');
      }
      
      if (key === 'xp_cooldown_seconds' && (value < 30 || value > 300)) {
        throw new Error('XP cooldown must be between 30 and 300 seconds');
      }
      
      if (key === 'voice_xp_per_minute' && (value < 1 || value > 20)) {
        throw new Error('Voice XP per minute must be between 1 and 20');
      }
      
      if (key === 'level_curve_multiplier' && (value < 0.5 || value > 3.0)) {
        throw new Error('Level curve multiplier must be between 0.5 and 3.0');
      }

      // Validate Discord snowflake IDs
      if (key === 'level_up_announcement_channel_id' && value && !this.isValidSnowflake(value)) {
        throw new Error(`Invalid Discord channel ID format: ${value}`);
      }

      this[key] = value;
      this.updated_at = new Date();
      await this.save();

      console.log(`[LevelingConfig] Updated ${key} for guild ${this.guild_id}`);
      return this;
    } catch (error) {
      console.error(`[LevelingConfig] Error updating setting ${key} for guild ${this.guild_id}:`, error);
      throw error;
    }
  }

  /**
   * Update multiple settings at once
   * 
   * @param {Object} settings - Object with setting key-value pairs
   * @returns {Promise<LevelingConfig>} Updated instance
   */
  async updateSettings(settings) {
    try {
      for (const [key, value] of Object.entries(settings)) {
        // Validate each setting before updating
        await this.updateSetting(key, value);
      }
      
      console.log(`[LevelingConfig] Updated multiple settings for guild ${this.guild_id}`);
      return this;
    } catch (error) {
      console.error(`[LevelingConfig] Error updating settings for guild ${this.guild_id}:`, error);
      throw error;
    }
  }

  /**
   * Check if leveling system is enabled
   * @returns {boolean} True if leveling is enabled
   */
  isLevelingEnabled() {
    return this.leveling_enabled === true;
  }

  /**
   * Get XP configuration object
   * @returns {Object} XP configuration
   */
  getXPConfig() {
    return {
      enabled: this.leveling_enabled,
      xp_per_message: this.xp_per_message,
      cooldown_seconds: this.xp_cooldown_seconds,
      level_curve_multiplier: this.level_curve_multiplier,
      voice_xp_enabled: this.voice_xp_enabled,
      voice_xp_per_minute: this.voice_xp_per_minute,
      reaction_xp_enabled: this.reaction_xp_enabled,
      xp_per_reaction_received: this.xp_per_reaction_received
    };
  }

  /**
   * Get tier thresholds configuration
   * @returns {Object} Cannabis tier thresholds
   */
  getTierThresholds() {
    return this.tier_thresholds || {
      Seedling: { min: 1, max: 10 },
      Growing: { min: 11, max: 25 },
      Established: { min: 26, max: 50 },
      Harvested: { min: 51, max: 100 }
    };
  }

  /**
   * Calculate XP required for a specific level
   * @param {number} level - Target level
   * @returns {number} XP required for level
   */
  calculateXPForLevel(level) {
    if (level <= 1) return 0;
    
    // Exponential curve: XP = base * (level^curve_multiplier) * 100
    const baseXP = 100;
    const curve = this.level_curve_multiplier || 1.0;
    return Math.floor(baseXP * Math.pow(level, curve + 1));
  }

  /**
   * Calculate level from total XP
   * @param {number} totalXP - Total experience points
   * @returns {number} Calculated level
   */
  calculateLevelFromXP(totalXP) {
    if (totalXP <= 0) return 1;
    
    let level = 1;
    while (this.calculateXPForLevel(level + 1) <= totalXP) {
      level++;
    }
    return level;
  }

  /**
   * Get tier from level
   * @param {number} level - User level
   * @returns {string} Cannabis tier name
   */
  getTierFromLevel(level) {
    const thresholds = this.getTierThresholds();
    
    if (level >= thresholds.Harvested.min) return 'Harvested';
    if (level >= thresholds.Established.min) return 'Established';
    if (level >= thresholds.Growing.min) return 'Growing';
    return 'Seedling';
  }

  /**
   * Get level up notification configuration
   * @returns {Object} Notification configuration
   */
  getLevelUpConfig() {
    return {
      enabled: this.level_up_notifications_enabled,
      channel_id: this.level_up_announcement_channel_id,
      dm_notifications_enabled: this.dm_level_up_notifications
    };
  }

  /**
   * Validate Discord snowflake ID format
   * @param {string} id - Discord ID to validate
   * @returns {boolean} True if valid snowflake format
   */
  isValidSnowflake(id) {
    if (!id) return false;
    const snowflakeRegex = /^\d{17,19}$/;
    return snowflakeRegex.test(id.toString());
  }

  /**
   * Get configuration summary for logging
   * @returns {Object} Configuration summary
   */
  getConfigSummary() {
    return {
      guild_id: this.guild_id,
      leveling_enabled: this.leveling_enabled,
      xp_per_message: this.xp_per_message,
      cooldown_seconds: this.xp_cooldown_seconds,
      voice_xp_enabled: this.voice_xp_enabled,
      reaction_xp_enabled: this.reaction_xp_enabled,
      notifications_enabled: this.level_up_notifications_enabled,
      leaderboard_enabled: this.leaderboard_enabled,
      last_updated: this.updated_at
    };
  }

  /**
   * Get statistics for guild leveling configs
   * @returns {Promise<Object>} Leveling config statistics
   */
  static async getGuildStats() {
    try {
      const totalGuilds = await this.count();
      const levelingEnabled = await this.count({
        where: { leveling_enabled: true }
      });
      const voiceXPEnabled = await this.count({
        where: { voice_xp_enabled: true }
      });
      const reactionXPEnabled = await this.count({
        where: { reaction_xp_enabled: true }
      });

      return {
        total_guilds: totalGuilds,
        leveling_enabled: levelingEnabled,
        leveling_percentage: totalGuilds > 0 ? (levelingEnabled / totalGuilds * 100).toFixed(1) : 0,
        voice_xp_enabled: voiceXPEnabled,
        reaction_xp_enabled: reactionXPEnabled
      };
    } catch (error) {
      console.error('[LevelingConfig] Error getting guild stats:', error);
      throw error;
    }
  }
}

/**
 * Initialize LevelingConfig model with Sequelize
 * @param {Sequelize} sequelize - Sequelize instance
 * @returns {typeof LevelingConfig} Initialized model
 */
function initLevelingConfigModel(sequelize) {
  LevelingConfig.init({
    guild_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      allowNull: false,
      comment: 'Discord guild snowflake ID'
    },
    leveling_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Enable/disable cannabis-themed leveling system'
    },
    xp_per_message: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 20,
      comment: 'Base XP awarded per message (5-50 range)'
    },
    xp_cooldown_seconds: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 60,
      comment: 'Anti-spam cooldown between XP gains (30-300 seconds)'
    },
    level_curve_multiplier: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: false,
      defaultValue: 1.0,
      comment: 'Exponential curve multiplier for level progression (0.5-3.0)'
    },
    tier_thresholds: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        Seedling: { min: 1, max: 10 },
        Growing: { min: 11, max: 25 },
        Established: { min: 26, max: 50 },
        Harvested: { min: 51, max: 100 }
      },
      comment: 'Cannabis progression tier level thresholds'
    },
    voice_xp_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Enable XP gain from voice channel participation'
    },
    voice_xp_per_minute: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 5,
      comment: 'XP awarded per minute in voice channels (1-20 range)'
    },
    reaction_xp_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Enable XP gain from receiving helpful reactions'
    },
    xp_per_reaction_received: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'XP awarded per helpful reaction received'
    },
    level_up_notifications_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Enable level-up celebration notifications'
    },
    level_up_announcement_channel_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      comment: 'Channel for public level-up announcements'
    },
    dm_level_up_notifications: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Send level-up notifications via DM'
    },
    leaderboard_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Enable public leaderboard display'
    },
    require_age_verification: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Require 21+ verification to participate in leveling'
    }
  }, {
    sequelize,
    modelName: 'LevelingConfig',
    tableName: 'leveling_configs',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        name: 'idx_leveling_config_guild',
        fields: ['guild_id'],
        unique: true,
        comment: 'Unique guild configuration lookup'
      },
      {
        name: 'idx_leveling_enabled',
        fields: ['leveling_enabled'],
        comment: 'Filter by enabled guilds'
      },
      {
        name: 'idx_age_verification_required',
        fields: ['require_age_verification'],
        comment: 'Cannabis compliance filtering'
      }
    ],
    
    // Model validation rules
    validate: {
      // Validate XP ranges
      xpRangeValidation() {
        if (this.xp_per_message < 5 || this.xp_per_message > 50) {
          throw new Error('XP per message must be between 5 and 50');
        }
        if (this.xp_cooldown_seconds < 30 || this.xp_cooldown_seconds > 300) {
          throw new Error('XP cooldown must be between 30 and 300 seconds');
        }
        if (this.voice_xp_per_minute < 1 || this.voice_xp_per_minute > 20) {
          throw new Error('Voice XP per minute must be between 1 and 20');
        }
      },

      // Validate tier thresholds structure
      tierThresholdValidation() {
        const required_tiers = ['Seedling', 'Growing', 'Established', 'Harvested'];
        if (!this.tier_thresholds || typeof this.tier_thresholds !== 'object') {
          throw new Error('Tier thresholds must be a valid object');
        }
        
        for (const tier of required_tiers) {
          if (!this.tier_thresholds[tier] || 
              typeof this.tier_thresholds[tier].min !== 'number' ||
              typeof this.tier_thresholds[tier].max !== 'number') {
            throw new Error(`Invalid tier threshold for ${tier}`);
          }
        }
      }
    },

    // Model hooks for business logic
    hooks: {
      beforeCreate: async (config) => {
        // Ensure cannabis compliance for new configs
        if (!config.require_age_verification) {
          console.warn(`[LevelingConfig] Warning: Age verification disabled for guild ${config.guild_id}`);
        }
      },

      beforeUpdate: async (config) => {
        // Log significant configuration changes
        if (config.changed('leveling_enabled')) {
          const status = config.leveling_enabled ? 'enabled' : 'disabled';
          console.log(`[LevelingConfig] Leveling system ${status} for guild ${config.guild_id}`);
        }
      }
    }
  });

  return LevelingConfig;
}

module.exports = { LevelingConfig, initLevelingConfigModel };