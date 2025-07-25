const { Client, GatewayIntentBits, ChannelType, PermissionFlagsBits } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

class DiscordServerConfigurator {
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
        
        // Role hierarchy definition (Cannabis compliance: 21+ age verification required)
        this.roleHierarchy = [
            { name: 'Admin', color: '#FF0000', permissions: ['Administrator'], hoist: true },
            { name: 'Mod Team', color: '#FF8C00', permissions: ['ManageChannels', 'ManageRoles', 'KickMembers', 'BanMembers', 'ManageMessages', 'MentionEveryone'], hoist: true },
            { name: 'Growmie', color: '#00FF00', permissions: ['SendMessages', 'ViewChannel', 'ReadMessageHistory', 'UseExternalEmojis', 'AddReactions'], hoist: true },
            { name: 'Grower', color: '#32CD32', permissions: ['SendMessages', 'ViewChannel', 'ReadMessageHistory', 'UseExternalEmojis', 'AddReactions'], hoist: false },
            { name: 'Reviewer', color: '#1E90FF', permissions: ['SendMessages', 'ViewChannel', 'ReadMessageHistory', 'UseExternalEmojis', 'AddReactions'], hoist: false },
            { name: 'Industry', color: '#9932CC', permissions: ['SendMessages', 'ViewChannel', 'ReadMessageHistory', 'UseExternalEmojis', 'AddReactions'], hoist: false },
            { name: 'OG', color: '#FFD700', permissions: ['SendMessages', 'ViewChannel', 'ReadMessageHistory', 'UseExternalEmojis', 'AddReactions'], hoist: false },
            { name: 'Champs', color: '#FF69B4', permissions: ['SendMessages', 'ViewChannel', 'ReadMessageHistory', 'UseExternalEmojis', 'AddReactions'], hoist: false },
            { name: 'Verified 21+', color: '#00CED1', permissions: ['SendMessages', 'ViewChannel', 'ReadMessageHistory'], hoist: false }
        ];

        // 3-zone server structure with cannabis compliance (NJ Law Requirements)
        this.serverStructure = {
            // ZONE 1: PUBLIC ACCESS - No age verification required
            'Zone 1: Public Access': {
                position: 0,
                channels: [
                    // Welcome & Rules channels
                    { name: 'welcome', type: ChannelType.GuildText, topic: 'Welcome to Growmies NJ! Read the rules and verify your age (21+)' },
                    { name: 'rules-and-tos', type: ChannelType.GuildText, topic: 'Server rules and Terms of Service - Must be 21+ to participate' },
                    { name: 'age-verification', type: ChannelType.GuildText, topic: 'Age verification required - Must be 21+ for cannabis discussions' },
                    { name: 'announcements', type: ChannelType.GuildAnnouncement, topic: 'Official server announcements and updates' },
                    // General Discussion channels
                    { name: 'general-chat', type: ChannelType.GuildText, topic: 'General conversation - Cannabis discussions require 21+ verification' },
                    { name: 'introductions', type: ChannelType.GuildText, topic: 'Introduce yourself to the Growmies NJ community' },
                    { name: 'off-topic', type: ChannelType.GuildText, topic: 'Non-cannabis related discussions' },
                    { name: 'memes-and-fun', type: ChannelType.GuildText, topic: 'Share memes and fun content' },
                    // Help & Support channels
                    { name: 'growing-help', type: ChannelType.GuildText, topic: 'Get help with growing problems and issues' },
                    { name: 'plant-problems', type: ChannelType.GuildText, topic: 'Diagnose and solve plant health issues' },
                    { name: 'beginner-questions', type: ChannelType.GuildText, topic: 'Ask beginner growing questions' },
                    { name: 'expert-advice', type: ChannelType.GuildText, topic: 'Get advice from experienced growers' }
                ]
            },
            // ZONE 2: VERIFIED 21+ ONLY - Cannabis content requires age verification
            'Zone 2: Verified 21+ Only': {
                position: 1,
                channels: [
                    // Cannabis Growing channels
                    { name: 'growing-discussion', type: ChannelType.GuildText, topic: 'General cannabis growing discussions - 21+ only' },
                    { name: 'grow-journals', type: ChannelType.GuildText, topic: 'Share your grow progress and journals' },
                    { name: 'nutrients-and-feeding', type: ChannelType.GuildText, topic: 'Nutrients, feeding schedules, and plant health' },
                    { name: 'lighting-and-equipment', type: ChannelType.GuildText, topic: 'Growing equipment, lights, and setup discussions' },
                    { name: 'harvest-and-curing', type: ChannelType.GuildText, topic: 'Harvest timing, drying, and curing techniques' },
                    // Strain Discussion channels
                    { name: 'strain-reviews', type: ChannelType.GuildText, topic: 'Share strain reviews and experiences - 21+ only' },
                    { name: 'strain-recommendations', type: ChannelType.GuildText, topic: 'Get strain recommendations from the community' },
                    { name: 'genetics-and-breeding', type: ChannelType.GuildText, topic: 'Cannabis genetics and breeding discussions' },
                    { name: 'seed-and-clone-trading', type: ChannelType.GuildText, topic: 'Trade seeds and clones (follow NJ laws)' },
                    // NJ Cannabis Scene channels
                    { name: 'nj-dispensaries', type: ChannelType.GuildText, topic: 'New Jersey dispensary reviews and recommendations' },
                    { name: 'nj-cannabis-news', type: ChannelType.GuildText, topic: 'New Jersey cannabis law updates and news' },
                    { name: 'nj-events', type: ChannelType.GuildText, topic: 'Cannabis events and meetups in New Jersey' },
                    { name: 'legal-compliance', type: ChannelType.GuildText, topic: 'NJ cannabis law compliance and regulations' },
                    // Photos & Showcases channels
                    { name: 'plant-photos', type: ChannelType.GuildText, topic: 'Share photos of your cannabis plants' },
                    { name: 'harvest-showcases', type: ChannelType.GuildText, topic: 'Show off your harvest results' },
                    { name: 'setup-tours', type: ChannelType.GuildText, topic: 'Share photos of your growing setups' },
                    { name: 'macro-photography', type: ChannelType.GuildText, topic: 'Close-up photos of buds and trichomes' },
                    // Community Events channels
                    { name: 'competitions', type: ChannelType.GuildText, topic: 'Growing competitions and contests' },
                    { name: 'group-buys', type: ChannelType.GuildText, topic: 'Organize group purchases for equipment/supplies' },
                    { name: 'meetups', type: ChannelType.GuildText, topic: 'Plan and organize community meetups' },
                    { name: 'events-calendar', type: ChannelType.GuildText, topic: 'Community events and important dates' },
                    // Voice Channels
                    { name: 'General Hangout', type: ChannelType.GuildVoice, userLimit: 0 },
                    { name: 'Growing Talk', type: ChannelType.GuildVoice, userLimit: 10 },
                    { name: 'Music & Chill', type: ChannelType.GuildVoice, userLimit: 15 },
                    { name: 'Private Discussion', type: ChannelType.GuildVoice, userLimit: 5 }
                ]
            },
            // ZONE 3: STAFF ONLY - Moderation and administration
            'Zone 3: Staff Only': {
                position: 2,
                channels: [
                    { name: 'mod-chat', type: ChannelType.GuildText, topic: 'Moderator only discussions' },
                    { name: 'mod-logs', type: ChannelType.GuildText, topic: 'Automated moderation logs' },
                    { name: 'reports', type: ChannelType.GuildText, topic: 'User reports and moderation actions' },
                    { name: 'admin-voice', type: ChannelType.GuildVoice, userLimit: 5 }
                ]
            }
        };
    }

    async initialize() {
        console.log('🚀 Initializing Discord Server Configurator...');
        
        await this.client.login(process.env.DISCORD_TOKEN);
        
        this.guild = await this.client.guilds.fetch(process.env.DISCORD_GUILD_ID);
        console.log(`✅ Connected to guild: ${this.guild.name}`);
        
        return this;
    }

    async createRoles() {
        console.log('🛡️ Creating role hierarchy...');
        
        // Clear existing roles (except @everyone and bot roles)
        const existingRoles = await this.guild.roles.fetch();
        for (const [id, role] of existingRoles) {
            if (!role.managed && role.name !== '@everyone') {
                try {
                    await role.delete('Server reconfiguration');
                } catch (error) {
                    console.warn(`⚠️ Could not delete role ${role.name}: ${error.message}`);
                }
            }
        }

        // Create new roles in reverse order (highest permission first)
        for (const roleConfig of this.roleHierarchy.reverse()) {
            try {
                const permissionFlags = roleConfig.permissions.map(perm => PermissionFlagsBits[perm]);
                
                const role = await this.guild.roles.create({
                    name: roleConfig.name,
                    color: roleConfig.color,
                    permissions: permissionFlags,
                    hoist: roleConfig.hoist,
                    mentionable: true,
                    reason: 'Growmies NJ server configuration'
                });
                
                this.roles.set(roleConfig.name, role);
                console.log(`✅ Created role: ${roleConfig.name}`);
                
                // Rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                console.error(`❌ Failed to create role ${roleConfig.name}: ${error.message}`);
            }
        }
        
        // Restore original order
        this.roleHierarchy.reverse();
    }

    async createCategoriesAndChannels() {
        console.log('📁 Creating categories and channels...');
        
        // Clear existing channels and categories
        const existingChannels = await this.guild.channels.fetch();
        for (const [id, channel] of existingChannels) {
            try {
                await channel.delete('Server reconfiguration');
            } catch (error) {
                console.warn(`⚠️ Could not delete channel ${channel.name}: ${error.message}`);
            }
        }

        // Create categories and channels
        for (const [categoryName, categoryConfig] of Object.entries(this.serverStructure)) {
            try {
                // Create category
                const category = await this.guild.channels.create({
                    name: categoryName,
                    type: ChannelType.GuildCategory,
                    position: categoryConfig.position,
                    reason: 'Growmies NJ server configuration'
                });
                
                this.categories.set(categoryName, category);
                console.log(`📁 Created category: ${categoryName}`);
                
                // Set category permissions
                await this.setCategoryPermissions(category, categoryName);
                
                // Create channels within category
                for (const channelConfig of categoryConfig.channels) {
                    const channel = await this.guild.channels.create({
                        name: channelConfig.name,
                        type: channelConfig.type,
                        parent: category.id,
                        topic: channelConfig.topic || null,
                        userLimit: channelConfig.userLimit || null,
                        reason: 'Growmies NJ server configuration'
                    });
                    
                    this.channels.set(`${categoryName}:${channelConfig.name}`, channel);
                    console.log(`📝 Created channel: ${channelConfig.name} in ${categoryName}`);
                    
                    // Set specific channel permissions
                    await this.setChannelPermissions(channel, categoryName, channelConfig.name);
                    
                    // Rate limiting
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                
                // Rate limiting between categories
                await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (error) {
                console.error(`❌ Failed to create category ${categoryName}: ${error.message}`);
            }
        }
    }

    async setCategoryPermissions(category, categoryName) {
        const everyoneRole = this.guild.roles.everyone;
        const modRole = this.roles.get('Mod Team');
        const adminRole = this.roles.get('Admin');
        const verified21Role = this.roles.get('Verified 21+');
        
        try {
            // Default permissions for all categories
            await category.permissionOverwrites.set([
                {
                    id: everyoneRole.id,
                    deny: [PermissionFlagsBits.SendMessages],
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory]
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

            // Special permissions for specific zones
            if (categoryName === 'Zone 3: Staff Only') {
                await category.permissionOverwrites.edit(everyoneRole.id, {
                    ViewChannel: false
                });
            }
            
            // Zone 2 requires 21+ verification for cannabis content
            if (categoryName === 'Zone 2: Verified 21+ Only') {
                await category.permissionOverwrites.edit(everyoneRole.id, {
                    ViewChannel: false,
                    SendMessages: false
                });
                
                await category.permissionOverwrites.create(verified21Role.id, {
                    ViewChannel: true,
                    SendMessages: true,
                    ReadMessageHistory: true
                });
            }
            
        } catch (error) {
            console.error(`❌ Failed to set permissions for category ${categoryName}: ${error.message}`);
        }
    }

    async setChannelPermissions(channel, categoryName, channelName) {
        const everyoneRole = this.guild.roles.everyone;
        const verified21Role = this.roles.get('Verified 21+');
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
            }
            
            // Zone 2 channels - 21+ verification required (already handled by category permissions)
            if (categoryName === 'Zone 2: Verified 21+ Only') {
                // Additional specific channel permissions if needed
                // Category permissions already restrict access to verified 21+ users
            }
            
            // Zone 1 welcome channels - read-only for regular users
            if (categoryName === 'Zone 1: Public Access' && ['welcome', 'rules-and-tos', 'announcements'].includes(channelName)) {
                await channel.permissionOverwrites.edit(everyoneRole.id, {
                    SendMessages: false,
                    AddReactions: true
                });
            }
            
            // Zone 1 general discussion channels - allow verified users to participate
            if (categoryName === 'Zone 1: Public Access' && !['welcome', 'rules-and-tos', 'announcements'].includes(channelName)) {
                await channel.permissionOverwrites.create(growmieRole.id, {
                    SendMessages: true,
                    AddReactions: true,
                    UseExternalEmojis: true
                });
            }
            
        } catch (error) {
            console.error(`❌ Failed to set permissions for channel ${channelName}: ${error.message}`);
        }
    }

    async setupWelcomeScreen() {
        console.log('🎉 Setting up welcome screen...');
        
        try {
            const welcomeChannel = this.channels.get('Zone 1: Public Access:welcome');
            const rulesChannel = this.channels.get('Zone 1: Public Access:rules-and-tos');
            const ageVerificationChannel = this.channels.get('Zone 1: Public Access:age-verification');
            
            await this.guild.editWelcomeScreen({
                enabled: true,
                description: 'Welcome to Growmies NJ! New Jersey\'s premier cannabis growing community. Must be 21+ to participate.',
                welcomeChannels: [
                    {
                        channel: welcomeChannel.id,
                        description: '👋 Start here! Welcome to the community',
                        emoji: '👋'
                    },
                    {
                        channel: rulesChannel.id,
                        description: '📋 Read our rules and guidelines',
                        emoji: '📋'
                    },
                    {
                        channel: ageVerificationChannel.id,
                        description: '🔞 Verify your age (21+ required)',
                        emoji: '🔞'
                    }
                ]
            });
            
            console.log('✅ Welcome screen configured');
        } catch (error) {
            console.error(`❌ Failed to setup welcome screen: ${error.message}`);
        }
    }

    async createSystemChannels() {
        console.log('⚙️ Configuring system channels...');
        
        try {
            const welcomeChannel = this.channels.get('Zone 1: Public Access:welcome');
            const rulesChannel = this.channels.get('Zone 1: Public Access:rules-and-tos');
            
            await this.guild.edit({
                systemChannel: welcomeChannel,
                rulesChannel: rulesChannel,
                systemChannelFlags: ['SuppressJoinNotifications', 'SuppressPremiumSubscriptions']
            });
            
            console.log('✅ System channels configured');
        } catch (error) {
            console.error(`❌ Failed to configure system channels: ${error.message}`);
        }
    }

    async saveConfiguration() {
        console.log('💾 Saving server configuration...');
        
        const config = {
            guildId: this.guild.id,
            guildName: this.guild.name,
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
            console.log('🌱 Starting Growmies NJ Discord Server Configuration...');
            
            await this.initialize();
            await this.createRoles();
            await this.createCategoriesAndChannels();
            await this.setupWelcomeScreen();
            await this.createSystemChannels();
            
            const config = await this.saveConfiguration();
            
            console.log('🎉 Server configuration completed successfully!');
            console.log(`📊 Created ${this.roles.size} roles, ${this.categories.size} categories, and ${this.channels.size} channels`);
            
            return config;
        } catch (error) {
            console.error('❌ Server configuration failed:', error.message);
            throw error;
        } finally {
            this.client.destroy();
        }
    }
}

// Execute if run directly
if (require.main === module) {
    const configurator = new DiscordServerConfigurator();
    configurator.execute()
        .then((config) => {
            console.log('✅ Configuration completed:', config.guildName);
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Configuration failed:', error.message);
            process.exit(1);
        });
}

module.exports = DiscordServerConfigurator;