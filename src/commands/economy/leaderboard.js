/**
 * Leaderboard Command for GrowmiesNJ Discord Bot
 * 
 * Cannabis-compliant economy system leaderboard
 * Shows rankings for GrowCoins, Premium Seeds, and various achievements
 */

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, InteractionContextType } = require('discord.js');
const economyService = require('../../services/economyService');
const { EmbedBuilders, Currency } = require('../../utils/economyHelpers');
const ageVerificationService = require('../../services/ageVerification');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('🏆 View economy leaderboards and community rankings')
    .setContexts(InteractionContextType.Guild)
    .addStringOption(option =>
      option
        .setName('category')
        .setDescription('Choose leaderboard category')
        .setRequired(false)
        .addChoices(
          { name: '🌿 GrowCoins', value: 'growcoins' },
          { name: '🌱 Premium Seeds', value: 'premiumseeds' },
          { name: '🔥 Daily Streaks', value: 'dailystreaks' },
          { name: '💼 Work Streaks', value: 'workstreaks' },
          { name: '📊 Total Earned', value: 'totalearned' },
          { name: '🛍️ Total Spent', value: 'totalspent' },
          { name: '🎁 Gifts Sent', value: 'giftssent' },
          { name: '🆕 Recent Joiners', value: 'recent' }
        )
    )
    .addIntegerOption(option =>
      option
        .setName('page')
        .setDescription('Page number to view')
        .setRequired(false)
        .setMinValue(1)
    ),

  async execute(interaction) {
    try {
      const userId = interaction.user.id;
      const guildId = interaction.guild.id;
      const category = interaction.options.getString('category') || 'growcoins';
      const page = interaction.options.getInteger('page') || 1;

      await interaction.deferReply();

      console.log(`🏆 Leaderboard command executed by ${interaction.user.tag} (category: ${category}, page: ${page})`);

      // Check age verification for premium seeds leaderboard
      const isAgeVerified = await ageVerificationService.isUserVerified(userId, guildId);
      
      if (category === 'premiumseeds' && !isAgeVerified) {
        const errorEmbed = EmbedBuilders.createErrorEmbed(
          'Age Verification Required',
          'Premium Seeds leaderboard requires age verification (21+).\nUse `/verify` to unlock this leaderboard!'
        );
        return await interaction.editReply({ embeds: [errorEmbed] });
      }

      // Get leaderboard data
      const leaderboardData = await this.getLeaderboardData(guildId, category, page, isAgeVerified);

      if (!leaderboardData.users || leaderboardData.users.length === 0) {
        const emptyEmbed = this.createEmptyLeaderboardEmbed(category);
        return await interaction.editReply({ embeds: [emptyEmbed] });
      }

      // Get requesting user's rank and position
      const userRank = await this.getUserRank(userId, guildId, category);

      // Create leaderboard embed
      const leaderboardEmbed = this.createLeaderboardEmbed(
        leaderboardData.users,
        category,
        page,
        leaderboardData.totalPages,
        userRank,
        interaction.guild
      );

      // Create navigation components
      const components = this.createLeaderboardComponents(
        userId,
        category,
        page,
        leaderboardData.totalPages,
        isAgeVerified
      );

      await interaction.editReply({
        embeds: [leaderboardEmbed],
        components: components
      });

      console.log(`✅ Leaderboard displayed for ${interaction.user.tag} (${leaderboardData.users.length} users, page ${page}/${leaderboardData.totalPages})`);

    } catch (error) {
      console.error('❌ Error in leaderboard command:', error);
      
      const errorEmbed = EmbedBuilders.createErrorEmbed(
        'Leaderboard Error',
        'Unable to load leaderboard. Please try again later.'
      );

      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.editReply({ embeds: [errorEmbed] });
        } else {
          await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
      } catch (followUpError) {
        console.error('❌ Failed to send leaderboard error response:', followUpError);
      }
    }
  },

  /**
   * Get leaderboard data with pagination
   */
  async getLeaderboardData(guildId, category, page = 1, isAgeVerified = false) {
    const usersPerPage = 10;
    
    try {
      // In a real implementation, this would query the database
      // For now, return sample leaderboard data
      const allUsers = this.getSampleLeaderboardData(category, isAgeVerified);
      
      // Sort users based on category
      const sortedUsers = this.sortUsersByCategory(allUsers, category);

      // Calculate pagination
      const totalUsers = sortedUsers.length;
      const totalPages = Math.ceil(totalUsers / usersPerPage);
      const startIndex = (page - 1) * usersPerPage;
      const endIndex = startIndex + usersPerPage;
      const users = sortedUsers.slice(startIndex, endIndex);

      // Add ranks
      users.forEach((user, index) => {
        user.rank = startIndex + index + 1;
      });

      return {
        users,
        totalPages,
        currentPage: page,
        totalUsers
      };

    } catch (error) {
      console.error('Error getting leaderboard data:', error);
      return { users: [], totalPages: 0, currentPage: 1, totalUsers: 0 };
    }
  },

  /**
   * Get sample leaderboard data (in production, this would come from database)
   */
  getSampleLeaderboardData(category, isAgeVerified) {
    const users = [
      {
        userId: '123456789012345678',
        username: 'GrowMaster420',
        displayName: 'GrowMaster420',
        growCoins: 15420,
        premiumSeeds: 47,
        dailyStreak: 23,
        workStreak: 12,
        totalEarned: 25630,
        totalSpent: 10210,
        giftsSent: 15,
        giftsReceived: 8,
        joinedAt: new Date(Date.now() - 86400000 * 45) // 45 days ago
      },
      {
        userId: '123456789012345679',
        username: 'CannabisCommunity',
        displayName: 'CannabisCommunity',
        growCoins: 12850,
        premiumSeeds: 32,
        dailyStreak: 18,
        workStreak: 8,
        totalEarned: 20120,
        totalSpent: 7270,
        giftsSent: 22,
        giftsReceived: 12,
        joinedAt: new Date(Date.now() - 86400000 * 38)
      },
      {
        userId: '123456789012345680',
        username: 'SeedCollector',
        displayName: 'SeedCollector',
        growCoins: 8940,
        premiumSeeds: 56,
        dailyStreak: 31,
        workStreak: 15,
        totalEarned: 18750,
        totalSpent: 9810,
        giftsSent: 7,
        giftsReceived: 19,
        joinedAt: new Date(Date.now() - 86400000 * 62)
      },
      {
        userId: '123456789012345681',
        username: 'GreenerPastures',
        displayName: 'GreenerPastures',
        growCoins: 7230,
        premiumSeeds: 18,
        dailyStreak: 9,
        workStreak: 22,
        totalEarned: 12880,
        totalSpent: 5650,
        giftsSent: 11,
        giftsReceived: 6,
        joinedAt: new Date(Date.now() - 86400000 * 28)
      },
      {
        userId: '123456789012345682',
        username: 'NewGrower2024',
        displayName: 'NewGrower2024',
        growCoins: 1850,
        premiumSeeds: 3,
        dailyStreak: 5,
        workStreak: 3,
        totalEarned: 2400,
        totalSpent: 550,
        giftsSent: 2,
        giftsReceived: 4,
        joinedAt: new Date(Date.now() - 86400000 * 7) // Recent joiner
      }
    ];

    // Filter premium seeds data if not age verified
    if (!isAgeVerified && category === 'premiumseeds') {
      return [];
    }

    return users;
  },

  /**
   * Sort users by category
   */
  sortUsersByCategory(users, category) {
    const sortingMap = {
      'growcoins': (a, b) => b.growCoins - a.growCoins,
      'premiumseeds': (a, b) => b.premiumSeeds - a.premiumSeeds,
      'dailystreaks': (a, b) => b.dailyStreak - a.dailyStreak,
      'workstreaks': (a, b) => b.workStreak - a.workStreak,
      'totalearned': (a, b) => b.totalEarned - a.totalEarned,
      'totalspent': (a, b) => b.totalSpent - a.totalSpent,
      'giftssent': (a, b) => b.giftsSent - a.giftsSent,
      'recent': (a, b) => b.joinedAt - a.joinedAt
    };

    return [...users].sort(sortingMap[category] || sortingMap.growcoins);
  },

  /**
   * Get user's rank in specific category
   */
  async getUserRank(userId, guildId, category) {
    try {
      // In production, this would query the database
      // For now, return a sample rank
      const sampleRanks = {
        'growcoins': 15,
        'premiumseeds': 8,
        'dailystreaks': 12,
        'workstreaks': 20,
        'totalearned': 11,
        'totalspent': 25,
        'giftssent': 18,
        'recent': 45
      };

      return sampleRanks[category] || 'Unranked';
    } catch (error) {
      console.error('Error getting user rank:', error);
      return 'Unknown';
    }
  },

  /**
   * Create empty leaderboard embed
   */
  createEmptyLeaderboardEmbed(category) {
    const categoryNames = {
      'growcoins': 'GrowCoins',
      'premiumseeds': 'Premium Seeds',
      'dailystreaks': 'Daily Streaks',
      'workstreaks': 'Work Streaks',
      'totalearned': 'Total Earned',
      'totalspent': 'Total Spent',
      'giftssent': 'Gifts Sent',
      'recent': 'Recent Joiners'
    };

    return new EmbedBuilder()
      .setColor('#FF9800')
      .setTitle('🏆 Economy Leaderboard')
      .setDescription(`No data available for **${categoryNames[category]}** leaderboard.\n\nBe the first to participate in the economy!`)
      .addFields({
        name: '💡 Getting Started',
        value: [
          '• Use `/daily` to claim daily rewards',
          '• Try `/work` to earn GrowCoins',
          '• Visit `/shop` to spend your currency',
          '• Send `/gift` to share with others'
        ].join('\n'),
        inline: false
      })
      .setFooter({
        text: 'GrowmiesNJ Economy • Start your journey today!',
        iconURL: 'https://cdn.discordapp.com/emojis/🏆.png'
      })
      .setTimestamp();
  },

  /**
   * Create leaderboard embed
   */
  createLeaderboardEmbed(users, category, page, totalPages, userRank, guild) {
    const categoryInfo = this.getCategoryInfo(category);
    
    const embed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle(`🏆 ${categoryInfo.title} Leaderboard`)
      .setDescription(`${categoryInfo.description} | Page ${page}/${totalPages}`)
      .setThumbnail(guild.iconURL({ dynamic: true, size: 128 }));

    // Add leaderboard entries
    users.forEach((user, index) => {
      const rankEmoji = this.getRankEmoji(user.rank);
      const value = this.formatLeaderboardValue(user, category);
      
      embed.addFields({
        name: `${rankEmoji} #${user.rank} ${user.displayName}`,
        value: value,
        inline: false
      });
    });

    // Add user's rank if not on current page
    if (userRank && typeof userRank === 'number' && (userRank < (page - 1) * 10 + 1 || userRank > page * 10)) {
      embed.addFields({
        name: '📍 Your Ranking',
        value: `You are ranked **#${userRank}** in this category`,
        inline: false
      });
    }

    // Add category-specific tips
    embed.addFields({
      name: '💡 ' + categoryInfo.tipTitle,
      value: categoryInfo.tips,
      inline: false
    });

    embed.setFooter({
      text: 'GrowmiesNJ Economy • Rankings update in real-time',
      iconURL: guild.iconURL({ dynamic: true })
    })
    .setTimestamp();

    return embed;
  },

  /**
   * Get category information
   */
  getCategoryInfo(category) {
    const categoryMap = {
      'growcoins': {
        title: 'GrowCoins',
        description: 'Top GrowCoin holders in the community',
        tipTitle: 'Earning Tips',
        tips: '• Use `/daily` and `/work` regularly\n• Participate in community events\n• Complete achievements for bonuses'
      },
      'premiumseeds': {
        title: 'Premium Seeds',
        description: 'Elite collectors of Premium Seeds (21+ verified)',
        tipTitle: 'Collection Tips',
        tips: '• Maintain daily streaks for bonus seeds\n• Achieve work milestones\n• Purchase from premium shop sections'
      },
      'dailystreaks': {
        title: 'Daily Streaks',
        description: 'Most consistent daily reward claimers',
        tipTitle: 'Streak Tips',
        tips: '• Claim daily rewards every 24 hours\n• Set reminders to maintain streaks\n• Longer streaks = bigger rewards'
      },
      'workstreaks': {
        title: 'Work Streaks',
        description: 'Most dedicated workers in the community',
        tipTitle: 'Work Tips',
        tips: '• Work every hour when available\n• Try different job types\n• Age verification unlocks premium jobs'
      },
      'totalearned': {
        title: 'Total Earned',
        description: 'Highest lifetime earners',
        tipTitle: 'Earning Tips',
        tips: '• Diversify income sources\n• Maintain streaks for bonuses\n• Participate in all economy activities'
      },
      'totalspent': {
        title: 'Total Spent',
        description: 'Biggest contributors to the economy',
        tipTitle: 'Spending Tips',
        tips: '• Support the economy by purchasing items\n• Invest in valuable collectibles\n• Send gifts to build community'
      },
      'giftssent': {
        title: 'Gifts Sent',
        description: 'Most generous community members',
        tipTitle: 'Generosity Tips',
        tips: '• Share your wealth with newcomers\n• Celebrate others\' achievements\n• Build community connections'
      },
      'recent': {
        title: 'Recent Joiners',
        description: 'Newest members of our economy',
        tipTitle: 'Welcome Tips',
        tips: '• Start with `/daily` for initial currency\n• Ask questions in community channels\n• Explore all economy features'
      }
    };

    return categoryMap[category] || categoryMap.growcoins;
  },

  /**
   * Get rank emoji based on position
   */
  getRankEmoji(rank) {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    if (rank <= 10) return '🏅';
    return '📊';
  },

  /**
   * Format leaderboard value based on category
   */
  formatLeaderboardValue(user, category) {
    const formatters = {
      'growcoins': () => Currency.formatGrowCoins(user.growCoins),
      'premiumseeds': () => Currency.formatPremiumSeeds(user.premiumSeeds),
      'dailystreaks': () => `${user.dailyStreak} day${user.dailyStreak !== 1 ? 's' : ''} 🔥`,
      'workstreaks': () => `${user.workStreak} session${user.workStreak !== 1 ? 's' : ''} 💼`,
      'totalearned': () => Currency.formatGrowCoins(user.totalEarned),
      'totalspent': () => Currency.formatGrowCoins(user.totalSpent),
      'giftssent': () => `${user.giftsSent} gift${user.giftsSent !== 1 ? 's' : ''} 🎁`,
      'recent': () => `Joined <t:${Math.floor(user.joinedAt.getTime() / 1000)}:R> 🆕`
    };

    return formatters[category] ? formatters[category]() : Currency.formatGrowCoins(user.growCoins);
  },

  /**
   * Create leaderboard navigation components
   */
  createLeaderboardComponents(userId, category, page, totalPages, isAgeVerified) {
    const components = [];

    // Category selection dropdown
    const categoryOptions = [
      { label: 'GrowCoins', value: 'growcoins', emoji: '🌿', default: category === 'growcoins' },
      { label: 'Daily Streaks', value: 'dailystreaks', emoji: '🔥', default: category === 'dailystreaks' },
      { label: 'Work Streaks', value: 'workstreaks', emoji: '💼', default: category === 'workstreaks' },
      { label: 'Total Earned', value: 'totalearned', emoji: '📊', default: category === 'totalearned' },
      { label: 'Total Spent', value: 'totalspent', emoji: '🛍️', default: category === 'totalspent' },
      { label: 'Gifts Sent', value: 'giftssent', emoji: '🎁', default: category === 'giftssent' },
      { label: 'Recent Joiners', value: 'recent', emoji: '🆕', default: category === 'recent' }
    ];

    // Add Premium Seeds option if age verified
    if (isAgeVerified) {
      categoryOptions.splice(1, 0, {
        label: 'Premium Seeds',
        value: 'premiumseeds',
        emoji: '🌱',
        default: category === 'premiumseeds'
      });
    }

    const categorySelect = new ActionRowBuilder()
      .addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`leaderboard_category_${userId}`)
          .setPlaceholder('🏷️ Choose category')
          .addOptions(categoryOptions)
      );

    components.push(categorySelect);

    // Navigation buttons
    const navButtons = new ActionRowBuilder();
    
    if (page > 1) {
      navButtons.addComponents(
        new ButtonBuilder()
          .setCustomId(`leaderboard_prev_${userId}_${category}`)
          .setLabel('⬅️ Previous')
          .setStyle(ButtonStyle.Secondary)
      );
    }

    if (page < totalPages) {
      navButtons.addComponents(
        new ButtonBuilder()
          .setCustomId(`leaderboard_next_${userId}_${category}`)
          .setLabel('Next ➡️')
          .setStyle(ButtonStyle.Secondary)
      );
    }

    navButtons.addComponents(
      new ButtonBuilder()
        .setCustomId(`leaderboard_balance_${userId}`)
        .setLabel('💰 My Balance')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`leaderboard_refresh_${userId}_${category}`)
        .setLabel('🔄 Refresh')
        .setStyle(ButtonStyle.Secondary)
    );

    if (navButtons.components.length > 0) {
      components.push(navButtons);
    }

    return components;
  }
};