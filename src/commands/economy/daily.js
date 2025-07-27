/**
 * Daily Command for GrowmiesNJ Discord Bot
 * 
 * Cannabis-compliant economy system command for daily rewards
 * Features streak bonuses, age verification integration, and themed rewards
 */

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, InteractionContextType } = require('discord.js');
const economyService = require('../../services/economyService');
const { EmbedBuilders, CannabisThemed, Validation } = require('../../utils/economyHelpers');
const ageVerificationService = require('../../services/ageVerification');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('🌅 Claim your daily GrowCoins and maintain your streak!')
    .setContexts(InteractionContextType.Guild)
    .addBooleanOption(option =>
      option
        .setName('status')
        .setDescription('Check your daily reward status without claiming')
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      const userId = interaction.user.id;
      const guildId = interaction.guild.id;
      const checkStatusOnly = interaction.options.getBoolean('status') || false;

      await interaction.deferReply();

      console.log(`🌅 Daily command executed by ${interaction.user.tag} (status only: ${checkStatusOnly})`);

      // Ensure user exists in economy system
      await economyService.ensureUserExists(userId, guildId);

      // Check daily reward eligibility
      const eligibility = await economyService.checkDailyRewardEligibility(userId, guildId);

      // If just checking status, show status embed
      if (checkStatusOnly) {
        return await this.showDailyStatus(interaction, eligibility);
      }

      // Check if user can claim reward
      if (!eligibility.canClaim) {
        const cooldownEmbed = EmbedBuilders.createErrorEmbed(
          'Daily Reward Not Ready',
          `${eligibility.message}\n\nCome back when your plants have had time to grow! 🌱`
        );

        // Add time remaining field
        if (eligibility.timeUntilNext) {
          const hoursLeft = Math.floor(eligibility.timeUntilNext / (1000 * 60 * 60));
          const minutesLeft = Math.floor((eligibility.timeUntilNext % (1000 * 60 * 60)) / (1000 * 60));
          
          cooldownEmbed.addFields({
            name: '⏰ Time Remaining',
            value: `${hoursLeft}h ${minutesLeft}m`,
            inline: true
          });
        }

        return await interaction.editReply({ embeds: [cooldownEmbed] });
      }

      // Check age verification for premium seeds
      const isAgeVerified = await ageVerificationService.isUserVerified(userId, guildId);

      // Claim the daily reward
      const rewardResult = await economyService.claimDailyReward(userId, guildId);

      if (!rewardResult.success) {
        const errorEmbed = EmbedBuilders.createErrorEmbed(
          'Daily Reward Error',
          rewardResult.message || 'Unable to claim daily reward. Please try again later.'
        );
        
        return await interaction.editReply({ embeds: [errorEmbed] });
      }

      // Create success embed
      const rewardEmbed = this.createDailyRewardEmbed(
        interaction.user,
        rewardResult.reward,
        rewardResult.newStreak,
        isAgeVerified
      );

      // Create action buttons
      const actionRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`daily_balance_${userId}`)
            .setLabel('💰 View Balance')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`daily_work_${userId}`)
            .setLabel('💼 Work Now')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`daily_shop_${userId}`)
            .setLabel('🏪 Visit Shop')
            .setStyle(ButtonStyle.Secondary)
        );

      await interaction.editReply({
        embeds: [rewardEmbed],
        components: [actionRow]
      });

      console.log(`✅ Daily reward claimed by ${interaction.user.tag}: ${rewardResult.reward.growCoins} GrowCoins, streak: ${rewardResult.newStreak}`);

    } catch (error) {
      console.error('❌ Error in daily command:', error);
      
      const errorEmbed = EmbedBuilders.createErrorEmbed(
        'Daily Reward Error',
        'An unexpected error occurred while processing your daily reward. Please try again later.'
      );

      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.editReply({ embeds: [errorEmbed] });
        } else {
          await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
      } catch (followUpError) {
        console.error('❌ Failed to send daily error response:', followUpError);
      }
    }
  },

  /**
   * Show daily reward status without claiming
   */
  async showDailyStatus(interaction, eligibility) {
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;

    // Get current economy data
    const economy = await economyService.getUserEconomy(userId, guildId);
    const isAgeVerified = await ageVerificationService.isUserVerified(userId, guildId);

    const statusEmbed = new EmbedBuilder()
      .setColor(eligibility.canClaim ? '#4CAF50' : '#FF9800')
      .setTitle('🌅 Daily Reward Status')
      .setDescription('Check when your daily cannabis rewards are ready!')
      .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true, size: 128 }));

    // Add status field
    statusEmbed.addFields({
      name: '📊 Current Status',
      value: eligibility.canClaim 
        ? '✅ **Ready to claim!**\nYour daily reward is waiting for you.'
        : `⏰ **${eligibility.message}**\nPatience, grasshopper - good things take time to grow.`,
      inline: false
    });

    // Add streak information
    if (economy) {
      statusEmbed.addFields({
        name: '🔥 Current Streak',
        value: `${economy.daily_streak} day${economy.daily_streak !== 1 ? 's' : ''} in a row\n*Keep it growing!*`,
        inline: true
      });

      // Add streak milestone information
      const nextMilestone = this.getNextStreakMilestone(economy.daily_streak);
      if (nextMilestone) {
        const daysToMilestone = nextMilestone.threshold - economy.daily_streak;
        statusEmbed.addFields({
          name: '🎯 Next Milestone',
          value: `${daysToMilestone} more day${daysToMilestone !== 1 ? 's' : ''} for **${nextMilestone.bonus}% bonus**!`,
          inline: true
        });
      }
    }

    // Add time information if on cooldown
    if (!eligibility.canClaim && eligibility.timeUntilNext) {
      const hoursLeft = Math.floor(eligibility.timeUntilNext / (1000 * 60 * 60));
      const minutesLeft = Math.floor((eligibility.timeUntilNext % (1000 * 60 * 60)) / (1000 * 60));
      
      statusEmbed.addFields({
        name: '⏰ Time Until Next Reward',
        value: `${hoursLeft}h ${minutesLeft}m\n*Mark your calendar! 📅*`,
        inline: true
      });
    }

    // Add premium seeds information
    statusEmbed.addFields({
      name: '🌱 Premium Seeds',
      value: isAgeVerified
        ? 'Unlocked! Earn Premium Seeds with streak bonuses (21+ verified)'
        : '🔒 Requires age verification (/verify) - 21+ only',
      inline: false
    });

    // Add helpful tips
    statusEmbed.addFields({
      name: '💡 Growing Tips',
      value: [
        '• Daily rewards increase with longer streaks',
        '• Missing a day resets your streak to 0',
        '• Premium Seeds are earned at streak milestones',
        '• Use `/work` between daily claims to earn more'
      ].join('\n'),
      inline: false
    });

    statusEmbed.setFooter({
      text: 'GrowmiesNJ Economy • Patience yields the best harvest',
      iconURL: interaction.guild.iconURL({ dynamic: true })
    })
    .setTimestamp();

    await interaction.editReply({ embeds: [statusEmbed] });
  },

  /**
   * Create daily reward success embed
   */
  createDailyRewardEmbed(user, reward, newStreak, isAgeVerified) {
    const embed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('🌅 Daily Reward Claimed!')
      .setDescription(CannabisThemed.getSuccessMessage('daily'))
      .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 128 }));

    // Add main reward information
    embed.addFields(
      {
        name: '🌿 GrowCoins Earned',
        value: `**+${reward.growCoins.toLocaleString()}** 🌿\n*Keep that green flowing!*`,
        inline: true
      },
      {
        name: '🔥 Daily Streak',
        value: `**${newStreak}** day${newStreak !== 1 ? 's' : ''}\n*Consistency is key!*`,
        inline: true
      }
    );

    // Add premium seeds if earned
    if (reward.premiumSeeds > 0 && isAgeVerified) {
      embed.addFields({
        name: '🌱 Bonus Premium Seeds',
        value: `**+${reward.premiumSeeds}** 🌱\n*Streak milestone reward!*`,
        inline: true
      });
    }

    // Add streak bonus information
    if (reward.streakBonus && reward.streakBonus > 0) {
      embed.addFields({
        name: '⭐ Streak Bonus',
        value: `**+${reward.streakBonus}%** extra rewards!\n*That's the power of consistency!*`,
        inline: false
      });
    }

    // Add next milestone information
    const nextMilestone = this.getNextStreakMilestone(newStreak);
    if (nextMilestone) {
      const daysToMilestone = nextMilestone.threshold - newStreak;
      embed.addFields({
        name: '🎯 Next Milestone',
        value: `${daysToMilestone} more day${daysToMilestone !== 1 ? 's' : ''} for **${nextMilestone.bonus}% bonus**!`,
        inline: false
      });
    }

    // Add motivation message based on streak
    let motivationMessage = '';
    if (newStreak === 1) {
      motivationMessage = 'Welcome to the daily grind! 🌱';
    } else if (newStreak === 7) {
      motivationMessage = 'One week strong! You\'re building good habits! 💪';
    } else if (newStreak === 30) {
      motivationMessage = 'One month of dedication! You\'re a true grower! 🌿';
    } else if (newStreak % 10 === 0) {
      motivationMessage = `${newStreak} days of pure dedication! Legendary status! 🏆`;
    }

    if (motivationMessage) {
      embed.addFields({
        name: '🌟 Achievement',
        value: motivationMessage,
        inline: false
      });
    }

    embed.setFooter({
      text: 'GrowmiesNJ Economy • Come back tomorrow for more rewards!',
      iconURL: user.displayAvatarURL()
    })
    .setTimestamp();

    return embed;
  },

  /**
   * Get next streak milestone information
   */
  getNextStreakMilestone(currentStreak) {
    const milestones = [
      { threshold: 3, bonus: 25 },
      { threshold: 7, bonus: 50 },
      { threshold: 14, bonus: 75 },
      { threshold: 30, bonus: 100 },
      { threshold: 60, bonus: 150 },
      { threshold: 100, bonus: 200 }
    ];

    return milestones.find(milestone => milestone.threshold > currentStreak);
  }
};