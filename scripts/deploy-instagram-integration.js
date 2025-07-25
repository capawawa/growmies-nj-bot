const { Client, GatewayIntentBits, EmbedBuilder, WebhookClient } = require('discord.js');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class InstagramIntegration {
    constructor() {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages
            ]
        });

        this.guild = null;
        this.webhookClient = null;
        
        // Instagram configuration
        this.instagramConfig = {
            username: process.env.INSTAGRAM_USERNAME || 'growmiesNJ',
            rssAppApiKey: process.env.RSS_APP_API_KEY,
            webhookUrl: process.env.DISCORD_WEBHOOK_URL,
            postingChannel: 'nj-cannabis-news', // Default channel for Instagram posts
            hashtagFilters: [
                '#growmiesNJ',
                '#NewJerseyCannabis',
                '#NJWeed',
                '#Cannabis',
                '#Growing',
                '#Harvest',
                '#CannabisCommunity',
                '#NJDispensary'
            ]
        };

        // RSS.app feed configuration
        this.feedConfig = {
            name: 'Growmies NJ Instagram Feed',
            url: `https://rss.app/feeds/instagram/${this.instagramConfig.username}.xml`,
            updateInterval: 300, // 5 minutes
            maxPosts: 10 // Max posts to fetch per update
        };

        // Content moderation settings
        this.moderationConfig = {
            requireApproval: true,
            autoApprove: false,
            bannedKeywords: [
                'illegal',
                'sell',
                'buy',
                'purchase',
                'sale',
                'money',
                'price',
                'dealer',
                'plug'
            ],
            requiredHashtags: ['#growmiesNJ'],
            ageRestriction: true // Only post to 21+ channels
        };
    }

    async initialize() {
        console.log('📸 Initializing Instagram Integration...');
        
        await this.client.login(process.env.DISCORD_TOKEN);
        this.guild = await this.client.guilds.fetch(process.env.DISCORD_GUILD_ID);
        
        if (this.instagramConfig.webhookUrl) {
            this.webhookClient = new WebhookClient({ url: this.instagramConfig.webhookUrl });
        }
        
        console.log(`✅ Connected to guild: ${this.guild.name}`);
        return this;
    }

    async setupRSSAppFeed() {
        console.log('🔗 Setting up RSS.app Instagram feed...');
        
        try {
            // RSS.app API configuration
            const rssAppConfig = {
                feedName: this.feedConfig.name,
                source: 'instagram',
                username: this.instagramConfig.username,
                webhook: this.instagramConfig.webhookUrl,
                updateInterval: this.feedConfig.updateInterval,
                filters: {
                    hashtags: this.instagramConfig.hashtagFilters,
                    contentType: ['photo', 'video', 'carousel']
                }
            };

            console.log('📋 RSS.app Feed Configuration:');
            console.log(`   Feed Name: ${rssAppConfig.feedName}`);
            console.log(`   Instagram: @${this.instagramConfig.username}`);
            console.log(`   Update Interval: ${rssAppConfig.updateInterval} seconds`);
            console.log(`   Webhook: ${this.instagramConfig.webhookUrl ? 'Configured' : 'Not configured'}`);
            
            // Manual setup instructions since RSS.app requires web interface
            const setupInstructions = {
                step1: 'Visit https://rss.app/',
                step2: 'Create account or login',
                step3: `Add Instagram feed for @${this.instagramConfig.username}`,
                step4: 'Configure webhook URL for Discord integration',
                step5: 'Set up filtering for relevant hashtags',
                step6: 'Enable real-time updates',
                step7: 'Test feed with sample post'
            };

            console.log('✅ RSS.app configuration prepared');
            return { configured: true, setup: setupInstructions, config: rssAppConfig };
            
        } catch (error) {
            console.error('❌ RSS.app setup failed:', error.message);
            return { configured: false, error: error.message };
        }
    }

    async createInstagramWebhook() {
        console.log('🪝 Creating Instagram webhook endpoint...');
        
        try {
            const targetChannel = this.guild.channels.cache.find(c => c.name === this.instagramConfig.postingChannel);
            
            if (!targetChannel) {
                throw new Error(`Channel ${this.instagramConfig.postingChannel} not found`);
            }

            // Create webhook in the target channel
            const webhook = await targetChannel.createWebhook({
                name: 'Growmies NJ Instagram',
                avatar: 'https://growmies.nj/assets/logo.png', // Replace with actual logo URL
                reason: 'Instagram integration for automated posting'
            });

            console.log(`✅ Webhook created: ${webhook.url}`);
            
            // Save webhook URL for RSS.app configuration
            const webhookConfig = {
                url: webhook.url,
                channelId: targetChannel.id,
                channelName: targetChannel.name,
                createdAt: new Date().toISOString()
            };

            return webhookConfig;
            
        } catch (error) {
            console.error('❌ Webhook creation failed:', error.message);
            throw error;
        }
    }

    async processInstagramPost(postData) {
        console.log('📝 Processing Instagram post...');
        
        try {
            // Content moderation check
            const moderationResult = await this.moderateContent(postData);
            
            if (!moderationResult.approved) {
                console.log(`⚠️ Post rejected: ${moderationResult.reason}`);
                return { processed: false, reason: moderationResult.reason };
            }

            // Create Discord embed for Instagram post
            const embed = new EmbedBuilder()
                .setTitle('New Post from @growmiesNJ')
                .setDescription(this.formatInstagramCaption(postData.caption))
                .setColor(0x833AB4) // Instagram brand color
                .setAuthor({
                    name: 'Growmies NJ',
                    iconURL: 'https://growmies.nj/assets/logo.png',
                    url: postData.permalink
                })
                .setImage(postData.media_url)
                .setTimestamp(new Date(postData.timestamp))
                .setFooter({
                    text: 'Instagram • Growmies NJ',
                    iconURL: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Instagram_icon.png/1024px-Instagram_icon.png'
                })
                .addFields([
                    {
                        name: '🔗 View on Instagram',
                        value: `[Open Post](${postData.permalink})`,
                        inline: true
                    },
                    {
                        name: '👥 Engagement',
                        value: `❤️ ${postData.like_count || 0} | 💬 ${postData.comments_count || 0}`,
                        inline: true
                    }
                ]);

            // Add media type indicator
            if (postData.media_type === 'VIDEO') {
                embed.addFields([
                    {
                        name: '🎥 Media Type',
                        value: 'Video Post',
                        inline: true
                    }
                ]);
            }

            return { processed: true, embed: embed, postData: postData };
            
        } catch (error) {
            console.error('❌ Post processing failed:', error.message);
            return { processed: false, error: error.message };
        }
    }

    async moderateContent(postData) {
        console.log('🛡️ Moderating Instagram content...');
        
        try {
            const caption = postData.caption || '';
            const lowercaseCaption = caption.toLowerCase();
            
            // Check for banned keywords
            for (const keyword of this.moderationConfig.bannedKeywords) {
                if (lowercaseCaption.includes(keyword.toLowerCase())) {
                    return {
                        approved: false,
                        reason: `Contains banned keyword: ${keyword}`
                    };
                }
            }

            // Check for required hashtags (if enabled)
            if (this.moderationConfig.requiredHashtags.length > 0) {
                const hasRequiredHashtag = this.moderationConfig.requiredHashtags.some(tag => 
                    lowercaseCaption.includes(tag.toLowerCase())
                );
                
                if (!hasRequiredHashtag) {
                    return {
                        approved: false,
                        reason: 'Missing required hashtag: ' + this.moderationConfig.requiredHashtags.join(' or ')
                    };
                }
            }

            // Cannabis compliance check
            if (this.moderationConfig.ageRestriction) {
                const cannabisKeywords = ['cannabis', 'weed', 'marijuana', 'thc', 'cbd', 'grow', 'harvest', 'strain'];
                const containsCannabisContent = cannabisKeywords.some(keyword => 
                    lowercaseCaption.includes(keyword.toLowerCase())
                );
                
                if (containsCannabisContent) {
                    // Mark for 21+ only channels
                    return {
                        approved: true,
                        ageRestricted: true,
                        reason: 'Cannabis content - 21+ channels only'
                    };
                }
            }

            return {
                approved: true,
                reason: 'Content approved'
            };
            
        } catch (error) {
            console.error('❌ Content moderation failed:', error.message);
            return {
                approved: false,
                reason: 'Moderation error: ' + error.message
            };
        }
    }

    formatInstagramCaption(caption) {
        if (!caption) return 'No caption available';
        
        // Limit caption length for Discord embed
        const maxLength = 2000;
        let formattedCaption = caption;
        
        if (formattedCaption.length > maxLength) {
            formattedCaption = formattedCaption.substring(0, maxLength - 3) + '...';
        }
        
        // Convert Instagram hashtags to Discord-friendly format
        formattedCaption = formattedCaption.replace(/#(\w+)/g, '`#$1`');
        
        // Convert @mentions to Discord-friendly format
        formattedCaption = formattedCaption.replace(/@(\w+)/g, '**@$1**');
        
        return formattedCaption;
    }

    async setupContentScheduling() {
        console.log('⏰ Setting up content scheduling...');
        
        const scheduleConfig = {
            enabled: true,
            checkInterval: 300000, // 5 minutes
            peakHours: {
                start: 18, // 6 PM
                end: 22    // 10 PM
            },
            timezone: 'America/New_York',
            maxPostsPerHour: 2,
            quietHours: {
                start: 23, // 11 PM
                end: 8     // 8 AM
            }
        };

        console.log('⏰ Content scheduling configured');
        return scheduleConfig;
    }

    async createManualPostCommand() {
        console.log('🎮 Creating manual Instagram post command...');
        
        // This would integrate with the existing slash command system
        const commandTemplate = {
            name: 'instagram-post',
            description: 'Manually post Instagram content to Discord',
            options: [
                {
                    name: 'url',
                    description: 'Instagram post URL',
                    type: 'string',
                    required: true
                },
                {
                    name: 'channel',
                    description: 'Target Discord channel',
                    type: 'channel',
                    required: false
                }
            ]
        };

        return commandTemplate;
    }

    async setupAnalytics() {
        console.log('📊 Setting up Instagram integration analytics...');
        
        const analyticsConfig = {
            trackMetrics: [
                'posts_shared',
                'engagement_rates',
                'discord_reactions',
                'click_through_rates',
                'peak_posting_times',
                'content_performance'
            ],
            reportingSchedule: 'weekly',
            reportChannel: 'mod-logs'
        };

        return analyticsConfig;
    }

    async generateConfiguration() {
        const config = {
            instagramIntegration: {
                username: this.instagramConfig.username,
                feedUrl: this.feedConfig.url,
                updateInterval: this.feedConfig.updateInterval,
                postingChannel: this.instagramConfig.postingChannel,
                hashtagFilters: this.instagramConfig.hashtagFilters,
                moderationEnabled: true,
                ageRestriction: this.moderationConfig.ageRestriction
            },
            rssAppSetup: await this.setupRSSAppFeed(),
            contentScheduling: await this.setupContentScheduling(),
            analytics: await this.setupAnalytics(),
            manualPostCommand: await this.createManualPostCommand(),
            setupInstructions: {
                rssApp: [
                    '1. Visit https://rss.app and create account',
                    `2. Add Instagram feed for @${this.instagramConfig.username}`,
                    '3. Configure webhook URL from Discord',
                    '4. Set up hashtag filtering',
                    '5. Enable real-time updates',
                    '6. Test with sample post'
                ],
                discord: [
                    '1. Create webhook in target channel',
                    '2. Configure RSS.app with webhook URL',
                    '3. Test Instagram post integration',
                    '4. Verify content moderation',
                    '5. Set up analytics tracking',
                    '6. Configure posting schedule'
                ],
                testing: [
                    '1. Post test content to Instagram with #growmiesNJ',
                    '2. Verify Discord webhook receives post',
                    '3. Check content moderation filtering',
                    '4. Test manual post command',
                    '5. Verify 21+ channel restrictions',
                    '6. Monitor analytics data'
                ]
            }
        };

        return config;
    }

    async saveConfiguration(config) {
        console.log('💾 Saving Instagram integration configuration...');
        
        const configPath = path.join(__dirname, '..', 'config', 'instagram-integration.json');
        await fs.mkdir(path.dirname(configPath), { recursive: true });
        await fs.writeFile(configPath, JSON.stringify(config, null, 2));
        
        console.log('✅ Instagram integration configuration saved');
        return config;
    }

    async execute() {
        try {
            console.log('📸 Starting Instagram Integration Setup...');
            
            await this.initialize();
            
            // Create webhook for Instagram posts
            const webhookConfig = await this.createInstagramWebhook();
            
            // Generate complete configuration
            const config = await this.generateConfiguration();
            config.webhook = webhookConfig;
            
            // Save configuration
            await this.saveConfiguration(config);
            
            console.log('\n🎉 Instagram Integration Setup Complete!');
            console.log('📋 Manual setup still required:');
            console.log('   1. Visit https://rss.app and configure Instagram feed');
            console.log(`   2. Use webhook URL: ${webhookConfig.url}`);
            console.log('   3. Test with Instagram post using #growmiesNJ hashtag');
            console.log('   4. Verify content appears in Discord channel');
            
            return config;
            
        } catch (error) {
            console.error('❌ Instagram integration setup failed:', error.message);
            throw error;
        } finally {
            this.client.destroy();
        }
    }
}

// Execute if run directly
if (require.main === module) {
    const integration = new InstagramIntegration();
    integration.execute()
        .then((config) => {
            console.log('✅ Instagram integration setup completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Setup failed:', error.message);
            process.exit(1);
        });
}

module.exports = InstagramIntegration;