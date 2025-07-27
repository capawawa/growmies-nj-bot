/**
 * CannabisKnowledgeBase Model for GrowmiesNJ Discord Bot
 * 
 * LLM Chat Integration: Cannabis knowledge database for AI context
 * Stores curated cannabis information for AI-powered educational responses
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../connection');

/**
 * CannabisKnowledgeBase model for AI cannabis knowledge management
 * Handles curated cannabis information with compliance and accuracy tracking
 */
class CannabisKnowledgeBase extends Model {
  /**
   * Check if knowledge entry is active and approved
   * @returns {boolean} - True if entry is active and approved
   */
  isActiveAndApproved() {
    return this.is_active && this.approved_by_admin;
  }

  /**
   * Check if knowledge entry requires 21+ verification
   * @returns {boolean} - True if 21+ verification required
   */
  requiresAgeVerification() {
    return this.requires_21_plus;
  }

  /**
   * Get knowledge entry age in days
   * @returns {number} - Days since last verification
   */
  getDaysSinceVerification() {
    if (!this.last_verified_at) return Infinity;
    const now = new Date();
    const diffTime = now - this.last_verified_at;
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Check if knowledge entry needs reverification (older than 6 months)
   * @returns {boolean} - True if reverification needed
   */
  needsReverification() {
    return this.getDaysSinceVerification() > 180; // 6 months
  }

  /**
   * Increment usage count
   * @returns {Promise<void>}
   */
  async incrementUsage() {
    await this.increment('usage_count');
  }

  /**
   * Get knowledge entries by category
   * @param {string} category - Knowledge category
   * @param {boolean} approvedOnly - Whether to return only approved entries
   * @param {number} limit - Maximum entries to return
   * @returns {Promise<CannabisKnowledgeBase[]>} - Knowledge entries
   */
  static async getByCategory(category, approvedOnly = true, limit = 50) {
    const where = { topic_category: category };
    
    if (approvedOnly) {
      where.is_active = true;
      where.approved_by_admin = true;
    }

    return await this.findAll({
      where,
      order: [['accuracy_rating', 'DESC'], ['usage_count', 'DESC']],
      limit,
    });
  }

  /**
   * Search knowledge entries by content
   * @param {string} searchTerm - Search term
   * @param {string} category - Optional category filter
   * @param {boolean} requiresAge - Whether to include 21+ content
   * @returns {Promise<CannabisKnowledgeBase[]>} - Matching knowledge entries
   */
  static async searchKnowledge(searchTerm, category = null, requiresAge = false) {
    const { Op } = require('@sequelize/core');
    
    const where = {
      is_active: true,
      approved_by_admin: true,
      [Op.or]: [
        { topic_title: { [Op.iLike]: `%${searchTerm}%` } },
        { content_text: { [Op.iLike]: `%${searchTerm}%` } },
        { tags: { [Op.contains]: [searchTerm.toLowerCase()] } },
      ],
    };

    if (category) {
      where.topic_category = category;
    }

    if (!requiresAge) {
      where.requires_21_plus = false;
    }

    return await this.findAll({
      where,
      order: [['accuracy_rating', 'DESC'], ['usage_count', 'DESC']],
      limit: 10,
    });
  }

  /**
   * Get strain information entries
   * @param {string} strainName - Optional strain name filter
   * @returns {Promise<CannabisKnowledgeBase[]>} - Strain information entries
   */
  static async getStrainInformation(strainName = null) {
    const where = {
      topic_category: 'strains',
      is_active: true,
      approved_by_admin: true,
    };

    if (strainName) {
      const { Op } = require('@sequelize/core');
      where[Op.or] = [
        { topic_title: { [Op.iLike]: `%${strainName}%` } },
        { tags: { [Op.contains]: [strainName.toLowerCase()] } },
      ];
    }

    return await this.findAll({
      where,
      order: [['accuracy_rating', 'DESC'], ['usage_count', 'DESC']],
      limit: strainName ? 5 : 20,
    });
  }

  /**
   * Get cultivation knowledge
   * @param {string} topic - Optional cultivation topic
   * @returns {Promise<CannabisKnowledgeBase[]>} - Cultivation knowledge entries
   */
  static async getCultivationKnowledge(topic = null) {
    const where = {
      topic_category: 'cultivation',
      is_active: true,
      approved_by_admin: true,
    };

    if (topic) {
      const { Op } = require('@sequelize/core');
      where[Op.or] = [
        { topic_title: { [Op.iLike]: `%${topic}%` } },
        { content_text: { [Op.iLike]: `%${topic}%` } },
        { tags: { [Op.contains]: [topic.toLowerCase()] } },
      ];
    }

    return await this.findAll({
      where,
      order: [['accuracy_rating', 'DESC'], ['usage_count', 'DESC']],
      limit: 15,
    });
  }

  /**
   * Get legal information
   * @param {string} jurisdiction - Optional jurisdiction filter (default: New Jersey)
   * @returns {Promise<CannabisKnowledgeBase[]>} - Legal information entries
   */
  static async getLegalInformation(jurisdiction = 'new jersey') {
    const { Op } = require('@sequelize/core');
    
    const where = {
      topic_category: 'legal',
      is_active: true,
      approved_by_admin: true,
      [Op.or]: [
        { content_text: { [Op.iLike]: `%${jurisdiction}%` } },
        { tags: { [Op.contains]: [jurisdiction.toLowerCase()] } },
      ],
    };

    return await this.findAll({
      where,
      order: [['last_verified_at', 'DESC'], ['accuracy_rating', 'DESC']],
      limit: 10,
    });
  }

  /**
   * Create knowledge entry
   * @param {Object} entryData - Knowledge entry data
   * @returns {Promise<CannabisKnowledgeBase>} - Created knowledge entry
   */
  static async createKnowledgeEntry(entryData) {
    const entry = await this.create({
      topic_category: entryData.category,
      topic_title: entryData.title,
      content_text: entryData.content,
      requires_21_plus: entryData.requires21Plus || true,
      source_url: entryData.sourceUrl,
      accuracy_rating: entryData.accuracyRating || 5,
      created_by_user_id: entryData.createdBy,
      approved_by_admin: entryData.approved || false,
      tags: entryData.tags || [],
    });

    console.log(`📚 Created cannabis knowledge entry: ${entryData.title}`);
    return entry;
  }

  /**
   * Update knowledge entry accuracy and verification
   * @param {string} entryId - Entry ID
   * @param {number} accuracyRating - New accuracy rating (1-10)
   * @param {string} verifiedBy - User ID who verified
   * @returns {Promise<CannabisKnowledgeBase>} - Updated entry
   */
  static async updateAccuracyAndVerification(entryId, accuracyRating, verifiedBy) {
    const entry = await this.findByPk(entryId);
    if (!entry) {
      throw new Error('Knowledge entry not found');
    }

    await entry.update({
      accuracy_rating: accuracyRating,
      last_verified_at: new Date(),
      // Could add verified_by field if needed
    });

    return entry;
  }

  /**
   * Get knowledge statistics by category
   * @returns {Promise<Object>} - Knowledge statistics
   */
  static async getKnowledgeStats() {
    const { fn, col } = require('@sequelize/core');
    
    const stats = await this.findAll({
      attributes: [
        'topic_category',
        [fn('COUNT', '*'), 'total_entries'],
        [fn('SUM', 
          sequelize.literal(`CASE WHEN approved_by_admin THEN 1 ELSE 0 END`)
        ), 'approved_entries'],
        [fn('SUM', 
          sequelize.literal(`CASE WHEN requires_21_plus THEN 1 ELSE 0 END`)
        ), 'age_restricted_entries'],
        [fn('AVG', col('accuracy_rating')), 'avg_accuracy'],
        [fn('SUM', col('usage_count')), 'total_usage'],
      ],
      group: ['topic_category'],
      raw: true,
    });

    return stats.reduce((acc, stat) => {
      acc[stat.topic_category] = {
        totalEntries: parseInt(stat.total_entries),
        approvedEntries: parseInt(stat.approved_entries) || 0,
        ageRestrictedEntries: parseInt(stat.age_restricted_entries) || 0,
        avgAccuracy: parseFloat(stat.avg_accuracy) || 0,
        totalUsage: parseInt(stat.total_usage) || 0,
      };
      return acc;
    }, {});
  }

  /**
   * Get entries needing reverification
   * @param {number} daysOld - Days since last verification (default: 180)
   * @returns {Promise<CannabisKnowledgeBase[]>} - Entries needing reverification
   */
  static async getEntriesNeedingReverification(daysOld = 180) {
    const { Op } = require('@sequelize/core');
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    return await this.findAll({
      where: {
        is_active: true,
        approved_by_admin: true,
        [Op.or]: [
          { last_verified_at: { [Op.lt]: cutoffDate } },
          { last_verified_at: { [Op.is]: null } },
        ],
      },
      order: [['last_verified_at', 'ASC']],
      limit: 50,
    });
  }

  /**
   * Seed initial cannabis knowledge base
   * @returns {Promise<number>} - Number of entries created
   */
  static async seedKnowledgeBase() {
    const seedData = [
      // Strain Information
      {
        category: 'strains',
        title: 'Cannabis Strain Classifications',
        content: 'Cannabis strains are typically classified into three main categories: Indica, Sativa, and Hybrid. Indica strains are generally associated with relaxing effects, Sativa strains with energizing effects, and Hybrids combine characteristics of both.',
        requires21Plus: true,
        accuracyRating: 8,
        approved: true,
        tags: ['indica', 'sativa', 'hybrid', 'classification', 'effects'],
      },
      
      // Cultivation Information
      {
        category: 'cultivation',
        title: 'Basic Cannabis Growing Requirements',
        content: 'Cannabis plants require proper lighting (12+ hours for vegetative growth), appropriate pH levels (6.0-7.0 for soil), adequate ventilation, and consistent watering. Temperature should be maintained between 65-75°F during the day.',
        requires21Plus: true,
        accuracyRating: 9,
        approved: true,
        tags: ['growing', 'lighting', 'ph', 'temperature', 'basics'],
      },
      
      // Legal Information
      {
        category: 'legal',
        title: 'New Jersey Cannabis Laws Overview',
        content: 'In New Jersey, adults 21 and older can legally possess up to 6 ounces of cannabis and grow up to 6 plants for personal use. Public consumption is prohibited, and driving under the influence remains illegal.',
        requires21Plus: false, // Legal info can be educational for 18+
        accuracyRating: 9,
        approved: true,
        tags: ['new jersey', 'legal', 'possession', 'cultivation', 'limits'],
      },
      
      // Medical Information
      {
        category: 'medical',
        title: 'Common Cannabinoids and Their Properties',
        content: 'THC (tetrahydrocannabinol) is the primary psychoactive compound in cannabis. CBD (cannabidiol) is non-psychoactive and may have therapeutic properties. Other cannabinoids include CBG, CBN, and CBC, each with unique characteristics.',
        requires21Plus: true,
        accuracyRating: 8,
        approved: true,
        tags: ['thc', 'cbd', 'cannabinoids', 'medical', 'therapeutic'],
      },
      
      // Safety Information
      {
        category: 'safety',
        title: 'Cannabis Consumption Safety Guidelines',
        content: 'Start with low doses, especially with edibles. Effects can take 30 minutes to 2 hours to appear. Never drive under the influence. Store cannabis products safely away from children and pets. Be aware of potential drug interactions.',
        requires21Plus: true,
        accuracyRating: 10,
        approved: true,
        tags: ['safety', 'dosage', 'edibles', 'storage', 'responsibility'],
      },
    ];

    let createdCount = 0;
    for (const data of seedData) {
      try {
        const existing = await this.findOne({
          where: { topic_title: data.title },
        });

        if (!existing) {
          await this.createKnowledgeEntry(data);
          createdCount++;
        }
      } catch (error) {
        console.error(`Error seeding knowledge entry "${data.title}":`, error.message);
      }
    }

    console.log(`📚 Seeded ${createdCount} cannabis knowledge entries`);
    return createdCount;
  }
}

/**
 * Initialize CannabisKnowledgeBase model with database connection
 * @param {Sequelize} sequelize - Database connection instance
 * @returns {CannabisKnowledgeBase} - Initialized CannabisKnowledgeBase model
 */
function initCannabisKnowledgeBaseModel(sequelize) {
  CannabisKnowledgeBase.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: 'Unique knowledge entry ID',
    },
    topic_category: {
      type: DataTypes.ENUM('strains', 'cultivation', 'legal', 'medical', 'consumption', 'safety'),
      allowNull: false,
      comment: 'Category of cannabis knowledge',
    },
    topic_title: {
      type: DataTypes.STRING(200),
      allowNull: false,
      comment: 'Title of the knowledge entry',
    },
    content_text: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Detailed knowledge content',
    },
    requires_21_plus: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Whether knowledge requires 21+ age verification',
    },
    source_url: {
      type: DataTypes.STRING(500),
      comment: 'Source URL for knowledge verification',
    },
    last_verified_at: {
      type: DataTypes.DATE,
      comment: 'When knowledge was last verified for accuracy',
    },
    accuracy_rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 5,
      comment: 'Accuracy rating from 1-10',
    },
    usage_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Number of times this knowledge was accessed',
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Whether knowledge entry is active',
    },
    created_by_user_id: {
      type: DataTypes.STRING,
      comment: 'Discord ID of user who created entry',
    },
    approved_by_admin: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether entry has been approved by admin',
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
      comment: 'Tags for searchability and categorization',
    },
  }, {
    sequelize,
    modelName: 'CannabisKnowledgeBase',
    tableName: 'cannabis_knowledge_base',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    
    indexes: [
      {
        name: 'idx_cannabis_knowledge_category',
        fields: ['topic_category'],
      },
      {
        name: 'idx_cannabis_knowledge_active_approved',
        fields: ['is_active', 'approved_by_admin'],
        where: { is_active: true, approved_by_admin: true },
      },
      {
        name: 'idx_cannabis_knowledge_21_plus',
        fields: ['requires_21_plus'],
      },
      {
        name: 'idx_cannabis_knowledge_accuracy',
        fields: ['accuracy_rating'],
      },
      {
        name: 'idx_cannabis_knowledge_usage',
        fields: ['usage_count'],
      },
      {
        name: 'idx_cannabis_knowledge_title',
        fields: ['topic_title'],
      },
      {
        name: 'idx_cannabis_knowledge_tags',
        fields: ['tags'],
        using: 'gin',
      },
      {
        name: 'idx_cannabis_knowledge_verified',
        fields: ['last_verified_at'],
      },
      {
        name: 'idx_cannabis_knowledge_category_rating',
        fields: ['topic_category', 'accuracy_rating', 'usage_count'],
      },
      {
        name: 'idx_cannabis_knowledge_search',
        fields: ['topic_category', 'is_active', 'approved_by_admin', 'accuracy_rating'],
      },
    ],

    // Model validation rules
    validate: {
      // Ensure accuracy rating is within valid range
      accuracyRatingValidation() {
        if (this.accuracy_rating < 1 || this.accuracy_rating > 10) {
          throw new Error('Accuracy rating must be between 1 and 10');
        }
      },

      // Ensure content is substantial
      contentLengthValidation() {
        if (this.content_text.length < 50) {
          throw new Error('Knowledge content must be at least 50 characters');
        }
      },

      // Ensure usage count is not negative
      usageCountValidation() {
        if (this.usage_count < 0) {
          throw new Error('Usage count cannot be negative');
        }
      },
    },

    // Model hooks for business logic
    hooks: {
      beforeCreate: async (entry) => {
        // Set last_verified_at for new approved entries
        if (entry.approved_by_admin) {
          entry.last_verified_at = new Date();
        }

        // Normalize tags to lowercase
        if (entry.tags && entry.tags.length > 0) {
          entry.tags = entry.tags.map(tag => tag.toLowerCase().trim());
        }
      },

      beforeUpdate: async (entry) => {
        // Update last_verified_at when accuracy rating changes
        if (entry.changed('accuracy_rating')) {
          entry.last_verified_at = new Date();
        }

        // Normalize tags if they changed
        if (entry.changed('tags') && entry.tags && entry.tags.length > 0) {
          entry.tags = entry.tags.map(tag => tag.toLowerCase().trim());
        }
      },
    },
  });

  return CannabisKnowledgeBase;
}

module.exports = { CannabisKnowledgeBase, initCannabisKnowledgeBaseModel };