/**
 * Discord Channel Investigation Script
 * 
 * URGENT: Investigates ALL channels on the Discord server to identify 
 * which channel set we should be populating instead of the current "crappy" ones
 */

const { Client, GatewayIntentBits, ChannelType } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Load current server configuration to compare
const configPath = path.join(__dirname, '..', 'config', 'server-configuration.json');
const currentConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

class DiscordChannelInvestigator {
    constructor() {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages
            ]
        });
    }

    /**
     * Format channel information for detailed analysis
     */
    formatChannelInfo(channel) {
        const createdAt = new Date(channel.createdTimestamp);
        const info = {
            id: channel.id,
            name: channel.name,
            type: ChannelType[channel.type],
            category: channel.parent ? {
                id: channel.parent.id,
                name: channel.parent.name
            } : null,
            position: channel.position,
            createdAt: createdAt.toISOString(),
            createdDate: createdAt.toLocaleDateString(),
            createdTime: createdAt.toLocaleTimeString(),
            topic: channel.topic || null,
            nsfw: channel.nsfw || false,
            messageCount: null, // We'll try to get this if possible
            lastMessageId: channel.lastMessageId,
            isCurrentlyConfigured: this.isChannelInCurrentConfig(channel.id)
        };

        return info;
    }

    /**
     * Check if a channel ID is in our current configuration
     */
    isChannelInCurrentConfig(channelId) {
        return Object.values(currentConfig.channels || {}).includes(channelId);
    }

    /**
     * Analyze and group channels to identify patterns
     */
    analyzeChannelSets(channels) {
        const analysis = {
            totalChannels: channels.length,
            categories: {},
            channelsByCreationTime: [],
            configuredChannels: [],
            unconfiguredChannels: [],
            potentialDuplicateSets: []
        };

        // Group by categories
        channels.forEach(channel => {
            const categoryName = channel.category ? channel.category.name : 'No Category';
            if (!analysis.categories[categoryName]) {
                analysis.categories[categoryName] = [];
            }
            analysis.categories[categoryName].push(channel);

            // Track configured vs unconfigured
            if (channel.isCurrentlyConfigured) {
                analysis.configuredChannels.push(channel);
            } else {
                analysis.unconfiguredChannels.push(channel);
            }
        });

        // Sort by creation time to see if there are two sets created at different times
        analysis.channelsByCreationTime = [...channels].sort((a, b) => 
            new Date(a.createdAt) - new Date(b.createdAt)
        );

        // Look for potential duplicate channel names (indicating multiple sets)
        const nameGroups = {};
        channels.forEach(channel => {
            const baseName = channel.name.toLowerCase();
            if (!nameGroups[baseName]) {
                nameGroups[baseName] = [];
            }
            nameGroups[baseName].push(channel);
        });

        // Find channels with duplicate names (potential multiple sets)
        Object.entries(nameGroups).forEach(([name, channelGroup]) => {
            if (channelGroup.length > 1) {
                analysis.potentialDuplicateSets.push({
                    name: name,
                    channels: channelGroup
                });
            }
        });

        return analysis;
    }

    /**
     * Generate recommendations based on analysis
     */
    generateRecommendations(analysis) {
        const recommendations = {
            summary: '',
            suspectedCorrectChannels: {},
            reasons: [],
            actionRequired: ''
        };

        console.log('\n🔍 ANALYSIS RESULTS:');
        console.log('==================');

        // Check for newer channels that might be the "good" set
        const newestChannels = analysis.channelsByCreationTime.slice(-10);
        const oldestChannels = analysis.channelsByCreationTime.slice(0, 10);

        console.log('\n📅 CHANNEL CREATION TIMELINE:');
        console.log('Oldest Channels:');
        oldestChannels.forEach(channel => {
            console.log(`  ${channel.createdDate} ${channel.createdTime} - #${channel.name} (${channel.id}) ${channel.isCurrentlyConfigured ? '✅ CURRENTLY CONFIGURED' : ''}`);
        });

        console.log('\nNewest Channels:');
        newestChannels.forEach(channel => {
            console.log(`  ${channel.createdDate} ${channel.createdTime} - #${channel.name} (${channel.id}) ${channel.isCurrentlyConfigured ? '✅ CURRENTLY CONFIGURED' : ''}`);
        });

        // Check for duplicate sets
        if (analysis.potentialDuplicateSets.length > 0) {
            console.log('\n🔄 POTENTIAL DUPLICATE CHANNEL SETS FOUND:');
            analysis.potentialDuplicateSets.forEach(set => {
                console.log(`\n"${set.name}" appears ${set.channels.length} times:`);
                set.channels.forEach(channel => {
                    console.log(`  - #${channel.name} (${channel.id}) created ${channel.createdDate} ${channel.isCurrentlyConfigured ? '✅ CURRENTLY CONFIGURED' : '❌ NOT CONFIGURED'}`);
                });
            });

            recommendations.reasons.push('Multiple channels with same names found - indicates duplicate sets');
        }

        // Analyze by category
        console.log('\n📁 CHANNELS BY CATEGORY:');
        Object.entries(analysis.categories).forEach(([categoryName, channels]) => {
            console.log(`\n${categoryName} (${channels.length} channels):`);
            channels.forEach(channel => {
                console.log(`  - #${channel.name} (${channel.id}) ${channel.isCurrentlyConfigured ? '✅ CONFIGURED' : '❌ NOT CONFIGURED'} - created ${channel.createdDate}`);
            });
        });

        // Check if we're using older channels when newer ones exist
        const configuredChannelDates = analysis.configuredChannels.map(ch => new Date(ch.createdAt));
        const unconfiguredChannelDates = analysis.unconfiguredChannels.map(ch => new Date(ch.createdAt));
        
        if (unconfiguredChannelDates.length > 0 && configuredChannelDates.length > 0) {
            const avgConfiguredDate = new Date(configuredChannelDates.reduce((sum, date) => sum + date.getTime(), 0) / configuredChannelDates.length);
            const avgUnconfiguredDate = new Date(unconfiguredChannelDates.reduce((sum, date) => sum + date.getTime(), 0) / unconfiguredChannelDates.length);
            
            if (avgUnconfiguredDate > avgConfiguredDate) {
                console.log('\n⚠️  WARNING: Unconfigured channels appear to be newer than configured ones!');
                console.log(`   Average configured channel date: ${avgConfiguredDate.toLocaleDateString()}`);
                console.log(`   Average unconfigured channel date: ${avgUnconfiguredDate.toLocaleDateString()}`);
                recommendations.reasons.push('Configured channels are older than unconfigured channels');
            }
        }

        return recommendations;
    }

    /**
     * Main investigation function
     */
    async investigate() {
        try {
            console.log('🚨 URGENT: Discord Channel Investigation Starting...');
            console.log('🔍 Connecting to Discord to find ALL channels...');
            
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

            const guild = this.client.guilds.cache.get(currentConfig.guildId);
            if (!guild) {
                throw new Error(`Guild ${currentConfig.guildId} not found`);
            }

            console.log(`🏠 Investigating guild: ${guild.name}`);
            console.log(`👥 Member count: ${guild.memberCount}`);
            
            // Fetch all channels
            const allChannels = Array.from(guild.channels.cache.values())
                .filter(channel => channel.type === ChannelType.GuildText)
                .map(channel => this.formatChannelInfo(channel));

            console.log(`\n📊 FOUND ${allChannels.length} TEXT CHANNELS TOTAL`);
            console.log('=====================================');

            // Save raw channel data
            const investigationData = {
                guildId: guild.id,
                guildName: guild.name,
                investigatedAt: new Date().toISOString(),
                totalChannels: allChannels.length,
                currentlyConfiguredChannels: currentConfig.channels,
                allChannels: allChannels
            };

            const outputPath = path.join(__dirname, '..', 'investigation-results.json');
            fs.writeFileSync(outputPath, JSON.stringify(investigationData, null, 2));
            console.log(`💾 Raw investigation data saved to: ${outputPath}`);

            // Analyze the channels
            const analysis = this.analyzeChannelSets(allChannels);
            const recommendations = this.generateRecommendations(analysis);

            console.log('\n🎯 INVESTIGATION COMPLETE!');
            console.log('=========================');
            console.log(`📋 Total channels found: ${allChannels.length}`);
            console.log(`✅ Currently configured: ${analysis.configuredChannels.length}`);
            console.log(`❌ Not configured: ${analysis.unconfiguredChannels.length}`);
            console.log(`🔄 Potential duplicate sets: ${analysis.potentialDuplicateSets.length}`);

            if (analysis.potentialDuplicateSets.length > 0) {
                console.log('\n🚨 CRITICAL: Multiple channel sets detected!');
                console.log('The user was right - we populated the wrong channels.');
            }

            return {
                investigationData,
                analysis,
                recommendations
            };

        } catch (error) {
            console.error('❌ Investigation failed:', error);
            throw error;
        } finally {
            console.log('🔌 Disconnecting from Discord...');
            this.client.destroy();
        }
    }
}

// Execute the investigation
async function main() {
    console.log('🚨 URGENT DISCORD CHANNEL INVESTIGATION');
    console.log('======================================');
    console.log('Finding ALL channels to identify correct set to populate...\n');
    
    // Validate environment
    if (!process.env.DISCORD_TOKEN) {
        console.error('❌ DISCORD_TOKEN not found in environment variables');
        process.exit(1);
    }

    try {
        const investigator = new DiscordChannelInvestigator();
        const results = await investigator.investigate();
        
        console.log('\n✅ Investigation completed successfully!');
        console.log('📊 Check investigation-results.json for detailed channel data');
        console.log('🔧 Ready to update configuration with correct channels');
        
        return results;
        
    } catch (error) {
        console.error('\n❌ Investigation failed:', error);
        process.exit(1);
    }
}

// Run the investigation
if (require.main === module) {
    main();
}

module.exports = DiscordChannelInvestigator;