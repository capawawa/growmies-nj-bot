/**
 * Embed Templates for GrowmiesNJ Discord Bot
 * 
 * Enhanced Welcome System - Rich embed templates for professional branding
 * Cannabis-themed design with green/gold color scheme for compliance
 */

const { EmbedBuilder, Colors } = require('discord.js');

/**
 * GrowmiesNJ Brand Colors
 */
const BRAND_COLORS = {
    PRIMARY_GREEN: 0x2ECC71,    // Cannabis green
    GOLD_ACCENT: 0xF1C40F,      // Gold accent
    SUCCESS: 0x00FF00,          // Bright green for success
    WARNING: 0xF39C12,          // Orange for warnings
    ERROR: 0xE74C3C,            // Red for errors
    INFO: 0x3498DB,             // Blue for info
    DARK_GREEN: 0x27AE60        // Darker green variant
};

/**
 * Common embed footer text
 */
const FOOTER_TEXT = 'Growmies NJ Community • Cannabis Education & Compliance';

/**
 * Welcome System Embed Templates
 */
class WelcomeEmbeds {
    
    /**
     * Main welcome message embed for new members
     * @param {GuildMember} member - Discord guild member
     * @param {Guild} guild - Discord guild
     * @returns {EmbedBuilder} - Welcome embed
     */
    static createWelcomeEmbed(member, guild) {
        return new EmbedBuilder()
            .setColor(BRAND_COLORS.PRIMARY_GREEN)
            .setTitle('🌿 Welcome to Growmies NJ!')
            .setDescription(
                `Hey ${member.displayName || member.user.username}! Welcome to **${guild.name}** - New Jersey's premier cannabis community! 🌱\n\n` +
                `**🏡 You're now part of a community focused on:**\n` +
                `🌿 Legal cannabis education and cultivation\n` +
                `📚 Sharing knowledge and growing techniques\n` +
                `🤝 Supporting fellow New Jersey cannabis enthusiasts\n` +
                `⚖️ Responsible use and legal compliance\n\n` +
                `**🔐 To get started, you'll need to verify your age:**\n` +
                `• **18+** for general cannabis education\n` +
                `• **21+** for consumption discussions (NJ law requirement)\n\n` +
                `**👀 Use \`/verify\` to begin the verification process**`
            )
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 128 }))
            .setImage('https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=200&fit=crop') // Cannabis leaf banner
            .addFields(
                {
                    name: '📋 Server Rules',
                    value: 'Please read our <#rules-channel> before participating',
                    inline: true
                },
                {
                    name: '❓ Need Help?',
                    value: 'Ask questions in <#general> or DM a moderator',
                    inline: true
                },
                {
                    name: '🔞 Age Verification',
                    value: 'Required for access to cannabis content areas',
                    inline: true
                }
            )
            .setFooter({ 
                text: FOOTER_TEXT,
                iconURL: guild.iconURL({ dynamic: true })
            })
            .setTimestamp();
    }

    /**
     * Server guide embed explaining channels and features
     * @param {Guild} guild - Discord guild
     * @returns {EmbedBuilder} - Server guide embed
     */
    static createServerGuideEmbed(guild) {
        return new EmbedBuilder()
            .setColor(BRAND_COLORS.DARK_GREEN)
            .setTitle('🗺️ Server Guide & Channel Overview')
            .setDescription(
                `Welcome to **${guild.name}**! Here's your guide to navigating our cannabis community.\n\n` +
                `**Our server is organized into two main access zones:**`
            )
            .addFields(
                {
                    name: '🌱 Zone 1: Public Access (18+)',
                    value: 
                        `📢 **General Discussion** - Community chat and introductions\n` +
                        `🌿 **Growing Tips** - Cultivation advice and techniques\n` +
                        `📸 **Harvest Showcase** - Share your growing achievements\n` +
                        `🎓 **Cannabis Education** - Learn about cannabis science\n` +
                        `📰 **News & Updates** - Cannabis industry and legal news`,
                    inline: false
                },
                {
                    name: '🔒 Zone 2: Cannabis Access (21+)',
                    value: 
                        `💨 **Consumption Discussion** - Effects, methods, experiences\n` +
                        `⭐ **Product Reviews** - Dispensary and product reviews\n` +
                        `🎉 **Social Events** - Community meetups and activities\n` +
                        `💰 **Deals & Discounts** - Share dispensary promotions\n` +
                        `🧪 **Advanced Topics** - Concentrates, edibles, processing`,
                    inline: false
                },
                {
                    name: '🏆 Member Progression System',
                    value: 
                        `🌱 **Seedling** - New verified members\n` +
                        `🌿 **Growing** - Active community participants\n` +
                        `🌳 **Established** - Long-term contributors\n` +
                        `🏆 **Harvested** - Community veterans and helpers`,
                    inline: false
                }
            )
            .setFooter({ 
                text: `${FOOTER_TEXT} • Use /verify to access restricted areas`,
                iconURL: guild.iconURL({ dynamic: true })
            })
            .setTimestamp();
    }

    /**
     * Community rules embed with cannabis-specific guidelines
     * @param {Guild} guild - Discord guild
     * @returns {EmbedBuilder} - Rules embed
     */
    static createRulesEmbed(guild) {
        return new EmbedBuilder()
            .setColor(BRAND_COLORS.WARNING)
            .setTitle('📜 Community Rules & Guidelines')
            .setDescription(
                `**Welcome to ${guild.name}!** Please read and follow these rules to maintain a safe, legal, and welcoming community for all members.`
            )
            .addFields(
                {
                    name: '⚖️ Legal Compliance (MANDATORY)',
                    value: 
                        `• **Must be 21+ for cannabis consumption discussions**\n` +
                        `• **No illegal activities** - Follow all NJ and federal laws\n` +
                        `• **No sales or transfers** - Educational purposes only\n` +
                        `• **Respect legal boundaries** - Private property, public spaces\n` +
                        `• **No impaired driving** discussions or encouragement`,
                    inline: false
                },
                {
                    name: '🤝 Community Standards',
                    value: 
                        `• **Be respectful** - Treat all members with kindness\n` +
                        `• **No spam or self-promotion** without permission\n` +
                        `• **Stay on topic** in dedicated channels\n` +
                        `• **No NSFW content** outside designated areas\n` +
                        `• **Use appropriate language** - Family-friendly when possible`,
                    inline: false
                },
                {
                    name: '🌿 Cannabis Discussion Guidelines',
                    value: 
                        `• **Educational focus** - Share knowledge and experiences\n` +
                        `• **No medical advice** - Consult healthcare professionals\n` +
                        `• **Respect dosage discussions** - Emphasize responsible use\n` +
                        `• **Quality over quantity** - Thoughtful posts appreciated\n` +
                        `• **Source your claims** - Back up statements with evidence`,
                    inline: false
                },
                {
                    name: '🚨 Enforcement & Appeals',
                    value: 
                        `**Violations may result in:** Warnings → Temporary bans → Permanent bans\n` +
                        `**Appeals process:** DM moderators with appeal requests\n` +
                        `**Zero tolerance:** Illegal activities, harassment, underage access`,
                    inline: false
                }
            )
            .setFooter({ 
                text: `${FOOTER_TEXT} • Last updated: ${new Date().toLocaleDateString()}`,
                iconURL: guild.iconURL({ dynamic: true })
            })
            .setTimestamp();
    }

    /**
     * Age verification instructions embed
     * @param {Guild} guild - Discord guild
     * @returns {EmbedBuilder} - Verification instructions embed
     */
    static createVerificationInstructionsEmbed(guild) {
        return new EmbedBuilder()
            .setColor(BRAND_COLORS.INFO)
            .setTitle('🔞 Age Verification Instructions')
            .setDescription(
                `**Age verification is required to access cannabis content areas.** This process ensures legal compliance with New Jersey cannabis laws.\n\n` +
                `**Why verification is required:**\n` +
                `• New Jersey law requires 21+ for cannabis consumption\n` +
                `• Discord Terms of Service compliance\n` +
                `• Community safety and legal protection`
            )
            .addFields(
                {
                    name: '🚀 Quick Start - Use the /verify Command',
                    value: 
                        `1️⃣ Type \`/verify\` in any channel\n` +
                        `2️⃣ Read the legal disclaimer carefully\n` +
                        `3️⃣ Click "✅ I Verify - I am 21+" if you're 21 or older\n` +
                        `4️⃣ Receive your verified role and access to restricted channels`,
                    inline: false
                },
                {
                    name: '🔐 What Happens After Verification',
                    value: 
                        `**21+ Members Receive:**\n` +
                        `• **@Member** role for general access\n` +
                        `• **@Cannabis Access** role for consumption discussions\n` +
                        `• **@Seedling** starter rank in our progression system\n` +
                        `• Access to all cannabis-related channels and content`,
                    inline: false
                },
                {
                    name: '🛡️ Privacy & Security',
                    value: 
                        `• All verification interactions are **completely private**\n` +
                        `• No personal information is stored beyond Discord ID\n` +
                        `• Your verification status is encrypted and secure\n` +
                        `• Only you and authorized staff can see verification details`,
                    inline: false
                },
                {
                    name: '❓ Need Help?',
                    value: 
                        `**Having trouble?** Contact our moderation team:\n` +
                        `• DM any online moderator\n` +
                        `• Ask in <#general> for public help\n` +
                        `• Check <#faq> for common issues`,
                    inline: false
                }
            )
            .setFooter({ 
                text: `${FOOTER_TEXT} • Your privacy is protected`,
                iconURL: guild.iconURL({ dynamic: true })
            })
            .setTimestamp();
    }

    /**
     * Enhanced age verification embed with improved branding
     * @returns {EmbedBuilder} - Enhanced verification embed
     */
    static createEnhancedVerificationEmbed() {
        return new EmbedBuilder()
            .setColor(BRAND_COLORS.PRIMARY_GREEN)
            .setTitle('🌿 Growmies NJ Age Verification')
            .setDescription(
                `**Welcome to New Jersey's premier cannabis community!**\n\n` +
                `Cannabis is legal in New Jersey for adults 21 and older. To ensure legal compliance ` +
                `and provide you with the best community experience, we need to verify your age.\n\n` +
                `⚠️ **IMPORTANT LEGAL NOTICE:**\n` +
                `• You must be **21 years of age or older** to access cannabis discussions\n` +
                `• Cannabis possession and consumption is only legal for adults 21+\n` +
                `• This verification is required for Discord ToS compliance\n` +
                `• False verification may result in immediate permanent ban\n\n` +
                `**By clicking "I Verify" below, you confirm that:**\n` +
                `✅ You are 21 years of age or older\n` +
                `✅ You understand New Jersey cannabis laws and regulations\n` +
                `✅ You agree to follow all community guidelines and rules\n` +
                `✅ All verification information provided is accurate and truthful\n` +
                `✅ You will use cannabis education responsibly and legally`
            )
            .addFields(
                {
                    name: '🎖️ What You Get After Verification',
                    value: 
                        `• **@Member** role for community access\n` +
                        `• **@Cannabis Access** for 21+ discussions\n` +
                        `• **@Seedling** starting rank in our progression\n` +
                        `• Access to all cannabis education and discussion areas`,
                    inline: true
                },
                {
                    name: '🛡️ Your Privacy Matters',
                    value: 
                        `• This verification is completely private\n` +
                        `• No personal data stored beyond Discord ID\n` +
                        `• Encrypted secure verification process\n` +
                        `• Only authorized staff have access`,
                    inline: true
                }
            )
            .setImage('https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&h=150&fit=crop')
            .setFooter({ 
                text: 'This verification is private and secure • Growmies NJ Community',
                iconURL: 'https://images.unsplash.com/photo-1583431392102-50db8a9e8e0c?w=64&h=64&fit=crop&crop=center'
            })
            .setTimestamp();
    }

    /**
     * Role assignment success embed
     * @param {GuildMember} member - Discord guild member
     * @param {Array<string>} roles - Assigned role names
     * @returns {EmbedBuilder} - Success embed
     */
    static createRoleAssignmentSuccessEmbed(member, roles) {
        return new EmbedBuilder()
            .setColor(BRAND_COLORS.SUCCESS)
            .setTitle('🎉 Welcome to the Community!')
            .setDescription(
                `Congratulations ${member.displayName || member.user.username}! ` +
                `Your age verification is complete and you've been granted access to our cannabis community.`
            )
            .addFields(
                {
                    name: '🏆 Roles Assigned',
                    value: roles.map(role => `• **@${role}**`).join('\n'),
                    inline: true
                },
                {
                    name: '🌱 Next Steps',
                    value: 
                        `• Explore the newly accessible channels\n` +
                        `• Introduce yourself in <#general>\n` +
                        `• Check out <#growing-tips> for cultivation advice\n` +
                        `• Join discussions in <#consumption>`,
                    inline: true
                }
            )
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 128 }))
            .setFooter({ 
                text: `${FOOTER_TEXT} • Enjoy your time in the community!`
            })
            .setTimestamp();
    }
}

/**
 * Utility functions for embed customization
 */
class EmbedUtils {
    
    /**
     * Add cannabis compliance footer to any embed
     * @param {EmbedBuilder} embed - Existing embed
     * @param {string} additionalText - Additional footer text
     * @returns {EmbedBuilder} - Updated embed
     */
    static addComplianceFooter(embed, additionalText = '') {
        const footerText = additionalText 
            ? `${FOOTER_TEXT} • ${additionalText}`
            : FOOTER_TEXT;
        
        return embed.setFooter({ text: footerText });
    }

    /**
     * Create error embed with consistent styling
     * @param {string} title - Error title
     * @param {string} description - Error description
     * @param {string} errorCode - Optional error code
     * @returns {EmbedBuilder} - Error embed
     */
    static createErrorEmbed(title, description, errorCode = null) {
        const embed = new EmbedBuilder()
            .setColor(BRAND_COLORS.ERROR)
            .setTitle(`❌ ${title}`)
            .setDescription(description);

        if (errorCode) {
            embed.addFields({
                name: 'Error Code',
                value: `\`${errorCode}\``,
                inline: true
            });
        }

        return this.addComplianceFooter(embed, 'Contact staff if this error persists');
    }

    /**
     * Create success embed with consistent styling
     * @param {string} title - Success title
     * @param {string} description - Success description
     * @returns {EmbedBuilder} - Success embed
     */
    static createSuccessEmbed(title, description) {
        return new EmbedBuilder()
            .setColor(BRAND_COLORS.SUCCESS)
            .setTitle(`✅ ${title}`)
            .setDescription(description)
            .setFooter({ text: FOOTER_TEXT });
    }

    /**
     * Create warning embed with consistent styling
     * @param {string} title - Warning title
     * @param {string} description - Warning description
     * @returns {EmbedBuilder} - Warning embed
     */
    static createWarningEmbed(title, description) {
        return new EmbedBuilder()
            .setColor(BRAND_COLORS.WARNING)
            .setTitle(`⚠️ ${title}`)
            .setDescription(description)
            .setFooter({ text: FOOTER_TEXT });
    }
}

module.exports = {
    WelcomeEmbeds,
    EmbedUtils,
    BRAND_COLORS,
    FOOTER_TEXT
};