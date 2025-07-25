/**
 * ModerationCase Model for GrowmiesNJ Discord Bot
 * 
 * Cannabis compliance-focused moderation system with comprehensive audit trails
 * Integrates with existing AuditLog and User models for regulatory compliance
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../connection');

/**
 * ModerationCase model for tracking moderation actions with cannabis compliance
 * Critical for maintaining legal compliance and audit trails
 */
class ModerationCase extends Model {
  /**
   * Get moderation cases for a specific user
   * @param {string} discordId - Discord user ID
   * @param {string} guildId - Discord guild ID  
   * @param {number} limit - Maximum number of cases to return
   * @returns {Promise<ModerationCase[]>} - User's moderation cases
   */
  static async getCasesForUser(discordId, guildId, limit = 50) {
    return await this.findAll({
      where: { 
        target_user_id: discordId,
        guild_id: guildId,
        active: true
      },
      order: [['created_at', 'DESC']],
      limit,
    });
  }

  /**
   * Get moderation cases for a specific guild
   * @param {string} guildId - Discord guild ID
   * @param {Object} filters - Optional filters (actionType, moderator, dateRange)
   * @param {number} offset - Pagination offset
   * @param {number} limit - Maximum number of cases to return
   * @returns {Promise<{cases: ModerationCase[], total: number}>} - Guild's moderation cases with pagination
   */
  static async getCasesForGuild(guildId, filters = {}, offset = 0, limit = 100) {
    const where = { guild_id: guildId, active: true };
    
    if (filters.actionType) where.action_type = filters.actionType;
    if (filters.moderator) where.moderator_id = filters.moderator;
    if (filters.cannabisCompliance) {
      where[DataTypes.Op.or] = [
        { age_related: true },
        { educational_violation: true },
        { legal_area_violation: true }
      ];
    }
    
    if (filters.dateRange) {
      where.created_at = {
        [DataTypes.Op.between]: [filters.dateRange.start, filters.dateRange.end]
      };
    }

    const { count, rows } = await this.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      offset,
      limit,
    });

    return { cases: rows, total: count };
  }

  /**
   * Get cases by action type with cannabis compliance filtering
   * @param {string} actionType - Type of moderation action
   * @param {string} guildId - Optional guild filter
   * @param {boolean} cannabisOnly - Filter for cannabis compliance cases only
   * @param {number} limit - Maximum number of cases to return
   * @returns {Promise<ModerationCase[]>} - Filtered moderation cases
   */
  static async getCasesByAction(actionType, guildId = null, cannabisOnly = false, limit = 100) {
    const where = { action_type: actionType, active: true };
    if (guildId) where.guild_id = guildId;
    
    if (cannabisOnly) {
      where[DataTypes.Op.or] = [
        { age_related: true },
        { educational_violation: true },
        { legal_area_violation: true }
      ];
    }

    return await this.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit,
    });
  }

  /**
   * Generate case number for a guild
   * @param {string} guildId - Discord guild ID
   * @returns {Promise<string>} - Generated case number (YYYY-MM-CASE###)
   */
  static async generateCaseNumber(guildId) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `${year}-${month}-CASE`;
    
    // Get the highest case number for this month and guild
    const latestCase = await this.findOne({
      where: {
        guild_id: guildId,
        case_number: {
          [DataTypes.Op.like]: `${prefix}%`
        }
      },
      order: [['case_number', 'DESC']],
    });

    let nextNumber = 1;
    if (latestCase) {
      const lastNumber = parseInt(latestCase.case_number.split('CASE')[1]);
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${String(nextNumber).padStart(3, '0')}`;
  }

  /**
   * Create a new moderation case with audit trail
   * @param {Object} caseData - Case data including action type, target, moderator, etc.
   * @returns {Promise<ModerationCase>} - Created moderation case
   */
  static async createCase(caseData) {
    const transaction = await sequelize.transaction();
    
    try {
      // Generate case number
      const caseNumber = await this.generateCaseNumber(caseData.guild_id);
      
      // Create moderation case
      const moderationCase = await this.create({
        ...caseData,
        case_number: caseNumber,
      }, { transaction });

      // Create corresponding audit log entry
      const { AuditLog } = require('./AuditLog');
      await AuditLog.create({
        action_type: 'moderation_action',
        target_user_id: caseData.target_user_id,
        actor_user_id: caseData.moderator_id,
        guild_id: caseData.guild_id,
        details: {
          moderation_case_id: moderationCase.id,
          case_number: caseNumber,
          action_type: caseData.action_type,
          reason: caseData.reason,
          duration: caseData.duration,
          cannabis_compliance: {
            age_related: caseData.age_related || false,
            educational_violation: caseData.educational_violation || false,
            legal_area_violation: caseData.legal_area_violation || false
          },
          evidence_count: caseData.evidence ? caseData.evidence.length : 0
        },
        severity: this.getActionSeverity(caseData.action_type),
        compliance_flag: true
      }, { transaction });

      await transaction.commit();
      return moderationCase;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Update case appeal status
   * @param {string} caseId - Case ID to update
   * @param {string} appealStatus - New appeal status
   * @param {string} reviewerId - ID of reviewer
   * @param {string} reviewNotes - Appeal review notes
   * @returns {Promise<ModerationCase>} - Updated case
   */
  static async updateAppealStatus(caseId, appealStatus, reviewerId, reviewNotes) {
    const moderationCase = await this.findByPk(caseId);
    if (!moderationCase) {
      throw new Error('Moderation case not found');
    }

    await moderationCase.update({
      appeal_status: appealStatus,
      appeal_reviewer_id: reviewerId,
      appeal_reviewed_at: new Date(),
      appeal_notes: reviewNotes
    });

    // Create audit log for appeal status change
    const { AuditLog } = require('./AuditLog');
    await AuditLog.create({
      action_type: 'admin_action',
      target_user_id: moderationCase.target_user_id,
      actor_user_id: reviewerId,
      guild_id: moderationCase.guild_id,
      details: {
        admin_action: 'appeal_status_change',
        case_number: moderationCase.case_number,
        old_status: moderationCase.appeal_status,
        new_status: appealStatus,
        review_notes: reviewNotes
      },
      severity: 'high',
      compliance_flag: true
    });

    return moderationCase;
  }

  /**
   * Get action severity for audit logging
   * @param {string} actionType - Moderation action type
   * @returns {string} - Severity level
   */
  static getActionSeverity(actionType) {
    const severityMap = {
      'NOTE': 'low',
      'WARN': 'medium',
      'EDUCATIONAL_WARNING': 'medium',
      'TIMEOUT': 'high',
      'KICK': 'high',
      'BAN': 'critical'
    };
    return severityMap[actionType] || 'medium';
  }

  /**
   * Parse duration string to milliseconds
   * @param {string} durationStr - Duration string (e.g., "1h", "30m", "7d")
   * @returns {number|null} - Duration in milliseconds
   */
  static parseDuration(durationStr) {
    if (!durationStr) return null;
    
    const match = durationStr.match(/^(\d+)([smhd])$/);
    if (!match) return null;
    
    const [, amount, unit] = match;
    const multipliers = {
      's': 1000,
      'm': 60 * 1000,
      'h': 60 * 60 * 1000,
      'd': 24 * 60 * 60 * 1000
    };
    
    return parseInt(amount) * multipliers[unit];
  }

  /**
   * Check if case has expired (for temporary actions)
   * @returns {boolean} - True if case has expired
   */
  isExpired() {
    if (!this.expires_at) return false;
    return new Date() > this.expires_at;
  }

  /**
   * Check if case is cannabis compliance related
   * @returns {boolean} - True if cannabis compliance case
   */
  isCannabisCompliance() {
    return this.age_related || this.educational_violation || this.legal_area_violation;
  }
}

/**
 * Initialize ModerationCase model with database connection
 * @param {Sequelize} sequelize - Database connection instance
 * @returns {ModerationCase} - Initialized ModerationCase model
 */
function initModerationCaseModel(sequelize) {
  ModerationCase.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: 'Unique moderation case ID',
    },
    case_number: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      comment: 'Human-readable case number (YYYY-MM-CASE###)',
    },
    guild_id: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Discord guild/server ID where action occurred',
    },
    target_user_id: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Discord ID of user being moderated',
    },
    moderator_id: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Discord ID of moderator performing action',
    },
    action_type: {
      type: DataTypes.ENUM(
        'WARN',
        'TIMEOUT', 
        'KICK',
        'BAN',
        'NOTE',
        'EDUCATIONAL_WARNING'
      ),
      allowNull: false,
      comment: 'Type of moderation action performed',
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Reason for moderation action',
    },
    duration: {
      type: DataTypes.BIGINT,
      comment: 'Duration in milliseconds for temporary actions (timeouts/bans)',
    },
    expires_at: {
      type: DataTypes.DATE,
      comment: 'When the moderation action expires',
    },
    evidence: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Array of evidence (message IDs, attachments, screenshots)',
    },
    
    // Cannabis Compliance Fields
    age_related: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Action related to age verification/21+ compliance',
    },
    educational_violation: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Violation of educational content policies',
    },
    legal_area_violation: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Violation in legal-sensitive areas (cultivation, medical, etc.)',
    },
    
    // Status and Appeal Fields
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Whether the case is currently active',
    },
    appeal_status: {
      type: DataTypes.ENUM('NONE', 'PENDING', 'APPROVED', 'DENIED'),
      defaultValue: 'NONE',
      comment: 'Current appeal status',
    },
    appealed_at: {
      type: DataTypes.DATE,
      comment: 'When the user appealed the action',
    },
    appeal_reason: {
      type: DataTypes.TEXT,
      comment: 'User provided reason for appeal',
    },
    appeal_reviewer_id: {
      type: DataTypes.STRING,
      comment: 'Discord ID of staff member reviewing appeal',
    },
    appeal_reviewed_at: {
      type: DataTypes.DATE,
      comment: 'When the appeal was reviewed',
    },
    appeal_notes: {
      type: DataTypes.TEXT,
      comment: 'Staff notes about appeal review',
    },
    
    // Metadata
    notes: {
      type: DataTypes.TEXT,
      comment: 'Internal staff notes about the case',
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Additional structured data about the case',
    },
  }, {
    sequelize,
    modelName: 'ModerationCase',
    tableName: 'moderation_cases',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    
    indexes: [
      {
        name: 'idx_modcase_guild',
        fields: ['guild_id'],
      },
      {
        name: 'idx_modcase_target_user',
        fields: ['target_user_id'],
      },
      {
        name: 'idx_modcase_moderator',
        fields: ['moderator_id'],
      },
      {
        name: 'idx_modcase_action_type',
        fields: ['action_type'],
      },
      {
        name: 'idx_modcase_case_number',
        fields: ['case_number'],
        unique: true,
      },
      {
        name: 'idx_modcase_active',
        fields: ['active'],
      },
      {
        name: 'idx_modcase_appeal_status',
        fields: ['appeal_status'],
      },
      {
        name: 'idx_modcase_expires',
        fields: ['expires_at'],
      },
      {
        name: 'idx_modcase_cannabis_compliance',
        fields: ['age_related', 'educational_violation', 'legal_area_violation'],
      },
      {
        name: 'idx_modcase_guild_created',
        fields: ['guild_id', 'created_at'],
      },
      {
        name: 'idx_modcase_user_created',
        fields: ['target_user_id', 'created_at'],
      },
      {
        name: 'idx_modcase_guild_action_created',
        fields: ['guild_id', 'action_type', 'created_at'],
      },
    ],

    // Model validation rules
    validate: {
      // Ensure duration is set for temporary actions
      durationValidation() {
        const temporaryActions = ['TIMEOUT', 'BAN'];
        if (temporaryActions.includes(this.action_type) && !this.duration) {
          throw new Error('Duration required for temporary moderation actions');
        }
      },

      // Validate evidence format
      evidenceValidation() {
        if (this.evidence && !Array.isArray(this.evidence)) {
          throw new Error('Evidence must be an array');
        }
      },

      // Ensure appeal reviewer is set when appeal is reviewed
      appealReviewerValidation() {
        const reviewedStatuses = ['APPROVED', 'DENIED'];
        if (reviewedStatuses.includes(this.appeal_status) && !this.appeal_reviewer_id) {
          throw new Error('Appeal reviewer required for reviewed appeals');
        }
      },
    },

    // Model hooks for business logic
    hooks: {
      beforeCreate: async (moderationCase) => {
        // Set expiration date for temporary actions
        if (moderationCase.duration) {
          moderationCase.expires_at = new Date(Date.now() + moderationCase.duration);
        }

        // Validate target user exists and check cannabis compliance
        const { User } = require('./User');
        const targetUser = await User.findOne({
          where: { 
            discord_id: moderationCase.target_user_id,
            guild_id: moderationCase.guild_id 
          }
        });

        if (targetUser) {
          // Auto-flag age-related cases for users without 21+ verification
          if (!targetUser.is_21_plus && moderationCase.action_type !== 'NOTE') {
            moderationCase.age_related = true;
          }
        }
      },

      beforeUpdate: async (moderationCase) => {
        // Update expiration if duration changed
        if (moderationCase.changed('duration') && moderationCase.duration) {
          moderationCase.expires_at = new Date(Date.now() + moderationCase.duration);
        }

        // Set appeal timestamp when status changes to PENDING
        if (moderationCase.changed('appeal_status') && moderationCase.appeal_status === 'PENDING') {
          moderationCase.appealed_at = new Date();
        }
      },
    },
  });

  return ModerationCase;
}

module.exports = { ModerationCase, initModerationCaseModel };