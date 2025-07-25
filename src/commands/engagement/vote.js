/**
 * Vote Command for GrowmiesNJ Discord Bot
 * 
 * Community polling system with cannabis-themed templates and age verification
 * Features anonymous voting, timed polls, and detailed analytics
 */

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const EngagementService = require('../../services/engagementService');
const { WelcomeEmbeds, BRAND_COLORS } = require('../../utils/embeds');

// Poll duration options in milliseconds
const POLL_DURATIONS = {
  '5m': 5 * 60 * 1000,
  '15m': 15 * 60 * 1000,
  '30m': 30 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '3h': 3 * 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '12h': 12 * 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000,
  '3d': 3 * 24 * 60 * 60 * 1000,
  '1w': 7 * 24 * 60 * 60 * 1000
};

// Cannabis-themed poll templates
const POLL_TEMPLATES = {
  strain_preference: {
    title: "🌿 Strain Preference Poll",
    question: "What's your favorite cannabis strain type for [situation]?",
    options: ["Indica for relaxation", "Sativa for energy", "Hybrid for balance", "It depends on mood"],
    category: "Strain Preferences"
  },
  consumption_method: {
    title: "💨 Consumption Method Poll", 
    question: "What's your preferred way to consume cannabis?",
    options: ["Smoking flower", "Vaping concentrates", "Edibles", "Tinctures/oils"],
    category: "Consumption Methods"
  },
  growing_interest: {
    title: "🌱 Growing Interest Poll",
    question: "Are you interested in growing your own cannabis?",
    options: ["Already growing!", "Want to start soon", "Interested but not ready", "Prefer dispensaries"],
    category: "Growing Interest"
  },
  community_events: {
    title: "🎉 Community Events Poll",
    question: "What type of community events interest you most?",
    options: ["Educational sessions", "Social gatherings", "Gaming tournaments", "Grow competitions"],
    category: "Community Events"
  },
  legal_topics: {
    title: "⚖️ Cannabis Legal Topics",
    question: "What cannabis legal topic interests you most?",
    options: ["Federal legalization", "State regulations", "Workplace policies", "Medical access"],
    category: "Legal Topics"
  }
};

// XP rewards for different poll activities
const XP_REWARDS = {
  create_poll: 8,      // Creating a poll
  vote: 3,             // Voting on a poll
  first_vote: 5,       // Being first to vote
  poll_complete: 4,    // Poll creator bonus when poll completes
  template_use: 2      // Using a template vs custom
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vote')
    .setDescription('🗳️ Create and participate in community polls!')
    .addSubcommand(subcommand =>
      subcommand
        .setName('create')
        .setDescription('Create a new community poll')
        .addStringOption(option =>
          option
            .setName('question')
            .setDescription('The poll question')
            .setRequired(true)
            .setMaxLength(200)
        )
        .addStringOption(option =>
          option
            .setName('options')
            .setDescription('Poll options separated by semicolons (2-10 options)')
            .setRequired(true)
            .setMaxLength(500)
        )
        .addStringOption(option =>
          option
            .setName('duration')
            .setDescription('How long the poll should run')
            .setRequired(false)
            .addChoices(
              { name: '5 minutes', value: '5m' },
              { name: '15 minutes', value: '15m' },
              { name: '30 minutes', value: '30m' },
              { name: '1 hour', value: '1h' },
              { name: '3 hours', value: '3h' },
              { name: '6 hours', value: '6h' },
              { name: '12 hours', value: '12h' },
              { name: '1 day', value: '1d' },
              { name: '3 days', value: '3d' },
              { name: '1 week', value: '1w' }
            )
        )
        .addBooleanOption(option =>
          option
            .setName('anonymous')
            .setDescription('Make votes anonymous (default: true)')
            .setRequired(false)
        )
        .addBooleanOption(option =>
          option
            .setName('cannabis_only')
            .setDescription('Restrict to 21+ cannabis content (default: false)')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('template')
        .setDescription('Create a poll from cannabis-themed templates')
        .addStringOption(option =>
          option
            .setName('template')
            .setDescription('Choose a poll template')
            .setRequired(true)
            .addChoices(
              { name: '🌿 Strain Preferences', value: 'strain_preference' },
              { name: '💨 Consumption Methods', value: 'consumption_method' },
              { name: '🌱 Growing Interest', value: 'growing_interest' },
              { name: '🎉 Community Events', value: 'community_events' },
              { name: '⚖️ Legal Topics', value: 'legal_topics' }
            )
        )
        .addStringOption(option =>
          option
            .setName('custom_question')
            .setDescription('Customize the template question (optional)')
            .setRequired(false)
            .setMaxLength(200)
        )
        .addStringOption(option =>
          option
            .setName('duration')
            .setDescription('How long the poll should run')
            .setRequired(false)
            .addChoices(
              { name: '5 minutes', value: '5m' },
              { name: '15 minutes', value: '15m' },
              { name: '30 minutes', value: '30m' },
              { name: '1 hour', value: '1h' },
              { name: '3 hours', value: '3h' },
              { name: '6 hours', value: '6h' },
              { name: '12 hours', value: '12h' },
              { name: '1 day', value: '1d' },
              { name: '3 days', value: '3d' },
              { name: '1 week', value: '1w' }
            )
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('active')
        .setDescription('View currently active polls')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('results')
        .setDescription('View results of a completed poll')
        .addStringOption(option =>
          option
            .setName('poll_id')
            .setDescription('The ID of the poll to view results for')
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    try {
      const subcommand = interaction.options.getSubcommand();
      const userId = interaction.user.id;
      const guildId = interaction.guild.id;

      await interaction.deferReply();

      switch (subcommand) {
        case 'create':
          await this.handleCreatePoll(interaction, userId, guildId);
          break;
        case 'template':
          await this.handleTemplatePoll(interaction, userId, guildId);
          break;
        case 'active':
          await this.handleActivePolls(interaction, userId, guildId);
          break;
        case 'results':
          await this.handlePollResults(interaction, userId, guildId);
          break;
        default:
          throw new Error(`Unknown subcommand: ${subcommand}`);
      }

    } catch (error) {
      console.error('Error executing vote command:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor('#ff6b6b')
        .setTitle('❌ Polling Error')
        .setDescription('An error occurred while processing your poll request.')
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
   * Handle custom poll creation
   */
  async handleCreatePoll(interaction, userId, guildId) {
    const question = interaction.options.getString('question');
    const optionsString = interaction.options.getString('options');
    const duration = interaction.options.getString('duration') || '1h';
    const anonymous = interaction.options.getBoolean('anonymous') ?? true;
    const cannabisOnly = interaction.options.getBoolean('cannabis_only') || false;

    // Parse and validate options
    const options = optionsString.split(';').map(opt => opt.trim()).filter(opt => opt.length > 0);
    
    if (options.length < 2) {
      const errorEmbed = new EmbedBuilder()
        .setColor('#ff6b6b')
        .setTitle('❌ Invalid Poll Options')
        .setDescription('Polls must have at least 2 options. Separate options with semicolons (;)')
        .addFields({
          name: '📝 Example',
          value: 'Option 1; Option 2; Option 3',
          inline: false
        })
        .setFooter({
          text: 'GrowmiesNJ • Poll Creation Help',
          iconURL: interaction.user.displayAvatarURL()
        });

      return await interaction.editReply({ embeds: [errorEmbed] });
    }

    if (options.length > 10) {
      const errorEmbed = new EmbedBuilder()
        .setColor('#ff6b6b')
        .setTitle('❌ Too Many Options')
        .setDescription('Polls can have a maximum of 10 options. Please reduce the number of choices.')
        .setFooter({
          text: 'GrowmiesNJ • Poll Creation Help',
          iconURL: interaction.user.displayAvatarURL()
        });

      return await interaction.editReply({ embeds: [errorEmbed] });
    }

    // Create the poll
    await this.createPoll(interaction, {
      question,
      options,
      duration,
      anonymous,
      cannabisOnly,
      creator: userId,
      isTemplate: false,
      category: 'Custom'
    });
  },

  /**
   * Handle template-based poll creation
   */
  async handleTemplatePoll(interaction, userId, guildId) {
    const templateKey = interaction.options.getString('template');
    const customQuestion = interaction.options.getString('custom_question');
    const duration = interaction.options.getString('duration') || '1h';

    const template = POLL_TEMPLATES[templateKey];
    if (!template) {
      const errorEmbed = new EmbedBuilder()
        .setColor('#ff6b6b')
        .setTitle('❌ Template Not Found')
        .setDescription('The requested poll template could not be found.')
        .setFooter({
          text: 'GrowmiesNJ • Template Error',
          iconURL: interaction.user.displayAvatarURL()
        });

      return await interaction.editReply({ embeds: [errorEmbed] });
    }

    // Use custom question if provided, otherwise use template question
    const question = customQuestion || template.question;

    // Create the poll with template data
    await this.createPoll(interaction, {
      question,
      options: template.options,
      duration,
      anonymous: true, // Templates default to anonymous
      cannabisOnly: true, // Templates are cannabis-themed
      creator: userId,
      isTemplate: true,
      category: template.category,
      templateKey
    });
  },

  /**
   * Create a poll with the given configuration
   */
  async createPoll(interaction, config) {
    const {
      question,
      options,
      duration,
      anonymous,
      cannabisOnly,
      creator,
      isTemplate,
      category,
      templateKey
    } = config;

    // Initialize poll storage
    if (!global.communityPolls) {
      global.communityPolls = new Map();
    }

    // Create unique poll ID
    const pollId = `poll_${creator}_${Date.now()}`;
    const durationMs = POLL_DURATIONS[duration] || POLL_DURATIONS['1h'];
    const endTime = Date.now() + durationMs;

    // Create poll data
    const pollData = {
      id: pollId,
      question,
      options: options.map((option, index) => ({
        text: option,
        votes: [],
        emoji: this.getOptionEmoji(index)
      })),
      creator,
      anonymous,
      cannabisOnly,
      isTemplate,
      category,
      templateKey,
      startTime: Date.now(),
      endTime,
      duration: duration,
      active: true,
      totalVotes: 0
    };

    // Store poll data
    global.communityPolls.set(pollId, pollData);

    // Create poll embed
    const pollEmbed = this.createPollEmbed(interaction.user, pollData);

    // Create voting buttons (max 5 per row, 2 rows max = 10 options)
    const components = this.createVotingComponents(pollData);

    await interaction.editReply({
      embeds: [pollEmbed],
      components
    });

    // Set timer to close poll
    setTimeout(() => {
      this.closePoll(pollId, interaction.channel);
    }, durationMs);

    // Track engagement
    const xp = XP_REWARDS.create_poll + (isTemplate ? XP_REWARDS.template_use : 0);
    await EngagementService.trackEngagementActivity(
      creator,
      interaction.guild.id,
      'vote',
      interaction.channelId,
      {
        action: 'create_poll',
        pollId,
        category,
        isTemplate,
        optionCount: options.length,
        xpEarned: xp
      }
    );
  },

  /**
   * Handle viewing active polls
   */
  async handleActivePolls(interaction, userId, guildId) {
    if (!global.communityPolls) {
      global.communityPolls = new Map();
    }

    // Filter active polls
    const activePolls = Array.from(global.communityPolls.values())
      .filter(poll => poll.active && poll.endTime > Date.now())
      .sort((a, b) => b.startTime - a.startTime) // Most recent first
      .slice(0, 10); // Show max 10 polls

    if (activePolls.length === 0) {
      const noPollsEmbed = new EmbedBuilder()
        .setColor(BRAND_COLORS.PRIMARY_GREEN)
        .setTitle('📊 No Active Polls')
        .setDescription('There are currently no active polls in the community.')
        .addFields({
          name: '🗳️ Create a Poll',
          value: 'Use `/vote create` to start a new community poll or `/vote template` for cannabis-themed templates!',
          inline: false
        })
        .setFooter({
          text: 'GrowmiesNJ • Community Polling',
          iconURL: interaction.user.displayAvatarURL()
        })
        .setTimestamp();

      return await interaction.editReply({ embeds: [noPollsEmbed] });
    }

    // Create active polls embed
    const activePollsEmbed = new EmbedBuilder()
      .setColor(BRAND_COLORS.PRIMARY_GREEN)
      .setTitle('📊 Active Community Polls')
      .setDescription(`Currently ${activePolls.length} active poll${activePolls.length !== 1 ? 's' : ''} running`)
      .setFooter({
        text: 'GrowmiesNJ • Community Polling',
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

    // Add poll summaries
    activePolls.forEach((poll, index) => {
      const timeLeft = poll.endTime - Date.now();
      const timeLeftStr = this.formatTimeRemaining(timeLeft);
      const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes.length, 0);
      
      activePollsEmbed.addFields({
        name: `${index + 1}. ${poll.question}`,
        value: `**Category:** ${poll.category}\n**Votes:** ${totalVotes}\n**Time Left:** ${timeLeftStr}\n**ID:** \`${poll.id}\``,
        inline: false
      });
    });

    await interaction.editReply({ embeds: [activePollsEmbed] });

    // Track stats viewing
    await EngagementService.trackEngagementActivity(
      userId,
      guildId,
      'vote',
      interaction.channelId,
      {
        action: 'view_active_polls',
        xpEarned: 1
      }
    );
  },

  /**
   * Handle viewing poll results
   */
  async handlePollResults(interaction, userId, guildId) {
    const pollId = interaction.options.getString('poll_id');

    if (!global.communityPolls || !global.communityPolls.has(pollId)) {
      const errorEmbed = new EmbedBuilder()
        .setColor('#ff6b6b')
        .setTitle('❌ Poll Not Found')
        .setDescription('The specified poll could not be found or may have been deleted.')
        .addFields({
          name: '🔍 Find Polls',
          value: 'Use `/vote active` to see currently active polls.',
          inline: false
        })
        .setFooter({
          text: 'GrowmiesNJ • Poll Results',
          iconURL: interaction.user.displayAvatarURL()
        });

      return await interaction.editReply({ embeds: [errorEmbed] });
    }

    const poll = global.communityPolls.get(pollId);
    const resultsEmbed = this.createResultsEmbed(poll);

    await interaction.editReply({ embeds: [resultsEmbed] });

    // Track results viewing
    await EngagementService.trackEngagementActivity(
      userId,
      guildId,
      'vote',
      interaction.channelId,
      {
        action: 'view_results',
        pollId,
        xpEarned: 1
      }
    );
  },

  /**
   * Create poll embed
   */
  createPollEmbed(user, pollData) {
    const totalVotes = pollData.options.reduce((sum, opt) => sum + opt.votes.length, 0);
    const timeLeft = pollData.endTime - Date.now();
    const timeLeftStr = this.formatTimeRemaining(timeLeft);

    const embed = new EmbedBuilder()
      .setColor(BRAND_COLORS.PRIMARY_GREEN)
      .setTitle(`🗳️ ${pollData.cannabisOnly ? '🌿 ' : ''}Community Poll`)
      .setDescription(`**${pollData.question}**\n\n${pollData.isTemplate ? `*Based on ${pollData.category} template*` : ''}`)
      .addFields(
        {
          name: '📊 Current Results',
          value: this.formatPollResults(pollData.options, totalVotes),
          inline: false
        },
        {
          name: '⏰ Poll Info',
          value: `**Total Votes:** ${totalVotes}\n**Time Left:** ${timeLeftStr}\n**Anonymous:** ${pollData.anonymous ? 'Yes' : 'No'}\n**Poll ID:** \`${pollData.id}\``,
          inline: false
        }
      );

    if (pollData.cannabisOnly) {
      embed.addFields({
        name: '🌿 Cannabis Content',
        value: 'This poll contains cannabis-related content and requires age verification.',
        inline: false
      });
    }

    embed.setFooter({
      text: `GrowmiesNJ • Created by ${user.displayName}`,
      iconURL: user.displayAvatarURL()
    })
    .setTimestamp(pollData.startTime);

    return embed;
  },

  /**
   * Create voting components (buttons)
   */
  createVotingComponents(pollData) {
    const components = [];
    const options = pollData.options;
    
    // Create rows of buttons (max 5 per row)
    for (let i = 0; i < options.length; i += 5) {
      const row = new ActionRowBuilder();
      const rowOptions = options.slice(i, i + 5);
      
      rowOptions.forEach((option, index) => {
        const globalIndex = i + index;
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`vote_option_${pollData.id}_${globalIndex}`)
            .setLabel(`${option.emoji} ${option.text.substring(0, 50)}${option.text.length > 50 ? '...' : ''}`)
            .setStyle(ButtonStyle.Secondary)
        );
      });
      
      components.push(row);
    }

    // Add action row for poll management
    const actionRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`vote_refresh_${pollData.id}`)
          .setLabel('🔄 Refresh')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`vote_results_${pollData.id}`)
          .setLabel('📊 Results')
          .setStyle(ButtonStyle.Secondary)
      );

    components.push(actionRow);
    return components;
  },

  /**
   * Create results embed for completed polls
   */
  createResultsEmbed(poll) {
    const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes.length, 0);
    
    // Sort options by vote count
    const sortedOptions = [...poll.options].sort((a, b) => b.votes.length - a.votes.length);
    const winner = sortedOptions[0];

    const embed = new EmbedBuilder()
      .setColor(poll.active ? BRAND_COLORS.PRIMARY_GREEN : '#6c757d')
      .setTitle(`📊 Poll Results${poll.active ? ' (Live)' : ' (Completed)'}`)
      .setDescription(`**${poll.question}**\n\n${poll.isTemplate ? `*${poll.category} template*` : ''}`)
      .addFields(
        {
          name: '🏆 Final Results',
          value: this.formatDetailedResults(sortedOptions, totalVotes),
          inline: false
        }
      );

    if (totalVotes > 0) {
      embed.addFields({
        name: '👑 Winner',
        value: `**${winner.emoji} ${winner.text}**\nReceived ${winner.votes.length} vote${winner.votes.length !== 1 ? 's' : ''} (${Math.round((winner.votes.length / totalVotes) * 100)}%)`,
        inline: false
      });
    }

    embed.addFields({
      name: '📈 Poll Statistics',
      value: `**Total Votes:** ${totalVotes}\n**Duration:** ${poll.duration}\n**Category:** ${poll.category}\n**Anonymous:** ${poll.anonymous ? 'Yes' : 'No'}`,
      inline: false
    });

    if (!poll.active) {
      embed.addFields({
        name: '✅ Poll Completed',
        value: `This poll ended <t:${Math.floor(poll.endTime / 1000)}:R>`,
        inline: false
      });
    }

    embed.setFooter({
      text: `GrowmiesNJ • Poll ID: ${poll.id}`,
      iconURL: poll.active ? null : 'https://example.com/completed-icon.png'
    })
    .setTimestamp(poll.startTime);

    return embed;
  },

  /**
   * Format poll results for display
   */
  formatPollResults(options, totalVotes) {
    if (totalVotes === 0) {
      return options.map(option => `${option.emoji} ${option.text}: 0 votes (0%)`).join('\n');
    }

    return options.map(option => {
      const votes = option.votes.length;
      const percentage = Math.round((votes / totalVotes) * 100);
      const bar = this.createProgressBar(percentage);
      return `${option.emoji} **${option.text}**\n${bar} ${votes} vote${votes !== 1 ? 's' : ''} (${percentage}%)`;
    }).join('\n\n');
  },

  /**
   * Format detailed results for completed polls
   */
  formatDetailedResults(sortedOptions, totalVotes) {
    if (totalVotes === 0) {
      return 'No votes were cast in this poll.';
    }

    return sortedOptions.map((option, index) => {
      const votes = option.votes.length;
      const percentage = Math.round((votes / totalVotes) * 100);
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '  ';
      const bar = this.createProgressBar(percentage);
      
      return `${medal} ${option.emoji} **${option.text}**\n${bar} ${votes} vote${votes !== 1 ? 's' : ''} (${percentage}%)`;
    }).join('\n\n');
  },

  /**
   * Create a progress bar for vote percentages
   */
  createProgressBar(percentage) {
    const barLength = 10;
    const filledBlocks = Math.round((percentage / 100) * barLength);
    const emptyBlocks = barLength - filledBlocks;
    return '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks);
  },

  /**
   * Get emoji for poll option
   */
  getOptionEmoji(index) {
    const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    return emojis[index] || '📝';
  },

  /**
   * Format time remaining
   */
  formatTimeRemaining(ms) {
    if (ms <= 0) return 'Ended';
    
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  },

  /**
   * Close a poll when it expires
   */
  async closePoll(pollId, channel) {
    if (!global.communityPolls || !global.communityPolls.has(pollId)) return;

    const poll = global.communityPolls.get(pollId);
    poll.active = false;

    // Try to update the poll message if possible
    try {
      const resultsEmbed = this.createResultsEmbed(poll);
      // Note: In a real implementation, you'd need to store message references
      // to update the original poll message
    } catch (error) {
      console.error('Error updating poll message:', error);
    }

    // Award completion bonus to poll creator
    const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes.length, 0);
    if (totalVotes > 0) {
      await EngagementService.trackEngagementActivity(
        poll.creator,
        null, // guild ID not available here
        'vote',
        null, // channel ID not available here
        {
          action: 'poll_completed',
          pollId,
          totalVotes,
          xpEarned: XP_REWARDS.poll_complete
        }
      );
    }
  }
};