/**
 * Level Command for GrowmiesNJ Discord Bot
 * 
 * Cannabis-themed leveling system command to display user progression
 * Shows XP, level, tier, and progress information with cannabis branding
 */

const { SlashCommandBuilder, EmbedBuilder, InteractionContextType } = require('discord.js');
const { XPCalculationService } = require('../../services/xpCalculation');
const { LevelingConfig } = require('../../database/models/LevelingConfig');
const { User } = require('../../database/models/User');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('level')
        .setDescription('Check your cannabis community progression level and XP')
        .setContexts(InteractionContextType.Guild)
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Check another user\'s level (optional)')
                .setRequired(false)
        ),
    
    async execute(interaction) {
        try {
            await interaction.deferReply();

            const targetUser = interaction.options.getUser('user') || interaction.user;
            const isOwnLevel = targetUser.id === interaction.user.id;
            
            console.log(`🌿 Level command executed by ${interaction.user.tag} for ${targetUser.tag}`);

            // Get guild leveling configuration
            const config = await LevelingConfig.findByGuildId(interaction.guild.id);
            if (!config.isLevelingEnabled()) {
                const disabledEmbed = new EmbedBuilder()
                    .setTitle('🚫 Leveling System Disabled')
                    .setDescription('The cannabis progression system is currently disabled for this server.')
                    .setColor('#e74c3c')
                    .setFooter({ 
                        text: 'GrowmiesNJ Cannabis Community',
                        iconURL: interaction.guild.iconURL({ dynamic: true })
                    })
                    .setTimestamp();

                return await interaction.editReply({ embeds: [disabledEmbed] });
            }

            // Initialize XP service
            const xpService = new XPCalculationService();
            
            // Get user XP statistics
            const userStats = await xpService.getUserXPStats(targetUser.id, interaction.guild.id);
            
            if (!userStats.found) {
                const notFoundEmbed = new EmbedBuilder()
                    .setTitle('🌱 Welcome to GrowmiesNJ!')
                    .setDescription(
                        isOwnLevel ? 
                        'You haven\'t started your cannabis community journey yet! Send some messages to begin earning XP and growing your rank.' :
                        `${targetUser.displayName} hasn't started their cannabis community journey yet.`
                    )
                    .setColor('#f39c12')
                    .addFields(
                        {
                            name: '🌿 How to Start Growing',
                            value: [
                                '💬 **Send messages** in community channels',
                                '🎤 **Join voice chats** to connect with growers',
                                '👍 **Give helpful reactions** to support others',
                                '📚 **Learn and share** cannabis knowledge'
                            ].join('\n'),
                            inline: false
                        }
                    )
                    .setFooter({ 
                        text: 'GrowmiesNJ Cannabis Community • Start Your Journey',
                        iconURL: interaction.guild.iconURL({ dynamic: true })
                    })
                    .setTimestamp();

                if (targetUser.displayAvatarURL) {
                    notFoundEmbed.setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 128 }));
                }

                return await interaction.editReply({ embeds: [notFoundEmbed] });
            }

            // Get user's rank in the guild
            const userRank = await this.getUserRank(targetUser.id, interaction.guild.id);
            
            // Calculate progress to next level
            const currentLevelXP = config.calculateXPForLevel(userStats.level);
            const nextLevelXP = config.calculateXPForLevel(userStats.level + 1);
            const progressXP = userStats.total_xp - currentLevelXP;
            const requiredXP = nextLevelXP - currentLevelXP;
            const progressPercentage = Math.round((progressXP / requiredXP) * 100);

            // Create progress bar
            const progressBar = this.createProgressBar(progressPercentage);

            // Get tier emoji and color
            const tierInfo = this.getTierInfo(userStats.tier);

            // Create level embed
            const levelEmbed = new EmbedBuilder()
                .setTitle(`${tierInfo.emoji} ${targetUser.displayName}'s Cannabis Community Level`)
                .setDescription(`Growing strong in the GrowmiesNJ community! 🌿`)
                .setColor(tierInfo.color)
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 128 }))
                .addFields(
                    {
                        name: '🌱 Current Progression',
                        value: [
                            `**Level:** ${userStats.level}`,
                            `**Cannabis Tier:** ${tierInfo.emoji} ${userStats.tier}`,
                            `**Total XP:** ${userStats.total_xp.toLocaleString()}`,
                            `**Server Rank:** #${userRank}`
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '📊 Progress to Next Level',
                        value: [
                            `**Current:** ${progressXP.toLocaleString()} XP`,
                            `**Required:** ${requiredXP.toLocaleString()} XP`,
                            `**Remaining:** ${userStats.xp_needed.toLocaleString()} XP`,
                            `**Progress:** ${progressPercentage}%`
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '🏃 Activity Statistics',
                        value: [
                            `💬 **Messages:** ${userStats.messages_count.toLocaleString()}`,
                            `🎤 **Voice Time:** ${Math.floor(userStats.voice_time_minutes / 60)}h ${userStats.voice_time_minutes % 60}m`,
                            `👍 **Helpful Reactions:** ${userStats.reactions_received.toLocaleString()}`,
                            `⏰ **Last Active:** ${userStats.last_xp_gain ? `<t:${Math.floor(new Date(userStats.last_xp_gain).getTime() / 1000)}:R>` : 'Unknown'}`
                        ].join('\n'),
                        inline: false
                    },
                    {
                        name: `📈 Progress Bar (${progressPercentage}%)`,
                        value: progressBar,
                        inline: false
                    }
                )
                .addFields(
                    {
                        name: '🌿 Cannabis Tier Benefits',
                        value: this.getTierBenefits(userStats.tier),
                        inline: false
                    }
                )
                .setFooter({ 
                    text: `GrowmiesNJ Cannabis Community • ${isOwnLevel ? 'Keep Growing!' : `Viewed by ${interaction.user.username}`}`,
                    iconURL: interaction.guild.iconURL({ dynamic: true })
                })
                .setTimestamp();

            // Add next tier information if applicable
            if (userStats.tier !== 'Harvested') {
                const nextTier = this.getNextTier(userStats.tier);
                const nextTierInfo = this.getTierInfo(nextTier);
                
                levelEmbed.addFields({
                    name: `🎯 Next Tier: ${nextTierInfo.emoji} ${nextTier}`,
                    value: this.getNextTierRequirements(nextTier, userStats),
                    inline: false
                });
            }

            await interaction.editReply({ 
                embeds: [levelEmbed],
                ephemeral: isOwnLevel // Make own level private, others' levels public
            });

            console.log(`✅ Level command completed for ${targetUser.tag} (Level ${userStats.level}, ${userStats.tier})`);

        } catch (error) {
            console.error('❌ Error in level command:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Error')
                .setDescription('Unable to retrieve level information. Please try again later.')
                .setColor('#e74c3c')
                .setFooter({ text: 'GrowmiesNJ Cannabis Community • Error Handler' })
                .setTimestamp();

            try {
                if (interaction.replied || interaction.deferred) {
                    await interaction.editReply({ 
                        embeds: [errorEmbed]
                    });
                } else {
                    await interaction.reply({ 
                        embeds: [errorEmbed], 
                        ephemeral: true 
                    });
                }
            } catch (followUpError) {
                console.error('❌ Failed to send level error response:', followUpError);
            }
        }
    },

    /**
     * Get user's rank in the guild
     * @param {string} userId - Discord user ID
     * @param {string} guildId - Discord guild ID
     * @returns {Promise<number>} User's rank
     */
    async getUserRank(userId, guildId) {
        try {
            const { Op } = require('@sequelize/core');
            
            const user = await User.findOne({
                where: {
                    discord_id: userId,
                    guild_id: guildId,
                    is_active: true
                }
            });

            if (!user) return 'Unranked';

            const higherRankedCount = await User.count({
                where: {
                    guild_id: guildId,
                    is_active: true,
                    verification_status: 'verified',
                    total_xp: {
                        [Op.gt]: user.total_xp
                    }
                }
            });

            return higherRankedCount + 1;

        } catch (error) {
            console.error('❌ Error getting user rank:', error);
            return 'Unknown';
        }
    },

    /**
     * Create visual progress bar
     * @param {number} percentage - Progress percentage (0-100)
     * @returns {string} Progress bar string
     */
    createProgressBar(percentage) {
        const barLength = 20;
        const filledLength = Math.round((percentage / 100) * barLength);
        const emptyLength = barLength - filledLength;
        
        const filledBar = '🟩'.repeat(filledLength);
        const emptyBar = '⬜'.repeat(emptyLength);
        
        return `${filledBar}${emptyBar} ${percentage}%`;
    },

    /**
     * Get tier information including emoji and color
     * @param {string} tier - Cannabis tier name
     * @returns {Object} Tier information
     */
    getTierInfo(tier) {
        const tierMap = {
            'Seedling': { emoji: '🌱', color: '#27ae60' },
            'Growing': { emoji: '🌿', color: '#2ecc71' },
            'Established': { emoji: '🌳', color: '#16a085' },
            'Harvested': { emoji: '🏆', color: '#f39c12' }
        };
        
        return tierMap[tier] || { emoji: '🌱', color: '#95a5a6' };
    },

    /**
     * Get tier benefits description
     * @param {string} tier - Cannabis tier name
     * @returns {string} Benefits description
     */
    getTierBenefits(tier) {
        const benefits = {
            'Seedling': [
                '🌱 New member status in the cannabis community',
                '📚 Access to beginner cultivation guides',
                '💬 Participate in general discussions',
                '🎯 Foundation for your growing journey'
            ],
            'Growing': [
                '🌿 Active community participant recognition',
                '📖 Access to intermediate growing techniques',
                '🎤 Priority in voice channel discussions',
                '🤝 Mentor newer community members'
            ],
            'Established': [
                '🌳 Respected community contributor status',
                '🧪 Access to advanced cultivation methods',
                '⭐ Featured member highlights',
                '🏅 Special role recognition and perks'
            ],
            'Harvested': [
                '🏆 Elite cannabis community veteran status',
                '👑 Master cultivator recognition',
                '🎓 Exclusive access to expert content',
                '💎 Premium community features and benefits'
            ]
        };

        return benefits[tier]?.join('\n') || 'Cannabis community benefits await!';
    },

    /**
     * Get next tier in progression
     * @param {string} currentTier - Current cannabis tier
     * @returns {string} Next tier name
     */
    getNextTier(currentTier) {
        const progression = ['Seedling', 'Growing', 'Established', 'Harvested'];
        const currentIndex = progression.indexOf(currentTier);
        return currentIndex < progression.length - 1 ? progression[currentIndex + 1] : 'Harvested';
    },

    /**
     * Get requirements for next tier
     * @param {string} nextTier - Next tier name
     * @param {Object} userStats - Current user statistics
     * @returns {string} Requirements description
     */
    getNextTierRequirements(nextTier, userStats) {
        const requirements = {
            'Growing': [
                `Level 11+ (Current: ${userStats.level})`,
                `30+ messages (Current: ${userStats.messages_count})`,
                '7+ days of community participation'
            ],
            'Established': [
                `Level 26+ (Current: ${userStats.level})`,
                `100+ messages (Current: ${userStats.messages_count})`,
                `60+ minutes voice time (Current: ${userStats.voice_time_minutes}m)`,
                '30+ days of community participation'
            ],
            'Harvested': [
                `Level 51+ (Current: ${userStats.level})`,
                `500+ messages (Current: ${userStats.messages_count})`,
                `300+ minutes voice time (Current: ${userStats.voice_time_minutes}m)`,
                `50+ helpful reactions (Current: ${userStats.reactions_received})`,
                '90+ days of dedicated community participation'
            ]
        };

        const reqs = requirements[nextTier];
        return reqs ? reqs.join('\n') : 'You\'ve reached the highest tier! 🏆';
    }
};