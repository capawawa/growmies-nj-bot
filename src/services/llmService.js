/**
 * LLM Service for GrowmiesNJ Discord Bot
 * 
 * LLM Chat Integration: Core service for OpenAI integration, conversation management,
 * and cannabis compliance filtering with comprehensive audit trails
 * 
 * Enhanced with:
 * - OpenAI Responses API support
 * - Vector store integration
 * - Session memory management (600s timeout, 10-turn limit)
 * - Image attachment support
 * - Credit-based usage tracking (Discord GrowCoins for reimbursement)
 * - VIP/self-pay API key modes
 * - High-Yield Homie persona integration
 */

const Joi = require('joi');
const { LLMConversation } = require('../database/models/LLMConversation');
const { LLMMessage } = require('../database/models/LLMMessage');
const { LLMUserPreferences } = require('../database/models/LLMUserPreferences');
const { CannabisKnowledgeBase } = require('../database/models/CannabisKnowledgeBase');
const { User } = require('../database/models/User');
const { Economy } = require('../database/models/Economy');
const { AuditLog } = require('../database/models/AuditLog');
const {
  OpenAIHelpers,
  CannabisComplianceHelpers,
  ContextHelpers,
  ResponseHelpers,
} = require('../utils/llmHelpers');

/**
 * LLM Service Class
 * Handles all AI chat operations with cannabis compliance validation and age verification
 */
class LLMService {
  constructor() {
    this.openai = null;
    this.tiktoken = null;
    this.natural = null;
    
    // Initialize OpenAI client when dependencies are available
    this.initializeOpenAI();
    
    // Cannabis conversation types that require 21+ verification
    this.cannabisConversationTypes = [
      'strain_advice',
      'grow_tips',
      'legal_info',
      'cannabis_education',
      'cultivation_advice'
    ];

    // Default OpenAI settings
    this.defaultOpenAISettings = {
      model: 'gpt-4-turbo-preview',
      temperature: 0.7,
      max_tokens: 1000,
      top_p: 1.0,
      frequency_penalty: 0.0,
      presence_penalty: 0.0,
    };

    // Assistant configuration
    this.assistantConfig = {
      enabled: process.env.OPENAI_USE_ASSISTANT === 'true',
      assistantId: process.env.OPENAI_ASSISTANT_ID || 'asst_NEhRP97QthjpqnMiDPZiYd0x',
      model: process.env.OPENAI_ASSISTANT_MODEL || 'gpt-4.1-mini',
      fallbackToChat: true, // Fallback to chat completions if assistant fails
    };

    // Vector store configuration
    this.vectorStoreConfig = {
      enabled: true,
      vectorStoreId: process.env.OPENAI_VECTOR_STORE_ID || 'vs_6884ce1d1f98819182c6a0bdc3d617c6',
      maxSearchResults: 5,
    };

    // Session memory configuration
    this.sessionConfig = {
      timeoutSeconds: 600, // 10 minutes
      maxTurns: 10, // 10-turn limit
      cleanupIntervalMs: 60000, // Check for expired sessions every minute
    };

    // Token limits for context management
    this.tokenLimits = {
      maxContextTokens: 3000,
      maxResponseTokens: 1000,
      warningThreshold: 2500,
    };

    // Cost calculation rates (in cents per 1K tokens)
    this.tokenCosts = {
      'gpt-4-turbo-preview': { input: 1.0, output: 3.0 },
      'gpt-4': { input: 3.0, output: 6.0 },
      'gpt-3.5-turbo': { input: 0.05, output: 0.15 },
      'gpt-4.1-mini': { input: 0.5, output: 1.5 },
    };

    // High-Yield Homie system prompt
    this.highYieldHomiePrompt = null;
    this.loadHighYieldHomiePrompt();

    // Session memory storage
    this.sessionMemory = new Map();
    
    // Start session cleanup interval
    this.startSessionCleanup();
  }

  /**
   * Initialize OpenAI client and related dependencies
   */
  async initializeOpenAI() {
    try {
      // Try to import OpenAI dependencies
      const OpenAI = require('openai');
      this.tiktoken = require('tiktoken');
      this.natural = require('natural');
      
      if (!process.env.OPENAI_API_KEY) {
        console.warn('[LLMService] No OpenAI API key found in environment variables');
        return;
      }

      // Initialize with the main API key
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      console.log('[LLMService] OpenAI client initialized successfully');
    } catch (error) {
      console.warn('[LLMService] OpenAI dependencies not available:', error.message);
      console.warn('[LLMService] LLM features will be disabled until dependencies are installed');
    }
  }

  /**
   * Load High-Yield Homie system prompt
   */
  async loadHighYieldHomiePrompt() {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      const promptPath = path.join(process.cwd(), 'ResponsesAPIsystemprompt.txt');
      this.highYieldHomiePrompt = await fs.readFile(promptPath, 'utf8');
      console.log('[LLMService] High-Yield Homie prompt loaded successfully');
    } catch (error) {
      console.warn('[LLMService] Could not load High-Yield Homie prompt:', error.message);
      // Fallback to basic cannabis prompt
      this.highYieldHomiePrompt = `You are a knowledgeable cannabis assistant. Provide helpful, accurate information about cannabis cultivation, strains, and legal matters. Always include appropriate disclaimers and ensure compliance with local laws.`;
    }
  }

  /**
   * Start session cleanup interval
   */
  startSessionCleanup() {
    setInterval(() => {
      const now = Date.now();
      for (const [sessionKey, session] of this.sessionMemory.entries()) {
        if (now - session.lastActivity > this.sessionConfig.timeoutSeconds * 1000) {
          this.sessionMemory.delete(sessionKey);
          console.log(`[LLMService] Cleaned up expired session: ${sessionKey}`);
        }
      }
    }, this.sessionConfig.cleanupIntervalMs);
  }

  /**
   * Check if OpenAI is available
   * @returns {boolean} - True if OpenAI is ready to use
   */
  isOpenAIAvailable() {
    return !!this.openai;
  }

  /**
   * Validation schema for chat requests
   */
  get chatRequestSchema() {
    return Joi.object({
      userId: Joi.string().required(),
      guildId: Joi.string().required(),
      channelId: Joi.string().required(),
      message: Joi.string().min(1).max(2000).required(),
      conversationType: Joi.string().valid(
        'general',
        'cannabis_education',
        'strain_advice',
        'grow_tips',
        'legal_info',
        'cultivation_advice'
      ).default('general'),
      requiresAgeVerification: Joi.boolean().default(false),
      userPreferences: Joi.object().optional(),
      imageAttachments: Joi.array().items(
        Joi.object({
          url: Joi.string().uri().required(),
          contentType: Joi.string().optional(),
        })
      ).optional(),
      useResponsesAPI: Joi.boolean().default(false),
    });
  }

  /**
   * Validation schema for conversation management
   */
  get conversationSchema() {
    return Joi.object({
      userId: Joi.string().required(),
      guildId: Joi.string().required(),
      channelId: Joi.string().required(),
      action: Joi.string().valid('clear', 'archive', 'get_context', 'get_stats').required(),
    });
  }

  /**
   * Validation schema for user preferences
   */
  get preferencesSchema() {
    return Joi.object({
      cannabis_assistance_enabled: Joi.boolean().optional(),
      response_style: Joi.string().valid('educational', 'conversational', 'technical').optional(),
      content_filtering: Joi.string().valid('strict', 'moderate', 'minimal').optional(),
      max_response_length: Joi.number().integer().min(100).max(2000).optional(),
      include_disclaimers: Joi.boolean().optional(),
      preferred_topics: Joi.array().items(Joi.string()).optional(),
      use_own_api_key: Joi.boolean().optional(),
      openai_api_key: Joi.string().optional(),
    });
  }

  /**
   * Helper method: Calculate cost in cents based on token usage
   * @param {Object} usage - Token usage object with prompt_tokens and completion_tokens
   * @param {string} model - Model name
   * @returns {number} - Cost in cents
   */
  calculateCost(usage, model = 'gpt-4-turbo-preview') {
    const costs = this.tokenCosts[model] || this.tokenCosts['gpt-4-turbo-preview'];
    const inputCost = (usage.prompt_tokens / 1000) * costs.input;
    const outputCost = (usage.completion_tokens / 1000) * costs.output;
    return Math.ceil(inputCost + outputCost); // Round up to nearest cent
  }

  /**
   * Helper method: Choose API key based on user mode
   * @param {string} userId - Discord user ID
   * @param {string} guildId - Discord guild ID
   * @returns {Promise<Object>} - API key and mode info
   */
  async chooseApiKey(userId, guildId) {
    try {
      // Check if user has VIP status
      const user = await User.findOne({
        where: { discord_id: userId, guild_id: guildId }
      });

      // Check user preferences for self-pay mode
      const preferences = await LLMUserPreferences.getOrCreatePreferences(userId, guildId);
      
      // VIP users get unlimited access with main API key
      if (user && user.assigned_roles && user.assigned_roles.includes('vip')) {
        return {
          apiKey: process.env.OPENAI_API_KEY,
          mode: 'vip',
          deductCredits: false,
        };
      }

      // Self-pay mode - user provides their own API key
      if (preferences.use_own_api_key && preferences.openai_api_key) {
        return {
          apiKey: preferences.openai_api_key,
          mode: 'self-pay',
          deductCredits: false,
        };
      }

      // Default credit-based mode using main API key
      return {
        apiKey: process.env.OPENAI_API_KEY,
        mode: 'credit',
        deductCredits: true,
      };
    } catch (error) {
      console.error('[LLMService] Error choosing API key:', error.message);
      return {
        apiKey: process.env.OPENAI_API_KEY,
        mode: 'credit',
        deductCredits: true,
      };
    }
  }

  /**
   * Helper method: Build content parts for messages with image support
   * @param {string} text - Message text
   * @param {Array} imageAttachments - Array of image attachments
   * @returns {Array} - Content parts for OpenAI API
   */
  buildContentParts(text, imageAttachments = []) {
    const parts = [{ type: 'text', text }];
    
    for (const attachment of imageAttachments) {
      if (attachment.url && attachment.url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
        parts.push({
          type: 'image_url',
          image_url: {
            url: attachment.url,
            detail: 'auto', // Let OpenAI decide the detail level
          }
        });
      }
    }
    
    return parts;
  }

  /**
   * Get or create session memory for user
   * @param {string} userId - Discord user ID
   * @param {string} channelId - Discord channel ID
   * @returns {Object} - Session memory object
   */
  getOrCreateSession(userId, channelId) {
    const sessionKey = `${userId}-${channelId}`;
    
    if (!this.sessionMemory.has(sessionKey)) {
      this.sessionMemory.set(sessionKey, {
        messages: [],
        turnCount: 0,
        lastActivity: Date.now(),
        createdAt: Date.now(),
      });
    }
    
    const session = this.sessionMemory.get(sessionKey);
    
    // Check if session has expired
    if (Date.now() - session.lastActivity > this.sessionConfig.timeoutSeconds * 1000) {
      // Reset session
      session.messages = [];
      session.turnCount = 0;
      session.createdAt = Date.now();
    }
    
    // Check if turn limit reached
    if (session.turnCount >= this.sessionConfig.maxTurns) {
      // Keep only last 5 messages for context
      session.messages = session.messages.slice(-5);
      session.turnCount = 5;
    }
    
    session.lastActivity = Date.now();
    return session;
  }

  /**
   * Process a chat request with full compliance validation
   * @param {Object} requestData - Chat request data
   * @param {Object} discordUser - Discord user object
   * @param {Object} discordGuild - Discord guild object
   * @returns {Promise<Object>} - Chat response with compliance info
   */
  async processChat(requestData, discordUser, discordGuild) {
    try {
      // Validate input data
      const { error, value } = this.chatRequestSchema.validate(requestData);
      if (error) {
        throw new Error(`Validation error: ${error.details[0].message}`);
      }

      // Check if OpenAI is available
      if (!this.isOpenAIAvailable()) {
        return {
          success: false,
          error: 'AI service is not available',
          userMessage: '🤖 **AI Service Unavailable**\n\nThe AI assistant is currently not configured. Please contact an administrator.',
        };
      }

      // Validate user and age verification
      const userValidation = await this.validateUserForChat(
        value.userId, 
        value.guildId, 
        value.conversationType
      );
      
      if (!userValidation.success) {
        return userValidation;
      }

      // Get API key configuration
      const apiConfig = await this.chooseApiKey(value.userId, value.guildId);
      
      // Check credit balance if in credit mode
      if (apiConfig.deductCredits) {
        const economy = await Economy.findOne({
          where: { user_id: value.userId, guild_id: value.guildId }
        });
        
        if (!economy || economy.grow_coins_balance < 10) { // Minimum 10 coins required
          return {
            success: false,
            error: 'Insufficient credits',
            userMessage: '💰 **Insufficient Credits**\n\nYou need at least 10 GrowCoins to use the AI assistant. Use `/daily` to earn more!',
          };
        }
      }

      // Get or create conversation context
      const conversation = await this.getOrCreateConversation(
        value.userId,
        value.guildId,
        value.channelId,
        value.conversationType
      );

      // Get user preferences
      const userPreferences = await this.getUserPreferences(value.userId, value.guildId);

      // Check for cannabis content and compliance requirements
      const cannabisDetection = CannabisComplianceHelpers.detectCannabisContent(value.message);
      const requiresAgeVerification = cannabisDetection || 
        this.cannabisConversationTypes.includes(value.conversationType);

      if (requiresAgeVerification && !userValidation.user.is_21_plus) {
        return {
          success: false,
          error: 'Age verification required for cannabis content',
          userMessage: '🔞 **Age Verification Required**\n\nCannabis-related content requires 21+ age verification. Please verify your age with a moderator.',
          requiresAgeVerification: true,
        };
      }

      // Get session memory
      const session = this.getOrCreateSession(value.userId, value.channelId);

      // Store user message
      const userMessage = await LLMMessage.createUserMessage({
        conversation_id: conversation.id,
        user_id: value.userId,
        content: value.message,
        cannabis_content_detected: cannabisDetection,
        conversation_type: value.conversationType,
        has_attachments: value.imageAttachments && value.imageAttachments.length > 0,
      });

      // Build message content with image support
      const messageContent = value.imageAttachments && value.imageAttachments.length > 0
        ? this.buildContentParts(value.message, value.imageAttachments)
        : value.message;

      // Add to session memory
      session.messages.push({
        role: 'user',
        content: messageContent,
      });
      session.turnCount++;

      // Get conversation context for AI
      const contextMessages = await this.buildConversationContext(
        conversation.id,
        value.conversationType,
        userPreferences,
        session
      );

      // Generate AI response
      let aiResponse;
      if (value.useResponsesAPI && this.vectorStoreConfig.enabled) {
        aiResponse = await this.generateResponsesAPIResponse(
          contextMessages,
          messageContent,
          value.conversationType,
          userPreferences,
          userValidation.user,
          conversation,
          apiConfig
        );
      } else {
        aiResponse = await this.generateAIResponse(
          contextMessages,
          value.message,
          value.conversationType,
          userPreferences,
          userValidation.user,
          conversation,
          apiConfig
        );
      }

      if (!aiResponse.success) {
        return aiResponse;
      }

      // Filter response for cannabis compliance
      const filteredResponse = CannabisComplianceHelpers.filterCannabisResponse(
        aiResponse.response,
        value.conversationType
      );

      // Add assistant response to session memory
      session.messages.push({
        role: 'assistant',
        content: filteredResponse.response,
      });

      // Calculate cost and deduct credits if needed
      let creditsDeducted = 0;
      if (apiConfig.deductCredits && aiResponse.tokensUsed) {
        const cost = this.calculateCost(
          {
            prompt_tokens: aiResponse.promptTokens || 0,
            completion_tokens: aiResponse.completionTokens || 0,
          },
          aiResponse.model
        );
        
        // Deduct credits (1 cent = 1 GrowCoin)
        const economy = await Economy.findOne({
          where: { user_id: value.userId, guild_id: value.guildId }
        });
        
        if (economy) {
          creditsDeducted = Math.min(cost, economy.grow_coins_balance);
          await economy.update({
            grow_coins_balance: economy.grow_coins_balance - creditsDeducted,
            total_grow_coins_spent: economy.total_grow_coins_spent + creditsDeducted,
          });
        }
      }

      // Store AI response
      const assistantMessage = await LLMMessage.createAssistantMessage({
        conversation_id: conversation.id,
        user_id: value.userId,
        content: filteredResponse.response,
        original_response: aiResponse.response,
        tokens_used: aiResponse.tokensUsed || 0,
        model_used: aiResponse.model || this.defaultOpenAISettings.model,
        cannabis_content_detected: CannabisComplianceHelpers.detectCannabisContent(filteredResponse.response),
        compliance_filtered: filteredResponse.complianceFiltered,
        compliance_issues: filteredResponse.complianceIssues,
        conversation_type: value.conversationType,
        api_mode: apiConfig.mode,
        credits_used: creditsDeducted,
      });

      // Update conversation statistics
      await conversation.updateStats(
        1, // message count
        aiResponse.tokensUsed || 0,
        requiresAgeVerification
      );

      // Create audit log for AI interaction
      await this.createAuditLog(
        value.userId,
        value.guildId,
        'ai_chat_interaction',
        {
          conversation_id: conversation.id,
          conversation_type: value.conversationType,
          cannabis_content: cannabisDetection,
          age_verification_required: requiresAgeVerification,
          tokens_used: aiResponse.tokensUsed,
          compliance_filtered: filteredResponse.complianceFiltered,
          api_mode: apiConfig.mode,
          credits_deducted: creditsDeducted,
          has_images: value.imageAttachments && value.imageAttachments.length > 0,
          used_vector_store: value.useResponsesAPI && this.vectorStoreConfig.enabled,
        }
      );

      // Format response for Discord
      const formattedResponse = ResponseHelpers.formatForDiscord(
        filteredResponse.response,
        {
          maxLength: userPreferences.max_response_length || 2000,
          addFooter: userPreferences.include_disclaimers !== false,
        }
      );

      // Split if too long
      const responseParts = ResponseHelpers.splitLongResponse(formattedResponse);

      return {
        success: true,
        response: responseParts[0],
        additionalParts: responseParts.slice(1),
        conversation: {
          id: conversation.id,
          messageCount: conversation.total_messages + 1,
          tokensUsed: conversation.total_tokens_used + (aiResponse.tokensUsed || 0),
        },
        compliance: {
          cannabisContent: cannabisDetection,
          ageVerificationRequired: requiresAgeVerification,
          filtered: filteredResponse.complianceFiltered,
          issues: filteredResponse.complianceIssues,
        },
        usage: {
          apiMode: apiConfig.mode,
          creditsDeducted,
          tokensUsed: aiResponse.tokensUsed || 0,
          model: aiResponse.model,
        },
        session: {
          turnCount: session.turnCount,
          maxTurns: this.sessionConfig.maxTurns,
          timeRemaining: Math.max(0, this.sessionConfig.timeoutSeconds - Math.floor((Date.now() - session.lastActivity) / 1000)),
        },
        suggestions: {
          reactions: ResponseHelpers.suggestReactions(filteredResponse.response),
          followUp: this.generateFollowUpSuggestions(value.conversationType, filteredResponse.response),
        },
      };

    } catch (error) {
      console.error('[LLMService] Error processing chat:', error.message);
      
      // Create error audit log
      await this.createAuditLog(
        requestData.userId,
        requestData.guildId,
        'ai_chat_error',
        {
          error_message: error.message,
          conversation_type: requestData.conversationType,
        },
        'high'
      );

      return {
        success: false,
        error: error.message,
        userMessage: '⚠️ **AI Assistant Error**\n\nThere was an error processing your message. Please try again or contact support if the problem persists.',
      };
    }
  }

  /**
   * Validate user for chat operations
   * @param {string} userId - Discord user ID
   * @param {string} guildId - Discord guild ID
   * @param {string} conversationType - Type of conversation
   * @returns {Promise<Object>} - Validation result with user data
   */
  async validateUserForChat(userId, guildId, conversationType) {
    try {
      // Get or create user record
      const user = await User.findOne({
        where: { discord_id: userId, guild_id: guildId }
      });

      if (!user) {
        return {
          success: false,
          error: 'User not found in guild',
          userMessage: '❌ **User Not Found**\n\nYou need to be registered in this server to use the AI assistant.',
        };
      }

      // Check if user has completed basic verification
      if (user.verification_status === 'pending') {
        return {
          success: false,
          error: 'User verification pending',
          userMessage: '⏳ **Verification Required**\n\nPlease complete the server verification process before using the AI assistant.',
        };
      }

      // Check for cannabis conversation requirements
      if (this.cannabisConversationTypes.includes(conversationType)) {
        if (!user.is_21_plus) {
          return {
            success: false,
            error: 'Age verification required for cannabis content',
            userMessage: '🔞 **21+ Verification Required**\n\nCannabis-related features require 21+ age verification.',
            requiresAgeVerification: true,
          };
        }
      }

      return {
        success: true,
        user,
      };

    } catch (error) {
      console.error('[LLMService] Error validating user:', error.message);
      return {
        success: false,
        error: error.message,
        userMessage: '⚠️ **Validation Error**\n\nThere was an error validating your account. Please try again.',
      };
    }
  }

  /**
   * Get or create conversation context
   * @param {string} userId - Discord user ID
   * @param {string} guildId - Discord guild ID
   * @param {string} channelId - Discord channel ID
   * @param {string} conversationType - Type of conversation
   * @returns {Promise<Object>} - Conversation instance
   */
  async getOrCreateConversation(userId, guildId, channelId, conversationType) {
    // Check if we should use assistant mode
    const useAssistant = this.assistantConfig.enabled && this.isOpenAIAvailable();
    
    let conversation = await LLMConversation.getOrCreateConversation({
      user_id: userId,
      guild_id: guildId,
      channel_id: channelId,
      conversation_type: conversationType,
      requires_21_plus: this.cannabisConversationTypes.includes(conversationType),
    });

    // If using assistant mode and no thread exists, create one
    if (useAssistant && !conversation.thread_id) {
      try {
        const thread = await this.createAssistantThread();
        await conversation.update({
          thread_id: thread.id,
          assistant_mode: true,
        });
      } catch (error) {
        console.warn('[LLMService] Failed to create assistant thread, falling back to chat mode:', error.message);
        await conversation.update({
          assistant_mode: false,
        });
      }
    }

    return conversation;
  }

  /**
   * Get user preferences for AI interactions
   * @param {string} userId - Discord user ID
   * @param {string} guildId - Discord guild ID
   * @returns {Promise<Object>} - User preferences
   */
  async getUserPreferences(userId, guildId) {
    const preferences = await LLMUserPreferences.getOrCreatePreferences(userId, guildId);
    return preferences.getAIPreferences();
  }

  /**
   * Build conversation context for AI
   * @param {string} conversationId - Conversation ID
   * @param {string} conversationType - Type of conversation
   * @param {Object} userPreferences - User preferences
   * @param {Object} session - Session memory
   * @returns {Promise<Array>} - Context messages for OpenAI
   */
  async buildConversationContext(conversationId, conversationType, userPreferences, session = null) {
    // Get recent messages from conversation
    const messages = await LLMMessage.getConversationMessages(
      conversationId,
      20 // Get last 20 messages
    );

    // Build system prompt
    const systemPrompt = this.buildSystemPrompt(conversationType, userPreferences);
    
    // Add relevant cannabis knowledge if needed
    let knowledgeContext = '';
    if (this.cannabisConversationTypes.includes(conversationType)) {
      knowledgeContext = await this.getRelevantCannabisKnowledge(conversationType);
    }

    // Create context messages
    const contextMessages = [
      {
        role: 'system',
        content: systemPrompt + (knowledgeContext ? `\n\nRelevant Knowledge:\n${knowledgeContext}` : ''),
      }
    ];

    // Add session memory if available
    if (session && session.messages.length > 0) {
      // Use session messages for immediate context
      contextMessages.push(...session.messages.slice(-5)); // Last 5 messages from session
    } else {
      // Add conversation history
      const conversationHistory = OpenAIHelpers.formatMessagesForAPI(messages, 15);
      contextMessages.push(...conversationHistory);
    }
    
    // Optimize context for token limits
    const optimizedContext = ContextHelpers.optimizeContext(
      contextMessages,
      this.tokenLimits.maxContextTokens
    );

    return optimizedContext;
  }

  /**
   * Build system prompt for AI
   * @param {string} conversationType - Type of conversation
   * @param {Object} userPreferences - User preferences
   * @returns {string} - System prompt
   */
  buildSystemPrompt(conversationType, userPreferences) {
    let basePrompt;
    
    // Use High-Yield Homie prompt for cannabis conversations
    if (this.cannabisConversationTypes.includes(conversationType) && this.highYieldHomiePrompt) {
      basePrompt = this.highYieldHomiePrompt;
    } else {
      basePrompt = CannabisComplianceHelpers.generateComplianceSystemPrompt(
        conversationType,
        this.cannabisConversationTypes.includes(conversationType)
      );
    }

    // Customize based on user preferences
    if (userPreferences.response_style) {
      switch (userPreferences.response_style) {
        case 'educational':
          basePrompt += '\n\nFocus on educational content with detailed explanations and learning opportunities.';
          break;
        case 'conversational':
          basePrompt += '\n\nUse a friendly, conversational tone while maintaining accuracy.';
          break;
        case 'technical':
          basePrompt += '\n\nProvide technical, detailed responses with scientific accuracy.';
          break;
      }
    }

    if (userPreferences.content_filtering === 'strict') {
      basePrompt += '\n\nUse strict content filtering and include comprehensive disclaimers.';
    }

    return basePrompt;
  }

  /**
   * Get relevant cannabis knowledge for context
   * @param {string} conversationType - Type of conversation
   * @returns {Promise<string>} - Relevant knowledge context
   */
  async getRelevantCannabisKnowledge(conversationType) {
    try {
      let category = null;
      
      switch (conversationType) {
        case 'strain_advice':
          category = 'strains';
          break;
        case 'grow_tips':
        case 'cultivation_advice':
          category = 'cultivation';
          break;
        case 'legal_info':
          category = 'legal';
          break;
        default:
          category = 'general';
      }

      const knowledgeEntries = await CannabisKnowledgeBase.searchKnowledge('', category, 5);
      
      return knowledgeEntries.map(entry => 
        `${entry.title}: ${entry.content.substring(0, 200)}...`
      ).join('\n\n');

    } catch (error) {
      console.error('[LLMService] Error getting cannabis knowledge:', error.message);
      return '';
    }
  }

  /**
   * Create OpenAI Assistant thread
   * @returns {Promise<Object>} - Thread object
   */
  async createAssistantThread() {
    try {
      if (!this.isOpenAIAvailable()) {
        throw new Error('OpenAI service not available');
      }

      const thread = await this.openai.beta.threads.create();
      console.log('[LLMService] Created assistant thread:', thread.id);
      return thread;

    } catch (error) {
      console.error('[LLMService] Error creating assistant thread:', error.message);
      throw error;
    }
  }

  /**
   * Generate AI response using Responses API with vector store
   * @param {Array} contextMessages - Context messages
   * @param {string|Array} userMessage - User's message or content parts
   * @param {string} conversationType - Type of conversation
   * @param {Object} userPreferences - User preferences
   * @param {Object} user - User model instance
   * @param {Object} conversation - Conversation instance
   * @param {Object} apiConfig - API configuration
   * @returns {Promise<Object>} - AI response result
   */
  async generateResponsesAPIResponse(contextMessages, userMessage, conversationType, userPreferences, user, conversation, apiConfig) {
    try {
      if (!this.isOpenAIAvailable()) {
        throw new Error('OpenAI service not available');
      }

      // Create client with specific API key
      const openai = new OpenAI({
        apiKey: apiConfig.apiKey,
      });

      // Prepare messages for the API
      const messages = [
        ...contextMessages,
        { 
          role: 'user', 
          content: userMessage 
        }
      ];

      // Configure OpenAI settings based on conversation type
      const openAISettings = this.getOpenAISettings(conversationType, userPreferences);

      // Create response with vector store
      const response = await openai.beta.chat.completions.create({
        ...openAISettings,
        messages,
        store: this.vectorStoreConfig.vectorStoreId,
        metadata: {
          user_id: user.discord_id,
          conversation_type: conversationType,
          cannabis_content: this.cannabisConversationTypes.includes(conversationType),
        },
      });

      const responseContent = response.choices[0]?.message?.content;
      if (!responseContent) {
        throw new Error('No response from OpenAI Responses API');
      }

      return {
        success: true,
        response: responseContent.trim(),
        tokensUsed: response.usage?.total_tokens || 0,
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        model: response.model,
        finishReason: response.choices[0]?.finish_reason,
        assistantMode: false,
        responsesAPI: true,
        vectorStoreUsed: true,
      };

    } catch (error) {
      console.error('[LLMService] Responses API error:', error.message);
      
      // Fallback to regular chat API
      console.log('[LLMService] Falling back to chat completions API');
      return await this.generateChatResponse(
        contextMessages,
        typeof userMessage === 'string' ? userMessage : userMessage[0]?.text || '',
        conversationType,
        userPreferences,
        apiConfig
      );
    }
  }

  /**
   * Generate AI response using Assistant or Chat API
   * @param {Array} contextMessages - Context messages
   * @param {string} userMessage - User's message
   * @param {string} conversationType - Type of conversation
   * @param {Object} userPreferences - User preferences
   * @param {Object} user - User model instance
   * @param {Object} conversation - Conversation instance
   * @param {Object} apiConfig - API configuration
   * @returns {Promise<Object>} - AI response result
   */
  async generateAIResponse(contextMessages, userMessage, conversationType, userPreferences, user, conversation = null, apiConfig = null) {
    try {
      if (!this.isOpenAIAvailable()) {
        throw new Error('OpenAI service not available');
      }

      // Use provided API config or default
      const config = apiConfig || {
        apiKey: process.env.OPENAI_API_KEY,
        mode: 'default',
        deductCredits: false,
      };

      // Check if we should use assistant mode
      const useAssistant = this.assistantConfig.enabled &&
                          conversation &&
                          conversation.assistant_mode &&
                          conversation.thread_id;

      if (useAssistant) {
        return await this.generateAssistantResponse(
          conversation.thread_id,
          userMessage,
          conversationType,
          userPreferences,
          config
        );
      } else {
        return await this.generateChatResponse(
          contextMessages,
          userMessage,
          conversationType,
          userPreferences,
          config
        );
      }

    } catch (error) {
      console.error('[LLMService] AI response generation error:', error.message);
      
      // Fallback to chat mode if assistant fails
      if (this.assistantConfig.fallbackToChat && conversation?.assistant_mode) {
        console.log('[LLMService] Falling back to chat completions API');
        try {
          return await this.generateChatResponse(
            contextMessages,
            userMessage,
            conversationType,
            userPreferences,
            apiConfig
          );
        } catch (fallbackError) {
          console.error('[LLMService] Fallback also failed:', fallbackError.message);
          return OpenAIHelpers.handleOpenAIError(fallbackError);
        }
      }
      
      return OpenAIHelpers.handleOpenAIError(error);
    }
  }

  /**
   * Generate response using OpenAI Assistant API
   * @param {string} threadId - OpenAI thread ID
   * @param {string} userMessage - User's message
   * @param {string} conversationType - Type of conversation
   * @param {Object} userPreferences - User preferences
   * @param {Object} apiConfig - API configuration
   * @returns {Promise<Object>} - AI response result
   */
  async generateAssistantResponse(threadId, userMessage, conversationType, userPreferences, apiConfig) {
    try {
      // Create client with specific API key
      const openai = new OpenAI({
        apiKey: apiConfig.apiKey,
      });

      // Add user message to thread
      await openai.beta.threads.messages.create(threadId, {
        role: 'user',
        content: userMessage
      });

      // Create and run assistant
      const run = await openai.beta.threads.runs.create(threadId, {
        assistant_id: this.assistantConfig.assistantId,
        model: this.assistantConfig.model,
        // Add instructions based on conversation type and preferences
        additional_instructions: this.buildAssistantInstructions(conversationType, userPreferences)
      });

      // Poll for completion
      const completedRun = await this.waitForRunCompletion(openai, threadId, run.id);

      if (completedRun.status !== 'completed') {
        throw new Error(`Assistant run failed with status: ${completedRun.status}`);
      }

      // Get the assistant's response
      const messages = await openai.beta.threads.messages.list(threadId, {
        order: 'desc',
        limit: 1
      });

      const assistantMessage = messages.data[0];
      if (!assistantMessage || assistantMessage.role !== 'assistant') {
        throw new Error('No assistant response found');
      }

      const responseContent = assistantMessage.content[0]?.text?.value || '';

      return {
        success: true,
        response: responseContent.trim(),
        tokensUsed: completedRun.usage?.total_tokens || 0,
        promptTokens: completedRun.usage?.prompt_tokens || 0,
        completionTokens: completedRun.usage?.completion_tokens || 0,
        model: this.assistantConfig.model,
        finishReason: 'completed',
        assistantMode: true,
        threadId: threadId,
        runId: completedRun.id
      };

    } catch (error) {
      console.error('[LLMService] Assistant API error:', error.message);
      throw error;
    }
  }

  /**
   * Generate response using OpenAI Chat Completions API
   * @param {Array} contextMessages - Context messages
   * @param {string} userMessage - User's message
   * @param {string} conversationType - Type of conversation
   * @param {Object} userPreferences - User preferences
   * @param {Object} apiConfig - API configuration
   * @returns {Promise<Object>} - AI response result
   */
  async generateChatResponse(contextMessages, userMessage, conversationType, userPreferences, apiConfig) {
    try {
      // Create client with specific API key
      const openai = new OpenAI({
        apiKey: apiConfig.apiKey,
      });

      // Add user message to context
      const messages = [
        ...contextMessages,
        { role: 'user', content: userMessage }
      ];

      // Configure OpenAI settings based on conversation type
      const openAISettings = this.getOpenAISettings(conversationType, userPreferences);

      const completion = await openai.chat.completions.create({
        ...openAISettings,
        messages,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      return {
        success: true,
        response: response.trim(),
        tokensUsed: completion.usage?.total_tokens || 0,
        promptTokens: completion.usage?.prompt_tokens || 0,
        completionTokens: completion.usage?.completion_tokens || 0,
        model: completion.model,
        finishReason: completion.choices[0]?.finish_reason,
        assistantMode: false
      };

    } catch (error) {
      console.error('[LLMService] Chat API error:', error.message);
      throw error;
    }
  }

  /**
   * Wait for assistant run to complete
   * @param {Object} openai - OpenAI client instance
   * @param {string} threadId - Thread ID
   * @param {string} runId - Run ID
   * @param {number} maxWaitTime - Maximum wait time in milliseconds
   * @returns {Promise<Object>} - Completed run object
   */
  async waitForRunCompletion(openai, threadId, runId, maxWaitTime = 30000) {
    const startTime = Date.now();
    const pollInterval = 1000; // Poll every second

    while (Date.now() - startTime < maxWaitTime) {
      const run = await openai.beta.threads.runs.retrieve(threadId, runId);

      if (run.status === 'completed' || run.status === 'failed' || run.status === 'cancelled') {
        return run;
      }

      if (run.status === 'requires_action') {
        // Handle tool calls if needed (future enhancement)
        console.log('[LLMService] Assistant run requires action - not implemented');
        throw new Error('Assistant run requires action handling');
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error('Assistant run timed out');
  }

  /**
   * Build additional instructions for assistant based on conversation type
   * @param {string} conversationType - Type of conversation
   * @param {Object} userPreferences - User preferences
   * @returns {string} - Additional instructions
   */
  buildAssistantInstructions(conversationType, userPreferences) {
    let instructions = '';

    // Add cannabis compliance instructions
    if (this.cannabisConversationTypes.includes(conversationType)) {
      instructions += 'This is a cannabis-related conversation. Ensure all responses comply with cannabis regulations and include appropriate disclaimers. ';
    }

    // Add response style preferences
    if (userPreferences.response_style) {
      switch (userPreferences.response_style) {
        case 'educational':
          instructions += 'Focus on educational content with detailed explanations. ';
          break;
        case 'conversational':
          instructions += 'Use a friendly, conversational tone. ';
          break;
        case 'technical':
          instructions += 'Provide technical, detailed responses. ';
          break;
      }
    }

    // Add content filtering preferences
    if (userPreferences.content_filtering === 'strict') {
      instructions += 'Use strict content filtering and include comprehensive disclaimers. ';
    }

    return instructions.trim();
  }

  /**
   * Get OpenAI settings for conversation type
   * @param {string} conversationType - Type of conversation
   * @param {Object} userPreferences - User preferences
   * @returns {Object} - OpenAI API settings
   */
  getOpenAISettings(conversationType, userPreferences) {
    const settings = { ...this.defaultOpenAISettings };

    // Adjust temperature based on conversation type
    switch (conversationType) {
      case 'legal_info':
        settings.temperature = 0.3; // More precise for legal information
        break;
      case 'strain_advice':
      case 'cannabis_education':
        settings.temperature = 0.5; // Balanced for educational content
        break;
      case 'grow_tips':
      case 'cultivation_advice':
        settings.temperature = 0.6; // Slightly more creative for practical advice
        break;
      default:
        settings.temperature = 0.7; // Default conversational
    }

    // Adjust max tokens based on user preferences
    if (userPreferences.max_response_length) {
      settings.max_tokens = Math.min(
        Math.floor(userPreferences.max_response_length / 4), // Rough token estimation
        this.tokenLimits.maxResponseTokens
      );
    }

    return settings;
  }

  /**
   * Generate follow-up suggestions
   * @param {string} conversationType - Type of conversation
   * @param {string} response - AI response
   * @returns {Array} - Follow-up suggestions
   */
  generateFollowUpSuggestions(conversationType, response) {
    const suggestions = [];

    switch (conversationType) {
      case 'strain_advice':
        suggestions.push('Ask about growing this strain', 'Get cultivation tips', 'Learn about similar strains');
        break;
      case 'grow_tips':
        suggestions.push('Ask about nutrients', 'Get harvest advice', 'Learn about pest control');
        break;
      case 'legal_info':
        suggestions.push('Ask about cultivation limits', 'Learn about dispensary laws', 'Get compliance help');
        break;
      default:
        if (CannabisComplianceHelpers.detectCannabisContent(response)) {
          suggestions.push('Get more cannabis info', 'Ask follow-up questions', 'Learn about safety');
        } else {
          suggestions.push('Ask follow-up questions', 'Get more information', 'Change topic');
        }
    }

    return suggestions.slice(0, 3); // Limit to 3 suggestions
  }

  /**
   * Create audit log for LLM interactions
   * @param {string} userId - User ID
   * @param {string} guildId - Guild ID
   * @param {string} actionType - Type of action
   * @param {Object} details - Action details
   * @param {string} severity - Log severity
   * @returns {Promise<void>}
   */
  async createAuditLog(userId, guildId, actionType, details, severity = 'low') {
    try {
      await AuditLog.create({
        action_type: actionType,
        actor_user_id: userId,
        target_user_id: userId,
        guild_id: guildId,
        details,
        severity,
        success: true,
        compliance_flag: details.cannabis_content || details.age_verification_required || false,
      });
    } catch (error) {
      console.error('[LLMService] Error creating audit log:', error.message);
    }
  }

  /**
   * Clear conversation context
   * @param {string} userId - User ID
   * @param {string} guildId - Guild ID
   * @param {string} channelId - Channel ID
   * @returns {Promise<Object>} - Operation result
   */
  async clearConversation(userId, guildId, channelId) {
    try {
      const conversation = await LLMConversation.findOne({
        where: { user_id: userId, guild_id: guildId, channel_id: channelId }
      });

      if (!conversation) {
        return {
          success: false,
          error: 'No conversation found',
          userMessage: '📭 **No Conversation Found**\n\nThere is no active conversation to clear.',
        };
      }

      // Clear session memory
      const sessionKey = `${userId}-${channelId}`;
      this.sessionMemory.delete(sessionKey);

      // Archive the conversation instead of deleting
      await conversation.update({ 
        archived: true,
        archived_at: new Date(),
      });

      // Create audit log
      await this.createAuditLog(
        userId,
        guildId,
        'ai_conversation_cleared',
        {
          conversation_id: conversation.id,
          messages_count: conversation.total_messages,
          tokens_used: conversation.total_tokens_used,
        }
      );

      return {
        success: true,
        message: 'Conversation context cleared successfully',
        userMessage: '🗑️ **Conversation Cleared**\n\nYour conversation context has been cleared. The next message will start a fresh conversation.',
      };

    } catch (error) {
      console.error('[LLMService] Error clearing conversation:', error.message);
      return {
        success: false,
        error: error.message,
        userMessage: '⚠️ **Error Clearing Conversation**\n\nThere was an error clearing your conversation. Please try again.',
      };
    }
  }

  /**
   * Update user AI preferences
   * @param {string} userId - User ID
   * @param {string} guildId - Guild ID
   * @param {Object} preferences - New preferences
   * @returns {Promise<Object>} - Update result
   */
  async updateUserPreferences(userId, guildId, preferences) {
    try {
      const { error, value } = this.preferencesSchema.validate(preferences);
      if (error) {
        throw new Error(`Validation error: ${error.details[0].message}`);
      }

      const userPrefs = await LLMUserPreferences.getOrCreatePreferences(userId, guildId);
      
      // Update preferences
      await userPrefs.updateCannabisSettings(value);

      // Handle API key updates
      if (value.use_own_api_key !== undefined || value.openai_api_key !== undefined) {
        await userPrefs.update({
          use_own_api_key: value.use_own_api_key,
          openai_api_key: value.openai_api_key,
        });
      }

      // Create audit log
      await this.createAuditLog(
        userId,
        guildId,
        'ai_preferences_updated',
        {
          updated_preferences: value,
        }
      );

      return {
        success: true,
        preferences: userPrefs.getAIPreferences(),
        message: 'AI preferences updated successfully',
      };

    } catch (error) {
      console.error('[LLMService] Error updating preferences:', error.message);
      return {
        success: false,
        error: error.message,
        userMessage: '⚠️ **Error Updating Preferences**\n\nThere was an error updating your AI preferences. Please try again.',
      };
    }
  }

  /**
   * Get conversation statistics
   * @param {string} userId - User ID
   * @param {string} guildId - Guild ID
   * @returns {Promise<Object>} - Conversation statistics
   */
  async getConversationStats(userId, guildId) {
    try {
      const stats = await LLMConversation.getUserStats(userId, guildId);
      const preferences = await this.getUserPreferences(userId, guildId);

      // Get economy info
      const economy = await Economy.findOne({
        where: { user_id: userId, guild_id: guildId }
      });

      return {
        success: true,
        stats,
        preferences,
        credits: {
          balance: economy ? economy.grow_coins_balance : 0,
          premiumSeeds: economy ? economy.premium_seeds_balance : 0,
        },
        aiAvailable: this.isOpenAIAvailable(),
      };

    } catch (error) {
      console.error('[LLMService] Error getting conversation stats:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = LLMService;