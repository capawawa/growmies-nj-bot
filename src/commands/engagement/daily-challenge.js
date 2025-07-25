/**
 * Daily Challenge Command for GrowmiesNJ Discord Bot
 * 
 * Community Challenge System with participation tracking and leaderboards
 * Supports daily, weekly, and special challenges with cannabis compliance
 */

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Challenge } = require('../../database/models/Challenge');
const { ChallengeParticipation } = require('../../database/models/ChallengeParticipation');
const EngagementService = require('../../services/engagementService');
const { AgeVerificationHelper } = require('../../utils/ageVerificationHelper');
const { WelcomeEmbeds, BRAND_COLORS } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daily-challenge')
    .setDescription('🎯 View and participate in community challenges')
    .addSubcommand(subcommand =>
      subcommand
        .setName('current')
        .setDescription('View current active challenges')
        .addStringOption(option =>
          option
            .setName('type')
            .setDescription('Filter by challenge type')
            .setRequired(false)
            .addChoices(
              { name: '📅 Daily Challenges', value: 'daily' },
              { name: '📊 Weekly Challenges', value: 'weekly' },
              { name: '⭐ Special Events', value: 'special' },
              { name: '🌱 Community Goals', value: 'community' }
            )
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('participate')
        .setDescription('Join a challenge')
        .addStringOption(option =>
          option
            .setName('challenge')
            .setDescription('Challenge ID or name')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('progress')
        .setDescription('View your challenge progress')
        .addStringOption(option =>
          option
            .setName('challenge')
            .setDescription('Specific challenge (optional)')
            .setRequired(false)
            .setAutocomplete(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('leaderboard')
        .setDescription('View challenge leaderboard')
        .addStringOption(option =>
          option
            .setName('challenge')
            .setDescription('Challenge to show leaderboard for')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addIntegerOption(option =>
          option
            .setName('limit')
            .setDescription('Number of top participants to show (max 20)')
            .setRequired(false)
            .setMinValue(5)
            .setMaxValue(20)
        )
    ),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      const subcommand = interaction.options.getSubcommand();
      const userId = interaction.user.id;
      const guildId = interaction.guild.id;

      switch (subcommand) {
        case 'current':
          await this.handleCurrentChallenges(interaction);
          break;
        case 'participate':
          await this.handleParticipate(interaction);
          break;
        case 'progress':
          await this.handleProgress(interaction);
          break;
        case 'leaderboard':
          await this.handleLeaderboard(interaction);
          break;
        default:
          throw new Error('Unknown subcommand');
      }

    } catch (error) {
      console.error('Error executing daily-challenge command:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor('#ff6b6b')
        .setTitle('❌ Challenge Error')
        .setDescription('An error occurred while processing your challenge request.')
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
   * Handle current challenges subcommand
   */
  async handleCurrentChallenges(interaction) {
    const challengeType = interaction.options.getString('type') || null;
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;

    // Get current active challenges
    let challenges;
    if (challengeType) {
      challenges = await Challenge.findAll({
        where: {
          challenge_type: challengeType,
          is_active: true,
          start_date: { [require('@sequelize/core').Op.lte]: new Date() },
          end_date: { [require('@sequelize/core').Op.gte]: new Date() }
        },
        order: [['featured', 'DESC'], ['start_date', 'ASC']]
      });
    } else {
      // Get all current challenges grouped by type
      challenges = await Challenge.findAll({
        where: {
          is_active: true,
          start_date: { [require('@sequelize/core').Op.lte]: new Date() },
          end_date: { [require('@sequelize/core').Op.gte]: new Date() }
        },
        order: [['featured', 'DESC'], ['challenge_type', 'ASC'], ['start_date', 'ASC']]
      });
    }

    if (!challenges || challenges.length === 0) {
      const noChallengesEmbed = new EmbedBuilder()
        .setColor(BRAND_COLORS.SECONDARY)
        .setTitle('📅 No Active Challenges')
        .setDescription('There are currently no active challenges available.')
        .addFields(
          {
            name: '🔄 Check Back Later',
            value: 'New challenges are added regularly. Check back soon for new opportunities to earn XP and engage with the community!',
            inline: false
          },
          {
            name: '💡 Suggestion',
            value: 'Use `/suggest` to propose new challenge ideas to the community.',
            inline: false
          }
        )
        .setFooter({
          text: 'GrowmiesNJ • Community Challenges',
          iconURL: interaction.client.user.displayAvatarURL()
        })
        .setTimestamp();

      return await interaction.editReply({ embeds: [noChallengesEmbed] });
    }

    // Check user age verification for cannabis challenges
    const userAgeVerified = await AgeVerificationHelper.checkAgeVerification(userId, guildId);

    // Filter out cannabis challenges if user is not verified
    const availableChallenges = challenges.filter(challenge => {
      if (challenge.requires_21_plus && !userAgeVerified.isVerified) {
        return false;
      }
      return true;
    });

    // Create embeds for challenges
    const embeds = [];
    const challengesByType = {};

    // Group challenges by type
    availableChallenges.forEach(challenge => {
      if (!challengesByType[challenge.challenge_type]) {
        challengesByType[challenge.challenge_type] = [];
      }
      challengesByType[challenge.challenge_type].push(challenge);
    });

    // Create main embed
    const mainEmbed = new EmbedBuilder()
      .setColor(BRAND_COLORS.PRIMARY_GREEN)
      .setTitle('🎯 Active Community Challenges')
      .setDescription('Join challenges to earn XP, compete with others, and build community engagement!')
      .setFooter({
        text: `GrowmiesNJ • ${availableChallenges.length} Active Challenge${availableChallenges.length !== 1 ? 's' : ''}`,
        iconURL: interaction.client.user.displayAvatarURL()
      })
      .setTimestamp();

    // Add overview field
    const typeEmojis = {
      daily: '📅',
      weekly: '📊',
      special: '⭐',
      community: '🌱'
    };

    const overview = Object.keys(challengesByType)
      .map(type => `${typeEmojis[type]} **${type.charAt(0).toUpperCase() + type.slice(1)}:** ${challengesByType[type].length}`)
      .join('\n');

    mainEmbed.addFields({
      name: '📋 Available Challenges',
      value: overview,
      inline: false
    });

    embeds.push(mainEmbed);

    // Create detailed embeds for each challenge type
    for (const [type, typeChallenges] of Object.entries(challengesByType)) {
      const typeEmbed = new EmbedBuilder()
        .setColor(BRAND_COLORS.PRIMARY_GREEN)
        .setTitle(`${typeEmojis[type]} ${type.charAt(0).toUpperCase() + type.slice(1)} Challenges`);

      typeChallenges.slice(0, 3).forEach(challenge => {
        const challengeData = challenge.getFormattedChallenge();
        const timeLeft = challengeData.time_remaining;
        const timeText = timeLeft > 24 ? 
          `${Math.ceil(timeLeft / 24)} day${Math.ceil(timeLeft / 24) !== 1 ? 's' : ''}` : 
          `${timeLeft} hour${timeLeft !== 1 ? 's' : ''}`;

        const challengeValue = [
          `**Description:** ${challenge.description.substring(0, 100)}${challenge.description.length > 100 ? '...' : ''}`,
          `**Goal:** ${challengeData.target} ${challengeData.unit}`,
          `**Reward:** ${challengeData.xp_reward} XP${challengeData.bonus_reward > 0 ? ` (+${challengeData.bonus_reward} bonus)` : ''}`,
          `**Participants:** ${challengeData.participation_count}`,
          `**Time Left:** ${timeLeft > 0 ? timeText : 'Ending Soon'}`,
          challenge.requires_21_plus ? `🔞 **Requires Age Verification**` : ''
        ].filter(Boolean).join('\n');

        typeEmbed.addFields({
          name: `${challenge.featured ? '⭐ ' : ''}${challenge.title}`,
          value: challengeValue,
          inline: true
        });
      });

      if (typeChallenges.length > 3) {
        typeEmbed.addFields({
          name: '➕ More Challenges',
          value: `${typeChallenges.length - 3} more ${type} challenge${typeChallenges.length - 3 !== 1 ? 's' : ''} available`,
          inline: true
        });
      }

      embeds.push(typeEmbed);
    }

    // Create action buttons
    const actionRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('challenge_participate_quick')
          .setLabel('🎯 Quick Join')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('challenge_my_progress')
          .setLabel('📊 My Progress')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('challenge_leaderboards')
          .setLabel('🏆 Leaderboards')
          .setStyle(ButtonStyle.Secondary)
      );

    // Add age verification reminder if needed
    const blockedChallenges = challenges.length - availableChallenges.length;
    if (blockedChallenges > 0) {
      const verificationEmbed = new EmbedBuilder()
        .setColor(BRAND_COLORS.SECONDARY)
        .setTitle('🔞 Age Verification Notice')
        .setDescription(`${blockedChallenges} cannabis-related challenge${blockedChallenges !== 1 ? 's are' : ' is'} available with age verification (21+).`)
        .addFields({
          name: '✅ Get Verified',
          value: 'Use `/verify-age` to unlock cannabis-themed challenges and content.',
          inline: false
        });

      embeds.push(verificationEmbed);
    }

    await interaction.editReply({
      embeds: embeds,
      components: [actionRow]
    });
  },

  /**
   * Handle participate subcommand
   */
  async handleParticipate(interaction) {
    const challengeInput = interaction.options.getString('challenge');
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;

    // Find challenge by ID or name
    let challenge;
    if (challengeInput.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      // Input looks like a UUID
      challenge = await Challenge.findByPk(challengeInput);
    } else {
      // Search by title
      challenge = await Challenge.findOne({
        where: {
          title: { [require('@sequelize/core').Op.iLike]: `%${challengeInput}%` },
          is_active: true
        }
      });
    }

    if (!challenge) {
      const notFoundEmbed = new EmbedBuilder()
        .setColor('#ff6b6b')
        .setTitle('❌ Challenge Not Found')
        .setDescription('Could not find an active challenge matching your input.')
        .addFields({
          name: '💡 Try',
          value: '• Use `/daily-challenge current` to see available challenges\n• Check the challenge name spelling\n• Ensure the challenge is still active',
          inline: false
        })
        .setFooter({
          text: 'GrowmiesNJ • Challenge Management',
          iconURL: interaction.client.user.displayAvatarURL()
        });

      return await interaction.editReply({ embeds: [notFoundEmbed] });
    }

    // Check if user can participate
    const userAgeVerified = await AgeVerificationHelper.checkAgeVerification(userId, guildId);
    if (!challenge.canUserParticipate(userId, userAgeVerified.isVerified)) {
      let errorMessage = 'You cannot participate in this challenge.';
      
      if (challenge.requires_21_plus && !userAgeVerified.isVerified) {
        errorMessage = 'This cannabis-related challenge requires age verification (21+).';
      } else if (!challenge.is_active) {
        errorMessage = 'This challenge is no longer active.';
      } else if (challenge.isExpired()) {
        errorMessage = 'This challenge has expired.';
      }

      const cannotParticipateEmbed = new EmbedBuilder()
        .setColor('#ff6b6b')
        .setTitle('🚫 Cannot Participate')
        .setDescription(errorMessage)
        .setFooter({
          text: 'GrowmiesNJ • Challenge Participation',
          iconURL: interaction.client.user.displayAvatarURL()
        });

      if (challenge.requires_21_plus && !userAgeVerified.isVerified) {
        cannotParticipateEmbed.addFields({
          name: '✅ Get Verified',
          value: 'Use `/verify-age` to complete age verification and unlock cannabis content.',
          inline: false
        });

        const verifyButton = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('age_verification_start')
              .setLabel('🔞 Verify Age (21+)')
              .setStyle(ButtonStyle.Primary)
          );

        return await interaction.editReply({
          embeds: [cannotParticipateEmbed],
          components: [verifyButton]
        });
      }

      return await interaction.editReply({ embeds: [cannotParticipateEmbed] });
    }

    // Check if user is already participating
    const existingParticipation = await ChallengeParticipation.getUserParticipation(userId, challenge.id);

    if (existingParticipation) {
      const challengeData = challenge.getFormattedChallenge();
      const participationData = existingParticipation.getFormattedParticipation();

      const alreadyParticipatingEmbed = new EmbedBuilder()
        .setColor(BRAND_COLORS.PRIMARY_GREEN)
        .setTitle('✅ Already Participating')
        .setDescription(`You're already participating in **${challenge.title}**!`)
        .addFields(
          {
            name: '📊 Your Progress',
            value: `**Progress:** ${participationData.progress}/${challengeData.target} ${challengeData.unit}\n**Completion:** ${participationData.completionPercentage.toFixed(1)}%\n**Status:** ${participationData.isCompleted ? '🎉 Completed!' : '🔄 In Progress'}`,
            inline: true
          },
          {
            name: '🎯 Challenge Info',
            value: `**Reward:** ${challengeData.xp_reward} XP\n**Time Left:** ${challengeData.time_remaining} hours\n**Participants:** ${challengeData.participation_count}`,
            inline: true
          }
        )
        .setFooter({
          text: 'GrowmiesNJ • Keep up the great work!',
          iconURL: interaction.client.user.displayAvatarURL()
        })
        .setTimestamp();

      const actionRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`challenge_progress_${challenge.id}`)
            .setLabel('📊 View Progress')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`challenge_leaderboard_${challenge.id}`)
            .setLabel('🏆 Leaderboard')
            .setStyle(ButtonStyle.Secondary)
        );

      return await interaction.editReply({
        embeds: [alreadyParticipatingEmbed],
        components: [actionRow]
      });
    }

    // Join the challenge
    const result = await EngagementService.processChallengeParticipation(
      interaction,
      challenge.id,
      0, // Initial progress value
      { action: 'join_challenge' }
    );

    if (!result.success) {
      const errorEmbed = new EmbedBuilder()
        .setColor('#ff6b6b')
        .setTitle('❌ Participation Failed')
        .setDescription(result.message || 'Failed to join the challenge.')
        .setFooter({
          text: 'GrowmiesNJ • Challenge Participation',
          iconURL: interaction.client.user.displayAvatarURL()
        });

      return await interaction.editReply({ embeds: [errorEmbed] });
    }

    // Success - user joined challenge
    const challengeData = challenge.getFormattedChallenge();
    
    const joinedEmbed = new EmbedBuilder()
      .setColor(BRAND_COLORS.PRIMARY_GREEN)
      .setTitle('🎉 Challenge Joined!')
      .setDescription(`You've successfully joined **${challenge.title}**!`)
      .addFields(
        {
          name: '🎯 Challenge Goal',
          value: `${challenge.description}\n\n**Target:** ${challengeData.target} ${challengeData.unit}`,
          inline: false
        },
        {
          name: '🏆 Rewards',
          value: `**Base XP:** ${challengeData.xp_reward}\n**Bonus XP:** ${challengeData.bonus_reward}\n**Total Possible:** ${challengeData.xp_reward + challengeData.bonus_reward} XP`,
          inline: true
        },
        {
          name: '⏰ Time Remaining',
          value: `${challengeData.time_remaining} hours`,
          inline: true
        }
      );

    if (challenge.rules) {
      joinedEmbed.addFields({
        name: '📋 Rules',
        value: challenge.rules.substring(0, 500) + (challenge.rules.length > 500 ? '...' : ''),
        inline: false
      });
    }

    if (challenge.requires_21_plus) {
      joinedEmbed.addFields({
        name: '🔞 Cannabis Content',
        value: 'This challenge contains cannabis-related content (21+ verified)',
        inline: false
      });
    }

    joinedEmbed.setFooter({
      text: 'GrowmiesNJ • Good luck with your challenge!',
      iconURL: interaction.client.user.displayAvatarURL()
    })
    .setTimestamp();

    const actionRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`challenge_progress_${challenge.id}`)
          .setLabel('📊 Track Progress')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`challenge_leaderboard_${challenge.id}`)
          .setLabel('🏆 View Leaderboard')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('challenge_other_challenges')
          .setLabel('🎯 Other Challenges')
          .setStyle(ButtonStyle.Secondary)
      );

    await interaction.editReply({
      embeds: [joinedEmbed],
      components: [actionRow]
    });
  },

  /**
   * Handle progress subcommand
   */
  async handleProgress(interaction) {
    const challengeInput = interaction.options.getString('challenge');
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;

    if (challengeInput) {
      // Show progress for specific challenge
      await this.showSpecificProgress(interaction, challengeInput, userId);
    } else {
      // Show all user's active participations
      await this.showAllProgress(interaction, userId, guildId);
    }
  },

  /**
   * Show progress for specific challenge
   */
  async showSpecificProgress(interaction, challengeInput, userId) {
    // Find challenge and participation
    let challenge;
    if (challengeInput.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      challenge = await Challenge.findByPk(challengeInput);
    } else {
      challenge = await Challenge.findOne({
        where: {
          title: { [require('@sequelize/core').Op.iLike]: `%${challengeInput}%` }
        }
      });
    }

    if (!challenge) {
      const notFoundEmbed = new EmbedBuilder()
        .setColor('#ff6b6b')
        .setTitle('❌ Challenge Not Found')
        .setDescription('Could not find a challenge matching your input.')
        .setFooter({
          text: 'GrowmiesNJ • Challenge Progress',
          iconURL: interaction.client.user.displayAvatarURL()
        });

      return await interaction.editReply({ embeds: [notFoundEmbed] });
    }

    const participation = await ChallengeParticipation.getUserParticipation(userId, challenge.id);

    if (!participation) {
      const notParticipatingEmbed = new EmbedBuilder()
        .setColor(BRAND_COLORS.SECONDARY)
        .setTitle('📝 Not Participating')
        .setDescription(`You're not currently participating in **${challenge.title}**.`)
        .addFields({
          name: '🎯 Join Now',
          value: `Use \`/daily-challenge participate challenge:${challenge.title}\` to join this challenge.`,
          inline: false
        })
        .setFooter({
          text: 'GrowmiesNJ • Challenge Participation',
          iconURL: interaction.client.user.displayAvatarURL()
        });

      return await interaction.editReply({ embeds: [notParticipatingEmbed] });
    }

    // Show detailed progress
    const challengeData = challenge.getFormattedChallenge();
    const participationData = participation.getFormattedParticipation();
    
    const progressEmbed = new EmbedBuilder()
      .setColor(participationData.isCompleted ? '#28a745' : BRAND_COLORS.PRIMARY_GREEN)
      .setTitle(`📊 ${challenge.title} - Progress`)
      .setDescription(challenge.description)
      .addFields(
        {
          name: '🎯 Your Progress',
          value: `**Current:** ${participationData.progress}/${challengeData.target} ${challengeData.unit}\n**Completion:** ${participationData.completionPercentage.toFixed(1)}%\n**Status:** ${participationData.isCompleted ? '🎉 Completed!' : '🔄 In Progress'}`,
          inline: true
        },
        {
          name: '📈 Activity Stats',
          value: `**Activities:** ${participationData.activityCount}\n**Started:** ${participationData.startedAt.toLocaleDateString()}\n**Last Activity:** ${participationData.lastActivity ? participationData.lastActivity.toLocaleDateString() : 'None'}`,
          inline: true
        },
        {
          name: '🏆 Potential Rewards',
          value: `**Base XP:** ${challengeData.xp_reward}\n**Bonus XP:** ${challengeData.bonus_reward}\n**Your XP:** ${challenge.calculateXPReward(participationData.completionPercentage)} XP`,
          inline: true
        }
      );

    if (!participationData.isCompleted) {
      const remaining = challengeData.target - participationData.progress;
      progressEmbed.addFields({
        name: '🎯 Remaining',
        value: `**Need:** ${remaining} more ${challengeData.unit}\n**Time Left:** ${challengeData.time_remaining} hours`,
        inline: false
      });
    }

    const progressBar = this.createProgressBar(participationData.completionPercentage);
    progressEmbed.addFields({
      name: '📊 Progress Bar',
      value: progressBar,
      inline: false
    });

    progressEmbed.setFooter({
      text: 'GrowmiesNJ • Keep pushing forward!',
      iconURL: interaction.client.user.displayAvatarURL()
    })
    .setTimestamp();

    const actionRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`challenge_leaderboard_${challenge.id}`)
          .setLabel('🏆 Leaderboard')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('challenge_all_progress')
          .setLabel('📊 All Progress')
          .setStyle(ButtonStyle.Secondary)
      );

    await interaction.editReply({
      embeds: [progressEmbed],
      components: [actionRow]
    });
  },

  /**
   * Show all user progress
   */
  async showAllProgress(interaction, userId, guildId) {
    const participations = await ChallengeParticipation.getUserActiveParticipations(userId, guildId);

    if (!participations || participations.length === 0) {
      const noProgressEmbed = new EmbedBuilder()
        .setColor(BRAND_COLORS.SECONDARY)
        .setTitle('📊 No Active Challenges')
        .setDescription('You\'re not currently participating in any challenges.')
        .addFields({
          name: '🎯 Get Started',
          value: 'Use `/daily-challenge current` to see available challenges and join the community fun!',
          inline: false
        })
        .setFooter({
          text: 'GrowmiesNJ • Challenge Progress',
          iconURL: interaction.client.user.displayAvatarURL()
        });

      return await interaction.editReply({ embeds: [noProgressEmbed] });
    }

    // Create progress overview embed
    const overviewEmbed = new EmbedBuilder()
      .setColor(BRAND_COLORS.PRIMARY_GREEN)
      .setTitle('📊 Your Challenge Progress')
      .setDescription(`You're participating in ${participations.length} active challenge${participations.length !== 1 ? 's' : ''}!`)
      .setFooter({
        text: `GrowmiesNJ • ${participations.length} Active Challenge${participations.length !== 1 ? 's' : ''}`,
        iconURL: interaction.client.user.displayAvatarURL()
      })
      .setTimestamp();

    // Add fields for each participation
    participations.forEach(participation => {
      const challenge = participation.challenge;
      const challengeData = challenge.getFormattedChallenge();
      const participationData = participation.getFormattedParticipation();

      const progressBar = this.createProgressBar(participationData.completionPercentage, 10);
      const statusEmoji = participationData.isCompleted ? '✅' : 
                         participationData.completionPercentage > 50 ? '🟡' : '🔴';

      const fieldValue = [
        `${progressBar} ${participationData.completionPercentage.toFixed(1)}%`,
        `**Progress:** ${participationData.progress}/${challengeData.target} ${challengeData.unit}`,
        `**Reward:** ${challenge.calculateXPReward(participationData.completionPercentage)}/${challengeData.xp_reward + challengeData.bonus_reward} XP`,
        `**Time Left:** ${challengeData.time_remaining}h`
      ].join('\n');

      overviewEmbed.addFields({
        name: `${statusEmoji} ${challenge.title}`,
        value: fieldValue,
        inline: true
      });
    });

    // Add summary stats
    const completed = participations.filter(p => p.isCompleted()).length;
    const totalProgress = participations.reduce((sum, p) => sum + p.completion_percentage, 0);
    const avgProgress = totalProgress / participations.length;

    overviewEmbed.addFields({
      name: '📈 Summary',
      value: `**Completed:** ${completed}/${participations.length}\n**Average Progress:** ${avgProgress.toFixed(1)}%\n**Total Activities:** ${participations.reduce((sum, p) => sum + p.activity_count, 0)}`,
      inline: false
    });

    const actionRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('challenge_current_challenges')
          .setLabel('🎯 More Challenges')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('challenge_global_leaderboard')
          .setLabel('🏆 Leaderboards')
          .setStyle(ButtonStyle.Secondary)
      );

    await interaction.editReply({
      embeds: [overviewEmbed],
      components: [actionRow]
    });
  },

  /**
   * Handle leaderboard subcommand
   */
  async handleLeaderboard(interaction) {
    const challengeInput = interaction.options.getString('challenge');
    const limit = interaction.options.getInteger('limit') || 10;

    // Find challenge
    let challenge;
    if (challengeInput.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      challenge = await Challenge.findByPk(challengeInput);
    } else {
      challenge = await Challenge.findOne({
        where: {
          title: { [require('@sequelize/core').Op.iLike]: `%${challengeInput}%` }
        }
      });
    }

    if (!challenge) {
      const notFoundEmbed = new EmbedBuilder()
        .setColor('#ff6b6b')
        .setTitle('❌ Challenge Not Found')
        .setDescription('Could not find a challenge matching your input.')
        .setFooter({
          text: 'GrowmiesNJ • Challenge Leaderboard',
          iconURL: interaction.client.user.displayAvatarURL()
        });

      return await interaction.editReply({ embeds: [notFoundEmbed] });
    }

    // Get leaderboard data
    const leaderboard = await ChallengeParticipation.getChallengeLeaderboard(challenge.id, limit);

    if (!leaderboard || leaderboard.length === 0) {
      const noParticipantsEmbed = new EmbedBuilder()
        .setColor(BRAND_COLORS.SECONDARY)
        .setTitle('📊 No Participants Yet')
        .setDescription(`No one has joined **${challenge.title}** yet.`)
        .addFields({
          name: '🎯 Be First!',
          value: `Use \`/daily-challenge participate challenge:${challenge.title}\` to be the first participant!`,
          inline: false
        })
        .setFooter({
          text: 'GrowmiesNJ • Challenge Leaderboard',
          iconURL: interaction.client.user.displayAvatarURL()
        });

      return await interaction.editReply({ embeds: [noParticipantsEmbed] });
    }

    // Create leaderboard embed
    const challengeData = challenge.getFormattedChallenge();
    
    const leaderboardEmbed = new EmbedBuilder()
      .setColor(BRAND_COLORS.PRIMARY_GREEN)
      .setTitle(`🏆 ${challenge.title} - Leaderboard`)
      .setDescription(`Top ${leaderboard.length} participants in this challenge`)
      .addFields(
        {
          name: '🎯 Challenge Info',
          value: `**Goal:** ${challengeData.target} ${challengeData.unit}\n**Reward:** ${challengeData.xp_reward} XP (+${challengeData.bonus_reward} bonus)\n**Time Left:** ${challengeData.time_remaining}h`,
          inline: false
        }
      );

    // Add leaderboard entries
    const medals = ['🥇', '🥈', '🥉'];
    const leaderboardText = leaderboard.map((entry, index) => {
      const medal = index < 3 ? medals[index] : `**${index + 1}.**`;
      const completionIcon = entry.completion_percentage >= 100 ? '✅' : 
                           entry.completion_percentage >= 50 ? '🟡' : '🔴';
      
      return `${medal} ${completionIcon} **${entry.user.display_name || 'Unknown User'}** (Lv.${entry.user.current_level})\n` +
             `└ ${entry.progress_value}/${challengeData.target} (${entry.completion_percentage.toFixed(1)}%)`;
    }).join('\n\n');

    leaderboardEmbed.addFields({
      name: '🏆 Top Participants',
      value: leaderboardText || 'No participants yet',
      inline: false
    });

    // Add user's position if they're participating
    const userId = interaction.user.id;
    const userParticipation = await ChallengeParticipation.getUserParticipation(userId, challenge.id);
    
    if (userParticipation) {
      const userRank = await this.getUserRank(challenge.id, userId);
      const userProgress = userParticipation.getFormattedParticipation();
      
      leaderboardEmbed.addFields({
        name: '📊 Your Position',
        value: `**Rank:** #${userRank}\n**Progress:** ${userProgress.progress}/${challengeData.target} (${userProgress.completionPercentage.toFixed(1)}%)\n**Status:** ${userProgress.isCompleted ? '✅ Completed' : '🔄 In Progress'}`,
        inline: false
      });
    }

    leaderboardEmbed.setFooter({
      text: `GrowmiesNJ • Updated ${new Date().toLocaleTimeString()}`,
      iconURL: interaction.client.user.displayAvatarURL()
    })
    .setTimestamp();

    const actionRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`challenge_join_${challenge.id}`)
          .setLabel('🎯 Join Challenge')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(!!userParticipation),
        new ButtonBuilder()
          .setCustomId(`challenge_progress_${challenge.id}`)
          .setLabel('📊 My Progress')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(!userParticipation),
        new ButtonBuilder()
          .setCustomId(`leaderboard_refresh_${challenge.id}`)
          .setLabel('🔄 Refresh')
          .setStyle(ButtonStyle.Secondary)
      );

    await interaction.editReply({
      embeds: [leaderboardEmbed],
      components: [actionRow]
    });
  },

  /**
   * Helper method to create progress bar
   */
  createProgressBar(percentage, length = 20) {
    const filled = Math.round((percentage / 100) * length);
    const empty = length - filled;
    const filledChar = '█';
    const emptyChar = '░';
    
    return `${filledChar.repeat(filled)}${emptyChar.repeat(empty)}`;
  },

  /**
   * Helper method to get user's rank in challenge
   */
  async getUserRank(challengeId, userId) {
    const { QueryTypes } = require('@sequelize/core');
    const { sequelize } = require('../../database/connection');
    
    const result = await sequelize.query(`
      SELECT COUNT(*) + 1 as rank
      FROM challenge_participations cp1
      WHERE cp1.challenge_id = :challengeId
        AND cp1.is_active = true
        AND (
          cp1.completion_percentage > (
            SELECT cp2.completion_percentage 
            FROM challenge_participations cp2 
            WHERE cp2.challenge_id = :challengeId 
              AND cp2.user_id = :userId
          )
          OR (
            cp1.completion_percentage = (
              SELECT cp2.completion_percentage 
              FROM challenge_participations cp2 
              WHERE cp2.challenge_id = :challengeId 
                AND cp2.user_id = :userId
            )
            AND cp1.progress_value > (
              SELECT cp2.progress_value 
              FROM challenge_participations cp2 
              WHERE cp2.challenge_id = :challengeId 
                AND cp2.user_id = :userId
            )
          )
        )
    `, {
      replacements: { challengeId, userId },
      type: QueryTypes.SELECT
    });

    return result[0]?.rank || 1;
  }
};