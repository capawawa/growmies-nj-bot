/**
 * Celebrate Command for GrowmiesNJ Discord Bot
 * 
 * Achievement celebration system with cannabis-themed festivities
 * Features milestone recognition, community celebrations, and achievement tracking
 */

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const EngagementService = require('../../services/engagementService');
const { WelcomeEmbeds, BRAND_COLORS } = require('../../utils/embeds');

// Cannabis-themed celebration types
const CELEBRATION_TYPES = {
  milestone: {
    name: "🎯 Personal Milestone",
    emoji: "🎯",
    description: "Celebrating a personal achievement or milestone",
    celebrations: [
      "🎉 Your achievement is blooming beautifully, just like a prized cannabis plant!",
      "🌟 This milestone deserves a celebration as sweet as the finest hash!",
      "🚀 You've grown tremendously - time to harvest the rewards of your hard work!",
      "💎 Your dedication shines brighter than the most crystalline trichomes!",
      "🌿 This achievement has ripened to perfection - enjoy this moment!",
      "🔥 You're absolutely crushing it like the finest concentrate press!",
      "⭐ Your success story is more inspiring than a sunrise over a grow field!"
    ]
  },
  
  cannabis_achievement: {
    name: "🌿 Cannabis Journey",
    emoji: "🌿",
    description: "Cannabis-related accomplishments and learning",
    celebrations: [
      "🌱 Your cannabis knowledge is growing stronger every day!",
      "👨‍🌾 You've reached master grower status in our community!",
      "🧠 Your cannabis wisdom is becoming legendary!",
      "🏆 You've unlocked a new level of cannabis expertise!",
      "💚 Your passion for cannabis education is truly inspiring!",
      "🔬 Your understanding of cannabis science is impressive!",
      "🌸 You've blossomed into a true cannabis connoisseur!"
    ]
  },
  
  community: {
    name: "🤝 Community Achievement",
    emoji: "🤝",
    description: "Contributions to the GrowmiesNJ community",
    celebrations: [
      "🌟 You're making our community greener and more welcoming!",
      "🫂 Your positive impact brings people together like a perfect smoke circle!",
      "💚 You've become a pillar of our cannabis community!",
      "🌈 Your contributions create the perfect atmosphere for growth!",
      "🏠 You've helped make this place feel like home for everyone!",
      "🎭 Your community spirit is the secret ingredient to our success!",
      "🔗 You build connections stronger than the strongest indica!"
    ]
  },
  
  learning: {
    name: "📚 Learning Achievement",
    emoji: "📚",
    description: "Educational accomplishments and skill development",
    celebrations: [
      "🧠 Your thirst for knowledge is as impressive as a master grower's dedication!",
      "📖 You've absorbed wisdom like premium cannabis absorbs nutrients!",
      "🎓 Your educational journey deserves the highest grade hash!",
      "💡 Your insights are lighting up minds like the finest sativa!",
      "🔍 Your curiosity leads to discoveries as valuable as rare terpenes!",
      "⚡ Your learning acceleration is faster than trichome development!",
      "🌟 Your intellectual growth rivals the most magnificent cannabis cultivation!"
    ]
  },
  
  creative: {
    name: "🎨 Creative Achievement",
    emoji: "🎨",
    description: "Artistic and creative accomplishments",
    celebrations: [
      "🎨 Your creativity flows like the smoothest cannabis smoke!",
      "✨ Your artistic vision is as clear as the purest concentrates!",
      "🌈 You paint the world with colors as vibrant as cannabis flowers!",
      "🎭 Your creative expression is more uplifting than the finest sativa!",
      "💫 Your imagination grows wild like cannabis in perfect conditions!",
      "🎪 Your artistic journey deserves a celebration worthy of harvest festival!",
      "🎵 Your creative harmony resonates like wind through cannabis leaves!"
    ]
  },
  
  personal_growth: {
    name: "🌱 Personal Growth",
    emoji: "🌱",
    description: "Self-improvement and personal development",
    celebrations: [
      "🌱 Your personal growth journey is as beautiful as watching cannabis flourish!",
      "🦋 Your transformation is more stunning than cannabis in full bloom!",
      "💪 You've cultivated strength like a master grower nurtures plants!",
      "🧘 Your inner peace radiates like perfectly balanced cannabis effects!",
      "🌟 Your self-improvement shines brighter than LED grow lights!",
      "🎯 You've hit your personal targets with precision like a skilled trimmer!",
      "🏔️ You've climbed personal mountains higher than the tallest cannabis plants!"
    ]
  }
};

// Special celebration effects for different achievement levels
const CELEBRATION_EFFECTS = {
  small: {
    emoji: "🎉",
    particles: "✨🌟💫",
    intensity: "A well-deserved celebration!"
  },
  medium: {
    emoji: "🎊",
    particles: "🎉✨🌟💫🎊",
    intensity: "An amazing achievement worthy of fanfare!"
  },
  large: {
    emoji: "🎆",
    particles: "🎆🎉🎊✨🌟💫🎭🎪",
    intensity: "A monumental success that deserves the grandest celebration!"
  },
  legendary: {
    emoji: "👑",
    particles: "👑🎆🎉🎊✨🌟💫🎭🎪🏆💎",
    intensity: "A legendary achievement that will be remembered forever!"
  }
};

// Achievement level milestones (based on XP or other metrics)
const ACHIEVEMENT_LEVELS = [
  { threshold: 0, level: "Seedling", emoji: "🌱", effect: "small" },
  { threshold: 100, level: "Sprouting", emoji: "🌿", effect: "small" },
  { threshold: 500, level: "Growing", emoji: "🌸", effect: "medium" },
  { threshold: 1500, level: "Flowering", emoji: "🌺", effect: "medium" },
  { threshold: 3000, level: "Harvested", emoji: "🌾", effect: "large" },
  { threshold: 5000, level: "Master Grower", emoji: "👨‍🌾", effect: "large" },
  { threshold: 10000, level: "Cannabis Sage", emoji: "🧙‍♀️", effect: "legendary" }
];

// XP rewards for celebration activities
const XP_REWARDS = {
  celebrate_self: 8,           // Celebrating own achievement
  celebrate_others: 10,        // Celebrating others' achievements
  community_celebration: 15,   // Participating in community celebrations
  milestone_bonus: 20,         // Bonus for significant milestones
  participation: 5,            // Participating in celebrations
  support_bonus: 12           // Bonus for supporting others
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('celebrate')
    .setDescription('🎉 Celebrate achievements and milestones with cannabis-themed festivities!')
    .addSubcommand(subcommand =>
      subcommand
        .setName('achievement')
        .setDescription('Celebrate a personal or community achievement')
        .addStringOption(option =>
          option
            .setName('type')
            .setDescription('What type of achievement are you celebrating?')
            .setRequired(true)
            .addChoices(
              { name: '🎯 Personal Milestone', value: 'milestone' },
              { name: '🌿 Cannabis Journey', value: 'cannabis_achievement' },
              { name: '🤝 Community Achievement', value: 'community' },
              { name: '📚 Learning Achievement', value: 'learning' },
              { name: '🎨 Creative Achievement', value: 'creative' },
              { name: '🌱 Personal Growth', value: 'personal_growth' }
            )
        )
        .addStringOption(option =>
          option
            .setName('description')
            .setDescription('Describe your achievement')
            .setRequired(true)
            .setMaxLength(300)
        )
        .addStringOption(option =>
          option
            .setName('level')
            .setDescription('How significant is this achievement?')
            .setRequired(false)
            .addChoices(
              { name: '🌱 Small Win', value: 'small' },
              { name: '🌟 Good Achievement', value: 'medium' },
              { name: '🎆 Major Milestone', value: 'large' },
              { name: '👑 Legendary Accomplishment', value: 'legendary' }
            )
        )
        .addUserOption(option =>
          option
            .setName('celebrate_with')
            .setDescription('Tag someone to celebrate with you (optional)')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('others')
        .setDescription('Celebrate someone else\'s achievement')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('Who are you celebrating?')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('achievement')
            .setDescription('What are you celebrating about them?')
            .setRequired(true)
            .setMaxLength(200)
        )
        .addStringOption(option =>
          option
            .setName('type')
            .setDescription('What type of achievement is it?')
            .setRequired(false)
            .addChoices(
              { name: '🎯 Personal Milestone', value: 'milestone' },
              { name: '🌿 Cannabis Journey', value: 'cannabis_achievement' },
              { name: '🤝 Community Achievement', value: 'community' },
              { name: '📚 Learning Achievement', value: 'learning' },
              { name: '🎨 Creative Achievement', value: 'creative' },
              { name: '🌱 Personal Growth', value: 'personal_growth' }
            )
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('milestone')
        .setDescription('Check your cannabis community milestone progress')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('community')
        .setDescription('Join or start a community-wide celebration')
        .addStringOption(option =>
          option
            .setName('event')
            .setDescription('What community event are we celebrating?')
            .setRequired(true)
            .setMaxLength(200)
        )
    ),

  async execute(interaction) {
    try {
      const subcommand = interaction.options.getSubcommand();
      const userId = interaction.user.id;
      const guildId = interaction.guild.id;

      await interaction.deferReply();

      switch (subcommand) {
        case 'achievement':
          await this.handlePersonalAchievement(interaction, userId, guildId);
          break;
        case 'others':
          await this.handleCelebrateOthers(interaction, userId, guildId);
          break;
        case 'milestone':
          await this.handleMilestoneCheck(interaction, userId, guildId);
          break;
        case 'community':
          await this.handleCommunityCelebration(interaction, userId, guildId);
          break;
        default:
          throw new Error(`Unknown subcommand: ${subcommand}`);
      }

    } catch (error) {
      console.error('Error executing celebrate command:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor('#ff6b6b')
        .setTitle('❌ Celebration Error')
        .setDescription('An error occurred while preparing your celebration.')
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
   * Handle personal achievement celebration
   */
  async handlePersonalAchievement(interaction, userId, guildId) {
    const type = interaction.options.getString('type');
    const description = interaction.options.getString('description');
    const level = interaction.options.getString('level') || 'medium';
    const celebrateWith = interaction.options.getUser('celebrate_with');

    const celebrationType = CELEBRATION_TYPES[type];
    const celebrationEffect = CELEBRATION_EFFECTS[level];

    // Select random celebration message
    const celebrationMessage = celebrationType.celebrations[
      Math.floor(Math.random() * celebrationType.celebrations.length)
    ];

    // Initialize celebration tracking
    if (!global.celebrationTracking) {
      global.celebrationTracking = new Map();
    }

    // Create celebration record
    const celebrationId = `cel_${userId}_${Date.now()}`;
    const celebrationData = {
      id: celebrationId,
      user: userId,
      type,
      description,
      level,
      celebrateWith: celebrateWith?.id,
      timestamp: Date.now(),
      reactions: [],
      comments: []
    };

    global.celebrationTracking.set(celebrationId, celebrationData);

    // Create celebration embed
    const celebrationEmbed = this.createCelebrationEmbed(
      interaction.user,
      celebrationData,
      celebrationType,
      celebrationEffect,
      celebrationMessage,
      celebrateWith
    );

    // Create action buttons
    const actionRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`celebrate_cheer_${celebrationId}`)
          .setLabel('🎉 Cheer')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`celebrate_applaud_${celebrationId}`)
          .setLabel('👏 Applaud')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`celebrate_share_${celebrationId}`)
          .setLabel('📤 Share Joy')
          .setStyle(ButtonStyle.Secondary)
      );

    if (celebrateWith) {
      actionRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`celebrate_join_${celebrationId}`)
          .setLabel('🤝 Join Celebration')
          .setStyle(ButtonStyle.Secondary)
      );
    }

    await interaction.editReply({
      embeds: [celebrationEmbed],
      components: [actionRow]
    });

    // Calculate XP reward
    let xpReward = XP_REWARDS.celebrate_self;
    
    // Level bonuses
    switch (level) {
      case 'large':
        xpReward += 5;
        break;
      case 'legendary':
        xpReward += XP_REWARDS.milestone_bonus;
        break;
    }

    // Track engagement
    await EngagementService.trackEngagementActivity(
      userId,
      guildId,
      'celebrate',
      interaction.channelId,
      {
        action: 'celebrate_achievement',
        type,
        level,
        hasCelebrateWith: !!celebrateWith,
        xpEarned: xpReward
      }
    );

    // Notify celebrate_with user if specified
    if (celebrateWith) {
      await EngagementService.trackEngagementActivity(
        celebrateWith.id,
        guildId,
        'celebrate',
        interaction.channelId,
        {
          action: 'invited_to_celebrate',
          celebratedBy: userId,
          xpEarned: XP_REWARDS.participation
        }
      );
    }
  },

  /**
   * Handle celebrating others' achievements
   */
  async handleCelebrateOthers(interaction, userId, guildId) {
    const targetUser = interaction.options.getUser('user');
    const achievement = interaction.options.getString('achievement');
    const type = interaction.options.getString('type') || 'milestone';

    // Prevent self-celebration through this command
    if (targetUser.id === userId) {
      const selfCelebrationEmbed = new EmbedBuilder()
        .setColor('#ffc107')
        .setTitle('🪞 Celebration Redirect')
        .setDescription('Use `/celebrate achievement` to celebrate your own accomplishments!')
        .addFields({
          name: '💡 Tip',
          value: 'Celebrating others is wonderful, but don\'t forget to acknowledge your own achievements too!',
          inline: false
        })
        .setFooter({
          text: 'GrowmiesNJ • Celebrating Others',
          iconURL: interaction.user.displayAvatarURL()
        });

      return await interaction.editReply({ embeds: [selfCelebrationEmbed] });
    }

    // Check for bots
    if (targetUser.bot) {
      const botCelebrationEmbed = new EmbedBuilder()
        .setColor('#17a2b8')
        .setTitle('🤖 Bot Appreciation')
        .setDescription('While bots work hard, your celebration energy is better directed toward community members!')
        .setFooter({
          text: 'GrowmiesNJ • Human Achievements',
          iconURL: interaction.user.displayAvatarURL()
        });

      return await interaction.editReply({ embeds: [botCelebrationEmbed] });
    }

    const celebrationType = CELEBRATION_TYPES[type];
    const celebrationEffect = CELEBRATION_EFFECTS.medium; // Default to medium for others

    // Select celebration message
    const celebrationMessage = celebrationType.celebrations[
      Math.floor(Math.random() * celebrationType.celebrations.length)
    ];

    // Create celebration embed for others
    const celebrationEmbed = new EmbedBuilder()
      .setColor(BRAND_COLORS.PRIMARY_GREEN)
      .setTitle(`🎉 Community Celebration for ${targetUser.displayName}!`)
      .setDescription(`${celebrationType.emoji} **${celebrationType.name}**\n\n${celebrationMessage}`)
      .addFields(
        {
          name: '🏆 Achievement',
          value: achievement,
          inline: false
        },
        {
          name: '💚 Celebrated By',
          value: `${interaction.user.displayName}`,
          inline: true
        },
        {
          name: '🌟 Recognition',
          value: `${celebrationEffect.emoji} ${celebrationEffect.intensity}`,
          inline: true
        },
        {
          name: '✨ Celebration Effects',
          value: celebrationEffect.particles,
          inline: false
        }
      )
      .setFooter({
        text: 'GrowmiesNJ • Community Support and Recognition',
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

    // Create action buttons
    const actionRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`celebrate_join_others_${targetUser.id}`)
          .setLabel('🎊 Join the Celebration')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`celebrate_congratulate_${targetUser.id}`)
          .setLabel('🤝 Congratulate')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`celebrate_inspire_${targetUser.id}`)
          .setLabel('💫 You Inspire Me')
          .setStyle(ButtonStyle.Secondary)
      );

    await interaction.editReply({
      embeds: [celebrationEmbed],
      components: [actionRow]
    });

    // Track engagement for both users
    await EngagementService.trackEngagementActivity(
      userId,
      guildId,
      'celebrate',
      interaction.channelId,
      {
        action: 'celebrate_others',
        target: targetUser.id,
        type,
        xpEarned: XP_REWARDS.celebrate_others
      }
    );

    await EngagementService.trackEngagementActivity(
      targetUser.id,
      guildId,
      'celebrate',
      interaction.channelId,
      {
        action: 'received_celebration',
        from: userId,
        achievement,
        xpEarned: XP_REWARDS.support_bonus
      }
    );
  },

  /**
   * Handle milestone progress check
   */
  async handleMilestoneCheck(interaction, userId, guildId) {
    // This would typically pull from the user's actual XP/engagement data
    // For now, we'll simulate based on engagement activity
    
    // Get user's total XP (this would come from the database in a real implementation)
    const simulatedXP = Math.floor(Math.random() * 15000); // Simulate current XP
    
    // Find current achievement level
    const currentLevel = ACHIEVEMENT_LEVELS
      .reverse()
      .find(level => simulatedXP >= level.threshold) || ACHIEVEMENT_LEVELS[0];
    
    // Find next level
    const nextLevelIndex = ACHIEVEMENT_LEVELS.findIndex(level => level.threshold > simulatedXP);
    const nextLevel = nextLevelIndex !== -1 ? ACHIEVEMENT_LEVELS[nextLevelIndex] : null;

    const milestoneEmbed = new EmbedBuilder()
      .setColor(BRAND_COLORS.PRIMARY_GREEN)
      .setTitle('🏆 Your Cannabis Community Journey')
      .setDescription('Track your growth and achievements in our green community!')
      .addFields(
        {
          name: '🌱 Current Level',
          value: `${currentLevel.emoji} **${currentLevel.level}**\nTotal XP: ${simulatedXP.toLocaleString()}`,
          inline: true
        },
        {
          name: '🎯 Progress to Next Level',
          value: nextLevel ? 
            `${nextLevel.emoji} **${nextLevel.level}**\nNeed: ${(nextLevel.threshold - simulatedXP).toLocaleString()} more XP` :
            '👑 **Maximum Level Achieved!**\nYou\'ve reached Cannabis Sage status!',
          inline: true
        }
      );

    // Add progress bar if there's a next level
    if (nextLevel) {
      const progress = ((simulatedXP - currentLevel.threshold) / (nextLevel.threshold - currentLevel.threshold)) * 100;
      const progressBar = '█'.repeat(Math.floor(progress / 5)) + '░'.repeat(20 - Math.floor(progress / 5));
      
      milestoneEmbed.addFields({
        name: '📊 Level Progress',
        value: `${progressBar} ${progress.toFixed(1)}%`,
        inline: false
      });
    }

    // Add achievement suggestions
    milestoneEmbed.addFields(
      {
        name: '🌟 Ways to Grow',
        value: '• Participate in daily challenges\n• Help community members\n• Share cannabis knowledge\n• Spread positivity with compliments\n• Engage in discussions and polls',
        inline: false
      },
      {
        name: '🎉 Celebration Worthy Moments',
        value: '• Every 1000 XP milestone\n• Learning new cannabis facts\n• Helping a newcomer\n• Completing challenge streaks\n• Positive community contributions',
        inline: false
      }
    );

    milestoneEmbed.setFooter({
      text: 'GrowmiesNJ • Your journey matters to our community',
      iconURL: interaction.user.displayAvatarURL()
    })
    .setTimestamp();

    await interaction.editReply({ embeds: [milestoneEmbed] });

    // Track milestone check
    await EngagementService.trackEngagementActivity(
      userId,
      guildId,
      'celebrate',
      interaction.channelId,
      {
        action: 'check_milestone',
        currentLevel: currentLevel.level,
        currentXP: simulatedXP,
        xpEarned: 2
      }
    );
  },

  /**
   * Handle community-wide celebrations
   */
  async handleCommunityCelebration(interaction, userId, guildId) {
    const event = interaction.options.getString('event');

    // Initialize community celebrations
    if (!global.communityCelebrations) {
      global.communityCelebrations = new Map();
    }

    const celebrationId = `community_${Date.now()}`;
    const celebrationData = {
      id: celebrationId,
      event,
      initiator: userId,
      timestamp: Date.now(),
      participants: [userId],
      energy: 1
    };

    global.communityCelebrations.set(celebrationId, celebrationData);

    const communityEmbed = new EmbedBuilder()
      .setColor(BRAND_COLORS.PRIMARY_GREEN)
      .setTitle('🎪 Community-Wide Celebration!')
      .setDescription(`🎉 **${event}**\n\nLet's celebrate this moment together as a cannabis community!`)
      .addFields(
        {
          name: '🌟 Celebration Energy',
          value: `${celebrationData.energy} participant${celebrationData.energy !== 1 ? 's' : ''} celebrating!`,
          inline: true
        },
        {
          name: '💚 Started By',
          value: `${interaction.user.displayName}`,
          inline: true
        },
        {
          name: '🎊 Join the Party',
          value: 'Click the buttons below to add your celebration energy!',
          inline: false
        },
        {
          name: '🌿 Cannabis Community Spirit',
          value: 'Like a perfect grow circle, we celebrate together and lift each other up!',
          inline: false
        }
      )
      .setFooter({
        text: 'GrowmiesNJ • Stronger together, celebrating as one',
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

    // Create participation buttons
    const actionRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`community_party_${celebrationId}`)
          .setLabel('🎉 Party Time!')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`community_cheer_${celebrationId}`)
          .setLabel('📣 Spread Cheer')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`community_unity_${celebrationId}`)
          .setLabel('🤝 Unity Power')
          .setStyle(ButtonStyle.Secondary)
      );

    await interaction.editReply({
      embeds: [communityEmbed],
      components: [actionRow]
    });

    // Track community celebration
    await EngagementService.trackEngagementActivity(
      userId,
      guildId,
      'celebrate',
      interaction.channelId,
      {
        action: 'start_community_celebration',
        event,
        celebrationId,
        xpEarned: XP_REWARDS.community_celebration
      }
    );
  },

  /**
   * Create celebration embed for personal achievements
   */
  createCelebrationEmbed(user, celebrationData, celebrationType, celebrationEffect, celebrationMessage, celebrateWith) {
    const embed = new EmbedBuilder()
      .setColor(BRAND_COLORS.PRIMARY_GREEN)
      .setTitle(`${celebrationEffect.emoji} Achievement Celebration!`)
      .setDescription(`${celebrationType.emoji} **${celebrationType.name}**\n\n${celebrationMessage}`)
      .addFields(
        {
          name: '🏆 Achievement',
          value: celebrationData.description,
          inline: false
        },
        {
          name: '🌟 Celebration Level',
          value: `${celebrationEffect.emoji} ${celebrationEffect.intensity}`,
          inline: true
        },
        {
          name: '💚 Achieved By',
          value: `${user.displayName}`,
          inline: true
        }
      );

    if (celebrateWith) {
      embed.addFields({
        name: '🤝 Celebrating With',
        value: `${celebrateWith.displayName}`,
        inline: true
      });
    }

    embed.addFields(
      {
        name: '✨ Celebration Effects',
        value: celebrationEffect.particles,
        inline: false
      },
      {
        name: '🌿 Cannabis Wisdom',
        value: 'Every achievement is like a successful harvest - the result of patience, care, and dedication!',
        inline: false
      }
    );

    embed.setFooter({
      text: 'GrowmiesNJ • Celebrating growth, one achievement at a time',
      iconURL: user.displayAvatarURL()
    })
    .setTimestamp();

    return embed;
  }
};