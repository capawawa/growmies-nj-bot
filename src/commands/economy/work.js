/**
 * Work Command for GrowmiesNJ Discord Bot
 * 
 * Cannabis-compliant economy system work activities
 * Features age-appropriate activities and 21+ cannabis-themed jobs
 */

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, InteractionContextType } = require('discord.js');
const economyService = require('../../services/economyService');
const { EmbedBuilders, CannabisThemed, Validation } = require('../../utils/economyHelpers');
const ageVerificationService = require('../../services/ageVerification');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('work')
    .setDescription('💼 Work various jobs to earn GrowCoins and build your streak!')
    .setContexts(InteractionContextType.Guild)
    .addBooleanOption(option =>
      option
        .setName('status')
        .setDescription('Check your work status and cooldown')
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      const userId = interaction.user.id;
      const guildId = interaction.guild.id;
      const checkStatusOnly = interaction.options.getBoolean('status') || false;

      await interaction.deferReply();

      console.log(`💼 Work command executed by ${interaction.user.tag} (status only: ${checkStatusOnly})`);

      // Ensure user exists in economy system
      await economyService.ensureUserExists(userId, guildId);

      // Check work eligibility
      const eligibility = await economyService.checkWorkEligibility(userId, guildId);

      // If just checking status, show status embed
      if (checkStatusOnly) {
        return await this.showWorkStatus(interaction, eligibility);
      }

      // Check if user can work
      if (!eligibility.canWork) {
        const cooldownEmbed = EmbedBuilders.createErrorEmbed(
          'Work Not Available',
          `${eligibility.message}\n\nTake a break and let your plants grow! 🌱`
        );

        // Add time remaining field
        if (eligibility.timeUntilNext) {
          const minutesLeft = Math.ceil(eligibility.timeUntilNext / (1000 * 60));
          
          cooldownEmbed.addFields({
            name: '⏰ Time Until Next Work',
            value: `${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}`,
            inline: true
          });
        }

        return await interaction.editReply({ embeds: [cooldownEmbed] });
      }

      // Check age verification for cannabis activities
      const isAgeVerified = await ageVerificationService.isUserVerified(userId, guildId);

      // Get random work activity based on age verification
      const workActivity = isAgeVerified 
        ? CannabisThemed.getCannabisWorkActivity()
        : CannabisThemed.getGeneralWorkActivity();

      // Perform work and get rewards
      const workResult = await economyService.performWork(userId, guildId, workActivity);

      if (!workResult.success) {
        const errorEmbed = EmbedBuilders.createErrorEmbed(
          'Work Error',
          workResult.message || 'Unable to complete work. Please try again later.'
        );
        
        return await interaction.editReply({ embeds: [errorEmbed] });
      }

      // Create work completion embed
      const workEmbed = this.createWorkCompletionEmbed(
        interaction.user,
        workActivity,
        workResult.reward,
        workResult.newStreak,
        isAgeVerified
      );

      // Create action buttons
      const actionRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`work_again_${userId}`)
            .setLabel('💼 Work Again')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true), // Will be enabled after cooldown
          new ButtonBuilder()
            .setCustomId(`work_balance_${userId}`)
            .setLabel('💰 Check Balance')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`work_daily_${userId}`)
            .setLabel('🌅 Daily Reward')
            .setStyle(ButtonStyle.Secondary)
        );

      await interaction.editReply({
        embeds: [workEmbed],
        components: [actionRow]
      });

      console.log(`✅ Work completed by ${interaction.user.tag}: ${workActivity.name} (${workResult.reward.growCoins} GrowCoins)`);

    } catch (error) {
      console.error('❌ Error in work command:', error);
      
      const errorEmbed = EmbedBuilders.createErrorEmbed(
        'Work Error',
        'An unexpected error occurred while working. Please try again later.'
      );

      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.editReply({ embeds: [errorEmbed] });
        } else {
          await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
      } catch (followUpError) {
        console.error('❌ Failed to send work error response:', followUpError);
      }
    }
  },

  /**
   * Show work status without performing work
   */
  async showWorkStatus(interaction, eligibility) {
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;

    // Get current economy data
    const economy = await economyService.getUserEconomy(userId, guildId);
    const isAgeVerified = await ageVerificationService.isUserVerified(userId, guildId);

    const statusEmbed = new EmbedBuilder()
      .setColor(eligibility.canWork ? '#4CAF50' : '#FF9800')
      .setTitle('💼 Work Status')
      .setDescription('Check your work availability and streak!')
      .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true, size: 128 }));

    // Add status field
    statusEmbed.addFields({
      name: '📊 Current Status',
      value: eligibility.canWork 
        ? '✅ **Ready to work!**\nYour services are needed in the community.'
        : `⏰ **${eligibility.message}**\nGood work deserves proper rest.`,
      inline: false
    });

    // Add streak information
    if (economy) {
      statusEmbed.addFields({
        name: '🔥 Work Streak',
        value: `${economy.work_streak} session${economy.work_streak !== 1 ? 's' : ''} in a row\n*Consistency pays off!*`,
        inline: true
      });

      // Add work milestone information
      const nextMilestone = this.getNextWorkMilestone(economy.work_streak);
      if (nextMilestone) {
        const sessionsToMilestone = nextMilestone.threshold - economy.work_streak;
        statusEmbed.addFields({
          name: '🎯 Next Milestone',
          value: `${sessionsToMilestone} more session${sessionsToMilestone !== 1 ? 's' : ''} for **${nextMilestone.bonus}% bonus**!`,
          inline: true
        });
      }
    }

    // Add time information if on cooldown
    if (!eligibility.canWork && eligibility.timeUntilNext) {
      const minutesLeft = Math.ceil(eligibility.timeUntilNext / (1000 * 60));
      
      statusEmbed.addFields({
        name: '⏰ Time Until Next Work',
        value: `${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}\n*Perfect time for a break! ☕*`,
        inline: true
      });
    }

    // Add available activities
    const generalActivities = CannabisThemed.getGeneralWorkActivity();
    let activitiesText = `**General Activities:** ${generalActivities.name}\n`;
    
    if (isAgeVerified) {
      const cannabisActivities = CannabisThemed.getCannabisWorkActivity();
      activitiesText += `**Cannabis Activities (21+):** ${cannabisActivities.name}`;
    } else {
      activitiesText += `**Cannabis Activities:** 🔒 *Requires age verification*`;
    }

    statusEmbed.addFields({
      name: '🎯 Available Activities',
      value: activitiesText,
      inline: false
    });

    // Add helpful tips
    statusEmbed.addFields({
      name: '💡 Work Tips',
      value: [
        '• Work activities have a 1-hour cooldown',
        '• Building streaks increases your rewards',
        '• Age verification unlocks premium activities',
        '• Different jobs offer different reward ranges'
      ].join('\n'),
      inline: false
    });

    statusEmbed.setFooter({
      text: 'GrowmiesNJ Economy • Honest work builds character',
      iconURL: interaction.guild.iconURL({ dynamic: true })
    })
    .setTimestamp();

    await interaction.editReply({ embeds: [statusEmbed] });
  },

  /**
   * Create work completion embed
   */
  createWorkCompletionEmbed(user, activity, reward, newStreak, isAgeVerified) {
    const embed = new EmbedBuilder()
      .setColor('#4CAF50')
      .setTitle(`${activity.emoji} Work Complete!`)
      .setDescription(`**${activity.name}**\n${activity.description}`)
      .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 128 }));

    // Add reward information
    embed.addFields(
      {
        name: '💰 Earnings',
        value: `**+${reward.growCoins.toLocaleString()}** 🌿\n*Honest work pays off!*`,
        inline: true
      },
      {
        name: '🔥 Work Streak',
        value: `**${newStreak}** session${newStreak !== 1 ? 's' : ''}\n*Keep it going!*`,
        inline: true
      }
    );

    // Add premium seeds if earned
    if (reward.premiumSeeds > 0 && isAgeVerified) {
      embed.addFields({
        name: '🌱 Bonus Premium Seeds',
        value: `**+${reward.premiumSeeds}** 🌱\n*Premium work rewards!*`,
        inline: true
      });
    }

    // Add work bonus information
    if (reward.streakBonus && reward.streakBonus > 0) {
      embed.addFields({
        name: '⭐ Streak Bonus',
        value: `**+${reward.streakBonus}%** extra earnings!\n*Experience makes a difference!*`,
        inline: false
      });
    }

    // Add success message
    embed.addFields({
      name: '🎉 Job Well Done!',
      value: CannabisThemed.getSuccessMessage('work'),
      inline: false
    });

    // Add next milestone information
    const nextMilestone = this.getNextWorkMilestone(newStreak);
    if (nextMilestone) {
      const sessionsToMilestone = nextMilestone.threshold - newStreak;
      embed.addFields({
        name: '🎯 Next Milestone',
        value: `${sessionsToMilestone} more session${sessionsToMilestone !== 1 ? 's' : ''} for **${nextMilestone.bonus}% bonus**!`,
        inline: false
      });
    }

    // Add cooldown information
    embed.addFields({
      name: '⏰ Next Work Available',
      value: 'In 1 hour - take a well-deserved break! ☕',
      inline: false
    });

    // Add motivation message based on streak
    let motivationMessage = '';
    if (newStreak === 1) {
      motivationMessage = 'Great start! Keep building that work ethic! 💪';
    } else if (newStreak === 5) {
      motivationMessage = 'Five sessions strong! You\'re becoming a valuable community member! 🌟';
    } else if (newStreak === 10) {
      motivationMessage = 'Ten sessions! You\'re a dedicated worker! 🏆';
    } else if (newStreak % 5 === 0) {
      motivationMessage = `${newStreak} sessions of hard work! Impressive dedication! 👑`;
    }

    if (motivationMessage) {
      embed.addFields({
        name: '🌟 Achievement',
        value: motivationMessage,
        inline: false
      });
    }

    embed.setFooter({
      text: 'GrowmiesNJ Economy • Every hour brings new opportunities!',
      iconURL: user.displayAvatarURL()
    })
    .setTimestamp();

    return embed;
  },

  /**
   * Get next work streak milestone information
   */
  getNextWorkMilestone(currentStreak) {
    const milestones = [
      { threshold: 3, bonus: 10 },
      { threshold: 5, bonus: 20 },
      { threshold: 10, bonus: 30 },
      { threshold: 15, bonus: 40 },
      { threshold: 25, bonus: 50 },
      { threshold: 50, bonus: 75 }
    ];

    return milestones.find(milestone => milestone.threshold > currentStreak);
  }
};