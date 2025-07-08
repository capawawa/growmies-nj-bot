const { SlashCommandBuilder, InteractionContextType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check bot latency and API response time')
        .setContexts(InteractionContextType.Guild),
    
    async execute(interaction) {
        try {
            // Get initial timestamp
            const sent = await interaction.reply({ 
                content: '🏓 Pinging...', 
                fetchReply: true 
            });
            
            // Calculate latencies
            const roundTripLatency = sent.createdTimestamp - interaction.createdTimestamp;
            const apiLatency = Math.round(interaction.client.ws.ping);
            
            // Create response embed
            const pingEmbed = {
                color: 0x00ff00,
                title: '🏓 Pong!',
                fields: [
                    {
                        name: '📡 API Latency',
                        value: `${apiLatency}ms`,
                        inline: true
                    },
                    {
                        name: '🔄 Round Trip',
                        value: `${roundTripLatency}ms`,
                        inline: true
                    },
                    {
                        name: '📊 Status',
                        value: apiLatency < 100 ? '🟢 Excellent' : 
                               apiLatency < 200 ? '🟡 Good' : 
                               apiLatency < 300 ? '🟠 Fair' : '🔴 Poor',
                        inline: true
                    }
                ],
                footer: {
                    text: `Requested by ${interaction.user.tag}`,
                    icon_url: interaction.user.displayAvatarURL()
                },
                timestamp: new Date().toISOString()
            };
            
            await interaction.editReply({ 
                content: null,
                embeds: [pingEmbed] 
            });
            
            console.log(`🏓 Ping command executed by ${interaction.user.tag} - API: ${apiLatency}ms, Round Trip: ${roundTripLatency}ms`);
            
        } catch (error) {
            console.error('❌ Error in ping command:', error);
            
            const errorResponse = {
                content: '⚠️ An error occurred while checking ping. Please try again.',
                ephemeral: true
            };
            
            try {
                if (interaction.replied) {
                    await interaction.followUp(errorResponse);
                } else {
                    await interaction.reply(errorResponse);
                }
            } catch (followUpError) {
                console.error('❌ Failed to send ping error response:', followUpError);
            }
        }
    },
};