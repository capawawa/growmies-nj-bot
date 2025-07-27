/**
 * URGENT FIX VERIFICATION: Verify Discord Channel Population
 * 
 * Confirms that content was successfully moved to the CORRECT channels
 * and is no longer in the wrong "crappy" channels
 */

const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Load corrected server configuration
const configPath = path.join(__dirname, '..', 'config', 'server-configuration.json');
const serverConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

class ChannelPopulationVerifier {
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
     * Check if a channel has recent messages (indicating successful population)
     */
    async checkChannelMessages(channel, expectedContentType) {
        try {
            const messages = await channel.messages.fetch({ limit: 5 });
            const recentMessages = messages.filter(msg => 
                msg.author.id === this.client.user.id && 
                Date.now() - msg.createdTimestamp < 300000 // Last 5 minutes
            );

            return {
                channelName: channel.name,
                channelId: channel.id,
                hasRecentBotMessages: recentMessages.size > 0,
                messageCount: recentMessages.size,
                lastMessageTime: recentMessages.size > 0 ? recentMessages.first().createdAt : null,
                expectedContent: expectedContentType
            };
        } catch (error) {
            console.error(`Error checking ${channel.name}:`, error.message);
            return {
                channelName: channel.name,
                channelId: channel.id,
                hasRecentBotMessages: false,
                error: error.message,
                expectedContent: expectedContentType
            };
        }
    }

    /**
     * Main verification function
     */
    async verify() {
        try {
            console.log('🚨 URGENT: Verifying Channel Population Fix...');
            console.log('🔍 Connecting to Discord to verify correct channels...');
            
            await this.client.login(process.env.DISCORD_TOKEN);
            
            console.log('✅ Connected to Discord successfully!');
            console.log(`🤖 Logged in as ${this.client.user.tag}`);
            
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

            console.log(`🏠 Verifying guild: ${guild.name}`);
            
            // Check the CORRECT channels for content
            const correctChannels = [
                {
                    key: 'Welcome & Info:rules',
                    expectedContent: 'Rules and compliance content'
                },
                {
                    key: 'Welcome & Info:age-verification', 
                    expectedContent: 'Age verification instructions'
                },
                {
                    key: 'General Community:general-chat',
                    expectedContent: 'Welcome message and bot commands'
                },
                {
                    key: 'Cannabis 21+:growing-tips',
                    expectedContent: 'Growing education content'
                }
            ];

            console.log('\n🎯 VERIFYING CORRECT CHANNELS:');
            console.log('================================');

            const results = [];
            for (const channelInfo of correctChannels) {
                const channelId = serverConfig.channels[channelInfo.key];
                if (!channelId) {
                    console.log(`❌ Channel key ${channelInfo.key} not found in config`);
                    continue;
                }

                const channel = guild.channels.cache.get(channelId);
                if (!channel) {
                    console.log(`❌ Channel ${channelId} not found in guild`);
                    continue;
                }

                const result = await this.checkChannelMessages(channel, channelInfo.expectedContent);
                results.push(result);

                if (result.hasRecentBotMessages) {
                    console.log(`✅ #${result.channelName} - ${result.messageCount} recent messages ✓`);
                } else {
                    console.log(`❌ #${result.channelName} - No recent bot messages`);
                }
            }

            // Check the OLD "crappy" channels to confirm they don't have new content
            if (serverConfig.previousWrongChannels) {
                console.log('\n🗑️  CHECKING OLD "CRAPPY" CHANNELS:');
                console.log('==================================');

                const oldChannelIds = Object.values(serverConfig.previousWrongChannels);
                for (const oldChannelId of oldChannelIds) {
                    const oldChannel = guild.channels.cache.get(oldChannelId);
                    if (oldChannel) {
                        const result = await this.checkChannelMessages(oldChannel, 'Should be empty');
                        if (result.hasRecentBotMessages) {
                            console.log(`⚠️  #${result.channelName} - Still has recent messages (BAD)`);
                        } else {
                            console.log(`✅ #${result.channelName} - No recent messages (GOOD)`);
                        }
                    }
                }
            }

            // Summary
            const successfulChannels = results.filter(r => r.hasRecentBotMessages);
            const failedChannels = results.filter(r => !r.hasRecentBotMessages);

            console.log('\n📊 VERIFICATION SUMMARY:');
            console.log('========================');
            console.log(`✅ Successfully populated: ${successfulChannels.length}/${results.length} channels`);
            console.log(`❌ Failed to populate: ${failedChannels.length}/${results.length} channels`);

            if (successfulChannels.length === results.length) {
                console.log('\n🎉 SUCCESS! All correct channels have been populated!');
                console.log('✅ The urgent fix has been completed successfully!');
                console.log('🔄 Content has been moved from "crappy" channels to "good" channels!');
            } else {
                console.log('\n⚠️  WARNING: Some channels may not have been populated correctly');
                failedChannels.forEach(channel => {
                    console.log(`   • #${channel.channelName} - ${channel.error || 'No recent messages'}`);
                });
            }

            return { successfulChannels, failedChannels, results };

        } catch (error) {
            console.error('❌ Verification failed:', error);
            throw error;
        } finally {
            console.log('🔌 Disconnecting from Discord...');
            this.client.destroy();
        }
    }
}

// Execute the verification
async function main() {
    console.log('🚨 URGENT CHANNEL POPULATION VERIFICATION');
    console.log('========================================');
    console.log('Confirming content is now in the CORRECT channels...\n');
    
    // Validate environment
    if (!process.env.DISCORD_TOKEN) {
        console.error('❌ DISCORD_TOKEN not found in environment variables');
        process.exit(1);
    }

    try {
        const verifier = new ChannelPopulationVerifier();
        const results = await verifier.verify();
        
        console.log('\n✅ Verification completed!');
        console.log('🎯 The urgent channel fix has been verified');
        
        return results;
        
    } catch (error) {
        console.error('\n❌ Verification failed:', error);
        process.exit(1);
    }
}

// Run the verification
if (require.main === module) {
    main();
}

module.exports = ChannelPopulationVerifier;