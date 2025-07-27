/**
 * EconomyItem Model for GrowmiesNJ Discord Bot
 * 
 * Shop items and virtual goods for the cannabis community economy system
 * Handles profile decorations, cannabis collectibles, and utility items
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../connection');

/**
 * EconomyItem model for shop items and virtual goods
 * Supports cannabis-themed items with age verification requirements
 */
class EconomyItem extends Model {
  /**
   * Check if item is available for purchase
   * @param {Object} user - User object with verification status
   * @returns {boolean} - True if item can be purchased
   */
  isAvailableForUser(user) {
    if (!this.is_active) return false;
    if (this.requires_21_plus && !user.is_21_plus) return false;
    if (this.limited_quantity && this.quantity_remaining <= 0) return false;
    
    // Check availability window
    if (this.available_from && new Date() < this.available_from) return false;
    if (this.available_until && new Date() > this.available_until) return false;
    
    return true;
  }

  /**
   * Get item rarity information
   * @returns {Object} - Rarity details
   */
  getRarityInfo() {
    const rarityConfig = {
      common: { color: '#95a5a6', multiplier: 1 },
      uncommon: { color: '#27ae60', multiplier: 1.5 },
      rare: { color: '#3498db', multiplier: 2 },
      epic: { color: '#9b59b6', multiplier: 3 },
      legendary: { color: '#f39c12', multiplier: 5 },
      mythical: { color: '#e74c3c', multiplier: 10 }
    };

    return rarityConfig[this.rarity] || rarityConfig.common;
  }

  /**
   * Calculate actual purchase price with discounts
   * @param {Object} user - User object for discount calculations
   * @returns {Object} - Price breakdown
   */
  calculatePrice(user = {}) {
    let finalPrice = this.base_price;
    let discountPercent = 0;
    let discountReasons = [];

    // Level-based discounts
    if (user.current_level >= 50) {
      discountPercent += 10;
      discountReasons.push('High Level (10%)');
    } else if (user.current_level >= 25) {
      discountPercent += 5;
      discountReasons.push('Mid Level (5%)');
    }

    // Apply current discount
    if (this.discount_percent > 0) {
      discountPercent += this.discount_percent;
      discountReasons.push(`Sale (${this.discount_percent}%)`);
    }

    // Calculate final price
    const discountAmount = Math.floor(finalPrice * (discountPercent / 100));
    finalPrice = Math.max(1, finalPrice - discountAmount);

    return {
      originalPrice: this.base_price,
      finalPrice,
      discountPercent,
      discountAmount,
      discountReasons,
      currency: this.currency_type
    };
  }

  /**
   * Get formatted item display for shop
   * @param {Object} user - User object for personalization
   * @returns {Object} - Formatted item data
   */
  getFormattedDisplay(user = {}) {
    const price = this.calculatePrice(user);
    const rarity = this.getRarityInfo();
    
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      category: this.category,
      rarity: {
        name: this.rarity,
        color: rarity.color,
        multiplier: rarity.multiplier
      },
      price,
      stock: this.limited_quantity ? this.quantity_remaining : 'Unlimited',
      requirements: {
        level: this.minimum_level,
        age21Plus: this.requires_21_plus,
        special: this.special_requirements
      },
      availability: {
        isAvailable: this.isAvailableForUser(user),
        availableFrom: this.available_from,
        availableUntil: this.available_until
      },
      metadata: this.item_metadata
    };
  }

  /**
   * Apply item effects to user
   * @param {Object} user - User object to apply effects to
   * @returns {Object} - Applied effects
   */
  async applyItemEffects(user) {
    if (!this.item_effects || Object.keys(this.item_effects).length === 0) {
      return { effects: [], message: 'No effects to apply' };
    }

    const appliedEffects = [];
    const effects = this.item_effects;

    // XP Boost effects
    if (effects.xp_multiplier) {
      appliedEffects.push({
        type: 'xp_boost',
        value: effects.xp_multiplier,
        duration: effects.duration_hours || 24
      });
    }

    // Currency bonus effects
    if (effects.currency_bonus) {
      appliedEffects.push({
        type: 'currency_bonus',
        value: effects.currency_bonus,
        duration: effects.duration_hours || 24
      });
    }

    // Special role effects
    if (effects.temporary_role_id) {
      appliedEffects.push({
        type: 'temporary_role',
        roleId: effects.temporary_role_id,
        duration: effects.duration_hours || 168 // 1 week default
      });
    }

    return {
      effects: appliedEffects,
      message: `Applied ${appliedEffects.length} effect(s) from ${this.name}`
    };
  }

  /**
   * Get items by category with filters
   * @param {string} category - Item category
   * @param {Object} filters - Additional filters
   * @returns {Promise<EconomyItem[]>} - Filtered items
   */
  static async getItemsByCategory(category, filters = {}) {
    const where = {
      category,
      is_active: true
    };

    if (filters.requiresAge21) {
      where.requires_21_plus = filters.requiresAge21;
    }

    if (filters.maxPrice) {
      where.base_price = { [sequelize.Sequelize.Op.lte]: filters.maxPrice };
    }

    if (filters.rarity) {
      where.rarity = filters.rarity;
    }

    if (filters.available) {
      const now = new Date();
      where[sequelize.Sequelize.Op.or] = [
        { available_from: null },
        { available_from: { [sequelize.Sequelize.Op.lte]: now } }
      ];
      where[sequelize.Sequelize.Op.and] = [
        {
          [sequelize.Sequelize.Op.or]: [
            { available_until: null },
            { available_until: { [sequelize.Sequelize.Op.gte]: now } }
          ]
        }
      ];
    }

    return await this.findAll({
      where,
      order: [
        ['featured', 'DESC'],
        ['base_price', 'ASC'],
        ['name', 'ASC']
      ]
    });
  }

  /**
   * Get featured items for shop display
   * @param {number} limit - Number of items to return
   * @returns {Promise<EconomyItem[]>} - Featured items
   */
  static async getFeaturedItems(limit = 5) {
    return await this.findAll({
      where: {
        is_active: true,
        featured: true
      },
      order: [
        ['created_at', 'DESC']
      ],
      limit
    });
  }

  /**
   * Search items by name or description
   * @param {string} query - Search query
   * @param {Object} filters - Additional filters
   * @returns {Promise<EconomyItem[]>} - Search results
   */
  static async searchItems(query, filters = {}) {
    const { Op } = require('sequelize');
    
    const where = {
      is_active: true,
      [Op.or]: [
        { name: { [Op.iLike]: `%${query}%` } },
        { description: { [Op.iLike]: `%${query}%` } },
        { tags: { [Op.contains]: [query.toLowerCase()] } }
      ]
    };

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.maxPrice) {
      where.base_price = { [Op.lte]: filters.maxPrice };
    }

    return await this.findAll({
      where,
      order: [
        ['name', 'ASC']
      ],
      limit: filters.limit || 20
    });
  }
}

/**
 * Initialize EconomyItem model with database connection
 * @param {Sequelize} sequelize - Database connection instance
 * @returns {EconomyItem} - Initialized EconomyItem model
 */
function initEconomyItemModel(sequelize) {
  EconomyItem.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: 'Unique item ID',
    },

    // Basic Item Information
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Item display name',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Item description and details',
    },
    category: {
      type: DataTypes.ENUM(
        'profile_decoration',
        'cannabis_collectible',
        'utility_item',
        'community_item',
        'seasonal_item',
        'achievement_badge',
        'consumable',
        'booster'
      ),
      allowNull: false,
      comment: 'Item category for organization',
    },
    subcategory: {
      type: DataTypes.STRING(50),
      comment: 'Item subcategory for detailed classification',
    },

    // Pricing and Currency
    base_price: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1
      },
      comment: 'Base price in the specified currency',
    },
    currency_type: {
      type: DataTypes.ENUM('grow_coins', 'premium_seeds'),
      allowNull: false,
      defaultValue: 'grow_coins',
      comment: 'Currency required for purchase',
    },
    discount_percent: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 90
      },
      comment: 'Current discount percentage (0-90%)',
    },

    // Item Properties
    rarity: {
      type: DataTypes.ENUM('common', 'uncommon', 'rare', 'epic', 'legendary', 'mythical'),
      allowNull: false,
      defaultValue: 'common',
      comment: 'Item rarity affecting price and availability',
    },
    item_type: {
      type: DataTypes.ENUM('permanent', 'consumable', 'temporary', 'booster'),
      allowNull: false,
      defaultValue: 'permanent',
      comment: 'How the item functions when used',
    },
    stackable: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether multiple copies can be owned',
    },
    max_stack_size: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      validate: {
        min: 1
      },
      comment: 'Maximum number that can be owned if stackable',
    },

    // Availability and Stock
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Whether item is available for purchase',
    },
    featured: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether item is featured in shop',
    },
    limited_quantity: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether item has limited stock',
    },
    quantity_remaining: {
      type: DataTypes.INTEGER,
      comment: 'Remaining stock if limited_quantity is true',
    },
    total_quantity: {
      type: DataTypes.INTEGER,
      comment: 'Total quantity ever available',
    },

    // Time-based Availability
    available_from: {
      type: DataTypes.DATE,
      comment: 'When item becomes available for purchase',
    },
    available_until: {
      type: DataTypes.DATE,
      comment: 'When item stops being available for purchase',
    },

    // Requirements and Restrictions
    minimum_level: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      validate: {
        min: 1
      },
      comment: 'Minimum user level required to purchase',
    },
    requires_21_plus: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether item requires age verification (cannabis items)',
    },
    special_requirements: {
      type: DataTypes.TEXT,
      comment: 'Additional requirements description',
    },
    required_achievements: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
      comment: 'Achievement IDs required to purchase',
    },

    // Item Effects and Functionality
    item_effects: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Effects applied when item is used or equipped',
    },
    duration_hours: {
      type: DataTypes.INTEGER,
      comment: 'Duration in hours for temporary items',
    },
    cooldown_hours: {
      type: DataTypes.INTEGER,
      comment: 'Cooldown between uses for consumables',
    },

    // Visual and Display
    icon_url: {
      type: DataTypes.STRING(500),
      comment: 'URL to item icon image',
    },
    image_url: {
      type: DataTypes.STRING(500),
      comment: 'URL to detailed item image',
    },
    color_hex: {
      type: DataTypes.STRING(7),
      comment: 'Hex color for item display (#RRGGBB)',
    },
    emoji: {
      type: DataTypes.STRING(20),
      comment: 'Emoji representation of item',
    },

    // Cannabis Compliance
    cannabis_content: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether item contains cannabis-related content',
    },
    cannabis_education: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether item provides cannabis education',
    },
    strain_related: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether item is related to cannabis strains',
    },

    // Metadata and Admin
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
      comment: 'Tags for search and organization',
    },
    admin_notes: {
      type: DataTypes.TEXT,
      comment: 'Admin notes about this item',
    },
    item_metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Additional item metadata',
    },
    created_by_admin: {
      type: DataTypes.STRING,
      comment: 'Admin user who created this item',
    },

    // Statistics
    total_purchased: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Total number of times purchased',
    },
    total_revenue: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Total revenue generated from this item',
    },
    average_rating: {
      type: DataTypes.DECIMAL(3, 2),
      comment: 'Average user rating (1-5)',
    },
    rating_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Number of ratings received',
    },
  }, {
    sequelize,
    modelName: 'EconomyItem',
    tableName: 'economy_items',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    
    indexes: [
      // Primary performance indexes
      {
        name: 'idx_economy_items_active',
        fields: ['is_active'],
        where: { is_active: true },
        comment: 'Active items only',
      },
      {
        name: 'idx_economy_items_category',
        fields: ['category', 'is_active'],
        comment: 'Category-based filtering',
      },
      {
        name: 'idx_economy_items_featured',
        fields: ['featured', 'is_active'],
        where: { featured: true, is_active: true },
        comment: 'Featured items display',
      },

      // Price and currency indexes
      {
        name: 'idx_economy_items_price',
        fields: ['currency_type', 'base_price'],
        comment: 'Price-based sorting and filtering',
      },
      {
        name: 'idx_economy_items_rarity',
        fields: ['rarity', 'category'],
        comment: 'Rarity-based filtering',
      },

      // Cannabis compliance indexes
      {
        name: 'idx_economy_items_cannabis',
        fields: ['requires_21_plus', 'cannabis_content'],
        comment: 'Cannabis compliance filtering',
      },
      {
        name: 'idx_economy_items_21_plus',
        fields: ['requires_21_plus'],
        where: { requires_21_plus: true },
        comment: '21+ items tracking',
      },

      // Availability indexes
      {
        name: 'idx_economy_items_availability',
        fields: ['available_from', 'available_until', 'is_active'],
        comment: 'Time-based availability checks',
      },
      {
        name: 'idx_economy_items_limited',
        fields: ['limited_quantity', 'quantity_remaining'],
        where: { limited_quantity: true },
        comment: 'Limited quantity items tracking',
      },

      // Search and discovery indexes
      {
        name: 'idx_economy_items_name',
        fields: ['name'],
        comment: 'Name-based search',
      },
      {
        name: 'idx_economy_items_tags',
        fields: [sequelize.literal('tags')],
        using: 'gin',
        comment: 'Tag-based search using GIN index',
      },

      // Statistics indexes
      {
        name: 'idx_economy_items_popularity',
        fields: ['total_purchased', 'average_rating'],
        comment: 'Popularity and rating sorting',
      },
      {
        name: 'idx_economy_items_revenue',
        fields: ['total_revenue'],
        comment: 'Revenue tracking and analytics',
      },

      // Admin and management indexes
      {
        name: 'idx_economy_items_created_by',
        fields: ['created_by_admin'],
        comment: 'Admin management tracking',
      },
      {
        name: 'idx_economy_items_type',
        fields: ['item_type', 'category'],
        comment: 'Item type classification',
      },
    ],

    // Model validation rules
    validate: {
      // Ensure limited quantity items have quantity set
      limitedQuantityValidation() {
        if (this.limited_quantity && (this.quantity_remaining == null || this.total_quantity == null)) {
          throw new Error('Limited quantity items must have quantity_remaining and total_quantity set');
        }
      },

      // Validate availability dates
      availabilityDateValidation() {
        if (this.available_from && this.available_until && this.available_from >= this.available_until) {
          throw new Error('available_from must be before available_until');
        }
      },

      // Validate cannabis compliance
      cannabisComplianceValidation() {
        if ((this.cannabis_content || this.cannabis_education || this.strain_related) && !this.requires_21_plus) {
          throw new Error('Cannabis-related items must require 21+ verification');
        }
      },

      // Validate stackable items
      stackableValidation() {
        if (this.stackable && this.max_stack_size < 2) {
          throw new Error('Stackable items must have max_stack_size >= 2');
        }
      },

      // Validate color hex format
      colorHexValidation() {
        if (this.color_hex && !/^#[0-9A-Fa-f]{6}$/.test(this.color_hex)) {
          throw new Error('color_hex must be in #RRGGBB format');
        }
      },
    },

    // Model hooks for business logic
    hooks: {
      beforeCreate: async (item) => {
        // Set default metadata
        item.item_metadata = {
          created_at: new Date().toISOString(),
          version: '1.0.0',
          ...item.item_metadata
        };

        // Auto-set cannabis flags for certain categories
        if (item.category === 'cannabis_collectible') {
          item.cannabis_content = true;
          item.requires_21_plus = true;
        }

        // Set default tags based on category
        if (!item.tags || item.tags.length === 0) {
          item.tags = [item.category, item.rarity];
          if (item.cannabis_content) item.tags.push('cannabis');
          if (item.requires_21_plus) item.tags.push('21plus');
        }
      },

      beforeUpdate: async (item) => {
        // Update metadata
        if (!item.item_metadata) item.item_metadata = {};
        item.item_metadata.last_updated = new Date().toISOString();

        // Validate stock changes
        if (item.changed('quantity_remaining') && item.quantity_remaining < 0) {
          throw new Error('quantity_remaining cannot be negative');
        }
      },

      afterUpdate: async (item) => {
        // Auto-disable if out of stock
        if (item.limited_quantity && item.quantity_remaining <= 0 && item.is_active) {
          await item.update({ is_active: false }, { hooks: false });
        }
      },
    },
  });

  return EconomyItem;
}

module.exports = { EconomyItem, initEconomyItemModel };