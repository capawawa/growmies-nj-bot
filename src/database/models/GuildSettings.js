/**
 * GuildSettings Model - Per-server configuration for Discord bot
 * 
 * Manages server-specific settings for GrowmiesNJ cannabis community bot:
 * - Age verification system configuration
 * - Role and channel management
 * - Feature toggles and customization
 * - Legal compliance settings
 * 
 * Cannabis Industry Compliance:
 * - Secure default settings (verification enabled by default)
 * - Admin role validation for regulatory oversight
 * - Audit trail integration for configuration changes
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../connection');

class GuildSettings extends Model {
  /**
   * Find guild settings by Discord guild ID
   * Creates default settings if none exist
   * 
   * @param {string} guildId - Discord guild snowflake ID
   * @returns {Promise<GuildSettings>} Guild settings instance
   */
  static async findByGuildId(guildId) {
    try {
      let settings = await this.findOne({
        where: { guild_id: guildId }
      });

      if (!settings) {
        settings = await this.createDefault(guildId);
      }

      return settings;
    } catch (error) {
      console.error(`[GuildSettings] Error finding settings for guild ${guildId}:`, error);
      throw error;
    }
  }

  /**
   * Create default settings for a new guild
   * 
   * @param {string} guildId - Discord guild snowflake ID
   * @returns {Promise<GuildSettings>} New guild settings instance
   */
  static async createDefault(guildId) {
    try {
      const settings = await this.create({
        guild_id: guildId,
        verification_enabled: true,
        admin_role_ids: [],
        welcome_message: 'Welcome to GrowmiesNJ! Please verify your age to access our cannabis community. You must be 21+ to participate.',
        verification_button_text: 'Verify Age (21+)',
        instagram_rss_enabled: false,
        feature_flags: {}
      });

      console.log(`[GuildSettings] Created default settings for guild ${guildId}`);
      return settings;
    } catch (error) {
      console.error(`[GuildSettings] Error creating default settings for guild ${guildId}:`, error);
      throw error;
    }
  }

  /**
   * Update specific setting with validation
   * 
   * @param {string} key - Setting key to update
   * @param {any} value - New value
   * @returns {Promise<GuildSettings>} Updated instance
   */
  async updateSetting(key, value) {
    try {
      // Validate Discord snowflake IDs
      if (key.includes('_id') && value && !this.isValidSnowflake(value)) {
        throw new Error(`Invalid Discord ID format for ${key}: ${value}`);
      }

      // Validate welcome message length
      if (key === 'welcome_message' && value && value.length > 2000) {
        throw new Error('Welcome message cannot exceed 2000 characters');
      }

      // Validate button text length
      if (key === 'verification_button_text' && value && value.length > 100) {
        throw new Error('Button text cannot exceed 100 characters');
      }

      // Validate admin role IDs array
      if (key === 'admin_role_ids' && Array.isArray(value)) {
        for (const roleId of value) {
          if (!this.isValidSnowflake(roleId)) {
            throw new Error(`Invalid role ID format: ${roleId}`);
          }
        }
      }

      this[key] = value;
      this.updated_at = new Date();
      await this.save();

      console.log(`[GuildSettings] Updated ${key} for guild ${this.guild_id}`);
      return this;
    } catch (error) {
      console.error(`[GuildSettings] Error updating setting ${key} for guild ${this.guild_id}:`, error);
      throw error;
    }
  }

  /**
   * Update multiple settings at once
   * 
   * @param {Object} settings - Object with setting key-value pairs
   * @returns {Promise<GuildSettings>} Updated instance
   */
  async updateSettings(settings) {
    try {
      for (const [key, value] of Object.entries(settings)) {
        // Validate each setting before updating
        if (key.includes('_id') && value && !this.isValidSnowflake(value)) {
          throw new Error(`Invalid Discord ID format for ${key}: ${value}`);
        }
        this[key] = value;
      }
      
      this.updated_at = new Date();
      await this.save();

      console.log(`[GuildSettings] Updated multiple settings for guild ${this.guild_id}`);
      return this;
    } catch (error) {
      console.error(`[GuildSettings] Error updating settings for guild ${this.guild_id}:`, error);
      throw error;
    }
  }

  /**
   * Check if verification system is enabled
   * @returns {boolean} True if verification is enabled
   */
  isVerificationEnabled() {
    return this.verification_enabled === true;
  }

  /**
   * Get admin role IDs array
   * @returns {string[]} Array of admin role IDs
   */
  getAdminRoles() {
    return Array.isArray(this.admin_role_ids) ? this.admin_role_ids : [];
  }

  /**
   * Check if user has admin role
   * @param {string[]} userRoles - Array of user's role IDs
   * @returns {boolean} True if user has admin role
   */
  hasAdminRole(userRoles) {
    const adminRoles = this.getAdminRoles();
    return adminRoles.some(roleId => userRoles.includes(roleId));
  }

  /**
   * Get verification configuration
   * @returns {Object} Verification configuration object
   */
  getVerificationConfig() {
    return {
      enabled: this.verification_enabled,
      channel_id: this.verification_channel_id,
      verified_role_id: this.verified_role_id,
      welcome_message: this.welcome_message,
      button_text: this.verification_button_text
    };
  }

  /**
   * Get Instagram RSS configuration
   * @returns {Object} Instagram RSS configuration object
   */
  getInstagramConfig() {
    return {
      enabled: this.instagram_rss_enabled,
      channel_id: this.instagram_channel_id
    };
  }

  /**
   * Enable specific feature flag
   * @param {string} flagName - Feature flag name
   * @param {any} value - Flag value (default: true)
   * @returns {Promise<GuildSettings>} Updated instance
   */
  async enableFeature(flagName, value = true) {
    const flags = { ...this.feature_flags };
    flags[flagName] = value;
    return await this.updateSetting('feature_flags', flags);
  }

  /**
   * Check if feature flag is enabled
   * @param {string} flagName - Feature flag name
   * @returns {boolean} True if feature is enabled
   */
  isFeatureEnabled(flagName) {
    return this.feature_flags && this.feature_flags[flagName] === true;
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
   * Get guild configuration summary for logging
   * @returns {Object} Configuration summary
   */
  getConfigSummary() {
    return {
      guild_id: this.guild_id,
      verification_enabled: this.verification_enabled,
      has_verification_channel: !!this.verification_channel_id,
      has_verified_role: !!this.verified_role_id,
      admin_roles_count: this.getAdminRoles().length,
      has_log_channel: !!this.log_channel_id,
      instagram_enabled: this.instagram_rss_enabled,
      feature_flags: Object.keys(this.feature_flags || {}).length,
      last_updated: this.updated_at
    };
  }

  /**
   * Validate all Discord IDs in settings
   * @returns {Object} Validation results
   */
  validateDiscordIds() {
    const results = {
      valid: true,
      errors: []
    };

    const idsToCheck = [
      { key: 'verification_channel_id', value: this.verification_channel_id },
      { key: 'verified_role_id', value: this.verified_role_id },
      { key: 'log_channel_id', value: this.log_channel_id },
      { key: 'instagram_channel_id', value: this.instagram_channel_id }
    ];

    for (const { key, value } of idsToCheck) {
      if (value && !this.isValidSnowflake(value)) {
        results.valid = false;
        results.errors.push(`Invalid ${key}: ${value}`);
      }
    }

    // Validate admin role IDs
    for (const roleId of this.getAdminRoles()) {
      if (!this.isValidSnowflake(roleId)) {
        results.valid = false;
        results.errors.push(`Invalid admin role ID: ${roleId}`);
      }
    }

    return results;
  }

  /**
   * Get statistics for guild settings
   * @returns {Promise<Object>} Guild settings statistics
   */
  static async getGuildStats() {
    try {
      const totalGuilds = await this.count();
      const verificationEnabled = await this.count({
        where: { verification_enabled: true }
      });
      const instagramEnabled = await this.count({
        where: { instagram_rss_enabled: true }
      });

      return {
        total_guilds: totalGuilds,
        verification_enabled: verificationEnabled,
        verification_percentage: totalGuilds > 0 ? (verificationEnabled / totalGuilds * 100).toFixed(1) : 0,
        instagram_enabled: instagramEnabled,
        instagram_percentage: totalGuilds > 0 ? (instagramEnabled / totalGuilds * 100).toFixed(1) : 0
      };
    } catch (error) {
      console.error('[GuildSettings] Error getting guild stats:', error);
      throw error;
    }
  }
}

/**
 * Initialize GuildSettings model with Sequelize
 * @param {Sequelize} sequelize - Sequelize instance
 * @returns {typeof GuildSettings} Initialized model
 */
function initGuildSettingsModel(sequelize) {
  GuildSettings.init({
    guild_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      allowNull: false,
      comment: 'Discord guild snowflake ID'
    },
    verification_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Enable/disable age verification system'
    },
    verification_channel_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      comment: 'Channel where age verification takes place'
    },
    verified_role_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      comment: 'Role assigned to verified 21+ users'
    },
    admin_role_ids: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      comment: 'Array of role IDs that can manage bot settings'
    },
    log_channel_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      comment: 'Channel for audit logs and bot notifications'
    },
    welcome_message: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: 'Welcome to GrowmiesNJ! Please verify your age to access our cannabis community. You must be 21+ to participate.',
      comment: 'Custom welcome message for new users'
    },
    verification_button_text: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: 'Verify Age (21+)',
      comment: 'Custom text for age verification button'
    },
    instagram_rss_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Enable Instagram RSS feed integration'
    },
    instagram_channel_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      comment: 'Channel for Instagram post notifications'
    },
    feature_flags: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
      comment: 'Bot feature flags for progressive rollout'
    }
  }, {
    sequelize,
    modelName: 'GuildSettings',
    tableName: 'guild_settings',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['guild_id'],
        unique: true
      }
    ]
  });

  return GuildSettings;
}

module.exports = { GuildSettings, initGuildSettingsModel };