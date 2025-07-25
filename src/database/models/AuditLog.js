/**
 * AuditLog Model for GrowmiesNJ Discord Bot
 * 
 * Phase 3A: Legal compliance audit trail for 21+ cannabis community
 * Immutable logging of all verification attempts, admin actions, and system events
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../connection');

/**
 * AuditLog model for legal compliance tracking
 * Critical for cannabis industry regulatory compliance
 */
class AuditLog extends Model {
  /**
   * Get audit logs for a specific user
   * @param {string} discordId - Discord user ID
   * @param {number} limit - Maximum number of logs to return
   * @returns {Promise<AuditLog[]>} - User's audit logs
   */
  static async getLogsForUser(discordId, limit = 50) {
    return await this.findAll({
      where: { target_user_id: discordId },
      order: [['created_at', 'DESC']],
      limit,
    });
  }

  /**
   * Get audit logs for a specific guild
   * @param {string} guildId - Discord guild ID
   * @param {number} limit - Maximum number of logs to return
   * @returns {Promise<AuditLog[]>} - Guild's audit logs
   */
  static async getLogsForGuild(guildId, limit = 100) {
    return await this.findAll({
      where: { guild_id: guildId },
      order: [['created_at', 'DESC']],
      limit,
    });
  }

  /**
   * Get audit logs by action type
   * @param {string} actionType - Type of action to filter
   * @param {string} guildId - Optional guild filter
   * @param {number} limit - Maximum number of logs to return
   * @returns {Promise<AuditLog[]>} - Filtered audit logs
   */
  static async getLogsByAction(actionType, guildId = null, limit = 100) {
    const where = { action_type: actionType };
    if (guildId) where.guild_id = guildId;

    return await this.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit,
    });
  }

  /**
   * Get verification failure statistics
   * @param {string} guildId - Discord guild ID
   * @param {number} days - Number of days to look back
   * @returns {Promise<Object>} - Failure statistics
   */
  static async getVerificationFailureStats(guildId, days = 30) {
    const { Op, fn, col } = require('@sequelize/core');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return await this.findAll({
      where: {
        guild_id: guildId,
        action_type: 'verification_failure',
        created_at: {
          [Op.gte]: startDate,
        },
      },
      attributes: [
        [fn('DATE', col('created_at')), 'date'],
        [fn('COUNT', '*'), 'count'],
      ],
      group: [fn('DATE', col('created_at'))],
      order: [[fn('DATE', col('created_at')), 'ASC']],
      raw: true,
    });
  }

  /**
   * Log a verification attempt
   * @param {string} discordId - Target user Discord ID
   * @param {string} guildId - Discord guild ID
   * @param {string} actorId - Acting user Discord ID
   * @param {string} result - 'success' or 'failure'
   * @param {Object} metadata - Additional log data
   * @returns {Promise<AuditLog>} - Created audit log
   */
  static async logVerificationAttempt(discordId, guildId, actorId, result, metadata = {}) {
    const actionType = result === 'success' ? 'verification_success' : 'verification_failure';
    
    return await this.create({
      action_type: actionType,
      target_user_id: discordId,
      actor_user_id: actorId,
      guild_id: guildId,
      ip_address: metadata.ip_address,
      user_agent: metadata.user_agent,
      details: {
        verification_method: metadata.verification_method,
        failure_reason: metadata.failure_reason,
        attempt_number: metadata.attempt_number,
        ...metadata,
      },
    });
  }

  /**
   * Log an admin action
   * @param {string} actorId - Admin Discord ID
   * @param {string} guildId - Discord guild ID
   * @param {string} action - Admin action performed
   * @param {string} targetId - Target user Discord ID (optional)
   * @param {Object} metadata - Additional log data
   * @returns {Promise<AuditLog>} - Created audit log
   */
  static async logAdminAction(actorId, guildId, action, targetId = null, metadata = {}) {
    return await this.create({
      action_type: 'admin_action',
      actor_user_id: actorId,
      target_user_id: targetId,
      guild_id: guildId,
      details: {
        admin_action: action,
        ...metadata,
      },
    });
  }

  /**
   * Log a role assignment
   * @param {string} discordId - Target user Discord ID
   * @param {string} guildId - Discord guild ID
   * @param {string} actorId - Acting user Discord ID
   * @param {string[]} roles - Roles assigned
   * @param {Object} metadata - Additional log data
   * @returns {Promise<AuditLog>} - Created audit log
   */
  static async logRoleAssignment(discordId, guildId, actorId, roles, metadata = {}) {
    return await this.create({
      action_type: 'role_assignment',
      target_user_id: discordId,
      actor_user_id: actorId,
      guild_id: guildId,
      details: {
        roles_assigned: roles,
        reason: metadata.reason || 'Age verification completed',
        ...metadata,
      },
    });
  }
}

/**
 * Initialize AuditLog model with database connection
 * @param {Sequelize} sequelize - Database connection instance
 * @returns {AuditLog} - Initialized AuditLog model
 */
function initAuditLogModel(sequelize) {
  AuditLog.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: 'Unique audit log entry ID',
    },
    action_type: {
      type: DataTypes.ENUM(
        'verification_attempt',
        'verification_success', 
        'verification_failure',
        'role_assignment',
        'role_removal',
        'admin_action',
        'user_join',
        'user_leave',
        'settings_change',
        'bot_action',
        'security_event'
      ),
      allowNull: false,
      comment: 'Type of action that was performed',
    },
    target_user_id: {
      type: DataTypes.STRING,
      comment: 'Discord ID of user being acted upon',
    },
    actor_user_id: {
      type: DataTypes.STRING,
      comment: 'Discord ID of user performing the action',
    },
    guild_id: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Discord guild/server ID where action occurred',
    },
    ip_address: {
      type: DataTypes.INET,
      comment: 'IP address of the actor (for security)',
    },
    user_agent: {
      type: DataTypes.TEXT,
      comment: 'User agent string (for web-based actions)',
    },
    session_id: {
      type: DataTypes.STRING,
      comment: 'Session identifier for tracking related actions',
    },
    details: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Additional structured data about the action',
    },
    severity: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      defaultValue: 'medium',
      comment: 'Severity level of the logged action',
    },
    success: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Whether the action was successful',
    },
    error_message: {
      type: DataTypes.TEXT,
      comment: 'Error message if action failed',
    },
    retention_period: {
      type: DataTypes.INTEGER,
      defaultValue: 2555, // 7 years in days for legal compliance
      comment: 'Days to retain this log entry',
    },
    is_sensitive: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Contains sensitive data requiring special handling',
    },
    compliance_flag: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Required for regulatory compliance',
    },
  }, {
    sequelize,
    modelName: 'AuditLog',
    tableName: 'audit_logs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false, // Audit logs are immutable after creation
    underscored: true,
    
    indexes: [
      {
        name: 'idx_audit_action_type',
        fields: ['action_type'],
      },
      {
        name: 'idx_audit_target_user',
        fields: ['target_user_id'],
      },
      {
        name: 'idx_audit_actor_user',
        fields: ['actor_user_id'],
      },
      {
        name: 'idx_audit_guild',
        fields: ['guild_id'],
      },
      {
        name: 'idx_audit_created_at',
        fields: ['created_at'],
      },
      {
        name: 'idx_audit_severity',
        fields: ['severity'],
      },
      {
        name: 'idx_audit_compliance',
        fields: ['compliance_flag'],
      },
      {
        name: 'idx_audit_guild_action_time',
        fields: ['guild_id', 'action_type', 'created_at'],
      },
      {
        name: 'idx_audit_user_time',
        fields: ['target_user_id', 'created_at'],
      },
    ],

    // Model validation rules
    validate: {
      // Ensure actor or system action is specified
      actorValidation() {
        if (!this.actor_user_id && !['bot_action', 'security_event'].includes(this.action_type)) {
          throw new Error('Actor user ID required for user-initiated actions');
        }
      },

      // Ensure target user for user-specific actions
      targetValidation() {
        const userActions = [
          'verification_attempt', 
          'verification_success', 
          'verification_failure',
          'role_assignment', 
          'role_removal'
        ];
        if (userActions.includes(this.action_type) && !this.target_user_id) {
          throw new Error('Target user ID required for user-specific actions');
        }
      },
    },

    // Model hooks for audit trail integrity
    hooks: {
      beforeCreate: async (log) => {
        // Generate session ID if not provided
        if (!log.session_id) {
          log.session_id = require('crypto').randomBytes(16).toString('hex');
        }

        // Set severity based on action type
        if (!log.severity) {
          const criticalActions = ['verification_failure', 'security_event', 'admin_action'];
          const highActions = ['verification_success', 'role_assignment'];
          
          if (criticalActions.includes(log.action_type)) {
            log.severity = 'critical';
          } else if (highActions.includes(log.action_type)) {
            log.severity = 'high';
          }
        }

        // Mark sensitive actions
        if (['verification_attempt', 'verification_success', 'verification_failure'].includes(log.action_type)) {
          log.is_sensitive = true;
        }
      },

      // Prevent updates to maintain audit integrity
      beforeUpdate: () => {
        throw new Error('Audit logs are immutable and cannot be updated');
      },

      // Prevent deletion to maintain audit integrity
      beforeDestroy: () => {
        throw new Error('Audit logs cannot be deleted for compliance reasons');
      },
    },
  });

  return AuditLog;
}

module.exports = { AuditLog, initAuditLogModel };