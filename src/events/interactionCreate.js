const { Events } = require('discord.js');
const { AgeVerificationService } = require('../services/ageVerification');

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
        
        // Handle button interactions
        else if (interaction.isButton()) {
            console.log(`🔘 Button interaction: ${interaction.customId} by ${interaction.user.tag}`);
            
            try {
                // Initialize age verification service
                const ageVerificationService = new AgeVerificationService();
                
                // Handle age verification buttons
                if (interaction.customId === 'age_verify_confirm') {
                    console.log(`🌿 Processing age verification confirmation for ${interaction.user.tag}`);
                    await ageVerificationService.handleAgeConfirmation(interaction);
                }
                else if (interaction.customId === 'age_verify_deny') {
                    console.log(`🚫 Processing age verification denial for ${interaction.user.tag}`);
                    await ageVerificationService.handleAgeDenial(interaction);
                }
                else {
                    // Handle unknown button interactions
                    console.log(`⚠️ Unknown button interaction: ${interaction.customId}`);
                    
                    try {
                        await interaction.reply({
                            content: '⚠️ This button is not currently supported. Please try again or contact an administrator.',
                            ephemeral: true
                        });
                    } catch (replyError) {
                        console.error('❌ Failed to reply to unknown button interaction:', replyError);
                    }
                }
                
            } catch (error) {
                console.error(`❌ Error handling button interaction ${interaction.customId}:`, error);
                
                // Try to respond with an error message if we haven't responded yet
                try {
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.reply({
                            content: '⚠️ An error occurred while processing your request. Please try again later or contact an administrator.\n\n**Error Code:** `BTN-' + Date.now() + '`',
                            ephemeral: true
                        });
                    }
                } catch (errorReplyError) {
                    console.error('❌ Failed to send button error response:', errorReplyError);
                }
            }
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