const { SlashCommandBuilder, InteractionContextType, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Verify that you are 21+ years old to access cannabis community content')
        .setContexts(InteractionContextType.Guild)
        .setDefaultMemberPermissions(null), // Available to all members
    
    async execute(interaction) {
        try {
            // Always respond privately for age verification
            await interaction.deferReply({ ephemeral: true });
            
            const member = interaction.member;
            const guild = interaction.guild;
            
            // Check if user is already verified
            const verifiedRoleId = process.env.AGE_VERIFICATION_ROLE_ID;
            if (!verifiedRoleId) {
                await interaction.editReply({
                    content: '⚠️ Age verification system is not properly configured. Please contact an administrator.',
                    flags: MessageFlags.Ephemeral
                });
                return;
            }
            
            const verifiedRole = guild.roles.cache.get(verifiedRoleId);
            if (!verifiedRole) {
                await interaction.editReply({
                    content: '⚠️ Verification role not found. Please contact an administrator.',
                    flags: MessageFlags.Ephemeral
                });
                return;
            }
            
            // Check if already verified
            if (member.roles.cache.has(verifiedRoleId)) {
                await interaction.editReply({
                    content: '✅ You are already verified as 21+ years old and have access to cannabis community content.',
                    flags: MessageFlags.Ephemeral
                });
                return;
            }
            
            // Age verification confirmation
            const verificationEmbed = {
                color: 0x00ff00,
                title: '🌿 Growmies NJ Age Verification',
                description: '**Cannabis is legal in New Jersey for adults 21 and older.**\n\n' +
                           '⚠️ **IMPORTANT LEGAL NOTICE:**\n' +
                           '• You must be **21 years of age or older** to participate in cannabis discussions\n' +
                           '• Cannabis possession and use is only legal for adults 21+\n' +
                           '• This verification is required for Discord ToS compliance\n' +
                           '• False verification may result in permanent ban\n\n' +
                           '**By clicking "I Verify" below, you confirm that:**\n' +
                           '✅ You are 21 years of age or older\n' +
                           '✅ You understand NJ cannabis laws\n' +
                           '✅ You agree to follow community guidelines\n' +
                           '✅ Your verification information is accurate',
                footer: {
                    text: 'This verification is private and secure • Growmies NJ Community'
                },
                timestamp: new Date().toISOString()
            };
            
            const verificationButtons = {
                type: 1, // Action Row
                components: [
                    {
                        type: 2, // Button
                        style: 3, // Success (Green)
                        label: '✅ I Verify - I am 21+',
                        custom_id: 'age_verify_confirm',
                        emoji: '🌿'
                    },
                    {
                        type: 2, // Button
                        style: 4, // Danger (Red)
                        label: '❌ Under 21',
                        custom_id: 'age_verify_deny',
                        emoji: '🚫'
                    }
                ]
            };
            
            await interaction.editReply({
                embeds: [verificationEmbed],
                components: [verificationButtons],
                flags: MessageFlags.Ephemeral
            });
            
            // Log verification attempt (without personal info)
            console.log(`🔒 Age verification initiated by user ${interaction.user.tag} (${interaction.user.id}) in guild ${guild.name}`);
            
        } catch (error) {
            console.error('❌ Error in verify command:', error);
            
            const errorResponse = {
                content: '⚠️ An error occurred during verification. Please try again or contact an administrator.',
                flags: MessageFlags.Ephemeral
            };
            
            try {
                if (interaction.deferred) {
                    await interaction.editReply(errorResponse);
                } else {
                    await interaction.reply(errorResponse);
                }
            } catch (followUpError) {
                console.error('❌ Failed to send error response:', followUpError);
            }
        }
    },
};