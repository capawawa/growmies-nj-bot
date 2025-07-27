/**
 * EconomyTransaction Model for GrowmiesNJ Discord Bot
 * 
 * Transaction history and audit trail for economy activities
 * Ensures complete financial transparency and cannabis compliance tracking
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../connection');

/**
 * EconomyTransaction model for all economy-related transactions
 * Immutable audit trail with cannabis compliance integration
 */
class EconomyTransaction extends Model {
  /**
   * Get formatted transaction display
   * @returns {Object} - Formatted transaction data
   */
  getFormattedDisplay() {
    return {
      id: this.id,
      type: this.transaction_type,
      amount: {
        value: this.amount,
        currency: this.currency_type,
        formatted: this.getFormattedAmount()
      },
      description: this.description,
      timestamp: this.created_at,
      success: this.success,
      reference: this.reference_id,
      metadata: this.transaction_metadata
    };
  }

  /**
   * Get formatted amount with currency symbol
   * @returns {string} - Formatted amount string
   */
  getFormattedAmount() {
    const symbols = {
      grow_coins: '🌱',
      premium_seeds: '🌟'
    };
    const symbol = symbols[this.currency_type] || '';
    return `${symbol}${this.amount.toLocaleString()}`;
  }

  /**
   * Check if transaction involves cannabis content
   * @returns {boolean} - True if cannabis-related
   */
  isCannabisRelated() {
    return this.involves_cannabis_content || 
           this.requires_21_plus || 
           this.transaction_type.includes('cannabis') ||
           this.currency_type === 'premium_seeds';
  }

  /**
   * Get transaction category for analytics
   * @returns {string} - Transaction category
   */
  getTransactionCategory() {
    const categoryMap = {
      purchase: 'spending',
      sale: 'earning',
      trade_send: 'trading',
      trade_receive: 'trading',
      gift_send: 'social',
      gift_receive: 'social',
      daily_reward: 'rewards',
      work_reward: 'work',
      quiz_reward: 'engagement',
      challenge_reward: 'engagement',
      admin_adjustment: 'admin',
      penalty: 'admin',
      refund: 'refund'
    };

    return categoryMap[this.transaction_type] || 'other';
  }

  /**
   * Get transactions by user with filters
   * @param {string} userId - Discord user ID
   * @param {string} guildId - Discord guild ID
   * @param {Object} filters - Filter options
   * @returns {Promise<EconomyTransaction[]>} - User transactions
   */
  static async getUserTransactions(userId, guildId, filters = {}) {
    const where = {
      user_id: userId,
      guild_id: guildId
    };

    // Apply filters
    if (filters.type) {
      where.transaction_type = filters.type;
    }

    if (filters.currency) {
      where.currency_type = filters.currency;
    }

    if (filters.fromDate) {
      where.created_at = {
        [sequelize.Sequelize.Op.gte]: filters.fromDate
      };
    }

    if (filters.toDate) {
      if (where.created_at) {
        where.created_at[sequelize.Sequelize.Op.lte] = filters.toDate;
      } else {
        where.created_at = {
          [sequelize.Sequelize.Op.lte]: filters.toDate
        };
      }
    }

    if (filters.minAmount) {
      where.amount = {
        [sequelize.Sequelize.Op.gte]: filters.minAmount
      };
    }

    if (filters.success !== undefined) {
      where.success = filters.success;
    }

    return await this.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: filters.limit || 50,
      offset: filters.offset || 0
    });
  }

  /**
   * Get transaction statistics for a user
   * @param {string} userId - Discord user ID
   * @param {string} guildId - Discord guild ID
   * @param {number} days - Number of days to analyze
   * @returns {Promise<Object>} - Transaction statistics
   */
  static async getUserTransactionStats(userId, guildId, days = 30) {
    const { fn, col, Op } = require('sequelize');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await this.findAll({
      where: {
        user_id: userId,
        guild_id: guildId,
        created_at: {
          [Op.gte]: startDate
        },
        success: true
      },
      attributes: [
        'transaction_type',
        'currency_type',
        [fn('COUNT', '*'), 'count'],
        [fn('SUM', col('amount')), 'total_amount'],
        [fn('AVG', col('amount')), 'avg_amount']
      ],
      group: ['transaction_type', 'currency_type'],
      raw: true
    });

    return this.processTransactionStats(stats);
  }

  /**
   * Process raw transaction statistics
   * @param {Array} rawStats - Raw statistics from database
   * @returns {Object} - Processed statistics
   */
  static processTransactionStats(rawStats) {
    const processed = {
      by_type: {},
      by_currency: {},
      totals: {
        transactions: 0,
        grow_coins: 0,
        premium_seeds: 0
      }
    };

    rawStats.forEach(stat => {
      const type = stat.transaction_type;
      const currency = stat.currency_type;
      const count = parseInt(stat.count);
      const total = parseInt(stat.total_amount) || 0;
      const avg = parseFloat(stat.avg_amount) || 0;

      // By type statistics
      if (!processed.by_type[type]) {
        processed.by_type[type] = {
          count: 0,
          grow_coins: 0,
          premium_seeds: 0
        };
      }
      processed.by_type[type].count += count;
      processed.by_type[type][currency] += total;

      // By currency statistics
      if (!processed.by_currency[currency]) {
        processed.by_currency[currency] = {
          count: 0,
          total: 0,
          average: 0
        };
      }
      processed.by_currency[currency].count += count;
      processed.by_currency[currency].total += total;
      processed.by_currency[currency].average = avg;

      // Overall totals
      processed.totals.transactions += count;
      processed.totals[currency] += total;
    });

    return processed;
  }

  /**
   * Create a new transaction record
   * @param {Object} transactionData - Transaction details
   * @returns {Promise<EconomyTransaction>} - Created transaction
   */
  static async createTransaction(transactionData) {
    const {
      userId,
      guildId,
      type,
      amount,
      currency = 'grow_coins',
      description,
      targetUserId = null,
      itemId = null,
      referenceId = null,
      metadata = {},
      requires21Plus = false,
      involvesCannabis = false
    } = transactionData;

    return await this.create({
      user_id: userId,
      guild_id: guildId,
      transaction_type: type,
      amount: Math.abs(amount), // Ensure positive amount
      currency_type: currency,
      description,
      target_user_id: targetUserId,
      item_id: itemId,
      reference_id: referenceId || this.generateReferenceId(),
      requires_21_plus: requires21Plus,
      involves_cannabis_content: involvesCannabis,
      success: true,
      transaction_metadata: {
        timestamp: new Date().toISOString(),
        ...metadata
      }
    });
  }

  /**
   * Generate unique reference ID
   * @returns {string} - Reference ID
   */
  static generateReferenceId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `TXN-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Get guild transaction summary
   * @param {string} guildId - Discord guild ID
   * @param {number} days - Number of days to analyze
   * @returns {Promise<Object>} - Guild transaction summary
   */
  static async getGuildTransactionSummary(guildId, days = 7) {
    const { fn, col, Op } = require('sequelize');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const summary = await this.findAll({
      where: {
        guild_id: guildId,
        created_at: {
          [Op.gte]: startDate
        },
        success: true
      },
      attributes: [
        [fn('COUNT', '*'), 'total_transactions'],
        [fn('COUNT', fn('DISTINCT', col('user_id'))), 'active_users'],
        [fn('SUM', 
          sequelize.literal(`CASE WHEN currency_type = 'grow_coins' THEN amount ELSE 0 END`)
        ), 'total_grow_coins'],
        [fn('SUM', 
          sequelize.literal(`CASE WHEN currency_type = 'premium_seeds' THEN amount ELSE 0 END`)
        ), 'total_premium_seeds'],
        [fn('COUNT', 
          sequelize.literal(`CASE WHEN involves_cannabis_content = true THEN 1 ELSE NULL END`)
        ), 'cannabis_transactions']
      ],
      raw: true
    });

    return summary[0] || {};
  }
}

/**
 * Initialize EconomyTransaction model with database connection
 * @param {Sequelize} sequelize - Database connection instance
 * @returns {EconomyTransaction} - Initialized EconomyTransaction model
 */
function initEconomyTransactionModel(sequelize) {
  EconomyTransaction.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: 'Unique transaction ID',
    },

    // Core Transaction Data
    user_id: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Discord user ID - primary party in transaction',
    },
    guild_id: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Discord guild/server ID',
    },
    transaction_type: {
      type: DataTypes.ENUM(
        'purchase',           // Buy item from shop
        'sale',              // Sell item back to system
        'trade_send',        // Send currency/item in trade
        'trade_receive',     // Receive currency/item in trade
        'gift_send',         // Send gift to another user
        'gift_receive',      // Receive gift from another user
        'daily_reward',      // Daily check-in reward
        'work_reward',       // Cannabis work activity reward
        'quiz_reward',       // Quiz completion reward
        'challenge_reward',  // Challenge completion reward
        'level_bonus',       // Level up bonus
        'achievement_bonus', // Achievement unlock bonus
        'admin_adjustment',  // Manual admin adjustment
        'penalty',          // Penalty for rule violation
        'refund',           // Refund for purchase
        'conversion',       // Currency conversion
        'tax',              // Trading fee/tax
        'interest'          // Interest payment
      ),
      allowNull: false,
      comment: 'Type of economic transaction',
    },

    // Amount and Currency
    amount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 0
      },
      comment: 'Transaction amount (always positive)',
    },
    currency_type: {
      type: DataTypes.ENUM('grow_coins', 'premium_seeds'),
      allowNull: false,
      defaultValue: 'grow_coins',
      comment: 'Currency type for this transaction',
    },
    effective_amount: {
      type: DataTypes.INTEGER,
      comment: 'Amount after fees/bonuses (can be negative for debits)',
    },

    // Transaction Context
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Human-readable description of transaction',
    },
    target_user_id: {
      type: DataTypes.STRING,
      comment: 'Target user for trades, gifts, etc.',
    },
    item_id: {
      type: DataTypes.UUID,
      comment: 'Economy item ID for purchase/sale transactions',
    },
    reference_id: {
      type: DataTypes.STRING,
      unique: true,
      comment: 'Unique reference ID for transaction tracking',
    },

    // Status and Validation
    success: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Whether transaction completed successfully',
    },
    status: {
      type: DataTypes.ENUM('pending', 'completed', 'failed', 'cancelled', 'reversed'),
      allowNull: false,
      defaultValue: 'completed',
      comment: 'Current transaction status',
    },
    failure_reason: {
      type: DataTypes.STRING,
      comment: 'Reason for transaction failure',
    },

    // Cannabis Compliance
    requires_21_plus: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether transaction required 21+ verification',
    },
    involves_cannabis_content: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether transaction involved cannabis-related content',
    },
    compliance_verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Whether cannabis compliance was verified',
    },

    // Administrative Data
    processed_by: {
      type: DataTypes.STRING,
      comment: 'Admin user who processed manual transactions',
    },
    admin_notes: {
      type: DataTypes.TEXT,
      comment: 'Administrative notes about transaction',
    },
    reversal_transaction_id: {
      type: DataTypes.UUID,
      comment: 'ID of transaction that reversed this one',
    },
    original_transaction_id: {
      type: DataTypes.UUID,
      comment: 'Original transaction ID if this is a reversal',
    },

    // Balances After Transaction (for audit trail)
    user_balance_after: {
      type: DataTypes.JSONB,
      comment: 'User balance snapshot after transaction',
    },
    target_user_balance_after: {
      type: DataTypes.JSONB,
      comment: 'Target user balance snapshot (for trades/gifts)',
    },

    // Fee and Tax Information
    fee_amount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Fee charged for transaction',
    },
    fee_type: {
      type: DataTypes.ENUM('flat', 'percentage', 'none'),
      defaultValue: 'none',
      comment: 'Type of fee applied',
    },
    tax_amount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Tax amount for transaction',
    },

    // Metadata and Additional Info
    transaction_metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Additional transaction metadata',
    },
    ip_address: {
      type: DataTypes.INET,
      comment: 'IP address of transaction initiator',
    },
    user_agent: {
      type: DataTypes.TEXT,
      comment: 'User agent string for web transactions',
    },

    // Timing Information
    initiated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      comment: 'When transaction was initiated',
    },
    completed_at: {
      type: DataTypes.DATE,
      comment: 'When transaction was completed',
    },
    expires_at: {
      type: DataTypes.DATE,
      comment: 'When pending transaction expires',
    },
  }, {
    sequelize,
    modelName: 'EconomyTransaction',
    tableName: 'economy_transactions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    
    indexes: [
      // Primary performance indexes
      {
        name: 'idx_economy_transactions_user',
        fields: ['user_id', 'guild_id'],
        comment: 'User transaction history',
      },
      {
        name: 'idx_economy_transactions_user_type',
        fields: ['user_id', 'transaction_type', 'created_at'],
        comment: 'User transactions by type and time',
      },
      {
        name: 'idx_economy_transactions_guild',
        fields: ['guild_id', 'created_at'],
        comment: 'Guild transaction timeline',
      },

      // Transaction type and status indexes
      {
        name: 'idx_economy_transactions_type',
        fields: ['transaction_type'],
        comment: 'Transactions by type',
      },
      {
        name: 'idx_economy_transactions_status',
        fields: ['status', 'created_at'],
        comment: 'Transaction status tracking',
      },
      {
        name: 'idx_economy_transactions_success',
        fields: ['success', 'guild_id', 'created_at'],
        comment: 'Successful transactions by guild',
      },

      // Currency and amount indexes
      {
        name: 'idx_economy_transactions_currency',
        fields: ['currency_type', 'amount'],
        comment: 'Currency-based analytics',
      },
      {
        name: 'idx_economy_transactions_amount',
        fields: ['amount'],
        comment: 'Amount-based sorting and filtering',
      },

      // Cannabis compliance indexes
      {
        name: 'idx_economy_transactions_cannabis',
        fields: ['involves_cannabis_content', 'requires_21_plus'],
        comment: 'Cannabis compliance tracking',
      },
      {
        name: 'idx_economy_transactions_21_plus',
        fields: ['requires_21_plus', 'guild_id', 'created_at'],
        where: { requires_21_plus: true },
        comment: '21+ transaction monitoring',
      },
      {
        name: 'idx_economy_transactions_compliance',
        fields: ['compliance_verified', 'involves_cannabis_content'],
        comment: 'Compliance verification status',
      },

      // Reference and relationship indexes
      {
        name: 'idx_economy_transactions_reference',
        fields: ['reference_id'],
        unique: true,
        comment: 'Unique reference ID lookup',
      },
      {
        name: 'idx_economy_transactions_target',
        fields: ['target_user_id'],
        comment: 'Target user for trades and gifts',
      },
      {
        name: 'idx_economy_transactions_item',
        fields: ['item_id'],
        comment: 'Item-related transactions',
      },

      // Administrative indexes
      {
        name: 'idx_economy_transactions_admin',
        fields: ['processed_by'],
        comment: 'Admin-processed transactions',
      },
      {
        name: 'idx_economy_transactions_reversal',
        fields: ['reversal_transaction_id', 'original_transaction_id'],
        comment: 'Transaction reversals tracking',
      },

      // Time-based indexes for analytics
      {
        name: 'idx_economy_transactions_daily',
        fields: [sequelize.literal('DATE(created_at)'), 'guild_id'],
        comment: 'Daily transaction analytics',
      },
      {
        name: 'idx_economy_transactions_recent',
        fields: ['created_at'],
        where: {
          created_at: {
            [sequelize.Sequelize.Op.gte]: sequelize.literal("NOW() - INTERVAL '30 days'")
          }
        },
        comment: 'Recent transactions (30 days)',
      },

      // Fee and tax indexes
      {
        name: 'idx_economy_transactions_fees',
        fields: ['fee_amount', 'tax_amount'],
        comment: 'Fee and tax analytics',
      },

      // Audit and compliance indexes
      {
        name: 'idx_economy_transactions_audit',
        fields: ['guild_id', 'transaction_type', 'involves_cannabis_content', 'created_at'],
        comment: 'Comprehensive audit trail index',
      },
    ],

    // Model validation rules
    validate: {
      // Ensure effective amount makes sense
      effectiveAmountValidation() {
        if (this.effective_amount !== null && Math.abs(this.effective_amount) > this.amount * 2) {
          throw new Error('Effective amount cannot be more than double the base amount');
        }
      },

      // Validate cannabis compliance
      cannabisComplianceValidation() {
        if (this.involves_cannabis_content && !this.requires_21_plus) {
          throw new Error('Cannabis content transactions must require 21+ verification');
        }
      },

      // Validate target user for relevant transaction types
      targetUserValidation() {
        const requiresTarget = ['trade_send', 'trade_receive', 'gift_send', 'gift_receive'];
        if (requiresTarget.includes(this.transaction_type) && !this.target_user_id) {
          throw new Error(`Transaction type ${this.transaction_type} requires target_user_id`);
        }
      },

      // Validate reference ID format
      referenceIdValidation() {
        if (this.reference_id && !/^TXN-[A-Z0-9]{5,20}$/i.test(this.reference_id)) {
          throw new Error('Invalid reference_id format');
        }
      },
    },

    // Model hooks for business logic
    hooks: {
      beforeCreate: async (transaction) => {
        // Auto-generate reference ID if not provided
        if (!transaction.reference_id) {
          transaction.reference_id = EconomyTransaction.generateReferenceId();
        }

        // Set initiated timestamp
        if (!transaction.initiated_at) {
          transaction.initiated_at = new Date();
        }

        // Set completed timestamp for immediate transactions
        if (transaction.status === 'completed' && !transaction.completed_at) {
          transaction.completed_at = new Date();
        }

        // Set effective amount if not provided
        if (transaction.effective_amount === null) {
          transaction.effective_amount = transaction.amount - transaction.fee_amount - transaction.tax_amount;
        }

        // Initialize metadata
        transaction.transaction_metadata = {
          created_at: new Date().toISOString(),
          version: '1.0.0',
          ...transaction.transaction_metadata
        };
      },

      beforeUpdate: async (transaction) => {
        // Update completed timestamp when status changes to completed
        if (transaction.changed('status') && transaction.status === 'completed') {
          transaction.completed_at = new Date();
        }

        // Update metadata
        if (!transaction.transaction_metadata) {
          transaction.transaction_metadata = {};
        }
        transaction.transaction_metadata.last_updated = new Date().toISOString();
      },

      // Prevent updates to maintain transaction integrity
      beforeDestroy: () => {
        throw new Error('Economy transactions cannot be deleted for audit compliance');
      },
    },
  });

  return EconomyTransaction;
}

module.exports = { EconomyTransaction, initEconomyTransactionModel };