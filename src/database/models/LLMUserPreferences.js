/**
 * LLMUserPreferences Model for GrowmiesNJ Discord Bot
 * 
 * LLM Chat Integration: User AI preferences and settings management
 * Stores user-specific AI assistant configurations and cannabis content preferences
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../connection');

/**
 * LLMUserPreferences model for AI chat user customization
 * Handles user preferences for AI responses and cannabis content settings
 */
class LLMUserPreferences extends Model {
  /**
   * Check if user has cannabis assistance enabled
   * @returns {boolean} - True if cannabis assistance is enabled
   */
  hasCannabisAssistanceEnabled() {
    return this.cannabis_assistance_enabled;
  }

  /**
   * Check if user can access strain recommendations
   * @returns {boolean} - True if strain recommendations are enabled
   */
  canAccessStrainRecommendations() {
    return this.enable_strain_recommendations && this.cannabis_assistance_enabled;
  }

  /**
   * Check if user can access legal advice
   * @returns {boolean} - True if legal advice is enabled
   */
  canAccessLegalAdvice() {
    return this.enable_legal_advice;
  }

  /**
   * Get user's preferred response style
   * @returns {string} - Response style (casual/educational/technical)
   */
  getResponseStyle() {
    return this.preferred_response_style;
  }

  /**
   * Get user's content filter level
   * @returns {string} - Filter level (strict/moderate/relaxed)
   */
  getContentFilterLevel() {
    return this.content_filter_level;
  }

  /**
   * Check if conversation history is enabled
   * @returns {boolean} - True if conversation history is enabled
   */
  isConversationHistoryEnabled() {
    return this.conversation_history_enabled;
  }

  /**
   * Get or create user preferences
   * @param {string} userId - Discord user ID
   * @param {string} guildId - Discord guild ID
   * @returns {Promise<LLMUserPreferences>} - User preferences instance
   */
  static async getOrCreatePreferences(userId, guildId) {
    const [preferences, created] = await this.findOrCreate({
      where: { user_id: userId, guild_id: guildId },
      defaults: {
        user_id: userId,
        guild_id: guildId,
        // Default values are set in model definition
      },
    });

    if (created) {
      console.log(`🆕 Created default AI preferences for user ${userId}`);
    }

    return preferences;
  }

  /**
   * Update user cannabis assistance settings
   * @param {string} userId - Discord user ID
   * @param {string} guildId - Discord guild ID
   * @param {boolean} enabled - Whether to enable cannabis assistance
   * @param {Object} options - Additional cannabis preference options
   * @returns {Promise<LLMUserPreferences>} - Updated preferences
   */
  static async updateCannabisSettings(userId, guildId, enabled, options = {}) {
    const preferences = await this.getOrCreatePreferences(userId, guildId);
    
    const updateData = {
      cannabis_assistance_enabled: enabled,
    };

    // Update specific cannabis features if provided
    if (options.strainRecommendations !== undefined) {
      updateData.enable_strain_recommendations = options.strainRecommendations && enabled;
    }
    if (options.legalAdvice !== undefined) {
      updateData.enable_legal_advice = options.legalAdvice;
    }

    await preferences.update(updateData);
    return preferences;
  }

  /**
   * Update user response preferences
   * @param {string} userId - Discord user ID
   * @param {string} guildId - Discord guild ID
   * @param {Object} responsePrefs - Response preference settings
   * @returns {Promise<LLMUserPreferences>} - Updated preferences
   */
  static async updateResponsePreferences(userId, guildId, responsePrefs = {}) {
    const preferences = await this.getOrCreatePreferences(userId, guildId);
    
    const updateData = {};

    if (responsePrefs.style && ['casual', 'educational', 'technical'].includes(responsePrefs.style)) {
      updateData.preferred_response_style = responsePrefs.style;
    }

    if (responsePrefs.maxLength && responsePrefs.maxLength >= 100 && responsePrefs.maxLength <= 4000) {
      updateData.max_response_length = responsePrefs.maxLength;
    }

    if (responsePrefs.filterLevel && ['strict', 'moderate', 'relaxed'].includes(responsePrefs.filterLevel)) {
      updateData.content_filter_level = responsePrefs.filterLevel;
    }

    if (responsePrefs.conversationHistory !== undefined) {
      updateData.conversation_history_enabled = responsePrefs.conversationHistory;
    }

    await preferences.update(updateData);
    return preferences;
  }

  /**
   * Get user preferences for AI responses
   * @param {string} userId - Discord user ID
   * @param {string} guildId - Discord guild ID
   * @returns {Promise<Object>} - Formatted preferences for AI service
   */
  static async getAIPreferences(userId, guildId) {
    const preferences = await this.getOrCreatePreferences(userId, guildId);
    
    return {
      responseStyle: preferences.preferred_response_style,
      maxResponseLength: preferences.max_response_length,
      cannabisAssistanceEnabled: preferences.cannabis_assistance_enabled,
      strainRecommendationsEnabled: preferences.enable_strain_recommendations,
      legalAdviceEnabled: preferences.enable_legal_advice,
      contentFilterLevel: preferences.content_filter_level,
      conversationHistoryEnabled: preferences.conversation_history_enabled,
    };
  }

  /**
   * Get users with cannabis assistance enabled for a guild
   * @param {string} guildId - Discord guild ID
   * @returns {Promise<string[]>} - Array of user IDs with cannabis assistance enabled
   */
  static async getUsersWithCannabisEnabled(guildId) {
    const users = await this.findAll({
      where: {
        guild_id: guildId,
        cannabis_assistance_enabled: true,
      },
      attributes: ['user_id'],
      raw: true,
    });

    return users.map(user => user.user_id);
  }

  /**
   * Get preference statistics for a guild
   * @param {string} guildId - Discord guild ID
   * @returns {Promise<Object>} - Preference statistics
   */
  static async getPreferenceStats(guildId) {
    const { fn, col } = require('@sequelize/core');
    
    const totalUsers = await this.count({ where: { guild_id: guildId } });
    
    const stats = await this.findOne({
      where: { guild_id: guildId },
      attributes: [
        [fn('SUM', 
          sequelize.literal(`CASE WHEN cannabis_assistance_enabled THEN 1 ELSE 0 END`)
        ), 'cannabis_enabled'],
        [fn('SUM', 
          sequelize.literal(`CASE WHEN enable_strain_recommendations THEN 1 ELSE 0 END`)
        ), 'strain_recommendations_enabled'],
        [fn('SUM', 
          sequelize.literal(`CASE WHEN enable_legal_advice THEN 1 ELSE 0 END`)
        ), 'legal_advice_enabled'],
        [fn('SUM', 
          sequelize.literal(`CASE WHEN conversation_history_enabled THEN 1 ELSE 0 END`)
        ), 'conversation_history_enabled'],
      ],
      raw: true,
    });

    const styleStats = await this.findAll({
      where: { guild_id: guildId },
      attributes: [
        'preferred_response_style',
        [fn('COUNT', '*'), 'count'],
      ],
      group: ['preferred_response_style'],
      raw: true,
    });

    const filterStats = await this.findAll({
      where: { guild_id: guildId },
      attributes: [
        'content_filter_level',
        [fn('COUNT', '*'), 'count'],
      ],
      group: ['content_filter_level'],
      raw: true,
    });

    return {
      totalUsers,
      cannabisEnabled: parseInt(stats.cannabis_enabled) || 0,
      strainRecommendationsEnabled: parseInt(stats.strain_recommendations_enabled) || 0,
      legalAdviceEnabled: parseInt(stats.legal_advice_enabled) || 0,
      conversationHistoryEnabled: parseInt(stats.conversation_history_enabled) || 0,
      responseStyles: styleStats.reduce((acc, style) => {
        acc[style.preferred_response_style] = parseInt(style.count);
        return acc;
      }, {}),
      contentFilters: filterStats.reduce((acc, filter) => {
        acc[filter.content_filter_level] = parseInt(filter.count);
        return acc;
      }, {}),
    };
  }

  /**
   * Reset user preferences to defaults
   * @param {string} userId - Discord user ID
   * @param {string} guildId - Discord guild ID
   * @returns {Promise<LLMUserPreferences>} - Reset preferences
   */
  static async resetToDefaults(userId, guildId) {
    const preferences = await this.getOrCreatePreferences(userId, guildId);
    
    await preferences.update({
      cannabis_assistance_enabled: false,
      preferred_response_style: 'casual',
      max_response_length: 2000,
      enable_strain_recommendations: false,
      enable_legal_advice: false,
      content_filter_level: 'moderate',
      conversation_history_enabled: true,
    });

    return preferences;
  }
}

/**
 * Initialize LLMUserPreferences model with database connection
 * @param {Sequelize} sequelize - Database connection instance
 * @returns {LLMUserPreferences} - Initialized LLMUserPreferences model
 */
function initLLMUserPreferencesModel(sequelize) {
  LLMUserPreferences.init({
    user_id: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Discord user ID',
    },
    guild_id: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Discord guild/server ID',
    },
    cannabis_assistance_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether user has enabled cannabis AI assistance (requires 21+)',
    },
    preferred_response_style: {
      type: DataTypes.ENUM('casual', 'educational', 'technical'),
      allowNull: false,
      defaultValue: 'casual',
      comment: 'Preferred AI response style and tone',
    },
    max_response_length: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 2000,
      comment: 'Maximum length for AI responses in characters',
    },
    enable_strain_recommendations: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Allow AI to provide cannabis strain recommendations (21+ only)',
    },
    enable_legal_advice: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Allow AI to provide general legal information about cannabis',
    },
    content_filter_level: {
      type: DataTypes.ENUM('strict', 'moderate', 'relaxed'),
      allowNull: false,
      defaultValue: 'moderate',
      comment: 'Content filtering strictness level',
    },
    conversation_history_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Whether to maintain conversation context across messages',
    },
  }, {
    sequelize,
    modelName: 'LLMUserPreferences',
    tableName: 'llm_user_preferences',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    
    // Composite primary key
    primaryKey: false,
    indexes: [
      {
        name: 'idx_llm_user_prefs_primary',
        fields: ['user_id', 'guild_id'],
        unique: true,
      },
      {
        name: 'idx_llm_user_prefs_guild',
        fields: ['guild_id'],
      },
      {
        name: 'idx_llm_user_prefs_cannabis',
        fields: ['cannabis_assistance_enabled'],
        where: { cannabis_assistance_enabled: true },
      },
      {
        name: 'idx_llm_user_prefs_strain_recs',
        fields: ['enable_strain_recommendations'],
        where: { enable_strain_recommendations: true },
      },
      {
        name: 'idx_llm_user_prefs_legal_advice',
        fields: ['enable_legal_advice'],
        where: { enable_legal_advice: true },
      },
      {
        name: 'idx_llm_user_prefs_response_style',
        fields: ['preferred_response_style'],
      },
      {
        name: 'idx_llm_user_prefs_filter_level',
        fields: ['content_filter_level'],
      },
      {
        name: 'idx_llm_user_prefs_guild_cannabis',
        fields: ['guild_id', 'cannabis_assistance_enabled'],
      },
    ],

    // Model validation rules
    validate: {
      // Ensure max response length is within reasonable bounds
      responseLengthValidation() {
        if (this.max_response_length < 100 || this.max_response_length > 4000) {
          throw new Error('Max response length must be between 100 and 4000 characters');
        }
      },

      // Ensure strain recommendations require cannabis assistance
      strainRecommendationValidation() {
        if (this.enable_strain_recommendations && !this.cannabis_assistance_enabled) {
          throw new Error('Strain recommendations require cannabis assistance to be enabled');
        }
      },
    },

    // Model hooks for business logic
    hooks: {
      beforeCreate: async (preferences) => {
        // Ensure strain recommendations are disabled if cannabis assistance is disabled
        if (!preferences.cannabis_assistance_enabled) {
          preferences.enable_strain_recommendations = false;
        }
      },

      beforeUpdate: async (preferences) => {
        // Auto-disable strain recommendations if cannabis assistance is disabled
        if (preferences.changed('cannabis_assistance_enabled') && !preferences.cannabis_assistance_enabled) {
          preferences.enable_strain_recommendations = false;
        }
      },
    },
  });

  return LLMUserPreferences;
}

module.exports = { LLMUserPreferences, initLLMUserPreferencesModel };