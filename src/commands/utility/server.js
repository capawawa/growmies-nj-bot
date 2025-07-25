const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('server')
        .setDescription('Display comprehensive server information')
        .setContexts([0]), // Guild only
        
    async execute(interaction) {
        try {
            const guild = interaction.guild;
            const owner = await guild.fetchOwner();
            
            // Get channel counts by type
            const channels = guild.channels.cache;
            const textChannels = channels.filter(c => c.type === ChannelType.GuildText).size;
            const voiceChannels = channels.filter(c => c.type === ChannelType.GuildVoice).size;
            const categories = channels.filter(c => c.type === ChannelType.GuildCategory).size;
            const totalChannels = channels.size;
            
            // Get role information
            const roles = guild.roles.cache;
            const totalRoles = roles.size - 1; // Exclude @everyone role
            
            // Get emoji information
            const emojis = guild.emojis.cache;
            const totalEmojis = emojis.size;
            const animatedEmojis = emojis.filter(emoji => emoji.animated).size;
            const staticEmojis = totalEmojis - animatedEmojis;
            
            // Get verification level
            const verificationLevels = {
                0: 'None',
                1: 'Low',
                2: 'Medium', 
                3: 'High',
                4: 'Very High'
            };
            
            // Get explicit content filter level
            const explicitContentLevels = {
                0: 'Disabled',
                1: 'Members without roles',
                2: 'All members'
            };
            
            // Get server boost information
            const boostLevel = guild.premiumTier;
            const boostCount = guild.premiumSubscriptionCount || 0;
            
            // Calculate server features
            const features = guild.features;
            const hasWelcomeScreen = features.includes('WELCOME_SCREEN_ENABLED');
            const hasVanityURL = features.includes('VANITY_URL');
            const hasDiscoverable = features.includes('DISCOVERABLE');
            
            const serverEmbed = new EmbedBuilder()
                .setTitle(`🌿 ${guild.name} Server Information`)
                .setDescription(`Welcome to the Growmies NJ cannabis community! Here's everything about our server.`)
                .setColor('#2ecc71')
                .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }))
                .addFields(
                    {
                        name: '📊 **Server Statistics**',
                        value: [
                            `👥 **Members:** ${guild.memberCount.toLocaleString()}`,
                            `📅 **Created:** <t:${Math.floor(guild.createdTimestamp / 1000)}:F>`,
                            `👑 **Owner:** ${owner.user.username}`,
                            `🆔 **Server ID:** \`${guild.id}\``
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '📋 **Channels & Organization**',
                        value: [
                            `📝 **Text Channels:** ${textChannels}`,
                            `🔊 **Voice Channels:** ${voiceChannels}`,
                            `📁 **Categories:** ${categories}`,
                            `📊 **Total Channels:** ${totalChannels}`
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '🎭 **Roles & Customization**',
                        value: [
                            `🏷️ **Roles:** ${totalRoles}`,
                            `😀 **Emojis:** ${totalEmojis}`,
                            `🎬 **Animated:** ${animatedEmojis}`,
                            `🖼️ **Static:** ${staticEmojis}`
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '🛡️ **Security & Moderation**',
                        value: [
                            `🔒 **Verification:** ${verificationLevels[guild.verificationLevel]}`,
                            `🚫 **Content Filter:** ${explicitContentLevels[guild.explicitContentFilter]}`,
                            `🔞 **Age Restricted:** ${guild.nsfwLevel > 0 ? 'Yes' : 'No'}`,
                            `⚡ **2FA Requirement:** ${guild.mfaLevel > 0 ? 'Enabled' : 'Disabled'}`
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '⭐ **Server Boosts**',
                        value: [
                            `🚀 **Boost Level:** ${boostLevel}`,
                            `💎 **Boost Count:** ${boostCount}`,
                            `📈 **Booster Role:** ${guild.premiumTier > 0 ? 'Available' : 'None'}`,
                            `🎁 **Perks Active:** ${boostLevel > 0 ? 'Yes' : 'No'}`
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '🌟 **Special Features**',
                        value: [
                            `🚪 **Welcome Screen:** ${hasWelcomeScreen ? 'Enabled' : 'Disabled'}`,
                            `🔗 **Vanity URL:** ${hasVanityURL ? 'Available' : 'None'}`,
                            `🔍 **Discoverable:** ${hasDiscoverable ? 'Yes' : 'No'}`,
                            `🎯 **Community Server:** ${features.includes('COMMUNITY') ? 'Yes' : 'No'}`
                        ].join('\n'),
                        inline: true
                    }
                )
                .addFields(
                    {
                        name: '🌿 **Cannabis Community Features**',
                        value: [
                            `🔞 **Age Verification:** Required (21+)`,
                            `⚖️ **NJ Law Compliance:** Enforced`,
                            `🛡️ **Privacy Protection:** Ephemeral verification`,
                            `📚 **Educational Focus:** Cannabis information & safety`
                        ].join('\n'),
                        inline: false
                    }
                )
                .setFooter({ 
                    text: `Growmies NJ • Cannabis Community | Requested by ${interaction.user.username}`, 
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                })
                .setTimestamp();

            // Add server banner if available
            if (guild.bannerURL()) {
                serverEmbed.setImage(guild.bannerURL({ dynamic: true, size: 1024 }));
            }

            await interaction.reply({ 
                embeds: [serverEmbed],
                ephemeral: false // Public response so everyone can see server info
            });

            console.log(`[SERVER INFO] ${interaction.user.username} (${interaction.user.id}) requested server information in ${guild.name}`);

        } catch (error) {
            console.error('[SERVER COMMAND ERROR]', error);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Error')
                .setDescription('Unable to retrieve server information. Please try again later.')
                .setColor('#e74c3c')
                .setFooter({ text: 'Growmies NJ • Error Handler' })
                .setTimestamp();

            // Try to respond with error message
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ 
                    embeds: [errorEmbed], 
                    ephemeral: true 
                }).catch(console.error);
            } else {
                await interaction.reply({ 
                    embeds: [errorEmbed], 
                    ephemeral: true 
                }).catch(console.error);
            }
        }
    },
};