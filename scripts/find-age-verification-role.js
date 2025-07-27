const { Client, GatewayIntentBits } = require('discord.js');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Create a new client instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
    ]
});

// Bot ready event
client.once('ready', async () => {
    console.log('✅ Bot connected successfully!');
    console.log(`📊 Bot Username: ${client.user.tag}`);
    
    const guildId = process.env.DISCORD_GUILD_ID || process.env.DISCORD_SERVER_ID;
    console.log(`🔍 Searching for roles in guild: ${guildId}`);
    
    try {
        // Get the guild
        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
            console.error(`❌ Guild not found: ${guildId}`);
            console.log('Available guilds:');
            client.guilds.cache.forEach(g => {
                console.log(`   - ${g.name} (${g.id})`);
            });
            process.exit(1);
        }
        
        console.log(`✅ Found guild: ${guild.name}`);
        console.log(`📋 Total roles in server: ${guild.roles.cache.size}`);
        console.log('\n🔍 Searching for age verification role...\n');
        
        // Search for the cannabis access role
        const targetRoleName = '🔞 21+ Cannabis Access';
        const cannabisRole = guild.roles.cache.find(role => 
            role.name === targetRoleName || 
            role.name.includes('Cannabis Access') ||
            role.name.includes('21+') ||
            role.name.includes('🔞')
        );
        
        if (cannabisRole) {
            console.log('🎯 **TARGET ROLE FOUND!**');
            console.log(`   Name: ${cannabisRole.name}`);
            console.log(`   ID: ${cannabisRole.id}`);
            console.log(`   Color: #${cannabisRole.color.toString(16).padStart(6, '0')}`);
            console.log(`   Position: ${cannabisRole.position}`);
            console.log(`   Members: ${cannabisRole.members.size}`);
            console.log(`   Mentionable: ${cannabisRole.mentionable}`);
            console.log(`   Managed: ${cannabisRole.managed}`);
            console.log(`   Created: ${cannabisRole.createdAt.toISOString()}`);
            
            console.log('\n📝 **ENVIRONMENT UPDATE REQUIRED:**');
            console.log(`AGE_VERIFICATION_ROLE_ID=${cannabisRole.id}`);
            console.log('\n✅ Copy the above line to your .env file!');
        } else {
            console.log('❌ Cannabis Access role not found!');
            console.log('\n📋 **ALL ROLES IN SERVER:**');
            
            // List all roles for debugging
            const roleList = Array.from(guild.roles.cache.values())
                .sort((a, b) => b.position - a.position)
                .map(role => ({
                    name: role.name,
                    id: role.id,
                    position: role.position,
                    members: role.members.size,
                    managed: role.managed
                }));
            
            roleList.forEach((role, index) => {
                const prefix = role.name.includes('21') || role.name.includes('Cannabis') || role.name.includes('🔞') ? '🎯' : '  ';
                console.log(`${prefix} ${index + 1}. ${role.name} (${role.id}) - Position: ${role.position}, Members: ${role.members}`);
            });
            
            console.log('\n🔍 **SEARCH SUGGESTIONS:**');
            console.log('Look for roles containing:');
            console.log('  - "Cannabis"');
            console.log('  - "21+"');
            console.log('  - "🔞"');
            console.log('  - "Access"');
            console.log('  - "Verified"');
            
            // Search for similar roles
            const similarRoles = guild.roles.cache.filter(role => {
                const name = role.name.toLowerCase();
                return name.includes('cannabis') || 
                       name.includes('21') || 
                       name.includes('verified') || 
                       name.includes('access') ||
                       name.includes('adult');
            });
            
            if (similarRoles.size > 0) {
                console.log('\n🔍 **POTENTIALLY RELATED ROLES:**');
                similarRoles.forEach(role => {
                    console.log(`   🎯 ${role.name} (${role.id}) - Members: ${role.members.size}`);
                });
            }
        }
        
    } catch (error) {
        console.error('❌ Error searching for roles:', error);
    }
    
    // Exit the process
    console.log('\n🏁 Role search complete!');
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
console.log('🔄 Connecting to Discord to find age verification role...');
console.log(`   Using token: ${process.env.DISCORD_BOT_TOKEN ? '✓ Token found' : '✗ Token missing'}`);
console.log(`   Target guild: ${process.env.DISCORD_GUILD_ID || process.env.DISCORD_SERVER_ID}`);
console.log(`   Looking for: "🔞 21+ Cannabis Access" role\n`);

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