const { Client, GatewayIntentBits, ChannelType, PermissionFlagsBits } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

class SafeDiscordServerConfigurator {
    constructor() {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildModeration,
                GatewayIntentBits.MessageContent
            ]
        });

        this.guild = null;
        this.roles = new Map();
        this.categories = new Map();
        this.channels = new Map();
        
        // Essential roles needed for cannabis compliance
        this.essentialRoles = [
            { name: 'Admin', color: '#FF0000', permissions: ['Administrator'], hoist: true },
            { name: 'Mod Team', color: '#FF8C00', permissions: ['ManageChannels', 'ManageRoles', 'KickMembers', 'BanMembers', 'ManageMessages', 'MentionEveryone'], hoist: true },
            { name: 'Verified 21+', color: '#00CED1', permissions: ['SendMessages', 'ViewChannel', 'ReadMessageHistory'], hoist: false },
            { name: 'Growmie', color: '#00FF00', permissions: ['SendMessages', 'ViewChannel', 'ReadMessageHistory', 'UseExternalEmojis', 'AddReactions'], hoist: true }
        ];

        // Essential channels for basic functionality
        this.essentialChannels = [
            { category: 'General', name: 'welcome', type: ChannelType.GuildText, topic: 'Welcome to Growmies NJ! 🌱' },
            { category: 'General', name: 'rules', type: ChannelType.GuildText, topic: 'Server rules - Must be 21+ for cannabis content' },
            { category: 'General', name: 'age-verification', type: ChannelType.GuildText, topic: 'Verify your age (21+) here' },
            { category: 'General', name: 'general-chat', type: ChannelType.GuildText, topic: 'General conversation' },
            { category: 'Cannabis 21+', name: 'growing-discussion', type: ChannelType.GuildText, topic: 'Cannabis growing discussions - 21+ only' },
            { category: 'Cannabis 21+', name: 'strain-reviews', type: ChannelType.GuildText, topic: 'Share strain reviews - 21+ only' },
            { category: 'Cannabis 21+', name: 'nj-dispensaries', type: ChannelType.GuildText, topic: 'NJ dispensary reviews' }
        ];
    }

    async initialize() {
        console.log('🚀 Initializing Safe Discord Server Configurator...');
        
        await this.client.login(process.env.DISCORD_BOT_TOKEN);
        
        this.guild = await this.client.guilds.fetch(process.env.DISCORD_SERVER_ID);
        console.log(`✅ Connected to guild: ${this.guild.name} (${this.guild.memberCount} members)`);
        
        return this;
    }

    async ensureEssentialRoles() {
        console.log('🛡️ Ensuring essential roles exist...');
        
        const existingRoles = await this.guild.roles.fetch();
        
        for (const roleConfig of this.essentialRoles) {
            const existingRole = existingRoles.find(role => role.name === roleConfig.name);
            
            if (existingRole) {
                console.log(`✅ Role already exists: ${roleConfig.name}`);
                this.roles.set(roleConfig.name, existingRole);
            } else {
                try {
                    const permissionFlags = roleConfig.permissions.map(perm => PermissionFlagsBits[perm]);
                    
                    const role = await this.guild.roles.create({
                        name: roleConfig.name,
                        color: roleConfig.color,
                        permissions: permissionFlags,
                        hoist: roleConfig.hoist,
                        mentionable: true,
                        reason: 'Growmies NJ essential role creation'
                    });
                    
                    this.roles.set(roleConfig.name, role);
                    console.log(`✅ Created role: ${roleConfig.name}`);
                    
                    // Rate limiting
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (error) {
                    console.error(`❌ Failed to create role ${roleConfig.name}: ${error.message}`);
                }
            }
        }
    }

    async ensureEssentialChannels() {
        console.log('📁 Ensuring essential channels exist...');
        
        const existingChannels = await this.guild.channels.fetch();
        const existingCategories = existingChannels.filter(channel => channel.type === ChannelType.GuildCategory);
        
        // Group channels by category
        const channelsByCategory = {};
        for (const channelConfig of this.essentialChannels) {
            if (!channelsByCategory[channelConfig.category]) {
                channelsByCategory[channelConfig.category] = [];
            }
            channelsByCategory[channelConfig.category].push(channelConfig);
        }
        
        // Process each category
        for (const [categoryName, channels] of Object.entries(channelsByCategory)) {
            let category = existingCategories.find(cat => cat.name === categoryName);
            
            // Create category if it doesn't exist
            if (!category) {
                try {
                    category = await this.guild.channels.create({
                        name: categoryName,
                        type: ChannelType.GuildCategory,
                        reason: 'Growmies NJ essential category creation'
                    });
                    console.log(`📁 Created category: ${categoryName}`);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (error) {
                    console.error(`❌ Failed to create category ${categoryName}: ${error.message}`);
                    continue;
                }
            } else {
                console.log(`✅ Category already exists: ${categoryName}`);
            }
            
            this.categories.set(categoryName, category);
            
            // Set category permissions for cannabis compliance
            await this.setCategoryPermissions(category, categoryName);
            
            // Create channels in this category
            for (const channelConfig of channels) {
                const existingChannel = existingChannels.find(channel => 
                    channel.name === channelConfig.name && channel.parent?.id === category.id
                );
                
                if (existingChannel) {
                    console.log(`✅ Channel already exists: ${channelConfig.name}`);
                    this.channels.set(`${categoryName}:${channelConfig.name}`, existingChannel);
                } else {
                    try {
                        const channel = await this.guild.channels.create({
                            name: channelConfig.name,
                            type: channelConfig.type,
                            parent: category.id,
                            topic: channelConfig.topic || null,
                            reason: 'Growmies NJ essential channel creation'
                        });
                        
                        this.channels.set(`${categoryName}:${channelConfig.name}`, channel);
                        console.log(`📝 Created channel: ${channelConfig.name} in ${categoryName}`);
                        
                        // Set specific channel permissions
                        await this.setChannelPermissions(channel, categoryName, channelConfig.name);
                        
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    } catch (error) {
                        console.error(`❌ Failed to create channel ${channelConfig.name}: ${error.message}`);
                    }
                }
            }
        }
    }

    async setCategoryPermissions(category, categoryName) {
        const everyoneRole = this.guild.roles.everyone;
        const verified21Role = this.roles.get('Verified 21+');
        const adminRole = this.roles.get('Admin');
        const modRole = this.roles.get('Mod Team');
        
        try {
            // Cannabis 21+ category requires age verification
            if (categoryName === 'Cannabis 21+') {
                await category.permissionOverwrites.set([
                    {
                        id: everyoneRole.id,
                        deny: [PermissionFlagsBits.ViewChannel]
                    },
                    {
                        id: verified21Role.id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
                    },
                    {
                        id: adminRole.id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageMessages]
                    },
                    {
                        id: modRole.id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages]
                    }
                ]);
                console.log(`🔒 Set 21+ restrictions for category: ${categoryName}`);
            }
        } catch (error) {
            console.error(`❌ Failed to set permissions for category ${categoryName}: ${error.message}`);
        }
    }

    async setChannelPermissions(channel, categoryName, channelName) {
        const everyoneRole = this.guild.roles.everyone;
        const growmieRole = this.roles.get('Growmie');
        
        try {
            // Age verification channel - special permissions
            if (channelName === 'age-verification') {
                await channel.permissionOverwrites.set([
                    {
                        id: everyoneRole.id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.UseApplicationCommands]
                    }
                ]);
                console.log(`🔞 Set age verification permissions for: ${channelName}`);
            }
            
            // Rules channel - read-only for regular users
            if (channelName === 'rules' || channelName === 'welcome') {
                await channel.permissionOverwrites.edit(everyoneRole.id, {
                    SendMessages: false,
                    AddReactions: true
                });
                console.log(`📋 Set read-only permissions for: ${channelName}`);
            }
            
        } catch (error) {
            console.error(`❌ Failed to set permissions for channel ${channelName}: ${error.message}`);
        }
    }

    async saveConfiguration() {
        console.log('💾 Saving server configuration...');
        
        const config = {
            guildId: this.guild.id,
            guildName: this.guild.name,
            memberCount: this.guild.memberCount,
            configuredAt: new Date().toISOString(),
            roles: Object.fromEntries(
                Array.from(this.roles.entries()).map(([name, role]) => [name, role.id])
            ),
            categories: Object.fromEntries(
                Array.from(this.categories.entries()).map(([name, category]) => [name, category.id])
            ),
            channels: Object.fromEntries(
                Array.from(this.channels.entries()).map(([name, channel]) => [name, channel.id])
            )
        };
        
        const configPath = path.join(__dirname, '..', 'config', 'server-configuration.json');
        await fs.mkdir(path.dirname(configPath), { recursive: true });
        await fs.writeFile(configPath, JSON.stringify(config, null, 2));
        
        console.log('✅ Configuration saved to:', configPath);
        return config;
    }

    async execute() {
        try {
            console.log('🌱 Starting Safe Growmies NJ Discord Server Configuration...');
            
            await this.initialize();
            await this.ensureEssentialRoles();
            await this.ensureEssentialChannels();
            
            const config = await this.saveConfiguration();
            
            console.log('🎉 Safe server configuration completed successfully!');
            console.log(`📊 Ensured ${this.roles.size} roles, ${this.categories.size} categories, and ${this.channels.size} channels`);
            console.log(`👥 Server has ${this.guild.memberCount} members`);
            
            return config;
        } catch (error) {
            console.error('❌ Safe server configuration failed:', error.message);
            throw error;
        } finally {
            this.client.destroy();
        }
    }
}

// Execute if run directly
if (require.main === module) {
    const configurator = new SafeDiscordServerConfigurator();
    configurator.execute()
        .then((config) => {
            console.log('✅ Safe configuration completed:', config.guildName);
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Safe configuration failed:', error.message);
            process.exit(1);
        });
}

module.exports = SafeDiscordServerConfigurator;