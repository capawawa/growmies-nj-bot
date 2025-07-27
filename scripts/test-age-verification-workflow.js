const { Client, GatewayIntentBits, SlashCommandBuilder } = require('discord.js');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Create a new client instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
    ]
});

// Test results tracking
const testResults = {
    botConnection: false,
    guildAccess: false,
    roleValidation: false,
    commandDeployment: false,
    permissionsCheck: false,
    environmentConfig: false
};

// Bot ready event
client.once('ready', async () => {
    console.log('🧪 **AGE VERIFICATION WORKFLOW TEST**');
    console.log('=' .repeat(50));
    
    try {
        // Test 1: Bot Connection
        console.log('\n🔄 Test 1: Bot Connection');
        testResults.botConnection = true;
        console.log(`✅ Bot connected as: ${client.user.tag}`);
        
        // Test 2: Guild Access
        console.log('\n🔄 Test 2: Guild Access');
        const guildId = process.env.DISCORD_GUILD_ID || process.env.DISCORD_SERVER_ID;
        const guild = client.guilds.cache.get(guildId);
        
        if (guild) {
            testResults.guildAccess = true;
            console.log(`✅ Guild found: ${guild.name} (${guild.id})`);
            console.log(`   Members: ${guild.memberCount}, Roles: ${guild.roles.cache.size}`);
        } else {
            console.log(`❌ Guild not found: ${guildId}`);
            return;
        }
        
        // Test 3: Environment Configuration
        console.log('\n🔄 Test 3: Environment Configuration');
        const requiredVars = [
            'DISCORD_BOT_TOKEN',
            'DISCORD_GUILD_ID',
            'DISCORD_CLIENT_ID',
            'AGE_VERIFICATION_ROLE_ID'
        ];
        
        let envConfigValid = true;
        requiredVars.forEach(varName => {
            if (process.env[varName]) {
                console.log(`✅ ${varName}: configured`);
            } else {
                console.log(`❌ ${varName}: missing`);
                envConfigValid = false;
            }
        });
        
        testResults.environmentConfig = envConfigValid;
        
        // Test 4: Role Validation
        console.log('\n🔄 Test 4: Age Verification Role Validation');
        const verifiedRoleId = process.env.AGE_VERIFICATION_ROLE_ID;
        const verifiedRole = guild.roles.cache.get(verifiedRoleId);
        
        if (verifiedRole) {
            testResults.roleValidation = true;
            console.log(`✅ Role found: "${verifiedRole.name}" (${verifiedRole.id})`);
            console.log(`   Color: #${verifiedRole.color.toString(16).padStart(6, '0')}`);
            console.log(`   Position: ${verifiedRole.position}`);
            console.log(`   Members: ${verifiedRole.members.size}`);
            console.log(`   Mentionable: ${verifiedRole.mentionable}`);
            console.log(`   Managed by bot: ${verifiedRole.managed}`);
            
            // Check if role is assignable
            const botMember = guild.members.me;
            const canAssignRole = botMember.permissions.has('ManageRoles') && 
                                  botMember.roles.highest.position > verifiedRole.position;
            
            if (canAssignRole) {
                console.log(`✅ Bot can assign this role`);
            } else {
                console.log(`⚠️  Bot may not be able to assign this role`);
                console.log(`   Bot highest role position: ${botMember.roles.highest.position}`);
                console.log(`   Target role position: ${verifiedRole.position}`);
            }
        } else {
            console.log(`❌ Role not found: ${verifiedRoleId}`);
            return;
        }
        
        // Test 5: Bot Permissions
        console.log('\n🔄 Test 5: Bot Permissions Check');
        const botMember = guild.members.me;
        const requiredPermissions = [
            'ManageRoles',
            'SendMessages',
            'UseSlashCommands',
            'ViewChannel'
        ];
        
        let permissionsValid = true;
        requiredPermissions.forEach(permission => {
            if (botMember.permissions.has(permission)) {
                console.log(`✅ ${permission}: granted`);
            } else {
                console.log(`❌ ${permission}: missing`);
                permissionsValid = false;
            }
        });
        
        testResults.permissionsCheck = permissionsValid;
        
        // Test 6: Command Deployment Check
        console.log('\n🔄 Test 6: Command Deployment Check');
        try {
            const commands = await guild.commands.fetch();
            const verifyCommand = commands.find(cmd => cmd.name === 'verify');
            
            if (verifyCommand) {
                testResults.commandDeployment = true;
                console.log(`✅ /verify command found: ${verifyCommand.id}`);
                console.log(`   Description: ${verifyCommand.description}`);
                console.log(`   Version: ${verifyCommand.version}`);
            } else {
                console.log(`❌ /verify command not found`);
                console.log(`   Available commands: ${commands.map(c => c.name).join(', ')}`);
            }
        } catch (cmdError) {
            console.log(`❌ Error checking commands: ${cmdError.message}`);
        }
        
        // Test 7: Database Connection Test (if available)
        console.log('\n🔄 Test 7: Database Connection (Optional)');
        try {
            // Try to import and test database connection
            const { User } = require('../src/database/models/User');
            
            // Simple connection test
            const testUser = await User.findOne({ limit: 1 });
            console.log(`✅ Database connection successful`);
            console.log(`   Test query executed successfully`);
        } catch (dbError) {
            console.log(`⚠️  Database connection issue: ${dbError.message}`);
            console.log(`   This is not critical for basic testing`);
        }
        
        // Final Test Results
        console.log('\n📊 **TEST RESULTS SUMMARY**');
        console.log('=' .repeat(50));
        
        const totalTests = Object.keys(testResults).length;
        const passedTests = Object.values(testResults).filter(result => result === true).length;
        
        Object.entries(testResults).forEach(([test, result]) => {
            const status = result ? '✅ PASS' : '❌ FAIL';
            console.log(`${status} ${test.charAt(0).toUpperCase() + test.slice(1).replace(/([A-Z])/g, ' $1')}`);
        });
        
        console.log('\n📈 **OVERALL STATUS**');
        console.log(`Tests Passed: ${passedTests}/${totalTests}`);
        
        if (passedTests === totalTests) {
            console.log('🎉 **ALL TESTS PASSED!**');
            console.log('✅ Age verification system is ready for production');
            console.log('\n🚀 **NEXT STEPS:**');
            console.log('1. The /verify command is available in Discord');
            console.log('2. Users can run /verify to start age verification');
            console.log('3. Button interactions will assign the "Verified 21+" role');
            console.log('4. Role assignment will grant access to cannabis content');
        } else {
            console.log('⚠️  **SOME TESTS FAILED**');
            console.log('❌ Please resolve the failed tests before production use');
            
            // Provide specific troubleshooting steps
            if (!testResults.commandDeployment) {
                console.log('\n🔧 **Command Deployment Fix:**');
                console.log('   Run: node deploy-commands.js');
            }
            
            if (!testResults.permissionsCheck) {
                console.log('\n🔧 **Permission Fix:**');
                console.log('   1. Go to Discord Server Settings > Integrations');
                console.log('   2. Find your bot and grant required permissions');
                console.log('   3. Ensure bot role is above target role in hierarchy');
            }
            
            if (!testResults.roleValidation) {
                console.log('\n🔧 **Role Fix:**');
                console.log('   1. Check role exists and name matches');
                console.log('   2. Verify AGE_VERIFICATION_ROLE_ID in .env');
                console.log('   3. Run: node scripts/find-age-verification-role.js');
            }
        }
        
        console.log('\n🏁 Testing complete!');
        
    } catch (error) {
        console.error('❌ Test execution error:', error);
    }
    
    // Exit the process
    process.exit(passedTests === totalTests ? 0 : 1);
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
console.log('🔄 Starting Age Verification Workflow Test...');
console.log(`   Bot Token: ${process.env.DISCORD_BOT_TOKEN ? '✓ Found' : '✗ Missing'}`);
console.log(`   Guild ID: ${process.env.DISCORD_GUILD_ID || process.env.DISCORD_SERVER_ID || '✗ Missing'}`);
console.log(`   Role ID: ${process.env.AGE_VERIFICATION_ROLE_ID || '✗ Missing'}`);

client.login(process.env.DISCORD_BOT_TOKEN)
    .then(() => {
        clearTimeout(loginTimeout);
    })
    .catch((error) => {
        clearTimeout(loginTimeout);
        console.error('❌ Failed to login:', error.message);
        process.exit(1);
    });