/**
 * Shop Command for GrowmiesNJ Discord Bot
 * 
 * Cannabis-compliant economy system shop interface
 * Features age-gated items, categories, and interactive browsing
 */

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, InteractionContextType } = require('discord.js');
const economyService = require('../../services/economyService');
const { EmbedBuilders, Currency } = require('../../utils/economyHelpers');
const ageVerificationService = require('../../services/ageVerification');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('🏪 Browse the GrowmiesNJ community shop and purchase items')
    .setContexts(InteractionContextType.Guild)
    .addStringOption(option =>
      option
        .setName('category')
        .setDescription('Browse a specific category')
        .setRequired(false)
        .addChoices(
          { name: '🛠️ Tools', value: 'tools' },
          { name: '🎨 Decorations', value: 'decorations' },
          { name: '🌿 Cannabis Collectibles (21+)', value: 'cannabis_collectibles' },
          { name: '📦 Profile Items', value: 'profile_items' },
          { name: '⚡ Consumables', value: 'consumables' },
          { name: '⭐ Special Items', value: 'special' }
        )
    )
    .addIntegerOption(option =>
      option
        .setName('page')
        .setDescription('Page number to view')
        .setRequired(false)
        .setMinValue(1)
    ),

  async execute(interaction) {
    try {
      const userId = interaction.user.id;
      const guildId = interaction.guild.id;
      const category = interaction.options.getString('category') || 'all';
      const page = interaction.options.getInteger('page') || 1;

      await interaction.deferReply();

      console.log(`🏪 Shop command executed by ${interaction.user.tag} (category: ${category}, page: ${page})`);

      // Ensure user exists in economy system
      await economyService.ensureUserExists(userId, guildId);

      // Check age verification status
      const isAgeVerified = await ageVerificationService.isUserVerified(userId, guildId);

      // Get user's current balance
      const economy = await economyService.getUserEconomy(userId, guildId);
      if (!economy) {
        const errorEmbed = EmbedBuilders.createErrorEmbed(
          'Shop Access Error',
          'Unable to access your wallet. Please try `/balance` first to initialize your economy account.'
        );
        return await interaction.editReply({ embeds: [errorEmbed] });
      }

      // Get shop items based on category and age verification
      const shopData = await this.getShopItems(guildId, category, isAgeVerified, page);

      if (!shopData.items || shopData.items.length === 0) {
        const emptyEmbed = new EmbedBuilder()
          .setColor('#FF9800')
          .setTitle('🏪 Shop Category Empty')
          .setDescription(
            category === 'cannabis_collectibles' && !isAgeVerified
              ? 'Cannabis collectibles require age verification (21+). Use `/verify` to unlock these items!'
              : `No items found in the ${category === 'all' ? 'shop' : category} category.\n\nCheck back later for new items! 🌱`
          )
          .setFooter({
            text: 'GrowmiesNJ Shop • New items added regularly',
            iconURL: interaction.guild.iconURL({ dynamic: true })
          })
          .setTimestamp();

        return await interaction.editReply({ embeds: [emptyEmbed] });
      }

      // Create shop embed
      const shopEmbed = this.createShopEmbed(
        shopData.items,
        page,
        shopData.totalPages,
        category,
        economy,
        isAgeVerified
      );

      // Create navigation and action components
      const components = this.createShopComponents(userId, category, page, shopData.totalPages, shopData.items);

      await interaction.editReply({
        embeds: [shopEmbed],
        components: components
      });

      console.log(`✅ Shop displayed for ${interaction.user.tag} (${shopData.items.length} items, page ${page}/${shopData.totalPages})`);

    } catch (error) {
      console.error('❌ Error in shop command:', error);
      
      const errorEmbed = EmbedBuilders.createErrorEmbed(
        'Shop Error',
        'Unable to load the shop. Please try again later.'
      );

      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.editReply({ embeds: [errorEmbed] });
        } else {
          await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
      } catch (followUpError) {
        console.error('❌ Failed to send shop error response:', followUpError);
      }
    }
  },

  /**
   * Get shop items with pagination and filtering
   */
  async getShopItems(guildId, category, isAgeVerified, page = 1) {
    const itemsPerPage = 6;
    
    try {
      // In a real implementation, this would query the database
      // For now, return sample items
      const allItems = this.getSampleShopItems(isAgeVerified);
      
      // Filter by category if specified
      let filteredItems = category === 'all' 
        ? allItems 
        : allItems.filter(item => item.category === category);

      // Calculate pagination
      const totalItems = filteredItems.length;
      const totalPages = Math.ceil(totalItems / itemsPerPage);
      const startIndex = (page - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const items = filteredItems.slice(startIndex, endIndex);

      return {
        items,
        totalPages,
        currentPage: page,
        totalItems
      };

    } catch (error) {
      console.error('Error getting shop items:', error);
      return { items: [], totalPages: 0, currentPage: 1, totalItems: 0 };
    }
  },

  /**
   * Get sample shop items (in production, this would come from database)
   */
  getSampleShopItems(isAgeVerified) {
    const items = [
      // Tools category
      {
        id: 'tool_grow_light',
        name: 'Premium Grow Light',
        description: 'Boost your plant growth with this virtual premium grow light!',
        category: 'tools',
        rarity: 'rare',
        growCoinPrice: 250,
        premiumSeedPrice: 0,
        ageRestricted: false,
        emoji: '💡',
        isActive: true
      },
      {
        id: 'tool_ph_meter',
        name: 'Digital pH Meter',
        description: 'Keep your nutrient solutions perfectly balanced.',
        category: 'tools',
        rarity: 'uncommon',
        growCoinPrice: 150,
        premiumSeedPrice: 0,
        ageRestricted: false,
        emoji: '🔬',
        isActive: true
      },

      // Decorations category
      {
        id: 'decoration_neon_sign',
        name: 'Neon Cannabis Leaf Sign',
        description: 'Light up your profile with this glowing cannabis leaf!',
        category: 'decorations',
        rarity: 'epic',
        growCoinPrice: 400,
        premiumSeedPrice: 0,
        ageRestricted: false,
        emoji: '🌿',
        isActive: true
      },
      {
        id: 'decoration_crystal',
        name: 'Lucky Growing Crystal',
        description: 'A mystical crystal that brings good fortune to your grows.',
        category: 'decorations',
        rarity: 'rare',
        growCoinPrice: 300,
        premiumSeedPrice: 0,
        ageRestricted: false,
        emoji: '💎',
        isActive: true
      },

      // Cannabis collectibles (21+ only)
      {
        id: 'collectible_strain_card',
        name: 'Legendary Strain Card',
        description: 'A rare collectible card featuring legendary cannabis genetics.',
        category: 'cannabis_collectibles',
        rarity: 'legendary',
        growCoinPrice: 0,
        premiumSeedPrice: 5,
        ageRestricted: true,
        emoji: '🃏',
        isActive: true
      },
      {
        id: 'collectible_grinder',
        name: 'Golden Grinder',
        description: 'A premium virtual grinder made from the finest materials.',
        category: 'cannabis_collectibles',
        rarity: 'epic',
        growCoinPrice: 0,
        premiumSeedPrice: 3,
        ageRestricted: true,
        emoji: '⚙️',
        isActive: true
      },

      // Profile items
      {
        id: 'profile_badge',
        name: 'Grower Badge',
        description: 'Show off your growing expertise with this special badge.',
        category: 'profile_items',
        rarity: 'common',
        growCoinPrice: 100,
        premiumSeedPrice: 0,
        ageRestricted: false,
        emoji: '🏅',
        isActive: true
      },

      // Consumables
      {
        id: 'consumable_xp_boost',
        name: 'Growth Accelerator',
        description: 'Double your XP gains for 24 hours! (One-time use)',
        category: 'consumables',
        rarity: 'rare',
        growCoinPrice: 200,
        premiumSeedPrice: 0,
        ageRestricted: false,
        emoji: '⚡',
        isActive: true
      }
    ];

    // Filter out age-restricted items if user is not verified
    return isAgeVerified ? items : items.filter(item => !item.ageRestricted);
  },

  /**
   * Create shop display embed
   */
  createShopEmbed(items, page, totalPages, category, userEconomy, isAgeVerified) {
    const categoryNames = {
      'all': 'All Items',
      'tools': '🛠️ Tools',
      'decorations': '🎨 Decorations',
      'cannabis_collectibles': '🌿 Cannabis Collectibles',
      'profile_items': '📦 Profile Items',
      'consumables': '⚡ Consumables',
      'special': '⭐ Special Items'
    };

    const embed = new EmbedBuilder()
      .setColor('#9C27B0')
      .setTitle('🏪 GrowmiesNJ Community Shop')
      .setDescription(`**${categoryNames[category] || 'Shop'}** | Page ${page}/${totalPages}`)
      .addFields({
        name: '💰 Your Balance',
        value: `${Currency.formatGrowCoins(userEconomy.grow_coins)}\n${Currency.formatPremiumSeeds(userEconomy.premium_seeds)}`,
        inline: true
      });

    // Add age verification status
    if (!isAgeVerified) {
      embed.addFields({
        name: '🔒 Age Verification',
        value: 'Use `/verify` to unlock 21+ items and Premium Seeds!',
        inline: true
      });
    }

    // Add items
    items.forEach((item, index) => {
      const price = item.growCoinPrice > 0 
        ? Currency.formatGrowCoins(item.growCoinPrice)
        : Currency.formatPremiumSeeds(item.premiumSeedPrice);

      const canAfford = item.growCoinPrice > 0 
        ? userEconomy.grow_coins >= item.growCoinPrice
        : userEconomy.premium_seeds >= item.premiumSeedPrice;

      const affordabilityIcon = canAfford ? '✅' : '❌';
      const ageIcon = item.ageRestricted ? '🔞' : '';
      const rarityIcons = {
        'common': '⚪',
        'uncommon': '🟢',
        'rare': '🔵',
        'epic': '🟣',
        'legendary': '🟠'
      };

      embed.addFields({
        name: `${item.emoji} ${item.name} ${ageIcon}`,
        value: `${item.description}\n**Price:** ${price} ${affordabilityIcon}\n**Rarity:** ${rarityIcons[item.rarity] || '⚪'} ${item.rarity}`,
        inline: false
      });
    });

    embed.setFooter({
      text: 'GrowmiesNJ Shop • Select an item below to purchase',
      iconURL: 'https://cdn.discordapp.com/emojis/🏪.png'
    })
    .setTimestamp();

    return embed;
  },

  /**
   * Create shop navigation and purchase components
   */
  createShopComponents(userId, category, page, totalPages, items) {
    const components = [];

    // Category selection dropdown
    const categorySelect = new ActionRowBuilder()
      .addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`shop_category_${userId}`)
          .setPlaceholder('🏷️ Choose a category')
          .addOptions([
            {
              label: 'All Items',
              value: 'all',
              emoji: '🛍️',
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

    // Item purchase dropdown
    if (items.length > 0) {
      const itemSelect = new ActionRowBuilder()
        .addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(`shop_purchase_${userId}`)
            .setPlaceholder('🛒 Select an item to purchase')
            .addOptions(
              items.map(item => ({
                label: item.name,
                value: item.id,
                description: `${item.growCoinPrice > 0 ? `${item.growCoinPrice} GrowCoins` : `${item.premiumSeedPrice} Premium Seeds`}`,
                emoji: item.emoji
              }))
            )
        );

      components.push(itemSelect);
    }

    // Navigation buttons
    const navButtons = new ActionRowBuilder();
    
    if (page > 1) {
      navButtons.addComponents(
        new ButtonBuilder()
          .setCustomId(`shop_prev_${userId}_${category}`)
          .setLabel('⬅️ Previous')
          .setStyle(ButtonStyle.Secondary)
      );
    }

    if (page < totalPages) {
      navButtons.addComponents(
        new ButtonBuilder()
          .setCustomId(`shop_next_${userId}_${category}`)
          .setLabel('Next ➡️')
          .setStyle(ButtonStyle.Secondary)
      );
    }

    navButtons.addComponents(
      new ButtonBuilder()
        .setCustomId(`shop_balance_${userId}`)
        .setLabel('💰 Balance')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`shop_inventory_${userId}`)
        .setLabel('🎒 Inventory')
        .setStyle(ButtonStyle.Secondary)
    );

    if (navButtons.components.length > 0) {
      components.push(navButtons);
    }

    return components;
  }
};