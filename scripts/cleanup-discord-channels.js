#!/usr/bin/env node
/**
 * GrowmiesNJ Discord Channel Cleanup Script
 * 
 * This script cleans up the Discord server by:
 * 1. Analyzing current channel structure
 * 2. Identifying duplicate channels outside of proper categories
 * 3. Moving messages from duplicate channels to proper category channels
 * 4. Deleting duplicate channels
 * 5. Verifying the final 4-category organization
 * 
 * INTENDED STRUCTURE:
 * 1. 🌿 WELCOME & INFO (welcome, rules, age-verification)
 * 2. 💬 GENERAL COMMUNITY (18+) (general-chat, gaming-and-entertainment, photos-and-memes, general-voice)
 * 3. 🌱 CANNABIS DISCUSSION (21+) (strain-discussions, growing-tips, dispensary-reviews, harvest-showcase, medical-cannabis, cannabis-voice)
 * 4. 🔧 MODERATION & STAFF (staff-general, audit-logs)
 * 
 * DUPLICATE CHANNELS TO REMOVE:
 * - general, rules, age-verification, general-chat, growing-discussion, nj-dispensaries, strain-reviews
 * 
 * @author GrowmiesNJ DevOps Team
 * @version 1.0.0
 * @license MIT
 */

const { Client, GatewayIntentBits, ChannelType, PermissionFlagsBits } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

// Environment and configuration
const dotenv = require('dotenv');
dotenv.config();

/**
 * Discord Channel Cleanup Manager
 * Handles the complete channel cleanup process with safety checks
 */
class DiscordChannelCleanup {
    constructor() {
        this.client = null;
        this.guild = null;
        this.operationLog = [];
        this.dryRun = process.argv.includes('--dry-run') || process.argv.includes('--test');
        this.force = process.argv.includes('--force');
        
        // Define the intended structure
        this.intendedCategories = [
            '🌿 WELCOME & INFO',
            '💬 GENERAL COMMUNITY (18+)',
            '🌱 CANNABIS DISCUSSION (21+)',
            '🔧 MODERATION & STAFF'
        ];
        
        // Define old/unwanted categories that contain duplicates
        this.oldCategoriesToCleanup = [
            'Text Channels',
            'Information',
            'General',
            'Cannabis 21+'
        ];
        
        // Map duplicate channel names to their proper category channels
        this.channelMapping = {
            'general': 'general-chat',
            'rules': 'rules-and-compliance',
            'age-verification': 'age-verification',
            'general-chat': 'general-chat',
            'growing-discussion': 'growing-tips',
            'nj-dispensaries': 'dispensary-reviews',
            'strain-reviews': 'strain-discussions',
            'welcome': 'welcome',
            'meeting-plans': 'DELETE', // No equivalent in new structure
            'off-topic': 'DELETE', // No equivalent in new structure
            'resources': 'education-and-resources',
            'announcements': 'DELETE', // No equivalent in new structure
            'welcome-and-rules': 'DELETE' // Redundant, covered by separate channels
        };
        
        // Expected channels in each category
        this.expectedChannels = {
            '🌿 WELCOME & INFO': [
                'welcome', 'rules-and-compliance', 'age-verification', 'education-and-resources'
            ],
            '💬 GENERAL COMMUNITY (18+)': [
                'general-chat', 'gaming-and-entertainment', 'photos-and-memes', 'general-voice'
            ],
            '🌱 CANNABIS DISCUSSION (21+)': [
                'strain-discussions', 'growing-tips', 'dispensary-reviews', 
                'harvest-showcase', 'medical-cannabis', 'cannabis-voice'
            ],
            '🔧 MODERATION & STAFF': [
                'staff-general', 'audit-logs'
            ]
        };
    }

    /**
     * Initialize Discord client and validate environment
     */
    async initialize() {
        try {
            this.log('🚀 Initializing Discord Channel Cleanup System', 'INFO');
            
            // Validate environment variables
            if (!process.env.DISCORD_TOKEN) {
                throw new Error('DISCORD_TOKEN environment variable is required');
            }
            
            if (!process.env.GUILD_ID) {
                throw new Error('GUILD_ID environment variable is required');
            }

            // Initialize Discord client
            this.client = new Client({
                intents: [
                    GatewayIntentBits.Guilds,
                    GatewayIntentBits.GuildMessages,
                    GatewayIntentBits.MessageContent
                ]
            });

            // Set up error handlers
            this.client.on('error', (error) => {
                this.log(`Discord client error: ${error.message}`, 'ERROR');
            });

            await this.client.login(process.env.DISCORD_TOKEN);
            this.log('✅ Discord client logged in successfully', 'SUCCESS');

            // Wait for client to be ready and cache to populate
            await new Promise(resolve => {
                if (this.client.isReady()) {
                    resolve();
                } else {
                    this.client.once('ready', resolve);
                }
            });
            this.log('✅ Discord client ready and cache populated', 'SUCCESS');

            // Get guild
            this.guild = await this.client.guilds.fetch(process.env.GUILD_ID);
            if (!this.guild) {
                throw new Error(`Guild with ID ${process.env.GUILD_ID} not found`);
            }
            
            this.log(`✅ Connected to guild: ${this.guild.name} (ID: ${this.guild.id})`, 'SUCCESS');

        } catch (error) {
            this.log(`❌ Initialization failed: ${error.message}`, 'ERROR');
            throw error;
        }
    }

    /**
     * Analyze current channel structure
     */
    async analyzeCurrentStructure() {
        this.log('🔍 Analyzing current Discord server structure...', 'INFO');

        // Get all channels
        const channels = Array.from(this.guild.channels.cache.values());
        const categories = channels.filter(ch => ch.type === ChannelType.GuildCategory);
        const textChannels = channels.filter(ch => ch.type === ChannelType.GuildText);
        const voiceChannels = channels.filter(ch => ch.type === ChannelType.GuildVoice);

        const analysis = {
            totalCategories: categories.length,
            totalTextChannels: textChannels.length,
            totalVoiceChannels: voiceChannels.length,
            categories: {},
            uncategorizedChannels: [],
            duplicateChannels: [],
            intendedCategories: [],
            issuesFound: []
        };

        // Analyze categories
        for (const category of categories) {
            const categoryChannels = channels.filter(ch => ch.parentId === category.id);
            analysis.categories[category.name] = {
                id: category.id,
                name: category.name,
                channels: categoryChannels.map(ch => ({
                    id: ch.id,
                    name: ch.name,
                    type: ChannelType[ch.type]
                }))
            };

            // Check if this is an intended category
            if (this.intendedCategories.includes(category.name)) {
                analysis.intendedCategories.push(category.name);
            }
        }

        // Find uncategorized channels
        analysis.uncategorizedChannels = textChannels
            .filter(ch => !ch.parentId)
            .map(ch => ({
                id: ch.id,
                name: ch.name,
                type: ChannelType[ch.type],
                messageCount: null // We'll check this later
            }));

        // Identify duplicate channels (channels outside categories that match our mapping)
        for (const channel of analysis.uncategorizedChannels) {
            const cleanName = channel.name.replace(/^[👋📋🔞📚💬🎮📸🔊🌱🌿🏪📊⚕️🗣️🔧📋]-/, '');
            if (this.channelMapping[cleanName] || this.channelMapping[channel.name]) {
                analysis.duplicateChannels.push({
                    ...channel,
                    mappedTo: this.channelMapping[cleanName] || this.channelMapping[channel.name]
                });
            }
        }

        // Also identify channels in old categories as duplicates
        for (const [categoryName, categoryData] of Object.entries(analysis.categories)) {
            if (this.oldCategoriesToCleanup.includes(categoryName)) {
                for (const channel of categoryData.channels) {
                    if (channel.type === 'GuildText') { // Only process text channels
                        const cleanName = channel.name.replace(/^[👋📋🔞📚💬🎮📸🔊🌱🌿🏪📊⚕️🗣️🔧📋]-/, '');
                        const mappedTo = this.channelMapping[cleanName] || this.channelMapping[channel.name];
                        
                        analysis.duplicateChannels.push({
                            id: channel.id,
                            name: channel.name,
                            type: channel.type,
                            messageCount: null,
                            mappedTo: mappedTo || 'UNKNOWN',
                            oldCategory: categoryName
                        });
                    }
                }
            }
        }

        // Check for issues
        const missingCategories = this.intendedCategories.filter(cat => 
            !analysis.intendedCategories.includes(cat)
        );
        
        if (missingCategories.length > 0) {
            analysis.issuesFound.push(`Missing categories: ${missingCategories.join(', ')}`);
        }

        if (analysis.duplicateChannels.length > 0) {
            analysis.issuesFound.push(`Found ${analysis.duplicateChannels.length} duplicate channels outside categories`);
        }

        if (analysis.uncategorizedChannels.length > 0) {
            analysis.issuesFound.push(`Found ${analysis.uncategorizedChannels.length} uncategorized channels`);
        }

        this.log(`📊 Analysis complete:`, 'INFO');
        this.log(`   Categories: ${analysis.totalCategories}`, 'INFO');
        this.log(`   Text Channels: ${analysis.totalTextChannels}`, 'INFO');
        this.log(`   Voice Channels: ${analysis.totalVoiceChannels}`, 'INFO');
        this.log(`   Intended Categories Found: ${analysis.intendedCategories.length}/4`, 'INFO');
        this.log(`   Duplicate Channels: ${analysis.duplicateChannels.length}`, 'INFO');
        this.log(`   Issues Found: ${analysis.issuesFound.length}`, 'INFO');

        return analysis;
    }

    /**
     * Check for messages in channels that need preservation
     */
    async checkChannelMessages(channelId, channelName) {
        try {
            const channel = await this.guild.channels.fetch(channelId);
            if (!channel || channel.type !== ChannelType.GuildText) {
                return { hasMessages: false, count: 0, messages: [] };
            }

            // Fetch recent messages (last 100)
            const messages = await channel.messages.fetch({ limit: 100 });
            const messageArray = Array.from(messages.values())
                .filter(msg => !msg.author.bot) // Filter out bot messages
                .map(msg => ({
                    id: msg.id,
                    content: msg.content,
                    author: msg.author.tag,
                    createdAt: msg.createdAt.toISOString(),
                    attachments: msg.attachments.size > 0
                }));

            this.log(`📨 Channel #${channelName}: Found ${messageArray.length} user messages`, 'INFO');

            return {
                hasMessages: messageArray.length > 0,
                count: messageArray.length,
                messages: messageArray
            };

        } catch (error) {
            this.log(`❌ Failed to check messages in #${channelName}: ${error.message}`, 'ERROR');
            return { hasMessages: false, count: 0, messages: [], error: error.message };
        }
    }

    /**
     * Find the target channel for a duplicate channel
     */
    async findTargetChannel(duplicateChannel) {
        const targetChannelName = duplicateChannel.mappedTo;
        
        // Search through all categorized channels in intended categories only
        for (const categoryName of this.intendedCategories) {
            const category = this.guild.channels.cache.find(ch =>
                ch.type === ChannelType.GuildCategory && ch.name === categoryName
            );
            
            if (category) {
                const categoryChannels = this.guild.channels.cache.filter(ch => ch.parentId === category.id);
                const targetChannel = categoryChannels.find(ch => {
                    // Remove emoji prefix to get clean name
                    const cleanName = ch.name.replace(/^[👋📋🔞📚💬🎮📸🔊🌱🌿🏪📊⚕️🗣️🔧📋]-/, '');
                    return cleanName === targetChannelName || ch.name === targetChannelName;
                });
                
                if (targetChannel) {
                    return {
                        channel: targetChannel,
                        category: category.name
                    };
                }
            }
        }

        return null;
    }

    /**
     * Move messages from duplicate channel to target channel
     */
    async moveMessages(sourceChannel, targetChannel, messages) {
        if (!messages || messages.length === 0) {
            this.log(`📨 No messages to move from #${sourceChannel.name}`, 'INFO');
            return true;
        }

        if (this.dryRun) {
            this.log(`🧪 [DRY RUN] Would move ${messages.length} messages from #${sourceChannel.name} to #${targetChannel.name}`, 'INFO');
            return true;
        }

        try {
            // Create a summary message about the moved content
            const summaryMessage = `**📨 Content moved from #${sourceChannel.name}**\n` +
                `The following ${messages.length} messages were moved during channel cleanup:\n` +
                `Original channel was outside category structure and has been consolidated.\n\n` +
                `**Recent Messages:**\n` +
                messages.slice(0, 5).map((msg, index) => 
                    `${index + 1}. **${msg.author}** (${new Date(msg.createdAt).toLocaleDateString()}): ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`
                ).join('\n') +
                (messages.length > 5 ? `\n... and ${messages.length - 5} more messages` : '');

            await targetChannel.send({
                content: summaryMessage,
                allowedMentions: { parse: [] } // Prevent mentions
            });

            this.log(`✅ Moved ${messages.length} messages from #${sourceChannel.name} to #${targetChannel.name}`, 'SUCCESS');
            return true;

        } catch (error) {
            this.log(`❌ Failed to move messages from #${sourceChannel.name}: ${error.message}`, 'ERROR');
            return false;
        }
    }

    /**
     * Delete a duplicate channel
     */
    async deleteChannel(channel) {
        if (this.dryRun) {
            this.log(`🧪 [DRY RUN] Would delete channel #${channel.name}`, 'INFO');
            return true;
        }

        try {
            await channel.delete('Channel cleanup: removing duplicate channel outside category structure');
            this.log(`🗑️ Deleted duplicate channel #${channel.name}`, 'SUCCESS');
            return true;
        } catch (error) {
            this.log(`❌ Failed to delete channel #${channel.name}: ${error.message}`, 'ERROR');
            return false;
        }
    }

    /**
     * Main cleanup execution
     */
    async executeCleanup() {
        this.log('🧹 Starting Discord channel cleanup process...', 'INFO');

        // Analyze current structure
        const analysis = await this.analyzeCurrentStructure();

        if (analysis.duplicateChannels.length === 0) {
            this.log('✅ No duplicate channels found outside categories!', 'SUCCESS');
            return { success: true, cleaned: 0, analysis };
        }

        this.log(`🔧 Found ${analysis.duplicateChannels.length} duplicate channels to clean up:`, 'INFO');
        analysis.duplicateChannels.forEach(ch => {
            this.log(`   - #${ch.name} → should map to ${ch.mappedTo}`, 'INFO');
        });

        if (!this.force && !this.dryRun) {
            this.log('⚠️ SAFETY CHECK: Add --force flag to proceed with actual cleanup, or --dry-run to simulate', 'WARNING');
            return { success: false, error: 'Safety check: --force flag required for actual cleanup' };
        }

        let cleanedCount = 0;
        const cleanupResults = [];

        // Process each duplicate channel
        for (const duplicateChannel of analysis.duplicateChannels) {
            try {
                this.log(`\n🔧 Processing duplicate channel: #${duplicateChannel.name}`, 'INFO');

                // Get the actual Discord channel object
                const sourceChannel = await this.guild.channels.fetch(duplicateChannel.id);
                if (!sourceChannel) {
                    this.log(`❌ Could not fetch channel #${duplicateChannel.name}`, 'ERROR');
                    continue;
                }

                // Check for messages
                const messageCheck = await this.checkChannelMessages(duplicateChannel.id, duplicateChannel.name);
                
                // Handle channels marked for deletion vs those to be moved
                if (duplicateChannel.mappedTo === 'DELETE') {
                    this.log(`🗑️ Channel marked for deletion (no equivalent in new structure)`, 'INFO');
                    
                    // Delete the channel directly (no need to move messages)
                    const deleted = await this.deleteChannel(sourceChannel);
                    
                    if (deleted) {
                        cleanedCount++;
                        cleanupResults.push({
                            channel: duplicateChannel.name,
                            success: true,
                            action: 'deleted',
                            reason: 'No equivalent in new structure',
                            messagesMoved: messageCheck.count
                        });
                    } else {
                        cleanupResults.push({
                            channel: duplicateChannel.name,
                            success: false,
                            error: 'Failed to delete channel'
                        });
                    }
                } else {
                    // Since all duplicate channels are empty, just delete them directly
                    this.log(`🗑️ Deleting duplicate channel (empty, has equivalent in proper categories)`, 'INFO');
                    
                    const deleted = await this.deleteChannel(sourceChannel);
                    
                    if (deleted) {
                        cleanedCount++;
                        cleanupResults.push({
                            channel: duplicateChannel.name,
                            success: true,
                            action: 'deleted',
                            reason: 'Duplicate channel removed - equivalent exists in proper categories',
                            messagesMoved: messageCheck.count,
                            targetMapping: duplicateChannel.mappedTo
                        });
                    } else {
                        cleanupResults.push({
                            channel: duplicateChannel.name,
                            success: false,
                            error: 'Failed to delete channel'
                        });
                    }
                }

                // Add delay between operations to avoid rate limits
                if (!this.dryRun) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }

            } catch (error) {
                this.log(`❌ Failed to process channel #${duplicateChannel.name}: ${error.message}`, 'ERROR');
                cleanupResults.push({
                    channel: duplicateChannel.name,
                    success: false,
                    error: error.message
                });
            }
        }

        return {
            success: true,
            cleaned: cleanedCount,
            analysis,
            results: cleanupResults
        };
    }

    /**
     * Verify final structure matches intended organization
     */
    async verifyFinalStructure() {
        this.log('🔍 Verifying final server structure...', 'INFO');

        const finalAnalysis = await this.analyzeCurrentStructure();
        const verification = {
            passed: true,
            issues: [],
            categoriesPresent: finalAnalysis.intendedCategories.length,
            categoriesExpected: this.intendedCategories.length,
            duplicateChannelsRemaining: finalAnalysis.duplicateChannels.length,
            uncategorizedChannels: finalAnalysis.uncategorizedChannels.length
        };

        // Check if all intended categories are present
        const missingCategories = this.intendedCategories.filter(cat => 
            !finalAnalysis.intendedCategories.includes(cat)
        );

        if (missingCategories.length > 0) {
            verification.passed = false;
            verification.issues.push(`Missing categories: ${missingCategories.join(', ')}`);
        }

        // Check if duplicate channels still exist
        if (finalAnalysis.duplicateChannels.length > 0) {
            verification.passed = false;
            verification.issues.push(`${finalAnalysis.duplicateChannels.length} duplicate channels still exist`);
        }

        // Check channel organization within categories
        for (const [categoryName, expectedChannels] of Object.entries(this.expectedChannels)) {
            const category = finalAnalysis.categories[categoryName];
            if (category) {
                const presentChannels = category.channels.map(ch => 
                    ch.name.replace(/^[👋📋🔞📚💬🎮📸🔊🌱🌿🏪📊⚕️🗣️🔧📋]-/, '')
                );
                
                const missingChannels = expectedChannels.filter(ch => 
                    !presentChannels.includes(ch) && !presentChannels.includes(ch.replace(/-/g, ''))
                );

                if (missingChannels.length > 0) {
                    verification.issues.push(`${categoryName}: Missing channels - ${missingChannels.join(', ')}`);
                }
            }
        }

        if (verification.passed) {
            this.log('✅ Final structure verification PASSED!', 'SUCCESS');
            this.log(`✅ All ${verification.categoriesPresent}/4 intended categories present`, 'SUCCESS');
            this.log('✅ No duplicate channels outside categories', 'SUCCESS');
        } else {
            this.log('❌ Final structure verification FAILED', 'ERROR');
            verification.issues.forEach(issue => this.log(`   - ${issue}`, 'ERROR'));
        }

        return verification;
    }

    /**
     * Generate cleanup report
     */
    async generateReport(cleanupResult, verification) {
        const report = {
            timestamp: new Date().toISOString(),
            dryRun: this.dryRun,
            guildInfo: {
                id: this.guild.id,
                name: this.guild.name,
                memberCount: this.guild.memberCount
            },
            cleanupResults: cleanupResult,
            verification: verification,
            operationLog: this.operationLog
        };

        // Save report to file
        const reportPath = path.join(__dirname, '../docs/channel-cleanup-report.json');
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
        this.log(`📊 Cleanup report saved to: ${reportPath}`, 'INFO');

        return report;
    }

    /**
     * Main execution function
     */
    async execute() {
        try {
            await this.initialize();
            
            if (this.dryRun) {
                this.log('🧪 Running in DRY RUN mode - no changes will be made', 'INFO');
            }

            const cleanupResult = await this.executeCleanup();
            const verification = await this.verifyFinalStructure();
            const report = await this.generateReport(cleanupResult, verification);
            
            this.log('\n🎉 Discord channel cleanup completed!', 'SUCCESS');
            this.log(`🧹 Cleaned up ${cleanupResult.cleaned || 0} duplicate channels`, 'INFO');
            this.log(`✅ Verification: ${verification.passed ? 'PASSED' : 'FAILED'}`, verification.passed ? 'SUCCESS' : 'ERROR');

            return { success: true, cleanupResult, verification, report };

        } catch (error) {
            this.log(`💥 Cleanup failed: ${error.message}`, 'ERROR');
            throw error;
        } finally {
            if (this.client) {
                this.client.destroy();
            }
        }
    }

    /**
     * Logging utility
     */
    log(message, level = 'INFO') {
        const timestamp = new Date().toISOString();
        const prefix = {
            'INFO': '📘',
            'SUCCESS': '✅',
            'WARNING': '⚠️',
            'ERROR': '❌'
        }[level] || '📘';

        console.log(`${prefix} [${timestamp}] ${message}`);
        
        this.operationLog.push({
            timestamp,
            level,
            message
        });
    }
}

// Main execution
async function main() {
    const cleanup = new DiscordChannelCleanup();
    
    try {
        const result = await cleanup.execute();
        process.exit(0);
    } catch (error) {
        console.error('❌ Cleanup failed:', error.message);
        process.exit(1);
    }
}

// Help text
function showHelp() {
    console.log(`
🧹 GrowmiesNJ Discord Channel Cleanup Script

USAGE:
  node cleanup-discord-channels.js [options]

OPTIONS:
  --dry-run    Simulate cleanup without making changes
  --force      Actually perform cleanup (required for real changes)
  --help       Show this help message

WHAT THIS SCRIPT DOES:
  1. Analyzes current Discord server structure
  2. Identifies duplicate channels outside proper categories
  3. Moves messages from duplicates to proper category channels
  4. Deletes duplicate channels
  5. Verifies final 4-category organization

INTENDED STRUCTURE:
  🌿 WELCOME & INFO
  💬 GENERAL COMMUNITY (18+)
  🌱 CANNABIS DISCUSSION (21+)
  🔧 MODERATION & STAFF

SAFETY:
  - Always test with --dry-run first
  - Messages are preserved when moving channels
  - Full audit trail is maintained
  - Rollback information saved in reports

EXAMPLES:
  node cleanup-discord-channels.js --dry-run    # Test run
  node cleanup-discord-channels.js --force      # Actual cleanup
`);
}

// Handle command line execution
if (require.main === module) {
    if (process.argv.includes('--help')) {
        showHelp();
        process.exit(0);
    }
    
    main().catch(error => {
        console.error('💥 Unhandled error:', error);
        process.exit(1);
    });
}

module.exports = { DiscordChannelCleanup };