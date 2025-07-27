/**
 * Economy Service for GrowmiesNJ Discord Bot
 * 
 * Core service for managing virtual currency, transactions, and cannabis compliance
 * Handles GrowCoins, Premium Seeds, shop purchases, trading, and work activities
 */

const { Economy } = require('../database/models/Economy');
const { EconomyItem } = require('../database/models/EconomyItem');
const { EconomyTransaction } = require('../database/models/EconomyTransaction');
const { UserInventory } = require('../database/models/UserInventory');
const { EconomyShop } = require('../database/models/EconomyShop');
const { User } = require('../database/models/User');
const { AuditLog } = require('../database/models/AuditLog');
// Import existing services for integration
const EngagementService = require('./engagementService');
const { XPCalculationService } = require('./xpCalculation');
const { AgeVerificationService } = require('./ageVerification');
const { sequelize } = require('../database/connection');

/**
 * Economy Service Class
 * Manages all economic activities with cannabis compliance and audit trails
 */
class EconomyService {
  constructor() {
    this.DAILY_REWARD_COOLDOWN = 20 * 60 * 60 * 1000; // 20 hours in milliseconds
    this.WORK_COOLDOWN = 4 * 60 * 60 * 1000; // 4 hours in milliseconds
    this.TRADE_FEE_PERCENTAGE = 5; // 5% trading fee
    this.MAX_DAILY_STREAK = 365; // Maximum daily streak
    this.STARTING_BALANCE = 100; // Starting GrowCoins balance
    
    // Initialize XP service instance
    this.xpService = new XPCalculationService();
    this.ageVerificationService = new AgeVerificationService();
  }

  /**
   * Get or create user economy record
   * @param {string} userId - Discord user ID
   * @param {string} guildId - Discord guild ID
   * @returns {Promise<Economy>} - User economy record
   */
  async getOrCreateUserEconomy(userId, guildId) {
    try {
      let [economy, created] = await Economy.findOrCreate({
        where: {
          user_id: userId,
          guild_id: guildId
        },
        defaults: {
          grow_coins_balance: this.STARTING_BALANCE,
          total_grow_coins_earned: this.STARTING_BALANCE,
          premium_seeds_balance: 0,
          total_premium_seeds_earned: 0,
          economy_metadata: {
            created_at: new Date().toISOString(),
            starting_balance: this.STARTING_BALANCE
          }
        }
      });

      if (created) {
        console.log(`📊 Created new economy record for user ${userId} in guild ${guildId}`);
        
        // Log economy creation
        await AuditLog.create({
          user_id: userId,
          guild_id: guildId,
          action_type: 'bot_action',
          target_type: 'economy',
          details: {
            action: 'economy_account_created',
            starting_balance: this.STARTING_BALANCE,
            currency_type: 'grow_coins'
          }
        });
      }

      return economy;
    } catch (error) {
      console.error('Error getting/creating user economy:', error);
      throw new Error('Failed to access user economy account');
    }
  }

  /**
   * Process currency transaction with validation and audit trail
   * @param {Object} transactionData - Transaction details
   * @returns {Promise<Object>} - Transaction result
   */
  async processTransaction(transactionData) {
    const transaction = await sequelize.transaction();
    
    try {
      const {
        userId,
        guildId,
        type,
        amount,
        currency = 'grow_coins',
        description,
        targetUserId = null,
        itemId = null,
        metadata = {},
        requiresAgeVerification = false,
        involvesCannabis = false
      } = transactionData;

      // Get user and validate
      const [user, economy] = await Promise.all([
        User.findOne({ where: { discord_id: userId, guild_id: guildId } }),
        this.getOrCreateUserEconomy(userId, guildId)
      ]);

      if (!user) {
        throw new Error('User not found');
      }

      // Validate cannabis compliance
      if (involvesCannabis || requiresAgeVerification) {
        if (!user.is_21_plus) {
          throw new Error('21+ age verification required for this transaction');
        }
      }

      // Validate transaction amount
      if (amount <= 0) {
        throw new Error('Transaction amount must be positive');
      }

      // Process based on transaction type
      const isDebit = ['purchase', 'trade_send', 'gift_send', 'penalty', 'tax'].includes(type);
      const isCredit = ['sale', 'trade_receive', 'gift_receive', 'daily_reward', 'work_reward', 'quiz_reward', 'admin_adjustment'].includes(type);

      if (!isDebit && !isCredit) {
        throw new Error(`Unknown transaction type: ${type}`);
      }

      // Check balance for debit transactions
      if (isDebit) {
        const currentBalance = currency === 'premium_seeds' ? economy.premium_seeds_balance : economy.grow_coins_balance;
        if (currentBalance < amount) {
          throw new Error(`Insufficient ${currency} balance`);
        }
      }

      // Calculate new balances
      const balanceChange = isDebit ? -amount : amount;
      const newBalance = {
        grow_coins: economy.grow_coins_balance,
        premium_seeds: economy.premium_seeds_balance
      };
      newBalance[currency] += balanceChange;

      // Update economy record
      const economyUpdate = {
        [`${currency}_balance`]: newBalance[currency]
      };

      if (isCredit) {
        economyUpdate[`total_${currency}_earned`] = economy[`total_${currency}_earned`] + amount;
      } else {
        economyUpdate[`total_${currency}_spent`] = economy[`total_${currency}_spent`] + amount;
      }

      economyUpdate.total_transactions = economy.total_transactions + 1;
      economyUpdate.economy_metadata = {
        ...economy.economy_metadata,
        last_transaction: new Date().toISOString(),
        last_transaction_type: type
      };

      await economy.update(economyUpdate, { transaction });

      // Create transaction record
      const transactionRecord = await EconomyTransaction.createTransaction({
        userId,
        guildId,
        type,
        amount,
        currency,
        description,
        targetUserId,
        itemId,
        metadata: {
          ...metadata,
          balance_after: newBalance,
          is_cannabis_related: involvesCannabis,
          requires_21_plus: requiresAgeVerification
        },
        requires21Plus: requiresAgeVerification,
        involvesCannabis
      });

      await transaction.commit();

      console.log(`💰 Transaction processed: ${type} - ${amount} ${currency} for user ${userId}`);

      return {
        success: true,
        transaction: transactionRecord,
        newBalance: newBalance[currency],
        balanceChange,
        economy: economy
      };

    } catch (error) {
      await transaction.rollback();
      console.error('Transaction failed:', error);
      throw error;
    }
  }

  /**
   * Purchase item from shop
   * @param {string} userId - Discord user ID
   * @param {string} guildId - Discord guild ID
   * @param {string} itemId - Economy item ID
   * @param {number} quantity - Quantity to purchase
   * @returns {Promise<Object>} - Purchase result
   */
  async purchaseItem(userId, guildId, itemId, quantity = 1) {
    try {
      // Get user and item data
      const [user, item] = await Promise.all([
        User.findOne({ where: { discord_id: userId, guild_id: guildId } }),
        EconomyItem.findByPk(itemId)
      ]);

      if (!user || !item) {
        throw new Error('User or item not found');
      }

      // Check item availability
      if (!item.isAvailableForUser(user)) {
        throw new Error('Item is not available for purchase');
      }

      // Check stock for limited items
      if (item.limited_quantity && item.quantity_remaining < quantity) {
        throw new Error('Insufficient stock available');
      }

      // Calculate price
      const priceInfo = item.calculatePrice(user);
      const totalCost = priceInfo.finalPrice * quantity;

      // Check user balance
      const economy = await this.getOrCreateUserEconomy(userId, guildId);
      const currentBalance = item.currency_type === 'premium_seeds' ? 
        economy.premium_seeds_balance : economy.grow_coins_balance;

      if (currentBalance < totalCost) {
        throw new Error(`Insufficient ${item.currency_type} balance`);
      }

      // Process purchase transaction
      const transactionResult = await this.processTransaction({
        userId,
        guildId,
        type: 'purchase',
        amount: totalCost,
        currency: item.currency_type,
        description: `Purchased ${quantity}x ${item.name}`,
        itemId,
        metadata: {
          item_name: item.name,
          quantity,
          unit_price: priceInfo.finalPrice,
          original_price: priceInfo.originalPrice,
          discount_applied: priceInfo.discountAmount > 0
        },
        requiresAgeVerification: item.requires_21_plus,
        involvesCannabis: item.cannabis_content
      });

      // Add item to user inventory
      const [inventoryItem, inventoryCreated] = await UserInventory.getOrCreateInventoryItem(
        userId, guildId, itemId, quantity
      );

      // Update item statistics
      await item.update({
        total_purchased: item.total_purchased + quantity,
        total_revenue: item.total_revenue + totalCost,
        quantity_remaining: item.limited_quantity ? 
          Math.max(0, item.quantity_remaining - quantity) : item.quantity_remaining
      });

      // Award XP for purchase and track engagement
      const xpAwarded = Math.floor(totalCost / 10); // 1 XP per 10 currency spent
      if (xpAwarded > 0) {
        try {
          await EngagementService.trackEngagementActivity(
            userId,
            guildId,
            'economy_purchase',
            null, // channelId - will be null for economy activities
            {
              action: 'shop_purchase',
              item_name: item.name,
              amount_spent: totalCost,
              currency: item.currency_type,
              xpEarned: xpAwarded
            }
          );
        } catch (xpError) {
          console.warn('Failed to award purchase XP:', xpError);
        }
      }

      return {
        success: true,
        item,
        quantity,
        totalCost,
        currency: item.currency_type,
        newBalance: transactionResult.newBalance,
        inventoryItem,
        xpAwarded,
        transaction: transactionResult.transaction
      };

    } catch (error) {
      console.error('Purchase failed:', error);
      throw error;
    }
  }

  /**
   * Process daily reward for user
   * @param {string} userId - Discord user ID
   * @param {string} guildId - Discord guild ID
   * @returns {Promise<Object>} - Daily reward result
   */
  async processDailyReward(userId, guildId) {
    try {
      const [user, economy] = await Promise.all([
        User.findOne({ where: { discord_id: userId, guild_id: guildId } }),
        this.getOrCreateUserEconomy(userId, guildId)
      ]);

      if (!user) {
        throw new Error('User not found');
      }

      // Check if daily reward is available
      if (!economy.isDailyRewardAvailable()) {
        const timeLeft = Math.ceil((economy.last_daily_reward.getTime() + this.DAILY_REWARD_COOLDOWN - Date.now()) / (1000 * 60 * 60));
        throw new Error(`Daily reward not available yet. Try again in ${timeLeft} hours.`);
      }

      // Calculate rewards
      const rewardData = economy.calculateDailyReward(user.is_21_plus);
      
      // Process GrowCoins reward
      const growCoinsResult = await this.processTransaction({
        userId,
        guildId,
        type: 'daily_reward',
        amount: rewardData.growCoins,
        currency: 'grow_coins',
        description: `Daily reward (streak: ${rewardData.newStreak})`,
        metadata: {
          streak: rewardData.newStreak,
          streak_bonus: rewardData.streakBonus,
          base_reward: 50
        }
      });

      let premiumSeedsResult = null;
      
      // Process Premium Seeds reward for 21+ users
      if (rewardData.premiumSeeds > 0 && user.is_21_plus) {
        premiumSeedsResult = await this.processTransaction({
          userId,
          guildId,
          type: 'daily_reward',
          amount: rewardData.premiumSeeds,
          currency: 'premium_seeds',
          description: `Daily cannabis bonus (21+)`,
          metadata: {
            streak: rewardData.newStreak,
            cannabis_bonus: true,
            age_verified: true
          },
          requiresAgeVerification: true,
          involvesCannabis: true
        });
      }

      // Update economy daily reward data
      await economy.update({
        daily_streak: rewardData.newStreak,
        last_daily_reward: new Date(),
        total_daily_rewards: economy.total_daily_rewards + 1,
        max_daily_streak: Math.max(economy.max_daily_streak, rewardData.newStreak)
      });

      // Award bonus XP for daily consistency and track engagement
      const bonusXP = Math.min(rewardData.newStreak * 2, 50); // Max 50 XP
      try {
        await EngagementService.trackEngagementActivity(
          userId,
          guildId,
          'economy_daily',
          null,
          {
            action: 'daily_reward_claimed',
            streak: rewardData.newStreak,
            grow_coins_earned: rewardData.growCoins,
            premium_seeds_earned: rewardData.premiumSeeds,
            xpEarned: bonusXP
          }
        );
      } catch (xpError) {
        console.warn('Failed to award daily XP:', xpError);
      }

      return {
        success: true,
        rewards: {
          growCoins: rewardData.growCoins,
          premiumSeeds: rewardData.premiumSeeds,
          bonusXP
        },
        streak: {
          current: rewardData.newStreak,
          isNewRecord: rewardData.newStreak > economy.max_daily_streak
        },
        transactions: {
          growCoins: growCoinsResult.transaction,
          premiumSeeds: premiumSeedsResult?.transaction
        }
      };

    } catch (error) {
      console.error('Daily reward failed:', error);
      throw error;
    }
  }

  /**
   * Process work activity for currency
   * @param {string} userId - Discord user ID
   * @param {string} guildId - Discord guild ID
   * @param {string} workType - Type of work activity
   * @returns {Promise<Object>} - Work reward result
   */
  async processWorkActivity(userId, guildId, workType) {
    try {
      const [user, economy] = await Promise.all([
        User.findOne({ where: { discord_id: userId, guild_id: guildId } }),
        this.getOrCreateUserEconomy(userId, guildId)
      ]);

      if (!user) {
        throw new Error('User not found');
      }

      // Check work cooldown
      if (economy.last_work_activity) {
        const timeSinceLastWork = Date.now() - economy.last_work_activity.getTime();
        if (timeSinceLastWork < this.WORK_COOLDOWN) {
          const timeLeft = Math.ceil((this.WORK_COOLDOWN - timeSinceLastWork) / (1000 * 60));
          throw new Error(`Work cooldown active. Try again in ${timeLeft} minutes.`);
        }
      }

      // Validate work type and age requirements
      const cannabisWorkTypes = ['budtender', 'grower'];
      const requiresAge21 = cannabisWorkTypes.includes(workType);
      
      if (requiresAge21 && !user.is_21_plus) {
        throw new Error('21+ age verification required for cannabis work activities');
      }

      // Calculate work rewards
      const baseReward = this.getWorkReward(workType);
      const streakMultiplier = Math.min(1 + (economy.work_streak * 0.1), 2.0); // Max 2x multiplier
      const levelBonus = Math.floor(user.current_level / 10) * 5; // 5 per 10 levels
      
      const growCoinsReward = Math.floor(baseReward * streakMultiplier) + levelBonus;
      let premiumSeedsReward = 0;
      
      // Cannabis work gives Premium Seeds (21+ only)
      if (requiresAge21 && user.is_21_plus) {
        premiumSeedsReward = Math.floor(growCoinsReward / 20); // 1 Premium Seed per 20 GrowCoins
      }

      // Process rewards
      const growCoinsResult = await this.processTransaction({
        userId,
        guildId,
        type: 'work_reward',
        amount: growCoinsReward,
        currency: 'grow_coins',
        description: `${workType} work completed`,
        metadata: {
          work_type: workType,
          base_reward: baseReward,
          streak_multiplier: streakMultiplier,
          level_bonus: levelBonus,
          work_streak: economy.work_streak + 1
        },
        requiresAgeVerification: requiresAge21,
        involvesCannabis: requiresAge21
      });

      let premiumSeedsResult = null;
      if (premiumSeedsReward > 0) {
        premiumSeedsResult = await this.processTransaction({
          userId,
          guildId,
          type: 'work_reward',
          amount: premiumSeedsReward,
          currency: 'premium_seeds',
          description: `${workType} cannabis work bonus`,
          metadata: {
            work_type: workType,
            cannabis_work: true,
            age_verified: true
          },
          requiresAgeVerification: true,
          involvesCannabis: true
        });
      }

      // Update work statistics
      await economy.update({
        work_streak: economy.work_streak + 1,
        last_work_activity: new Date(),
        total_work_completed: economy.total_work_completed + 1,
        favorite_work_type: workType // This could be calculated based on history
      });

      // Award work XP and track engagement
      const workXP = Math.floor(growCoinsReward / 5);
      try {
        await EngagementService.trackEngagementActivity(
          userId,
          guildId,
          'economy_work',
          null,
          {
            action: 'work_completed',
            work_type: workType,
            grow_coins_earned: growCoinsReward,
            premium_seeds_earned: premiumSeedsReward,
            work_streak: economy.work_streak + 1,
            requires_21_plus: requiresAge21,
            xpEarned: workXP
          }
        );
      } catch (xpError) {
        console.warn('Failed to award work XP:', xpError);
      }

      return {
        success: true,
        workType,
        rewards: {
          growCoins: growCoinsReward,
          premiumSeeds: premiumSeedsReward,
          xp: workXP
        },
        streak: economy.work_streak + 1,
        transactions: {
          growCoins: growCoinsResult.transaction,
          premiumSeeds: premiumSeedsResult?.transaction
        }
      };

    } catch (error) {
      console.error('Work activity failed:', error);
      throw error;
    }
  }

  /**
   * Get work reward amount by type
   * @param {string} workType - Type of work activity
   * @returns {number} - Base reward amount
   */
  getWorkReward(workType) {
    const workRewards = {
      budtender: 80,     // Cannabis sales (21+)
      grower: 120,       // Cannabis cultivation (21+)
      educator: 60,      // Community education
      community_helper: 40 // General community help
    };

    return workRewards[workType] || 30;
  }

  /**
   * Send gift to another user
   * @param {string} fromUserId - Sender user ID
   * @param {string} toUserId - Recipient user ID
   * @param {string} guildId - Discord guild ID
   * @param {number} amount - Amount to gift
   * @param {string} currency - Currency type
   * @param {string} message - Gift message
   * @returns {Promise<Object>} - Gift result
   */
  async sendGift(fromUserId, toUserId, guildId, amount, currency = 'grow_coins', message = '') {
    try {
      if (fromUserId === toUserId) {
        throw new Error('Cannot send gift to yourself');
      }

      // Get users and validate
      const [fromUser, toUser] = await Promise.all([
        User.findOne({ where: { discord_id: fromUserId, guild_id: guildId } }),
        User.findOne({ where: { discord_id: toUserId, guild_id: guildId } })
      ]);

      if (!fromUser || !toUser) {
        throw new Error('One or both users not found');
      }

      // Cannabis currency gifts require 21+ verification for both users
      if (currency === 'premium_seeds') {
        if (!fromUser.is_21_plus || !toUser.is_21_plus) {
          throw new Error('Both users must be 21+ verified to gift Premium Seeds');
        }
      }

      // Process sender transaction (debit)
      const sendResult = await this.processTransaction({
        userId: fromUserId,
        guildId,
        type: 'gift_send',
        amount,
        currency,
        description: `Gift sent to ${toUser.username}`,
        targetUserId: toUserId,
        metadata: {
          gift_message: message,
          recipient_username: toUser.username
        },
        requiresAgeVerification: currency === 'premium_seeds',
        involvesCannabis: currency === 'premium_seeds'
      });

      // Process recipient transaction (credit)
      const receiveResult = await this.processTransaction({
        userId: toUserId,
        guildId,
        type: 'gift_receive',
        amount,
        currency,
        description: `Gift received from ${fromUser.username}`,
        targetUserId: fromUserId,
        metadata: {
          gift_message: message,
          sender_username: fromUser.username
        },
        requiresAgeVerification: currency === 'premium_seeds',
        involvesCannabis: currency === 'premium_seeds'
      });

      return {
        success: true,
        amount,
        currency,
        message,
        from: {
          userId: fromUserId,
          username: fromUser.username,
          newBalance: sendResult.newBalance
        },
        to: {
          userId: toUserId,
          username: toUser.username,
          newBalance: receiveResult.newBalance
        },
        transactions: {
          send: sendResult.transaction,
          receive: receiveResult.transaction
        }
      };

    } catch (error) {
      console.error('Gift failed:', error);
      throw error;
    }
  }

  /**
   * Get economy leaderboard
   * @param {string} guildId - Discord guild ID
   * @param {string} type - Leaderboard type
   * @param {number} limit - Number of users to return
   * @returns {Promise<Array>} - Leaderboard data
   */
  async getEconomyLeaderboard(guildId, type = 'total_value', limit = 10) {
    try {
      let orderBy;
      let includeUser = true;

      switch (type) {
        case 'total_value':
          orderBy = [sequelize.literal('(grow_coins_balance + premium_seeds_balance * 10)'), 'DESC'];
          break;
        case 'grow_coins':
          orderBy = ['grow_coins_balance', 'DESC'];
          break;
        case 'premium_seeds':
          orderBy = ['premium_seeds_balance', 'DESC'];
          break;
        case 'daily_streak':
          orderBy = ['daily_streak', 'DESC'];
          break;
        case 'work_streak':
          orderBy = ['work_streak', 'DESC'];
          break;
        case 'transactions':
          orderBy = ['total_transactions', 'DESC'];
          break;
        default:
          orderBy = [sequelize.literal('(grow_coins_balance + premium_seeds_balance * 10)'), 'DESC'];
      }

      const leaderboard = await Economy.findAll({
        where: { 
          guild_id: guildId,
          is_economy_active: true
        },
        include: includeUser ? [{
          model: User,
          as: 'user',
          attributes: ['discord_id', 'username', 'display_name', 'current_level', 'level_tier'],
          where: { is_active: true }
        }] : [],
        order: [orderBy],
        limit
      });

      return leaderboard.map((economy, index) => ({
        rank: index + 1,
        user: economy.user ? {
          id: economy.user.discord_id,
          username: economy.user.username,
          displayName: economy.user.display_name,
          level: economy.user.current_level,
          tier: economy.user.level_tier
        } : null,
        economy: {
          growCoins: economy.grow_coins_balance,
          premiumSeeds: economy.premium_seeds_balance,
          totalValue: economy.getTotalValue(),
          dailyStreak: economy.daily_streak,
          workStreak: economy.work_streak,
          totalTransactions: economy.total_transactions,
          totalEarned: economy.total_grow_coins_earned
        }
      }));

    } catch (error) {
      console.error('Leaderboard fetch failed:', error);
      throw error;
    }
  }

  /**
   * Get user economy statistics
   * @param {string} userId - Discord user ID
   * @param {string} guildId - Discord guild ID
   * @returns {Promise<Object>} - User economy statistics
   */
  async getUserEconomyStats(userId, guildId) {
    try {
      const [user, economy] = await Promise.all([
        User.findOne({ where: { discord_id: userId, guild_id: guildId } }),
        this.getOrCreateUserEconomy(userId, guildId)
      ]);

      if (!user) {
        throw new Error('User not found');
      }

      // Get recent transactions
      const recentTransactions = await EconomyTransaction.getUserTransactions(
        userId, guildId, { limit: 10 }
      );

      // Get transaction statistics
      const transactionStats = await EconomyTransaction.getUserTransactionStats(
        userId, guildId, 30
      );

      // Get inventory statistics
      const inventoryStats = await UserInventory.getUserInventoryStats(userId, guildId);

      return {
        user: {
          id: userId,
          username: user.username,
          level: user.current_level,
          tier: user.level_tier,
          is21Plus: user.is_21_plus
        },
        balances: economy.getFormattedBalance(),
        statistics: economy.getEconomyStats(),
        recentTransactions: recentTransactions.map(t => t.getFormattedDisplay()),
        transactionStats,
        inventory: inventoryStats
      };

    } catch (error) {
      console.error('User stats fetch failed:', error);
      throw error;
    }
  }

  /**
   * Award economy rewards for engagement activities
   * @param {string} userId - Discord user ID
   * @param {string} guildId - Discord guild ID
   * @param {string} activityType - Type of engagement activity
   * @param {Object} activityData - Activity metadata
   * @returns {Promise<Object>} - Reward result
   */
  async awardEngagementRewards(userId, guildId, activityType, activityData = {}) {
    try {
      const user = await User.findOne({ where: { discord_id: userId, guild_id: guildId } });
      if (!user) {
        throw new Error('User not found');
      }

      // Calculate rewards based on activity type
      const rewards = this.calculateEngagementRewards(activityType, activityData, user);
      
      if (rewards.growCoins === 0 && rewards.premiumSeeds === 0) {
        return {
          success: true,
          rewards: { growCoins: 0, premiumSeeds: 0 },
          transactions: []
        };
      }

      const transactions = [];

      // Award GrowCoins if applicable
      if (rewards.growCoins > 0) {
        const growCoinsResult = await this.processTransaction({
          userId,
          guildId,
          type: 'engagement_reward',
          amount: rewards.growCoins,
          currency: 'grow_coins',
          description: `${activityType} engagement reward`,
          metadata: {
            activity_type: activityType,
            activity_data: activityData,
            engagement_reward: true
          }
        });
        transactions.push(growCoinsResult.transaction);
      }

      // Award Premium Seeds for 21+ users if applicable
      if (rewards.premiumSeeds > 0 && user.is_21_plus) {
        const premiumSeedsResult = await this.processTransaction({
          userId,
          guildId,
          type: 'engagement_reward',
          amount: rewards.premiumSeeds,
          currency: 'premium_seeds',
          description: `${activityType} cannabis engagement bonus`,
          metadata: {
            activity_type: activityType,
            activity_data: activityData,
            cannabis_bonus: true,
            age_verified: true
          },
          requiresAgeVerification: true,
          involvesCannabis: true
        });
        transactions.push(premiumSeedsResult.transaction);
      }

      return {
        success: true,
        rewards: {
          growCoins: rewards.growCoins,
          premiumSeeds: user.is_21_plus ? rewards.premiumSeeds : 0
        },
        transactions
      };

    } catch (error) {
      console.error('Engagement reward failed:', error);
      return {
        success: false,
        error: error.message,
        rewards: { growCoins: 0, premiumSeeds: 0 },
        transactions: []
      };
    }
  }

  /**
   * Calculate engagement rewards based on activity type
   * @param {string} activityType - Type of activity
   * @param {Object} activityData - Activity metadata
   * @param {User} user - User record
   * @returns {Object} - Calculated rewards
   */
  calculateEngagementRewards(activityType, activityData, user) {
    const baseRewards = {
      // Quiz and challenge activities
      'quiz_completion': { growCoins: 10, premiumSeeds: 1 },
      'challenge_participation': { growCoins: 15, premiumSeeds: 1 },
      
      // Engagement activities
      'compliment_give': { growCoins: 5, premiumSeeds: 0 },
      'compliment_receive': { growCoins: 3, premiumSeeds: 0 },
      'celebration_participate': { growCoins: 8, premiumSeeds: 0 },
      'vote_participate': { growCoins: 3, premiumSeeds: 0 },
      'suggestion_submit': { growCoins: 12, premiumSeeds: 1 },
      
      // Gaming activities
      'dice_roll': { growCoins: 2, premiumSeeds: 0 },
      'coinflip': { growCoins: 2, premiumSeeds: 0 },
      '8ball': { growCoins: 1, premiumSeeds: 0 },
      'would-you-rather': { growCoins: 3, premiumSeeds: 0 },
      
      // Strain and cannabis activities (21+ only)
      'strain_guess_complete': { growCoins: 20, premiumSeeds: 3 },
      'strain_lookup': { growCoins: 5, premiumSeeds: 1 },
      
      // Default fallback
      'default': { growCoins: 1, premiumSeeds: 0 }
    };

    const baseReward = baseRewards[activityType] || baseRewards.default;
    
    // Apply level-based multiplier
    const levelMultiplier = 1 + (user.current_level * 0.02); // 2% per level
    
    // Apply streak bonuses if present in activity data
    let streakMultiplier = 1;
    if (activityData.streak && activityData.streak > 1) {
      streakMultiplier = Math.min(1 + (activityData.streak * 0.05), 2.0); // Max 2x
    }

    return {
      growCoins: Math.floor(baseReward.growCoins * levelMultiplier * streakMultiplier),
      premiumSeeds: Math.floor(baseReward.premiumSeeds * levelMultiplier * streakMultiplier)
    };
  }

  /**
   * Admin: Adjust user balance
   * @param {string} adminUserId - Admin user ID
   * @param {string} targetUserId - Target user ID
   * @param {string} guildId - Discord guild ID
   * @param {number} amount - Amount to adjust (positive or negative)
   * @param {string} currency - Currency type
   * @param {string} reason - Reason for adjustment
   * @returns {Promise<Object>} - Adjustment result
   */
  async adminAdjustBalance(adminUserId, targetUserId, guildId, amount, currency = 'grow_coins', reason = 'Admin adjustment') {
    try {
      const transactionType = amount > 0 ? 'admin_adjustment' : 'penalty';
      const absoluteAmount = Math.abs(amount);

      const result = await this.processTransaction({
        userId: targetUserId,
        guildId,
        type: transactionType,
        amount: absoluteAmount,
        currency,
        description: reason,
        metadata: {
          admin_id: adminUserId,
          adjustment_reason: reason,
          original_amount: amount
        }
      });

      // Log admin action
      await AuditLog.logAdminAction(
        adminUserId,
        guildId,
        'economy_balance_adjustment',
        targetUserId,
        {
          amount,
          currency,
          reason,
          new_balance: result.newBalance
        }
      );

      return result;

    } catch (error) {
      console.error('Admin balance adjustment failed:', error);
      throw error;
    }
  }
}

module.exports = new EconomyService();