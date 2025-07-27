/**
 * LLMConversation Model for GrowmiesNJ Discord Bot
 * 
 * LLM Chat Integration: Conversation context and threading management
 * Tracks individual conversation sessions with OpenAI API integration
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../connection');

/**
 * LLMConversation model for AI chat conversation management
 * Handles conversation context, threading, and cannabis compliance
 */
class LLMConversation extends Model {
  /**
   * Check if conversation is active and within limits
   * @returns {boolean} - True if conversation can continue
   */
  isActiveConversation() {
    return this.is_active && 
           this.total_messages < 100 && // Reasonable limit per conversation
           this.total_tokens_used < 50000; // Token usage limit
  }

  /**
   * Check if conversation needs cannabis age verification
   * @returns {boolean} - True if 21+ verification required
   */
  requiresAgeVerification() {
    return this.conversation_type !== 'general' || this.requires_21_plus;
  }

  /**
   * Get conversation age in minutes
   * @returns {number} - Minutes since conversation started
   */
  getConversationAge() {
    const now = new Date();
    const diffTime = now - this.started_at;
    return Math.floor(diffTime / (1000 * 60));
  }

  /**
   * Get active conversations for a user
   * @param {string} userId - Discord user ID
   * @param {string} guildId - Discord guild ID
   * @returns {Promise<LLMConversation[]>} - Active conversations
   */
  static async getActiveConversations(userId, guildId) {
    return await this.findAll({
      where: {
        user_id: userId,
        guild_id: guildId,
        is_active: true,
      },
      order: [['last_message_at', 'DESC']],
      limit: 5, // Limit to prevent abuse
    });
  }

  /**
   * Get or create conversation for user in channel
   * @param {string} userId - Discord user ID
   * @param {string} guildId - Discord guild ID
   * @param {string} channelId - Discord channel ID
   * @param {string} conversationType - Type of conversation
   * @returns {Promise<LLMConversation>} - Conversation instance
   */
  static async getOrCreateConversation(userId, guildId, channelId, conversationType = 'general') {
    // Check for existing active conversation in this channel
    let conversation = await this.findOne({
      where: {
        user_id: userId,
        guild_id: guildId,
        channel_id: channelId,
        is_active: true,
        conversation_type: conversationType,
      },
      order: [['last_message_at', 'DESC']],
    });

    // Create new conversation if none exists or if the existing one is too old
    if (!conversation || conversation.getConversationAge() > 60) { // 1 hour timeout
      conversation = await this.create({
        user_id: userId,
        guild_id: guildId,
        channel_id: channelId,
        conversation_type: conversationType,
        requires_21_plus: conversationType !== 'general',
        conversation_metadata: {
          created_via: 'chat_command',
          initial_type: conversationType,
        },
      });
    }

    return conversation;
  }

  /**
   * End conversation and mark as inactive
   * @param {string} reason - Reason for ending conversation
   * @returns {Promise<void>}
   */
  async endConversation(reason = 'user_ended') {
    await this.update({
      is_active: false,
      ended_at: new Date(),
      conversation_metadata: {
        ...this.conversation_metadata,
        end_reason: reason,
        final_message_count: this.total_messages,
        final_token_count: this.total_tokens_used,
      },
    });
  }

  /**
   * Update conversation statistics
   * @param {number} tokensUsed - Tokens used in latest exchange
   * @returns {Promise<void>}
   */
  async updateStats(tokensUsed = 0) {
    await this.update({
      total_messages: this.total_messages + 1,
      total_tokens_used: this.total_tokens_used + tokensUsed,
      last_message_at: new Date(),
    });
  }

  /**
   * Get conversation statistics for a guild
   * @param {string} guildId - Discord guild ID
   * @returns {Promise<Object>} - Conversation statistics
   */
  static async getConversationStats(guildId) {
    const { fn, col } = require('@sequelize/core');
    
    const stats = await this.findAll({
      where: { guild_id: guildId },
      attributes: [
        'conversation_type',
        [fn('COUNT', '*'), 'count'],
        [fn('SUM', col('total_messages')), 'total_messages'],
        [fn('SUM', col('total_tokens_used')), 'total_tokens'],
        [fn('AVG', col('total_messages')), 'avg_messages_per_conversation'],
      ],
      group: ['conversation_type'],
      raw: true,
    });

    return stats.reduce((acc, stat) => {
      acc[stat.conversation_type] = {
        count: parseInt(stat.count),
        totalMessages: parseInt(stat.total_messages) || 0,
        totalTokens: parseInt(stat.total_tokens) || 0,
        avgMessagesPerConversation: parseFloat(stat.avg_messages_per_conversation) || 0,
      };
      return acc;
    }, {});
  }
}

/**
 * Initialize LLMConversation model with database connection
 * @param {Sequelize} sequelize - Database connection instance
 * @returns {LLMConversation} - Initialized LLMConversation model
 */
function initLLMConversationModel(sequelize) {
  LLMConversation.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: 'Unique conversation ID',
    },
    user_id: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Discord user ID who started the conversation',
    },
    guild_id: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Discord guild/server ID where conversation occurred',
    },
    channel_id: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Discord channel ID where conversation occurred',
    },
    conversation_type: {
      type: DataTypes.ENUM('general', 'cannabis_education', 'strain_advice', 'legal_info', 'grow_tips'),
      allowNull: false,
      defaultValue: 'general',
      comment: 'Type of conversation for appropriate AI responses',
    },
    requires_21_plus: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether conversation requires 21+ age verification',
    },
    context_window_size: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 10,
      comment: 'Number of messages to maintain in context window',
    },
    total_messages: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Total number of messages in this conversation',
    },
    total_tokens_used: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Total OpenAI API tokens used in this conversation',
    },
    started_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'When conversation was started',
    },
    last_message_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'When last message was sent in conversation',
    },
    ended_at: {
      type: DataTypes.DATE,
      comment: 'When conversation was ended (if inactive)',
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Whether conversation is still active',
    },
    conversation_metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Additional conversation context and metadata',
    },
    thread_id: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'OpenAI Assistant thread ID for conversation continuity',
    },
    assistant_mode: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether this conversation uses OpenAI Assistant API',
    },
  }, {
    sequelize,
    modelName: 'LLMConversation',
    tableName: 'llm_conversations',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    
    indexes: [
      {
        name: 'idx_llm_conversation_user_guild',
        fields: ['user_id', 'guild_id'],
      },
      {
        name: 'idx_llm_conversation_channel',
        fields: ['channel_id'],
      },
      {
        name: 'idx_llm_conversation_active',
        fields: ['is_active'],
        where: { is_active: true },
      },
      {
        name: 'idx_llm_conversation_type',
        fields: ['conversation_type'],
      },
      {
        name: 'idx_llm_conversation_cannabis',
        fields: ['requires_21_plus'],
        where: { requires_21_plus: true },
      },
      {
        name: 'idx_llm_conversation_last_message',
        fields: ['last_message_at'],
      },
      {
        name: 'idx_llm_conversation_user_active',
        fields: ['user_id', 'guild_id', 'is_active'],
      },
      {
        name: 'idx_llm_conversation_channel_active',
        fields: ['channel_id', 'is_active', 'last_message_at'],
      },
      {
        name: 'idx_llm_conversation_thread_id',
        fields: ['thread_id'],
        where: { thread_id: { [require('@sequelize/core').Op.ne]: null } },
      },
      {
        name: 'idx_llm_conversation_assistant_mode',
        fields: ['assistant_mode'],
        where: { assistant_mode: true },
      },
    ],

    // Model validation rules
    validate: {
      // Ensure cannabis conversations require 21+ verification
      cannabisVerificationValidation() {
        const cannabisTypes = ['cannabis_education', 'strain_advice', 'grow_tips'];
        if (cannabisTypes.includes(this.conversation_type) && !this.requires_21_plus) {
          throw new Error('Cannabis conversations must require 21+ verification');
        }
      },

      // Validate context window size
      contextWindowValidation() {
        if (this.context_window_size < 1 || this.context_window_size > 50) {
          throw new Error('Context window size must be between 1 and 50');
        }
      },

      // Validate token usage
      tokenUsageValidation() {
        if (this.total_tokens_used < 0) {
          throw new Error('Token usage cannot be negative');
        }
      },
    },

    // Model hooks for business logic
    hooks: {
      beforeCreate: async (conversation) => {
        // Set 21+ requirement for cannabis conversations
        const cannabisTypes = ['cannabis_education', 'strain_advice', 'grow_tips'];
        if (cannabisTypes.includes(conversation.conversation_type)) {
          conversation.requires_21_plus = true;
        }
      },

      beforeUpdate: async (conversation) => {
        // Update last_message_at when total_messages changes
        if (conversation.changed('total_messages')) {
          conversation.last_message_at = new Date();
        }
      },
    },
  });

  return LLMConversation;
}

module.exports = { LLMConversation, initLLMConversationModel };