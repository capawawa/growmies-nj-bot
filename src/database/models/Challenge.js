/**
 * Challenge Model for GrowmiesNJ Discord Bot
 * 
 * Daily/Weekly Challenge System - Community engagement with progressive rewards
 * Stores challenges with participation tracking and cannabis compliance
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../connection');

/**
 * Challenge model for daily/weekly community engagement system
 * Supports multiple challenge types with participation tracking and rewards
 */
class Challenge extends Model {
  /**
   * Get current active challenge
   * @param {string} type - Challenge type (daily/weekly/special)
   * @param {boolean} requiresAge - Whether to include 21+ challenges
   * @returns {Promise<Challenge|null>} - Current active challenge
   */
  static async getCurrentChallenge(type = 'daily', requiresAge = false) {
    const now = new Date();
    const where = {
      challenge_type: type,
      is_active: true,
      start_date: { [require('@sequelize/core').Op.lte]: now },
      end_date: { [require('@sequelize/core').Op.gte]: now }
    };

    if (!requiresAge) {
      where.requires_21_plus = false;
    }

    return await this.findOne({
      where,
      order: [['start_date', 'DESC']]
    });
  }

  /**
   * Get upcoming challenges for scheduling
   * @param {number} days - Number of days to look ahead
   * @param {string} type - Challenge type filter
   * @returns {Promise<Challenge[]>} - Upcoming challenges
   */
  static async getUpcomingChallenges(days = 7, type = null) {
    const { Op } = require('@sequelize/core');
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + days);

    const where = {
      is_active: true,
      start_date: {
        [Op.between]: [now, futureDate]
      }
    };

    if (type) {
      where.challenge_type = type;
    }

    return await this.findAll({
      where,
      order: [['start_date', 'ASC']]
    });
  }

  /**
   * Get challenge leaderboard
   * @param {string} challengeId - Challenge ID
   * @param {number} limit - Number of top participants
   * @returns {Promise<Object[]>} - Leaderboard data
   */
  static async getLeaderboard(challengeId, limit = 10) {
    const { QueryTypes } = require('@sequelize/core');
    
    const leaderboard = await sequelize.query(`
      SELECT 
        cp.user_id,
        cp.progress_value,
        cp.completion_percentage,
        cp.completed_at,
        u.display_name,
        u.current_level,
        u.level_tier
      FROM challenge_participations cp
      JOIN users u ON cp.user_id = u.user_id
      WHERE cp.challenge_id = :challengeId
        AND cp.is_active = true
      ORDER BY cp.progress_value DESC, cp.completed_at ASC
      LIMIT :limit
    `, {
      replacements: { challengeId, limit },
      type: QueryTypes.SELECT
    });

    return leaderboard;
  }

  /**
   * Check if user can participate in challenge
   * @param {string} userId - Discord user ID
   * @param {boolean} userIsVerified - User age verification status
   * @returns {boolean} - Whether user can participate
   */
  canUserParticipate(userId, userIsVerified = false) {
    if (this.requires_21_plus && !userIsVerified) {
      return false;
    }

    if (!this.is_active) {
      return false;
    }

    const now = new Date();
    return now >= this.start_date && now <= this.end_date;
  }

  /**
   * Get formatted challenge data for Discord embed
   * @returns {Object} - Formatted challenge data
   */
  getFormattedChallenge() {
    const timeRemaining = this.end_date - new Date();
    const hoursRemaining = Math.ceil(timeRemaining / (1000 * 60 * 60));

    return {
      id: this.id,
      title: this.title,
      description: this.description,
      type: this.challenge_type,
      target: this.target_value,
      unit: this.target_unit,
      xp_reward: this.xp_reward,
      bonus_reward: this.bonus_reward,
      requires_age: this.requires_21_plus,
      time_remaining: hoursRemaining,
      difficulty: this.difficulty,
      category: this.category,
      participation_count: this.participation_count || 0
    };
  }

  /**
   * Calculate XP reward based on completion percentage
   * @param {number} completionPercentage - User's completion percentage
   * @returns {number} - XP reward amount
   */
  calculateXPReward(completionPercentage) {
    if (completionPercentage < 50) {
      return Math.floor(this.xp_reward * 0.25); // 25% for partial completion
    } else if (completionPercentage < 100) {
      return Math.floor(this.xp_reward * 0.75); // 75% for good progress
    } else {
      return this.xp_reward + (this.bonus_reward || 0); // Full reward + bonus
    }
  }

  /**
   * Check if challenge has expired
   * @returns {boolean} - Whether challenge is expired
   */
  isExpired() {
    return new Date() > this.end_date;
  }

  /**
   * Get challenge progress summary
   * @returns {Promise<Object>} - Challenge statistics
   */
  async getProgressSummary() {
    const { fn, col } = require('@sequelize/core');
    
    const stats = await sequelize.query(`
      SELECT 
        COUNT(*) as total_participants,
        COUNT(CASE WHEN completion_percentage >= 100 THEN 1 END) as completed_count,
        AVG(progress_value) as avg_progress,
        MAX(progress_value) as best_progress
      FROM challenge_participations 
      WHERE challenge_id = :challengeId AND is_active = true
    `, {
      replacements: { challengeId: this.id },
      type: require('@sequelize/core').QueryTypes.SELECT
    });

    return stats[0] || {
      total_participants: 0,
      completed_count: 0,
      avg_progress: 0,
      best_progress: 0
    };
  }
}

/**
 * Initialize Challenge model with database connection
 * @param {Sequelize} sequelize - Database connection instance
 * @returns {Challenge} - Initialized Challenge model
 */
function initChallengeModel(sequelize) {
  Challenge.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: 'Unique challenge ID'
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
      comment: 'Challenge title/name'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Detailed challenge description'
    },
    challenge_type: {
      type: DataTypes.ENUM('daily', 'weekly', 'special', 'community'),
      allowNull: false,
      defaultValue: 'daily',
      comment: 'Type of challenge'
    },
    category: {
      type: DataTypes.ENUM(
        'participation',
        'knowledge',
        'social',
        'creative',
        'helping',
        'learning',
        'growing',
        'community_building'
      ),
      allowNull: false,
      comment: 'Challenge category for organization'
    },
    difficulty: {
      type: DataTypes.ENUM('easy', 'medium', 'hard', 'extreme'),
      allowNull: false,
      defaultValue: 'easy',
      comment: 'Challenge difficulty level'
    },
    target_value: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1
      },
      comment: 'Target value to complete challenge'
    },
    target_unit: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'actions',
      comment: 'Unit of measurement for target (messages, reactions, etc.)'
    },
    xp_reward: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 50,
      validate: {
        min: 1,
        max: 500
      },
      comment: 'Base XP reward for completion'
    },
    bonus_reward: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 200
      },
      comment: 'Bonus XP for 100% completion'
    },
    start_date: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'Challenge start date and time'
    },
    end_date: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'Challenge end date and time'
    },
    requires_21_plus: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether challenge requires 21+ age verification'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Whether challenge is active'
    },
    max_participants: {
      type: DataTypes.INTEGER,
      comment: 'Maximum number of participants (null = unlimited)'
    },
    participation_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Current number of participants'
    },
    completion_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Number of users who completed challenge'
    },
    auto_approve: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Whether participation is auto-approved'
    },
    tracking_method: {
      type: DataTypes.ENUM('manual', 'automatic', 'hybrid'),
      allowNull: false,
      defaultValue: 'automatic',
      comment: 'How progress is tracked'
    },
    rules: {
      type: DataTypes.TEXT,
      comment: 'Challenge rules and guidelines'
    },
    prizes: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Prize structure (roles, badges, etc.)'
    },
    success_criteria: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Detailed success criteria and validation rules'
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
      comment: 'Tags for categorization and search'
    },
    featured: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether challenge is featured/highlighted'
    },
    created_by_user_id: {
      type: DataTypes.STRING,
      comment: 'Discord ID of user who created challenge'
    },
    approved_by_user_id: {
      type: DataTypes.STRING,
      comment: 'Discord ID of admin who approved challenge'
    },
    approval_status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      allowNull: false,
      defaultValue: 'approved',
      comment: 'Challenge approval status'
    },
    guild_id: {
      type: DataTypes.STRING,
      comment: 'Discord guild ID for server-specific challenges'
    },
    announcement_message_id: {
      type: DataTypes.STRING,
      comment: 'Discord message ID of challenge announcement'
    },
    leaderboard_message_id: {
      type: DataTypes.STRING,
      comment: 'Discord message ID of challenge leaderboard'
    },
    compliance_notes: {
      type: DataTypes.TEXT,
      comment: 'Cannabis compliance and legal notes'
    }
  }, {
    sequelize,
    modelName: 'Challenge',
    tableName: 'challenges',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,

    indexes: [
      {
        name: 'idx_challenge_type',
        fields: ['challenge_type']
      },
      {
        name: 'idx_challenge_active',
        fields: ['is_active']
      },
      {
        name: 'idx_challenge_dates',
        fields: ['start_date', 'end_date']
      },
      {
        name: 'idx_challenge_category',
        fields: ['category']
      },
      {
        name: 'idx_challenge_difficulty',
        fields: ['difficulty']
      },
      {
        name: 'idx_challenge_age_requirement',
        fields: ['requires_21_plus']
      },
      {
        name: 'idx_challenge_active_current',
        fields: ['is_active', 'start_date', 'end_date'],
        where: {
          is_active: true
        }
      },
      {
        name: 'idx_challenge_guild',
        fields: ['guild_id']
      },
      {
        name: 'idx_challenge_featured',
        fields: ['featured', 'is_active']
      },
      {
        name: 'idx_challenge_approval',
        fields: ['approval_status']
      },
      {
        name: 'idx_challenge_participation_count',
        fields: ['participation_count', 'max_participants']
      }
    ],

    // Model validation rules
    validate: {
      // Ensure end date is after start date
      dateValidation() {
        if (this.end_date <= this.start_date) {
          throw new Error('End date must be after start date');
        }
      },

      // Validate challenge duration based on type
      durationValidation() {
        const duration = this.end_date - this.start_date;
        const hours = duration / (1000 * 60 * 60);
        
        const minDurations = {
          daily: 8,    // Minimum 8 hours
          weekly: 120, // Minimum 5 days
          special: 1,  // Minimum 1 hour
          community: 24 // Minimum 1 day
        };

        const maxDurations = {
          daily: 48,    // Maximum 48 hours
          weekly: 336,  // Maximum 14 days
          special: 720, // Maximum 30 days
          community: 2160 // Maximum 90 days
        };

        if (hours < minDurations[this.challenge_type] || hours > maxDurations[this.challenge_type]) {
          throw new Error(`${this.challenge_type} challenges must be between ${minDurations[this.challenge_type]} and ${maxDurations[this.challenge_type]} hours`);
        }
      },

      // Validate XP rewards based on difficulty and type
      xpRewardValidation() {
        const baseXP = {
          easy: { min: 10, max: 50 },
          medium: { min: 25, max: 100 },
          hard: { min: 50, max: 200 },
          extreme: { min: 100, max: 500 }
        };

        const range = baseXP[this.difficulty];
        if (this.xp_reward < range.min || this.xp_reward > range.max) {
          throw new Error(`XP reward for ${this.difficulty} challenges must be between ${range.min} and ${range.max}`);
        }
      },

      // Ensure cannabis challenges are properly flagged
      cannabisContentValidation() {
        const cannabisCategories = ['growing', 'learning'];
        const cannabisTags = ['strain', 'cultivation', 'cannabis', 'consumption'];
        
        if (cannabisCategories.includes(this.category) || 
            (this.tags && this.tags.some(tag => cannabisTags.includes(tag.toLowerCase())))) {
          if (!this.requires_21_plus) {
            console.warn(`Challenge ${this.id} contains cannabis content but doesn't require 21+ verification`);
          }
        }
      }
    },

    // Model hooks for business logic
    hooks: {
      beforeCreate: async (challenge) => {
        // Set default XP based on difficulty and type if not specified
        if (!challenge.xp_reward || challenge.xp_reward === 50) {
          const defaultXP = {
            daily: { easy: 25, medium: 50, hard: 100, extreme: 200 },
            weekly: { easy: 75, medium: 150, hard: 300, extreme: 500 },
            special: { easy: 50, medium: 100, hard: 200, extreme: 400 },
            community: { easy: 100, medium: 200, hard: 400, extreme: 500 }
          };
          
          challenge.xp_reward = defaultXP[challenge.challenge_type][challenge.difficulty];
        }

        // Auto-flag cannabis content for age verification
        const cannabisCategories = ['growing', 'learning'];
        if (cannabisCategories.includes(challenge.category)) {
          challenge.requires_21_plus = true;
        }

        // Set reasonable bonus reward if not specified
        if (!challenge.bonus_reward) {
          challenge.bonus_reward = Math.floor(challenge.xp_reward * 0.5);
        }
      },

      beforeUpdate: async (challenge) => {
        // Prevent modification of participation counts manually
        if (challenge.changed('participation_count') || challenge.changed('completion_count')) {
          if (!challenge._allowStatUpdate) {
            throw new Error('Participation statistics can only be updated through challenge system');
          }
        }

        // Update challenge status based on dates
        if (challenge.changed('start_date') || challenge.changed('end_date')) {
          const now = new Date();
          if (now > challenge.end_date && challenge.is_active) {
            challenge.is_active = false;
          }
        }
      }
    }
  });

  return Challenge;
}

module.exports = { Challenge, initChallengeModel };