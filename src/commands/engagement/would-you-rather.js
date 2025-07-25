/**
 * Would You Rather Command for GrowmiesNJ Discord Bot
 * 
 * Cannabis-themed "Would You Rather" dilemmas with community voting
 * Features age verification, community engagement, and thought-provoking scenarios
 */

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const EngagementService = require('../../services/engagementService');
const { WelcomeEmbeds, BRAND_COLORS } = require('../../utils/embeds');

// Cannabis-themed "Would You Rather" questions organized by category
const CANNABIS_DILEMMAS = {
  // Consumption preferences
  consumption: [
    {
      optionA: "Only smoke flower for the rest of your life",
      optionB: "Only consume edibles for the rest of your life",
      category: "Consumption Method"
    },
    {
      optionA: "Have unlimited access to top-shelf indica",
      optionB: "Have unlimited access to premium sativa",
      category: "Strain Preference"
    },
    {
      optionA: "Only vape concentrates forever",
      optionB: "Only use traditional joints/bowls forever",
      category: "Consumption Style"
    },
    {
      optionA: "Wait 2 hours for edibles to kick in every time",
      optionB: "Have effects only last 30 minutes every time",
      category: "Experience Duration"
    },
    {
      optionA: "Only consume during the day (6AM-6PM)",
      optionB: "Only consume at night (6PM-6AM)",
      category: "Timing Preference"
    }
  ],

  // Lifestyle scenarios
  lifestyle: [
    {
      optionA: "Live in a cannabis-legal state with high taxes",
      optionB: "Live where it's cheaper but still federally illegal",
      category: "Legal vs Economic"
    },
    {
      optionA: "Work in the cannabis industry for average pay",
      optionB: "Work outside the industry for double the salary",
      category: "Career Choice"
    },
    {
      optionA: "Have a small personal grow (4 plants max)",
      optionB: "Have unlimited dispensary budget",
      category: "Supply Method"
    },
    {
      optionA: "Only consume cannabis you grew yourself",
      optionB: "Only consume from premium dispensaries",
      category: "Source Preference"
    },
    {
      optionA: "Be able to grow any strain perfectly",
      optionB: "Never pay for cannabis again",
      category: "Skill vs Savings"
    }
  ],

  // Social scenarios
  social: [
    {
      optionA: "Only consume cannabis alone forever",
      optionB: "Only consume in large groups forever",
      category: "Social Setting"
    },
    {
      optionA: "Share your stash with friends but run out faster",
      optionB: "Keep it private but always have enough",
      category: "Sharing Dilemma"
    },
    {
      optionA: "Host all cannabis social gatherings",
      optionB: "Always be the guest, never the host",
      category: "Social Role"
    },
    {
      optionA: "Be the cannabis educator in your friend group",
      optionB: "Always be learning from others",
      category: "Knowledge Role"
    },
    {
      optionA: "Have cannabis friends who don't share interests",
      optionB: "Have non-cannabis friends who share everything else",
      category: "Friendship Balance"
    }
  ],

  // Hypothetical scenarios
  hypothetical: [
    {
      optionA: "Meet the person who discovered THC",
      optionB: "Visit the first cannabis cultivation site",
      category: "Historical Experience"
    },
    {
      optionA: "Have perfect cannabis tolerance (never increases)",
      optionB: "Have instant tolerance reset ability",
      category: "Tolerance Management"
    },
    {
      optionA: "Know the exact genetics of any strain by smell",
      optionB: "Predict the perfect dosage for any person",
      category: "Cannabis Superpower"
    },
    {
      optionA: "Experience the first cannabis high again",
      optionB: "Never have a bad cannabis experience",
      category: "Experience Quality"
    },
    {
      optionA: "Have cannabis that lasts twice as long",
      optionB: "Have effects that are twice as strong",
      category: "Enhancement Choice"
    }
  ],

  // Practical dilemmas
  practical: [
    {
      optionA: "Have access to every strain but can't choose",
      optionB: "Only access to one perfect strain forever",
      category: "Variety vs Perfection"
    },
    {
      optionA: "Store cannabis that stays fresh for years",
      optionB: "Have unlimited fresh supply delivered daily",
      category: "Storage vs Delivery"
    },
    {
      optionA: "Perfect growing conditions but limited space",
      optionB: "Unlimited space but challenging conditions",
      category: "Growing Constraints"
    },
    {
      optionA: "Know exactly when cannabis will be federally legal",
      optionB: "Have guaranteed personal legal protection now",
      category: "Future vs Present"
    },
    {
      optionA: "Have cannabis that never causes anxiety",
      optionB: "Have cannabis that always enhances creativity",
      category: "Effect Guarantee"
    }
  ]
};

// XP rewards for participation
const XP_REWARDS = {
  vote: 4,          // Base XP for voting
  create: 6,        // XP for creating a dilemma
  discussion: 2,    // XP per thoughtful comment
  first_vote: 8     // Bonus for being first to vote on new dilemma
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('would-you-rather')
    .setDescription('🤔 Cannabis-themed "Would You Rather" dilemmas and community voting!')
    .addSubcommand(subcommand =>
      subcommand
        .setName('random')
        .setDescription('Get a random cannabis dilemma to ponder')
        .addStringOption(option =>
          option
            .setName('category')
            .setDescription('Choose a specific category')
            .setRequired(false)
            .addChoices(
              { name: '💨 Consumption Preferences', value: 'consumption' },
              { name: '🏠 Lifestyle Scenarios', value: 'lifestyle' },
              { name: '👥 Social Situations', value: 'social' },
              { name: '🌟 Hypothetical Powers', value: 'hypothetical' },
              { name: '⚖️ Practical Dilemmas', value: 'practical' }
            )
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('create')
        .setDescription('Create your own cannabis "Would You Rather" question')
        .addStringOption(option =>
          option
            .setName('option_a')
            .setDescription('First option for the dilemma')
            .setRequired(true)
            .setMaxLength(150)
        )
        .addStringOption(option =>
          option
            .setName('option_b')
            .setDescription('Second option for the dilemma')
            .setRequired(true)
            .setMaxLength(150)
        )
        .addStringOption(option =>
          option
            .setName('category')
            .setDescription('Category for your question')
            .setRequired(false)
            .setMaxLength(50)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('stats')
        .setDescription('View community voting statistics and trends')
    ),

  async execute(interaction) {
    try {
      const subcommand = interaction.options.getSubcommand();
      const userId = interaction.user.id;
      const guildId = interaction.guild.id;

      await interaction.deferReply();

      switch (subcommand) {
        case 'random':
          await this.handleRandomDilemma(interaction, userId, guildId);
          break;
        case 'create':
          await this.handleCreateDilemma(interaction, userId, guildId);
          break;
        case 'stats':
          await this.handleStats(interaction, userId, guildId);
          break;
        default:
          throw new Error(`Unknown subcommand: ${subcommand}`);
      }

    } catch (error) {
      console.error('Error executing would-you-rather command:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor('#ff6b6b')
        .setTitle('❌ Dilemma Error')
        .setDescription('An error occurred while processing your cannabis dilemma.')
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
   * Handle random dilemma generation
   */
  async handleRandomDilemma(interaction, userId, guildId) {
    const category = interaction.options.getString('category');
    
    // Select category and dilemma
    let selectedCategory;
    let dilemmas;
    
    if (category) {
      selectedCategory = category;
      dilemmas = CANNABIS_DILEMMAS[category];
    } else {
      const categories = Object.keys(CANNABIS_DILEMMAS);
      selectedCategory = categories[Math.floor(Math.random() * categories.length)];
      dilemmas = CANNABIS_DILEMMAS[selectedCategory];
    }

    const dilemma = dilemmas[Math.floor(Math.random() * dilemmas.length)];
    
    // Initialize voting storage
    if (!global.wouldYouRatherVotes) {
      global.wouldYouRatherVotes = new Map();
    }

    // Create unique ID for this dilemma session
    const dilemmaId = `${userId}_${Date.now()}`;
    global.wouldYouRatherVotes.set(dilemmaId, {
      dilemma,
      category: selectedCategory,
      creator: userId,
      votes: { A: [], B: [] },
      created: Date.now()
    });

    // Create dilemma embed
    const dilemmaEmbed = this.createDilemmaEmbed(
      interaction.user,
      dilemma,
      selectedCategory,
      { A: [], B: [] }
    );

    // Create voting buttons
    const voteRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`wyr_vote_A_${dilemmaId}`)
          .setLabel(`A: ${dilemma.optionA.substring(0, 50)}${dilemma.optionA.length > 50 ? '...' : ''}`)
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🅰️'),
        new ButtonBuilder()
          .setCustomId(`wyr_vote_B_${dilemmaId}`)
          .setLabel(`B: ${dilemma.optionB.substring(0, 50)}${dilemma.optionB.length > 50 ? '...' : ''}`)
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('🅱️')
      );

    const actionRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`wyr_new_${userId}`)
          .setLabel('🔄 New Dilemma')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`wyr_discuss_${dilemmaId}`)
          .setLabel('💬 Discuss')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`wyr_stats_${userId}`)
          .setLabel('📊 Stats')
          .setStyle(ButtonStyle.Secondary)
      );

    await interaction.editReply({
      embeds: [dilemmaEmbed],
      components: [voteRow, actionRow]
    });

    // Track engagement
    await EngagementService.trackEngagementActivity(
      userId,
      guildId,
      'would-you-rather',
      interaction.channelId,
      {
        action: 'generate_dilemma',
        category: selectedCategory,
        dilemmaId,
        xpEarned: 2
      }
    );
  },

  /**
   * Handle custom dilemma creation
   */
  async handleCreateDilemma(interaction, userId, guildId) {
    const optionA = interaction.options.getString('option_a');
    const optionB = interaction.options.getString('option_b');
    const category = interaction.options.getString('category') || 'Custom';

    // Validate options
    if (optionA.toLowerCase() === optionB.toLowerCase()) {
      const errorEmbed = new EmbedBuilder()
        .setColor('#ff6b6b')
        .setTitle('❌ Invalid Dilemma')
        .setDescription('Your options must be different to create a meaningful dilemma!')
        .setFooter({
          text: 'GrowmiesNJ • Custom Dilemma Creation',
          iconURL: interaction.user.displayAvatarURL()
        });

      return await interaction.editReply({ embeds: [errorEmbed] });
    }

    const customDilemma = {
      optionA,
      optionB,
      category
    };

    // Initialize voting storage
    if (!global.wouldYouRatherVotes) {
      global.wouldYouRatherVotes = new Map();
    }

    // Create unique ID for this custom dilemma
    const dilemmaId = `custom_${userId}_${Date.now()}`;
    global.wouldYouRatherVotes.set(dilemmaId, {
      dilemma: customDilemma,
      category: 'Custom',
      creator: userId,
      votes: { A: [], B: [] },
      created: Date.now(),
      isCustom: true
    });

    // Create dilemma embed
    const dilemmaEmbed = this.createDilemmaEmbed(
      interaction.user,
      customDilemma,
      'Custom',
      { A: [], B: [] },
      true
    );

    // Create voting buttons
    const voteRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`wyr_vote_A_${dilemmaId}`)
          .setLabel(`A: ${optionA.substring(0, 50)}${optionA.length > 50 ? '...' : ''}`)
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🅰️'),
        new ButtonBuilder()
          .setCustomId(`wyr_vote_B_${dilemmaId}`)
          .setLabel(`B: ${optionB.substring(0, 50)}${optionB.length > 50 ? '...' : ''}`)
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('🅱️')
      );

    const actionRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`wyr_new_${userId}`)
          .setLabel('🔄 New Dilemma')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`wyr_discuss_${dilemmaId}`)
          .setLabel('💬 Discuss')
          .setStyle(ButtonStyle.Secondary)
      );

    await interaction.editReply({
      embeds: [dilemmaEmbed],
      components: [voteRow, actionRow]
    });

    // Track engagement with bonus XP for creating
    await EngagementService.trackEngagementActivity(
      userId,
      guildId,
      'would-you-rather',
      interaction.channelId,
      {
        action: 'create_dilemma',
        category: 'Custom',
        dilemmaId,
        xpEarned: XP_REWARDS.create
      }
    );
  },

  /**
   * Handle stats display
   */
  async handleStats(interaction, userId, guildId) {
    if (!global.wouldYouRatherVotes) {
      global.wouldYouRatherVotes = new Map();
    }

    // Calculate statistics
    const allVotes = Array.from(global.wouldYouRatherVotes.values());
    const totalDilemmas = allVotes.length;
    const totalVotes = allVotes.reduce((sum, d) => sum + d.votes.A.length + d.votes.B.length, 0);
    
    // Category breakdown
    const categoryStats = {};
    allVotes.forEach(d => {
      const cat = d.category;
      if (!categoryStats[cat]) {
        categoryStats[cat] = { dilemmas: 0, votes: 0 };
      }
      categoryStats[cat].dilemmas++;
      categoryStats[cat].votes += d.votes.A.length + d.votes.B.length;
    });

    // User's personal stats
    const userVotes = allVotes.filter(d => 
      d.votes.A.includes(userId) || d.votes.B.includes(userId)
    ).length;

    const userCreated = allVotes.filter(d => d.creator === userId).length;

    // Most controversial dilemma (closest to 50/50 split)
    let mostControversial = null;
    let smallestDifference = Infinity;
    
    allVotes.forEach(d => {
      const totalVotes = d.votes.A.length + d.votes.B.length;
      if (totalVotes >= 3) { // Minimum votes for controversy
        const percentage = (d.votes.A.length / totalVotes) * 100;
        const difference = Math.abs(percentage - 50);
        if (difference < smallestDifference) {
          smallestDifference = difference;
          mostControversial = d;
        }
      }
    });

    const statsEmbed = new EmbedBuilder()
      .setColor(BRAND_COLORS.PRIMARY_GREEN)
      .setTitle('📊 Cannabis Dilemma Statistics')
      .setDescription('Community insights from our "Would You Rather" discussions')
      .addFields(
        {
          name: '🌍 Community Overview',
          value: `**${totalDilemmas}** total dilemmas\n**${totalVotes}** votes cast\n**${Object.keys(categoryStats).length}** active categories`,
          inline: true
        },
        {
          name: '👤 Your Participation',
          value: `**${userVotes}** dilemmas voted on\n**${userCreated}** custom dilemmas created\n**${Math.round((userVotes/Math.max(totalDilemmas, 1)) * 100)}%** participation rate`,
          inline: true
        },
        {
          name: '🔥 Hot Categories',
          value: Object.entries(categoryStats)
            .sort((a, b) => b[1].votes - a[1].votes)
            .slice(0, 3)
            .map(([cat, stats]) => `**${cat}**: ${stats.votes} votes`)
            .join('\n') || 'No data yet',
          inline: true
        }
      );

    // Add most controversial if available
    if (mostControversial) {
      const aVotes = mostControversial.votes.A.length;
      const bVotes = mostControversial.votes.B.length;
      const total = aVotes + bVotes;
      const aPercent = Math.round((aVotes / total) * 100);
      
      statsEmbed.addFields({
        name: '🔥 Most Controversial Dilemma',
        value: `**${mostControversial.dilemma.category}**\n${aPercent}% vs ${100-aPercent}% split\n"${mostControversial.dilemma.optionA.substring(0, 80)}..."`,
        inline: false
      });
    }

    statsEmbed.addFields({
      name: '🎯 Engagement Tips',
      value: '• Vote on dilemmas to earn XP\n• Create custom dilemmas for bonus rewards\n• Discuss your choices for additional XP\n• Different categories offer unique perspectives',
      inline: false
    });

    statsEmbed.setFooter({
      text: 'GrowmiesNJ • Community Cannabis Dilemmas',
      iconURL: interaction.user.displayAvatarURL()
    })
    .setTimestamp();

    await interaction.editReply({ embeds: [statsEmbed] });

    // Track stats viewing
    await EngagementService.trackEngagementActivity(
      userId,
      guildId,
      'would-you-rather',
      interaction.channelId,
      {
        action: 'view_stats',
        xpEarned: 1
      }
    );
  },

  /**
   * Create dilemma embed
   */
  createDilemmaEmbed(user, dilemma, category, votes, isCustom = false) {
    const totalVotes = votes.A.length + votes.B.length;
    const aPercent = totalVotes > 0 ? Math.round((votes.A.length / totalVotes) * 100) : 0;
    const bPercent = totalVotes > 0 ? Math.round((votes.B.length / totalVotes) * 100) : 0;

    const embed = new EmbedBuilder()
      .setColor(BRAND_COLORS.PRIMARY_GREEN)
      .setTitle(`🤔 Cannabis Would You Rather${isCustom ? ' (Custom)' : ''}`)
      .setDescription(`**Category:** ${category}\n\nChoose your path in this cannabis dilemma!`)
      .addFields(
        {
          name: '🅰️ Option A',
          value: `${dilemma.optionA}\n\n**Votes:** ${votes.A.length} (${aPercent}%)`,
          inline: true
        },
        {
          name: '🅱️ Option B', 
          value: `${dilemma.optionB}\n\n**Votes:** ${votes.B.length} (${bPercent}%)`,
          inline: true
        }
      );

    if (totalVotes > 0) {
      // Create visual voting bar
      const barLength = 20;
      const aBlocks = Math.round((aPercent / 100) * barLength);
      const bBlocks = barLength - aBlocks;
      const votingBar = '🟩'.repeat(aBlocks) + '🟦'.repeat(bBlocks);
      
      embed.addFields({
        name: '📊 Current Results',
        value: `${votingBar}\n🟩 Option A: ${aPercent}% | 🟦 Option B: ${bPercent}%`,
        inline: false
      });
    }

    embed.addFields({
      name: '💡 Think About',
      value: '• What factors influence your choice?\n• How might this impact your cannabis experience?\n• What would your friends choose?\n• Are there any compromises possible?',
      inline: false
    });

    if (isCustom) {
      embed.addFields({
        name: '✨ Custom Creation Bonus',
        value: `Created by ${user.displayName} • +${XP_REWARDS.create} XP earned!`,
        inline: false
      });
    }

    embed.setFooter({
      text: 'GrowmiesNJ • Cannabis Community Dilemmas',
      iconURL: user.displayAvatarURL()
    })
    .setTimestamp();

    return embed;
  }
};