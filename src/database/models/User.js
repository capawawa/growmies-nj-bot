/**
 * User Model for GrowmiesNJ Discord Bot
 * 
 * Phase 3A: Age verification core table for 21+ cannabis community compliance
 * Stores Discord user verification status with audit trails
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../connection');

/**
 * User model for age verification system
 * Critical for legal compliance in cannabis industry
 */
class User extends Model {
  /**
   * Check if user verification has expired
   * @returns {boolean} - True if verification is expired
   */
  isVerificationExpired() {
    if (!this.verification_expires) return false;
    return new Date() > this.verification_expires;
  }

  /**
   * Get time until verification expires
   * @returns {number|null} - Days until expiration, null if no expiration
   */
  getDaysUntilExpiration() {
    if (!this.verification_expires) return null;
    const now = new Date();
    const diffTime = this.verification_expires - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Check if user can attempt verification (rate limiting)
   * @returns {boolean} - True if can attempt verification
   */
  canAttemptVerification() {
    if (this.verification_attempts >= 5) {
      // Check if 24 hours have passed since last attempt
      if (this.last_attempt_at) {
        const daysSinceLastAttempt = (new Date() - this.last_attempt_at) / (1000 * 60 * 60 * 24);
        return daysSinceLastAttempt >= 1;
      }
      return false;
    }
    return true;
  }

  /**
   * Find users with expiring verifications
   * @param {number} days - Days until expiration threshold
   * @returns {Promise<User[]>} - Users with expiring verifications
   */
  static async findExpiringVerifications(days = 30) {
    const { Op } = require('@sequelize/core');
    const expirationThreshold = new Date();
    expirationThreshold.setDate(expirationThreshold.getDate() + days);
    
    return await this.findAll({
      where: {
        verification_status: 'verified',
        verification_expires: {
          [Op.lte]: expirationThreshold,
        },
        is_active: true,
      },
    });
  }

  /**
   * Get verification statistics for a guild
   * @param {string} guildId - Discord guild ID
   * @returns {Promise<Object>} - Verification statistics
   */
  static async getVerificationStats(guildId) {
    const { fn } = require('@sequelize/core');
    const stats = await this.findAll({
      where: { guild_id: guildId, is_active: true },
      attributes: [
        'verification_status',
        [fn('COUNT', '*'), 'count'],
      ],
      group: ['verification_status'],
      raw: true,
    });

    return stats.reduce((acc, stat) => {
      acc[stat.verification_status] = parseInt(stat.count);
      return acc;
    }, {});
  }
}

/**
 * Initialize User model with database connection
 * @param {Sequelize} sequelize - Database connection instance
 * @returns {User} - Initialized User model
 */
function initUserModel(sequelize) {
  User.init({
    discord_id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
      comment: 'Discord user ID (primary key)',
    },
    guild_id: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Discord server/guild ID',
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Discord username for reference',
    },
    display_name: {
      type: DataTypes.STRING,
      comment: 'Discord display name',
    },
    verification_status: {
      type: DataTypes.ENUM('pending', 'verified', 'rejected', 'expired'),
      allowNull: false,
      defaultValue: 'pending',
      comment: 'Current verification status',
    },
    verified_at: {
      type: DataTypes.DATE,
      comment: 'Timestamp when verification was completed',
    },
    verification_expires: {
      type: DataTypes.DATE,
      comment: 'When verification expires (annual renewal)',
    },
    verification_method: {
      type: DataTypes.STRING,
      comment: 'How they verified (upload, manual, etc.)',
    },
    birth_year: {
      type: DataTypes.STRING,
      comment: 'Birth year for 21+ verification (privacy protection)',
    },
    is_21_plus: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Confirmed 21+ status',
    },
    verified_by_user_id: {
      type: DataTypes.STRING,
      comment: 'Discord ID of admin who verified (if manual)',
    },
    verification_notes: {
      type: DataTypes.TEXT,
      comment: 'Admin notes about verification',
    },
    verification_metadata: {
      type: DataTypes.JSONB,
      comment: 'Additional verification data (IP, user agent, etc.)',
    },
    assigned_roles: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
      comment: 'Discord roles assigned upon verification',
    },
    verification_attempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Number of failed attempts',
    },
    last_attempt_at: {
      type: DataTypes.DATE,
      comment: 'Last verification attempt timestamp',
    },
    verification_token: {
      type: DataTypes.STRING,
      unique: true,
      comment: 'Unique token for verification process',
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Account status (for soft deletion)',
    },
    last_known_ip: {
      type: DataTypes.INET,
      comment: 'Last known IP address for security',
    },
    last_activity_at: {
      type: DataTypes.DATE,
      comment: 'Last time user was active',
    },
    privacy_acknowledgment: {
      type: DataTypes.TEXT,
      comment: 'Legal privacy policy acknowledgment',
    },
    terms_accepted_at: {
      type: DataTypes.DATE,
      comment: 'When terms of service were accepted',
    },

    // Leveling System Fields - Cannabis-themed progression tracking
    total_xp: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Total experience points earned through community activity',
    },
    current_level: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Current cannabis progression level (1-100+)',
    },
    level_tier: {
      type: DataTypes.ENUM('Seedling', 'Growing', 'Established', 'Harvested'),
      allowNull: false,
      defaultValue: 'Seedling',
      comment: 'Current cannabis-themed tier based on level',
    },
    last_xp_gain: {
      type: DataTypes.DATE,
      comment: 'Last time user gained XP (for anti-spam cooldown)',
    },
    messages_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Total messages sent for progression tracking',
    },
    voice_time_minutes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Total voice channel time in minutes',
    },
    reactions_received: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Total helpful reactions received from community',
    },
    level_up_notifications: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Whether user wants level-up celebration messages',
    },
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    
    indexes: [
      {
        name: 'idx_user_guild',
        fields: ['guild_id'],
      },
      {
        name: 'idx_verification_status',
        fields: ['verification_status'],
      },
      {
        name: 'idx_verification_token',
        fields: ['verification_token'],
        unique: true,
      },
      {
        name: 'idx_user_active',
        fields: ['is_active'],
      },
      {
        name: 'idx_user_21_plus',
        fields: ['is_21_plus'],
      },
      {
        name: 'idx_verification_expires',
        fields: ['verification_expires'],
      },
      
      // Leveling System Indexes - Optimized for XP tracking and leaderboards
      {
        name: 'idx_total_xp',
        fields: ['total_xp'],
        comment: 'Fast leaderboard queries by XP',
      },
      {
        name: 'idx_current_level',
        fields: ['current_level'],
        comment: 'Level-based filtering and statistics',
      },
      {
        name: 'idx_level_tier',
        fields: ['level_tier'],
        comment: 'Tier-based role management queries',
      },
      {
        name: 'idx_last_xp_gain',
        fields: ['last_xp_gain'],
        comment: 'Anti-spam cooldown verification',
      },
      {
        name: 'idx_guild_leaderboard',
        fields: ['guild_id', 'total_xp'],
        comment: 'Guild-specific leaderboard performance',
      },
      {
        name: 'idx_guild_tier_stats',
        fields: ['guild_id', 'level_tier'],
        comment: 'Guild tier distribution analytics',
      },
      {
        name: 'idx_active_leveling',
        fields: ['is_active', 'guild_id', 'total_xp'],
        comment: 'Active user leaderboards with compound filtering',
      },
    ],

    // Model validation rules
    validate: {
      // Ensure verified users have required fields
      verifiedUserValidation() {
        if (this.verification_status === 'verified') {
          if (!this.verified_at) {
            throw new Error('Verified users must have verified_at timestamp');
          }
          if (!this.is_21_plus) {
            throw new Error('Verified users must be confirmed 21+');
          }
          if (!this.birth_year) {
            throw new Error('Verified users must have birth year');
          }
        }
      },

      // Validate birth year format
      birthYearValidation() {
        if (this.birth_year) {
          const year = parseInt(this.birth_year);
          if (isNaN(year) || year < 1900 || year > new Date().getFullYear()) {
            throw new Error('Invalid birth year format');
          }
        }
      },
    },

    // Model hooks for business logic
    hooks: {
      beforeCreate: async (user) => {
        // Generate verification token
        if (!user.verification_token) {
          user.verification_token = require('crypto').randomBytes(32).toString('hex');
        }
        
        // Set initial activity timestamp
        user.last_activity_at = new Date();
      },

      beforeUpdate: async (user) => {
        // Update activity timestamp
        user.last_activity_at = new Date();
        
        // Set verification expiration (1 year from verification)
        if (user.changed('verification_status') && user.verification_status === 'verified') {
          const expirationDate = new Date();
          expirationDate.setFullYear(expirationDate.getFullYear() + 1);
          user.verification_expires = expirationDate;
        }
      },
    },
  });

  return User;
}

module.exports = { User, initUserModel };