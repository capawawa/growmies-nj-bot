/**
 * Economy Model for GrowmiesNJ Discord Bot
 * 
 * Core economy tracking for cannabis community virtual currency system
 * Manages GrowCoins and Premium Seeds with cannabis compliance integration
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../connection');

/**
 * Economy model for user currency tracking
 * Integrates with age verification and cannabis compliance
 */
class Economy extends Model {
  /**
   * Check if user can afford a purchase
   * @param {number} amount - Amount in GrowCoins
   * @param {string} currencyType - 'grow_coins' or 'premium_seeds'
   * @returns {boolean} - True if user can afford
   */
  canAfford(amount, currencyType = 'grow_coins') {
    const balance = currencyType === 'premium_seeds' ? this.premium_seeds_balance : this.grow_coins_balance;
    return balance >= amount;
  }

  /**
   * Get total currency value (for leaderboards)
   * @returns {number} - Total value in GrowCoins equivalent
   */
  getTotalValue() {
    // Premium Seeds are worth 10x GrowCoins
    return this.grow_coins_balance + (this.premium_seeds_balance * 10);
  }

  /**
   * Get formatted currency display
   * @returns {Object} - Formatted currency strings
   */
  getFormattedBalance() {
    return {
      growCoins: this.grow_coins_balance.toLocaleString(),
      premiumSeeds: this.premium_seeds_balance.toLocaleString(),
      totalValue: this.getTotalValue().toLocaleString()
    };
  }

  /**
   * Check if user has daily reward available
   * @returns {boolean} - True if daily reward is available
   */
  isDailyRewardAvailable() {
    if (!this.last_daily_reward) return true;
    
    const now = new Date();
    const lastReward = new Date(this.last_daily_reward);
    const timeDiff = now.getTime() - lastReward.getTime();
    const daysDiff = timeDiff / (1000 * 3600 * 24);
    
    return daysDiff >= 1;
  }

  /**
   * Calculate daily reward amount based on streak and 21+ status
   * @param {boolean} is21Plus - User's age verification status
   * @returns {Object} - Reward amounts
   */
  calculateDailyReward(is21Plus = false) {
    const baseGrowCoins = 50;
    const streakBonus = Math.min(this.daily_streak * 5, 100); // Max 100 bonus
    const growCoins = baseGrowCoins + streakBonus;
    
    // Premium Seeds only for 21+ users
    const premiumSeeds = is21Plus ? Math.floor(this.daily_streak / 7) + 1 : 0;
    
    return {
      growCoins,
      premiumSeeds,
      streakBonus,
      newStreak: this.daily_streak + 1
    };
  }

  /**
   * Get user economy statistics
   * @returns {Object} - Economy stats
   */
  getEconomyStats() {
    return {
      balances: this.getFormattedBalance(),
      streaks: {
        daily: this.daily_streak,
        work: this.work_streak
      },
      totals: {
        earned: this.total_grow_coins_earned,
        spent: this.total_grow_coins_spent,
        transactions: this.total_transactions,
        trades: this.total_trades_completed
      },
      activity: {
        lastDaily: this.last_daily_reward,
        lastWork: this.last_work_activity,
        lastTrade: this.last_trade_activity
      }
    };
  }

  /**
   * Get users by economy ranking
   * @param {string} guildId - Discord guild ID
   * @param {number} limit - Number of users to return
   * @returns {Promise<Economy[]>} - Top users by economy value
   */
  static async getLeaderboard(guildId, limit = 10) {
    return await this.findAll({
      where: { guild_id: guildId },
      order: [
        [sequelize.literal('(grow_coins_balance + premium_seeds_balance * 10)'), 'DESC'],
        ['total_grow_coins_earned', 'DESC']
      ],
      limit,
      include: [{
        model: sequelize.models.User,
        as: 'user',
        attributes: ['discord_id', 'username', 'display_name', 'current_level', 'level_tier'],
        where: { is_active: true }
      }]
    });
  }

  /**
   * Get economy statistics for a guild
   * @param {string} guildId - Discord guild ID
   * @returns {Promise<Object>} - Guild economy statistics
   */
  static async getGuildEconomyStats(guildId) {
    const { fn, col } = require('sequelize');
    
    const stats = await this.findAll({
      where: { guild_id: guildId },
      attributes: [
        [fn('COUNT', '*'), 'total_users'],
        [fn('SUM', col('grow_coins_balance')), 'total_grow_coins'],
        [fn('SUM', col('premium_seeds_balance')), 'total_premium_seeds'],
        [fn('SUM', col('total_grow_coins_earned')), 'total_earned'],
        [fn('SUM', col('total_grow_coins_spent')), 'total_spent'],
        [fn('SUM', col('total_transactions')), 'total_transactions'],
        [fn('AVG', col('daily_streak')), 'avg_daily_streak']
      ],
      raw: true
    });

    return stats[0] || {};
  }
}

/**
 * Initialize Economy model with database connection
 * @param {Sequelize} sequelize - Database connection instance
 * @returns {Economy} - Initialized Economy model
 */
function initEconomyModel(sequelize) {
  Economy.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: 'Unique economy record ID',
    },
    user_id: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Discord user ID - foreign key to users table',
    },
    guild_id: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Discord guild/server ID',
    },
    
    // Primary Currency - GrowCoins
    grow_coins_balance: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 100, // Starting balance
      validate: {
        min: 0
      },
      comment: 'Current GrowCoins balance - primary virtual currency',
    },
    total_grow_coins_earned: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 100, // Includes starting balance
      comment: 'Total GrowCoins earned throughout user lifetime',
    },
    total_grow_coins_spent: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Total GrowCoins spent on purchases and activities',
    },
    
    // Premium Currency - Premium Seeds (21+ only)
    premium_seeds_balance: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      },
      comment: 'Premium Seeds balance - special currency for 21+ cannabis items',
    },
    total_premium_seeds_earned: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Total Premium Seeds earned (21+ only)',
    },
    total_premium_seeds_spent: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Total Premium Seeds spent on premium items',
    },
    
    // Daily Reward System
    daily_streak: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Current consecutive daily reward streak',
    },
    max_daily_streak: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Highest daily streak achieved',
    },
    last_daily_reward: {
      type: DataTypes.DATE,
      comment: 'Last time user claimed daily reward',
    },
    total_daily_rewards: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Total number of daily rewards claimed',
    },
    
    // Work Activity System
    work_streak: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Current consecutive work activity streak',
    },
    last_work_activity: {
      type: DataTypes.DATE,
      comment: 'Last time user performed work activity',
    },
    total_work_completed: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Total number of work activities completed',
    },
    favorite_work_type: {
      type: DataTypes.ENUM('budtender', 'grower', 'educator', 'community_helper'),
      comment: 'User\'s most frequently performed work type',
    },
    
    // Trading System
    total_transactions: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Total number of economy transactions',
    },
    total_trades_completed: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Total successful trades with other users',
    },
    last_trade_activity: {
      type: DataTypes.DATE,
      comment: 'Last time user completed a trade',
    },
    trade_reputation: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 100,
      comment: 'Trading reputation score (0-1000)',
    },
    
    // Achievement Integration
    achievement_bonus_earned: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Total currency earned from achievement bonuses',
    },
    quiz_bonus_earned: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Total currency earned from quiz completions',
    },
    challenge_bonus_earned: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Total currency earned from challenge participation',
    },
    
    // Cannabis Compliance
    cannabis_purchases_made: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Number of cannabis-related purchases (21+ tracking)',
    },
    cannabis_currency_earned: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Currency earned from cannabis-related activities',
    },
    
    // Economy Status
    is_economy_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Whether user\'s economy account is active',
    },
    economy_notes: {
      type: DataTypes.TEXT,
      comment: 'Admin notes about user\'s economy account',
    },
    economy_metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Additional economy-related metadata',
    },
  }, {
    sequelize,
    modelName: 'Economy',
    tableName: 'economies',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    
    indexes: [
      // Primary performance indexes
      {
        name: 'idx_economy_user_guild',
        fields: ['user_id', 'guild_id'],
        unique: true,
        comment: 'Unique economy record per user per guild',
      },
      {
        name: 'idx_economy_guild',
        fields: ['guild_id'],
        comment: 'Guild-based economy queries',
      },
      {
        name: 'idx_economy_active',
        fields: ['is_economy_active'],
        where: { is_economy_active: true },
        comment: 'Active economy accounts only',
      },
      
      // Currency balance indexes for leaderboards
      {
        name: 'idx_economy_grow_coins',
        fields: ['grow_coins_balance'],
        comment: 'GrowCoins balance sorting',
      },
      {
        name: 'idx_economy_premium_seeds',
        fields: ['premium_seeds_balance'],
        comment: 'Premium Seeds balance sorting',
      },
      {
        name: 'idx_economy_total_value',
        fields: [sequelize.literal('(grow_coins_balance + premium_seeds_balance * 10)')],
        comment: 'Total economy value for leaderboards',
      },
      {
        name: 'idx_economy_guild_leaderboard',
        fields: ['guild_id', sequelize.literal('(grow_coins_balance + premium_seeds_balance * 10)')],
        comment: 'Guild-specific leaderboard performance',
      },
      
      // Activity tracking indexes
      {
        name: 'idx_economy_daily_streak',
        fields: ['daily_streak'],
        comment: 'Daily streak leaderboards',
      },
      {
        name: 'idx_economy_last_daily',
        fields: ['last_daily_reward'],
        where: { last_daily_reward: { [sequelize.Sequelize.Op.ne]: null } },
        comment: 'Daily reward eligibility checks',
      },
      {
        name: 'idx_economy_last_work',
        fields: ['last_work_activity'],
        where: { last_work_activity: { [sequelize.Sequelize.Op.ne]: null } },
        comment: 'Work activity tracking',
      },
      {
        name: 'idx_economy_trade_reputation',
        fields: ['trade_reputation'],
        comment: 'Trading reputation sorting',
      },
      
      // Cannabis compliance indexes
      {
        name: 'idx_economy_cannabis_purchases',
        fields: ['cannabis_purchases_made'],
        comment: 'Cannabis purchase tracking for compliance',
      },
      {
        name: 'idx_economy_cannabis_activity',
        fields: ['guild_id', 'cannabis_purchases_made', 'cannabis_currency_earned'],
        comment: 'Cannabis activity analytics',
      },
    ],

    // Model validation rules
    validate: {
      // Ensure balances are non-negative
      positiveBalances() {
        if (this.grow_coins_balance < 0) {
          throw new Error('GrowCoins balance cannot be negative');
        }
        if (this.premium_seeds_balance < 0) {
          throw new Error('Premium Seeds balance cannot be negative');
        }
      },

      // Validate earned >= spent
      earnedSpentConsistency() {
        if (this.total_grow_coins_earned < this.total_grow_coins_spent) {
          throw new Error('Total earned cannot be less than total spent');
        }
        if (this.total_premium_seeds_earned < this.total_premium_seeds_spent) {
          throw new Error('Total Premium Seeds earned cannot be less than spent');
        }
      },

      // Validate trade reputation range
      tradeReputationRange() {
        if (this.trade_reputation < 0 || this.trade_reputation > 1000) {
          throw new Error('Trade reputation must be between 0 and 1000');
        }
      },
    },

    // Model hooks for business logic
    hooks: {
      beforeCreate: async (economy) => {
        // Set initial values
        economy.total_grow_coins_earned = economy.grow_coins_balance || 100;
        economy.economy_metadata = {
          created_at: new Date().toISOString(),
          initial_balance: economy.grow_coins_balance || 100,
          economy_version: '1.0.0'
        };
      },

      beforeUpdate: async (economy) => {
        // Update max streak if current is higher
        if (economy.daily_streak > economy.max_daily_streak) {
          economy.max_daily_streak = economy.daily_streak;
        }
        
        // Update metadata
        if (!economy.economy_metadata) {
          economy.economy_metadata = {};
        }
        economy.economy_metadata.last_updated = new Date().toISOString();
      },

      afterUpdate: async (economy) => {
        // Update user's favorite work type based on activity
        if (economy.changed('total_work_completed')) {
          // This would be implemented based on work activity tracking
          // For now, we'll just update the metadata
          economy.economy_metadata.work_activities_updated = new Date().toISOString();
        }
      },
    },
  });

  return Economy;
}

module.exports = { Economy, initEconomyModel };