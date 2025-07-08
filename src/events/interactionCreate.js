const { Events } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        // Handle slash commands
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);

            if (!command) {
                console.error(`❌ No command matching ${interaction.commandName} was found.`);
                return;
            }

            try {
                console.log(`🎯 Executing command: ${interaction.commandName} by ${interaction.user.tag}`);
                await command.execute(interaction);
            } catch (error) {
                console.error(`❌ Error executing command ${interaction.commandName}:`, error);
                
                // Prepare error response
                const errorResponse = {
                    content: '⚠️ There was an error while executing this command. Please try again later.',
                    ephemeral: true
                };

                try {
                    // Check if we can still reply or if we need to follow up
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp(errorResponse);
                    } else {
                        await interaction.reply(errorResponse);
                    }
                } catch (followUpError) {
                    console.error(`❌ Failed to send error response:`, followUpError);
                }
            }
        }
        
        // Handle button interactions (for future features)
        else if (interaction.isButton()) {
            console.log(`🔘 Button interaction: ${interaction.customId} by ${interaction.user.tag}`);
            // Button handling logic will be added when needed
        }
        
        // Handle select menu interactions (for future features)
        else if (interaction.isStringSelectMenu()) {
            console.log(`📋 Select menu interaction: ${interaction.customId} by ${interaction.user.tag}`);
            // Select menu handling logic will be added when needed
        }
        
        // Handle modal submissions (for age verification)
        else if (interaction.isModalSubmit()) {
            console.log(`📝 Modal submission: ${interaction.customId} by ${interaction.user.tag}`);
            // Modal handling logic will be added for age verification
        }
    },
};