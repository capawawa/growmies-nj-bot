const { DataTypes, Model, Op } = require('sequelize');
const { sequelize } = require('../connection');

/**
 * InstagramPost Model - RSS feed integration for social media content
 * 
 * Manages Instagram posts fetched via RSS for GrowmiesNJ cannabis community:
 * - Stores post metadata and media content
 * - Tracks posting status to Discord guilds
 * - Prevents duplicate content distribution
 * - Content moderation for cannabis compliance
 * 
 * Cannabis Industry Compliance:
 * - Content approval workflow for legal oversight
 * - Age-appropriate content validation
 * - Engagement tracking for community metrics
 * - Data retention and cleanup policies
 * 
 * Phase 3B Integration:
 * - RSS feed parsing and storage
 * - Multi-guild distribution management
 * - Content filtering and moderation
 * 
 * @class InstagramPost
 * @extends {Model}
 */
class InstagramPost extends Model {
  /**
   * Find posts that haven't been posted to a specific guild
   * 
   * @param {string} guildId - Discord guild ID
   * @param {number} limit - Maximum number of posts to return
   * @param {boolean} approvedOnly - Only return approved posts
   * @returns {Promise<InstagramPost[]>} Array of unposted posts
   */
  static async findUnpostedForGuild(guildId, limit = 10, approvedOnly = true) {
    try {
      const whereClause = {
        [Op.not]: {
          posted_to_guilds: {
            [Op.contains]: [guildId]
          }
        }
      };

      if (approvedOnly) {
        whereClause.is_approved = true;
      }

      const posts = await this.findAll({
        where: whereClause,
        order: [['published_at', 'DESC']],
        limit: limit
      });

      return posts;
    } catch (error) {
      console.error(`[InstagramPost] Error finding unposted posts for guild ${guildId}:`, error);
      throw error;
    }
  }

  /**
   * Create post from RSS feed data
   * 
   * @param {Object} rssData - RSS feed item data
   * @returns {Promise<InstagramPost>} Created post instance
   */
  static async createFromRSSData(rssData) {
    try {
      const {
        post_id,
        url,
        caption,
        image_urls = [],
        published_at,
        engagement = {}
      } = rssData;

      // Generate content hash for duplicate detection
      const contentHash = require('crypto')
        .createHash('sha256')
        .update(`${post_id}-${caption || ''}-${JSON.stringify(image_urls)}`)
        .digest('hex');

      // Check for existing post
      const existingPost = await this.findOne({
        where: {
          [Op.or]: [
            { post_id: post_id },
            { content_hash: contentHash }
          ]
        }
      });

      if (existingPost) {
        console.log(`[InstagramPost] Post ${post_id} already exists, skipping`);
        return existingPost;
      }

      // Auto-approve content that passes basic filters
      const isApproved = this.autoApproveContent(caption, image_urls);
      const contentWarnings = this.analyzeContentWarnings(caption);

      const post = await this.create({
        post_id,
        instagram_url: url,
        caption: caption || '',
        image_urls,
        published_at: new Date(published_at),
        engagement_data: engagement,
        is_approved: isApproved,
        content_warnings: contentWarnings,
        content_hash: contentHash,
        moderation_notes: isApproved ? 'Auto-approved by content filter' : 'Requires manual review'
      });

      console.log(`[InstagramPost] Created new post ${post_id} (approved: ${isApproved})`);
      return post;
    } catch (error) {
      console.error('[InstagramPost] Error creating post from RSS data:', error);
      throw error;
    }
  }

  /**
   * Mark post as posted to a guild
   * 
   * @param {string} guildId - Discord guild ID
   * @param {string} messageId - Discord message ID (optional)
   * @returns {Promise<InstagramPost>} Updated instance
   */
  async markAsPosted(guildId, messageId = null) {
    try {
      const postedGuilds = [...this.posted_to_guilds];
      
      if (!postedGuilds.includes(guildId)) {
        postedGuilds.push(guildId);
        
        this.posted_to_guilds = postedGuilds;
        this.updated_at = new Date();
        
        // Update engagement data with Discord posting info
        const engagement = { ...this.engagement_data };
        if (!engagement.discord_posts) {
          engagement.discord_posts = {};
        }
        engagement.discord_posts[guildId] = {
          posted_at: new Date(),
          message_id: messageId
        };
        this.engagement_data = engagement;
        
        await this.save();
        
        console.log(`[InstagramPost] Marked post ${this.post_id} as posted to guild ${guildId}`);
      }
      
      return this;
    } catch (error) {
      console.error(`[InstagramPost] Error marking post ${this.post_id} as posted to guild ${guildId}:`, error);
      throw error;
    }
  }

  /**
   * Get recent posts for analytics
   * 
   * @param {number} days - Number of days to look back
   * @param {string} guildId - Optional guild ID filter
   * @returns {Promise<InstagramPost[]>} Array of recent posts
   */
  static async getRecentPosts(days = 7, guildId = null) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const whereClause = {
        published_at: {
          [Op.gte]: cutoffDate
        }
      };

      if (guildId) {
        whereClause.posted_to_guilds = {
          [Op.contains]: [guildId]
        };
      }

      const posts = await this.findAll({
        where: whereClause,
        order: [['published_at', 'DESC']]
      });

      return posts;
    } catch (error) {
      console.error('[InstagramPost] Error getting recent posts:', error);
      throw error;
    }
  }

  /**
   * Check if post has been posted to a specific guild
   * @param {string} guildId - Discord guild ID
   * @returns {boolean} True if posted to guild
   */
  isPostedToGuild(guildId) {
    return this.posted_to_guilds.includes(guildId);
  }

  /**
   * Check if post requires manual approval
   * @returns {boolean} True if requires approval
   */
  requiresApproval() {
    return this.is_approved === null || this.is_approved === false;
  }

  /**
   * Get formatted post content for Discord
   * @returns {Object} Discord embed data
   */
  getDiscordEmbed() {
    const embed = {
      title: 'New Instagram Post',
      url: this.instagram_url,
      description: this.caption ? this.caption.substring(0, 4096) : 'No caption',
      timestamp: this.published_at.toISOString(),
      color: 0xE4405F, // Instagram brand color
      footer: {
        text: 'GrowmiesNJ Instagram'
      }
    };

    // Add main image if available
    if (this.image_urls.length > 0) {
      embed.image = { url: this.image_urls[0] };
    }

    // Add content warnings if any
    if (this.content_warnings.length > 0) {
      embed.fields = [{
        name: 'Content Warnings',
        value: this.content_warnings.join(', '),
        inline: true
      }];
    }

    return embed;
  }

  /**
   * Auto-approve content based on basic filters
   * @param {string} caption - Post caption
   * @param {string[]} imageUrls - Array of image URLs
   * @returns {boolean} True if content should be auto-approved
   */
  static autoApproveContent(caption = '', imageUrls = []) {
    // Basic content filter for cannabis compliance
    const prohibitedTerms = [
      'sale', 'selling', 'buy', 'purchase', 'transaction',
      'money', 'price', 'cost', 'payment', 'cash'
    ];

    const captionLower = caption.toLowerCase();
    const hasProhibitedTerms = prohibitedTerms.some(term => 
      captionLower.includes(term)
    );

    // Auto-approve if no prohibited terms and has images
    return !hasProhibitedTerms && imageUrls.length > 0;
  }

  /**
   * Analyze content for warnings
   * @param {string} caption - Post caption
   * @returns {string[]} Array of content warnings
   */
  static analyzeContentWarnings(caption = '') {
    const warnings = [];
    const captionLower = caption.toLowerCase();

    // Cannabis-related content warnings
    if (captionLower.includes('thc') || captionLower.includes('cbd')) {
      warnings.push('cannabis_content');
    }

    if (captionLower.includes('medical') || captionLower.includes('medicine')) {
      warnings.push('medical_content');
    }

    // Commercial activity warnings
    const commercialTerms = ['sale', 'buy', 'price', 'cost', 'money'];
    if (commercialTerms.some(term => captionLower.includes(term))) {
      warnings.push('commercial_activity');
    }

    return warnings;
  }

  /**
   * Approve post for distribution
   * @param {string} moderatorId - ID of moderator approving
   * @param {string} notes - Approval notes
   * @returns {Promise<InstagramPost>} Updated instance
   */
  async approve(moderatorId, notes = '') {
    try {
      this.is_approved = true;
      this.moderation_notes = notes || `Approved by moderator ${moderatorId}`;
      this.updated_at = new Date();
      
      await this.save();
      
      console.log(`[InstagramPost] Post ${this.post_id} approved by ${moderatorId}`);
      return this;
    } catch (error) {
      console.error(`[InstagramPost] Error approving post ${this.post_id}:`, error);
      throw error;
    }
  }

  /**
   * Reject post from distribution
   * @param {string} moderatorId - ID of moderator rejecting
   * @param {string} reason - Rejection reason
   * @returns {Promise<InstagramPost>} Updated instance
   */
  async reject(moderatorId, reason = '') {
    try {
      this.is_approved = false;
      this.moderation_notes = reason || `Rejected by moderator ${moderatorId}`;
      this.updated_at = new Date();
      
      await this.save();
      
      console.log(`[InstagramPost] Post ${this.post_id} rejected by ${moderatorId}`);
      return this;
    } catch (error) {
      console.error(`[InstagramPost] Error rejecting post ${this.post_id}:`, error);
      throw error;
    }
  }

  /**
   * Clean up old posts beyond retention period
   * @param {number} retentionDays - Days to keep posts
   * @returns {Promise<number>} Number of posts deleted
   */
  static async cleanupOldPosts(retentionDays = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const deletedCount = await this.destroy({
        where: {
          created_at: {
            [Op.lt]: cutoffDate
          }
        }
      });

      console.log(`[InstagramPost] Cleaned up ${deletedCount} old posts beyond ${retentionDays} days`);
      return deletedCount;
    } catch (error) {
      console.error('[InstagramPost] Error cleaning up old posts:', error);
      throw error;
    }
  }

  /**
   * Get posting statistics
   * @param {string} guildId - Optional guild ID filter
   * @returns {Promise<Object>} Statistics object
   */
  static async getPostingStats(guildId = null) {
    try {
      const totalPosts = await this.count();
      const approvedPosts = await this.count({
        where: { is_approved: true }
      });
      const pendingPosts = await this.count({
        where: { is_approved: null }
      });

      let guildSpecificStats = {};
      if (guildId) {
        const guildPosts = await this.count({
          where: {
            posted_to_guilds: {
              [Op.contains]: [guildId]
            }
          }
        });
        guildSpecificStats = { guild_posts: guildPosts };
      }

      return {
        total_posts: totalPosts,
        approved_posts: approvedPosts,
        pending_posts: pendingPosts,
        approval_rate: totalPosts > 0 ? (approvedPosts / totalPosts * 100).toFixed(1) : 0,
        ...guildSpecificStats
      };
    } catch (error) {
      console.error('[InstagramPost] Error getting posting stats:', error);
      throw error;
    }
  }
}

/**
 * Initialize InstagramPost model with Sequelize
 * @param {Sequelize} sequelize - Sequelize instance
 * @returns {typeof InstagramPost} Initialized model
 */
function initInstagramPostModel(sequelize) {
  InstagramPost.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    post_id: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    instagram_url: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    caption: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    image_urls: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: []
    },
    published_at: {
      type: DataTypes.DATE,
      allowNull: false
    },
    fetched_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    posted_to_guilds: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: []
    },
    content_warnings: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: []
    },
    engagement_data: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {}
    },
    is_approved: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    moderation_notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    feed_source: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: 'instagram_rss'
    },
    content_hash: {
      type: DataTypes.STRING(64),
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    // Sequelize options
    sequelize,
    modelName: 'InstagramPost',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    tableName: 'instagram_posts',
    indexes: [
      {
        fields: ['post_id']
      },
      {
        fields: ['published_at']
      },
      {
        fields: ['fetched_at']
      },
      {
        fields: ['is_approved']
      },
      {
        fields: ['content_hash']
      }
    ]
  });

  return InstagramPost;
}

module.exports = { InstagramPost, initInstagramPostModel };