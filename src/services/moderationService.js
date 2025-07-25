/**
 * Moderation Service for GrowmiesNJ Discord Bot
 * 
 * Cannabis compliance-focused moderation service with comprehensive audit trails
 * Integrates with existing AuditLog, User models, and Discord.js permissions
 */

const { PermissionsBitField } = require('discord.js');
const Joi = require('joi');
const { ModerationCase } = require('../database/models/ModerationCase');
const { User } = require('../database/models/User');
const { AuditLog } = require('../database/models/AuditLog');

/**
 * Moderation Service Class
 * Handles all moderation case operations with cannabis compliance validation
 */
class ModerationService {
  constructor() {
    this.permissionMap = {
      'WARN': [PermissionsBitField.Flags.ModerateMembers],
      'TIMEOUT': [PermissionsBitField.Flags.ModerateMembers],
      'KICK': [PermissionsBitField.Flags.KickMembers],
      'BAN': [PermissionsBitField.Flags.BanMembers],
      'NOTE': [PermissionsBitField.Flags.ManageMessages],
      'EDUCATIONAL_WARNING': [PermissionsBitField.Flags.ModerateMembers]
    };

    this.actionSeverity = {
      'NOTE': 'low',
      'WARN': 'medium', 
      'EDUCATIONAL_WARNING': 'medium',
      'TIMEOUT': 'high',
      'KICK': 'high',
      'BAN': 'critical'
    };
  }

  /**
   * Validation schema for creating moderation cases
   */
  get createCaseSchema() {
    return Joi.object({
      guildId: Joi.string().required(),
      targetUserId: Joi.string().required(),
      moderatorId: Joi.string().required(),
      actionType: Joi.string().valid('WARN', 'TIMEOUT', 'KICK', 'BAN', 'NOTE', 'EDUCATIONAL_WARNING').required(),
      reason: Joi.string().min(10).max(1000).required(),
      duration: Joi.string().pattern(/^\d+[smhd]$/).optional(),
      evidence: Joi.array().items(Joi.string()).optional(),
      notes: Joi.string().max(2000).optional(),
      cannabisFlags: Joi.object({
        ageRelated: Joi.boolean().default(false),
        educationalViolation: Joi.boolean().default(false),
        legalAreaViolation: Joi.boolean().default(false)
      }).optional()
    });
  }

  /**
   * Validation schema for updating moderation cases
   */
  get updateCaseSchema() {
    return Joi.object({
      reason: Joi.string().min(10).max(1000).optional(),
      notes: Joi.string().max(2000).optional(),
      active: Joi.boolean().optional(),
      cannabisFlags: Joi.object({
        ageRelated: Joi.boolean(),
        educationalViolation: Joi.boolean(),
        legalAreaViolation: Joi.boolean()
      }).optional()
    });
  }

  /**
   * Validation schema for case filtering
   */
  get filterCasesSchema() {
    return Joi.object({
      actionType: Joi.string().valid('WARN', 'TIMEOUT', 'KICK', 'BAN', 'NOTE', 'EDUCATIONAL_WARNING').optional(),
      moderator: Joi.string().optional(),
      cannabisCompliance: Joi.boolean().optional(),
      dateRange: Joi.object({
        start: Joi.date().optional(),
        end: Joi.date().optional()
      }).optional(),
      appealStatus: Joi.string().valid('NONE', 'PENDING', 'APPROVED', 'DENIED').optional(),
      offset: Joi.number().integer().min(0).default(0),
      limit: Joi.number().integer().min(1).max(100).default(50)
    });
  }

  /**
   * Create a new moderation case with full validation and audit trail
   * @param {Object} caseData - Case creation data
   * @param {Object} guild - Discord guild object
   * @param {Object} moderator - Discord member object performing the action
   * @returns {Promise<Object>} - Created case with validation results
   */
  async createCase(caseData, guild, moderator) {
    try {
      // Validate input data
      const { error, value } = this.createCaseSchema.validate(caseData);
      if (error) {
        throw new Error(`Validation error: ${error.details[0].message}`);
      }

      // Validate moderator permissions
      await this.validateModeratorPermissions(moderator, value.actionType);

      // Validate target user and check cannabis compliance
      const targetUser = await this.validateTargetUser(value.targetUserId, value.guildId);
      
      // Auto-detect cannabis compliance flags
      const enhancedCannabisFlags = await this.detectCannabisComplianceFlags(
        targetUser, 
        value.actionType, 
        value.reason,
        value.cannabisFlags || {}
      );

      // Parse duration for temporary actions
      let parsedDuration = null;
      if (value.duration) {
        parsedDuration = this.parseDuration(value.duration);
        if (!parsedDuration) {
          throw new Error('Invalid duration format. Use format like "1h", "30m", "7d"');
        }
      }

      // Validate duration requirements
      this.validateDurationRequirements(value.actionType, parsedDuration);

      // Create the moderation case
      const moderationCase = await ModerationCase.createCase({
        guild_id: value.guildId,
        target_user_id: value.targetUserId,
        moderator_id: value.moderatorId,
        action_type: value.actionType,
        reason: value.reason,
        duration: parsedDuration,
        evidence: value.evidence || [],
        notes: value.notes,
        age_related: enhancedCannabisFlags.ageRelated,
        educational_violation: enhancedCannabisFlags.educationalViolation,
        legal_area_violation: enhancedCannabisFlags.legalAreaViolation
      });

      // Apply Discord action if required
      const discordResult = await this.applyDiscordAction(
        guild,
        value.targetUserId,
        value.actionType,
        value.reason,
        parsedDuration
      );

      return {
        success: true,
        case: moderationCase,
        discordAction: discordResult,
        cannabisCompliance: enhancedCannabisFlags
      };

    } catch (error) {
      console.error('[ModerationService] Error creating case:', error.message);
      
      // Log failed moderation attempt
      await AuditLog.create({
        action_type: 'security_event',
        actor_user_id: caseData.moderatorId,
        target_user_id: caseData.targetUserId,
        guild_id: caseData.guildId,
        details: {
          failed_action: 'create_moderation_case',
          error_message: error.message,
          attempted_action_type: caseData.actionType
        },
        severity: 'high',
        success: false,
        error_message: error.message
      });

      throw error;
    }
  }

  /**
   * Get moderation cases with filtering and pagination
   * @param {string} guildId - Discord guild ID
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} - Paginated cases with metadata
   */
  async getCases(guildId, filters = {}) {
    try {
      const { error, value } = this.filterCasesSchema.validate(filters);
      if (error) {
        throw new Error(`Filter validation error: ${error.details[0].message}`);
      }

      const result = await ModerationCase.getCasesForGuild(
        guildId,
        value,
        value.offset,
        value.limit
      );

      // Get cannabis compliance statistics
      const complianceStats = await this.getCannabisComplianceStats(guildId);

      return {
        success: true,
        cases: result.cases,
        pagination: {
          offset: value.offset,
          limit: value.limit,
          total: result.total,
          hasMore: (value.offset + value.limit) < result.total
        },
        complianceStats
      };

    } catch (error) {
      console.error('[ModerationService] Error getting cases:', error.message);
      throw error;
    }
  }

  /**
   * Get a specific moderation case by ID or case number
   * @param {string} identifier - Case ID or case number
   * @param {string} guildId - Discord guild ID for validation
   * @returns {Promise<Object>} - Case details with related data
   */
  async getCase(identifier, guildId) {
    try {
      let moderationCase;
      
      // Try to find by case number first, then by ID
      if (identifier.includes('CASE')) {
        moderationCase = await ModerationCase.findOne({
          where: { case_number: identifier, guild_id: guildId }
        });
      } else {
        moderationCase = await ModerationCase.findOne({
          where: { id: identifier, guild_id: guildId }
        });
      }

      if (!moderationCase) {
        throw new Error('Moderation case not found');
      }

      // Get related cases for context
      const relatedCases = await ModerationCase.getCasesForUser(
        moderationCase.target_user_id,
        guildId,
        5
      );

      // Get audit trail
      const auditTrail = await AuditLog.getLogsForUser(
        moderationCase.target_user_id,
        10
      );

      return {
        success: true,
        case: moderationCase,
        relatedCases: relatedCases.filter(c => c.id !== moderationCase.id),
        auditTrail,
        isExpired: moderationCase.isExpired(),
        isCannabisCompliance: moderationCase.isCannabisCompliance()
      };

    } catch (error) {
      console.error('[ModerationService] Error getting case:', error.message);
      throw error;
    }
  }

  /**
   * Update an existing moderation case
   * @param {string} caseId - Case ID to update
   * @param {Object} updateData - Update data
   * @param {string} moderatorId - ID of moderator making changes
   * @returns {Promise<Object>} - Updated case
   */
  async updateCase(caseId, updateData, moderatorId) {
    try {
      const { error, value } = this.updateCaseSchema.validate(updateData);
      if (error) {
        throw new Error(`Validation error: ${error.details[0].message}`);
      }

      const moderationCase = await ModerationCase.findByPk(caseId);
      if (!moderationCase) {
        throw new Error('Moderation case not found');
      }

      // Track changes for audit trail
      const changes = {};
      Object.keys(value).forEach(key => {
        if (key === 'cannabisFlags') {
          Object.keys(value.cannabisFlags).forEach(flag => {
            const dbField = this.mapCannabisFlag(flag);
            if (moderationCase[dbField] !== value.cannabisFlags[flag]) {
              changes[dbField] = {
                old: moderationCase[dbField],
                new: value.cannabisFlags[flag]
              };
            }
          });
        } else if (moderationCase[key] !== value[key]) {
          changes[key] = {
            old: moderationCase[key],
            new: value[key]
          };
        }
      });

      // Apply updates
      const updatePayload = { ...value };
      if (value.cannabisFlags) {
        updatePayload.age_related = value.cannabisFlags.ageRelated;
        updatePayload.educational_violation = value.cannabisFlags.educationalViolation;
        updatePayload.legal_area_violation = value.cannabisFlags.legalAreaViolation;
        delete updatePayload.cannabisFlags;
      }

      await moderationCase.update(updatePayload);

      // Create audit log for changes
      if (Object.keys(changes).length > 0) {
        await AuditLog.create({
          action_type: 'admin_action',
          actor_user_id: moderatorId,
          target_user_id: moderationCase.target_user_id,
          guild_id: moderationCase.guild_id,
          details: {
            admin_action: 'moderation_case_update',
            case_number: moderationCase.case_number,
            changes
          },
          severity: 'medium',
          compliance_flag: true
        });
      }

      return {
        success: true,
        case: moderationCase,
        changes
      };

    } catch (error) {
      console.error('[ModerationService] Error updating case:', error.message);
      throw error;
    }
  }

  /**
   * Process an appeal for a moderation case
   * @param {string} caseId - Case ID to appeal
   * @param {string} appealReason - User's appeal reason
   * @param {string} userId - ID of user making appeal
   * @returns {Promise<Object>} - Appeal submission result
   */
  async submitAppeal(caseId, appealReason, userId) {
    try {
      const moderationCase = await ModerationCase.findByPk(caseId);
      if (!moderationCase) {
        throw new Error('Moderation case not found');
      }

      if (moderationCase.target_user_id !== userId) {
        throw new Error('You can only appeal your own cases');
      }

      if (moderationCase.appeal_status !== 'NONE') {
        throw new Error('This case has already been appealed');
      }

      await moderationCase.update({
        appeal_status: 'PENDING',
        appeal_reason: appealReason,
        appealed_at: new Date()
      });

      // Create audit log for appeal submission
      await AuditLog.create({
        action_type: 'user_action',
        actor_user_id: userId,
        target_user_id: userId,
        guild_id: moderationCase.guild_id,
        details: {
          action: 'appeal_submitted',
          case_number: moderationCase.case_number,
          appeal_reason: appealReason
        },
        severity: 'medium',
        compliance_flag: true
      });

      return {
        success: true,
        case: moderationCase,
        message: 'Appeal submitted successfully. Staff will review your case.'
      };

    } catch (error) {
      console.error('[ModerationService] Error submitting appeal:', error.message);
      throw error;
    }
  }

  /**
   * Validate moderator permissions for action type
   * @param {Object} moderator - Discord member object
   * @param {string} actionType - Type of moderation action
   * @throws {Error} If moderator lacks required permissions
   */
  async validateModeratorPermissions(moderator, actionType) {
    const requiredPerms = this.permissionMap[actionType];
    if (!requiredPerms) {
      throw new Error(`Unknown action type: ${actionType}`);
    }

    const hasPermissions = requiredPerms.every(perm => 
      moderator.permissions.has(perm)
    );

    if (!hasPermissions) {
      const permNames = requiredPerms.map(perm => 
        Object.keys(PermissionsBitField.Flags).find(key => 
          PermissionsBitField.Flags[key] === perm
        )
      );
      throw new Error(`Missing required permissions: ${permNames.join(', ')}`);
    }
  }

  /**
   * Validate target user and get cannabis compliance data
   * @param {string} userId - Discord user ID
   * @param {string} guildId - Discord guild ID
   * @returns {Promise<Object>} - User data with compliance info
   */
  async validateTargetUser(userId, guildId) {
    const user = await User.findOne({
      where: { discord_id: userId, guild_id: guildId }
    });

    if (!user) {
      // Create user record if doesn't exist (for new members)
      const newUser = await User.create({
        discord_id: userId,
        guild_id: guildId,
        username: 'Unknown User',
        verification_status: 'pending',
        is_21_plus: false
      });
      return newUser;
    }

    return user;
  }

  /**
   * Auto-detect cannabis compliance flags based on user data and action context
   * @param {Object} user - User model instance
   * @param {string} actionType - Type of moderation action
   * @param {string} reason - Moderation reason
   * @param {Object} providedFlags - Manually provided flags
   * @returns {Object} - Enhanced cannabis compliance flags
   */
  async detectCannabisComplianceFlags(user, actionType, reason, providedFlags) {
    const flags = { ...providedFlags };

    // Auto-flag age-related if user is not 21+
    if (!user.is_21_plus && actionType !== 'NOTE') {
      flags.ageRelated = true;
    }

    // Detect educational violations in reason text
    const educationalKeywords = [
      'educational', 'misinformation', 'medical advice', 'dosage', 'treatment',
      'diagnosis', 'prescription', 'thc content', 'cbd recommendation'
    ];
    if (educationalKeywords.some(keyword => 
      reason.toLowerCase().includes(keyword)
    )) {
      flags.educationalViolation = true;
    }

    // Detect legal area violations
    const legalKeywords = [
      'cultivation', 'growing', 'distribution', 'selling', 'trafficking',
      'illegal state', 'federal', 'interstate', 'minor', 'underage'
    ];
    if (legalKeywords.some(keyword => 
      reason.toLowerCase().includes(keyword)
    )) {
      flags.legalAreaViolation = true;
    }

    return flags;
  }

  /**
   * Parse duration string to milliseconds
   * @param {string} durationStr - Duration string (e.g., "1h", "30m", "7d")
   * @returns {number|null} - Duration in milliseconds
   */
  parseDuration(durationStr) {
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
   * Validate duration requirements for action types
   * @param {string} actionType - Type of moderation action
   * @param {number|null} duration - Duration in milliseconds
   * @throws {Error} If duration requirements are not met
   */
  validateDurationRequirements(actionType, duration) {
    const temporaryActions = ['TIMEOUT', 'BAN'];
    
    if (temporaryActions.includes(actionType) && !duration) {
      throw new Error(`Duration is required for ${actionType} actions`);
    }

    if (actionType === 'TIMEOUT' && duration && duration > 28 * 24 * 60 * 60 * 1000) {
      throw new Error('Timeout duration cannot exceed 28 days');
    }
  }

  /**
   * Apply Discord action (timeout, kick, ban)
   * @param {Object} guild - Discord guild object
   * @param {string} userId - Target user ID
   * @param {string} actionType - Type of action
   * @param {string} reason - Reason for action
   * @param {number|null} duration - Duration for temporary actions
   * @returns {Promise<Object>} - Discord action result
   */
  async applyDiscordAction(guild, userId, actionType, reason, duration) {
    try {
      const member = await guild.members.fetch(userId);
      
      switch (actionType) {
        case 'TIMEOUT':
          await member.timeout(duration, reason);
          return { success: true, action: 'timeout_applied', duration };
          
        case 'KICK':
          await member.kick(reason);
          return { success: true, action: 'kick_applied' };
          
        case 'BAN':
          const banOptions = { reason };
          if (duration) {
            // Note: Discord doesn't support temporary bans directly
            // This would need additional logic to unban after duration
            banOptions.deleteMessageSeconds = 0; // Don't delete messages by default
          }
          await guild.members.ban(userId, banOptions);
          return { success: true, action: 'ban_applied', temporary: !!duration };
          
        default:
          return { success: true, action: 'no_discord_action_required' };
      }
    } catch (error) {
      console.error('[ModerationService] Discord action failed:', error.message);
      return { 
        success: false, 
        error: error.message,
        action: `${actionType.toLowerCase()}_failed`
      };
    }
  }

  /**
   * Get cannabis compliance statistics for a guild
   * @param {string} guildId - Discord guild ID
   * @returns {Promise<Object>} - Compliance statistics
   */
  async getCannabisComplianceStats(guildId) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const stats = await ModerationCase.findAll({
      where: {
        guild_id: guildId,
        created_at: { [require('sequelize').Op.gte]: thirtyDaysAgo }
      },
      attributes: [
        [require('sequelize').fn('COUNT', '*'), 'total'],
        [require('sequelize').fn('SUM', require('sequelize').cast('age_related', 'integer')), 'age_related'],
        [require('sequelize').fn('SUM', require('sequelize').cast('educational_violation', 'integer')), 'educational'],
        [require('sequelize').fn('SUM', require('sequelize').cast('legal_area_violation', 'integer')), 'legal_area']
      ],
      raw: true
    });

    return stats[0] || { total: 0, age_related: 0, educational: 0, legal_area: 0 };
  }

  /**
   * Map cannabis flag names to database field names
   * @param {string} flagName - Cannabis flag name
   * @returns {string} - Database field name
   */
  mapCannabisFlag(flagName) {
    const mapping = {
      'ageRelated': 'age_related',
      'educationalViolation': 'educational_violation', 
      'legalAreaViolation': 'legal_area_violation'
    };
    return mapping[flagName] || flagName;
  }
}

module.exports = ModerationService;