/**
 * ChallengeParticipation Model for GrowmiesNJ Discord Bot
 * 
 * Tracks individual user participation in challenges
 * Links users to challenges with progress tracking and completion status
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../connection');

/**
 * ChallengeParticipation model for tracking user challenge progress
 * Manages participation status, progress values, and completion tracking
 */
class ChallengeParticipation extends Model {
  /**
   * Get user's active challenge participations
   * @param {string} userId - Discord user ID
   * @param {string} guildId - Discord guild ID
   * @returns {Promise<ChallengeParticipation[]>} - Active participations
   */
  static async getUserActiveParticipations(userId, guildId) {
    return await this.findAll({
      where: {
        user_id: userId,
        guild_id: guildId,
        is_active: true
      },
      include: [{
        model: require('./Challenge').Challenge,
        as: 'challenge',
        where: { is_active: true }
      }],
      order: [['started_at', 'DESC']]
    });
  }

  /**
   * Get challenge leaderboard
   * @param {string} challengeId - Challenge ID
   * @param {number} limit - Number of top participants
   * @returns {Promise<ChallengeParticipation[]>} - Top participants
   */
  static async getChallengeLeaderboard(challengeId, limit = 10) {
    return await this.findAll({
      where: {
        challenge_id: challengeId,
        is_active: true
      },
      include: [{
        model: require('./User').User,
        as: 'user',
        attributes: ['user_id', 'display_name', 'current_level', 'level_tier']
      }],
      order: [
        ['completion_percentage', 'DESC'],
        ['progress_value', 'DESC'],
        ['completed_at', 'ASC']
      ],
      limit
    });
  }

  /**
   * Get user's participation in specific challenge
   * @param {string} userId - Discord user ID
   * @param {string} challengeId - Challenge ID
   * @returns {Promise<ChallengeParticipation|null>} - User's participation
   */
  static async getUserParticipation(userId, challengeId) {
    return await this.findOne({
      where: {
        user_id: userId,
        challenge_id: challengeId
      },
      include: [{
        model: require('./Challenge').Challenge,
        as: 'challenge'
      }]
    });
  }

  /**
   * Check if user has completed challenge
   * @returns {boolean} - Whether challenge is completed
   */
  isCompleted() {
    return this.completion_percentage >= 100 && this.completed_at !== null;
  }

  /**
   * Calculate progress percentage
   * @param {number} targetValue - Challenge target value
   * @returns {number} - Progress percentage (0-100)
   */
  calculateProgress(targetValue) {
    return Math.min(100, Math.max(0, (this.progress_value / targetValue) * 100));
  }

  /**
   * Get formatted participation data for Discord embed
   * @returns {Object} - Formatted participation data
   */
  getFormattedParticipation() {
    return {
      id: this.id,
      userId: this.user_id,
      challengeId: this.challenge_id,
      progress: this.progress_value,
      completionPercentage: this.completion_percentage,
      isCompleted: this.isCompleted(),
      startedAt: this.started_at,
      completedAt: this.completed_at,
      activityCount: this.activity_count,
      lastActivity: this.last_activity
    };
  }
}

/**
 * Initialize ChallengeParticipation model with database connection
 * @param {Sequelize} sequelize - Database connection instance
 * @returns {ChallengeParticipation} - Initialized ChallengeParticipation model
 */
function initChallengeParticipationModel(sequelize) {
  ChallengeParticipation.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: 'Unique participation ID'
    },
    user_id: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Discord user ID'
    },
    guild_id: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Discord guild ID'
    },
    challenge_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'challenges',
        key: 'id'
      },
      comment: 'Reference to challenge'
    },
    progress_value: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      },
      comment: 'Current progress value'
    },
    completion_percentage: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0.0,
      validate: {
        min: 0.0,
        max: 100.0
      },
      comment: 'Completion percentage (0-100)'
    },
    started_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'When user started participating'
    },
    completed_at: {
      type: DataTypes.DATE,
      comment: 'When user completed the challenge'
    },
    last_activity: {
      type: DataTypes.DATE,
      comment: 'Last activity timestamp'
    },
    activity_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Number of activities performed'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Whether participation is active'
    },
    previously_completed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Internal flag to track completion state changes'
    },
    bonus_earned: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Bonus XP earned for this participation'
    },
    streak_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Consecutive activities streak'
    },
    best_streak: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Best streak achieved in this challenge'
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Additional participation metadata'
    }
  }, {
    sequelize,
    modelName: 'ChallengeParticipation',
    tableName: 'challenge_participations',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,

    indexes: [
      {
        name: 'idx_participation_user_challenge',
        fields: ['user_id', 'challenge_id'],
        unique: true
      },
      {
        name: 'idx_participation_user_guild',
        fields: ['user_id', 'guild_id']
      },
      {
        name: 'idx_participation_challenge',
        fields: ['challenge_id']
      },
      {
        name: 'idx_participation_active',
        fields: ['is_active']
      },
      {
        name: 'idx_participation_completed',
        fields: ['completed_at']
      },
      {
        name: 'idx_participation_progress',
        fields: ['completion_percentage', 'progress_value']
      },
      {
        name: 'idx_participation_leaderboard',
        fields: ['challenge_id', 'completion_percentage', 'progress_value', 'completed_at']
      },
      {
        name: 'idx_participation_activity',
        fields: ['last_activity']
      }
    ],

    // Model validation rules
    validate: {
      // Ensure completed_at is set when completion is 100%
      completionDateValidation() {
        if (this.completion_percentage >= 100 && !this.completed_at) {
          this.completed_at = new Date();
        }
      },

      // Ensure progress value matches completion percentage
      progressConsistency() {
        if (this.challenge && this.challenge.target_value) {
          const expectedPercentage = Math.min(100, (this.progress_value / this.challenge.target_value) * 100);
          if (Math.abs(this.completion_percentage - expectedPercentage) > 0.1) {
            console.warn(`Progress inconsistency detected for participation ${this.id}`);
          }
        }
      }
    },

    // Model hooks for business logic
    hooks: {
      beforeUpdate: async (participation) => {
        // Update completion timestamp when reaching 100%
        if (participation.completion_percentage >= 100 && !participation.completed_at) {
          participation.completed_at = new Date();
        }

        // Update activity timestamp when progress changes
        if (participation.changed('progress_value')) {
          participation.last_activity = new Date();
        }

        // Update streak tracking
        if (participation.changed('activity_count')) {
          const now = new Date();
          const lastActivity = participation.last_activity || participation.started_at;
          const hoursSinceLastActivity = (now - lastActivity) / (1000 * 60 * 60);

          // Reset streak if more than 24 hours since last activity
          if (hoursSinceLastActivity > 24) {
            participation.streak_count = 1;
          } else {
            participation.streak_count = (participation.streak_count || 0) + 1;
          }

          // Update best streak
          if (participation.streak_count > participation.best_streak) {
            participation.best_streak = participation.streak_count;
          }
        }
      },

      afterUpdate: async (participation) => {
        // Update challenge completion count if newly completed
        if (participation.completion_percentage >= 100 && 
            participation.changed('completion_percentage') && 
            !participation.previously_completed) {
          
          const { Challenge } = require('./Challenge');
          const challenge = await Challenge.findByPk(participation.challenge_id);
          
          if (challenge) {
            await challenge.update({
              completion_count: challenge.completion_count + 1
            }, {
              _allowStatUpdate: true
            });
          }

          participation.previously_completed = true;
          await participation.save();
        }
      }
    }
  });

  return ChallengeParticipation;
}

module.exports = { ChallengeParticipation, initChallengeParticipationModel };