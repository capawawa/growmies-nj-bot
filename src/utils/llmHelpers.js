/**
 * LLM Utility Helpers for GrowmiesNJ Discord Bot
 * 
 * LLM Chat Integration: Utility functions for OpenAI API communication,
 * cannabis content filtering, and response processing
 */

/**
 * OpenAI API communication and error handling utilities
 */
class OpenAIHelpers {
  /**
   * Estimate token count for text (rough approximation)
   * @param {string} text - Text to estimate tokens for
   * @returns {number} - Estimated token count
   */
  static estimateTokenCount(text) {
    if (!text || typeof text !== 'string') return 0;
    
    // Rough estimation: ~4 characters per token for English text
    // This is a fallback when tiktoken is not available
    return Math.ceil(text.length / 4);
  }

  /**
   * Truncate text to fit within token limit
   * @param {string} text - Text to truncate
   * @param {number} maxTokens - Maximum token limit
   * @returns {string} - Truncated text
   */
  static truncateToTokenLimit(text, maxTokens = 2000) {
    const estimatedTokens = this.estimateTokenCount(text);
    
    if (estimatedTokens <= maxTokens) {
      return text;
    }
    
    // Truncate to approximately fit token limit
    const maxChars = maxTokens * 4;
    const truncated = text.substring(0, maxChars);
    
    // Try to end at a complete sentence
    const lastPeriod = truncated.lastIndexOf('.');
    const lastExclamation = truncated.lastIndexOf('!');
    const lastQuestion = truncated.lastIndexOf('?');
    
    const lastSentenceEnd = Math.max(lastPeriod, lastExclamation, lastQuestion);
    
    if (lastSentenceEnd > maxChars * 0.8) {
      return truncated.substring(0, lastSentenceEnd + 1);
    }
    
    return truncated + '...';
  }

  /**
   * Format conversation messages for OpenAI API
   * @param {Array} messages - Array of message objects
   * @param {number} contextLimit - Maximum messages to include
   * @returns {Array} - Formatted messages for OpenAI
   */
  static formatMessagesForAPI(messages, contextLimit = 10) {
    return messages
      .slice(-contextLimit) // Keep only recent messages
      .map(msg => ({
        role: msg.role || msg.message_role,
        content: msg.content || msg.message_content,
      }))
      .filter(msg => msg.content && msg.content.trim().length > 0);
  }

  /**
   * Handle OpenAI API errors
   * @param {Error} error - OpenAI API error
   * @returns {Object} - Formatted error response
   */
  static handleOpenAIError(error) {
    console.error('OpenAI API Error:', error);
    
    if (error.code === 'insufficient_quota') {
      return {
        success: false,
        error: 'OpenAI API quota exceeded. Please try again later.',
        userMessage: '🚫 **AI Service Temporarily Unavailable**\n\nThe AI service has reached its usage limit. Please try again later or contact an administrator.',
      };
    }
    
    if (error.code === 'rate_limit_exceeded') {
      return {
        success: false,
        error: 'OpenAI API rate limit exceeded.',
        userMessage: '⏱️ **Rate Limit Exceeded**\n\nPlease wait a moment before sending another message to the AI assistant.',
      };
    }
    
    if (error.code === 'invalid_api_key') {
      return {
        success: false,
        error: 'Invalid OpenAI API key.',
        userMessage: '🔧 **Service Configuration Error**\n\nThe AI service is not properly configured. Please contact an administrator.',
      };
    }
    
    return {
      success: false,
      error: error.message || 'Unknown OpenAI API error',
      userMessage: '⚠️ **AI Service Error**\n\nThere was an error processing your request. Please try again or contact an administrator if the problem persists.',
    };
  }

  /**
   * Calculate total tokens used in conversation
   * @param {Array} messages - Array of message objects
   * @returns {number} - Total estimated tokens
   */
  static calculateConversationTokens(messages) {
    return messages.reduce((total, msg) => {
      const content = msg.content || msg.message_content || '';
      return total + this.estimateTokenCount(content);
    }, 0);
  }
}

/**
 * Cannabis content detection and compliance filtering utilities
 */
class CannabisComplianceHelpers {
  /**
   * Cannabis-related keywords for content detection
   */
  static CANNABIS_KEYWORDS = [
    // Basic terms
    'cannabis', 'marijuana', 'weed', 'pot', 'ganja', 'herb', 'mary jane',
    
    // Cannabis compounds
    'thc', 'cbd', 'cbg', 'cbn', 'cbc', 'delta-8', 'delta-9',
    'tetrahydrocannabinol', 'cannabidiol', 'cannabinoid', 'terpene',
    
    // Strain types and effects
    'indica', 'sativa', 'hybrid', 'strain', 'cultivar',
    
    // Cultivation terms
    'grow', 'growing', 'cultivation', 'harvest', 'cure', 'trim',
    'clone', 'seed', 'germination', 'flowering', 'vegetative',
    'hydroponics', 'soil', 'nutrients', 'lighting', 'tent',
    
    // Consumption methods
    'smoke', 'vape', 'dab', 'edible', 'tincture', 'topical',
    'joint', 'blunt', 'pipe', 'bong', 'vaporizer',
    
    // Cannabis products
    'flower', 'bud', 'concentrate', 'hash', 'rosin', 'shatter',
    'wax', 'live resin', 'distillate', 'oil', 'cartridge',
    
    // Industry terms
    'dispensary', 'budtender', 'grower', 'breeder', 'caregiver',
    'medical marijuana', 'recreational', 'adult use'
  ];

  /**
   * Prohibited commercial terms
   */
  static PROHIBITED_TERMS = [
    'buy', 'sell', 'purchase', 'sale', 'dealer', 'plug',
    'selling', 'buying', 'trade', 'exchange', 'money',
    'price', 'cost', 'payment', 'cash', 'venmo', 'paypal',
    'ship', 'shipping', 'delivery', 'meet up', 'meetup'
  ];

  /**
   * Detect cannabis content in text
   * @param {string} text - Text to analyze
   * @returns {boolean} - True if cannabis content detected
   */
  static detectCannabisContent(text) {
    if (!text || typeof text !== 'string') return false;
    
    const lowerText = text.toLowerCase();
    
    return this.CANNABIS_KEYWORDS.some(keyword => 
      lowerText.includes(keyword.toLowerCase())
    );
  }

  /**
   * Detect prohibited commercial content
   * @param {string} text - Text to analyze
   * @returns {boolean} - True if prohibited content detected
   */
  static detectProhibitedContent(text) {
    if (!text || typeof text !== 'string') return false;
    
    const lowerText = text.toLowerCase();
    
    return this.PROHIBITED_TERMS.some(term => 
      lowerText.includes(term.toLowerCase())
    );
  }

  /**
   * Filter and clean response for cannabis compliance
   * @param {string} response - AI response to filter
   * @param {string} conversationType - Type of conversation
   * @returns {Object} - Filtered response with compliance info
   */
  static filterCannabisResponse(response, conversationType = 'general') {
    let filteredResponse = response;
    let complianceFiltered = false;
    const complianceIssues = [];

    // Check for prohibited commercial content
    if (this.detectProhibitedContent(response)) {
      filteredResponse = this.removeCommercialContent(response);
      complianceFiltered = true;
      complianceIssues.push('commercial_content_removed');
    }

    // Add appropriate disclaimers for cannabis content
    if (this.detectCannabisContent(response)) {
      filteredResponse = this.addCannabisDisclaimers(filteredResponse, conversationType);
      complianceIssues.push('cannabis_disclaimers_added');
    }

    // Remove any potentially harmful advice
    if (this.detectHarmfulContent(response)) {
      filteredResponse = this.sanitizeHarmfulContent(filteredResponse);
      complianceFiltered = true;
      complianceIssues.push('harmful_content_sanitized');
    }

    return {
      response: filteredResponse,
      complianceFiltered,
      complianceIssues,
      originalLength: response.length,
      filteredLength: filteredResponse.length,
    };
  }

  /**
   * Remove commercial content from response
   * @param {string} response - Response to clean
   * @returns {string} - Cleaned response
   */
  static removeCommercialContent(response) {
    let cleaned = response;
    
    // Remove sentences containing prohibited terms
    const sentences = cleaned.split(/[.!?]+/);
    const cleanedSentences = sentences.filter(sentence => {
      const lowerSentence = sentence.toLowerCase();
      return !this.PROHIBITED_TERMS.some(term => 
        lowerSentence.includes(term)
      );
    });
    
    cleaned = cleanedSentences.join('. ').trim();
    
    // Add compliance notice if content was removed
    if (cleanedSentences.length < sentences.length) {
      cleaned += '\n\n🚫 **Compliance Notice:** Commercial cannabis activities are prohibited in this community.';
    }
    
    return cleaned;
  }

  /**
   * Add cannabis-specific disclaimers
   * @param {string} response - Response to add disclaimers to
   * @param {string} conversationType - Type of conversation
   * @returns {string} - Response with disclaimers
   */
  static addCannabisDisclaimers(response, conversationType) {
    const disclaimers = {
      general: '\n\n⚖️ **Legal Disclaimer:** Cannabis information is for educational purposes only. Always follow federal, state, and local laws.',
      
      medical: '\n\n⚕️ **Medical Disclaimer:** This information is not medical advice. Consult healthcare professionals for medical guidance.',
      
      legal: '\n\n⚖️ **Legal Notice:** This is general information only and not legal advice. Consult with legal professionals for specific guidance.',
      
      cultivation: '\n\n🌱 **Cultivation Notice:** Cannabis cultivation laws vary by jurisdiction. Ensure compliance with all applicable laws.',
      
      strain_advice: '\n\n📋 **Information Notice:** Strain effects may vary by individual. Start with small amounts and consume responsibly.',
    };

    const disclaimer = disclaimers[conversationType] || disclaimers.general;
    
    return response + disclaimer;
  }

  /**
   * Detect potentially harmful content
   * @param {string} text - Text to analyze
   * @returns {boolean} - True if harmful content detected
   */
  static detectHarmfulContent(text) {
    const harmfulPatterns = [
      /driving.*under.*influence/i,
      /drive.*while.*high/i,
      /operate.*machinery.*cannabis/i,
      /give.*cannabis.*minor/i,
      /underage.*consumption/i,
      /pregnant.*cannabis/i,
      /breastfeeding.*cannabis/i,
      /alcohol.*cannabis.*mix/i,
    ];

    return harmfulPatterns.some(pattern => pattern.test(text));
  }

  /**
   * Sanitize harmful content
   * @param {string} response - Response to sanitize
   * @returns {string} - Sanitized response
   */
  static sanitizeHarmfulContent(response) {
    let sanitized = response;

    // Replace harmful advice with safety reminders
    const harmfulReplacements = [
      {
        pattern: /driving.*under.*influence.*cannabis/gi,
        replacement: 'Never drive under the influence of cannabis - it is illegal and dangerous'
      },
      {
        pattern: /give.*cannabis.*minor/gi,
        replacement: 'Cannabis should never be provided to minors - it is illegal and harmful'
      },
      {
        pattern: /pregnant.*cannabis/gi,
        replacement: 'Pregnant individuals should consult healthcare providers about cannabis use'
      }
    ];

    harmfulReplacements.forEach(({ pattern, replacement }) => {
      sanitized = sanitized.replace(pattern, replacement);
    });

    return sanitized;
  }

  /**
   * Generate system prompt for cannabis compliance
   * @param {string} conversationType - Type of conversation
   * @param {boolean} requires21Plus - Whether 21+ verification is required
   * @returns {string} - System prompt
   */
  static generateComplianceSystemPrompt(conversationType, requires21Plus = false) {
    const basePrompt = `You are a helpful cannabis education assistant for the GrowmiesNJ Discord community. You provide accurate, educational information about cannabis while maintaining strict legal compliance.

IMPORTANT COMPLIANCE RULES:
- All information is for educational purposes only
- Never provide medical advice - always recommend consulting healthcare professionals
- Never facilitate commercial cannabis transactions
- Focus on New Jersey cannabis laws and regulations
- Always emphasize responsible adult use (21+)
- Include appropriate disclaimers for safety and legal compliance`;

    const typeSpecificPrompts = {
      general: `Provide general cannabis education and information.`,
      
      cannabis_education: `Focus on educational cannabis content including plant biology, history, and general effects. Always include educational disclaimers.`,
      
      strain_advice: `Provide strain information including genetics, typical effects, and growing characteristics. Always remind users that effects vary by individual and to start with small amounts.`,
      
      legal_info: `Provide general information about New Jersey cannabis laws and regulations. Always clarify that this is not legal advice and recommend consulting legal professionals.`,
      
      grow_tips: `Provide cultivation education including growing techniques, equipment, and best practices. Always emphasize legal compliance and following local laws.`,
    };

    let fullPrompt = basePrompt + '\n\n' + (typeSpecificPrompts[conversationType] || typeSpecificPrompts.general);

    if (requires21Plus) {
      fullPrompt += '\n\nThis conversation requires 21+ age verification. The user has been verified as 21 or older.';
    }

    fullPrompt += '\n\nAlways be helpful, educational, and compliant with cannabis laws and community guidelines.';

    return fullPrompt;
  }
}

/**
 * Context management and conversation optimization utilities
 */
class ContextHelpers {
  /**
   * Optimize conversation context for token efficiency
   * @param {Array} messages - Conversation messages
   * @param {number} maxTokens - Maximum tokens for context
   * @returns {Array} - Optimized message context
   */
  static optimizeContext(messages, maxTokens = 3000) {
    if (!messages || messages.length === 0) return [];

    // Always keep system message if present
    const systemMessages = messages.filter(msg => 
      (msg.role || msg.message_role) === 'system'
    );
    
    const conversationMessages = messages.filter(msg => 
      (msg.role || msg.message_role) !== 'system'
    );

    let optimizedMessages = [...systemMessages];
    let currentTokens = OpenAIHelpers.calculateConversationTokens(systemMessages);

    // Add conversation messages from most recent, staying under token limit
    for (let i = conversationMessages.length - 1; i >= 0; i--) {
      const message = conversationMessages[i];
      const messageTokens = OpenAIHelpers.estimateTokenCount(
        message.content || message.message_content
      );

      if (currentTokens + messageTokens <= maxTokens) {
        optimizedMessages.unshift(message);
        currentTokens += messageTokens;
      } else {
        break;
      }
    }

    return optimizedMessages.sort((a, b) => {
      // Keep system messages first
      if ((a.role || a.message_role) === 'system') return -1;
      if ((b.role || b.message_role) === 'system') return 1;
      
      // Sort by creation time for conversation flow
      const aTime = a.created_at || a.timestamp || 0;
      const bTime = b.created_at || b.timestamp || 0;
      return aTime - bTime;
    });
  }

  /**
   * Generate conversation summary for long contexts
   * @param {Array} messages - Messages to summarize
   * @returns {string} - Conversation summary
   */
  static generateConversationSummary(messages) {
    if (!messages || messages.length === 0) return '';

    const conversationMessages = messages.filter(msg => 
      (msg.role || msg.message_role) !== 'system'
    );

    if (conversationMessages.length === 0) return '';

    const topics = [];
    const cannabisTopics = [];

    conversationMessages.forEach(msg => {
      const content = msg.content || msg.message_content || '';
      
      if (CannabisComplianceHelpers.detectCannabisContent(content)) {
        // Extract cannabis-related topics
        if (content.toLowerCase().includes('strain')) {
          cannabisTopics.push('strain information');
        }
        if (content.toLowerCase().includes('grow')) {
          cannabisTopics.push('cultivation advice');
        }
        if (content.toLowerCase().includes('legal') || content.toLowerCase().includes('law')) {
          cannabisTopics.push('legal information');
        }
      } else {
        topics.push('general discussion');
      }
    });

    const uniqueTopics = [...new Set([...topics, ...cannabisTopics])];
    
    return `Previous conversation covered: ${uniqueTopics.join(', ')}. ${conversationMessages.length} messages exchanged.`;
  }

  /**
   * Check if conversation needs cleanup
   * @param {Object} conversation - Conversation object
   * @returns {boolean} - True if cleanup needed
   */
  static needsCleanup(conversation) {
    const maxMessages = 50;
    const maxTokens = 10000;
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    return (
      conversation.total_messages > maxMessages ||
      conversation.total_tokens_used > maxTokens ||
      (Date.now() - new Date(conversation.last_message_at).getTime()) > maxAge
    );
  }
}

/**
 * Response post-processing utilities
 */
class ResponseHelpers {
  /**
   * Format AI response for Discord
   * @param {string} response - AI response
   * @param {Object} options - Formatting options
   * @returns {string} - Formatted response
   */
  static formatForDiscord(response, options = {}) {
    const {
      maxLength = 2000,
      addTimestamp = false,
      addFooter = true,
    } = options;

    let formatted = response;

    // Truncate if too long for Discord
    if (formatted.length > maxLength) {
      formatted = OpenAIHelpers.truncateToTokenLimit(formatted, maxLength / 4);
    }

    // Add timestamp if requested
    if (addTimestamp) {
      const timestamp = new Date().toLocaleTimeString();
      formatted = `*${timestamp}*\n\n${formatted}`;
    }

    // Add AI footer
    if (addFooter) {
      formatted += '\n\n*🤖 Generated by AI assistant*';
    }

    return formatted;
  }

  /**
   * Split long responses for Discord message limits
   * @param {string} response - Response to split
   * @param {number} maxLength - Maximum length per message
   * @returns {Array} - Array of response chunks
   */
  static splitLongResponse(response, maxLength = 2000) {
    if (response.length <= maxLength) {
      return [response];
    }

    const chunks = [];
    let currentChunk = '';
    const sentences = response.split(/(?<=[.!?])\s+/);

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length <= maxLength) {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk);
          currentChunk = sentence;
        } else {
          // Sentence itself is too long, split it
          const words = sentence.split(' ');
          let wordChunk = '';
          
          for (const word of words) {
            if ((wordChunk + word).length <= maxLength) {
              wordChunk += (wordChunk ? ' ' : '') + word;
            } else {
              if (wordChunk) {
                chunks.push(wordChunk);
                wordChunk = word;
              } else {
                // Word itself is too long, truncate it
                chunks.push(word.substring(0, maxLength - 3) + '...');
              }
            }
          }
          
          if (wordChunk) {
            currentChunk = wordChunk;
          }
        }
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  /**
   * Add reaction suggestions based on response content
   * @param {string} response - AI response
   * @returns {Array} - Suggested emoji reactions
   */
  static suggestReactions(response) {
    const reactions = [];

    if (CannabisComplianceHelpers.detectCannabisContent(response)) {
      reactions.push('🌿');
    }

    if (response.toLowerCase().includes('help') || response.toLowerCase().includes('assist')) {
      reactions.push('🤝');
    }

    if (response.toLowerCase().includes('learn') || response.toLowerCase().includes('education')) {
      reactions.push('📚');
    }

    if (response.toLowerCase().includes('legal') || response.toLowerCase().includes('law')) {
      reactions.push('⚖️');
    }

    if (response.toLowerCase().includes('grow') || response.toLowerCase().includes('cultivation')) {
      reactions.push('🌱');
    }

    // Always add thumbs up as an option
    reactions.push('👍');

    return [...new Set(reactions)]; // Remove duplicates
  }
}

module.exports = {
  OpenAIHelpers,
  CannabisComplianceHelpers,
  ContextHelpers,
  ResponseHelpers,
};