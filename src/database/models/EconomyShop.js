/**
 * EconomyShop Model for GrowmiesNJ Discord Bot
 * 
 * Shop configuration and item availability for the cannabis community economy
 * Manages shop layouts, featured items, and cannabis-compliant item organization
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../connection');

/**
 * EconomyShop model for shop configuration and item management
 * Handles shop organization with cannabis compliance and age-gated sections
 */
class EconomyShop extends Model {
  /**
   * Check if shop section is available for user
   * @param {Object} user - User object with verification status
   * @returns {boolean} - True if section is accessible
   */
  isAvailableForUser(user) {
    if (!this.is_active) return false;
    if (this.requires_21_plus && !user.is_21_plus) return false;
    if (this.minimum_level && user.current_level < this.minimum_level) return false;
    
    // Check availability window
    if (this.available_from && new Date() < this.available_from) return false;
    if (this.available_until && new Date() > this.available_until) return false;
    
    return true;
  }

  /**
   * Get formatted shop section display
   * @param {Object} user - User object for personalization
   * @returns {Object} - Formatted shop section data
   */
  async getFormattedDisplay(user = {}) {
    const isAvailable = this.isAvailableForUser(user);
    
    return {
      id: this.id,
      name: this.shop_name,
      description: this.description,
      category: this.shop_category,
      type: this.shop_type,
      accessibility: {
        isAvailable,
        requires21Plus: this.requires_21_plus,
        minimumLevel: this.minimum_level,
        userMeetsRequirements: isAvailable
      },
      display: {
        icon: this.icon_emoji,
        color: this.color_hex,
        layout: this.layout_config,
        featured: this.is_featured
      },
      timing: {
        availableFrom: this.available_from,
        availableUntil: this.available_until,
        priority: this.display_priority
      },
      stats: {
        totalItems: this.total_items,
        featuredItems: this.featured_items_count,
        totalPurchases: this.total_purchases,
        averageRating: this.average_rating
      }
    };
  }

  /**
   * Get shop items with filters and sorting
   * @param {Object} filters - Filter options
   * @param {Object} user - User object for personalization
   * @returns {Promise<Array>} - Shop items
   */
  async getShopItems(filters = {}, user = {}) {
    if (!this.isAvailableForUser(user)) {
      throw new Error('Shop section not available for user');
    }

    const EconomyItem = require('./EconomyItem').EconomyItem;
    const where = {
      is_active: true
    };

    // Apply shop-specific filters
    if (this.item_filter_config) {
      const filterConfig = this.item_filter_config;
      
      if (filterConfig.categories) {
        where.category = { [sequelize.Sequelize.Op.in]: filterConfig.categories };
      }
      
      if (filterConfig.max_price) {
        where.base_price = { [sequelize.Sequelize.Op.lte]: filterConfig.max_price };
      }
      
      if (filterConfig.rarities) {
        where.rarity = { [sequelize.Sequelize.Op.in]: filterConfig.rarities };
      }
      
      if (filterConfig.requires_21_plus !== undefined) {
        where.requires_21_plus = filterConfig.requires_21_plus;
      }
    }

    // Apply user filters
    if (filters.category) {
      where.category = filters.category;
    }
    
    if (filters.maxPrice) {
      where.base_price = { [sequelize.Sequelize.Op.lte]: filters.maxPrice };
    }
    
    if (filters.rarity) {
      where.rarity = filters.rarity;
    }

    // Age verification filtering
    if (!user.is_21_plus) {
      where.requires_21_plus = false;
    }

    const orderBy = [];
    
    // Apply sorting from shop configuration
    if (this.sort_config) {
      const sortConfig = this.sort_config;
      if (sortConfig.primary) {
        orderBy.push([sortConfig.primary, sortConfig.primary_direction || 'ASC']);
      }
      if (sortConfig.secondary) {
        orderBy.push([sortConfig.secondary, sortConfig.secondary_direction || 'ASC']);
      }
    }
    
    // Default sorting
    if (orderBy.length === 0) {
      orderBy.push(['featured', 'DESC'], ['base_price', 'ASC']);
    }

    const items = await EconomyItem.findAll({
      where,
      order: orderBy,
      limit: filters.limit || this.items_per_page || 20,
      offset: filters.offset || 0
    });

    return items.map(item => item.getFormattedDisplay(user));
  }

  /**
   * Get shop statistics
   * @returns {Promise<Object>} - Shop statistics
   */
  async getShopStats() {
    const EconomyItem = require('./EconomyItem').EconomyItem;
    const { fn, col } = require('sequelize');

    let itemWhere = { is_active: true };
    
    // Apply shop item filters if configured
    if (this.item_filter_config && this.item_filter_config.categories) {
      itemWhere.category = { 
        [sequelize.Sequelize.Op.in]: this.item_filter_config.categories 
      };
    }

    const stats = await EconomyItem.findAll({
      where: itemWhere,
      attributes: [
        [fn('COUNT', '*'), 'total_items'],
        [fn('COUNT', sequelize.literal('CASE WHEN featured = true THEN 1 END')), 'featured_items'],
        [fn('AVG', col('base_price')), 'average_price'],
        [fn('MIN', col('base_price')), 'min_price'],
        [fn('MAX', col('base_price')), 'max_price'],
        [fn('SUM', col('total_purchased')), 'total_purchases'],
        [fn('AVG', col('average_rating')), 'average_rating']
      ],
      raw: true
    });

    const basicStats = stats[0] || {};

    // Get category breakdown
    const categoryStats = await EconomyItem.findAll({
      where: itemWhere,
      attributes: [
        'category',
        [fn('COUNT', '*'), 'count'],
        [fn('AVG', col('base_price')), 'avg_price']
      ],
      group: ['category'],
      raw: true
    });

    // Get rarity breakdown
    const rarityStats = await EconomyItem.findAll({
      where: itemWhere,
      attributes: [
        'rarity',
        [fn('COUNT', '*'), 'count'],
        [fn('AVG', col('base_price')), 'avg_price']
      ],
      group: ['rarity'],
      raw: true
    });

    return {
      totals: {
        totalItems: parseInt(basicStats.total_items) || 0,
        featuredItems: parseInt(basicStats.featured_items) || 0,
        totalPurchases: parseInt(basicStats.total_purchases) || 0,
        averagePrice: parseFloat(basicStats.average_price) || 0,
        minPrice: parseInt(basicStats.min_price) || 0,
        maxPrice: parseInt(basicStats.max_price) || 0,
        averageRating: parseFloat(basicStats.average_rating) || 0
      },
      categories: this.processStatsBreakdown(categoryStats),
      rarities: this.processStatsBreakdown(rarityStats)
    };
  }

  /**
   * Process statistics breakdown
   * @param {Array} rawStats - Raw statistics data
   * @returns {Object} - Processed statistics
   */
  processStatsBreakdown(rawStats) {
    const processed = {};
    rawStats.forEach(stat => {
      const key = stat.category || stat.rarity;
      processed[key] = {
        count: parseInt(stat.count),
        averagePrice: parseFloat(stat.avg_price) || 0
      };
    });
    return processed;
  }

  /**
   * Update shop configuration
   * @param {Object} config - New configuration
   * @returns {Promise<EconomyShop>} - Updated shop
   */
  async updateConfiguration(config) {
    const allowedFields = [
      'shop_name',
      'description',
      'is_active',
      'is_featured',
      'display_priority',
      'items_per_page',
      'layout_config',
      'item_filter_config',
      'sort_config',
      'display_config',
      'available_from',
      'available_until'
    ];

    const updateData = {};
    allowedFields.forEach(field => {
      if (config[field] !== undefined) {
        updateData[field] = config[field];
      }
    });

    if (Object.keys(updateData).length > 0) {
      updateData.shop_metadata = {
        ...this.shop_metadata,
        last_config_update: new Date().toISOString(),
        updated_fields: Object.keys(updateData)
      };

      await this.update(updateData);
    }

    return this;
  }

  /**
   * Get all active shop sections for guild
   * @param {string} guildId - Discord guild ID
   * @param {Object} user - User object for filtering
   * @returns {Promise<EconomyShop[]>} - Active shop sections
   */
  static async getActiveShops(guildId, user = {}) {
    const where = {
      guild_id: guildId,
      is_active: true
    };

    // Filter by user access if provided
    if (user.current_level) {
      where[sequelize.Sequelize.Op.or] = [
        { minimum_level: null },
        { minimum_level: { [sequelize.Sequelize.Op.lte]: user.current_level } }
      ];
    }

    if (!user.is_21_plus) {
      where.requires_21_plus = false;
    }

    // Check availability window
    const now = new Date();
    where[sequelize.Sequelize.Op.and] = [
      {
        [sequelize.Sequelize.Op.or]: [
          { available_from: null },
          { available_from: { [sequelize.Sequelize.Op.lte]: now } }
        ]
      },
      {
        [sequelize.Sequelize.Op.or]: [
          { available_until: null },
          { available_until: { [sequelize.Sequelize.Op.gte]: now } }
        ]
      }
    ];

    return await this.findAll({
      where,
      order: [
        ['display_priority', 'ASC'],
        ['is_featured', 'DESC'],
        ['shop_name', 'ASC']
      ]
    });
  }

  /**
   * Create default shop sections for a guild
   * @param {string} guildId - Discord guild ID
   * @returns {Promise<EconomyShop[]>} - Created shop sections
   */
  static async createDefaultShops(guildId) {
    const defaultShops = [
      {
        guild_id: guildId,
        shop_name: 'Profile Decorations',
        shop_type: 'category',
        shop_category: 'decorations',
        description: 'Customize your profile with badges, titles, and colors',
        icon_emoji: '🎨',
        color_hex: '#3498db',
        display_priority: 1,
        requires_21_plus: false,
        item_filter_config: {
          categories: ['profile_decoration', 'achievement_badge']
        },
        sort_config: {
          primary: 'base_price',
          primary_direction: 'ASC'
        }
      },
      {
        guild_id: guildId,
        shop_name: 'Cannabis Collectibles',
        shop_type: 'category',
        shop_category: 'cannabis',
        description: 'Premium cannabis-themed collectibles and strain cards (21+ only)',
        icon_emoji: '🌿',
        color_hex: '#27ae60',
        display_priority: 2,
        requires_21_plus: true,
        item_filter_config: {
          categories: ['cannabis_collectible'],
          requires_21_plus: true
        },
        sort_config: {
          primary: 'rarity',
          primary_direction: 'DESC',
          secondary: 'base_price',
          secondary_direction: 'ASC'
        }
      },
      {
        guild_id: guildId,
        shop_name: 'Utility Items',
        shop_type: 'category',
        shop_category: 'utilities',
        description: 'Boosters, multipliers, and helpful community tools',
        icon_emoji: '⚡',
        color_hex: '#f39c12',
        display_priority: 3,
        requires_21_plus: false,
        item_filter_config: {
          categories: ['utility_item', 'booster', 'consumable']
        },
        sort_config: {
          primary: 'featured',
          primary_direction: 'DESC',
          secondary: 'base_price',
          secondary_direction: 'ASC'
        }
      },
      {
        guild_id: guildId,
        shop_name: 'Community Items',
        shop_type: 'category',
        shop_category: 'community',
        description: 'Server perks, special roles, and community enhancements',
        icon_emoji: '🏘️',
        color_hex: '#9b59b6',
        display_priority: 4,
        requires_21_plus: false,
        item_filter_config: {
          categories: ['community_item']
        },
        sort_config: {
          primary: 'base_price',
          primary_direction: 'DESC'
        }
      },
      {
        guild_id: guildId,
        shop_name: 'Seasonal Items',
        shop_type: 'special',
        shop_category: 'seasonal',
        description: 'Limited-time items for cannabis holidays and special events',
        icon_emoji: '🎃',
        color_hex: '#e74c3c',
        display_priority: 5,
        requires_21_plus: false,
        is_featured: true,
        item_filter_config: {
          categories: ['seasonal_item']
        },
        sort_config: {
          primary: 'available_until',
          primary_direction: 'ASC',
          secondary: 'rarity',
          secondary_direction: 'DESC'
        }
      }
    ];

    const createdShops = [];
    for (const shopData of defaultShops) {
      const shop = await this.create({
        ...shopData,
        shop_metadata: {
          created_via: 'default_setup',
          created_at: new Date().toISOString()
        }
      });
      createdShops.push(shop);
    }

    return createdShops;
  }
}

/**
 * Initialize EconomyShop model with database connection
 * @param {Sequelize} sequelize - Database connection instance
 * @returns {EconomyShop} - Initialized EconomyShop model
 */
function initEconomyShopModel(sequelize) {
  EconomyShop.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: 'Unique shop section ID',
    },

    // Basic Shop Information
    guild_id: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Discord guild/server ID',
    },
    shop_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Display name for shop section',
    },
    shop_type: {
      type: DataTypes.ENUM('category', 'featured', 'special', 'event', 'limited'),
      allowNull: false,
      defaultValue: 'category',
      comment: 'Type of shop section',
    },
    shop_category: {
      type: DataTypes.STRING(50),
      comment: 'Category identifier for organization',
    },
    description: {
      type: DataTypes.TEXT,
      comment: 'Description of shop section contents',
    },

    // Display Configuration
    icon_emoji: {
      type: DataTypes.STRING(20),
      comment: 'Emoji icon for shop section',
    },
    color_hex: {
      type: DataTypes.STRING(7),
      comment: 'Hex color for shop section display (#RRGGBB)',
    },
    display_priority: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 100,
      comment: 'Display order priority (lower = higher priority)',
    },
    is_featured: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether shop section is featured prominently',
    },

    // Access Control
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Whether shop section is currently active',
    },
    requires_21_plus: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether section requires 21+ age verification',
    },
    minimum_level: {
      type: DataTypes.INTEGER,
      comment: 'Minimum user level required to access',
    },
    required_roles: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
      comment: 'Discord role IDs required for access',
    },

    // Time-based Availability
    available_from: {
      type: DataTypes.DATE,
      comment: 'When shop section becomes available',
    },
    available_until: {
      type: DataTypes.DATE,
      comment: 'When shop section stops being available',
    },

    // Layout and Configuration
    layout_config: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Layout configuration for shop display',
    },
    items_per_page: {
      type: DataTypes.INTEGER,
      defaultValue: 20,
      validate: {
        min: 5,
        max: 100
      },
      comment: 'Number of items to display per page',
    },
    
    // Item Filtering
    item_filter_config: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Configuration for filtering items in this shop',
    },
    sort_config: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Default sorting configuration for items',
    },
    display_config: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Display configuration for item presentation',
    },

    // Shop Management
    manager_user_id: {
      type: DataTypes.STRING,
      comment: 'Discord ID of shop section manager',
    },
    auto_stock_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Whether shop automatically restocks items',
    },
    notification_config: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Configuration for shop notifications',
    },

    // Statistics and Analytics
    total_items: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Total number of items in shop section',
    },
    featured_items_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Number of featured items in section',
    },
    total_purchases: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Total purchases made from this shop section',
    },
    total_revenue: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Total revenue generated by this shop section',
    },
    average_rating: {
      type: DataTypes.DECIMAL(3, 2),
      comment: 'Average rating for items in this section',
    },
    unique_customers: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Number of unique users who made purchases',
    },

    // Analytics Tracking
    daily_views: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Daily view count for analytics',
    },
    weekly_views: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Weekly view count for analytics',
    },
    last_view_reset: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      comment: 'Last time view counters were reset',
    },

    // Cannabis Compliance
    cannabis_content: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether shop section contains cannabis content',
    },
    compliance_notes: {
      type: DataTypes.TEXT,
      comment: 'Compliance notes for cannabis content',
    },
    age_verification_required: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether age verification check is enforced',
    },

    // Administrative
    admin_notes: {
      type: DataTypes.TEXT,
      comment: 'Administrative notes about shop section',
    },
    created_by_admin: {
      type: DataTypes.STRING,
      comment: 'Admin who created this shop section',
    },
    last_modified_by: {
      type: DataTypes.STRING,
      comment: 'Admin who last modified this shop section',
    },

    // Metadata
    shop_metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Additional shop section metadata',
    },
    custom_properties: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Custom properties for shop section',
    },
  }, {
    sequelize,
    modelName: 'EconomyShop',
    tableName: 'economy_shops',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    
    indexes: [
      // Primary performance indexes
      {
        name: 'idx_economy_shops_guild',
        fields: ['guild_id'],
        comment: 'Guild-based shop queries',
      },
      {
        name: 'idx_economy_shops_active',
        fields: ['is_active', 'guild_id'],
        where: { is_active: true },
        comment: 'Active shops per guild',
      },
      {
        name: 'idx_economy_shops_display_order',
        fields: ['guild_id', 'display_priority', 'is_featured'],
        comment: 'Shop display ordering',
      },

      // Access control indexes
      {
        name: 'idx_economy_shops_21_plus',
        fields: ['requires_21_plus', 'guild_id'],
        comment: 'Age-restricted shops',
      },
      {
        name: 'idx_economy_shops_level_req',
        fields: ['minimum_level'],
        comment: 'Level-restricted shops',
      },

      // Shop type and category indexes
      {
        name: 'idx_economy_shops_type',
        fields: ['shop_type', 'guild_id'],
        comment: 'Shop type filtering',
      },
      {
        name: 'idx_economy_shops_category',
        fields: ['shop_category'],
        comment: 'Shop category grouping',
      },
      {
        name: 'idx_economy_shops_featured',
        fields: ['is_featured', 'guild_id'],
        where: { is_featured: true },
        comment: 'Featured shops',
      },

      // Time-based availability
      {
        name: 'idx_economy_shops_availability',
        fields: ['available_from', 'available_until', 'is_active'],
        comment: 'Time-based shop availability',
      },

      // Cannabis compliance indexes
      {
        name: 'idx_economy_shops_cannabis',
        fields: ['cannabis_content', 'requires_21_plus'],
        comment: 'Cannabis compliance tracking',
      },
      {
        name: 'idx_economy_shops_compliance',
        fields: ['age_verification_required', 'cannabis_content'],
        comment: 'Age verification compliance',
      },

      // Analytics indexes
      {
        name: 'idx_economy_shops_stats',
        fields: ['total_purchases', 'total_revenue'],
        comment: 'Shop performance analytics',
      },
      {
        name: 'idx_economy_shops_views',
        fields: ['daily_views', 'weekly_views'],
        comment: 'Shop view analytics',
      },
      {
        name: 'idx_economy_shops_rating',
        fields: ['average_rating'],
        comment: 'Shop rating sorting',
      },

      // Management indexes
      {
        name: 'idx_economy_shops_manager',
        fields: ['manager_user_id'],
        comment: 'Shop manager tracking',
      },
      {
        name: 'idx_economy_shops_admin',
        fields: ['created_by_admin', 'last_modified_by'],
        comment: 'Administrative tracking',
      },

      // Performance indexes
      {
        name: 'idx_economy_shops_guild_active_priority',
        fields: ['guild_id', 'is_active', 'display_priority'],
        comment: 'Optimized shop listing query',
      },
    ],

    // Model validation rules
    validate: {
      // Validate color hex format
      colorHexValidation() {
        if (this.color_hex && !/^#[0-9A-Fa-f]{6}$/.test(this.color_hex)) {
          throw new Error('color_hex must be in #RRGGBB format');
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
        if (this.cannabis_content && !this.requires_21_plus) {
          throw new Error('Cannabis content shops must require 21+ verification');
        }
      },

      // Validate items per page
      itemsPerPageValidation() {
        if (this.items_per_page < 5 || this.items_per_page > 100) {
          throw new Error('items_per_page must be between 5 and 100');
        }
      },
    },

    // Model hooks for business logic
    hooks: {
      beforeCreate: async (shop) => {
        // Set default metadata
        shop.shop_metadata = {
          created_at: new Date().toISOString(),
          version: '1.0.0',
          ...shop.shop_metadata
        };

        // Auto-set cannabis compliance for cannabis categories
        if (shop.shop_category === 'cannabis' || shop.shop_name.toLowerCase().includes('cannabis')) {
          shop.cannabis_content = true;
          shop.requires_21_plus = true;
          shop.age_verification_required = true;
        }

        // Set default layout config
        if (!shop.layout_config || Object.keys(shop.layout_config).length === 0) {
          shop.layout_config = {
            display_style: 'grid',
            items_per_row: 4,
            show_prices: true,
            show_descriptions: true,
            enable_search: true,
            enable_filters: true
          };
        }

        // Set default sort config
        if (!shop.sort_config || Object.keys(shop.sort_config).length === 0) {
          shop.sort_config = {
            primary: 'featured',
            primary_direction: 'DESC',
            secondary: 'base_price',
            secondary_direction: 'ASC'
          };
        }
      },

      beforeUpdate: async (shop) => {
        // Update metadata
        if (!shop.shop_metadata) shop.shop_metadata = {};
        shop.shop_metadata.last_updated = new Date().toISOString();

        // Track who modified the shop
        if (shop.changed() && !shop.last_modified_by) {
          shop.shop_metadata.modified_fields = shop.changed();
        }
      },

      afterUpdate: async (shop) => {
        // Reset view counters if needed (weekly reset)
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        if (shop.last_view_reset < weekAgo) {
          await shop.update({
            weekly_views: 0,
            daily_views: 0,
            last_view_reset: now
          }, { hooks: false });
        }
      },
    },
  });

  return EconomyShop;
}

module.exports = { EconomyShop, initEconomyShopModel };