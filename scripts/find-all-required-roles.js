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

// Role mappings we need to find
const REQUIRED_ROLES = {
    // Critical roles for age verification system
    MEMBER_ROLE_ID: {
        names: ['Member', 'Members', '18+', 'Verified Member', 'General Access'],
        description: '18+ general access role'
    },
    CANNABIS_ACCESS_ROLE_ID: {
        names: ['Cannabis Access', '21+', 'Cannabis', '🌿 Cannabis', 'Verified 21+', '🔞 21+ Cannabis Access'],
        description: '21+ cannabis discussions role'
    },
    SEEDLING_ROLE_ID: {
        names: ['Seedling', '🌱 Seedling', 'New Member', 'Newbie', 'Fresh', 'Starter'],
        description: 'New verified members progression role'
    },
    
    // Optional progression roles
    GROWING_ROLE_ID: {
        names: ['Growing', '🌿 Growing', 'Active', 'Participant', 'Regular'],
        description: 'Active participants progression role'
    },
    ESTABLISHED_ROLE_ID: {
        names: ['Established', '🌳 Established', 'Veteran', 'Long-term', 'Senior'],
        description: 'Long-term contributors progression role'
    },
    HARVESTED_ROLE_ID: {
        names: ['Harvested', '🏆 Harvested', 'Expert', 'Master', 'Elite'],
        description: 'Community veterans progression role'
    }
};

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
        console.log('\n🔍 Searching for required roles...\n');
        
        const foundRoles = {};
        const missingRoles = [];
        
        // Search for each required role
        for (const [envVarName, roleConfig] of Object.entries(REQUIRED_ROLES)) {
            console.log(`🔎 Looking for ${envVarName}: ${roleConfig.description}`);
            
            let foundRole = null;
            
            // Try exact name matches first
            for (const roleName of roleConfig.names) {
                foundRole = guild.roles.cache.find(role => 
                    role.name === roleName || 
                    role.name.toLowerCase() === roleName.toLowerCase()
                );
                if (foundRole) break;
            }
            
            // Try partial matches if exact match not found
            if (!foundRole) {
                for (const roleName of roleConfig.names) {
                    foundRole = guild.roles.cache.find(role => 
                        role.name.toLowerCase().includes(roleName.toLowerCase()) ||
                        roleName.toLowerCase().includes(role.name.toLowerCase())
                    );
                    if (foundRole) break;
                }
            }
            
            if (foundRole) {
                foundRoles[envVarName] = foundRole;
                console.log(`   ✅ Found: ${foundRole.name} (${foundRole.id})`);
            } else {
                missingRoles.push(envVarName);
                console.log(`   ❌ Not found - looking for: ${roleConfig.names.join(', ')}`);
            }
            console.log();
        }
        
        // Display results
        console.log('📊 **ROLE SEARCH RESULTS**\n');
        
        if (Object.keys(foundRoles).length > 0) {
            console.log('✅ **FOUND ROLES - Add these to your .env file:**\n');
            for (const [envVarName, role] of Object.entries(foundRoles)) {
                console.log(`${envVarName}=${role.id}  # ${role.name}`);
            }
            console.log();
        }
        
        if (missingRoles.length > 0) {
            console.log('❌ **MISSING ROLES - These need to be created:**\n');
            missingRoles.forEach(envVarName => {
                const roleConfig = REQUIRED_ROLES[envVarName];
                console.log(`${envVarName}: ${roleConfig.description}`);
                console.log(`   Suggested names: ${roleConfig.names.join(', ')}`);
                console.log();
            });
        }
        
        // Show current .env comparison
        console.log('🔍 **CURRENT .ENV COMPARISON:**\n');
        for (const envVarName of Object.keys(REQUIRED_ROLES)) {
            const currentValue = process.env[envVarName];
            const foundRole = foundRoles[envVarName];
            
            if (currentValue && foundRole && currentValue === foundRole.id) {
                console.log(`✅ ${envVarName}=${currentValue} (matches ${foundRole.name})`);
            } else if (currentValue && foundRole && currentValue !== foundRole.id) {
                console.log(`⚠️  ${envVarName}=${currentValue} (found ${foundRole.name} as ${foundRole.id})`);
            } else if (currentValue && !foundRole) {
                console.log(`❓ ${envVarName}=${currentValue} (role not found in server)`);
            } else if (!currentValue && foundRole) {
                console.log(`➕ ${envVarName}=<not set> (found ${foundRole.name} as ${foundRole.id})`);
            } else {
                console.log(`❌ ${envVarName}=<not set> (role not found)`);
            }
        }
        
        console.log('\n📋 **ALL ROLES IN SERVER:**');
        const roleList = Array.from(guild.roles.cache.values())
            .sort((a, b) => b.position - a.position)
            .filter(role => !role.managed && role.name !== '@everyone');
            
        roleList.forEach((role, index) => {
            const isFound = Object.values(foundRoles).some(foundRole => foundRole.id === role.id);
            const prefix = isFound ? '🎯' : '  ';
            console.log(`${prefix} ${index + 1}. ${role.name} (${role.id}) - Position: ${role.position}, Members: ${role.members.size}`);
        });
        
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
console.log('🔄 Connecting to Discord to find all required roles...');
console.log(`   Using token: ${process.env.DISCORD_BOT_TOKEN ? '✓ Token found' : '✗ Token missing'}`);
console.log(`   Target guild: ${process.env.DISCORD_GUILD_ID || process.env.DISCORD_SERVER_ID}`);
console.log('   Looking for: Member, Cannabis Access, Seedling, and progression roles\n');

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