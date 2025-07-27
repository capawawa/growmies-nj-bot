/**
 * Balance Command for GrowmiesNJ Discord Bot
 * 
 * Cannabis-compliant economy system command to display user's wallet and stats
 * Shows GrowCoins, Premium Seeds, and various economy statistics
 */

const { SlashCommandBuilder, EmbedBuilder, InteractionContextType } = require('discord.js');
const economyService = require('../../services/economyService');
const { EmbedBuilders } = require('../../utils/economyHelpers');
const ageVerificationService = require('../../services/ageVerification');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('💰 Check your GrowCoins and Premium Seeds balance')
    .setContexts(InteractionContextType.Guild)
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('Check another user\'s balance (optional)')
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      const targetUser = interaction.options.getUser('user') || interaction.user;
      const isOwnBalance = targetUser.id === interaction.user.id;
      const guildId = interaction.guild.id;

      console.log(`💰 Balance command executed by ${interaction.user.tag} for ${targetUser.tag}`);

      // Check if target user exists in database
      const userExists = await economyService.ensureUserExists(targetUser.id, guildId);
      if (!userExists) {
        const notFoundEmbed = EmbedBuilders.createErrorEmbed(
          'User Not Found',
          `${isOwnBalance ? 'You haven\'t' : `${targetUser.displayName} hasn't`} joined the GrowmiesNJ economy yet!\n\n` +
          `${isOwnBalance ? 'Use `/daily` to claim your first reward and get started!' : 'They need to use `/daily` to get started.'}`
        );
        
        return await interaction.editReply({ embeds: [notFoundEmbed] });
      }

      // Get user's economy data
      const economy = await economyService.getUserEconomy(targetUser.id, guildId);
      if (!economy) {
        const errorEmbed = EmbedBuilders.createErrorEmbed(
          'Economy Error',
          'Unable to retrieve economy data. Please try again later.'
        );
        
        return await interaction.editReply({ embeds: [errorEmbed] });
      }

      // Get user's rank in the guild
      const rank = await economyService.getUserRank(targetUser.id, guildId);

      // Check age verification status for premium seeds display
      const isAgeVerified = await ageVerificationService.isUserVerified(targetUser.id, guildId);

      // Calculate additional stats
      const stats = {
        rank: rank,
        totalEarned: economy.total_earned,
        totalSpent: economy.total_spent,
        netWorth: economy.grow_coins + (economy.premium_seeds * 10), // Rough conversion for display
        efficiency: economy.total_earned > 0 ? Math.round((economy.total_earned - economy.total_spent) / economy.total_earned * 100) : 0
      };

      // Create balance embed
      const balanceEmbed = new EmbedBuilder()
        .setColor('#4CAF50')
        .setTitle(`💰 ${targetUser.displayName}'s Wallet`)
        .setDescription('Your cannabis community currency balance 🌿')
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 128 }))
        .addFields(
          {
            name: '🌿 GrowCoins',
            value: `**${economy.grow_coins.toLocaleString()}** 🌿\n*Primary community currency*`,
            inline: true
          },
          {
            name: '🌱 Premium Seeds',
            value: isAgeVerified 
              ? `**${economy.premium_seeds.toLocaleString()}** 🌱\n*Premium currency (21+ only)*`
              : '🔒 *Requires age verification*',
            inline: true
          },
          {
            name: '🏆 Server Rank',
            value: `**#${rank}**\n*Community ranking*`,
            inline: true
          }
        );

      // Add streak information
      if (economy.daily_streak > 0 || economy.work_streak > 0) {
        balanceEmbed.addFields({
          name: '🔥 Active Streaks',
          value: [
            `**Daily:** ${economy.daily_streak} day${economy.daily_streak !== 1 ? 's' : ''}`,
            `**Work:** ${economy.work_streak} session${economy.work_streak !== 1 ? 's' : ''}`
          ].join('\n'),
          inline: true
        });
      }

      // Add activity stats
      balanceEmbed.addFields(
        {
          name: '📊 Economy Statistics',
          value: [
            `**Total Earned:** ${stats.totalEarned.toLocaleString()} 🌿`,
            `**Total Spent:** ${stats.totalSpent.toLocaleString()} 🌿`,
            `**Net Worth:** ${stats.netWorth.toLocaleString()} 🌿`,
            `**Efficiency:** ${stats.efficiency}%`
          ].join('\n'),
          inline: true
        },
        {
          name: '🎯 Activity Summary',
          value: [
            `**Purchases:** ${economy.lifetime_purchases} item${economy.lifetime_purchases !== 1 ? 's' : ''}`,
            `**Gifts Sent:** ${economy.lifetime_gifts_sent}`,
            `**Gifts Received:** ${economy.lifetime_gifts_received}`,
            `**Last Activity:** ${economy.updated_at ? `<t:${Math.floor(new Date(economy.updated_at).getTime() / 1000)}:R>` : 'Unknown'}`
          ].join('\n'),
          inline: true
        }
      );

      // Add daily reward status
      const dailyStatus = await economyService.checkDailyRewardEligibility(targetUser.id, guildId);
      const dailyStatusText = dailyStatus.canClaim 
        ? '✅ **Ready to claim!**' 
        : `⏰ Next reward ${dailyStatus.message.toLowerCase()}`;

      balanceEmbed.addFields({
        name: '🌅 Daily Reward Status',
        value: dailyStatusText,
        inline: false
      });

      // Add helpful tips for new users
      if (economy.total_earned < 100) {
        balanceEmbed.addFields({
          name: '💡 Growing Tips',
          value: [
            '• Use `/daily` to claim daily rewards and build streaks',
            '• Try `/work` to earn GrowCoins through activities',
            '• Visit `/shop` to spend your currency on items',
            '• Age verify with `/verify` to unlock Premium Seeds'
          ].join('\n'),
          inline: false
        });
      }

      balanceEmbed.setFooter({
        text: `GrowmiesNJ Economy • ${isOwnBalance ? 'Keep Growing!' : `Viewed by ${interaction.user.username}`}`,
        iconURL: interaction.guild.iconURL({ dynamic: true })
      })
      .setTimestamp();

      await interaction.editReply({ 
        embeds: [balanceEmbed],
        ephemeral: isOwnBalance
      });

      console.log(`✅ Balance command completed for ${targetUser.tag} (${economy.grow_coins} GrowCoins, ${economy.premium_seeds} Premium Seeds)`);

    } catch (error) {
      console.error('❌ Error in balance command:', error);
      
      const errorEmbed = EmbedBuilders.createErrorEmbed(
        'Balance Error',
        'Unable to retrieve balance information. Please try again later.'
      );

      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.editReply({ embeds: [errorEmbed] });
        } else {
          await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
      } catch (followUpError) {
        console.error('❌ Failed to send balance error response:', followUpError);
      }
    }
  }
};