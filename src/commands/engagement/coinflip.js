/**
 * Coinflip Command for GrowmiesNJ Discord Bot
 * 
 * Cannabis-themed coin flipping game with XP rewards and streak tracking
 * Features custom cannabis-themed outcomes and community engagement
 */

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const EngagementService = require('../../services/engagementService');
const { WelcomeEmbeds, BRAND_COLORS } = require('../../utils/embeds');

// Cannabis-themed coin sides and outcomes
const COIN_SIDES = {
  heads: {
    emoji: '🌿',
    name: 'Heads (Leaf)',
    description: 'The sacred leaf side',
    winMessages: [
      'The cannabis gods smile upon you! 🌿✨',
      'Nature\'s wisdom guides your fortune! 🍃',
      'That\'s some premium luck right there! 🌟',
      'The leaf side brings you prosperity! 💚',
      'Sativa energy flows through your prediction! ⚡',
      'Like a perfectly trimmed bud - pristine! ✂️',
      'Your intuition is as sharp as trichomes! 💎'
    ],
    loseMessages: [
      'The flame consumed your prediction! 🔥',
      'Maybe next time, grasshopper! 🦗',
      'Even master growers miss sometimes! 🌱',
      'The cosmic balance shifts... 🌌',
      'Your chi was slightly off this time! ☯️'
    ]
  },
  tails: {
    emoji: '🔥',
    name: 'Tails (Flame)',
    description: 'The sacred flame side',
    winMessages: [
      'Your prediction burns bright! 🔥🌟',
      'That\'s some fire intuition! 🚀',
      'The flame of fortune favors you! 🕯️',
      'Hot streak incoming! 🌶️',
      'Indica wisdom guided your choice! 🧘',
      'That prediction was absolutely lit! 💯',
      'You\'re blazing through these flips! 🔥'
    ],
    loseMessages: [
      'The leaf cooled your prediction! 🍃',
      'Nature reclaimed this round! 🌿',
      'The green side had other plans! 💚',
      'Sometimes you\'re the flame, sometimes the leaf! 🌱',
      'Cosmic balance must be maintained! ⚖️'
    ]
  }
};

// Special streak achievements
const STREAK_ACHIEVEMENTS = {
  3: {
    title: '🔥 Hot Streak!',
    message: 'Three in a row - you\'re smoking hot!',
    emoji: '🔥',
    multiplier: 1.5
  },
  5: {
    title: '🌿 Zen Master!',
    message: 'Five correct - your mind is one with the herb!',
    emoji: '🧘',
    multiplier: 2.0
  },
  7: {
    title: '⚡ Lightning Reflexes!',
    message: 'Seven straight - your senses are heightened!',
    emoji: '⚡',
    multiplier: 2.5
  },
  10: {
    title: '👑 Flip King/Queen!',
    message: 'Ten in a row - you\'ve achieved enlightenment!',
    emoji: '👑',
    multiplier: 3.0
  },
  15: {
    title: '🌟 Cosmic Prophet!',
    message: 'Fifteen straight - you can see through time itself!',
    emoji: '🌟',
    multiplier: 4.0
  }
};

// Flip patterns for bonus rewards
const FLIP_PATTERNS = {
  'alternating': {
    name: 'Perfect Alternation',
    description: 'Heads-Tails-Heads-Tails pattern',
    bonus: 10,
    emoji: '🔄'
  },
  'double_pair': {
    name: 'Double Pair',
    description: 'HH-TT or TT-HH pattern',
    bonus: 8,
    emoji: '👥'
  },
  'triple': {
    name: 'Triple Match',
    description: 'Three of the same in a row',
    bonus: 12,
    emoji: '🎯'
  }
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('coinflip')
    .setDescription('🪙 Flip the sacred cannabis coin and test your luck!')
    .addStringOption(option =>
      option
        .setName('choice')
        .setDescription('Choose your side of destiny')
        .setRequired(false)
        .addChoices(
          { name: '🌿 Heads (Leaf) - Nature\'s wisdom', value: 'heads' },
          { name: '🔥 Tails (Flame) - Sacred fire', value: 'tails' }
        )
    )
    .addIntegerOption(option =>
      option
        .setName('count')
        .setDescription('Number of consecutive flips (1-10)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(10)
    )
    .addBooleanOption(option =>
      option
        .setName('streak')
        .setDescription('View your current flip streak')
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      const userId = interaction.user.id;
      const guildId = interaction.guild.id;
      const userChoice = interaction.options.getString('choice');
      const flipCount = interaction.options.getInteger('count') || 1;
      const viewStreak = interaction.options.getBoolean('streak') || false;

      // Handle streak viewing
      if (viewStreak) {
        return await this.showStreakInfo(interaction);
      }

      await interaction.deferReply();

      // If no choice provided, show the selection interface
      if (!userChoice) {
        return await this.showChoiceInterface(interaction, flipCount);
      }

      // Perform the flip(s)
      await this.performFlips(interaction, userChoice, flipCount);

    } catch (error) {
      console.error('Error executing coinflip command:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor('#ff6b6b')
        .setTitle('❌ Coinflip Error')
        .setDescription('An error occurred while flipping the cosmic coin.')
        .addFields({
          name: '🔄 Try Again',
          value: 'Please try flipping again or contact support if the issue persists.',
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
   * Show choice interface for coin flip
   */
  async showChoiceInterface(interaction, flipCount) {
    const choiceEmbed = new EmbedBuilder()
      .setColor(BRAND_COLORS.PRIMARY_GREEN)
      .setTitle('🪙 Sacred Cannabis Coin')
      .setDescription(`Choose your side and test your cosmic connection!\n\n**Flips:** ${flipCount}`)
      .addFields(
        {
          name: '🌿 Heads (Leaf)',
          value: 'The side of nature, growth, and organic wisdom. Choose this if you feel connected to the earth\'s energy.',
          inline: true
        },
        {
          name: '🔥 Tails (Flame)',
          value: 'The side of transformation, energy, and sacred fire. Choose this if you feel the burn of passion.',
          inline: true
        },
        {
          name: '🎯 Pro Tips',
          value: '• Trust your instincts\n• Multiple flips = bigger rewards\n• Streaks multiply your XP!\n• Patterns unlock bonus rewards',
          inline: false
        }
      )
      .setFooter({
        text: 'GrowmiesNJ • The cosmic coin awaits your choice',
        iconURL: interaction.client.user.displayAvatarURL()
      })
      .setTimestamp();

    const choiceRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`coinflip_choose_heads_${flipCount}_${userId}`)
          .setLabel('🌿 Choose Heads (Leaf)')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`coinflip_choose_tails_${flipCount}_${userId}`)
          .setLabel('🔥 Choose Tails (Flame)')
          .setStyle(ButtonStyle.Danger)
      );

    const actionRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`coinflip_random_${flipCount}_${userId}`)
          .setLabel('🎲 Random Choice')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`coinflip_streak_${userId}`)
          .setLabel('📊 View Streak')
          .setStyle(ButtonStyle.Secondary)
      );

    await interaction.editReply({
      embeds: [choiceEmbed],
      components: [choiceRow, actionRow]
    });
  },

  /**
   * Perform the actual coin flips
   */
  async performFlips(interaction, userChoice, flipCount) {
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;

    // Get current streak
    const currentStreak = await this.getUserStreak(userId, guildId);

    // Perform flips
    const results = [];
    let correctCount = 0;
    
    for (let i = 0; i < flipCount; i++) {
      const flip = Math.random() < 0.5 ? 'heads' : 'tails';
      const isCorrect = flip === userChoice;
      
      results.push({
        flip,
        isCorrect,
        emoji: COIN_SIDES[flip].emoji
      });
      
      if (isCorrect) correctCount++;
    }

    // Calculate performance metrics
    const accuracy = (correctCount / flipCount) * 100;
    const isSuccessful = correctCount > flipCount / 2; // More than half correct
    
    // Calculate XP
    const baseXP = this.calculateFlipXP(flipCount, correctCount, currentStreak);
    
    // Check for patterns
    const patternBonus = this.checkFlipPatterns(results);
    
    // Calculate final XP
    const streakMultiplier = this.getStreakMultiplier(currentStreak);
    const totalXP = Math.floor(baseXP * streakMultiplier + (patternBonus.bonus || 0));

    // Update streak
    const newStreak = await this.updateStreak(userId, guildId, isSuccessful);

    // Track engagement
    await EngagementService.trackEngagementActivity(
      userId,
      guildId,
      'coinflip',
      interaction.channelId,
      {
        choice: userChoice,
        flipCount,
        correctCount,
        accuracy,
        streak: newStreak,
        xpEarned: totalXP
      }
    );

    // Create result embed
    const resultEmbed = this.createResultEmbed(
      interaction.user,
      userChoice,
      results,
      correctCount,
      accuracy,
      totalXP,
      newStreak,
      currentStreak,
      patternBonus
    );

    // Create action buttons
    const actionRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`coinflip_again_${userId}`)
          .setLabel('🪙 Flip Again')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`coinflip_double_${userId}`)
          .setLabel('2️⃣ Double Flip')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`coinflip_streak_${userId}`)
          .setLabel('📊 View Streak')
          .setStyle(ButtonStyle.Secondary)
      );

    await interaction.editReply({
      embeds: [resultEmbed],
      components: [actionRow]
    });
  },

  /**
   * Calculate XP for flip results
   */
  calculateFlipXP(flipCount, correctCount, currentStreak) {
    const baseXP = 3; // Base XP per flip
    const correctBonus = correctCount * 2; // Bonus for correct guesses
    const streakBonus = Math.min(currentStreak * 0.5, 10); // Max 10 bonus from streak
    const multiFlipBonus = flipCount > 1 ? (flipCount - 1) * 1.5 : 0;
    
    return Math.floor(baseXP * flipCount + correctBonus + streakBonus + multiFlipBonus);
  },

  /**
   * Get streak multiplier based on current streak
   */
  getStreakMultiplier(streak) {
    for (const [threshold, achievement] of Object.entries(STREAK_ACHIEVEMENTS).reverse()) {
      if (streak >= parseInt(threshold)) {
        return achievement.multiplier;
      }
    }
    return 1.0;
  },

  /**
   * Check for special flip patterns
   */
  checkFlipPatterns(results) {
    if (results.length < 3) return { bonus: 0 };

    const flips = results.map(r => r.flip);
    
    // Check for alternating pattern (HTHTHT...)
    let alternating = true;
    for (let i = 1; i < flips.length; i++) {
      if (flips[i] === flips[i-1]) {
        alternating = false;
        break;
      }
    }
    
    if (alternating && flips.length >= 4) {
      return {
        pattern: FLIP_PATTERNS.alternating,
        bonus: FLIP_PATTERNS.alternating.bonus
      };
    }

    // Check for triple match
    for (let i = 0; i <= flips.length - 3; i++) {
      if (flips[i] === flips[i+1] && flips[i+1] === flips[i+2]) {
        return {
          pattern: FLIP_PATTERNS.triple,
          bonus: FLIP_PATTERNS.triple.bonus
        };
      }
    }

    // Check for double pair pattern
    if (flips.length >= 4) {
      for (let i = 0; i <= flips.length - 4; i++) {
        if (flips[i] === flips[i+1] && flips[i+2] === flips[i+3] && flips[i] !== flips[i+2]) {
          return {
            pattern: FLIP_PATTERNS.double_pair,
            bonus: FLIP_PATTERNS.double_pair.bonus
          };
        }
      }
    }

    return { bonus: 0 };
  },

  /**
   * Get user's current streak
   */
  async getUserStreak(userId, guildId) {
    if (!global.coinflipStreaks) {
      global.coinflipStreaks = new Map();
    }
    
    const key = `${userId}_${guildId}`;
    const streakData = global.coinflipStreaks.get(key);
    
    return streakData ? streakData.count : 0;
  },

  /**
   * Update user's streak
   */
  async updateStreak(userId, guildId, isSuccessful) {
    if (!global.coinflipStreaks) {
      global.coinflipStreaks = new Map();
    }
    
    const key = `${userId}_${guildId}`;
    const streakData = global.coinflipStreaks.get(key) || { count: 0, best: 0 };
    
    if (isSuccessful) {
      streakData.count++;
      streakData.best = Math.max(streakData.best, streakData.count);
    } else {
      streakData.count = 0;
    }
    
    streakData.lastFlip = Date.now();
    global.coinflipStreaks.set(key, streakData);
    
    return streakData.count;
  },

  /**
   * Create result embed
   */
  createResultEmbed(user, userChoice, results, correctCount, accuracy, totalXP, newStreak, oldStreak, patternBonus) {
    const chosenSide = COIN_SIDES[userChoice];
    const flipCount = results.length;
    
    // Determine overall result
    const isWin = correctCount > flipCount / 2;
    const resultColor = isWin ? '#28a745' : accuracy === 50 ? '#ffc107' : '#ff6b6b';
    
    // Get appropriate message
    const messages = isWin ? chosenSide.winMessages : chosenSide.loseMessages;
    const resultMessage = messages[Math.floor(Math.random() * messages.length)];

    // Format flip results
    const flipDisplay = results.map((result, index) => 
      `${index + 1}. ${result.emoji} ${result.isCorrect ? '✅' : '❌'}`
    ).join('\n');

    const embed = new EmbedBuilder()
      .setColor(resultColor)
      .setTitle(`🪙 ${isWin ? 'Cosmic Connection!' : accuracy === 50 ? 'Balanced Energy' : 'Cosmic Realignment'}`)
      .setDescription(resultMessage)
      .addFields(
        {
          name: '🎯 Your Choice',
          value: `${chosenSide.emoji} ${chosenSide.name}`,
          inline: true
        },
        {
          name: '📊 Results',
          value: `${correctCount}/${flipCount} correct (${accuracy.toFixed(1)}%)`,
          inline: true
        },
        {
          name: '🌟 XP Earned',
          value: `+${totalXP} XP`,
          inline: true
        }
      );

    // Add flip results if multiple flips
    if (flipCount > 1) {
      embed.addFields({
        name: '🪙 Flip Results',
        value: flipDisplay,
        inline: true
      });
    }

    // Add streak information
    const streakInfo = newStreak > oldStreak ? 
      `${newStreak} (↗️ +${newStreak - oldStreak})` : 
      newStreak < oldStreak ? 
      `${newStreak} (💔 Reset)` : 
      `${newStreak}`;

    embed.addFields({
      name: '🔥 Streak',
      value: streakInfo,
      inline: true
    });

    // Add achievement if applicable
    const achievement = Object.entries(STREAK_ACHIEVEMENTS)
      .reverse()
      .find(([threshold]) => newStreak >= parseInt(threshold));
    
    if (achievement && newStreak > oldStreak) {
      const [, achData] = achievement;
      embed.addFields({
        name: '🏆 Achievement Unlocked!',
        value: `${achData.title}\n${achData.message}`,
        inline: false
      });
    }

    // Add pattern bonus if applicable
    if (patternBonus.pattern) {
      embed.addFields({
        name: `${patternBonus.pattern.emoji} Pattern Bonus!`,
        value: `**${patternBonus.pattern.name}**\n${patternBonus.pattern.description}\n+${patternBonus.bonus} bonus XP!`,
        inline: false
      });
    }

    embed.setFooter({
      text: 'GrowmiesNJ • The cosmic coin has spoken',
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
    
    if (!global.coinflipStreaks) {
      global.coinflipStreaks = new Map();
    }
    
    const key = `${userId}_${guildId}`;
    const streakData = global.coinflipStreaks.get(key) || { count: 0, best: 0 };

    const currentMultiplier = this.getStreakMultiplier(streakData.count);
    
    const streakEmbed = new EmbedBuilder()
      .setColor(BRAND_COLORS.PRIMARY_GREEN)
      .setTitle('🔥 Your Cosmic Flip Streak')
      .setDescription('Channel the universe\'s energy through consecutive successful predictions!')
      .addFields(
        {
          name: '📊 Current Streak',
          value: `${streakData.count} successful prediction${streakData.count !== 1 ? 's' : ''}`,
          inline: true
        },
        {
          name: '🏆 Personal Best',
          value: `${streakData.best} in a row`,
          inline: true
        },
        {
          name: '⚡ Current Multiplier',
          value: `${(currentMultiplier * 100).toFixed(0)}% XP bonus`,
          inline: true
        }
      );

    // Add next achievement
    const nextAchievement = Object.entries(STREAK_ACHIEVEMENTS)
      .find(([threshold]) => parseInt(threshold) > streakData.count);

    if (nextAchievement) {
      const [threshold, achData] = nextAchievement;
      const needed = parseInt(threshold) - streakData.count;
      
      streakEmbed.addFields({
        name: '🎯 Next Achievement',
        value: `**${achData.title}**\n${achData.message}\n\n${needed} more successful prediction${needed !== 1 ? 's' : ''} needed\n*${(achData.multiplier * 100).toFixed(0)}% XP multiplier*`,
        inline: false
      });
    } else if (streakData.count > 0) {
      streakEmbed.addFields({
        name: '👑 Master Status',
        value: 'You\'ve achieved the highest level of cosmic connection! Keep the streak alive!',
        inline: false
      });
    }

    // Add tips
    streakEmbed.addFields({
      name: '🌟 Cosmic Tips',
      value: '• Trust your intuition - the universe speaks through feeling\n• Multiple flips increase difficulty but offer greater rewards\n• Successful = getting more than half correct\n• Patterns unlock special bonuses!',
      inline: false
    });

    streakEmbed.setFooter({
      text: 'GrowmiesNJ • May the cosmic forces guide your flips',
      iconURL: interaction.user.displayAvatarURL()
    })
    .setTimestamp();

    await interaction.reply({ embeds: [streakEmbed] });
  }
};