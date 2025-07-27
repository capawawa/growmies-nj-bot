/**
 * Inventory Command for GrowmiesNJ Discord Bot
 * 
 * Cannabis-compliant economy system inventory management
 * Shows owned items, usage tracking, and item management
 */

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, InteractionContextType } = require('discord.js');
const economyService = require('../../services/economyService');
const { EmbedBuilders, Currency } = require('../../utils/economyHelpers');
const ageVerificationService = require('../../services/ageVerification');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('inventory')
    .setDescription('🎒 View and manage your item collection')
    .setContexts(InteractionContextType.Guild)
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('View another user\'s inventory (optional)')
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName('category')
        .setDescription('Filter by item category')
        .setRequired(false)
        .addChoices(
          { name: '🛠️ Tools', value: 'tools' },
          { name: '🎨 Decorations', value: 'decorations' },
          { name: '🌿 Cannabis Collectibles', value: 'cannabis_collectibles' },
          { name: '📦 Profile Items', value: 'profile_items' },
          { name: '⚡ Consumables', value: 'consumables' },
          { name: '⭐ Special Items', value: 'special' }
        )
    )
    .addBooleanOption(option =>
      option
        .setName('equipped')
        .setDescription('Show only equipped items')
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      const userId = interaction.user.id;
      const guildId = interaction.guild.id;
      const targetUser = interaction.options.getUser('user') || interaction.user;
      const category = interaction.options.getString('category') || 'all';
      const equippedOnly = interaction.options.getBoolean('equipped') || false;
      const isOwnInventory = targetUser.id === userId;

      await interaction.deferReply();

      console.log(`🎒 Inventory command executed by ${interaction.user.tag} for ${targetUser.tag} (category: ${category}, equipped: ${equippedOnly})`);

      // Ensure target user exists in economy system
      const userExists = await economyService.ensureUserExists(targetUser.id, guildId);
      if (!userExists) {
        const notFoundEmbed = EmbedBuilders.createErrorEmbed(
          'User Not Found',
          `${isOwnInventory ? 'You haven\'t' : `${targetUser.displayName} hasn't`} joined the economy yet!\n\n` +
          `${isOwnInventory ? 'Use `/daily` to get started!' : 'They need to use `/daily` first.'}`
        );
        
        return await interaction.editReply({ embeds: [notFoundEmbed] });
      }

      // Check age verification status
      const isAgeVerified = await ageVerificationService.isUserVerified(targetUser.id, guildId);

      // Get user's inventory
      const inventoryData = await this.getUserInventory(targetUser.id, guildId, category, equippedOnly, isAgeVerified);

      if (!inventoryData.items || inventoryData.items.length === 0) {
        const emptyEmbed = this.createEmptyInventoryEmbed(targetUser, category, equippedOnly, isOwnInventory);
        return await interaction.editReply({ embeds: [emptyEmbed] });
      }

      // Get user's economy data for stats
      const economy = await economyService.getUserEconomy(targetUser.id, guildId);

      // Create inventory embed
      const inventoryEmbed = this.createInventoryEmbed(
        targetUser,
        inventoryData.items,
        inventoryData.stats,
        category,
        equippedOnly,
        isOwnInventory,
        economy
      );

      // Create action components (only for own inventory)
      const components = isOwnInventory 
        ? this.createInventoryComponents(userId, inventoryData.items, category)
        : [];

      await interaction.editReply({
        embeds: [inventoryEmbed],
        components: components
      });

      console.log(`✅ Inventory displayed for ${targetUser.tag} (${inventoryData.items.length} items shown)`);

    } catch (error) {
      console.error('❌ Error in inventory command:', error);
      
      const errorEmbed = EmbedBuilders.createErrorEmbed(
        'Inventory Error',
        'Unable to load inventory. Please try again later.'
      );

      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.editReply({ embeds: [errorEmbed] });
        } else {
          await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
      } catch (followUpError) {
        console.error('❌ Failed to send inventory error response:', followUpError);
      }
    }
  },

  /**
   * Get user's inventory with filtering
   */
  async getUserInventory(userId, guildId, category, equippedOnly, isAgeVerified) {
    try {
      // In a real implementation, this would query the database
      // For now, return sample inventory items
      const allItems = this.getSampleInventoryItems(userId, isAgeVerified);
      
      // Apply filters
      let filteredItems = allItems;
      
      if (category !== 'all') {
        filteredItems = filteredItems.filter(item => item.category === category);
      }
      
      if (equippedOnly) {
        filteredItems = filteredItems.filter(item => item.isEquipped);
      }

      // Calculate inventory stats
      const stats = {
        totalItems: allItems.length,
        totalValue: allItems.reduce((sum, item) => sum + (item.purchasePrice || 0), 0),
        equippedItems: allItems.filter(item => item.isEquipped).length,
        categoryCounts: this.getCategoryCounts(allItems)
      };

      return {
        items: filteredItems,
        stats
      };

    } catch (error) {
      console.error('Error getting user inventory:', error);
      return { items: [], stats: {} };
    }
  },

  /**
   * Get sample inventory items (in production, this would come from database)
   */
  getSampleInventoryItems(userId, isAgeVerified) {
    // This would normally query the user_inventories table
    // For demo purposes, return some sample items
    const items = [
      {
        id: 'inv_grow_light_1',
        itemId: 'tool_grow_light',
        name: 'Premium Grow Light',
        description: 'Boost your plant growth with this virtual premium grow light!',
        category: 'tools',
        rarity: 'rare',
        emoji: '💡',
        quantity: 1,
        isEquipped: true,
        purchasePrice: 250,
        acquiredAt: new Date(Date.now() - 86400000 * 3), // 3 days ago
        lastUsed: new Date(Date.now() - 86400000), // 1 day ago
        usesRemaining: null,
        isConsumable: false
      },
      {
        id: 'inv_badge_1',
        itemId: 'profile_badge',
        name: 'Grower Badge',
        description: 'Show off your growing expertise with this special badge.',
        category: 'profile_items',
        rarity: 'common',
        emoji: '🏅',
        quantity: 1,
        isEquipped: false,
        purchasePrice: 100,
        acquiredAt: new Date(Date.now() - 86400000 * 7), // 7 days ago
        lastUsed: null,
        usesRemaining: null,
        isConsumable: false
      },
      {
        id: 'inv_xp_boost_1',
        itemId: 'consumable_xp_boost',
        name: 'Growth Accelerator',
        description: 'Double your XP gains for 24 hours! (One-time use)',
        category: 'consumables',
        rarity: 'rare',
        emoji: '⚡',
        quantity: 2,
        isEquipped: false,
        purchasePrice: 200,
        acquiredAt: new Date(Date.now() - 86400000 * 2), // 2 days ago
        lastUsed: null,
        usesRemaining: 2,
        isConsumable: true
      }
    ];

    // Add age-restricted items if verified
    if (isAgeVerified) {
      items.push({
        id: 'inv_strain_card_1',
        itemId: 'collectible_strain_card',
        name: 'Legendary Strain Card',
        description: 'A rare collectible card featuring legendary cannabis genetics.',
        category: 'cannabis_collectibles',
        rarity: 'legendary',
        emoji: '🃏',
        quantity: 1,
        isEquipped: false,
        purchasePrice: 5, // Premium seeds
        acquiredAt: new Date(Date.now() - 86400000 * 5), // 5 days ago
        lastUsed: null,
        usesRemaining: null,
        isConsumable: false
      });
    }

    return items;
  },

  /**
   * Get category counts for stats
   */
  getCategoryCounts(items) {
    const counts = {};
    items.forEach(item => {
      counts[item.category] = (counts[item.category] || 0) + item.quantity;
    });
    return counts;
  },

  /**
   * Create empty inventory embed
   */
  createEmptyInventoryEmbed(user, category, equippedOnly, isOwnInventory) {
    const embed = new EmbedBuilder()
      .setColor('#FF9800')
      .setTitle(`🎒 ${user.displayName}'s Inventory`)
      .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 128 }));

    if (equippedOnly) {
      embed.setDescription(`No equipped items found.\n\n${isOwnInventory ? 'Visit the `/shop` to buy items and equip them!' : 'This user hasn\'t equipped any items yet.'}`);
    } else if (category !== 'all') {
      embed.setDescription(`No items found in the **${category}** category.\n\n${isOwnInventory ? 'Visit the `/shop` to start your collection!' : 'This user doesn\'t own any items in this category.'}`);
    } else {
      embed.setDescription(`${isOwnInventory ? 'Your inventory is empty!' : 'This user\'s inventory is empty!'}\n\n${isOwnInventory ? '🏪 Visit the `/shop` to start building your collection!\n🌅 Use `/daily` to earn GrowCoins for purchases!' : 'Encourage them to visit the shop and start collecting!'}`);
    }

    embed.setFooter({
      text: 'GrowmiesNJ Economy • Start your collection today!',
      iconURL: user.guild?.iconURL({ dynamic: true })
    })
    .setTimestamp();

    return embed;
  },

  /**
   * Create inventory display embed
   */
  createInventoryEmbed(user, items, stats, category, equippedOnly, isOwnInventory, economy) {
    const embed = new EmbedBuilder()
      .setColor('#4CAF50')
      .setTitle(`🎒 ${user.displayName}'s Inventory`)
      .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 128 }));

    // Add filter information
    let description = `**${items.length}** item${items.length !== 1 ? 's' : ''} shown`;
    if (category !== 'all') {
      description += ` in **${category}**`;
    }
    if (equippedOnly) {
      description += ` (equipped only)`;
    }
    embed.setDescription(description);

    // Add inventory stats
    if (stats.totalItems > 0) {
      embed.addFields({
        name: '📊 Collection Stats',
        value: [
          `**Total Items:** ${stats.totalItems}`,
          `**Equipped:** ${stats.equippedItems}`,
          `**Total Value:** ${stats.totalValue.toLocaleString()} 🌿`,
          `**Categories:** ${Object.keys(stats.categoryCounts).length}`
        ].join('\n'),
        inline: true
      });
    }

    // Add current balance if own inventory
    if (isOwnInventory && economy) {
      embed.addFields({
        name: '💰 Current Balance',
        value: `${Currency.formatGrowCoins(economy.grow_coins)}\n${Currency.formatPremiumSeeds(economy.premium_seeds)}`,
        inline: true
      });
    }

    // Add items
    items.forEach((item, index) => {
      const rarityIcons = {
        'common': '⚪',
        'uncommon': '🟢',
        'rare': '🔵',
        'epic': '🟣',
        'legendary': '🟠'
      };

      const statusIcons = [];
      if (item.isEquipped) statusIcons.push('✅ Equipped');
      if (item.isConsumable && item.usesRemaining) statusIcons.push(`${item.usesRemaining} uses left`);
      if (item.quantity > 1) statusIcons.push(`x${item.quantity}`);

      const statusText = statusIcons.length > 0 ? `\n*${statusIcons.join(' • ')}*` : '';
      const lastUsedText = item.lastUsed ? `\nLast used: <t:${Math.floor(item.lastUsed.getTime() / 1000)}:R>` : '';

      embed.addFields({
        name: `${item.emoji} ${item.name} ${rarityIcons[item.rarity] || '⚪'}`,
        value: `${item.description}${statusText}${lastUsedText}`,
        inline: false
      });
    });

    // Add category breakdown if showing all items
    if (category === 'all' && !equippedOnly && Object.keys(stats.categoryCounts).length > 1) {
      const categoryBreakdown = Object.entries(stats.categoryCounts)
        .map(([cat, count]) => `**${cat}:** ${count}`)
        .join('\n');
      
      embed.addFields({
        name: '📈 Category Breakdown',
        value: categoryBreakdown,
        inline: true
      });
    }

    embed.setFooter({
      text: `GrowmiesNJ Economy • ${isOwnInventory ? 'Manage your collection' : `Viewed by ${user.username}`}`,
      iconURL: user.guild?.iconURL({ dynamic: true })
    })
    .setTimestamp();

    return embed;
  },

  /**
   * Create inventory management components
   */
  createInventoryComponents(userId, items, category) {
    const components = [];

    // Category filter dropdown
    const categorySelect = new ActionRowBuilder()
      .addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`inventory_category_${userId}`)
          .setPlaceholder('🏷️ Filter by category')
          .addOptions([
            {
              label: 'All Items',
              value: 'all',
              emoji: '🎒',
              default: category === 'all'
            },
            {
              label: 'Tools',
              value: 'tools',
              emoji: '🛠️',
              default: category === 'tools'
            },
            {
              label: 'Decorations',
              value: 'decorations',
              emoji: '🎨',
              default: category === 'decorations'
            },
            {
              label: 'Cannabis Collectibles',
              value: 'cannabis_collectibles',
              emoji: '🌿',
              default: category === 'cannabis_collectibles'
            },
            {
              label: 'Profile Items',
              value: 'profile_items',
              emoji: '📦',
              default: category === 'profile_items'
            },
            {
              label: 'Consumables',
              value: 'consumables',
              emoji: '⚡',
              default: category === 'consumables'
            }
          ])
      );

    components.push(categorySelect);

    // Item management dropdown (if items exist)
    if (items.length > 0) {
      const itemSelect = new ActionRowBuilder()
        .addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(`inventory_manage_${userId}`)
            .setPlaceholder('⚙️ Manage an item')
            .addOptions(
              items.slice(0, 20).map(item => ({ // Discord limit of 25 options
                label: item.name,
                value: item.id,
                description: item.isEquipped ? 'Currently equipped' : (item.isConsumable ? `${item.usesRemaining || 0} uses left` : 'Click to manage'),
                emoji: item.emoji
              }))
            )
        );

      components.push(itemSelect);
    }

    // Action buttons
    const actionButtons = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`inventory_equipped_${userId}`)
          .setLabel('✅ Equipped Only')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`inventory_shop_${userId}`)
          .setLabel('🏪 Visit Shop')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`inventory_balance_${userId}`)
          .setLabel('💰 Balance')
          .setStyle(ButtonStyle.Secondary)
      );

    components.push(actionButtons);

    return components;
  }
};