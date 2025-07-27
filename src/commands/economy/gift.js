/**
 * Gift Command for GrowmiesNJ Discord Bot
 * 
 * Cannabis-compliant economy system gift transfer
 * Allows users to send GrowCoins and Premium Seeds to other users
 */

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, InteractionContextType } = require('discord.js');
const economyService = require('../../services/economyService');
const { EmbedBuilders, Currency, Validation } = require('../../utils/economyHelpers');
const ageVerificationService = require('../../services/ageVerification');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gift')
    .setDescription('🎁 Send GrowCoins or Premium Seeds to another user')
    .setContexts(InteractionContextType.Guild)
    .addUserOption(option =>
      option
        .setName('recipient')
        .setDescription('The user to send currency to')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName('growcoins')
        .setDescription('Amount of GrowCoins to send')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(10000)
    )
    .addIntegerOption(option =>
      option
        .setName('premiumseeds')
        .setDescription('Amount of Premium Seeds to send (21+ verified only)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(100)
    )
    .addStringOption(option =>
      option
        .setName('message')
        .setDescription('Optional message to include with the gift')
        .setRequired(false)
        .setMaxLength(200)
    ),

  async execute(interaction) {
    try {
      const senderId = interaction.user.id;
      const recipient = interaction.options.getUser('recipient');
      const growCoinsAmount = interaction.options.getInteger('growcoins') || 0;
      const premiumSeedsAmount = interaction.options.getInteger('premiumseeds') || 0;
      const giftMessage = interaction.options.getString('message') || null;
      const guildId = interaction.guild.id;

      await interaction.deferReply();

      console.log(`🎁 Gift command executed by ${interaction.user.tag} to ${recipient.tag} (${growCoinsAmount} GrowCoins, ${premiumSeedsAmount} Premium Seeds)`);

      // Validation checks
      const validationResult = await this.validateGiftRequest(
        senderId, 
        recipient, 
        growCoinsAmount, 
        premiumSeedsAmount, 
        guildId
      );

      if (!validationResult.success) {
        const errorEmbed = EmbedBuilders.createErrorEmbed('Gift Error', validationResult.message);
        return await interaction.editReply({ embeds: [errorEmbed] });
      }

      // Check if both amounts are zero
      if (growCoinsAmount === 0 && premiumSeedsAmount === 0) {
        const errorEmbed = EmbedBuilders.createErrorEmbed(
          'Invalid Gift Amount',
          'You must specify at least some GrowCoins or Premium Seeds to send!'
        );
        return await interaction.editReply({ embeds: [errorEmbed] });
      }

      // Get sender's economy data
      const senderEconomy = await economyService.getUserEconomy(senderId, guildId);
      if (!senderEconomy) {
        const errorEmbed = EmbedBuilders.createErrorEmbed(
          'Account Error',
          'Unable to access your economy account. Please try `/balance` first.'
        );
        return await interaction.editReply({ embeds: [errorEmbed] });
      }

      // Check if sender can afford the gift
      const affordabilityCheck = Validation.canAfford(senderEconomy, growCoinsAmount, premiumSeedsAmount);
      if (!affordabilityCheck.success) {
        const errorEmbed = EmbedBuilders.createErrorEmbed('Insufficient Funds', affordabilityCheck.message);
        return await interaction.editReply({ embeds: [errorEmbed] });
      }

      // Check age verification for Premium Seeds
      if (premiumSeedsAmount > 0) {
        const isAgeVerified = await ageVerificationService.isUserVerified(senderId, guildId);
        if (!isAgeVerified) {
          const errorEmbed = EmbedBuilders.createErrorEmbed(
            'Age Verification Required',
            'You must be age verified (21+) to send Premium Seeds. Use `/verify` to get verified!'
          );
          return await interaction.editReply({ embeds: [errorEmbed] });
        }
      }

      // Show confirmation dialog
      const confirmationEmbed = this.createConfirmationEmbed(
        interaction.user,
        recipient,
        growCoinsAmount,
        premiumSeedsAmount,
        giftMessage,
        senderEconomy
      );

      const confirmationButtons = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`gift_confirm_${senderId}_${recipient.id}`)
            .setLabel('✅ Confirm Gift')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`gift_cancel_${senderId}`)
            .setLabel('❌ Cancel')
            .setStyle(ButtonStyle.Danger)
        );

      await interaction.editReply({
        embeds: [confirmationEmbed],
        components: [confirmationButtons]
      });

      // Store gift data temporarily for confirmation
      const giftData = {
        senderId,
        recipientId: recipient.id,
        growCoinsAmount,
        premiumSeedsAmount,
        giftMessage,
        timestamp: Date.now()
      };

      // In production, store this in Redis or a temporary cache
      // For now, use global memory (this is not production-ready)
      if (!global.pendingGifts) {
        global.pendingGifts = new Map();
      }
      global.pendingGifts.set(`${senderId}_${recipient.id}`, giftData);

      // Set a timeout to clean up pending gifts
      setTimeout(() => {
        if (global.pendingGifts) {
          global.pendingGifts.delete(`${senderId}_${recipient.id}`);
        }
      }, 300000); // 5 minutes

      console.log(`🎁 Gift confirmation displayed for ${interaction.user.tag}`);

    } catch (error) {
      console.error('❌ Error in gift command:', error);
      
      const errorEmbed = EmbedBuilders.createErrorEmbed(
        'Gift Error',
        'An unexpected error occurred while processing your gift. Please try again later.'
      );

      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.editReply({ embeds: [errorEmbed] });
        } else {
          await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
      } catch (followUpError) {
        console.error('❌ Failed to send gift error response:', followUpError);
      }
    }
  },

  /**
   * Validate gift request
   */
  async validateGiftRequest(senderId, recipient, growCoinsAmount, premiumSeedsAmount, guildId) {
    // Check if trying to gift to self
    if (senderId === recipient.id) {
      return {
        success: false,
        message: 'You cannot send gifts to yourself! Share the love with others in the community! 💚'
      };
    }

    // Check if recipient is a bot
    if (recipient.bot) {
      return {
        success: false,
        message: 'You cannot send gifts to bots! They don\'t need GrowCoins... yet! 🤖'
      };
    }

    // Ensure both users exist in economy system
    await economyService.ensureUserExists(senderId, guildId);
    await economyService.ensureUserExists(recipient.id, guildId);

    // Check if recipient exists in the economy
    const recipientEconomy = await economyService.getUserEconomy(recipient.id, guildId);
    if (!recipientEconomy) {
      return {
        success: false,
        message: `${recipient.displayName} hasn't joined the economy yet! They need to use \`/daily\` first.`
      };
    }

    // Check daily gift limits (prevent abuse)
    const today = new Date().toDateString();
    const giftKey = `${senderId}_${today}`;
    
    // In production, this would be stored in database
    if (!global.dailyGifts) {
      global.dailyGifts = new Map();
    }
    
    const todaysGifts = global.dailyGifts.get(giftKey) || 0;
    if (todaysGifts >= 5) { // Max 5 gifts per day
      return {
        success: false,
        message: 'You\'ve reached your daily gift limit (5 gifts per day). Spread the love tomorrow! 💚'
      };
    }

    return { success: true };
  },

  /**
   * Create gift confirmation embed
   */
  createConfirmationEmbed(sender, recipient, growCoinsAmount, premiumSeedsAmount, giftMessage, senderEconomy) {
    const embed = new EmbedBuilder()
      .setColor('#FF69B4')
      .setTitle('🎁 Gift Confirmation')
      .setDescription('Are you sure you want to send this gift?')
      .setThumbnail(sender.displayAvatarURL({ dynamic: true, size: 128 }));

    // Add gift details
    embed.addFields(
      {
        name: '📤 From',
        value: `${sender.displayName}`,
        inline: true
      },
      {
        name: '📥 To',
        value: `${recipient.displayName}`,
        inline: true
      },
      {
        name: '🎁 Gift Contents',
        value: [
          growCoinsAmount > 0 ? Currency.formatGrowCoins(growCoinsAmount) : null,
          premiumSeedsAmount > 0 ? Currency.formatPremiumSeeds(premiumSeedsAmount) : null
        ].filter(Boolean).join('\n') || 'Nothing selected',
        inline: false
      }
    );

    // Add message if provided
    if (giftMessage) {
      embed.addFields({
        name: '💌 Gift Message',
        value: `"${giftMessage}"`,
        inline: false
      });
    }

    // Add sender's remaining balance
    const remainingGrowCoins = senderEconomy.grow_coins - growCoinsAmount;
    const remainingPremiumSeeds = senderEconomy.premium_seeds - premiumSeedsAmount;

    embed.addFields({
      name: '💰 Your Balance After Gift',
      value: `${Currency.formatGrowCoins(remainingGrowCoins)}\n${Currency.formatPremiumSeeds(remainingPremiumSeeds)}`,
      inline: true
    });

    // Add total gift value
    const totalValue = growCoinsAmount + (premiumSeedsAmount * 10); // Rough conversion for display
    embed.addFields({
      name: '💎 Total Gift Value',
      value: `~${totalValue.toLocaleString()} GrowCoins equivalent`,
      inline: true
    });

    embed.setFooter({
      text: 'GrowmiesNJ Economy • Gifts strengthen our community!',
      iconURL: sender.guild?.iconURL({ dynamic: true })
    })
    .setTimestamp();

    return embed;
  },

  /**
   * Process confirmed gift (called by button interaction handler)
   */
  async processConfirmedGift(interaction, giftData) {
    try {
      const { senderId, recipientId, growCoinsAmount, premiumSeedsAmount, giftMessage } = giftData;
      const guildId = interaction.guild.id;

      // Execute the gift transfer
      const result = await economyService.sendGift(
        senderId,
        recipientId,
        guildId,
        growCoinsAmount,
        premiumSeedsAmount,
        giftMessage
      );

      if (!result.success) {
        const errorEmbed = EmbedBuilders.createErrorEmbed('Gift Failed', result.message);
        return await interaction.editReply({ embeds: [errorEmbed], components: [] });
      }

      // Get recipient user object
      const recipient = await interaction.client.users.fetch(recipientId);
      const sender = await interaction.client.users.fetch(senderId);

      // Create success embed
      const successEmbed = this.createGiftSuccessEmbed(
        sender,
        recipient,
        growCoinsAmount,
        premiumSeedsAmount,
        giftMessage
      );

      // Update daily gift count
      const today = new Date().toDateString();
      const giftKey = `${senderId}_${today}`;
      
      if (!global.dailyGifts) {
        global.dailyGifts = new Map();
      }
      
      const currentCount = global.dailyGifts.get(giftKey) || 0;
      global.dailyGifts.set(giftKey, currentCount + 1);

      await interaction.editReply({
        embeds: [successEmbed],
        components: []
      });

      // Try to notify recipient (if they're in the guild)
      try {
        const recipientMember = await interaction.guild.members.fetch(recipientId);
        if (recipientMember) {
          const notificationEmbed = this.createRecipientNotificationEmbed(
            sender,
            growCoinsAmount,
            premiumSeedsAmount,
            giftMessage
          );

          await recipientMember.send({ embeds: [notificationEmbed] }).catch(() => {
            // If DM fails, that's okay - they'll see it in the channel
          });
        }
      } catch (error) {
        // Ignore notification errors
      }

      console.log(`✅ Gift completed: ${sender.tag} → ${recipient.tag} (${growCoinsAmount} GrowCoins, ${premiumSeedsAmount} Premium Seeds)`);

    } catch (error) {
      console.error('❌ Error processing confirmed gift:', error);
      
      const errorEmbed = EmbedBuilders.createErrorEmbed(
        'Gift Processing Error',
        'An error occurred while processing your gift. Please try again.'
      );
      
      await interaction.editReply({ embeds: [errorEmbed], components: [] });
    }
  },

  /**
   * Create gift success embed
   */
  createGiftSuccessEmbed(sender, recipient, growCoinsAmount, premiumSeedsAmount, giftMessage) {
    const embed = new EmbedBuilder()
      .setColor('#4CAF50')
      .setTitle('🎁 Gift Sent Successfully!')
      .setDescription('Your generous gift has been delivered! 💚')
      .setThumbnail('https://cdn.discordapp.com/emojis/🎁.png');

    embed.addFields(
      {
        name: '📤 From',
        value: sender.displayName,
        inline: true
      },
      {
        name: '📥 To',
        value: recipient.displayName,
        inline: true
      },
      {
        name: '🎁 Gift Delivered',
        value: [
          growCoinsAmount > 0 ? Currency.formatGrowCoins(growCoinsAmount) : null,
          premiumSeedsAmount > 0 ? Currency.formatPremiumSeeds(premiumSeedsAmount) : null
        ].filter(Boolean).join('\n'),
        inline: false
      }
    );

    if (giftMessage) {
      embed.addFields({
        name: '💌 Your Message',
        value: `"${giftMessage}"`,
        inline: false
      });
    }

    embed.addFields({
      name: '🌟 Community Impact',
      value: 'Your generosity helps build a stronger GrowmiesNJ community! Thank you for sharing the wealth! 🌿',
      inline: false
    });

    embed.setFooter({
      text: 'GrowmiesNJ Economy • Spread the love!',
      iconURL: sender.guild?.iconURL({ dynamic: true })
    })
    .setTimestamp();

    return embed;
  },

  /**
   * Create recipient notification embed
   */
  createRecipientNotificationEmbed(sender, growCoinsAmount, premiumSeedsAmount, giftMessage) {
    const embed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('🎁 You Received a Gift!')
      .setDescription(`${sender.displayName} sent you a gift in GrowmiesNJ!`)
      .setThumbnail(sender.displayAvatarURL({ dynamic: true, size: 128 }));

    embed.addFields({
      name: '🎁 Gift Contents',
      value: [
        growCoinsAmount > 0 ? Currency.formatGrowCoins(growCoinsAmount) : null,
        premiumSeedsAmount > 0 ? Currency.formatPremiumSeeds(premiumSeedsAmount) : null
      ].filter(Boolean).join('\n'),
      inline: false
    });

    if (giftMessage) {
      embed.addFields({
        name: '💌 Message from Sender',
        value: `"${giftMessage}"`,
        inline: false
      });
    }

    embed.addFields({
      name: '💡 What to do next',
      value: 'Use `/balance` to see your updated wallet!\nConsider sending a thank you or returning the favor! 💚',
      inline: false
    });

    embed.setFooter({
      text: 'GrowmiesNJ Economy • Community love in action!',
      iconURL: sender.guild?.iconURL({ dynamic: true })
    })
    .setTimestamp();

    return embed;
  }
};