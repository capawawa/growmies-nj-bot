/**
 * UserInventory Model for GrowmiesNJ Discord Bot
 * 
 * User-owned items and quantities for the cannabis community economy system
 * Tracks ownership, usage, and effects of virtual items
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../connection');

/**
 * UserInventory model for tracking user-owned items
 * Handles item ownership, stacking, effects, and cannabis compliance
 */
class UserInventory extends Model {
  /**
   * Check if user can use this item
   * @param {Object} user - User object with verification status
   * @returns {boolean} - True if item can be used
   */
  canUseItem(user) {
    if (this.quantity <= 0) return false;
    if (this.is_locked) return false;
    
    // Check cooldown for consumable items
    if (this.last_used_at && this.cooldown_until && new Date() < this.cooldown_until) {
      return false;
    }
    
    // Check if item has expired
    if (this.expires_at && new Date() > this.expires_at) {
      return false;
    }
    
    return true;
  }

  /**
   * Use/consume this item
   * @param {number} quantity - Amount to use (default 1)
   * @returns {Promise<Object>} - Usage result
   */
  async useItem(quantity = 1) {
    if (!this.canUseItem()) {
      throw new Error('Item cannot be used at this time');
    }
    
    if (quantity > this.quantity) {
      throw new Error('Insufficient quantity');
    }

    // Get item details for effect processing
    const EconomyItem = require('./EconomyItem').EconomyItem;
    const item = await EconomyItem.findByPk(this.item_id);
    
    if (!item) {
      throw new Error('Item not found');
    }

    const oldQuantity = this.quantity;
    let newQuantity = oldQuantity;
    
    // Handle consumption based on item type
    if (item.item_type === 'consumable') {
      newQuantity = oldQuantity - quantity;
      this.quantity = newQuantity;
      this.times_used = (this.times_used || 0) + quantity;
      this.last_used_at = new Date();
      
      // Set cooldown if item has one
      if (item.cooldown_hours) {
        this.cooldown_until = new Date();
        this.cooldown_until.setHours(this.cooldown_until.getHours() + item.cooldown_hours);
      }
    } else if (item.item_type === 'temporary') {
      // Activate temporary item
      this.is_active = true;
      this.activated_at = new Date();
      this.last_used_at = new Date();
      
      if (item.duration_hours) {
        this.expires_at = new Date();
        this.expires_at.setHours(this.expires_at.getHours() + item.duration_hours);
      }
    }

    // Update metadata
    this.item_metadata = {
      ...this.item_metadata,
      last_used: new Date().toISOString(),
      total_uses: (this.item_metadata.total_uses || 0) + quantity
    };

    await this.save();

    return {
      success: true,
      item,
      quantityUsed: quantity,
      quantityRemaining: newQuantity,
      effects: item.item_effects || {},
      cooldownUntil: this.cooldown_until,
      expiresAt: this.expires_at
    };
  }

  /**
   * Add quantity to existing inventory item
   * @param {number} quantity - Amount to add
   * @returns {Promise<UserInventory>} - Updated inventory item
   */
  async addQuantity(quantity) {
    const EconomyItem = require('./EconomyItem').EconomyItem;
    const item = await EconomyItem.findByPk(this.item_id);
    
    if (!item || !item.stackable) {
      throw new Error('Item is not stackable');
    }
    
    const newQuantity = this.quantity + quantity;
    if (newQuantity > item.max_stack_size) {
      throw new Error(`Cannot exceed maximum stack size of ${item.max_stack_size}`);
    }
    
    this.quantity = newQuantity;
    this.total_acquired = (this.total_acquired || this.quantity) + quantity;
    
    // Update metadata
    this.item_metadata = {
      ...this.item_metadata,
      last_added: new Date().toISOString(),
      total_added: (this.item_metadata.total_added || 0) + quantity
    };
    
    await this.save();
    return this;
  }

  /**
   * Get formatted inventory item display
   * @returns {Object} - Formatted item data
   */
  async getFormattedDisplay() {
    const EconomyItem = require('./EconomyItem').EconomyItem;
    const item = await EconomyItem.findByPk(this.item_id);
    
    if (!item) {
      return {
        error: 'Item not found',
        id: this.item_id
      };
    }

    const canUse = this.canUseItem();
    const isActive = this.is_active && (!this.expires_at || new Date() < this.expires_at);
    
    return {
      inventoryId: this.id,
      item: {
        id: item.id,
        name: item.name,
        description: item.description,
        category: item.category,
        rarity: item.rarity,
        emoji: item.emoji,
        type: item.item_type
      },
      quantity: this.quantity,
      status: {
        canUse,
        isActive,
        isLocked: this.is_locked,
        onCooldown: this.cooldown_until && new Date() < this.cooldown_until
      },
      timing: {
        acquiredAt: this.acquired_at,
        lastUsed: this.last_used_at,
        cooldownUntil: this.cooldown_until,
        expiresAt: this.expires_at
      },
      usage: {
        timesUsed: this.times_used || 0,
        totalAcquired: this.total_acquired || this.quantity
      }
    };
  }

  /**
   * Get user's inventory with filters
   * @param {string} userId - Discord user ID
   * @param {string} guildId - Discord guild ID
   * @param {Object} filters - Filter options
   * @returns {Promise<UserInventory[]>} - User's inventory items
   */
  static async getUserInventory(userId, guildId, filters = {}) {
    const where = {
      user_id: userId,
      guild_id: guildId,
      quantity: {
        [sequelize.Sequelize.Op.gt]: 0
      }
    };

    // Apply filters
    if (filters.category) {
      // Need to join with EconomyItem to filter by category
      const EconomyItem = require('./EconomyItem').EconomyItem;
      return await this.findAll({
        where,
        include: [{
          model: EconomyItem,
          as: 'item',
          where: { category: filters.category },
          required: true
        }],
        order: [['acquired_at', 'DESC']]
      });
    }

    if (filters.active !== undefined) {
      where.is_active = filters.active;
    }

    if (filters.usable !== undefined && filters.usable) {
      where.quantity = { [sequelize.Sequelize.Op.gt]: 0 };
      where.is_locked = false;
      where[sequelize.Sequelize.Op.or] = [
        { cooldown_until: null },
        { cooldown_until: { [sequelize.Sequelize.Op.lt]: new Date() } }
      ];
    }

    return await this.findAll({
      where,
      order: [
        ['is_active', 'DESC'],
        ['acquired_at', 'DESC']
      ],
      limit: filters.limit || 50
    });
  }

  /**
   * Get or create inventory item for user
   * @param {string} userId - Discord user ID
   * @param {string} guildId - Discord guild ID
   * @param {string} itemId - Economy item ID
   * @param {number} quantity - Initial quantity
   * @returns {Promise<[UserInventory, boolean]>} - [inventory item, created]
   */
  static async getOrCreateInventoryItem(userId, guildId, itemId, quantity = 1) {
    const EconomyItem = require('./EconomyItem').EconomyItem;
    const item = await EconomyItem.findByPk(itemId);
    
    if (!item) {
      throw new Error('Item not found');
    }

    // Check if user already has this item
    const existing = await this.findOne({
      where: {
        user_id: userId,
        guild_id: guildId,
        item_id: itemId
      }
    });

    if (existing) {
      if (item.stackable) {
        // Add to existing stack
        await existing.addQuantity(quantity);
        return [existing, false];
      } else {
        // Non-stackable item already exists
        throw new Error('User already owns this non-stackable item');
      }
    }

    // Create new inventory item
    const inventoryItem = await this.create({
      user_id: userId,
      guild_id: guildId,
      item_id: itemId,
      quantity,
      total_acquired: quantity,
      acquired_at: new Date(),
      item_metadata: {
        initial_quantity: quantity,
        acquired_via: 'purchase', // This could be passed as parameter
        created_at: new Date().toISOString()
      }
    });

    return [inventoryItem, true];
  }

  /**
   * Get inventory statistics for a user
   * @param {string} userId - Discord user ID
   * @param {string} guildId - Discord guild ID
   * @returns {Promise<Object>} - Inventory statistics
   */
  static async getUserInventoryStats(userId, guildId) {
    const { fn, col } = require('sequelize');
    
    const stats = await this.findAll({
      where: {
        user_id: userId,
        guild_id: guildId,
        quantity: {
          [sequelize.Sequelize.Op.gt]: 0
        }
      },
      attributes: [
        [fn('COUNT', '*'), 'total_items'],
        [fn('SUM', col('quantity')), 'total_quantity'],
        [fn('SUM', col('total_acquired')), 'lifetime_acquired'],
        [fn('SUM', col('times_used')), 'total_uses'],
        [fn('COUNT', sequelize.literal('CASE WHEN is_active = true THEN 1 END')), 'active_items']
      ],
      raw: true
    });

    const basicStats = stats[0] || {};

    // Get category breakdown
    const EconomyItem = require('./EconomyItem').EconomyItem;
    const categoryStats = await this.findAll({
      where: {
        user_id: userId,
        guild_id: guildId,
        quantity: {
          [sequelize.Sequelize.Op.gt]: 0
        }
      },
      include: [{
        model: EconomyItem,
        as: 'item',
        attributes: ['category', 'rarity']
      }],
      attributes: [
        [fn('COUNT', '*'), 'count'],
        [fn('SUM', col('quantity')), 'total_quantity']
      ],
      group: ['item.category', 'item.rarity'],
      raw: true
    });

    return {
      totals: {
        uniqueItems: parseInt(basicStats.total_items) || 0,
        totalQuantity: parseInt(basicStats.total_quantity) || 0,
        lifetimeAcquired: parseInt(basicStats.lifetime_acquired) || 0,
        totalUses: parseInt(basicStats.total_uses) || 0,
        activeItems: parseInt(basicStats.active_items) || 0
      },
      categories: this.processCategoryStats(categoryStats)
    };
  }

  /**
   * Process category statistics
   * @param {Array} rawStats - Raw category statistics
   * @returns {Object} - Processed category breakdown
   */
  static processCategoryStats(rawStats) {
    const categories = {};
    const rarities = {};

    rawStats.forEach(stat => {
      const category = stat['item.category'];
      const rarity = stat['item.rarity'];
      const count = parseInt(stat.count);
      const quantity = parseInt(stat.total_quantity);

      // Category stats
      if (!categories[category]) {
        categories[category] = { count: 0, quantity: 0 };
      }
      categories[category].count += count;
      categories[category].quantity += quantity;

      // Rarity stats
      if (!rarities[rarity]) {
        rarities[rarity] = { count: 0, quantity: 0 };
      }
      rarities[rarity].count += count;
      rarities[rarity].quantity += quantity;
    });

    return { categories, rarities };
  }

  /**
   * Clean up expired items
   * @param {string} guildId - Optional guild filter
   * @returns {Promise<number>} - Number of items cleaned up
   */
  static async cleanupExpiredItems(guildId = null) {
    const where = {
      expires_at: {
        [sequelize.Sequelize.Op.lt]: new Date()
      },
      is_active: true
    };

    if (guildId) {
      where.guild_id = guildId;
    }

    const expiredItems = await this.findAll({ where });
    
    for (const item of expiredItems) {
      await item.update({
        is_active: false,
        quantity: 0,
        item_metadata: {
          ...item.item_metadata,
          expired_at: new Date().toISOString(),
          cleanup_reason: 'expired'
        }
      });
    }

    return expiredItems.length;
  }
}

/**
 * Initialize UserInventory model with database connection
 * @param {Sequelize} sequelize - Database connection instance
 * @returns {UserInventory} - Initialized UserInventory model
 */
function initUserInventoryModel(sequelize) {
  UserInventory.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: 'Unique inventory record ID',
    },

    // User and Guild Information
    user_id: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Discord user ID - item owner',
    },
    guild_id: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Discord guild/server ID',
    },
    item_id: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'Economy item ID - foreign key to economy_items',
    },

    // Quantity and Ownership
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: 0
      },
      comment: 'Current quantity owned',
    },
    total_acquired: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Total quantity ever acquired of this item',
    },
    times_used: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Number of times item has been used/consumed',
    },

    // Status and State
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether item is currently active/equipped',
    },
    is_locked: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether item is locked from use/trading',
    },
    is_favorite: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether user has marked this as favorite',
    },

    // Timing Information
    acquired_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'When item was first acquired',
    },
    last_used_at: {
      type: DataTypes.DATE,
      comment: 'Last time item was used/consumed',
    },
    activated_at: {
      type: DataTypes.DATE,
      comment: 'When item was activated (for temporary items)',
    },
    expires_at: {
      type: DataTypes.DATE,
      comment: 'When temporary item effect expires',
    },
    cooldown_until: {
      type: DataTypes.DATE,
      comment: 'When item cooldown expires',
    },

    // Acquisition Information
    acquired_from: {
      type: DataTypes.ENUM(
        'purchase',
        'gift',
        'trade',
        'reward',
        'achievement',
        'admin_grant',
        'event',
        'daily',
        'work',
        'quiz',
        'challenge'
      ),
      defaultValue: 'purchase',
      comment: 'How the item was acquired',
    },
    acquired_transaction_id: {
      type: DataTypes.UUID,
      comment: 'Transaction ID for acquisition',
    },
    gifted_by_user_id: {
      type: DataTypes.STRING,
      comment: 'User ID if item was received as gift',
    },
    traded_from_user_id: {
      type: DataTypes.STRING,
      comment: 'User ID if item was received in trade',
    },

    // Item Effects and Usage
    current_effects: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Currently active effects from this item',
    },
    usage_restrictions: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Restrictions on item usage',
    },
    custom_properties: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Custom properties for this inventory item',
    },

    // Trading and Transfer
    tradeable: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Whether item can be traded to other users',
    },
    giftable: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Whether item can be gifted to other users',
    },
    sellback_value: {
      type: DataTypes.INTEGER,
      comment: 'Value when selling back to system',
    },
    trade_offers_received: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Number of trade offers received for this item',
    },

    // Administrative
    admin_notes: {
      type: DataTypes.TEXT,
      comment: 'Administrative notes about this inventory item',
    },
    lock_reason: {
      type: DataTypes.STRING,
      comment: 'Reason why item is locked',
    },
    locked_by_admin: {
      type: DataTypes.STRING,
      comment: 'Admin who locked this item',
    },
    locked_at: {
      type: DataTypes.DATE,
      comment: 'When item was locked',
    },

    // Metadata and Tracking
    item_metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Additional metadata for this inventory item',
    },
    display_order: {
      type: DataTypes.INTEGER,
      comment: 'Custom display order in inventory',
    },
    source_metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Metadata about how item was acquired',
    },
  }, {
    sequelize,
    modelName: 'UserInventory',
    tableName: 'user_inventories',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    
    indexes: [
      // Primary performance indexes
      {
        name: 'idx_user_inventory_user_guild',
        fields: ['user_id', 'guild_id'],
        comment: 'User inventory lookup',
      },
      {
        name: 'idx_user_inventory_user_item',
        fields: ['user_id', 'guild_id', 'item_id'],
        unique: true,
        comment: 'Unique item per user per guild',
      },
      {
        name: 'idx_user_inventory_item',
        fields: ['item_id'],
        comment: 'Item-based queries',
      },

      // Quantity and status indexes
      {
        name: 'idx_user_inventory_quantity',
        fields: ['quantity'],
        where: { quantity: { [sequelize.Sequelize.Op.gt]: 0 } },
        comment: 'Items with quantity > 0',
      },
      {
        name: 'idx_user_inventory_active',
        fields: ['is_active', 'user_id', 'guild_id'],
        where: { is_active: true },
        comment: 'Active items per user',
      },
      {
        name: 'idx_user_inventory_usable',
        fields: ['user_id', 'guild_id', 'quantity', 'is_locked'],
        where: { 
          quantity: { [sequelize.Sequelize.Op.gt]: 0 },
          is_locked: false
        },
        comment: 'Usable items',
      },

      // Time-based indexes
      {
        name: 'idx_user_inventory_acquired',
        fields: ['acquired_at'],
        comment: 'Acquisition time sorting',
      },
      {
        name: 'idx_user_inventory_expires',
        fields: ['expires_at'],
        where: { expires_at: { [sequelize.Sequelize.Op.ne]: null } },
        comment: 'Expiration tracking',
      },
      {
        name: 'idx_user_inventory_cooldown',
        fields: ['cooldown_until'],
        where: { cooldown_until: { [sequelize.Sequelize.Op.ne]: null } },
        comment: 'Cooldown tracking',
      },
      {
        name: 'idx_user_inventory_last_used',
        fields: ['last_used_at'],
        comment: 'Usage activity tracking',
      },

      // Trading and transfer indexes
      {
        name: 'idx_user_inventory_tradeable',
        fields: ['tradeable', 'quantity'],
        where: { 
          tradeable: true,
          quantity: { [sequelize.Sequelize.Op.gt]: 0 }
        },
        comment: 'Tradeable items',
      },
      {
        name: 'idx_user_inventory_giftable',
        fields: ['giftable', 'quantity'],
        where: { 
          giftable: true,
          quantity: { [sequelize.Sequelize.Op.gt]: 0 }
        },
        comment: 'Giftable items',
      },
      {
        name: 'idx_user_inventory_trade_offers',
        fields: ['trade_offers_received'],
        comment: 'Items with trade interest',
      },

      // Administrative indexes
      {
        name: 'idx_user_inventory_locked',
        fields: ['is_locked', 'locked_by_admin'],
        where: { is_locked: true },
        comment: 'Locked items tracking',
      },
      {
        name: 'idx_user_inventory_acquired_from',
        fields: ['acquired_from', 'acquired_at'],
        comment: 'Acquisition source analytics',
      },

      // Favorites and display
      {
        name: 'idx_user_inventory_favorites',
        fields: ['user_id', 'guild_id', 'is_favorite'],
        where: { is_favorite: true },
        comment: 'User favorite items',
      },
      {
        name: 'idx_user_inventory_display_order',
        fields: ['user_id', 'guild_id', 'display_order'],
        comment: 'Custom inventory ordering',
      },

      // Analytics and statistics
      {
        name: 'idx_user_inventory_usage_stats',
        fields: ['times_used', 'total_acquired'],
        comment: 'Usage analytics',
      },
      {
        name: 'idx_user_inventory_guild_stats',
        fields: ['guild_id', 'acquired_from', 'acquired_at'],
        comment: 'Guild-wide inventory analytics',
      },
    ],

    // Model validation rules
    validate: {
      // Ensure quantity doesn't exceed what was acquired
      quantityValidation() {
        if (this.times_used > this.total_acquired) {
          throw new Error('times_used cannot exceed total_acquired');
        }
      },

      // Validate expiration logic
      expirationValidation() {
        if (this.expires_at && this.expires_at <= new Date() && this.is_active) {
          throw new Error('Item cannot be active if it has expired');
        }
      },

      // Validate cooldown logic
      cooldownValidation() {
        if (this.cooldown_until && this.cooldown_until <= this.last_used_at) {
          throw new Error('cooldown_until must be after last_used_at');
        }
      },

      // Validate lock reason
      lockValidation() {
        if (this.is_locked && !this.lock_reason) {
          throw new Error('Locked items must have a lock_reason');
        }
      },
    },

    // Model hooks for business logic
    hooks: {
      beforeCreate: async (inventoryItem) => {
        // Initialize metadata
        inventoryItem.item_metadata = {
          created_at: new Date().toISOString(),
          version: '1.0.0',
          ...inventoryItem.item_metadata
        };

        // Set initial total_acquired if not provided
        if (!inventoryItem.total_acquired) {
          inventoryItem.total_acquired = inventoryItem.quantity;
        }
      },

      beforeUpdate: async (inventoryItem) => {
        // Update metadata
        if (!inventoryItem.item_metadata) {
          inventoryItem.item_metadata = {};
        }
        inventoryItem.item_metadata.last_updated = new Date().toISOString();

        // Auto-deactivate expired items
        if (inventoryItem.expires_at && new Date() > inventoryItem.expires_at && inventoryItem.is_active) {
          inventoryItem.is_active = false;
          inventoryItem.item_metadata.auto_deactivated = new Date().toISOString();
        }

        // Set lock timestamp
        if (inventoryItem.changed('is_locked') && inventoryItem.is_locked) {
          inventoryItem.locked_at = new Date();
        }
      },

      afterUpdate: async (inventoryItem) => {
        // Clean up zero quantity items
        if (inventoryItem.quantity <= 0 && inventoryItem.is_active) {
          await inventoryItem.update({ is_active: false }, { hooks: false });
        }
      },
    },
  });

  return UserInventory;
}

module.exports = { UserInventory, initUserInventoryModel };