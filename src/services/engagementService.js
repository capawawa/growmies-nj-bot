/**
 * Engagement Service for GrowmiesNJ Discord Bot
 * 
 * Core service for managing user engagement activities and XP integration
 * Handles quiz completions, challenge participation, and activity tracking
 */

const { User } = require('../database/models/User');
const { QuizQuestion } = require('../database/models/QuizQuestion');
const { Challenge } = require('../database/models/Challenge');
const { AuditLog } = require('../database/models/AuditLog');
const xpCalculationService = require('./xpCalculation');
const roleManagementService = require('./roleManagement');
const ageVerificationService = require('./ageVerification');
const { WelcomeEmbeds } = require('../utils/embeds');

/**
 * Engagement tracking and XP integration service
 * Manages all user engagement activities with cannabis compliance
 */
class EngagementService {
  /**
   * Process quiz completion with XP reward and progress tracking
   * @param {Object} interaction - Discord interaction object
   * @param {string} questionId - Quiz question ID
   * @param {number} answerIndex - Selected answer index
   * @param {number} timeTaken - Time taken to answer (seconds)
   * @returns {Promise<Object>} - Quiz result with XP reward
   */
  static async processQuizCompletion(interaction, questionId, answerIndex, timeTaken = 0) {
    try {
      const userId = interaction.user.id;
      const guildId = interaction.guild.id;

      // Get user and question data
      const [user, question] = await Promise.all([
        User.findOne({ where: { discord_id: userId, guild_id: guildId } }),
        QuizQuestion.findByPk(questionId)
      ]);

      if (!user || !question) {
        throw new Error('User or question not found');
      }

      // Check age verification for cannabis content
      if (question.requires_21_plus && !user.is_21_plus) {
        return {
          success: false,
          error: 'age_verification_required',
          message: 'This cannabis-related question requires age verification (21+).'
        };
      }

      // Check if question is active
      if (!question.is_active) {
        return {
          success: false,
          error: 'question_inactive',
          message: 'This question is no longer available.'
        };
      }

      // Determine if answer is correct
      const isCorrect = question.isCorrectAnswer(answerIndex);
      const baseXP = question.getXPReward();
      
      // Calculate XP with bonus for speed (if correct)
      let xpAwarded = 0;
      if (isCorrect) {
        xpAwarded = baseXP;
        
        // Time bonus for quick answers (max 50% bonus)
        if (timeTaken > 0 && timeTaken <= 10) {
          const speedBonus = Math.floor(baseXP * 0.5 * (1 - timeTaken / 10));
          xpAwarded += speedBonus;
        }
      } else {
        // Small XP for participation even if wrong
        xpAwarded = Math.floor(baseXP * 0.1);
      }

      // Award XP through existing system
      const xpResult = await xpCalculationService.awardXP(
        userId,
        guildId,
        xpAwarded,
        'quiz_completion',
        interaction.channelId
      );

      // Update user quiz statistics
      await user.update({
        quiz_questions_answered: (user.quiz_questions_answered || 0) + 1,
        quiz_questions_correct: (user.quiz_questions_correct || 0) + (isCorrect ? 1 : 0),
        total_xp_earned: user.total_xp_earned + xpAwarded,
        last_quiz_date: new Date(),
        updated_at: new Date()
      });

      // Update question statistics
      await question.update({
        usage_count: question.usage_count + 1,
        correct_percentage: await this.calculateQuestionAccuracy(questionId),
        updated_at: new Date()
      }, {
        _allowStatUpdate: true
      });

      // Check for level up and role progression
      const levelResult = await roleManagementService.checkLevelProgression(user, guildId);

      // Create audit log entry
      await AuditLog.create({
        user_id: userId,
        guild_id: guildId,
        action_type: 'quiz_completion',
        target_type: 'question',
        target_id: questionId,
        details: {
          question_category: question.category,
          question_difficulty: question.difficulty,
          answer_index: answerIndex,
          is_correct: isCorrect,
          xp_awarded: xpAwarded,
          time_taken: timeTaken,
          requires_21_plus: question.requires_21_plus
        },
        metadata: {
          channel_id: interaction.channelId,
          total_xp: user.total_xp + xpAwarded,
          quiz_streak: await this.calculateQuizStreak(userId, guildId)
        }
      });

      return {
        success: true,
        isCorrect,
        xpAwarded,
        explanation: question.explanation,
        correctAnswer: question.answer_choices[question.correct_answer_index],
        userAnswer: question.answer_choices[answerIndex],
        levelUp: levelResult.leveledUp,
        newLevel: levelResult.newLevel,
        newTier: levelResult.newTier,
        question: question.getFormattedQuestion(),
        user: {
          totalXP: user.total_xp + xpAwarded,
          currentLevel: user.current_level,
          questionsAnswered: user.quiz_questions_answered + 1,
          questionsCorrect: user.quiz_questions_correct + (isCorrect ? 1 : 0),
          accuracy: ((user.quiz_questions_correct + (isCorrect ? 1 : 0)) / (user.quiz_questions_answered + 1) * 100).toFixed(1)
        }
      };

    } catch (error) {
      console.error('Error processing quiz completion:', error);
      return {
        success: false,
        error: 'processing_error',
        message: 'An error occurred while processing your quiz answer.'
      };
    }
  }

  /**
   * Process challenge participation and progress tracking
   * @param {Object} interaction - Discord interaction object
   * @param {string} challengeId - Challenge ID
   * @param {number} progressValue - Progress value (optional)
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object>} - Challenge participation result
   */
  static async processChallengeParticipation(interaction, challengeId, progressValue = 1, metadata = {}) {
    try {
      const userId = interaction.user.id;
      const guildId = interaction.guild.id;

      // Get user and challenge data
      const [user, challenge] = await Promise.all([
        User.findOne({ where: { discord_id: userId, guild_id: guildId } }),
        Challenge.findByPk(challengeId)
      ]);

      if (!user || !challenge) {
        throw new Error('User or challenge not found');
      }

      // Check age verification for cannabis content
      if (challenge.requires_21_plus && !user.is_21_plus) {
        return {
          success: false,
          error: 'age_verification_required',
          message: 'This cannabis-related challenge requires age verification (21+).'
        };
      }

      // Check if user can participate
      if (!challenge.canUserParticipate(userId, user.is_21_plus)) {
        return {
          success: false,
          error: 'cannot_participate',
          message: 'You cannot participate in this challenge at this time.'
        };
      }

      // Get or create challenge participation record
      const [participation, created] = await this.getOrCreateParticipation(
        userId, 
        guildId, 
        challengeId
      );

      // Update progress
      const oldProgress = participation.progress_value;
      participation.progress_value = Math.min(
        participation.progress_value + progressValue,
        challenge.target_value
      );
      
      participation.completion_percentage = Math.min(
        (participation.progress_value / challenge.target_value) * 100,
        100
      );

      participation.last_activity = new Date();
      participation.activity_count = (participation.activity_count || 0) + 1;

      // Check for completion
      const isCompleted = participation.completion_percentage >= 100;
      if (isCompleted && !participation.completed_at) {
        participation.completed_at = new Date();
        participation.completion_percentage = 100;
      }

      await participation.save();

      // Calculate XP reward
      const xpAwarded = challenge.calculateXPReward(participation.completion_percentage);
      let totalXPAwarded = 0;

      if (xpAwarded > 0) {
        const xpResult = await xpCalculationService.awardXP(
          userId,
          guildId,
          xpAwarded,
          'challenge_participation',
          interaction.channelId
        );
        totalXPAwarded = xpAwarded;
      }

      // Update challenge statistics
      if (created) {
        await challenge.update({
          participation_count: challenge.participation_count + 1,
          updated_at: new Date()
        }, {
          _allowStatUpdate: true
        });
      }

      if (isCompleted && !participation.previously_completed) {
        await challenge.update({
          completion_count: challenge.completion_count + 1,
          updated_at: new Date()
        }, {
          _allowStatUpdate: true
        });
        participation.previously_completed = true;
        await participation.save();
      }

      // Update user challenge statistics
      await user.update({
        challenges_participated: (user.challenges_participated || 0) + (created ? 1 : 0),
        challenges_completed: (user.challenges_completed || 0) + (isCompleted && !participation.previously_completed ? 1 : 0),
        total_xp_earned: user.total_xp_earned + totalXPAwarded,
        last_challenge_date: new Date(),
        updated_at: new Date()
      });

      // Check for level up
      const levelResult = await roleManagementService.checkLevelProgression(user, guildId);

      // Create audit log entry
      await AuditLog.create({
        user_id: userId,
        guild_id: guildId,
        action_type: 'challenge_participation',
        target_type: 'challenge',
        target_id: challengeId,
        details: {
          challenge_type: challenge.challenge_type,
          challenge_category: challenge.category,
          progress_added: progressValue,
          total_progress: participation.progress_value,
          completion_percentage: participation.completion_percentage,
          is_completed: isCompleted,
          xp_awarded: totalXPAwarded,
          requires_21_plus: challenge.requires_21_plus
        },
        metadata: {
          channel_id: interaction.channelId,
          old_progress: oldProgress,
          metadata: metadata
        }
      });

      return {
        success: true,
        isCompleted,
        progressValue: participation.progress_value,
        targetValue: challenge.target_value,
        completionPercentage: participation.completion_percentage,
        xpAwarded: totalXPAwarded,
        levelUp: levelResult.leveledUp,
        newLevel: levelResult.newLevel,
        newTier: levelResult.newTier,
        challenge: challenge.getFormattedChallenge(),
        participation: {
          created: created,
          activityCount: participation.activity_count,
          lastActivity: participation.last_activity
        }
      };

    } catch (error) {
      console.error('Error processing challenge participation:', error);
      return {
        success: false,
        error: 'processing_error',
        message: 'An error occurred while processing your challenge participation.'
      };
    }
  }

  /**
   * Track general engagement activity (reactions, messages, etc.)
   * @param {string} userId - Discord user ID
   * @param {string} guildId - Discord guild ID
   * @param {string} activityType - Type of activity
   * @param {string} channelId - Channel ID where activity occurred
   * @param {Object} metadata - Additional activity metadata
   * @returns {Promise<Object>} - Activity tracking result
   */
  static async trackEngagementActivity(userId, guildId, activityType, channelId, metadata = {}) {
    try {
      const user = await User.findOne({
        where: { discord_id: userId, guild_id: guildId }
      });

      if (!user) {
        return { success: false, error: 'user_not_found' };
      }

      // Calculate XP based on activity type
      const activityXP = this.getActivityXP(activityType);
      
      // Check for spam/rate limiting
      const isValidActivity = await xpCalculationService.validateActivity(
        userId,
        guildId,
        activityType,
        channelId
      );

      if (!isValidActivity) {
        return { success: false, error: 'rate_limited' };
      }

      // Award XP through existing system
      let xpAwarded = 0;
      if (activityXP > 0) {
        const xpResult = await xpCalculationService.awardXP(
          userId,
          guildId,
          activityXP,
          activityType,
          channelId
        );
        xpAwarded = activityXP;
      }

      // Update activity counters using correct User model fields
      const activityField = this.getActivityField(activityType);
      if (activityField) {
        await user.update({
          [activityField]: (user[activityField] || 0) + 1,
          total_xp: user.total_xp + xpAwarded,
          last_activity_at: new Date(),
          updated_at: new Date()
        });
      }

      // Check for level progression
      const levelResult = await roleManagementService.checkLevelProgression(user, guildId);

      return {
        success: true,
        activityType,
        xpAwarded,
        levelUp: levelResult.leveledUp,
        newLevel: levelResult.newLevel,
        newTier: levelResult.newTier,
        totalXP: user.total_xp + xpAwarded
      };

    } catch (error) {
      console.error('Error tracking engagement activity:', error);
      return {
        success: false,
        error: 'tracking_error',
        message: 'An error occurred while tracking your activity.'
      };
    }
  }

  /**
   * Get user engagement statistics
   * @param {string} userId - Discord user ID
   * @param {string} guildId - Discord guild ID
   * @returns {Promise<Object>} - User engagement stats
   */
  static async getUserEngagementStats(userId, guildId) {
    try {
      const user = await User.findOne({
        where: { discord_id: userId, guild_id: guildId }
      });

      if (!user) {
        return null;
      }

      // Calculate quiz accuracy (these fields need to be added to User model or tracked separately)
      const quizAccuracy = user.quiz_questions_answered > 0
        ? (user.quiz_questions_correct / user.quiz_questions_answered * 100).toFixed(1)
        : 0;

      // Calculate challenge completion rate (these fields need to be added to User model or tracked separately)
      const challengeCompletionRate = user.challenges_participated > 0
        ? (user.challenges_completed / user.challenges_participated * 100).toFixed(1)
        : 0;

      // Get current quiz streak
      const quizStreak = await this.calculateQuizStreak(userId, guildId);

      return {
        totalXP: user.total_xp || 0,
        currentLevel: user.current_level || 1,
        levelTier: user.level_tier || 'Seedling',
        quizzes: {
          answered: user.quiz_questions_answered || 0,
          correct: user.quiz_questions_correct || 0,
          accuracy: quizAccuracy,
          streak: quizStreak,
          lastQuiz: user.last_quiz_date
        },
        challenges: {
          participated: user.challenges_participated || 0,
          completed: user.challenges_completed || 0,
          completionRate: challengeCompletionRate,
          lastChallenge: user.last_challenge_date
        },
        activity: {
          messagesCount: user.messages_count || 0,
          voiceTimeMinutes: user.voice_time_minutes || 0,
          reactionsReceived: user.reactions_received || 0,
          lastActive: user.last_activity_at
        },
        progression: {
          xpToNextLevel: this.calculateXPToNextLevel(user.total_xp, user.current_level),
          progressPercentage: this.calculateLevelProgress(user.total_xp, user.current_level)
        }
      };

    } catch (error) {
      console.error('Error getting user engagement stats:', error);
      return null;
    }
  }

  /**
   * Helper methods for engagement tracking
   */

  /**
   * Get XP value for activity type
   * @param {string} activityType - Type of activity
   * @returns {number} - XP value
   */
  static getActivityXP(activityType) {
    const xpValues = {
      'message': 2,
      'reaction_add': 1,
      'reaction_remove': 0,
      'voice_join': 5,
      'voice_leave': 0,
      'boost_server': 50,
      'invite_create': 10,
      'help_other': 15,
      'suggestion_submit': 20,
      'vote_participate': 5,
      'compliment_give': 8,
      'compliment_receive': 3,
      'celebration_participate': 10
    };

    return xpValues[activityType] || 0;
  }

  /**
   * Get database field for activity type
   * @param {string} activityType - Type of activity
   * @returns {string|null} - Database field name
   */
  static getActivityField(activityType) {
    const fieldMap = {
      'message': 'messages_count',
      'reaction_add': 'reactions_received',
      'reaction_remove': 'reactions_received',
      'voice_join': 'voice_time_minutes',
      'voice_activity': 'voice_time_minutes'
    };

    return fieldMap[activityType] || null;
  }

  /**
   * Calculate quiz streak for user
   * @param {string} userId - Discord user ID
   * @param {string} guildId - Discord guild ID
   * @returns {Promise<number>} - Current quiz streak
   */
  static async calculateQuizStreak(userId, guildId) {
    try {
      // Get recent quiz audit logs
      const recentQuizzes = await AuditLog.findAll({
        where: {
          user_id: userId,
          guild_id: guildId,
          action_type: 'quiz_completion'
        },
        order: [['created_at', 'DESC']],
        limit: 50
      });

      let streak = 0;
      for (const quiz of recentQuizzes) {
        if (quiz.details.is_correct) {
          streak++;
        } else {
          break;
        }
      }

      return streak;

    } catch (error) {
      console.error('Error calculating quiz streak:', error);
      return 0;
    }
  }

  /**
   * Calculate question accuracy percentage
   * @param {string} questionId - Question ID
   * @returns {Promise<number>} - Accuracy percentage
   */
  static async calculateQuestionAccuracy(questionId) {
    try {
      const quizResults = await AuditLog.findAll({
        where: {
          action_type: 'quiz_completion',
          target_id: questionId
        }
      });

      if (quizResults.length === 0) return 0;

      const correctAnswers = quizResults.filter(result => 
        result.details.is_correct
      ).length;

      return Math.round((correctAnswers / quizResults.length) * 100);

    } catch (error) {
      console.error('Error calculating question accuracy:', error);
      return 0;
    }
  }

  /**
   * Calculate XP needed for next level
   * @param {number} currentXP - Current XP
   * @param {number} currentLevel - Current level
   * @returns {number} - XP needed for next level
   */
  static calculateXPToNextLevel(currentXP, currentLevel) {
    // Use existing XP calculation logic
    const nextLevelXP = xpCalculationService.getXPRequiredForLevel(currentLevel + 1);
    return Math.max(0, nextLevelXP - currentXP);
  }

  /**
   * Calculate level progress percentage
   * @param {number} currentXP - Current XP
   * @param {number} currentLevel - Current level
   * @returns {number} - Progress percentage (0-100)
   */
  static calculateLevelProgress(currentXP, currentLevel) {
    const currentLevelXP = xpCalculationService.getXPRequiredForLevel(currentLevel);
    const nextLevelXP = xpCalculationService.getXPRequiredForLevel(currentLevel + 1);
    
    const progressXP = currentXP - currentLevelXP;
    const levelRangeXP = nextLevelXP - currentLevelXP;
    
    return Math.min(100, Math.max(0, (progressXP / levelRangeXP) * 100));
  }

  /**
   * Get or create challenge participation record
   * @param {string} userId - Discord user ID
   * @param {string} guildId - Discord guild ID
   * @param {string} challengeId - Challenge ID
   * @returns {Promise<Array>} - [participation, created]
   */
  static async getOrCreateParticipation(userId, guildId, challengeId) {
    const { ChallengeParticipation } = require('../database/models/ChallengeParticipation');
    
    return await ChallengeParticipation.findOrCreate({
      where: {
        user_id: userId,
        guild_id: guildId,
        challenge_id: challengeId
      },
      defaults: {
        progress_value: 0,
        completion_percentage: 0,
        started_at: new Date(),
        is_active: true,
        activity_count: 0
      }
    });
  }
}

module.exports = EngagementService;