/**
 * Compliment Command for GrowmiesNJ Discord Bot
 * 
 * Cannabis-themed compliment system for positive community interactions
 * Features random compliments, targeted compliments, and positivity tracking
 */

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const EngagementService = require('../../services/engagementService');
const { WelcomeEmbeds, BRAND_COLORS } = require('../../utils/embeds');

// Cannabis-themed compliment categories
const COMPLIMENT_CATEGORIES = {
  general: {
    name: "🌟 General Vibes",
    emoji: "🌟",
    compliments: [
      "Your positive energy radiates like a perfectly cured bud! ✨",
      "You bring such good vibes to our cannabis community! 🌿",
      "Your presence here makes everyone's day a little greener! 💚",
      "You're as uplifting as the finest sativa! 🚀",
      "Your chill energy is contagious in the best way! 😌",
      "You spread peace and positivity like a true cannabis ambassador! ☮️",
      "Your good vibes are stronger than the dankest strain! 🔥",
      "You make our community bloom with your awesome presence! 🌸",
      "Your positive spirit is more refreshing than morning dew on cannabis leaves! 🌅",
      "You radiate the kind of zen energy we all aspire to have! 🧘"
    ]
  },
  
  knowledge: {
    name: "🧠 Cannabis Wisdom",
    emoji: "🧠",
    compliments: [
      "Your cannabis knowledge is as deep as the finest roots! 🌱",
      "You share wisdom like a master grower sharing their best techniques! 👨‍🌾",
      "Your insights are more valuable than the rarest terpenes! 💎",
      "You educate with the patience of a cannabis cultivator! 📚",
      "Your expertise grows stronger every day, like a healthy plant! 🌿",
      "You break down complex topics easier than breaking up perfect bud! ✂️",
      "Your knowledge base is more extensive than a master grower's seed collection! 🌰",
      "You explain things with the clarity of pure, crystal trichomes! 💫",
      "Your teaching ability is as smooth as the finest concentrate! 🫧",
      "You share knowledge like the most generous harvest! 🎁"
    ]
  },
  
  creativity: {
    name: "🎨 Creative Spirit",
    emoji: "🎨",
    compliments: [
      "Your creativity flows like the smoothest smoke! 💨",
      "You think outside the box like a true cannabis innovator! 📦",
      "Your ideas are as fresh as newly harvested buds! 🆕",
      "You bring artistic flair to everything you touch! 🎭",
      "Your imagination is more expansive than an endless grow room! 🏭",
      "You create magic like an alchemist with cannabis! ⚗️",
      "Your innovative spirit is inspiring to witness! 💡",
      "You craft experiences as carefully as a master hash maker! 🛠️",
      "Your creative energy is as powerful as the strongest edible! ⚡",
      "You turn ordinary moments into extraordinary experiences! ✨"
    ]
  },
  
  community: {
    name: "🤝 Community Love",
    emoji: "🤝",
    compliments: [
      "You bring people together like a perfect smoke circle! ⭕",
      "Your welcoming spirit makes newcomers feel at home instantly! 🏠",
      "You build bridges in our community stronger than any strain! 🌉",
      "Your support means more than the finest cannabis supply! 🎯",
      "You create connections as naturally as cannabis creates trichomes! 🔗",
      "Your kindness spreads faster than the aroma of good bud! 🌬️",
      "You foster unity like a master grower tends their garden! 🌻",
      "Your inclusive energy makes everyone feel valued! 🫂",
      "You share the love as generously as sharing your best stash! ❤️",
      "Your community spirit is the glue that holds us together! 🧲"
    ]
  },
  
  chill: {
    name: "😎 Chill Vibes",
    emoji: "😎",
    compliments: [
      "Your chill energy is more relaxing than the finest indica! 🛋️",
      "You handle situations with the grace of a zen master! 🧘‍♀️",
      "Your calm presence is like a peaceful smoke session! 🕯️",
      "You keep your cool better than perfectly stored concentrates! ❄️",
      "Your laid-back nature is infectious in the best way! 😌",
      "You bring serenity to chaos like cannabis brings peace to stress! 🕊️",
      "Your mellow vibe is exactly what this community needs! 🌊",
      "You radiate tranquility like a perfectly balanced hybrid! ⚖️",
      "Your peaceful energy could calm the most anxious mind! 🌸",
      "You embody the chill lifestyle we all love! 🏖️"
    ]
  },
  
  helpful: {
    name: "🤲 Helpful Soul",
    emoji: "🤲",
    compliments: [
      "You help others grow like nutrients help cannabis flourish! 🌱",
      "Your assistance is more valuable than the purest hash! 💰",
      "You solve problems with the precision of a master trimmer! ✂️",
      "Your guidance is like having a personal grow mentor! 👨‍🏫",
      "You share resources as freely as passing a joint! 🤝",
      "Your helpful nature blooms wherever you go! 🌺",
      "You lift others up like cannabis lifts the spirit! 🎈",
      "Your support system is stronger than any grow light! 💡",
      "You troubleshoot issues like a cannabis doctor! 👩‍⚕️",
      "Your willingness to help makes you a community treasure! 💎"
    ]
  }
};

// Special achievement compliments for milestones
const ACHIEVEMENT_COMPLIMENTS = [
  "You've grown in this community like the most magnificent cannabis plant! 🌳",
  "Your journey here has been more impressive than a record-breaking harvest! 🏆",
  "You've cultivated amazing relationships in our green community! 🌱",
  "Your progress is as satisfying to watch as buds swelling during flower! 🌸",
  "You've become a cornerstone of our cannabis family! 🏠",
  "Your development here rivals the most prized phenotypes! 🧬",
  "You've blossomed into an incredible community member! 🌻",
  "Your growth trajectory is steeper than the highest THC percentage! 📈"
];

// XP rewards for compliment activities
const XP_REWARDS = {
  give_compliment: 5,        // Giving a compliment
  receive_compliment: 3,     // Receiving a compliment
  daily_positivity: 10,      // Daily compliment milestone
  spread_joy: 15,           // Giving multiple compliments in a day
  community_builder: 20,     // Weekly milestone for positive interactions
  wholesome_content: 2      // Bonus for particularly thoughtful compliments
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('compliment')
    .setDescription('🌟 Spread cannabis-themed positivity in the community!')
    .addSubcommand(subcommand =>
      subcommand
        .setName('give')
        .setDescription('Give someone a cannabis-themed compliment')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('The person to compliment')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('category')
            .setDescription('Type of compliment to give')
            .setRequired(false)
            .addChoices(
              { name: '🌟 General Vibes', value: 'general' },
              { name: '🧠 Cannabis Wisdom', value: 'knowledge' },
              { name: '🎨 Creative Spirit', value: 'creativity' },
              { name: '🤝 Community Love', value: 'community' },
              { name: '😎 Chill Vibes', value: 'chill' },
              { name: '🤲 Helpful Soul', value: 'helpful' }
            )
        )
        .addStringOption(option =>
          option
            .setName('custom')
            .setDescription('Add your own personal message (optional)')
            .setRequired(false)
            .setMaxLength(200)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('random')
        .setDescription('Get a random cannabis-themed compliment for yourself')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('daily')
        .setDescription('Send daily positivity to a random community member')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('stats')
        .setDescription('View your positivity statistics and community impact')
    ),

  async execute(interaction) {
    try {
      const subcommand = interaction.options.getSubcommand();
      const userId = interaction.user.id;
      const guildId = interaction.guild.id;

      await interaction.deferReply();

      switch (subcommand) {
        case 'give':
          await this.handleGiveCompliment(interaction, userId, guildId);
          break;
        case 'random':
          await this.handleRandomCompliment(interaction, userId, guildId);
          break;
        case 'daily':
          await this.handleDailyPositivity(interaction, userId, guildId);
          break;
        case 'stats':
          await this.handlePositivityStats(interaction, userId, guildId);
          break;
        default:
          throw new Error(`Unknown subcommand: ${subcommand}`);
      }

    } catch (error) {
      console.error('Error executing compliment command:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor('#ff6b6b')
        .setTitle('❌ Compliment Error')
        .setDescription('An error occurred while spreading positivity.')
        .addFields({
          name: '🔄 Try Again',
          value: 'Please try the command again or contact support if the issue persists.',
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
   * Handle giving a compliment to another user
   */
  async handleGiveCompliment(interaction, userId, guildId) {
    const targetUser = interaction.options.getUser('user');
    const category = interaction.options.getString('category');
    const customMessage = interaction.options.getString('custom');

    // Prevent self-compliments
    if (targetUser.id === userId) {
      const selfComplimentEmbed = new EmbedBuilder()
        .setColor('#ffc107')
        .setTitle('🪞 Self-Love Redirect')
        .setDescription('While self-love is important, compliments are more meaningful when shared with others!')
        .addFields({
          name: '💡 Try Instead',
          value: '• Use `/compliment random` for self-encouragement\n• Compliment a friend who deserves recognition\n• Spread positivity to build community bonds',
          inline: false
        })
        .setFooter({
          text: 'GrowmiesNJ • Spreading the Love',
          iconURL: interaction.user.displayAvatarURL()
        });

      return await interaction.editReply({ embeds: [selfComplimentEmbed] });
    }

    // Check for bots
    if (targetUser.bot) {
      const botComplimentEmbed = new EmbedBuilder()
        .setColor('#17a2b8')
        .setTitle('🤖 Bot Appreciation')
        .setDescription('Bots appreciate the thought, but your kind words are better shared with fellow humans!')
        .addFields({
          name: '🌟 Spread Human Joy',
          value: 'Find a community member who could use some cannabis-themed positivity today!',
          inline: false
        })
        .setFooter({
          text: 'GrowmiesNJ • Human Connection',
          iconURL: interaction.user.displayAvatarURL()
        });

      return await interaction.editReply({ embeds: [botComplimentEmbed] });
    }

    // Initialize compliment tracking
    if (!global.complimentTracking) {
      global.complimentTracking = new Map();
    }

    // Rate limiting check (prevent spam)
    const userKey = `${userId}_${guildId}`;
    const userData = global.complimentTracking.get(userKey) || { 
      given: [], 
      received: [], 
      dailyCount: 0, 
      lastReset: Date.now() 
    };

    // Reset daily count if it's a new day
    const now = Date.now();
    const daysSinceReset = Math.floor((now - userData.lastReset) / (24 * 60 * 60 * 1000));
    if (daysSinceReset >= 1) {
      userData.dailyCount = 0;
      userData.lastReset = now;
    }

    // Check daily limit (encourage genuine compliments)
    if (userData.dailyCount >= 10) {
      const limitEmbed = new EmbedBuilder()
        .setColor('#ff6b6b')
        .setTitle('💚 Daily Positivity Limit Reached')
        .setDescription('You\'ve spread an amazing amount of positivity today! Take a break and let others shine.')
        .addFields({
          name: '🌅 Come Back Tomorrow',
          value: 'Your daily compliment limit resets at midnight. Quality over quantity makes compliments more meaningful!',
          inline: false
        })
        .setFooter({
          text: 'GrowmiesNJ • Balanced Positivity',
          iconURL: interaction.user.displayAvatarURL()
        });

      return await interaction.editReply({ embeds: [limitEmbed] });
    }

    // Select compliment
    let selectedCategory, compliment;
    
    if (category) {
      selectedCategory = COMPLIMENT_CATEGORIES[category];
      compliment = selectedCategory.compliments[Math.floor(Math.random() * selectedCategory.compliments.length)];
    } else {
      // Random category
      const categories = Object.values(COMPLIMENT_CATEGORIES);
      selectedCategory = categories[Math.floor(Math.random() * categories.length)];
      compliment = selectedCategory.compliments[Math.floor(Math.random() * selectedCategory.compliments.length)];
    }

    // Create compliment embed
    const complimentEmbed = this.createComplimentEmbed(
      interaction.user,
      targetUser,
      compliment,
      selectedCategory,
      customMessage
    );

    // Create action buttons
    const actionRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`compliment_thanks_${userId}_${targetUser.id}`)
          .setLabel('💚 Say Thanks')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`compliment_return_${userId}_${targetUser.id}`)
          .setLabel('🔄 Return Compliment')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`compliment_spread_${userId}`)
          .setLabel('🌟 Spread More Joy')
          .setStyle(ButtonStyle.Primary)
      );

    await interaction.editReply({
      embeds: [complimentEmbed],
      components: [actionRow]
    });

    // Update tracking
    userData.dailyCount++;
    userData.given.push({
      target: targetUser.id,
      category: selectedCategory.name,
      timestamp: now,
      hasCustom: !!customMessage
    });

    // Update target user data
    const targetKey = `${targetUser.id}_${guildId}`;
    const targetData = global.complimentTracking.get(targetKey) || { 
      given: [], 
      received: [], 
      dailyCount: 0, 
      lastReset: now 
    };
    
    targetData.received.push({
      from: userId,
      category: selectedCategory.name,
      timestamp: now,
      hasCustom: !!customMessage
    });

    global.complimentTracking.set(userKey, userData);
    global.complimentTracking.set(targetKey, targetData);

    // Calculate XP rewards
    let giverXP = XP_REWARDS.give_compliment;
    let receiverXP = XP_REWARDS.receive_compliment;

    if (customMessage && customMessage.length > 50) {
      giverXP += XP_REWARDS.wholesome_content;
    }

    // Daily milestone bonus
    if (userData.dailyCount >= 5) {
      giverXP += XP_REWARDS.daily_positivity;
    }

    // Track engagement for both users
    await EngagementService.trackEngagementActivity(
      userId,
      guildId,
      'compliment',
      interaction.channelId,
      {
        action: 'give_compliment',
        target: targetUser.id,
        category: selectedCategory.name,
        hasCustom: !!customMessage,
        xpEarned: giverXP
      }
    );

    await EngagementService.trackEngagementActivity(
      targetUser.id,
      guildId,
      'compliment',
      interaction.channelId,
      {
        action: 'receive_compliment',
        from: userId,
        category: selectedCategory.name,
        xpEarned: receiverXP
      }
    );
  },

  /**
   * Handle random compliment for self-encouragement
   */
  async handleRandomCompliment(interaction, userId, guildId) {
    // Select random category and compliment
    const categories = Object.values(COMPLIMENT_CATEGORIES);
    const selectedCategory = categories[Math.floor(Math.random() * categories.length)];
    const compliment = selectedCategory.compliments[Math.floor(Math.random() * selectedCategory.compliments.length)];

    // Create self-compliment embed
    const selfComplimentEmbed = new EmbedBuilder()
      .setColor(BRAND_COLORS.PRIMARY_GREEN)
      .setTitle('🌟 Cannabis Community Self-Love')
      .setDescription(`${selectedCategory.emoji} **${selectedCategory.name}**\n\n${compliment}`)
      .addFields(
        {
          name: '💚 Remember',
          value: 'Self-appreciation is the first step to spreading positivity to others!',
          inline: false
        },
        {
          name: '🌱 Keep Growing',
          value: 'Every day is a chance to be better, just like nurturing a cannabis plant to its full potential.',
          inline: false
        }
      )
      .setFooter({
        text: 'GrowmiesNJ • You deserve all the good vibes',
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

    // Create action buttons
    const actionRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`compliment_another_${userId}`)
          .setLabel('🔄 Another One')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`compliment_share_joy_${userId}`)
          .setLabel('🌟 Share Joy With Others')
          .setStyle(ButtonStyle.Success)
      );

    await interaction.editReply({
      embeds: [selfComplimentEmbed],
      components: [actionRow]
    });

    // Track engagement
    await EngagementService.trackEngagementActivity(
      userId,
      guildId,
      'compliment',
      interaction.channelId,
      {
        action: 'self_compliment',
        category: selectedCategory.name,
        xpEarned: 2
      }
    );
  },

  /**
   * Handle daily positivity feature
   */
  async handleDailyPositivity(interaction, userId, guildId) {
    // This would need access to guild members to select a random active member
    // For now, we'll create a general daily positivity message
    
    const dailyMessages = [
      "Today is a perfect day to spread some cannabis-community love! 🌿💚",
      "Remember: positive vibes grow the best communities, just like love grows the best plants! 🌱",
      "Your kind words today could make someone's week brighter! ✨",
      "Like trichomes on a perfect bud, small acts of kindness create something beautiful! 💎",
      "The energy you put into the world comes back to you - make it positive! 🔄",
      "Today's goal: be the reason someone feels welcomed in our green community! 🏠",
      "Spread compliments like seeds - you never know what beautiful friendships will grow! 🌻"
    ];

    const dailyMessage = dailyMessages[Math.floor(Math.random() * dailyMessages.length)];

    const dailyEmbed = new EmbedBuilder()
      .setColor(BRAND_COLORS.PRIMARY_GREEN)
      .setTitle('🌅 Daily Positivity Challenge')
      .setDescription(dailyMessage)
      .addFields(
        {
          name: '🎯 Today\'s Mission',
          value: 'Give at least one genuine compliment to a community member who deserves recognition!',
          inline: false
        },
        {
          name: '🌟 Pro Tips',
          value: '• Notice someone being helpful? Compliment them!\n• See great content? Spread the love!\n• Someone seems down? Lift them up!\n• New member? Make them feel welcome!',
          inline: false
        },
        {
          name: '💎 Bonus Rewards',
          value: 'Daily positivity spreaders earn bonus XP and community recognition!',
          inline: false
        }
      )
      .setFooter({
        text: 'GrowmiesNJ • Daily Dose of Good Vibes',
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

    await interaction.editReply({ embeds: [dailyEmbed] });

    // Track engagement
    await EngagementService.trackEngagementActivity(
      userId,
      guildId,
      'compliment',
      interaction.channelId,
      {
        action: 'daily_positivity_check',
        xpEarned: 3
      }
    );
  },

  /**
   * Handle positivity statistics
   */
  async handlePositivityStats(interaction, userId, guildId) {
    if (!global.complimentTracking) {
      global.complimentTracking = new Map();
    }

    const userKey = `${userId}_${guildId}`;
    const userData = global.complimentTracking.get(userKey) || { 
      given: [], 
      received: [], 
      dailyCount: 0, 
      lastReset: Date.now() 
    };

    // Calculate statistics
    const totalGiven = userData.given.length;
    const totalReceived = userData.received.length;
    const todayGiven = userData.dailyCount;
    
    // Category breakdown
    const givenByCategory = {};
    const receivedByCategory = {};
    
    userData.given.forEach(compliment => {
      givenByCategory[compliment.category] = (givenByCategory[compliment.category] || 0) + 1;
    });
    
    userData.received.forEach(compliment => {
      receivedByCategory[compliment.category] = (receivedByCategory[compliment.category] || 0) + 1;
    });

    // Recent activity (last 7 days)
    const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const recentGiven = userData.given.filter(c => c.timestamp > weekAgo).length;
    const recentReceived = userData.received.filter(c => c.timestamp > weekAgo).length;

    const statsEmbed = new EmbedBuilder()
      .setColor(BRAND_COLORS.PRIMARY_GREEN)
      .setTitle('📊 Your Positivity Impact')
      .setDescription('See how you\'re spreading good vibes in our cannabis community!')
      .addFields(
        {
          name: '🌟 Overall Statistics',
          value: `**Compliments Given:** ${totalGiven}\n**Compliments Received:** ${totalReceived}\n**Today\'s Count:** ${todayGiven}/10`,
          inline: true
        },
        {
          name: '📈 Recent Activity (7 days)',
          value: `**Given:** ${recentGiven}\n**Received:** ${recentReceived}\n**Daily Average:** ${(recentGiven / 7).toFixed(1)}`,
          inline: true
        },
        {
          name: '💫 Positivity Ratio',
          value: `${totalGiven > 0 ? ((totalReceived / totalGiven) * 100).toFixed(0) : 0}% return rate\n${totalGiven + totalReceived > 0 ? 'Spreading good karma!' : 'Start your journey!'}`,
          inline: true
        }
      );

    // Add top categories if user has activity
    if (totalGiven > 0) {
      const topGivenCategory = Object.entries(givenByCategory)
        .sort(([,a], [,b]) => b - a)[0];
      
      statsEmbed.addFields({
        name: '🎯 Your Signature Style',
        value: `You love giving **${topGivenCategory[0]}** compliments (${topGivenCategory[1]} times)`,
        inline: false
      });
    }

    if (totalReceived > 0) {
      const topReceivedCategory = Object.entries(receivedByCategory)
        .sort(([,a], [,b]) => b - a)[0];
        
      statsEmbed.addFields({
        name: '✨ How Others See You',
        value: `People most appreciate your **${topReceivedCategory[0]}** (received ${topReceivedCategory[1]} times)`,
        inline: false
      });
    }

    // Add motivational messages based on stats
    let motivation = '';
    if (totalGiven === 0 && totalReceived === 0) {
      motivation = '🌱 Start your positivity journey today! Every compliment plants a seed of good vibes.';
    } else if (totalGiven > totalReceived) {
      motivation = '🌟 You\'re a positivity powerhouse! Your kindness is making the community brighter.';
    } else if (totalReceived > totalGiven) {
      motivation = '💚 You\'re well-loved in the community! Consider spreading some of that good energy to others.';
    } else {
      motivation = '⚖️ Perfect balance! You give and receive positivity in harmony - the cannabis way!';
    }

    statsEmbed.addFields({
      name: '🌿 Cannabis Community Wisdom',
      value: motivation,
      inline: false
    });

    // Add achievement levels
    const achievementLevels = [
      { threshold: 0, title: 'Seedling', emoji: '🌱' },
      { threshold: 5, title: 'Growing', emoji: '🌿' },
      { threshold: 15, title: 'Flowering', emoji: '🌸' },
      { threshold: 30, title: 'Harvested', emoji: '🌾' },
      { threshold: 50, title: 'Master Grower', emoji: '👨‍🌾' },
      { threshold: 100, title: 'Cannabis Sage', emoji: '🧙‍♀️' }
    ];

    const currentLevel = achievementLevels
      .reverse()
      .find(level => totalGiven >= level.threshold);

    statsEmbed.addFields({
      name: '🏆 Positivity Level',
      value: `${currentLevel.emoji} **${currentLevel.title}**\nBased on ${totalGiven} compliments given`,
      inline: false
    });

    statsEmbed.setFooter({
      text: 'GrowmiesNJ • Keep spreading the love!',
      iconURL: interaction.user.displayAvatarURL()
    })
    .setTimestamp();

    await interaction.editReply({ embeds: [statsEmbed] });

    // Track stats viewing
    await EngagementService.trackEngagementActivity(
      userId,
      guildId,
      'compliment',
      interaction.channelId,
      {
        action: 'view_stats',
        xpEarned: 1
      }
    );
  },

  /**
   * Create compliment embed
   */
  createComplimentEmbed(giver, receiver, compliment, category, customMessage) {
    const embed = new EmbedBuilder()
      .setColor(BRAND_COLORS.PRIMARY_GREEN)
      .setTitle('🌟 Cannabis Community Compliment')
      .setDescription(`${category.emoji} **${category.name}**\n\n${compliment}`)
      .addFields(
        {
          name: '💚 From',
          value: `${giver.displayName}`,
          inline: true
        },
        {
          name: '🎯 To',
          value: `${receiver.displayName}`,
          inline: true
        },
        {
          name: '✨ Vibe',
          value: 'Positive Energy',
          inline: true
        }
      );

    if (customMessage) {
      embed.addFields({
        name: '💌 Personal Message',
        value: customMessage,
        inline: false
      });
    }

    embed.addFields({
      name: '🌿 Community Love',
      value: 'Spreading positivity one compliment at a time! Like cannabis brings people together, kind words build stronger communities.',
      inline: false
    });

    embed.setFooter({
      text: 'GrowmiesNJ • Good vibes only',
      iconURL: giver.displayAvatarURL()
    })
    .setTimestamp();

    return embed;
  }
};