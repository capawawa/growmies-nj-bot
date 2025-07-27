const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config();

const commands = [];

// Grab all the command folders from the commands directory
const foldersPath = path.join(__dirname, 'src', 'commands');
if (fs.existsSync(foldersPath)) {
    const commandFolders = fs.readdirSync(foldersPath);

    for (const folder of commandFolders) {
        const folderPath = path.join(foldersPath, folder);
        if (fs.statSync(folderPath).isDirectory()) {
            // Grab all the command files from the commands directory
            const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));

            // Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
            for (const file of commandFiles) {
                const filePath = path.join(folderPath, file);
                try {
                    const command = require(filePath);
                    if ('data' in command && 'execute' in command) {
                        commands.push(command.data.toJSON());
                        console.log(`✅ Loaded command data: ${command.data.name} from ${folder}/${file}`);
                    } else {
                        console.log(`⚠️  [WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
                    }
                } catch (error) {
                    console.error(`❌ Error loading command data from ${filePath}:`, error);
                }
            }
        }
    }
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(process.env.DISCORD_BOT_TOKEN);

// Deploy commands function
async function deployCommands() {
    try {
        console.log(`🚀 Started refreshing ${commands.length} application (/) commands.`);

        // Check if we have required environment variables
        if (!process.env.DISCORD_BOT_TOKEN) {
            throw new Error('DISCORD_BOT_TOKEN is required in environment variables');
        }
        
        if (!process.env.DISCORD_CLIENT_ID) {
            throw new Error('DISCORD_CLIENT_ID is required in environment variables');
        }

        let data;
        
        if (process.env.DISCORD_SERVER_ID) {
            // Guild-specific deployment (for development/testing)
            console.log(`🎯 Deploying commands to guild: ${process.env.DISCORD_SERVER_ID}`);
            data = await rest.put(
                Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_SERVER_ID),
                { body: commands },
            );
            console.log(`✅ Successfully reloaded ${data.length} guild application (/) commands.`);
        } else {
            // Global deployment (for production)
            console.log('🌍 Deploying commands globally (this may take up to 1 hour to propagate)');
            data = await rest.put(
                Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
                { body: commands },
            );
            console.log(`✅ Successfully reloaded ${data.length} global application (/) commands.`);
        }

        // List deployed commands
        console.log('\n📋 Deployed commands:');
        data.forEach((command, index) => {
            console.log(`${index + 1}. /${command.name} - ${command.description}`);
        });
        
    } catch (error) {
        console.error('❌ Error deploying commands:', error);
        
        if (error.code === 50001) {
            console.error('\n🔐 Missing Access: Make sure the bot has been invited to the server with the applications.commands scope.');
        } else if (error.code === 10002) {
            console.error('\n❓ Unknown Application: Check that CLIENT_ID is correct.');
        } else if (error.status === 401) {
            console.error('\n🔑 Invalid Token: Check that DISCORD_TOKEN is correct and valid.');
        }
        
        process.exit(1);
    }
}

// Execute deployment
if (require.main === module) {
    deployCommands();
}

module.exports = { deployCommands };