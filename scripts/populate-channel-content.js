/**
 * URGENT FIX: Discord Channel Population Script for GrowmiesNJ
 *
 * CORRECTED: Now populates the CORRECT channels (emoji-organized professional set)
 * Previous error: Was populating the wrong "crappy" channels from 7/23/2025
 * Fixed to target: Proper emoji channels created 7/25/2025 with better organization
 * Focus: Rules, Age Verification, General Chat, Growing Discussion
 */

const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Load server configuration
const configPath = path.join(__dirname, '..', 'config', 'server-configuration.json');
const serverConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Brand colors for consistency
const BRAND_COLORS = {
    PRIMARY_GREEN: '#2ecc71',
    SECONDARY: '#95a5a6', 
    SUCCESS: '#27ae60',
    WARNING: '#f39c12',
    DANGER: '#e74c3c',
    INFO: '#3498db'
};

class ChannelPopulator {
    constructor() {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent
            ]
        });
    }

    /**
     * Create comprehensive rules content for #rules channel
     */
    createRulesContent() {
        const rulesEmbed = new EmbedBuilder()
            .setTitle('🌿 GrowmiesNJ Community Rules & Guidelines')
            .setDescription('**Welcome to New Jersey\'s Premier Cannabis Community!**\n\nPlease read and follow these rules to maintain a positive, educational, and legally compliant environment for all members.')
            .setColor(BRAND_COLORS.PRIMARY_GREEN)
            .addFields(
                {
                    name: '🔞 Age Verification Requirements',
                    value: [
                        '• **Must be 21+ years old** - This is legally required for cannabis content',
                        '• Use `/verify` command to get access to cannabis channels',
                        '• Age verification is mandatory and strictly enforced',
                        '• Lying about age results in permanent ban'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '⚖️ New Jersey Cannabis Law Compliance',
                    value: [
                        '• All discussions must comply with NJ Cannabis Regulatory Laws',
                        '• No sales or commercial transactions allowed',
                        '• Home cultivation discussions allowed (legal in NJ with limits)',
                        '• Educational content only - not medical advice',
                        '• Respect possession limits and consumption laws'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '💬 Community Guidelines',
                    value: [
                        '• **Be respectful** - Treat everyone with kindness and respect',
                        '• **Stay on topic** - Keep cannabis discussions in designated channels',
                        '• **No spam** - Avoid repetitive messages or excessive self-promotion',
                        '• **Educational focus** - Share knowledge, ask questions, help others learn',
                        '• **No illegal activity** - Follow all local, state, and federal laws'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '🚫 Prohibited Content',
                    value: [
                        '• **No illegal sales** - No buying/selling cannabis or paraphernalia',
                        '• **No underage content** - Must be 21+ for all cannabis discussions',
                        '• **No medical claims** - We provide education, not medical advice',
                        '• **No hate speech** - Zero tolerance for discrimination',
                        '• **No NSFW content** - Keep content appropriate and professional'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '🛡️ Moderation & Enforcement',
                    value: [
                        '• **Three strike system** - Warnings, timeout, then ban',
                        '• **Immediate ban** for illegal activity or age violations',
                        '• **Report concerns** to moderators using Discord report feature',
                        '• **Appeal process** available for justified cases',
                        '• **Bot moderation** assists human moderators 24/7'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '📜 Legal Disclaimers',
                    value: [
                        '• **Educational purposes only** - Content is for information sharing',
                        '• **Not medical advice** - Consult healthcare professionals for medical issues',
                        '• **Comply with local laws** - Cannabis laws vary by location',
                        '• **Personal responsibility** - Members responsible for their own compliance',
                        '• **Server liability** - GrowmiesNJ not liable for member actions'
                    ].join('\n'),
                    inline: false
                }
            )
            .setFooter({
                text: 'By participating in this server, you agree to follow all rules and applicable laws • Last Updated: ' + new Date().toLocaleDateString(),
                iconURL: 'https://via.placeholder.com/32x32/2ecc71/ffffff?text=🌿'
            })
            .setTimestamp();

        const complianceEmbed = new EmbedBuilder()
            .setTitle('🏛️ New Jersey Cannabis Compliance Notice')
            .setDescription('**Important Legal Information for NJ Cannabis Community**')
            .setColor(BRAND_COLORS.INFO)
            .addFields(
                {
                    name: '📋 NJ Cannabis Laws Summary',
                    value: [
                        '• **Legal Age:** 21+ for adult use cannabis',
                        '• **Home Cultivation:** Up to 6 plants per adult (max 12 per household)',
                        '• **Possession Limits:** 1 oz flower, 5g concentrate public possession',
                        '• **Licensed Dispensaries:** Only purchase from NJ licensed dispensaries',
                        '• **No Public Consumption:** Cannabis consumption prohibited in public spaces'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '⚠️ This Server Is For',
                    value: [
                        '✅ Educational cannabis content and discussions',
                        '✅ Home cultivation tips and legal growing advice',
                        '✅ Strain information and cannabis knowledge sharing',
                        '✅ Community support and experience sharing',
                        '✅ Legal compliance guidance and awareness'
                    ].join('\n'),
                    inline: true
                },
                {
                    name: '🚫 This Server Is NOT For',
                    value: [
                        '❌ Buying or selling cannabis or products',
                        '❌ Medical advice or treatment recommendations',
                        '❌ Illegal activity or law violations',
                        '❌ Commercial promotion without permission',
                        '❌ Underage participation or discussion'
                    ].join('\n'),
                    inline: true
                }
            )
            .setFooter({
                text: 'Always verify current NJ cannabis laws • Information subject to change',
                iconURL: 'https://via.placeholder.com/32x32/3498db/ffffff?text=⚖️'
            });

        return { embeds: [rulesEmbed, complianceEmbed] };
    }

    /**
     * Create age verification instructions for #age-verification channel
     */
    createAgeVerificationContent() {
        const verificationEmbed = new EmbedBuilder()
            .setTitle('🔞 Age Verification Required - Cannabis Community Access')
            .setDescription('**Welcome to GrowmiesNJ!** To access cannabis-related content and channels, you must verify that you are 21+ years old.')
            .setColor(BRAND_COLORS.WARNING)
            .addFields(
                {
                    name: '🎯 Why Age Verification?',
                    value: [
                        '• **Legal Requirement:** Cannabis content restricted to 21+ by law',
                        '• **Server Protection:** Keeps our community legally compliant',
                        '• **Content Access:** Unlocks premium cannabis channels and features',
                        '• **Community Safety:** Ensures responsible adult participation'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '📝 How to Get Verified',
                    value: [
                        '**Step 1:** Use the `/verify` command in this channel',
                        '**Step 2:** Confirm you are 21+ years old when prompted',
                        '**Step 3:** Receive your **Verified 21+** role automatically',
                        '**Step 4:** Access unlocked cannabis channels and content!'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '🔓 What You\'ll Unlock',
                    value: [
                        '🌿 **Cannabis 21+ Channels:**',
                        '   • #growing-discussion - Cultivation tips and techniques',
                        '   • #strain-reviews - Share and discover strain experiences',
                        '   • #nj-dispensaries - Local dispensary discussions',
                        '',
                        '🤖 **Bot Commands:**',
                        '   • `/strain-info` - Detailed strain information database',
                        '   • Cannabis-themed games and educational content',
                        '   • Advanced community features and perks'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '⚠️ Important Notes',
                    value: [
                        '• **One verification per user** - Process is permanent',
                        '• **Honest verification only** - False age claims result in ban',
                        '• **Private process** - Your verification is handled confidentially',
                        '• **Instant access** - Role assigned immediately upon verification',
                        '• **Need help?** Contact moderators if verification fails'
                    ].join('\n'),
                    inline: false
                }
            )
            .setFooter({
                text: 'Verification is required for cannabis content access • 21+ Only',
                iconURL: 'https://via.placeholder.com/32x32/f39c12/ffffff?text=🔞'
            })
            .setTimestamp();

        const instructionEmbed = new EmbedBuilder()
            .setTitle('🚀 Ready to Get Started?')
            .setDescription('Click the button below or type `/verify` to begin your age verification process!')
            .setColor(BRAND_COLORS.SUCCESS)
            .addFields(
                {
                    name: '💡 Pro Tips',
                    value: [
                        '• The verification process takes less than 30 seconds',
                        '• You only need to verify once per server',
                        '• Your age information is not stored - only verification status',
                        '• Verification unlocks the full GrowmiesNJ experience'
                    ].join('\n'),
                    inline: false
                }
            );

        const verificationButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('age_verify_start')
                    .setLabel('🔞 Verify Age (21+)')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🌿')
            );

        return { 
            embeds: [verificationEmbed, instructionEmbed], 
            components: [verificationButton] 
        };
    }

    /**
     * Create welcome and bot guide content for #general-chat channel
     */
    createGeneralChatContent() {
        const welcomeEmbed = new EmbedBuilder()
            .setTitle('🌿 Welcome to GrowmiesNJ - New Jersey\'s Cannabis Community!')
            .setDescription('**Greetings, fellow cannabis enthusiasts!** Welcome to the most comprehensive cannabis community in New Jersey. Whether you\'re a seasoned grower, medical patient, or cannabis curious, you\'ll find your home here.')
            .setColor(BRAND_COLORS.PRIMARY_GREEN)
            .addFields(
                {
                    name: '🎯 What Makes Us Special',
                    value: [
                        '🏠 **NJ-Focused:** Tailored for New Jersey cannabis laws and culture',
                        '📚 **Educational:** Learn from experienced growers and enthusiasts',
                        '🤝 **Supportive:** Friendly community that helps each other grow',
                        '⚖️ **Compliant:** Strictly follows all NJ cannabis regulations',
                        '🔞 **Adult-Only:** Verified 21+ community for responsible discussions'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '🚀 Getting Started',
                    value: [
                        '1️⃣ **Verify your age** with `/verify` (required for cannabis content)',
                        '2️⃣ **Read the rules** in #rules channel',
                        '3️⃣ **Introduce yourself** here in #general-chat',
                        '4️⃣ **Explore channels** and start learning!',
                        '5️⃣ **Use bot commands** to enhance your experience'
                    ].join('\n'),
                    inline: false
                }
            )
            .setThumbnail('https://via.placeholder.com/128x128/2ecc71/ffffff?text=🌿')
            .setFooter({
                text: 'New Jersey\'s Premier Cannabis Community • Est. 2024',
                iconURL: 'https://via.placeholder.com/32x32/2ecc71/ffffff?text=NJ'
            })
            .setTimestamp();

        const botCommandsEmbed = new EmbedBuilder()
            .setTitle('🤖 GrowmiesNJ Bot Commands Guide')
            .setDescription('**Your Cannabis Community Assistant!** Here are all the available commands to enhance your experience:')
            .setColor(BRAND_COLORS.INFO)
            .addFields(
                {
                    name: '🌿 Cannabis & Engagement Commands',
                    value: [
                        '`/strain-info` - Detailed cannabis strain information database (21+ only)',
                        '`/strain-guess` - Test your strain knowledge with fun games',
                        '`/daily-challenge` - Daily cannabis education challenges',
                        '`/quiz` - Cannabis knowledge quizzes and learning',
                        '`/8ball` - Ask the magic 8-ball questions',
                        '`/dice` - Roll dice for games and decisions',
                        '`/coinflip` - Flip a coin for quick choices',
                        '`/would-you-rather` - Fun would-you-rather scenarios',
                        '`/vote` - Create community polls and votes',
                        '`/suggest` - Suggest improvements for the community',
                        '`/compliment` - Spread positivity with compliments',
                        '`/celebrate` - Celebrate achievements and milestones'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '🏆 Leveling & Community Commands',
                    value: [
                        '`/level` - Check your cannabis community progression',
                        '`/leaderboard` - View top community contributors',
                        '`/verify` - Age verification for cannabis content access',
                        '`/ping` - Check bot response time and connection',
                        '`/server` - Get server information and statistics'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '🛡️ Moderation Commands (Staff Only)',
                    value: [
                        '`/warn` - Issue warnings to members',
                        '`/timeout` - Temporarily restrict member access',
                        '`/kick` - Remove members from the server',
                        '`/ban` - Permanently ban members',
                        '`/unban` - Remove previous bans',
                        '`/purge` - Clean up channel messages'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '💡 Pro Tips',
                    value: [
                        '• **Slash commands** start with `/` - Discord will show you options!',
                        '• **Age verification required** for cannabis-specific commands',
                        '• **Earn XP** by participating - level up your cannabis knowledge!',
                        '• **Use autocomplete** in strain commands for best results',
                        '• **Check #rules** for command usage guidelines'
                    ].join('\n'),
                    inline: false
                }
            )
            .setFooter({
                text: 'Type / to see all available commands • Bot Version 1.0',
                iconURL: 'https://via.placeholder.com/32x32/3498db/ffffff?text=🤖'
            });

        const communityEmbed = new EmbedBuilder()
            .setTitle('🏘️ Community Guidelines & Etiquette')
            .setDescription('**Let\'s grow together responsibly!** Here\'s how to be an awesome community member:')
            .setColor(BRAND_COLORS.SUCCESS)
            .addFields(
                {
                    name: '💬 Communication Tips',
                    value: [
                        '• **Be respectful** - Everyone is here to learn and grow',
                        '• **Ask questions** - No question is too basic or advanced',
                        '• **Share knowledge** - Help others with your experience',
                        '• **Stay positive** - Maintain the welcoming atmosphere',
                        '• **Use proper channels** - Keep topics organized'
                    ].join('\n'),
                    inline: true
                },
                {
                    name: '🌱 Growing Your Rank',
                    value: [
                        '• **Send messages** in community channels',
                        '• **Join voice chats** and participate in discussions',
                        '• **Give helpful reactions** to support others',
                        '• **Share educational content** about cannabis',
                        '• **Complete daily challenges** for bonus XP'
                    ].join('\n'),
                    inline: true
                }
            );

        return { embeds: [welcomeEmbed, botCommandsEmbed, communityEmbed] };
    }

    /**
     * Create educational growing content for #growing-discussion channel
     */
    createGrowingDiscussionContent() {
        const growingEmbed = new EmbedBuilder()
            .setTitle('🌱 Welcome to Cannabis Growing Discussion!')
            .setDescription('**Your gateway to home cultivation mastery!** This channel is dedicated to the art and science of growing cannabis in New Jersey.')
            .setColor(BRAND_COLORS.PRIMARY_GREEN)
            .addFields(
                {
                    name: '🏠 New Jersey Home Cultivation Laws',
                    value: [
                        '• **Legal Limit:** Up to 6 plants per adult (21+)',
                        '• **Household Maximum:** 12 plants per household total',
                        '• **Private Property Only:** Indoor/outdoor on private property',
                        '• **No Public Visibility:** Must not be visible from public areas',
                        '• **Personal Use Only:** Cannot sell homegrown cannabis',
                        '• **Secure Growing:** Must prevent access by minors'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '📚 What We Discuss Here',
                    value: [
                        '🌿 **Growing Techniques:** Indoor, outdoor, hydroponic, soil',
                        '🧪 **Nutrients & Feeding:** Optimal nutrition for healthy plants',
                        '💡 **Lighting:** LED, HPS, natural light optimization',
                        '🌡️ **Environment:** Temperature, humidity, air circulation',
                        '🔬 **Pest Management:** Organic and integrated pest solutions',
                        '✂️ **Training Methods:** LST, SCROG, topping, pruning techniques',
                        '🍃 **Harvest & Curing:** Timing, drying, and curing for quality',
                        '🧬 **Genetics:** Strain selection and breeding basics'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '🎯 Getting Started Growing',
                    value: [
                        '**1. Learn the Basics** - Start with beginner-friendly resources',
                        '**2. Choose Your Setup** - Indoor vs outdoor considerations',
                        '**3. Select Genetics** - Pick strains suitable for your skill level',
                        '**4. Understand Your Environment** - Climate control is crucial',
                        '**5. Start Small** - Begin with fewer plants to learn',
                        '**6. Document Everything** - Track progress and learn from results'
                    ].join('\n'),
                    inline: false
                }
            )
            .setThumbnail('https://via.placeholder.com/128x128/27ae60/ffffff?text=🌱')
            .setFooter({
                text: 'Educational content only • Always comply with NJ cannabis laws',
                iconURL: 'https://via.placeholder.com/32x32/27ae60/ffffff?text=🏠'
            })
            .setTimestamp();

        const strainCommandEmbed = new EmbedBuilder()
            .setTitle('🧬 Strain Information System')
            .setDescription('**Discover cannabis genetics and growing characteristics!** Use our comprehensive strain database to learn about different varieties.')
            .setColor(BRAND_COLORS.INFO)
            .addFields(
                {
                    name: '🔍 How to Use Strain Commands',
                    value: [
                        '`/strain-info strain:og-kush` - Get complete strain information',
                        '`/strain-info strain:blue-dream growing:true` - Include growing tips',
                        '`/strain-info strain:gelato medical:true` - Include medical information',
                        '`/strain-guess` - Test your strain knowledge with games'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '📖 Available Strain Categories',
                    value: [
                        '🟢 **Sativa Dominant:** Energizing, creative, daytime use',
                        '🟣 **Indica Dominant:** Relaxing, sedating, evening use',
                        '🔵 **Balanced Hybrids:** Best of both worlds',
                        '🏆 **Classic Strains:** Time-tested genetics',
                        '🍰 **Dessert Strains:** Sweet, fruity flavors',
                        '⭐ **Premium Genetics:** High-end cultivars'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '💡 Strain Selection Tips',
                    value: [
                        '• **Consider your experience level** - Some strains are easier to grow',
                        '• **Match your environment** - Indoor vs outdoor suitability',
                        '• **Flowering time matters** - Shorter for beginners',
                        '• **Research genetics** - Understanding lineage helps predict traits',
                        '• **Start with stable genetics** - Avoid experimental crosses initially'
                    ].join('\n'),
                    inline: false
                }
            );

        const communityEmbed = new EmbedBuilder()
            .setTitle('🤝 Growing Community Guidelines')
            .setDescription('**Let\'s cultivate knowledge together!** Guidelines for sharing and learning in our growing community:')
            .setColor(BRAND_COLORS.SUCCESS)
            .addFields(
                {
                    name: '✅ Encouraged Sharing',
                    value: [
                        '• **Educational content** - Growing techniques and tips',
                        '• **Progress photos** - Document your growing journey',
                        '• **Problem solving** - Ask for help with plant issues',
                        '• **Success stories** - Share what worked for you',
                        '• **Resource recommendations** - Equipment, nutrients, guides',
                        '• **Legal compliance tips** - Stay within NJ regulations'
                    ].join('\n'),
                    inline: true
                },
                {
                    name: '⚠️ Important Reminders',
                    value: [
                        '• **Educational purposes only** - We provide growing education',
                        '• **No sales or trades** - Strictly against server rules',
                        '• **Follow NJ laws** - Stay within legal growing limits',
                        '• **Respect privacy** - Don\'t pressure for personal details',
                        '• **Support beginners** - Everyone started somewhere',
                        '• **Quality information** - Verify tips with reliable sources'
                    ].join('\n'),
                    inline: true
                }
            )
            .setFooter({
                text: 'Growing knowledge through community • Always verify legal compliance',
                iconURL: 'https://via.placeholder.com/32x32/2ecc71/ffffff?text=🤝'
            });

        return { embeds: [growingEmbed, strainCommandEmbed, communityEmbed] };
    }

    /**
     * Connect to Discord and populate channels
     */
    async populateChannels() {
        try {
            console.log('🤖 Connecting to Discord...');
            
            await this.client.login(process.env.DISCORD_TOKEN);
            
            console.log('✅ Connected to Discord successfully!');
            console.log(`🌿 Logged in as ${this.client.user.tag}`);
            
            // Wait for client to be ready
            await new Promise(resolve => {
                if (this.client.isReady()) {
                    resolve();
                } else {
                    this.client.once('ready', resolve);
                }
            });

            const guild = this.client.guilds.cache.get(serverConfig.guildId);
            if (!guild) {
                throw new Error(`Guild ${serverConfig.guildId} not found`);
            }

            console.log(`🏠 Found guild: ${guild.name}`);
            console.log('📝 Starting channel population...\n');

            // Populate each channel
            await this.populateRulesChannel(guild);
            await this.populateAgeVerificationChannel(guild);
            await this.populateGeneralChatChannel(guild);
            await this.populateGrowingDiscussionChannel(guild);

            console.log('\n✅ All channels populated successfully!');
            console.log('🎉 GrowmiesNJ Discord server is now ready for the community!');

        } catch (error) {
            console.error('❌ Error during channel population:', error);
            throw error;
        } finally {
            console.log('🔌 Disconnecting from Discord...');
            this.client.destroy();
        }
    }

    /**
     * Populate rules channel - FIXED: Using correct emoji channel
     */
    async populateRulesChannel(guild) {
        const channelId = serverConfig.channels['Welcome & Info:rules'];
        const channel = guild.channels.cache.get(channelId);
        
        if (!channel) {
            console.error(`❌ Rules channel ${channelId} not found`);
            return;
        }

        console.log(`📋 Populating #${channel.name} (CORRECTED CHANNEL)...`);
        
        const content = this.createRulesContent();
        await channel.send(content);
        
        console.log(`✅ Posted comprehensive rules and compliance information to #${channel.name}`);
    }

    /**
     * Populate age verification channel - FIXED: Using correct emoji channel
     */
    async populateAgeVerificationChannel(guild) {
        const channelId = serverConfig.channels['Welcome & Info:age-verification'];
        const channel = guild.channels.cache.get(channelId);
        
        if (!channel) {
            console.error(`❌ Age verification channel ${channelId} not found`);
            return;
        }

        console.log(`🔞 Populating #${channel.name} (CORRECTED CHANNEL)...`);
        
        const content = this.createAgeVerificationContent();
        await channel.send(content);
        
        console.log(`✅ Posted age verification instructions to #${channel.name}`);
    }

    /**
     * Populate general chat channel - FIXED: Using correct emoji channel
     */
    async populateGeneralChatChannel(guild) {
        const channelId = serverConfig.channels['General Community:general-chat'];
        const channel = guild.channels.cache.get(channelId);
        
        if (!channel) {
            console.error(`❌ General chat channel ${channelId} not found`);
            return;
        }

        console.log(`💬 Populating #${channel.name} (CORRECTED CHANNEL)...`);
        
        const content = this.createGeneralChatContent();
        await channel.send(content);
        
        console.log(`✅ Posted welcome message and bot guide to #${channel.name}`);
    }

    /**
     * Populate growing discussion channel - FIXED: Using correct emoji channel
     */
    async populateGrowingDiscussionChannel(guild) {
        const channelId = serverConfig.channels['Cannabis 21+:growing-tips'];
        const channel = guild.channels.cache.get(channelId);
        
        if (!channel) {
            console.error(`❌ Growing tips channel ${channelId} not found`);
            return;
        }

        console.log(`🌱 Populating #${channel.name} (CORRECTED CHANNEL)...`);
        
        const content = this.createGrowingDiscussionContent();
        await channel.send(content);
        
        console.log(`✅ Posted growing education content to #${channel.name}`);
    }
}

// Execute the script
async function main() {
    console.log('🌿 GrowmiesNJ Channel Population Script');
    console.log('=====================================\n');
    
    // Validate environment
    if (!process.env.DISCORD_TOKEN) {
        console.error('❌ DISCORD_TOKEN not found in environment variables');
        process.exit(1);
    }

    // Validate server configuration
    if (!serverConfig.guildId) {
        console.error('❌ Guild ID not found in server configuration');
        process.exit(1);
    }

    try {
        const populator = new ChannelPopulator();
        await populator.populateChannels();
        
        console.log('\n🎊 Channel population completed successfully!');
        console.log('📊 Summary:');
        console.log('   • Rules channel: Comprehensive rules and NJ compliance');
        console.log('   • Age verification: Clear verification instructions');
        console.log('   • General chat: Welcome message and all 23+ bot commands');
        console.log('   • Growing discussion: Educational growing content');
        console.log('\n🌿 Your Discord server is now ready for the cannabis community!');
        
    } catch (error) {
        console.error('\n❌ Script failed:', error);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    main();
}

module.exports = ChannelPopulator;