const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Verify that you are 21+ years old to access cannabis community content'),
    
    async execute(interaction) {
        try {
            // Check if user already has the verified role
            const verifiedRoleId = process.env.AGE_VERIFICATION_ROLE_ID;
            if (!verifiedRoleId) {
                return await interaction.reply({
                    content: '⚠️ Age verification system is not configured. Please contact an administrator.',
                    ephemeral: true
                });
            }

            const verifiedRole = interaction.guild.roles.cache.get(verifiedRoleId);
            if (!verifiedRole) {
                return await interaction.reply({
                    content: '⚠️ Verification role not found. Please contact an administrator.',
                    ephemeral: true
                });
            }

            // Check if user already has the role
            if (interaction.member.roles.cache.has(verifiedRoleId)) {
                return await interaction.reply({
                    content: '✅ **Already Verified**\n\nYou are already verified as 21+ years old and have access to cannabis community content.',
                    ephemeral: true
                });
            }

            // Create verification embed
            const embed = new EmbedBuilder()
                .setTitle('🔞 Age Verification Required')
                .setDescription('**Cannabis content requires age verification (21+)**\n\nTo access cannabis-related content in this community, you must confirm that you are 21 years or older.\n\n**Legal Notice:**\n• Cannabis is legal in New Jersey for adults 21+\n• This verification ensures legal compliance\n• Your response is private and secure')
                .setColor('#FFA500')
                .addFields(
                    {
                        name: '📋 What happens after verification?',
                        value: '• Access to cannabis discussion channels\n• Participation in strain-related activities\n• Educational content and resources\n• Community engagement features',
                        inline: false
                    },
                    {
                        name: '🔒 Privacy & Security',
                        value: 'Your verification status is stored securely and never shared. This process complies with Discord Terms of Service and applicable laws.',
                        inline: false
                    }
                )
                .setFooter({ text: 'Click a button below to proceed' })
                .setTimestamp();

            // Create buttons
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('verify_confirm')
                        .setLabel('✅ I am 21+ years old')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('🌿'),
                    new ButtonBuilder()
                        .setCustomId('verify_deny')
                        .setLabel('❌ I am under 21')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('🚫')
                );

            // Send verification message
            await interaction.reply({
                embeds: [embed],
                components: [row],
                ephemeral: true
            });

            console.log(`🔒 Age verification initiated by ${interaction.user.tag} (${interaction.user.id})`);

        } catch (error) {
            console.error('❌ Error in verify command:', error);
            
            // Fallback error response
            const errorMessage = {
                content: '⚠️ An error occurred during verification. Please try again or contact an administrator.',
                ephemeral: true
            };

            try {
                if (interaction.replied || interaction.deferred) {
                    await interaction.editReply(errorMessage);
                } else {
                    await interaction.reply(errorMessage);
                }
            } catch (replyError) {
                console.error('❌ Failed to send error response:', replyError);
            }
        }
    },
};