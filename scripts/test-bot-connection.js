const { Client, GatewayIntentBits } = require('discord.js');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Create a new client instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
});

// Bot ready event
client.once('ready', () => {
    console.log('✅ Bot connection test successful!');
    console.log(`📊 Bot Statistics:`);
    console.log(`   - Bot Username: ${client.user.tag}`);
    console.log(`   - Bot ID: ${client.user.id}`);
    console.log(`   - Connected Servers: ${client.guilds.cache.size}`);
    console.log(`   - Server ID: ${process.env.DISCORD_SERVER_ID}`);
    
    // Check if bot is in the expected server
    const expectedServerId = process.env.DISCORD_SERVER_ID;
    const guild = client.guilds.cache.get(expectedServerId);
    
    if (guild) {
        console.log(`✅ Bot is connected to expected server: ${guild.name}`);
        console.log(`   - Server Members: ${guild.memberCount}`);
        console.log(`   - Bot Permissions: ${guild.members.me.permissions.toArray().join(', ')}`);
    } else {
        console.log(`❌ Bot is NOT in the expected server (ID: ${expectedServerId})`);
        console.log(`   Please invite the bot to your server using the appropriate invite link.`);
    }
    
    // Test complete - exit
    console.log('\n🎉 Connection test complete!');
    process.exit(0);
});

// Error handling
client.on('error', (error) => {
    console.error('❌ Bot connection error:', error);
    process.exit(1);
});

// Login timeout
const loginTimeout = setTimeout(() => {
    console.error('❌ Bot login timeout - failed to connect within 30 seconds');
    process.exit(1);
}, 30000);

// Attempt to login
console.log('🔄 Attempting to connect to Discord...');
console.log(`   Using token: ${process.env.DISCORD_BOT_TOKEN ? '✓ Token found' : '✗ Token missing'}`);

client.login(process.env.DISCORD_BOT_TOKEN)
    .then(() => {
        clearTimeout(loginTimeout);
    })
    .catch((error) => {
        clearTimeout(loginTimeout);
        console.error('❌ Failed to login:', error.message);
        if (error.message.includes('401')) {
            console.error('   Invalid bot token. Please check your DISCORD_BOT_TOKEN.');
        } else if (error.message.includes('ENOTFOUND')) {
            console.error('   Network error. Please check your internet connection.');
        }
        process.exit(1);
    });