/**
 * LLMMessage Model for GrowmiesNJ Discord Bot
 * 
 * LLM Chat Integration: Individual message storage and context management
 * Stores user messages and AI responses with cannabis compliance tracking
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../connection');

/**
 * LLMMessage model for AI chat message tracking
 * Handles individual messages within conversations with compliance filtering
 */
class LLMMessage extends Model {
  /**
   * Check if message contains cannabis content
   * @returns {boolean} - True if message contains cannabis-related content
   */
  containsCannabisContent() {
    return this.contains_cannabis_content;
  }

  /**
   * Check if message was compliance filtered
   * @returns {boolean} - True if message was filtered for compliance
   */
  wasComplianceFiltered() {
    return this.compliance_filtered;
  }

  /**
   * Get message age in minutes
   * @returns {number} - Minutes since message was created
   */
  getMessageAge() {
    const now = new Date();
    const diffTime = now - this.created_at;
    return Math.floor(diffTime / (1000 * 60));
  }

  /**
   * Get conversation context for OpenAI API
   * @param {string} conversationId - Conversation UUID
   * @param {number} limit - Number of messages to retrieve
   * @returns {Promise<Array>} - Array of messages formatted for OpenAI
   */
  static async getConversationContext(conversationId, limit = 10) {
    const messages = await this.findAll({
      where: { conversation_id: conversationId },
      order: [['created_at', 'ASC']],
      limit: limit * 2, // Account for user/assistant pairs
      attributes: ['message_role', 'message_content', 'created_at'],
    });

    return messages.map(msg => ({
      role: msg.message_role,
      content: msg.message_content,
      timestamp: msg.created_at,
    }));
  }

  /**
   * Create user message in conversation
   * @param {string} conversationId - Conversation UUID
   * @param {string} content - Message content
   * @param {Object} metadata - Additional message metadata
   * @returns {Promise<LLMMessage>} - Created message instance
   */
  static async createUserMessage(conversationId, content, metadata = {}) {
    return await this.create({
      conversation_id: conversationId,
      message_role: 'user',
      message_content: content,
      contains_cannabis_content: this.detectCannabisContent(content),
      message_metadata: {
        ...metadata,
        message_length: content.length,
        created_via: 'user_input',
      },
    });
  }

  /**
   * Create assistant message in conversation
   * @param {string} conversationId - Conversation UUID
   * @param {string} content - AI response content
   * @param {number} tokensUsed - Tokens used for this response
   * @param {Object} metadata - Additional message metadata
   * @returns {Promise<LLMMessage>} - Created message instance
   */
  static async createAssistantMessage(conversationId, content, tokensUsed = 0, metadata = {}) {
    return await this.create({
      conversation_id: conversationId,
      message_role: 'assistant',
      message_content: content,
      tokens_used: tokensUsed,
      contains_cannabis_content: this.detectCannabisContent(content),
      compliance_filtered: metadata.compliance_filtered || false,
      message_metadata: {
        ...metadata,
        message_length: content.length,
        created_via: 'ai_response',
        model_used: metadata.model_used || 'gpt-4-turbo',
      },
    });
  }

  /**
   * Create system message in conversation
   * @param {string} conversationId - Conversation UUID
   * @param {string} content - System prompt content
   * @param {Object} metadata - Additional message metadata
   * @returns {Promise<LLMMessage>} - Created message instance
   */
  static async createSystemMessage(conversationId, content, metadata = {}) {
    return await this.create({
      conversation_id: conversationId,
      message_role: 'system',
      message_content: content,
      contains_cannabis_content: this.detectCannabisContent(content),
      message_metadata: {
        ...metadata,
        message_length: content.length,
        created_via: 'system_prompt',
      },
    });
  }

  /**
   * Detect cannabis content in message
   * @param {string} content - Message content to analyze
   * @returns {boolean} - True if cannabis content detected
   */
  static detectCannabisContent(content) {
    const cannabisKeywords = [
      'strain', 'cannabis', 'marijuana', 'weed', 'thc', 'cbd', 'terpene',
      'cultivation', 'growing', 'harvest', 'dispensary', 'indica', 'sativa',
      'hybrid', 'edible', 'concentrate', 'flower', 'bud', 'trichome',
      'cannabinoid', 'ganja', 'hemp', 'hash', 'oil', 'vape', 'joint',
      'blunt', 'pipe', 'bong', 'dab', 'rosin', 'shatter', 'live resin'
    ];

    const lowerContent = content.toLowerCase();
    return cannabisKeywords.some(keyword => lowerContent.includes(keyword));
  }

  /**
   * Get message statistics for a conversation
   * @param {string} conversationId - Conversation UUID
   * @returns {Promise<Object>} - Message statistics
   */
  static async getConversationMessageStats(conversationId) {
    const { fn, col } = require('@sequelize/core');
    
    const stats = await this.findAll({
      where: { conversation_id: conversationId },
      attributes: [
        'message_role',
        [fn('COUNT', '*'), 'count'],
        [fn('SUM', col('tokens_used')), 'total_tokens'],
        [fn('SUM', 
          sequelize.literal(`CASE WHEN contains_cannabis_content THEN 1 ELSE 0 END`)
        ), 'cannabis_messages'],
        [fn('SUM', 
          sequelize.literal(`CASE WHEN compliance_filtered THEN 1 ELSE 0 END`)
        ), 'filtered_messages'],
      ],
      group: ['message_role'],
      raw: true,
    });

    return stats.reduce((acc, stat) => {
      acc[stat.message_role] = {
        count: parseInt(stat.count),
        totalTokens: parseInt(stat.total_tokens) || 0,
        cannabisMessages: parseInt(stat.cannabis_messages) || 0,
        filteredMessages: parseInt(stat.filtered_messages) || 0,
      };
      return acc;
    }, {});
  }

  /**
   * Clean up old messages beyond context window
   * @param {string} conversationId - Conversation UUID
   * @param {number} keepCount - Number of recent messages to keep
   * @returns {Promise<number>} - Number of messages deleted
   */
  static async cleanupOldMessages(conversationId, keepCount = 20) {
    // Get IDs of messages to keep (most recent)
    const messagesToKeep = await this.findAll({
      where: { conversation_id: conversationId },
      order: [['created_at', 'DESC']],
      limit: keepCount,
      attributes: ['id'],
      raw: true,
    });

    const keepIds = messagesToKeep.map(msg => msg.id);

    if (keepIds.length === 0) return 0;

    // Delete messages not in the keep list
    const { Op } = require('@sequelize/core');
    const deletedCount = await this.destroy({
      where: {
        conversation_id: conversationId,
        id: {
          [Op.notIn]: keepIds,
        },
      },
    });

    return deletedCount;
  }

  /**
   * Get cannabis content messages requiring age verification
   * @param {string} guildId - Discord guild ID
   * @param {number} limit - Maximum messages to return
   * @returns {Promise<LLMMessage[]>} - Cannabis content messages
   */
  static async getCannabisContentMessages(guildId, limit = 100) {
    const { LLMConversation } = require('./LLMConversation');
    
    return await this.findAll({
      include: [{
        model: LLMConversation,
        where: { guild_id: guildId },
        attributes: ['user_id', 'conversation_type', 'requires_21_plus'],
      }],
      where: { contains_cannabis_content: true },
      order: [['created_at', 'DESC']],
      limit,
    });
  }
}

/**
 * Initialize LLMMessage model with database connection
 * @param {Sequelize} sequelize - Database connection instance
 * @returns {LLMMessage} - Initialized LLMMessage model
 */
function initLLMMessageModel(sequelize) {
  LLMMessage.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: 'Unique message ID',
    },
    conversation_id: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'Reference to LLMConversation',
    },
    message_role: {
      type: DataTypes.ENUM('user', 'assistant', 'system'),
      allowNull: false,
      comment: 'OpenAI API message role (user/assistant/system)',
    },
    message_content: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Actual message content',
    },
    tokens_used: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'OpenAI API tokens used for this message',
    },
    contains_cannabis_content: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether message contains cannabis-related content',
    },
    compliance_filtered: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether message was filtered for compliance',
    },
    message_metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Additional message metadata and context',
    },
  }, {
    sequelize,
    modelName: 'LLMMessage',
    tableName: 'llm_messages',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    
    indexes: [
      {
        name: 'idx_llm_message_conversation',
        fields: ['conversation_id'],
      },
      {
        name: 'idx_llm_message_role',
        fields: ['message_role'],
      },
      {
        name: 'idx_llm_message_cannabis',
        fields: ['contains_cannabis_content'],
        where: { contains_cannabis_content: true },
      },
      {
        name: 'idx_llm_message_filtered',
        fields: ['compliance_filtered'],
        where: { compliance_filtered: true },
      },
      {
        name: 'idx_llm_message_created',
        fields: ['created_at'],
      },
      {
        name: 'idx_llm_message_conversation_created',
        fields: ['conversation_id', 'created_at'],
      },
      {
        name: 'idx_llm_message_conversation_role',
        fields: ['conversation_id', 'message_role', 'created_at'],
      },
      {
        name: 'idx_llm_message_tokens',
        fields: ['tokens_used'],
        where: { tokens_used: { [sequelize.Op.gt]: 0 } },
      },
    ],

    // Model validation rules
    validate: {
      // Ensure message content is not empty
      messageContentValidation() {
        if (!this.message_content || this.message_content.trim().length === 0) {
          throw new Error('Message content cannot be empty');
        }
      },

      // Validate token usage
      tokenUsageValidation() {
        if (this.tokens_used < 0) {
          throw new Error('Token usage cannot be negative');
        }
      },

      // Ensure system messages don't have token usage
      systemMessageValidation() {
        if (this.message_role === 'system' && this.tokens_used > 0) {
          throw new Error('System messages should not have token usage');
        }
      },
    },

    // Model hooks for business logic
    hooks: {
      beforeCreate: async (message) => {
        // Auto-detect cannabis content if not explicitly set
        if (message.contains_cannabis_content === false) {
          message.contains_cannabis_content = LLMMessage.detectCannabisContent(message.message_content);
        }

        // Set token estimate if not provided for user messages
        if (message.message_role === 'user' && message.tokens_used === 0) {
          // Rough estimate: ~4 characters per token
          message.tokens_used = Math.ceil(message.message_content.length / 4);
        }
      },

      beforeUpdate: async (message) => {
        // Re-detect cannabis content if message content changed
        if (message.changed('message_content')) {
          message.contains_cannabis_content = LLMMessage.detectCannabisContent(message.message_content);
        }
      },
    },
  });

  return LLMMessage;
}

module.exports = { LLMMessage, initLLMMessageModel };