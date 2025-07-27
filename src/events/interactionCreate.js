const { Events } = require('discord.js');
const { User } = require('../database/models/User');
const { AuditLog } = require('../database/models/AuditLog');

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
                
                const errorResponse = {
                    content: '⚠️ There was an error while executing this command. Please try again later.',
                    ephemeral: true
                };

                try {
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
        
        // Handle button interactions - SIMPLIFIED AND IMMEDIATE
        else if (interaction.isButton()) {
            console.log(`🔘 Button interaction: ${interaction.customId} by ${interaction.user.tag}`);
            
            try {
                // Age verification confirmation
                if (interaction.customId === 'verify_confirm') {
                    await handleAgeVerificationConfirm(interaction);
                }
                // Age verification denial
                else if (interaction.customId === 'verify_deny') {
                    await handleAgeVerificationDeny(interaction);
                }
                // Unknown button
                else {
                    await interaction.reply({
                        content: '⚠️ This button is not currently supported. Please try again or contact an administrator.',
                        ephemeral: true
                    });
                }
                
            } catch (error) {
                console.error(`❌ Error handling button interaction ${interaction.customId}:`, error);
                
                // Simple error response
                try {
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.reply({
                            content: '⚠️ An error occurred while processing your request. Please try the `/verify` command again.',
                            ephemeral: true
                        });
                    }
                } catch (errorReplyError) {
                    console.error('❌ Failed to send button error response:', errorReplyError);
                }
            }
        }
    },
};

// SIMPLIFIED AGE VERIFICATION HANDLERS - NO COMPLEX ASYNC OPERATIONS

async function handleAgeVerificationConfirm(interaction) {
    console.log(`🌿 Processing age verification confirmation for ${interaction.user.tag}`);
    
    // Get role immediately
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

    // Check if user already has role
    if (interaction.member.roles.cache.has(verifiedRoleId)) {
        return await interaction.reply({
            content: '✅ **Already Verified**\n\nYou are already verified as 21+ years old and have access to cannabis community content.',
            ephemeral: true
        });
    }

    // Assign role IMMEDIATELY - no database operations before response
    try {
        await interaction.member.roles.add(verifiedRole, 'Age verification completed - 21+ confirmed');
        
        // Send immediate success response
        await interaction.reply({
            content: `🎉 **Age Verification Complete!**

✅ You have been successfully verified as 21+ years old
🌿 You now have access to all cannabis community content
🔓 Restricted channels are now available to you

**Legal Compliance Notice:**
• Cannabis is legal in New Jersey for adults 21+
• Always follow federal, state, and local laws
• This community is for educational purposes only

**Welcome to the Growmies NJ community!** 🌱

*This verification is private and secure • Your privacy is protected*`,
            ephemeral: true
        });

        console.log(`✅ Age verification completed successfully for ${interaction.user.tag}`);

        // Database operations AFTER responding to avoid timeout
        setImmediate(async () => {
            try {
                await User.upsert({
                    discord_id: interaction.user.id,
                    guild_id: interaction.guild.id,
                    username: interaction.user.username,
                    display_name: interaction.user.displayName || interaction.user.globalName,
                    verification_status: 'verified',
                    verified_at: new Date(),
                    is_21_plus: true,
                    verification_method: 'button_confirmation',
                    birth_year: new Date().getFullYear() - 21,
                    verification_metadata: {
                        discord_tag: interaction.user.tag,
                        verification_timestamp: new Date().toISOString(),
                        bot_version: process.env.npm_package_version || '1.0.0'
                    }
                });

                await AuditLog.logVerificationAttempt(
                    interaction.user.id,
                    interaction.guild.id,
                    interaction.user.id,
                    'success',
                    {
                        verification_method: 'button_confirmation',
                        assigned_role: verifiedRoleId,
                        timestamp: new Date().toISOString()
                    }
                );

                console.log(`📝 Database records updated for ${interaction.user.tag}`);
            } catch (dbError) {
                console.error('❌ Database error (after successful verification):', dbError);
                // Don't fail the verification - role was already assigned
            }
        });

    } catch (roleError) {
        console.error('❌ Error assigning verified role:', roleError);
        await interaction.reply({
            content: '⚠️ **Verification Issue**\n\nThere was an error assigning your role. Please contact an administrator for assistance.\n\n**Reference ID:** `VRF-' + Date.now() + '`',
            ephemeral: true
        });
    }
}

async function handleAgeVerificationDeny(interaction) {
    console.log(`🚫 Processing age verification denial for ${interaction.user.tag}`);
    
    // Immediate response
    await interaction.reply({
        content: `🚫 **Age Verification Required**

Thank you for your honesty. Unfortunately, you must be **21 years or older** to access cannabis-related content in this community.

**New Jersey Cannabis Laws:**
• Cannabis possession and use is only legal for adults 21+
• This restriction is required by state law
• We take legal compliance seriously

**You are welcome to:**
• Participate in general community discussions
• Access public channels and content
• Return when you reach the age of 21

**Questions?** Contact our moderation team for assistance.

*This community follows all applicable laws and Discord Terms of Service*`,
        ephemeral: true
    });

    // Database operations AFTER responding
    setImmediate(async () => {
        try {
            await User.upsert({
                discord_id: interaction.user.id,
                guild_id: interaction.guild.id,
                username: interaction.user.username,
                display_name: interaction.user.displayName || interaction.user.globalName,
                verification_status: 'rejected',
                is_21_plus: false,
                verification_method: 'button_denial',
                last_attempt_at: new Date(),
                verification_metadata: {
                    discord_tag: interaction.user.tag,
                    rejection_timestamp: new Date().toISOString(),
                    reason: 'user_under_21'
                }
            });

            await AuditLog.logVerificationAttempt(
                interaction.user.id,
                interaction.guild.id,
                interaction.user.id,
                'failure',
                {
                    verification_method: 'button_denial',
                    failure_reason: 'user_under_21',
                    compliance_note: 'User self-reported as under 21'
                }
            );

            console.log(`📝 Age verification denial logged for ${interaction.user.tag}`);
        } catch (dbError) {
            console.error('❌ Database error (after denial response):', dbError);
            // Don't fail the denial - response was already sent
        }
    });
}