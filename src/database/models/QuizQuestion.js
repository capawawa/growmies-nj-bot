/**
 * QuizQuestion Model for GrowmiesNJ Discord Bot
 * 
 * Cannabis Knowledge Quiz System - Educational content with compliance tracking
 * Stores cannabis education questions with multiple difficulty levels and categories
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../connection');

/**
 * QuizQuestion model for cannabis education system
 * Supports multiple categories and difficulty levels with XP rewards
 */
class QuizQuestion extends Model {
  /**
   * Get random questions by difficulty and category
   * @param {string} difficulty - Question difficulty (beginner/intermediate/advanced)
   * @param {string} category - Question category (optional)
   * @param {number} limit - Number of questions to return
   * @returns {Promise<QuizQuestion[]>} - Random questions
   */
  static async getRandomQuestions(difficulty = 'beginner', category = null, limit = 1) {
    const { Op } = require('@sequelize/core');
    const where = {
      difficulty: difficulty,
      is_active: true,
      requires_21_plus: false // Default to general access questions
    };

    if (category) {
      where.category = category;
    }

    return await this.findAll({
      where,
      order: sequelize.random(),
      limit
    });
  }

  /**
   * Get cannabis-specific questions (21+ required)
   * @param {string} difficulty - Question difficulty
   * @param {string} category - Question category (optional)
   * @param {number} limit - Number of questions to return
   * @returns {Promise<QuizQuestion[]>} - Random cannabis questions
   */
  static async getCannabisQuestions(difficulty = 'beginner', category = null, limit = 1) {
    const where = {
      difficulty: difficulty,
      is_active: true,
      requires_21_plus: true // Cannabis-specific content
    };

    if (category) {
      where.category = category;
    }

    return await this.findAll({
      where,
      order: sequelize.random(),
      limit
    });
  }

  /**
   * Get questions by category
   * @param {string} category - Question category
   * @param {boolean} requiresAge - Whether to include 21+ questions
   * @returns {Promise<QuizQuestion[]>} - Category questions
   */
  static async getQuestionsByCategory(category, requiresAge = false) {
    const where = {
      category: category,
      is_active: true
    };

    if (!requiresAge) {
      where.requires_21_plus = false;
    }

    return await this.findAll({
      where,
      order: [['difficulty', 'ASC'], ['created_at', 'DESC']]
    });
  }

  /**
   * Get quiz statistics for admin dashboard
   * @param {string} guildId - Discord guild ID (optional)
   * @returns {Promise<Object>} - Quiz statistics
   */
  static async getQuizStats(guildId = null) {
    const { fn, col } = require('@sequelize/core');
    
    const stats = await this.findAll({
      attributes: [
        'category',
        'difficulty',
        [fn('COUNT', '*'), 'question_count'],
        [fn('AVG', col('xp_reward')), 'avg_xp_reward']
      ],
      where: { is_active: true },
      group: ['category', 'difficulty'],
      raw: true
    });

    return stats.reduce((acc, stat) => {
      if (!acc[stat.category]) {
        acc[stat.category] = {};
      }
      acc[stat.category][stat.difficulty] = {
        count: parseInt(stat.question_count),
        avg_xp: Math.round(parseFloat(stat.avg_xp_reward))
      };
      return acc;
    }, {});
  }

  /**
   * Validate answer for this question
   * @param {number} answerIndex - Selected answer index (0-based)
   * @returns {boolean} - Whether answer is correct
   */
  isCorrectAnswer(answerIndex) {
    return answerIndex === this.correct_answer_index;
  }

  /**
   * Get formatted question data for Discord embed
   * @returns {Object} - Formatted question data
   */
  getFormattedQuestion() {
    return {
      id: this.id,
      question: this.question_text,
      answers: this.answer_choices,
      category: this.category,
      difficulty: this.difficulty,
      xp_reward: this.xp_reward,
      requires_age: this.requires_21_plus,
      explanation: this.explanation
    };
  }

  /**
   * Get XP reward based on difficulty
   * @returns {number} - XP reward amount
   */
  getXPReward() {
    return this.xp_reward;
  }
}

/**
 * Initialize QuizQuestion model with database connection
 * @param {Sequelize} sequelize - Database connection instance
 * @returns {QuizQuestion} - Initialized QuizQuestion model
 */
function initQuizQuestionModel(sequelize) {
  QuizQuestion.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: 'Unique question ID'
    },
    question_text: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'The quiz question text'
    },
    answer_choices: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      validate: {
        minChoices(value) {
          if (!Array.isArray(value) || value.length < 2) {
            throw new Error('Must have at least 2 answer choices');
          }
        },
        maxChoices(value) {
          if (Array.isArray(value) && value.length > 6) {
            throw new Error('Maximum 6 answer choices allowed');
          }
        }
      },
      comment: 'Array of possible answers (2-6 choices)'
    },
    correct_answer_index: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 0,
        max: 5,
        isValidIndex(value) {
          if (this.answer_choices && value >= this.answer_choices.length) {
            throw new Error('Correct answer index must be within answer choices range');
          }
        }
      },
      comment: 'Index of correct answer (0-based)'
    },
    category: {
      type: DataTypes.ENUM(
        'strain_knowledge',
        'growing_cultivation', 
        'legal_compliance',
        'consumption_methods',
        'cannabis_science',
        'industry_news',
        'safety_education',
        'general_knowledge'
      ),
      allowNull: false,
      comment: 'Question category for organization'
    },
    difficulty: {
      type: DataTypes.ENUM('beginner', 'intermediate', 'advanced'),
      allowNull: false,
      defaultValue: 'beginner',
      comment: 'Question difficulty level'
    },
    xp_reward: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 10,
      validate: {
        min: 1,
        max: 100
      },
      comment: 'XP reward for correct answer'
    },
    requires_21_plus: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether question requires 21+ age verification'
    },
    explanation: {
      type: DataTypes.TEXT,
      comment: 'Educational explanation after answering'
    },
    source_url: {
      type: DataTypes.STRING,
      validate: {
        isUrl: true
      },
      comment: 'Source URL for fact verification'
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
      comment: 'Tags for advanced filtering and search'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Whether question is active for use'
    },
    usage_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Number of times question has been used'
    },
    correct_percentage: {
      type: DataTypes.FLOAT,
      defaultValue: 0.0,
      validate: {
        min: 0.0,
        max: 100.0
      },
      comment: 'Percentage of correct answers (for difficulty balancing)'
    },
    created_by_user_id: {
      type: DataTypes.STRING,
      comment: 'Discord ID of user who created question'
    },
    approved_by_user_id: {
      type: DataTypes.STRING,
      comment: 'Discord ID of admin who approved question'
    },
    approval_status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      allowNull: false,
      defaultValue: 'approved',
      comment: 'Question approval status'
    },
    compliance_notes: {
      type: DataTypes.TEXT,
      comment: 'Cannabis compliance and legal notes'
    }
  }, {
    sequelize,
    modelName: 'QuizQuestion',
    tableName: 'quiz_questions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    
    indexes: [
      {
        name: 'idx_quiz_category',
        fields: ['category']
      },
      {
        name: 'idx_quiz_difficulty',
        fields: ['difficulty']
      },
      {
        name: 'idx_quiz_active',
        fields: ['is_active']
      },
      {
        name: 'idx_quiz_age_requirement',
        fields: ['requires_21_plus']
      },
      {
        name: 'idx_quiz_category_difficulty',
        fields: ['category', 'difficulty', 'is_active']
      },
      {
        name: 'idx_quiz_approval',
        fields: ['approval_status']
      },
      {
        name: 'idx_quiz_usage_stats',
        fields: ['usage_count', 'correct_percentage']
      },
      {
        name: 'idx_quiz_random_selection',
        fields: ['category', 'difficulty', 'requires_21_plus', 'is_active']
      }
    ],

    // Model validation rules
    validate: {
      // Ensure cannabis questions are properly flagged
      cannabisContentValidation() {
        const cannabisCategories = ['strain_knowledge', 'consumption_methods', 'cannabis_science'];
        if (cannabisCategories.includes(this.category) && !this.requires_21_plus) {
          console.warn(`Cannabis category question ${this.id} should require 21+ verification`);
        }
      },

      // Validate XP reward based on difficulty
      xpRewardValidation() {
        const minXP = { beginner: 5, intermediate: 10, advanced: 20 };
        const maxXP = { beginner: 15, intermediate: 25, advanced: 50 };
        
        if (this.xp_reward < minXP[this.difficulty] || this.xp_reward > maxXP[this.difficulty]) {
          throw new Error(`XP reward must be between ${minXP[this.difficulty]}-${maxXP[this.difficulty]} for ${this.difficulty} difficulty`);
        }
      }
    },

    // Model hooks for business logic
    hooks: {
      beforeCreate: async (question) => {
        // Set default XP based on difficulty if not specified
        if (!question.xp_reward || question.xp_reward === 10) {
          const defaultXP = { beginner: 10, intermediate: 20, advanced: 35 };
          question.xp_reward = defaultXP[question.difficulty];
        }

        // Auto-flag cannabis content for age verification
        const cannabisCategories = ['strain_knowledge', 'consumption_methods', 'cannabis_science'];
        if (cannabisCategories.includes(question.category)) {
          question.requires_21_plus = true;
        }
      },

      beforeUpdate: async (question) => {
        // Prevent modification of usage statistics manually
        if (question.changed('usage_count') || question.changed('correct_percentage')) {
          if (!question._allowStatUpdate) {
            throw new Error('Usage statistics can only be updated through quiz system');
          }
        }
      }
    }
  });

  return QuizQuestion;
}

module.exports = { QuizQuestion, initQuizQuestionModel };