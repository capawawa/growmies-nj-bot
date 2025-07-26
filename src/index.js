const { Client, Collection, GatewayIntentBits } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config();

// Import health monitoring
const HealthMonitor = require('./health');

// Import database components
const { sequelize, testConnection, initializeAllModels } = require('./database/connection');

// Initialize models with sequelize instance
const models = initializeAllModels();
const { User, AuditLog, GuildSettings, InstagramPost, BotStatus, LevelingConfig } = models;

// Import Instagram RSS service
const instagramRssService = require('./services/instagramRss');

// Database initialization function
async function initializeDatabase() {
    console.log('🗄️ Initializing database connection...');
    
    try {
        // Test database connection
        await testConnection();
        console.log('✅ Database connection established successfully');
        
        // Sync database models (create tables if they don't exist)
        await sequelize.sync({ alter: false }); // Use alter: true in development if needed
        console.log('✅ Database models synchronized');
        
        // Initialize bot status tracking
        const environment = process.env.NODE_ENV || 'production';
        const version = process.env.npm_package_version || '1.0.0';
        
        const botStatus = await BotStatus.getCurrentStatus(environment, version);
        await botStatus.updateStatus({
            status: 'online',
            uptime_seconds: 0,
            last_restart_at: new Date()
        });
        
        console.log(`📊 Bot status tracking initialized for ${environment} environment`);
        
        return true;
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        
        // Log critical error for monitoring
        console.error('🚨 CRITICAL: Bot cannot start without database connection');
        
        // Exit if database is required (production behavior)
        if (process.env.NODE_ENV === 'production') {
            process.exit(1);
        }
        
        return false;
    }
}

// Create a new client instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent
    ]
});

// Create a collection to store commands
client.commands = new Collection();

// Store database models on client for easy access
client.database = {
    sequelize,
    models: {
        User,
        AuditLog,
        GuildSettings,
        InstagramPost,
        BotStatus,
        LevelingConfig
    }
};

// Load commands dynamically
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
    const commandFolders = fs.readdirSync(commandsPath);

    for (const folder of commandFolders) {
        const folderPath = path.join(commandsPath, folder);
        if (fs.statSync(folderPath).isDirectory()) {
            const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
            
            for (const file of commandFiles) {
                const filePath = path.join(folderPath, file);
                try {
                    const command = require(filePath);
                    
                    // Set a new item in the Collection with the key as the command name and value as the exported module
                    if ('data' in command && 'execute' in command) {
                        client.commands.set(command.data.name, command);
                        console.log(`✅ Loaded command: ${command.data.name} from ${folder}/${file}`);
                    } else {
                        console.log(`⚠️  [WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
                    }
                } catch (error) {
                    console.error(`❌ Error loading command ${filePath}:`, error);
                }
            }
        }
    }
}

// Load event handlers
const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        try {
            const event = require(filePath);
            
            if (event.once) {
                client.once(event.name, (...args) => event.execute(...args));
            } else {
                client.on(event.name, (...args) => event.execute(...args));
            }
            
            console.log(`✅ Loaded event: ${event.name} from ${file}`);
        } catch (error) {
            console.error(`❌ Error loading event ${filePath}:`, error);
        }
    }
}

// Global error handling
process.on('unhandledRejection', error => {
    console.error('🚨 Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
    console.error('🚨 Uncaught exception:', error);
    process.exit(1);
});

// Initialize health monitoring
const healthMonitor = new HealthMonitor(client, sequelize);
const HEALTH_PORT = process.env.HEALTH_PORT || 3000;

// Start health monitoring server after bot is ready
client.once('ready', async () => {
    // Initialize database after Discord connection is established
    const databaseInitialized = await initializeDatabase();
    
    if (databaseInitialized) {
        console.log('🌱 GrowmiesNJ Bot fully initialized with database support');
        
        // Initialize guild settings for connected guilds
        for (const guild of client.guilds.cache.values()) {
            try {
                await GuildSettings.findByGuildId(guild.id);
                console.log(`⚙️ Guild settings initialized for: ${guild.name}`);
                
                // Initialize leveling configuration for guild
                await LevelingConfig.findByGuildId(guild.id);
                console.log(`🌿 Cannabis leveling system initialized for: ${guild.name}`);
            } catch (error) {
                console.error(`❌ Failed to initialize guild configuration for ${guild.name}:`, error);
            }
        }
    } else {
        console.warn('⚠️ Bot started without database support (development mode)');
    }
    
    // Set Discord client in Instagram RSS service
    instagramRssService.setDiscordClient(client);
    console.log('📷 Instagram RSS service initialized with Discord client');
    
    healthMonitor.start(HEALTH_PORT);
    console.log(`📊 Health monitoring available at http://localhost:${HEALTH_PORT}/health`);
});

// Track errors for health monitoring and database
client.on('error', async (error) => {
    console.error('Discord client error:', error);
    healthMonitor.incrementErrors();
    
    // Log error to database if available
    try {
        if (client.database && client.database.models.BotStatus) {
            const botStatus = await BotStatus.getCurrentStatus();
            await botStatus.recordError('discord_client_error', error.message, {
                stack: error.stack,
                timestamp: new Date()
            });
        }
    } catch (dbError) {
        console.error('Failed to log error to database:', dbError);
    }
});

// Track command usage and update bot status
client.on('interactionCreate', async (interaction) => {
    if (interaction.isCommand()) {
        healthMonitor.incrementCommands();
        
        // Update bot status metrics
        try {
            if (client.database && client.database.models.BotStatus) {
                const botStatus = await BotStatus.getCurrentStatus();
                const currentMetrics = {
                    active_guilds: client.guilds.cache.size,
                    active_users: client.users.cache.size,
                    discord_latency_ms: client.ws.ping
                };
                await botStatus.updateStatus(currentMetrics);
            }
        } catch (error) {
            console.error('Failed to update bot status metrics:', error);
        }
    }
});

// Graceful shutdown function
async function gracefulShutdown(signal) {
    console.log(`🛑 ${signal} signal received - shutting down gracefully...`);
    
    try {
        // Update bot status to offline
        if (client.database && client.database.models.BotStatus) {
            const botStatus = await BotStatus.getCurrentStatus();
            await botStatus.updateStatus({ status: 'offline' });
            console.log('📊 Bot status updated to offline');
        }
        
        // Stop health monitoring
        healthMonitor.stop();
        console.log('📊 Health monitoring stopped');
        
        // Close database connection
        if (sequelize) {
            await sequelize.close();
            console.log('🗄️ Database connection closed');
        }
        
        // Destroy Discord client
        client.destroy();
        console.log('🤖 Discord client destroyed');
        
        console.log('✅ Graceful shutdown completed');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during graceful shutdown:', error);
        process.exit(1);
    }
}

// Graceful shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Enhanced startup function
async function startBot() {
    console.log('🌱 Starting GrowmiesNJ Discord Bot...');
    console.log('📊 Bot Version: ' + (process.env.npm_package_version || '1.0.0'));
    console.log('🌍 Environment: ' + (process.env.NODE_ENV || 'production'));
    
    try {
        // Login to Discord with your client's token
        await client.login(process.env.DISCORD_TOKEN);
        console.log('🤖 Discord connection established');
    } catch (error) {
        console.error('❌ Failed to connect to Discord:', error);
        process.exit(1);
    }
}

// Start the bot
startBot();