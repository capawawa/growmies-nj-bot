// Bot Invite Link Generator for GrowmiesSprout 🌱
const dotenv = require('dotenv');
dotenv.config();

const APPLICATION_ID = process.env.DISCORD_APPLICATION_ID || '1391996103628558369';

// Bot permissions required for Growmies NJ functionality
const permissions = {
    // General Permissions
    VIEW_CHANNELS: 1024,              // View channels
    MANAGE_CHANNELS: 16,              // Manage channels (for setup)
    MANAGE_ROLES: 268435456,          // Manage roles (for verification)
    MANAGE_WEBHOOKS: 536870912,       // Manage webhooks (for integrations)
    VIEW_AUDIT_LOG: 128,              // View audit log
    
    // Text Permissions
    SEND_MESSAGES: 2048,              // Send messages
    SEND_MESSAGES_IN_THREADS: 274877906944, // Send messages in threads
    CREATE_PUBLIC_THREADS: 34359738368,     // Create public threads
    CREATE_PRIVATE_THREADS: 68719476736,    // Create private threads
    EMBED_LINKS: 16384,               // Embed links
    ATTACH_FILES: 32768,              // Attach files
    READ_MESSAGE_HISTORY: 65536,      // Read message history
    MENTION_EVERYONE: 131072,         // Mention @everyone, @here, and all roles
    USE_EXTERNAL_EMOJIS: 262144,      // Use external emojis
    ADD_REACTIONS: 64,                // Add reactions
    USE_SLASH_COMMANDS: 2147483648,   // Use application commands
    
    // Voice Permissions  
    CONNECT: 1048576,                 // Connect to voice channels
    SPEAK: 2097152,                   // Speak in voice channels
    MOVE_MEMBERS: 16777216,           // Move members between voice channels
    
    // Advanced Permissions
    ADMINISTRATOR: 8                  // Administrator (optional - remove if not needed)
};

// Calculate total permissions value
const permissionValue = Object.values(permissions).reduce((acc, val) => acc + val, 0);

// OAuth2 scopes required
const scopes = ['bot', 'applications.commands'];

// Generate the invite URL
const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${APPLICATION_ID}&permissions=${permissionValue}&scope=${scopes.join('%20')}`;

console.log('====================================');
console.log('🌱 GrowmiesSprout Bot Invite Link Generator');
console.log('====================================');
console.log('');
console.log('Bot Name: GrowmiesSprout 🌱#0151');
console.log('Application ID:', APPLICATION_ID);
console.log('');
console.log('📋 Required Permissions:');
console.log('  ✓ Manage Channels & Roles');
console.log('  ✓ Send Messages & Embeds');
console.log('  ✓ Use Slash Commands');
console.log('  ✓ Manage Webhooks');
console.log('  ✓ Voice Channel Access');
console.log('');
console.log('🔗 Invite Link:');
console.log(inviteUrl);
console.log('');
console.log('📝 Next Steps:');
console.log('1. Click the invite link above');
console.log('2. Select your Discord server');
console.log('3. Review and approve permissions');
console.log('4. Enable privileged intents in Discord Developer Portal:');
console.log('   - MESSAGE CONTENT INTENT');
console.log('   - SERVER MEMBERS INTENT');
console.log('');
console.log('⚠️  For restricted permissions, you can use this minimal invite link:');
const minimalPermissions = 379968; // Basic permissions only
const minimalInviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${APPLICATION_ID}&permissions=${minimalPermissions}&scope=${scopes.join('%20')}`;
console.log(minimalInviteUrl);
console.log('');