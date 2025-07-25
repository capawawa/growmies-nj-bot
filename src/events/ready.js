const { Events } = require('discord.js');
const { WelcomeEmbeds } = require('../utils/embeds');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`🚀 Bot is ready! Logged in as ${client.user.tag}`);
        console.log(`📊 Connected to ${client.guilds.cache.size} guild(s)`);
        console.log(`👥 Serving ${client.users.cache.size} user(s)`);
        console.log(`📝 Loaded ${client.commands.size} command(s)`);
        
        // Set bot status
        client.user.setActivity('Growmies NJ Community 🌿', { type: 'WATCHING' });
        
        // Setup welcome channel content for each guild
        await setupWelcomeChannels(client);
        
        console.log('✅ Growmies NJ Bot initialization complete!');
    },
};

/**
 * Setup welcome channel content for all guilds
 * @param {Client} client - Discord client
 */
async function setupWelcomeChannels(client) {
    try {
        console.log('🏗️ Setting up welcome channels...');
        
        for (const [guildId, guild] of client.guilds.cache) {
            try {
                await setupGuildWelcomeChannel(guild);
            } catch (guildError) {
                console.error(`❌ Failed to setup welcome channel for ${guild.name}:`, guildError);
            }
        }
        
        console.log('✅ Welcome channel setup completed');
    } catch (error) {
        console.error('❌ Error setting up welcome channels:', error);
    }
}

/**
 * Setup welcome channel content for a specific guild
 * @param {Guild} guild - Discord guild
 */
async function setupGuildWelcomeChannel(guild) {
    try {
        // Find welcome channel
        const welcomeChannel = await findWelcomeChannel(guild);
        if (!welcomeChannel) {
            console.warn(`⚠️ No welcome channel found for ${guild.name} - skipping setup`);
            return;
        }

        // Check if welcome embeds already exist (avoid duplicates)
        const messages = await welcomeChannel.messages.fetch({ limit: 50 });
        const botMessages = messages.filter(msg => msg.author.id === guild.members.me.id);
        
        // Look for existing embed messages
        const hasWelcomeEmbeds = botMessages.some(msg =>
            msg.embeds.some(embed =>
                embed.title?.includes('Server Guide') ||
                embed.title?.includes('Community Rules') ||
                embed.title?.includes('Age Verification')
            )
        );

        if (hasWelcomeEmbeds) {
            console.log(`📋 Welcome embeds already exist in ${welcomeChannel.name} for ${guild.name}`);
            return;
        }

        console.log(`📝 Setting up welcome embeds in ${welcomeChannel.name} for ${guild.name}`);

        // Send server guide embed
        const serverGuideEmbed = WelcomeEmbeds.createServerGuideEmbed(guild);
        await welcomeChannel.send({ embeds: [serverGuideEmbed] });
        
        // Add delay to prevent rate limiting
        await sleep(1000);

        // Send community rules embed
        const rulesEmbed = WelcomeEmbeds.createRulesEmbed(guild);
        await welcomeChannel.send({ embeds: [rulesEmbed] });
        
        // Add delay to prevent rate limiting
        await sleep(1000);

        // Send verification instructions embed
        const verificationEmbed = WelcomeEmbeds.createVerificationInstructionsEmbed(guild);
        await welcomeChannel.send({ embeds: [verificationEmbed] });

        console.log(`✅ Welcome channel setup completed for ${guild.name}`);

    } catch (error) {
        console.error(`❌ Error setting up welcome channel for ${guild.name}:`, error);
        throw error;
    }
}

/**
 * Find the welcome channel in the guild
 * @param {Guild} guild - Discord guild
 * @returns {Promise<TextChannel|null>} - Welcome channel or null if not found
 */
async function findWelcomeChannel(guild) {
    try {
        // Try multiple common welcome channel names
        const welcomeChannelNames = [
            'welcome',
            'general',
            'lobby',
            'introductions',
            'new-members',
            'welcome-zone'
        ];

        // First try to find by exact name match
        for (const channelName of welcomeChannelNames) {
            const channel = guild.channels.cache.find(ch =>
                ch.name.toLowerCase() === channelName && ch.isTextBased()
            );
            if (channel) {
                console.log(`📍 Found welcome channel: ${channel.name}`);
                return channel;
            }
        }

        // Try to find by partial name match
        for (const channelName of welcomeChannelNames) {
            const channel = guild.channels.cache.find(ch =>
                ch.name.toLowerCase().includes(channelName) && ch.isTextBased()
            );
            if (channel) {
                console.log(`📍 Found welcome channel by partial match: ${channel.name}`);
                return channel;
            }
        }

        // Fallback to system channel if set
        if (guild.systemChannel) {
            console.log(`📍 Using system channel as fallback: ${guild.systemChannel.name}`);
            return guild.systemChannel;
        }

        // Last resort - use first text channel where bot can send messages
        const firstTextChannel = guild.channels.cache.find(ch =>
            ch.isTextBased() &&
            ch.permissionsFor(guild.members.me).has(['SendMessages', 'EmbedLinks'])
        );

        if (firstTextChannel) {
            console.log(`📍 Using first available text channel: ${firstTextChannel.name}`);
            return firstTextChannel;
        }

        console.warn('⚠️ No suitable welcome channel found');
        return null;

    } catch (error) {
        console.error('❌ Error finding welcome channel:', error);
        return null;
    }
}

/**
 * Utility function to add delay between operations
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}