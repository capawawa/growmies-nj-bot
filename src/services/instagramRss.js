const { Client, EmbedBuilder } = require('discord.js');
const InstagramPost = require('../database/models/InstagramPost');
const crypto = require('crypto');

/**
 * Instagram RSS Service - Phase 3B Implementation
 * 
 * Processes RSS.app webhook data for Instagram feeds and automates Discord posting
 * Integrates with existing InstagramPost model and content moderation system
 * 
 * Features:
 * - RSS feed item processing and validation
 * - Content moderation for cannabis community compliance
 * - Automated Discord posting with rich embeds
 * - Rate limiting and spam prevention
 * - Analytics and health monitoring
 * 
 * @class InstagramRssService
 */
class InstagramRssService {
    constructor() {
        this.processingStats = {
            totalProcessed: 0,
            successfulPosts: 0,
            filteredContent: 0,
            failedPosts: 0,
            lastProcessed: null,
            startTime: new Date()
        };
        
        // Rate limiting for RSS feed processing
        this.rateLimitStore = new Map();
        this.maxPostsPerHour = 10; // Max posts per RSS feed per hour
        
        // Cannabis community content filters
        this.contentFilters = {
            allowedHashtags: [
                '#cannabis', '#weed', '#thc', '#cbd', '#marijuana', 
                '#growtips', '#cannabiscommunity', '#medicalmarijuana',
                '#cannabisculture', '#hemp', '#sativa', '#indica',
                '#growmies', '#cannabisnj', '#njcannabis', '#growyourown',
                '#cannabisgrower', '#cannabislife', '#cannabiseducation'
            ],
            blockedHashtags: [
                '#drugs', '#dealer', '#selling', '#forsale', '#buy',
                '#purchase', '#money', '#price', '#cost', '#payment',
                '#cash', '#venmo', '#paypal', '#delivery', '#meetup'
            ],
            spamIndicators: [
                'dm me', 'text me', 'call me', 'whatsapp', 'telegram',
                'wickr', 'snapchat', 'kik', '$', '💰', '💵', '💴'
            ]
        };
    }
    
    /**
     * Process Instagram post from RSS webhook data
     * Main entry point for webhook processing
     * 
     * @param {Object} rssItem - RSS feed item from webhook payload
     * @returns {Promise<Object>} Processing result
     */
    async processInstagramPost(rssItem) {
        try {
            this.processingStats.totalProcessed++;
            this.processingStats.lastProcessed = new Date();
            
            console.log(`[InstagramRss] Processing RSS item: ${rssItem.title || rssItem.guid}`);
            
            // Parse and validate RSS item data
            const postData = await this.parseRssItem(rssItem);
            if (!postData) {
                return { 
                    success: false, 
                    filtered: true, 
                    reason: 'Invalid RSS data format' 
                };
            }
            
            // Apply content moderation filters
            const moderationResult = await this.moderateContent(postData);
            if (moderationResult.blocked) {
                this.processingStats.filteredContent++;
                return {
                    success: false,
                    filtered: true,
                    reason: moderationResult.reason
                };
            }
            
            // Check rate limiting for this feed source
            if (!this.checkRateLimit(postData.feedSource)) {
                this.processingStats.filteredContent++;
                return {
                    success: false,
                    filtered: true,
                    reason: 'Rate limit exceeded for feed source'
                };
            }
            
            // Create or update post in database
            const instagramPost = await InstagramPost.createFromRSSData(postData);
            
            // Skip if post already exists
            if (instagramPost.posted_to_guilds.length > 0) {
                console.log(`[InstagramRss] Post ${postData.post_id} already processed`);
                return {
                    success: true,
                    filtered: false,
                    reason: 'Already processed',
                    postId: instagramPost.id
                };
            }
            
            // Attempt Discord posting if content is approved
            if (instagramPost.is_approved) {
                const discordResult = await this.postToDiscord(instagramPost);
                if (discordResult.success) {
                    this.processingStats.successfulPosts++;
                    return {
                        success: true,
                        filtered: false,
                        discordPosted: true,
                        postId: instagramPost.id,
                        messageId: discordResult.messageId
                    };
                } else {
                    console.error(`[InstagramRss] Discord posting failed for ${postData.post_id}:`, discordResult.error);
                    // Post is saved but Discord posting failed
                    return {
                        success: false,
                        filtered: false,
                        discordPosted: false,
                        postId: instagramPost.id,
                        error: discordResult.error
                    };
                }
            } else {
                // Post saved but requires manual approval
                console.log(`[InstagramRss] Post ${postData.post_id} requires manual approval`);
                return {
                    success: true,
                    filtered: false,
                    discordPosted: false,
                    requiresApproval: true,
                    postId: instagramPost.id
                };
            }
            
        } catch (error) {
            this.processingStats.failedPosts++;
            console.error('[InstagramRss] Error processing Instagram post:', error);
            return {
                success: false,
                filtered: false,
                error: error.message
            };
        }
    }
    
    /**
     * Parse RSS feed item into standardized format
     * Handles various RSS feed formats and extracts relevant data
     * 
     * @param {Object} rssItem - Raw RSS item from webhook
     * @returns {Promise<Object|null>} Parsed post data or null if invalid
     */
    async parseRssItem(rssItem) {
        try {
            // Basic validation
            if (!rssItem.title && !rssItem.description) {
                console.warn('[InstagramRss] RSS item missing title and description');
                return null;
            }
            
            if (!rssItem.link && !rssItem.guid) {
                console.warn('[InstagramRss] RSS item missing link and guid');
                return null;
            }
            
            // Extract Instagram post ID from URL or GUID
            const postId = this.extractInstagramPostId(rssItem.link || rssItem.guid);
            if (!postId) {
                console.warn('[InstagramRss] Could not extract Instagram post ID');
                return null;
            }
            
            // Extract image URLs from enclosures or description
            const imageUrls = this.extractImageUrls(rssItem);
            
            // Clean and prepare caption
            const caption = this.cleanCaption(rssItem.title || rssItem.description || '');
            
            // Parse publication date
            const publishedAt = rssItem.pubDate ? new Date(rssItem.pubDate) : new Date();
            
            return {
                post_id: postId,
                url: rssItem.link || rssItem.guid,
                caption: caption,
                image_urls: imageUrls,
                published_at: publishedAt,
                feedSource: 'rss_app_webhook',
                engagement: {
                    source: 'rss',
                    fetched_at: new Date()
                }
            };
        } catch (error) {
            console.error('[InstagramRss] Error parsing RSS item:', error);
            return null;
        }
    }
    
    /**
     * Extract Instagram post ID from URL
     * Handles various Instagram URL formats
     * 
     * @param {string} url - Instagram URL
     * @returns {string|null} Post ID or null if not found
     */
    extractInstagramPostId(url) {
        if (!url || typeof url !== 'string') return null;
        
        // Match Instagram post URL patterns
        const patterns = [
            /instagram\.com\/p\/([A-Za-z0-9_-]+)/,
            /instagram\.com\/reel\/([A-Za-z0-9_-]+)/,
            /instagram\.com\/tv\/([A-Za-z0-9_-]+)/
        ];
        
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) {
                return match[1];
            }
        }
        
        // Fallback: generate ID from URL hash
        return crypto.createHash('md5').update(url).digest('hex').substring(0, 11);
    }
    
    /**
     * Extract image URLs from RSS item
     * Handles enclosures, media tags, and embedded images
     * 
     * @param {Object} rssItem - RSS item
     * @returns {string[]} Array of image URLs
     */
    extractImageUrls(rssItem) {
        const imageUrls = [];
        
        // Check enclosures for images
        if (rssItem.enclosure && rssItem.enclosure.url) {
            if (rssItem.enclosure.type && rssItem.enclosure.type.startsWith('image/')) {
                imageUrls.push(rssItem.enclosure.url);
            }
        }
        
        // Check for media:content or media:thumbnail
        if (rssItem['media:content']) {
            imageUrls.push(rssItem['media:content'].url);
        }
        if (rssItem['media:thumbnail']) {
            imageUrls.push(rssItem['media:thumbnail'].url);
        }
        
        // Extract images from description HTML
        if (rssItem.description) {
            const imgRegex = /<img[^>]+src="([^">]+)"/gi;
            let match;
            while ((match = imgRegex.exec(rssItem.description)) !== null) {
                imageUrls.push(match[1]);
            }
        }
        
        // Remove duplicates and filter valid URLs
        return [...new Set(imageUrls)].filter(url => 
            url && typeof url === 'string' && url.startsWith('http')
        );
    }
    
    /**
     * Clean and normalize caption text
     * Removes HTML tags and normalizes whitespace
     * 
     * @param {string} rawCaption - Raw caption text
     * @returns {string} Cleaned caption
     */
    cleanCaption(rawCaption) {
        if (!rawCaption) return '';
        
        return rawCaption
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/&amp;/g, '&')   // Decode entities
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/\s+/g, ' ')     // Normalize whitespace
            .trim()
            .substring(0, 2000);      // Limit length
    }
    
    /**
     * Apply content moderation filters
     * Cannabis community appropriate content filtering
     * 
     * @param {Object} postData - Parsed post data
     * @returns {Promise<Object>} Moderation result
     */
    async moderateContent(postData) {
        try {
            const { caption, image_urls } = postData;
            const captionLower = caption.toLowerCase();
            
            // Extract hashtags from caption
            const hashtags = this.extractHashtags(caption);
            
            // Check for blocked hashtags
            const blockedHashtag = hashtags.find(tag => 
                this.contentFilters.blockedHashtags.some(blocked => 
                    tag.toLowerCase().includes(blocked.replace('#', ''))
                )
            );
            
            if (blockedHashtag) {
                return {
                    blocked: true,
                    reason: `Contains blocked hashtag: ${blockedHashtag}`,
                    severity: 'high'
                };
            }
            
            // Check for spam indicators
            const spamIndicator = this.contentFilters.spamIndicators.find(indicator =>
                captionLower.includes(indicator.toLowerCase())
            );
            
            if (spamIndicator) {
                return {
                    blocked: true,
                    reason: `Contains spam indicator: ${spamIndicator}`,
                    severity: 'medium'
                };
            }
            
            // Check hashtag count (spam indicator)
            if (hashtags.length > 15) {
                return {
                    blocked: true,
                    reason: `Excessive hashtags: ${hashtags.length}`,
                    severity: 'medium'
                };
            }
            
            // Check for excessive caps (spam indicator)
            const capsRatio = (caption.match(/[A-Z]/g) || []).length / caption.length;
            if (capsRatio > 0.5 && caption.length > 20) {
                return {
                    blocked: true,
                    reason: 'Excessive capital letters',
                    severity: 'low'
                };
            }
            
            // Require at least one image for auto-approval
            if (image_urls.length === 0) {
                return {
                    blocked: false,
                    requiresReview: true,
                    reason: 'No images found',
                    severity: 'low'
                };
            }
            
            // Content passed all filters
            return {
                blocked: false,
                reason: 'Content approved by filters',
                hashtags: hashtags,
                severity: 'none'
            };
            
        } catch (error) {
            console.error('[InstagramRss] Error in content moderation:', error);
            return {
                blocked: true,
                reason: 'Moderation system error',
                severity: 'high'
            };
        }
    }
    
    /**
     * Extract hashtags from caption text
     * @param {string} caption - Post caption
     * @returns {string[]} Array of hashtags
     */
    extractHashtags(caption) {
        if (!caption) return [];
        
        const hashtagRegex = /#[a-zA-Z0-9_]+/g;
        const matches = caption.match(hashtagRegex);
        return matches ? [...new Set(matches)] : [];
    }
    
    /**
     * Check rate limiting for feed source
     * Prevents spam from individual RSS feeds
     * 
     * @param {string} feedSource - Source identifier
     * @returns {boolean} True if within rate limits
     */
    checkRateLimit(feedSource) {
        const now = Date.now();
        const windowMs = 60 * 60 * 1000; // 1 hour
        
        // Clean old entries
        for (const [source, data] of this.rateLimitStore.entries()) {
            if (now - data.resetTime > windowMs) {
                this.rateLimitStore.delete(source);
            }
        }
        
        const sourceData = this.rateLimitStore.get(feedSource) || { 
            count: 0, 
            resetTime: now 
        };
        
        if (now - sourceData.resetTime > windowMs) {
            sourceData.count = 1;
            sourceData.resetTime = now;
        } else {
            sourceData.count++;
        }
        
        this.rateLimitStore.set(feedSource, sourceData);
        
        return sourceData.count <= this.maxPostsPerHour;
    }
    
    /**
     * Set Discord client for the service
     * @param {Client} discordClient - Discord.js client instance
     */
    setDiscordClient(discordClient) {
        this.discordClient = discordClient;
    }

    /**
     * Post Instagram content to Discord
     * Creates rich embeds and handles Discord API integration
     *
     * @param {InstagramPost} instagramPost - Database post instance
     * @returns {Promise<Object>} Discord posting result
     */
    async postToDiscord(instagramPost) {
        try {
            const channelId = process.env.INSTAGRAM_CHANNEL_ID;
            if (!channelId) {
                throw new Error('INSTAGRAM_CHANNEL_ID not configured');
            }
            
            // Check if Discord client is available and ready
            if (!this.discordClient || !this.discordClient.isReady()) {
                throw new Error('Discord client not ready or not set');
            }
            
            const channel = await this.discordClient.channels.fetch(channelId);
            if (!channel) {
                throw new Error(`Discord channel ${channelId} not found`);
            }
            
            // Create Instagram-branded embed
            const embed = new EmbedBuilder()
                .setColor(0xE1306C) // Instagram brand color
                .setTitle('📸 New Instagram Post')
                .setURL(instagramPost.instagram_url)
                .setDescription(
                    instagramPost.caption.length > 2000 
                        ? instagramPost.caption.substring(0, 1997) + '...'
                        : instagramPost.caption
                )
                .setTimestamp(instagramPost.published_at)
                .setFooter({ text: 'GrowmiesNJ Instagram Feed' });
            
            // Add main image
            if (instagramPost.image_urls.length > 0) {
                embed.setImage(instagramPost.image_urls[0]);
            }
            
            // Add content warnings as fields
            if (instagramPost.content_warnings.length > 0) {
                embed.addFields({
                    name: '⚠️ Content Warnings',
                    value: instagramPost.content_warnings.join(', '),
                    inline: true
                });
            }
            
            // Send message
            const message = await channel.send({ embeds: [embed] });
            
            // Mark as posted in database
            await instagramPost.markAsPosted(channel.guild.id, message.id);
            
            console.log(`[InstagramRss] Posted to Discord: ${instagramPost.post_id} -> ${message.id}`);
            
            return {
                success: true,
                messageId: message.id,
                channelId: channel.id,
                guildId: channel.guild.id
            };
            
        } catch (error) {
            console.error('[InstagramRss] Discord posting error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Get processing statistics
     * @returns {Promise<Object>} Current processing stats
     */
    async getProcessingStats() {
        try {
            // Get database stats
            const dbStats = await InstagramPost.getPostingStats();
            
            // Calculate uptime
            const uptimeMs = Date.now() - this.processingStats.startTime.getTime();
            const uptimeHours = (uptimeMs / (1000 * 60 * 60)).toFixed(1);
            
            // Calculate success rate
            const totalAttempts = this.processingStats.successfulPosts + this.processingStats.failedPosts;
            const successRate = totalAttempts > 0 
                ? ((this.processingStats.successfulPosts / totalAttempts) * 100).toFixed(1)
                : 0;
            
            return {
                service: 'Instagram RSS Processing',
                runtime: {
                    uptime_hours: uptimeHours,
                    last_processed: this.processingStats.lastProcessed,
                    total_processed: this.processingStats.totalProcessed
                },
                processing: {
                    successful_posts: this.processingStats.successfulPosts,
                    filtered_content: this.processingStats.filteredContent,
                    failed_posts: this.processingStats.failedPosts,
                    success_rate: `${successRate}%`
                },
                database: dbStats,
                rate_limiting: {
                    active_sources: this.rateLimitStore.size,
                    max_posts_per_hour: this.maxPostsPerHour
                }
            };
        } catch (error) {
            console.error('[InstagramRss] Error getting processing stats:', error);
            return {
                error: 'Failed to retrieve statistics'
            };
        }
    }
    
    /**
     * Health check for the service
     * @returns {Promise<Object>} Service health status
     */
    async healthCheck() {
        try {
            // Check database connectivity
            await InstagramPost.findOne({ limit: 1 });
            
            // Check Discord client
            const discordReady = this.discordClient && this.discordClient.isReady();
            
            // Check environment configuration
            const configValid = Boolean(
                process.env.INSTAGRAM_CHANNEL_ID &&
                process.env.INSTAGRAM_WEBHOOK_SECRET
            );
            
            const isHealthy = discordReady && configValid;
            
            return {
                status: isHealthy ? 'healthy' : 'degraded',
                checks: {
                    database: 'healthy',
                    discord: discordReady ? 'healthy' : 'unavailable',
                    configuration: configValid ? 'healthy' : 'missing'
                },
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('[InstagramRss] Health check failed:', error);
            return {
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

// Export singleton instance
module.exports = new InstagramRssService();