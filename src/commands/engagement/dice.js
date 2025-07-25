/**
 * Dice Command for GrowmiesNJ Discord Bot
 * 
 * Cannabis-themed dice rolling game with XP rewards and community fun
 * Features multiple dice types, cannabis-themed outcomes, and streak tracking
 */

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const EngagementService = require('../../services/engagementService');
const { WelcomeEmbeds, BRAND_COLORS } = require('../../utils/embeds');

// Cannabis-themed dice outcomes and messages
const CANNABIS_OUTCOMES = {
  // Standard 6-sided die outcomes
  6: {
    emoji: '🔥',
    title: 'Perfect Roll!',
    messages: [
      'That\'s some premium quality rolling! 🔥',
      'You\'ve achieved the perfect session! ⭐',
      'Top shelf results right there! 👑',
      'That roll is absolutely fire! 🌟',
      'Master grower level precision! 🏆'
    ],
    xpMultiplier: 2.0,
    color: '#FFD700'
  },
  5: {
    emoji: '🌿',
    title: 'Excellent Roll!',
    messages: [
      'That\'s some high-grade rolling! 🌿',
      'Smooth as a perfectly cured bud! ✨',
      'You\'re on a roll like quality cannabis! 🎯',
      'That\'s indica-level relaxing perfection! 😌',
      'Sativa-level energy in that roll! ⚡'
    ],
    xpMultiplier: 1.5,
    color: '#32CD32'
  },
  4: {
    emoji: '🌱',
    title: 'Good Roll!',
    messages: [
      'Growing strong with that roll! 🌱',
      'That\'s some solid mid-shelf quality! 👍',
      'Your rolling skills are developing nicely! 📈',
      'Like a healthy seedling - promising! 🌿',
      'That roll has good potential! 💚'
    ],
    xpMultiplier: 1.2,
    color: BRAND_COLORS.PRIMARY_GREEN
  },
  3: {
    emoji: '🍃',
    title: 'Decent Roll',
    messages: [
      'Not bad - room for improvement! 🍃',
      'That\'s like shake - still has value! 💨',
      'Your technique needs some practice! 📚',
      'Every grower starts somewhere! 🌱',
      'Keep rolling, you\'ll get there! 🎲'
    ],
    xpMultiplier: 1.0,
    color: '#90EE90'
  },
  2: {
    emoji: '🌿',
    title: 'Low Roll',
    messages: [
      'That\'s like stems and seeds! 😅',
      'Time to upgrade your rolling papers! 📄',
      'Even Snoop had to learn sometime! 🎭',
      'Practice makes perfect in the garden! 🌱',
      'Better luck next time, grower! 🍀'
    ],
    xpMultiplier: 0.8,
    color: '#DDA0DD'
  },
  1: {
    emoji: '💨',
    title: 'Rough Roll',
    messages: [
      'That\'s drier than prohibition era! 💨',
      'Time to find a new dealer! 😂',
      'Even schwag has its place! 🤷',
      'Hey, at least you tried! 💚',
      'Every expert was once a beginner! 📖'
    ],
    xpMultiplier: 0.5,
    color: '#A0A0A0'
  }
};

// Special roll combinations for multiple dice
const SPECIAL_COMBINATIONS = {
  'all_same': {
    emoji: '🎯',
    title: 'Perfect Harmony!',
    message: 'All dice showing the same number - that\'s cultivation expertise!',
    bonusMultiplier: 3.0
  },
  'straight': {
    emoji: '📈',
    title: 'Ascending High!',
    message: 'Sequential roll - your skills are growing progressively!',
    bonusMultiplier: 2.5
  },
  'pairs': {
    emoji: '👥',
    title: 'Dynamic Duo!',
    message: 'Matching pairs - perfect for a shared session!',
    bonusMultiplier: 1.8
  },
  'high_total': {
    emoji: '🚀',
    title: 'Sky High Total!',
    message: 'That total is reaching stratospheric levels!',
    bonusMultiplier: 2.2
  }
};

// Streak bonuses
const STREAK_BONUSES = {
  3: { multiplier: 1.5, message: 'You\'re on a roll! 🔥' },
  5: { multiplier: 2.0, message: 'Hot streak! Absolutely blazing! ⚡' },
  7: { multiplier: 2.5, message: 'Legendary streak! Cannabis master! 👑' },
  10: { multiplier: 3.0, message: 'EPIC STREAK! You\'re the roll king! 🏆' }
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dice')
    .setDescription('🎲 Roll cannabis-themed dice and earn XP!')
    .addIntegerOption(option =>
      option
        .setName('count')
        .setDescription('Number of dice to roll (1-6)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(6)
    )
    .addIntegerOption(option =>
      option
        .setName('sides')
        .setDescription('Number of sides on each die')
        .setRequired(false)
        .addChoices(
          { name: '🎲 Standard (6-sided)', value: 6 },
          { name: '🔟 D10 (10-sided)', value: 10 },
          { name: '🎯 D20 (20-sided)', value: 20 }
        )
    )
    .addBooleanOption(option =>
      option
        .setName('streak')
        .setDescription('View your current rolling streak')
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      const userId = interaction.user.id;
      const guildId = interaction.guild.id;
      const diceCount = interaction.options.getInteger('count') || 1;
      const diceSides = interaction.options.getInteger('sides') || 6;
      const viewStreak = interaction.options.getBoolean('streak') || false;

      // Handle streak viewing
      if (viewStreak) {
        return await this.showStreakInfo(interaction);
      }

      await interaction.deferReply();

      // Roll the dice
      const rolls = this.rollDice(diceCount, diceSides);
      const total = rolls.reduce((sum, roll) => sum + roll, 0);

      // Get user's current streak
      const currentStreak = await this.getUserStreak(userId, guildId);

      // Analyze the roll for special combinations
      const analysis = this.analyzeRoll(rolls, diceSides);

      // Calculate XP reward
      const baseXP = this.calculateBaseXP(rolls, diceSides, analysis);
      const streakBonus = this.getStreakBonus(currentStreak);
      const totalXP = Math.floor(baseXP * streakBonus.multiplier);

      // Track engagement and award XP
      await EngagementService.trackEngagementActivity(
        userId,
        guildId,
        'dice_roll',
        interaction.channelId,
        {
          diceCount,
          diceSides,
          rolls,
          total,
          analysis,
          xpEarned: totalXP,
          streak: currentStreak
        }
      );

      // Update streak
      const newStreak = await this.updateStreak(userId, guildId, rolls, diceSides);

      // Create result embed
      const resultEmbed = this.createResultEmbed(
        interaction.user,
        rolls,
        diceSides,
        total,
        analysis,
        totalXP,
        newStreak,
        streakBonus
      );

      // Create action buttons
      const actionRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`dice_roll_again_${userId}`)
            .setLabel('🎲 Roll Again')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`dice_change_count_${userId}`)
            .setLabel('🔢 Change Dice')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`dice_leaderboard_${userId}`)
            .setLabel('🏆 Leaderboard')
            .setStyle(ButtonStyle.Secondary)
        );

      await interaction.editReply({
        embeds: [resultEmbed],
        components: [actionRow]
      });

    } catch (error) {
      console.error('Error executing dice command:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor('#ff6b6b')
        .setTitle('❌ Dice Roll Error')
        .setDescription('An error occurred while rolling the dice.')
        .addFields({
          name: '🔄 Try Again',
          value: 'Please try rolling again or contact support if the issue persists.',
          inline: false
        })
        .setFooter({
          text: 'GrowmiesNJ • Error Handling',
          iconURL: interaction.client.user.displayAvatarURL()
        })
        .setTimestamp();

      if (interaction.deferred) {
        await interaction.editReply({ embeds: [errorEmbed] });
      } else {
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      }
    }
  },

  /**
   * Roll dice and return results
   */
  rollDice(count, sides) {
    const rolls = [];
    for (let i = 0; i < count; i++) {
      rolls.push(Math.floor(Math.random() * sides) + 1);
    }
    return rolls;
  },

  /**
   * Analyze roll for special combinations
   */
  analyzeRoll(rolls, sides) {
    const analysis = {
      type: 'normal',
      bonus: 0,
      special: null
    };

    if (rolls.length === 1) {
      // Single die - use standard outcomes for 6-sided
      if (sides === 6 && CANNABIS_OUTCOMES[rolls[0]]) {
        analysis.type = 'single';
        analysis.outcome = CANNABIS_OUTCOMES[rolls[0]];
      }
      return analysis;
    }

    // Multiple dice analysis
    const sorted = [...rolls].sort((a, b) => a - b);
    const total = rolls.reduce((sum, roll) => sum + roll, 0);
    const maxPossible = rolls.length * sides;

    // Check for all same numbers
    if (rolls.every(roll => roll === rolls[0])) {
      analysis.type = 'special';
      analysis.special = SPECIAL_COMBINATIONS.all_same;
      analysis.bonus = SPECIAL_COMBINATIONS.all_same.bonusMultiplier;
      return analysis;
    }

    // Check for straight (sequential)
    let isStraight = true;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] !== sorted[i-1] + 1) {
        isStraight = false;
        break;
      }
    }
    if (isStraight) {
      analysis.type = 'special';
      analysis.special = SPECIAL_COMBINATIONS.straight;
      analysis.bonus = SPECIAL_COMBINATIONS.straight.bonusMultiplier;
      return analysis;
    }

    // Check for pairs
    const counts = {};
    rolls.forEach(roll => counts[roll] = (counts[roll] || 0) + 1);
    const hasPairs = Object.values(counts).some(count => count >= 2);
    
    if (hasPairs) {
      analysis.type = 'special';
      analysis.special = SPECIAL_COMBINATIONS.pairs;
      analysis.bonus = SPECIAL_COMBINATIONS.pairs.bonusMultiplier;
      return analysis;
    }

    // Check for high total (80% or more of maximum)
    if (total >= maxPossible * 0.8) {
      analysis.type = 'special';
      analysis.special = SPECIAL_COMBINATIONS.high_total;
      analysis.bonus = SPECIAL_COMBINATIONS.high_total.bonusMultiplier;
      return analysis;
    }

    return analysis;
  },

  /**
   * Calculate base XP for the roll
   */
  calculateBaseXP(rolls, sides, analysis) {
    let baseXP = 2; // Base participation XP

    if (analysis.type === 'single' && analysis.outcome) {
      // Single die with cannabis outcome
      baseXP = Math.floor(5 * analysis.outcome.xpMultiplier);
    } else if (analysis.type === 'special') {
      // Special combination
      const total = rolls.reduce((sum, roll) => sum + roll, 0);
      baseXP = Math.floor((total + sides) * analysis.bonus);
    } else {
      // Multiple dice, normal roll
      const total = rolls.reduce((sum, roll) => sum + roll, 0);
      const average = total / rolls.length;
      const maxAverage = sides;
      const performance = average / maxAverage;
      
      baseXP = Math.floor(3 + (performance * 7)); // 3-10 base XP
    }

    return Math.max(1, baseXP);
  },

  /**
   * Get user's current streak
   */
  async getUserStreak(userId, guildId) {
    // In production, this would query the database
    // For now, use a simple memory store
    if (!global.diceStreaks) {
      global.diceStreaks = new Map();
    }
    
    const key = `${userId}_${guildId}`;
    const streakData = global.diceStreaks.get(key);
    
    return streakData ? streakData.count : 0;
  },

  /**
   * Update user's streak based on roll quality
   */
  async updateStreak(userId, guildId, rolls, sides) {
    if (!global.diceStreaks) {
      global.diceStreaks = new Map();
    }
    
    const key = `${userId}_${guildId}`;
    const streakData = global.diceStreaks.get(key) || { count: 0, lastRoll: null };
    
    // Determine if this is a "good" roll to continue streak
    const total = rolls.reduce((sum, roll) => sum + roll, 0);
    const average = total / rolls.length;
    const isGoodRoll = average >= sides * 0.5; // 50% or better average
    
    if (isGoodRoll) {
      streakData.count++;
    } else {
      streakData.count = 0; // Reset streak on poor roll
    }
    
    streakData.lastRoll = Date.now();
    global.diceStreaks.set(key, streakData);
    
    return streakData.count;
  },

  /**
   * Get streak bonus multiplier and message
   */
  getStreakBonus(streak) {
    for (const [threshold, bonus] of Object.entries(STREAK_BONUSES).reverse()) {
      if (streak >= parseInt(threshold)) {
        return bonus;
      }
    }
    return { multiplier: 1.0, message: null };
  },

  /**
   * Create result embed
   */
  createResultEmbed(user, rolls, sides, total, analysis, totalXP, streak, streakBonus) {
    let color = BRAND_COLORS.PRIMARY_GREEN;
    let title = '🎲 Dice Roll Results';
    let description = '';

    // Format dice display
    const diceDisplay = rolls.map(roll => `🎲 ${roll}`).join(' ');
    
    if (analysis.type === 'single' && analysis.outcome) {
      // Single die with cannabis outcome
      const outcome = analysis.outcome;
      color = outcome.color;
      title = `${outcome.emoji} ${outcome.title}`;
      description = outcome.messages[Math.floor(Math.random() * outcome.messages.length)];
    } else if (analysis.type === 'special') {
      // Special combination
      const special = analysis.special;
      title = `${special.emoji} ${special.title}`;
      description = special.message;
      color = '#FFD700'; // Gold for special rolls
    } else {
      // Normal roll
      description = 'May the odds be ever in your flavor! 🌿';
    }

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(description)
      .addFields(
        {
          name: '🎲 Roll Results',
          value: `${diceDisplay}\n**Total:** ${total}${rolls.length > 1 ? ` (${sides}d${rolls.length})` : ''}`,
          inline: true
        },
        {
          name: '🌟 XP Earned',
          value: `+${totalXP} XP`,
          inline: true
        },
        {
          name: '🔥 Current Streak',
          value: `${streak} roll${streak !== 1 ? 's' : ''}`,
          inline: true
        }
      );

    // Add streak bonus message if applicable
    if (streakBonus.message) {
      embed.addFields({
        name: '⚡ Streak Bonus',
        value: `${streakBonus.message}\n*${(streakBonus.multiplier * 100).toFixed(0)}% XP multiplier!*`,
        inline: false
      });
    }

    // Add special combination details
    if (analysis.type === 'special') {
      embed.addFields({
        name: '🏆 Special Bonus',
        value: `*${(analysis.bonus * 100).toFixed(0)}% bonus multiplier applied!*`,
        inline: false
      });
    }

    embed.setFooter({
      text: 'GrowmiesNJ • Roll the dice and earn XP!',
      iconURL: user.displayAvatarURL()
    })
    .setTimestamp();

    return embed;
  },

  /**
   * Show streak information
   */
  async showStreakInfo(interaction) {
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    
    const currentStreak = await this.getUserStreak(userId, guildId);
    const streakBonus = this.getStreakBonus(currentStreak);

    const streakEmbed = new EmbedBuilder()
      .setColor(BRAND_COLORS.PRIMARY_GREEN)
      .setTitle('🔥 Your Rolling Streak')
      .setDescription('Keep rolling good dice to maintain and build your streak!')
      .addFields(
        {
          name: '📊 Current Streak',
          value: `${currentStreak} good roll${currentStreak !== 1 ? 's' : ''} in a row`,
          inline: true
        },
        {
          name: '⚡ Current Multiplier',
          value: `${(streakBonus.multiplier * 100).toFixed(0)}% XP bonus`,
          inline: true
        }
      );

    // Add next milestone
    const nextMilestone = Object.keys(STREAK_BONUSES)
      .map(k => parseInt(k))
      .find(threshold => threshold > currentStreak);

    if (nextMilestone) {
      const nextBonus = STREAK_BONUSES[nextMilestone];
      const remaining = nextMilestone - currentStreak;
      
      streakEmbed.addFields({
        name: '🎯 Next Milestone',
        value: `${remaining} more good roll${remaining !== 1 ? 's' : ''} for **${(nextBonus.multiplier * 100).toFixed(0)}%** multiplier!\n*${nextBonus.message}*`,
        inline: false
      });
    }

    // Add streak tips
    streakEmbed.addFields({
      name: '💡 Streak Tips',
      value: '• Rolling above average maintains your streak\n• Poor rolls reset your streak to 0\n• Higher streaks give bigger XP bonuses!\n• Multiple dice increase your chances',
      inline: false
    });

    if (streakBonus.message) {
      streakEmbed.addFields({
        name: '🌟 Current Status',
        value: streakBonus.message,
        inline: false
      });
    }

    streakEmbed.setFooter({
      text: 'GrowmiesNJ • Keep those dice rolling!',
      iconURL: interaction.user.displayAvatarURL()
    })
    .setTimestamp();

    await interaction.reply({ embeds: [streakEmbed] });
  }
};