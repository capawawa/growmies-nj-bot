const { EmbedBuilder } = require('discord.js');

/**
 * Economy Helper Functions
 * Utility functions for the cannabis-compliant economy system
 */

/**
 * Currency formatting and display utilities
 */
const Currency = {
  /**
   * Format GrowCoins with emoji and proper pluralization
   * @param {number} amount - Amount of GrowCoins
   * @returns {string} Formatted currency string
   */
  formatGrowCoins(amount) {
    const coin = amount === 1 ? 'GrowCoin' : 'GrowCoins';
    return `🌿 ${amount.toLocaleString()} ${coin}`;
  },

  /**
   * Format Premium Seeds with emoji and proper pluralization (21+ only)
   * @param {number} amount - Amount of Premium Seeds
   * @returns {string} Formatted currency string
   */
  formatPremiumSeeds(amount) {
    const seed = amount === 1 ? 'Premium Seed' : 'Premium Seeds';
    return `🌱 ${amount.toLocaleString()} ${seed}`;
  },

  /**
   * Format both currencies for display
   * @param {number} growCoins - GrowCoins amount
   * @param {number} premiumSeeds - Premium Seeds amount
   * @returns {string} Formatted currency string
   */
  formatBothCurrencies(growCoins, premiumSeeds) {
    return `${this.formatGrowCoins(growCoins)} | ${this.formatPremiumSeeds(premiumSeeds)}`;
  },

  /**
   * Parse currency input from user commands
   * @param {string} input - User input (e.g., "100", "all", "half")
   * @param {number} currentAmount - Current amount user has
   * @returns {number|null} Parsed amount or null if invalid
   */
  parseAmount(input, currentAmount) {
    if (!input || currentAmount < 0) return null;

    const cleanInput = input.toLowerCase().trim();
    
    if (cleanInput === 'all') return currentAmount;
    if (cleanInput === 'half') return Math.floor(currentAmount / 2);
    
    const amount = parseInt(cleanInput);
    if (isNaN(amount) || amount <= 0) return null;
    
    return Math.min(amount, currentAmount);
  }
};

/**
 * Validation utilities for economy operations
 */
const Validation = {
  /**
   * Validate if user can afford a purchase
   * @param {Object} userEconomy - User's economy data
   * @param {number} growCoinCost - GrowCoin cost
   * @param {number} premiumSeedCost - Premium Seed cost
   * @returns {Object} Validation result with success and message
   */
  canAfford(userEconomy, growCoinCost = 0, premiumSeedCost = 0) {
    if (userEconomy.growCoins < growCoinCost) {
      return {
        success: false,
        message: `You need ${Currency.formatGrowCoins(growCoinCost)} but only have ${Currency.formatGrowCoins(userEconomy.growCoins)}`
      };
    }

    if (userEconomy.premiumSeeds < premiumSeedCost) {
      return {
        success: false,
        message: `You need ${Currency.formatPremiumSeeds(premiumSeedCost)} but only have ${Currency.formatPremiumSeeds(userEconomy.premiumSeeds)}`
      };
    }

    return { success: true };
  },

  /**
   * Validate daily reward eligibility
   * @param {Date} lastDailyReward - Last daily reward timestamp
   * @returns {Object} Validation result with success, message, and time until next
   */
  canClaimDaily(lastDailyReward) {
    if (!lastDailyReward) {
      return { success: true, message: 'Ready to claim!' };
    }

    const now = new Date();
    const nextReward = new Date(lastDailyReward);
    nextReward.setHours(nextReward.getHours() + 24);

    if (now >= nextReward) {
      return { success: true, message: 'Ready to claim!' };
    }

    const timeLeft = nextReward - now;
    const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

    return {
      success: false,
      message: `Next daily reward in ${hoursLeft}h ${minutesLeft}m`,
      timeUntilNext: timeLeft
    };
  },

  /**
   * Validate work activity eligibility
   * @param {Date} lastWorkTime - Last work timestamp
   * @param {number} cooldownHours - Cooldown in hours
   * @returns {Object} Validation result
   */
  canWork(lastWorkTime, cooldownHours = 1) {
    if (!lastWorkTime) {
      return { success: true, message: 'Ready to work!' };
    }

    const now = new Date();
    const nextWork = new Date(lastWorkTime);
    nextWork.setHours(nextWork.getHours() + cooldownHours);

    if (now >= nextWork) {
      return { success: true, message: 'Ready to work!' };
    }

    const timeLeft = nextWork - now;
    const minutesLeft = Math.ceil(timeLeft / (1000 * 60));

    return {
      success: false,
      message: `You can work again in ${minutesLeft} minutes`,
      timeUntilNext: timeLeft
    };
  }
};

/**
 * Cannabis-themed content generators (compliance-aware)
 */
const CannabisThemed = {
  /**
   * Get random work activity for general users
   * @returns {Object} Work activity with name, description, and rewards
   */
  getGeneralWorkActivity() {
    const activities = [
      {
        name: 'Community Helper',
        description: 'Help new members navigate the Discord server',
        baseReward: { min: 15, max: 30 },
        emoji: '🤝'
      },
      {
        name: 'Content Creator',
        description: 'Share educational cannabis content',
        baseReward: { min: 20, max: 35 },
        emoji: '📝'
      },
      {
        name: 'Event Organizer',
        description: 'Help organize community events',
        baseReward: { min: 25, max: 40 },
        emoji: '🎉'
      },
      {
        name: 'Knowledge Sharer',
        description: 'Answer questions in the community',
        baseReward: { min: 18, max: 32 },
        emoji: '🧠'
      },
      {
        name: 'Wellness Advocate',
        description: 'Promote health and wellness practices',
        baseReward: { min: 22, max: 38 },
        emoji: '💚'
      }
    ];

    return activities[Math.floor(Math.random() * activities.length)];
  },

  /**
   * Get random work activity for 21+ verified users
   * @returns {Object} Work activity with name, description, and rewards
   */
  getCannabisWorkActivity() {
    const activities = [
      {
        name: 'Budtender',
        description: 'Assist customers at the virtual dispensary',
        baseReward: { min: 30, max: 50 },
        premiumSeedChance: 0.15,
        emoji: '🏪'
      },
      {
        name: 'Cannabis Grower',
        description: 'Tend to virtual cannabis plants',
        baseReward: { min: 35, max: 55 },
        premiumSeedChance: 0.20,
        emoji: '🌿'
      },
      {
        name: 'Strain Researcher',
        description: 'Research new cannabis strains and effects',
        baseReward: { min: 40, max: 60 },
        premiumSeedChance: 0.25,
        emoji: '🔬'
      },
      {
        name: 'Cannabis Chef',
        description: 'Create virtual cannabis-infused recipes',
        baseReward: { min: 32, max: 48 },
        premiumSeedChance: 0.18,
        emoji: '👨‍🍳'
      },
      {
        name: 'Extraction Artist',
        description: 'Master the art of cannabis extraction',
        baseReward: { min: 45, max: 65 },
        premiumSeedChance: 0.30,
        emoji: '⚗️'
      },
      {
        name: 'Cannabis Educator',
        description: 'Teach others about cannabis cultivation',
        baseReward: { min: 38, max: 58 },
        premiumSeedChance: 0.22,
        emoji: '🎓'
      }
    ];

    return activities[Math.floor(Math.random() * activities.length)];
  },

  /**
   * Generate random cannabis strain names for items
   * @returns {string} Random strain name
   */
  getRandomStrainName() {
    const prefixes = [
      'Purple', 'Green', 'White', 'Blue', 'Golden', 'Silver',
      'Northern', 'Southern', 'Royal', 'Wild', 'Sweet', 'Sour'
    ];
    
    const suffixes = [
      'Haze', 'Kush', 'Dream', 'Express', 'Diesel', 'Widow',
      'Skunk', 'Cookie', 'Punch', 'Glue', 'Fire', 'Ice'
    ];

    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    
    return `${prefix} ${suffix}`;
  },

  /**
   * Get cannabis-themed success messages
   * @param {string} activity - Activity type
   * @returns {string} Success message
   */
  getSuccessMessage(activity) {
    const messages = {
      daily: [
        'Your plants are thriving! 🌿',
        'Another day, another harvest! 🌱',
        'The community appreciates your dedication! 💚',
        'Your growing skills are improving! 🌿'
      ],
      work: [
        'Great work in the community! 🌿',
        'Your efforts are paying off! 💚',
        'The community benefits from your contribution! 🌱',
        'Another successful day of work! ✨'
      ],
      purchase: [
        'Enjoy your new item! 🛍️',
        'A wise purchase for any grower! 🌿',
        'Your collection is growing! 📦',
        'Quality items for quality growers! ⭐'
      ]
    };

    const activityMessages = messages[activity] || messages.work;
    return activityMessages[Math.floor(Math.random() * activityMessages.length)];
  }
};

/**
 * Embed builders for economy-related Discord messages
 */
const EmbedBuilders = {
  /**
   * Create balance display embed
   * @param {Object} user - Discord user object
   * @param {Object} economy - User's economy data
   * @param {Object} stats - Additional stats
   * @returns {EmbedBuilder} Discord embed
   */
  createBalanceEmbed(user, economy, stats = {}) {
    const embed = new EmbedBuilder()
      .setColor('#4CAF50')
      .setTitle(`💰 ${user.displayName}'s Wallet`)
      .setThumbnail(user.displayAvatarURL())
      .addFields(
        {
          name: '🌿 GrowCoins',
          value: economy.growCoins.toLocaleString(),
          inline: true
        },
        {
          name: '🌱 Premium Seeds',
          value: economy.premiumSeeds.toLocaleString(),
          inline: true
        },
        {
          name: '🔥 Current Streak',
          value: `${economy.dailyStreak} days`,
          inline: true
        }
      );

    if (stats.rank) {
      embed.addFields({
        name: '🏆 Server Rank',
        value: `#${stats.rank}`,
        inline: true
      });
    }

    if (stats.totalEarned) {
      embed.addFields({
        name: '📊 Total Earned',
        value: Currency.formatGrowCoins(stats.totalEarned),
        inline: true
      });
    }

    embed.setFooter({ 
      text: 'Use /daily to claim your daily reward!' 
    });

    return embed;
  },

  /**
   * Create daily reward embed
   * @param {Object} user - Discord user object
   * @param {Object} reward - Reward information
   * @param {number} newStreak - New streak count
   * @returns {EmbedBuilder} Discord embed
   */
  createDailyRewardEmbed(user, reward, newStreak) {
    const embed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('🌅 Daily Reward Claimed!')
      .setDescription(CannabisThemed.getSuccessMessage('daily'))
      .addFields(
        {
          name: '🌿 GrowCoins Earned',
          value: reward.growCoins.toLocaleString(),
          inline: true
        },
        {
          name: '🔥 Daily Streak',
          value: `${newStreak} days`,
          inline: true
        }
      );

    if (reward.premiumSeeds > 0) {
      embed.addFields({
        name: '🌱 Bonus Premium Seeds',
        value: reward.premiumSeeds.toLocaleString(),
        inline: true
      });
    }

    if (reward.streakBonus) {
      embed.addFields({
        name: '⭐ Streak Bonus',
        value: `+${reward.streakBonus}% extra rewards!`,
        inline: false
      });
    }

    embed.setFooter({ 
      text: 'Come back tomorrow for another reward!' 
    });

    return embed;
  },

  /**
   * Create work reward embed
   * @param {Object} user - Discord user object
   * @param {Object} activity - Work activity performed
   * @param {Object} reward - Reward earned
   * @returns {EmbedBuilder} Discord embed
   */
  createWorkRewardEmbed(user, activity, reward) {
    const embed = new EmbedBuilder()
      .setColor('#4CAF50')
      .setTitle(`${activity.emoji} Work Complete!`)
      .setDescription(`**${activity.name}**\n${activity.description}`)
      .addFields({
        name: '💰 Reward',
        value: Currency.formatGrowCoins(reward.growCoins),
        inline: true
      });

    if (reward.premiumSeeds > 0) {
      embed.addFields({
        name: '🌱 Bonus Seeds',
        value: Currency.formatPremiumSeeds(reward.premiumSeeds),
        inline: true
      });
    }

    embed.setDescription(embed.data.description + '\n\n' + CannabisThemed.getSuccessMessage('work'));
    
    return embed;
  },

  /**
   * Create shop embed
   * @param {Array} items - Shop items to display
   * @param {number} page - Current page
   * @param {number} totalPages - Total pages
   * @param {string} category - Current category
   * @returns {EmbedBuilder} Discord embed
   */
  createShopEmbed(items, page, totalPages, category = 'All') {
    const embed = new EmbedBuilder()
      .setColor('#9C27B0')
      .setTitle('🏪 GrowmiesNJ Shop')
      .setDescription(`Category: **${category}** | Page ${page}/${totalPages}`)
      .setFooter({ 
        text: 'Use /buy <item_id> to purchase items' 
      });

    items.forEach((item, index) => {
      const price = item.growCoinPrice > 0 
        ? Currency.formatGrowCoins(item.growCoinPrice)
        : Currency.formatPremiumSeeds(item.premiumSeedPrice);

      const ageRestriction = item.ageRestricted ? ' 🔞' : '';
      const rarity = item.rarity ? ` | ${item.rarity}` : '';

      embed.addFields({
        name: `${item.emoji || '📦'} ${item.name}${ageRestriction}`,
        value: `${item.description}\n**Price:** ${price}${rarity}`,
        inline: false
      });
    });

    return embed;
  },

  /**
   * Create error embed
   * @param {string} title - Error title
   * @param {string} description - Error description
   * @returns {EmbedBuilder} Discord embed
   */
  createErrorEmbed(title, description) {
    return new EmbedBuilder()
      .setColor('#F44336')
      .setTitle(`❌ ${title}`)
      .setDescription(description);
  },

  /**
   * Create success embed
   * @param {string} title - Success title
   * @param {string} description - Success description
   * @returns {EmbedBuilder} Discord embed
   */
  createSuccessEmbed(title, description) {
    return new EmbedBuilder()
      .setColor('#4CAF50')
      .setTitle(`✅ ${title}`)
      .setDescription(description);
  }
};

/**
 * Economy configuration and constants
 */
const Config = {
  // Daily reward configuration
  DAILY_REWARD: {
    BASE_AMOUNT: 50,
    STREAK_BONUS_PERCENT: 5, // 5% per day streak
    MAX_STREAK_BONUS: 100, // Maximum 100% bonus
    PREMIUM_SEED_THRESHOLD: 7, // Days to earn premium seeds
    PREMIUM_SEED_AMOUNT: 1
  },

  // Work activity configuration
  WORK: {
    COOLDOWN_HOURS: 1,
    GENERAL_ACTIVITIES: 5,
    CANNABIS_ACTIVITIES: 6,
    STREAK_BONUS_THRESHOLD: 5 // Days to get work streak bonus
  },

  // Currency limits
  LIMITS: {
    MAX_GROW_COINS: 1000000,
    MAX_PREMIUM_SEEDS: 10000,
    MAX_GIFT_AMOUNT: 10000,
    MAX_TRADE_AMOUNT: 50000
  },

  // Item rarity system
  RARITY: {
    COMMON: { weight: 60, color: '#9E9E9E', emoji: '⚪' },
    UNCOMMON: { weight: 25, color: '#4CAF50', emoji: '🟢' },
    RARE: { weight: 10, color: '#2196F3', emoji: '🔵' },
    EPIC: { weight: 4, color: '#9C27B0', emoji: '🟣' },
    LEGENDARY: { weight: 1, color: '#FF9800', emoji: '🟠' }
  }
};

/**
 * Utility functions for item and rarity management
 */
const ItemUtils = {
  /**
   * Generate random rarity based on weights
   * @returns {string} Rarity level
   */
  generateRandomRarity() {
    const totalWeight = Object.values(Config.RARITY).reduce((sum, rarity) => sum + rarity.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const [rarity, config] of Object.entries(Config.RARITY)) {
      random -= config.weight;
      if (random <= 0) return rarity;
    }
    
    return 'COMMON';
  },

  /**
   * Get rarity configuration
   * @param {string} rarity - Rarity level
   * @returns {Object} Rarity configuration
   */
  getRarityConfig(rarity) {
    return Config.RARITY[rarity.toUpperCase()] || Config.RARITY.COMMON;
  },

  /**
   * Calculate item price based on rarity
   * @param {number} basePrice - Base price
   * @param {string} rarity - Item rarity
   * @returns {number} Calculated price
   */
  calculateRarityPrice(basePrice, rarity) {
    const multipliers = {
      COMMON: 1,
      UNCOMMON: 1.5,
      RARE: 2.5,
      EPIC: 4,
      LEGENDARY: 7
    };
    
    return Math.floor(basePrice * (multipliers[rarity.toUpperCase()] || 1));
  }
};

module.exports = {
  Currency,
  Validation,
  CannabisThemed,
  EmbedBuilders,
  Config,
  ItemUtils
};