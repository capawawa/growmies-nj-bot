/**
 * Suggest Command for GrowmiesNJ Discord Bot
 * 
 * Server improvement suggestion system with community voting and admin approval
 * Features suggestion tracking, upvoting, status updates, and implementation tracking
 */

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const EngagementService = require('../../services/engagementService');
const { WelcomeEmbeds, BRAND_COLORS } = require('../../utils/embeds');

// Suggestion categories
const SUGGESTION_CATEGORIES = {
  bot_features: {
    name: "🤖 Bot Features",
    description: "New commands, features, or bot functionality",
    emoji: "🤖"
  },
  cannabis_content: {
    name: "🌿 Cannabis Content",
    description: "Strain info, education, or cannabis-specific features",
    emoji: "🌿"
  },
  community_events: {
    name: "🎉 Community Events",
    description: "Social events, contests, or community activities",
    emoji: "🎉"
  },
  server_structure: {
    name: "🏗️ Server Structure",
    description: "Channels, roles, or server organization",
    emoji: "🏗️"
  },
  moderation: {
    name: "🛡️ Moderation & Safety",
    description: "Safety features, rules, or moderation tools",
    emoji: "🛡️"
  },
  user_experience: {
    name: "✨ User Experience",
    description: "Usability improvements or quality of life features",
    emoji: "✨"
  },
  integrations: {
    name: "🔗 Integrations",
    description: "Third-party integrations or external connections",
    emoji: "🔗"
  },
  other: {
    name: "💡 Other Ideas",
    description: "Creative suggestions that don't fit other categories",
    emoji: "💡"
  }
};

// Suggestion status types
const SUGGESTION_STATUS = {
  pending: {
    name: "Pending Review",
    color: "#6c757d",
    emoji: "⏳",
    description: "Awaiting admin review"
  },
  reviewing: {
    name: "Under Review",
    color: "#17a2b8",
    emoji: "👀",
    description: "Being reviewed by staff"
  },
  approved: {
    name: "Approved",
    color: "#28a745",
    emoji: "✅",
    description: "Approved for implementation"
  },
  implemented: {
    name: "Implemented",
    color: "#20c997",
    emoji: "🎉",
    description: "Successfully implemented"
  },
  rejected: {
    name: "Rejected",
    color: "#dc3545",
    emoji: "❌",
    description: "Not approved for implementation"
  },
  duplicate: {
    name: "Duplicate",
    color: "#fd7e14",
    emoji: "🔄",
    description: "Similar suggestion already exists"
  }
};

// XP rewards for suggestion activities
const XP_REWARDS = {
  submit_suggestion: 10,    // Submitting a suggestion
  upvote: 2,               // Upvoting a suggestion
  comment: 3,              // Adding a comment
  approved_bonus: 15,      // Bonus when suggestion is approved
  implemented_bonus: 25,   // Bonus when suggestion is implemented
  popular_suggestion: 20,  // Bonus for reaching high upvote threshold
  detailed_suggestion: 5   // Bonus for detailed suggestions
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('suggest')
    .setDescription('💡 Suggest improvements for the GrowmiesNJ server!')
    .addSubcommand(subcommand =>
      subcommand
        .setName('submit')
        .setDescription('Submit a new server improvement suggestion')
        .addStringOption(option =>
          option
            .setName('category')
            .setDescription('What type of suggestion is this?')
            .setRequired(true)
            .addChoices(
              { name: '🤖 Bot Features', value: 'bot_features' },
              { name: '🌿 Cannabis Content', value: 'cannabis_content' },
              { name: '🎉 Community Events', value: 'community_events' },
              { name: '🏗️ Server Structure', value: 'server_structure' },
              { name: '🛡️ Moderation & Safety', value: 'moderation' },
              { name: '✨ User Experience', value: 'user_experience' },
              { name: '🔗 Integrations', value: 'integrations' },
              { name: '💡 Other Ideas', value: 'other' }
            )
        )
        .addStringOption(option =>
          option
            .setName('title')
            .setDescription('Brief title for your suggestion')
            .setRequired(true)
            .setMaxLength(100)
        )
        .addStringOption(option =>
          option
            .setName('description')
            .setDescription('Detailed description of your suggestion')
            .setRequired(true)
            .setMaxLength(1000)
        )
        .addStringOption(option =>
          option
            .setName('reasoning')
            .setDescription('Why would this improve the server?')
            .setRequired(false)
            .setMaxLength(500)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('View server suggestions')
        .addStringOption(option =>
          option
            .setName('status')
            .setDescription('Filter by suggestion status')
            .setRequired(false)
            .addChoices(
              { name: '⏳ Pending Review', value: 'pending' },
              { name: '👀 Under Review', value: 'reviewing' },
              { name: '✅ Approved', value: 'approved' },
              { name: '🎉 Implemented', value: 'implemented' },
              { name: '❌ Rejected', value: 'rejected' },
              { name: '🔄 Duplicate', value: 'duplicate' }
            )
        )
        .addStringOption(option =>
          option
            .setName('category')
            .setDescription('Filter by category')
            .setRequired(false)
            .addChoices(
              { name: '🤖 Bot Features', value: 'bot_features' },
              { name: '🌿 Cannabis Content', value: 'cannabis_content' },
              { name: '🎉 Community Events', value: 'community_events' },
              { name: '🏗️ Server Structure', value: 'server_structure' },
              { name: '🛡️ Moderation & Safety', value: 'moderation' },
              { name: '✨ User Experience', value: 'user_experience' },
              { name: '🔗 Integrations', value: 'integrations' },
              { name: '💡 Other Ideas', value: 'other' }
            )
        )
        .addStringOption(option =>
          option
            .setName('sort')
            .setDescription('How to sort the suggestions')
            .setRequired(false)
            .addChoices(
              { name: '📊 Most Popular (Upvotes)', value: 'popular' },
              { name: '🕒 Newest First', value: 'newest' },
              { name: '⏰ Oldest First', value: 'oldest' },
              { name: '💬 Most Discussed', value: 'discussed' }
            )
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('View a specific suggestion in detail')
        .addStringOption(option =>
          option
            .setName('suggestion_id')
            .setDescription('The ID of the suggestion to view')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('stats')
        .setDescription('View suggestion statistics and your contributions')
    ),

  async execute(interaction) {
    try {
      const subcommand = interaction.options.getSubcommand();
      const userId = interaction.user.id;
      const guildId = interaction.guild.id;

      await interaction.deferReply();

      switch (subcommand) {
        case 'submit':
          await this.handleSubmitSuggestion(interaction, userId, guildId);
          break;
        case 'list':
          await this.handleListSuggestions(interaction, userId, guildId);
          break;
        case 'view':
          await this.handleViewSuggestion(interaction, userId, guildId);
          break;
        case 'stats':
          await this.handleSuggestionStats(interaction, userId, guildId);
          break;
        default:
          throw new Error(`Unknown subcommand: ${subcommand}`);
      }

    } catch (error) {
      console.error('Error executing suggest command:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor('#ff6b6b')
        .setTitle('❌ Suggestion Error')
        .setDescription('An error occurred while processing your suggestion.')
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
   * Handle suggestion submission
   */
  async handleSubmitSuggestion(interaction, userId, guildId) {
    const category = interaction.options.getString('category');
    const title = interaction.options.getString('title');
    const description = interaction.options.getString('description');
    const reasoning = interaction.options.getString('reasoning') || '';

    // Initialize suggestion storage
    if (!global.serverSuggestions) {
      global.serverSuggestions = new Map();
    }

    // Check for rate limiting (prevent spam)
    const recentSuggestions = Array.from(global.serverSuggestions.values())
      .filter(s => s.author === userId && Date.now() - s.submitted < 10 * 60 * 1000); // 10 minutes

    if (recentSuggestions.length >= 3) {
      const errorEmbed = new EmbedBuilder()
        .setColor('#ff6b6b')
        .setTitle('⏱️ Rate Limited')
        .setDescription('You can only submit 3 suggestions per 10 minutes. Please wait before submitting another.')
        .addFields({
          name: '💡 Use This Time To',
          value: '• Review existing suggestions\n• Upvote suggestions you like\n• Add comments to ongoing discussions',
          inline: false
        })
        .setFooter({
          text: 'GrowmiesNJ • Suggestion Rate Limiting',
          iconURL: interaction.user.displayAvatarURL()
        });

      return await interaction.editReply({ embeds: [errorEmbed] });
    }

    // Create unique suggestion ID
    const suggestionId = `sug_${userId}_${Date.now()}`;

    // Calculate XP rewards
    let xpReward = XP_REWARDS.submit_suggestion;
    if (reasoning.length > 100) {
      xpReward += XP_REWARDS.detailed_suggestion;
    }

    // Create suggestion data
    const suggestionData = {
      id: suggestionId,
      title,
      description,
      reasoning,
      category,
      author: userId,
      submitted: Date.now(),
      status: 'pending',
      upvotes: [],
      downvotes: [],
      comments: [],
      adminNotes: '',
      implementationDate: null
    };

    // Store suggestion
    global.serverSuggestions.set(suggestionId, suggestionData);

    // Create confirmation embed
    const confirmEmbed = this.createSuggestionEmbed(interaction.user, suggestionData, true);

    // Create action buttons
    const actionRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`suggest_upvote_${suggestionId}`)
          .setLabel('👍 Upvote')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`suggest_downvote_${suggestionId}`)
          .setLabel('👎 Downvote')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(`suggest_comment_${suggestionId}`)
          .setLabel('💬 Comment')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`suggest_share_${suggestionId}`)
          .setLabel('📤 Share')
          .setStyle(ButtonStyle.Secondary)
      );

    await interaction.editReply({
      embeds: [confirmEmbed],
      components: [actionRow]
    });

    // Track engagement
    await EngagementService.trackEngagementActivity(
      userId,
      guildId,
      'suggest',
      interaction.channelId,
      {
        action: 'submit_suggestion',
        suggestionId,
        category,
        xpEarned: xpReward
      }
    );

    // Notify admins in a hypothetical admin channel (would need channel ID)
    // This is where you'd send a notification to staff about the new suggestion
  },

  /**
   * Handle listing suggestions
   */
  async handleListSuggestions(interaction, userId, guildId) {
    if (!global.serverSuggestions) {
      global.serverSuggestions = new Map();
    }

    const statusFilter = interaction.options.getString('status');
    const categoryFilter = interaction.options.getString('category');
    const sortBy = interaction.options.getString('sort') || 'newest';

    // Filter suggestions
    let suggestions = Array.from(global.serverSuggestions.values());

    if (statusFilter) {
      suggestions = suggestions.filter(s => s.status === statusFilter);
    }

    if (categoryFilter) {
      suggestions = suggestions.filter(s => s.category === categoryFilter);
    }

    // Sort suggestions
    switch (sortBy) {
      case 'popular':
        suggestions.sort((a, b) => b.upvotes.length - a.upvotes.length);
        break;
      case 'newest':
        suggestions.sort((a, b) => b.submitted - a.submitted);
        break;
      case 'oldest':
        suggestions.sort((a, b) => a.submitted - b.submitted);
        break;
      case 'discussed':
        suggestions.sort((a, b) => b.comments.length - a.comments.length);
        break;
    }

    // Limit to first 10 for display
    suggestions = suggestions.slice(0, 10);

    if (suggestions.length === 0) {
      const noSuggestionsEmbed = new EmbedBuilder()
        .setColor(BRAND_COLORS.PRIMARY_GREEN)
        .setTitle('💡 No Suggestions Found')
        .setDescription('No suggestions match your current filters.')
        .addFields({
          name: '📝 Be The First!',
          value: 'Use `/suggest submit` to contribute your ideas to the community!',
          inline: false
        })
        .setFooter({
          text: 'GrowmiesNJ • Server Suggestions',
          iconURL: interaction.user.displayAvatarURL()
        });

      return await interaction.editReply({ embeds: [noSuggestionsEmbed] });
    }

    // Create list embed
    const listEmbed = new EmbedBuilder()
      .setColor(BRAND_COLORS.PRIMARY_GREEN)
      .setTitle('💡 Server Suggestions')
      .setDescription(`Showing ${suggestions.length} suggestion${suggestions.length !== 1 ? 's' : ''} (sorted by ${sortBy})`)
      .setFooter({
        text: 'GrowmiesNJ • Use /suggest view <id> for details',
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

    // Add suggestion summaries
    suggestions.forEach((suggestion, index) => {
      const status = SUGGESTION_STATUS[suggestion.status];
      const category = SUGGESTION_CATEGORIES[suggestion.category];
      const score = suggestion.upvotes.length - suggestion.downvotes.length;
      
      listEmbed.addFields({
        name: `${index + 1}. ${suggestion.title}`,
        value: `${status.emoji} **${status.name}** | ${category.emoji} ${category.name}\n**Score:** +${suggestion.upvotes.length}/-${suggestion.downvotes.length} (${score >= 0 ? '+' : ''}${score})\n**ID:** \`${suggestion.id}\``,
        inline: false
      });
    });

    await interaction.editReply({ embeds: [listEmbed] });

    // Track stats viewing
    await EngagementService.trackEngagementActivity(
      userId,
      guildId,
      'suggest',
      interaction.channelId,
      {
        action: 'list_suggestions',
        filters: { status: statusFilter, category: categoryFilter, sort: sortBy },
        xpEarned: 1
      }
    );
  },

  /**
   * Handle viewing a specific suggestion
   */
  async handleViewSuggestion(interaction, userId, guildId) {
    const suggestionId = interaction.options.getString('suggestion_id');

    if (!global.serverSuggestions || !global.serverSuggestions.has(suggestionId)) {
      const errorEmbed = new EmbedBuilder()
        .setColor('#ff6b6b')
        .setTitle('❌ Suggestion Not Found')
        .setDescription('The specified suggestion could not be found.')
        .addFields({
          name: '🔍 Find Suggestions',
          value: 'Use `/suggest list` to see available suggestions.',
          inline: false
        })
        .setFooter({
          text: 'GrowmiesNJ • Suggestion Lookup',
          iconURL: interaction.user.displayAvatarURL()
        });

      return await interaction.editReply({ embeds: [errorEmbed] });
    }

    const suggestion = global.serverSuggestions.get(suggestionId);
    const detailEmbed = this.createDetailedSuggestionEmbed(suggestion);

    // Create action buttons
    const actionRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`suggest_upvote_${suggestionId}`)
          .setLabel(`👍 Upvote (${suggestion.upvotes.length})`)
          .setStyle(ButtonStyle.Success)
          .setDisabled(suggestion.upvotes.includes(userId)),
        new ButtonBuilder()
          .setCustomId(`suggest_downvote_${suggestionId}`)
          .setLabel(`👎 Downvote (${suggestion.downvotes.length})`)
          .setStyle(ButtonStyle.Danger)
          .setDisabled(suggestion.downvotes.includes(userId)),
        new ButtonBuilder()
          .setCustomId(`suggest_comment_${suggestionId}`)
          .setLabel('💬 Add Comment')
          .setStyle(ButtonStyle.Secondary)
      );

    await interaction.editReply({
      embeds: [detailEmbed],
      components: [actionRow]
    });

    // Track viewing
    await EngagementService.trackEngagementActivity(
      userId,
      guildId,
      'suggest',
      interaction.channelId,
      {
        action: 'view_suggestion',
        suggestionId,
        xpEarned: 1
      }
    );
  },

  /**
   * Handle suggestion statistics
   */
  async handleSuggestionStats(interaction, userId, guildId) {
    if (!global.serverSuggestions) {
      global.serverSuggestions = new Map();
    }

    const allSuggestions = Array.from(global.serverSuggestions.values());
    
    // Overall statistics
    const totalSuggestions = allSuggestions.length;
    const statusCounts = {};
    const categoryCounts = {};
    
    Object.keys(SUGGESTION_STATUS).forEach(status => {
      statusCounts[status] = allSuggestions.filter(s => s.status === status).length;
    });
    
    Object.keys(SUGGESTION_CATEGORIES).forEach(category => {
      categoryCounts[category] = allSuggestions.filter(s => s.category === category).length;
    });

    // User's personal statistics
    const userSuggestions = allSuggestions.filter(s => s.author === userId);
    const userUpvotes = allSuggestions.filter(s => s.upvotes.includes(userId)).length;
    const userComments = allSuggestions.reduce((sum, s) => sum + s.comments.filter(c => c.author === userId).length, 0);
    
    // Most popular suggestions
    const topSuggestions = allSuggestions
      .sort((a, b) => (b.upvotes.length - b.downvotes.length) - (a.upvotes.length - a.downvotes.length))
      .slice(0, 3);

    const statsEmbed = new EmbedBuilder()
      .setColor(BRAND_COLORS.PRIMARY_GREEN)
      .setTitle('📊 Suggestion Statistics')
      .setDescription('Community suggestion insights and your contributions')
      .addFields(
        {
          name: '🌍 Community Overview',
          value: `**${totalSuggestions}** total suggestions\n**${statusCounts.implemented || 0}** implemented\n**${statusCounts.approved || 0}** approved`,
          inline: true
        },
        {
          name: '👤 Your Contributions',
          value: `**${userSuggestions.length}** suggestions submitted\n**${userUpvotes}** suggestions upvoted\n**${userComments}** comments made`,
          inline: true
        },
        {
          name: '📈 Status Breakdown',
          value: Object.entries(statusCounts)
            .map(([status, count]) => `${SUGGESTION_STATUS[status].emoji} ${count} ${status}`)
            .join('\n'),
          inline: true
        }
      );

    // Add top suggestions if available
    if (topSuggestions.length > 0) {
      const topSuggestionsText = topSuggestions.map((suggestion, index) => {
        const score = suggestion.upvotes.length - suggestion.downvotes.length;
        return `${index + 1}. **${suggestion.title}** (${score >= 0 ? '+' : ''}${score})`;
      }).join('\n');

      statsEmbed.addFields({
        name: '🏆 Most Popular Suggestions',
        value: topSuggestionsText,
        inline: false
      });
    }

    // Add category breakdown
    const topCategories = Object.entries(categoryCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([category, count]) => `${SUGGESTION_CATEGORIES[category].emoji} ${count} ${category.replace('_', ' ')}`)
      .join('\n');

    if (topCategories) {
      statsEmbed.addFields({
        name: '📂 Popular Categories',
        value: topCategories,
        inline: false
      });
    }

    statsEmbed.addFields({
      name: '💡 Engagement Tips',
      value: '• Submit detailed suggestions for bonus XP\n• Upvote suggestions you support\n• Add constructive comments\n• Check back for status updates',
      inline: false
    });

    statsEmbed.setFooter({
      text: 'GrowmiesNJ • Server Improvement Statistics',
      iconURL: interaction.user.displayAvatarURL()
    })
    .setTimestamp();

    await interaction.editReply({ embeds: [statsEmbed] });

    // Track stats viewing
    await EngagementService.trackEngagementActivity(
      userId,
      guildId,
      'suggest',
      interaction.channelId,
      {
        action: 'view_stats',
        xpEarned: 1
      }
    );
  },

  /**
   * Create suggestion embed
   */
  createSuggestionEmbed(user, suggestion, isNew = false) {
    const category = SUGGESTION_CATEGORIES[suggestion.category];
    const status = SUGGESTION_STATUS[suggestion.status];
    const score = suggestion.upvotes.length - suggestion.downvotes.length;

    const embed = new EmbedBuilder()
      .setColor(isNew ? BRAND_COLORS.PRIMARY_GREEN : status.color)
      .setTitle(`💡 ${isNew ? 'New ' : ''}Server Suggestion`)
      .setDescription(`**${suggestion.title}**\n\n${suggestion.description}`)
      .addFields(
        {
          name: '📂 Category',
          value: `${category.emoji} ${category.name}`,
          inline: true
        },
        {
          name: '📊 Score',
          value: `+${suggestion.upvotes.length}/-${suggestion.downvotes.length} (${score >= 0 ? '+' : ''}${score})`,
          inline: true
        },
        {
          name: '⚡ Status',
          value: `${status.emoji} ${status.name}`,
          inline: true
        }
      );

    if (suggestion.reasoning) {
      embed.addFields({
        name: '🎯 Reasoning',
        value: suggestion.reasoning,
        inline: false
      });
    }

    if (suggestion.comments.length > 0) {
      embed.addFields({
        name: '💬 Community Discussion',
        value: `${suggestion.comments.length} comment${suggestion.comments.length !== 1 ? 's' : ''} • Use buttons below to participate`,
        inline: false
      });
    }

    embed.addFields({
      name: '📋 Suggestion Info',
      value: `**Author:** <@${suggestion.author}>\n**Submitted:** <t:${Math.floor(suggestion.submitted / 1000)}:R>\n**ID:** \`${suggestion.id}\``,
      inline: false
    });

    if (isNew) {
      embed.addFields({
        name: '✅ Suggestion Submitted!',
        value: 'Your suggestion has been submitted for community review. Staff will evaluate it soon!',
        inline: false
      });
    }

    embed.setFooter({
      text: 'GrowmiesNJ • Server Improvement Suggestions',
      iconURL: user.displayAvatarURL()
    })
    .setTimestamp(suggestion.submitted);

    return embed;
  },

  /**
   * Create detailed suggestion embed for viewing
   */
  createDetailedSuggestionEmbed(suggestion) {
    const category = SUGGESTION_CATEGORIES[suggestion.category];
    const status = SUGGESTION_STATUS[suggestion.status];
    const score = suggestion.upvotes.length - suggestion.downvotes.length;

    const embed = new EmbedBuilder()
      .setColor(status.color)
      .setTitle(`💡 ${suggestion.title}`)
      .setDescription(suggestion.description)
      .addFields(
        {
          name: '📂 Category',
          value: `${category.emoji} ${category.name}\n${category.description}`,
          inline: true
        },
        {
          name: '📊 Community Score',
          value: `**Upvotes:** ${suggestion.upvotes.length}\n**Downvotes:** ${suggestion.downvotes.length}\n**Net Score:** ${score >= 0 ? '+' : ''}${score}`,
          inline: true
        },
        {
          name: '⚡ Current Status',
          value: `${status.emoji} **${status.name}**\n${status.description}`,
          inline: true
        }
      );

    if (suggestion.reasoning) {
      embed.addFields({
        name: '🎯 Why This Would Help',
        value: suggestion.reasoning,
        inline: false
      });
    }

    if (suggestion.adminNotes) {
      embed.addFields({
        name: '📝 Staff Notes',
        value: suggestion.adminNotes,
        inline: false
      });
    }

    if (suggestion.implementationDate) {
      embed.addFields({
        name: '🎉 Implementation Date',
        value: `<t:${Math.floor(suggestion.implementationDate / 1000)}:F>`,
        inline: false
      });
    }

    // Show recent comments if any
    if (suggestion.comments.length > 0) {
      const recentComments = suggestion.comments
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 3)
        .map(comment => `**<@${comment.author}>:** ${comment.content.substring(0, 100)}${comment.content.length > 100 ? '...' : ''}`)
        .join('\n');

      embed.addFields({
        name: `💬 Recent Comments (${suggestion.comments.length} total)`,
        value: recentComments,
        inline: false
      });
    }

    embed.addFields({
      name: '📋 Suggestion Details',
      value: `**Author:** <@${suggestion.author}>\n**Submitted:** <t:${Math.floor(suggestion.submitted / 1000)}:F>\n**ID:** \`${suggestion.id}\``,
      inline: false
    });

    embed.setFooter({
      text: 'GrowmiesNJ • Vote and comment to show your support!',
      iconURL: null
    })
    .setTimestamp(suggestion.submitted);

    return embed;
  }
};