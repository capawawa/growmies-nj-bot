/**
 * Leaderboard Command for GrowmiesNJ Discord Bot
 * 
 * Cannabis-themed leaderboard system showing top community members
 * Features pagination, tier filtering, and comprehensive XP rankings
 */

const { SlashCommandBuilder, EmbedBuilder, InteractionContextType } = require('discord.js');
const { LevelingConfig } = require('../../database/models/LevelingConfig');
const { User } = require('../../database/models/User');
const { Op } = require('@sequelize/core');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View the cannabis community leaderboard rankings')
        .setContexts(InteractionContextType.Guild)
        .addIntegerOption(option =>
            option.setName('page')
                .setDescription('Page number to view (default: 1)')
                .setMinValue(1)
                .setMaxValue(50)
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('tier')
                .setDescription('Filter by cannabis tier (default: all tiers)')
                .addChoices(
                    { name: '🌱 Seedling (Levels 1-10)', value: 'Seedling' },
                    { name: '🌿 Growing (Levels 11-25)', value: 'Growing' },
                    { name: '🌳 Established (Levels 26-50)', value: 'Established' },
                    { name: '🏆 Harvested (Levels 51+)', value: 'Harvested' }
                )
                .setRequired(false)
        ),
    
    async execute(interaction) {
        try {
            await interaction.deferReply();

            const page = interaction.options.getInteger('page') || 1;
            const tierFilter = interaction.options.getString('tier');
            
            console.log(`🏆 Leaderboard command executed by ${interaction.user.tag} - Page: ${page}${tierFilter ? `, Tier: ${tierFilter}` : ''}`);

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

            // Calculate pagination
            const usersPerPage = 10;
            const offset = (page - 1) * usersPerPage;

            // Build query filters
            const whereClause = {
                guild_id: interaction.guild.id,
                is_active: true,
                verification_status: 'verified',
                total_xp: {
                    [Op.gt]: 0
                }
            };

            // Add tier filter if specified
            if (tierFilter) {
                whereClause.current_tier = tierFilter;
            }

            // Get leaderboard data
            const { users, totalUsers, userRank } = await this.getLeaderboardData(
                whereClause, 
                offset, 
                usersPerPage, 
                interaction.user.id,
                interaction.guild
            );

            if (users.length === 0) {
                const emptyEmbed = new EmbedBuilder()
                    .setTitle('🌱 Growing Community')
                    .setDescription(
                        tierFilter ? 
                        `No community members found in the **${this.getTierInfo(tierFilter).emoji} ${tierFilter}** tier yet.\n\nKeep growing and you could be the first!` :
                        'No community members have started their cannabis journey yet.\n\nBe the first to start growing by participating in our community!'
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
                        text: 'GrowmiesNJ Cannabis Community • Start Growing Today',
                        iconURL: interaction.guild.iconURL({ dynamic: true })
                    })
                    .setTimestamp();

                return await interaction.editReply({ embeds: [emptyEmbed] });
            }

            // Calculate total pages
            const totalPages = Math.ceil(totalUsers / usersPerPage);

            // Create leaderboard embed
            const leaderboardEmbed = await this.createLeaderboardEmbed(
                users,
                page,
                totalPages,
                tierFilter,
                userRank,
                interaction
            );

            await interaction.editReply({ 
                embeds: [leaderboardEmbed],
                ephemeral: false // Public leaderboard
            });

            console.log(`✅ Leaderboard command completed - Page ${page}/${totalPages}, ${users.length} users displayed`);

        } catch (error) {
            console.error('❌ Error in leaderboard command:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Error')
                .setDescription('Unable to retrieve leaderboard information. Please try again later.')
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
                console.error('❌ Failed to send leaderboard error response:', followUpError);
            }
        }
    },

    /**
     * Get leaderboard data with user information
     * @param {Object} whereClause - Sequelize where clause
     * @param {number} offset - Query offset
     * @param {number} limit - Query limit
     * @param {string} requestingUserId - ID of user requesting leaderboard
     * @param {Object} guild - Discord guild object
     * @returns {Promise<Object>} Leaderboard data
     */
    async getLeaderboardData(whereClause, offset, limit, requestingUserId, guild) {
        try {
            // Get total count for pagination
            const totalUsers = await User.count({ where: whereClause });

            // Get top users for current page
            const users = await User.findAll({
                where: whereClause,
                order: [
                    ['total_xp', 'DESC'],
                    ['last_xp_gain', 'DESC'] // Tie-breaker: most recent activity
                ],
                limit,
                offset,
                attributes: [
                    'discord_id',
                    'current_level',
                    'current_tier', 
                    'total_xp',
                    'messages_count',
                    'voice_time_minutes',
                    'reactions_received',
                    'last_xp_gain'
                ]
            });

            // Get requesting user's rank if not on current page
            let userRank = null;
            const userOnPage = users.find(user => user.discord_id === requestingUserId);
            
            if (!userOnPage) {
                const requestingUser = await User.findOne({
                    where: {
                        discord_id: requestingUserId,
                        guild_id: guild.id,
                        is_active: true
                    }
                });

                if (requestingUser && requestingUser.total_xp > 0) {
                    const higherRankedCount = await User.count({
                        where: {
                            guild_id: guild.id,
                            is_active: true,
                            verification_status: 'verified',
                            total_xp: {
                                [Op.gt]: requestingUser.total_xp
                            }
                        }
                    });

                    userRank = {
                        rank: higherRankedCount + 1,
                        user: requestingUser,
                        member: await guild.members.fetch(requestingUserId).catch(() => null)
                    };
                }
            }

            // Fetch Discord member objects for users
            const enrichedUsers = await Promise.all(
                users.map(async (user, index) => {
                    const member = await guild.members.fetch(user.discord_id).catch(() => null);
                    return {
                        rank: offset + index + 1,
                        user,
                        member
                    };
                })
            );

            return {
                users: enrichedUsers.filter(u => u.member), // Only include users still in guild
                totalUsers,
                userRank
            };

        } catch (error) {
            console.error('❌ Error getting leaderboard data:', error);
            throw error;
        }
    },

    /**
     * Create leaderboard embed
     * @param {Array} users - Array of user data
     * @param {number} page - Current page
     * @param {number} totalPages - Total pages available
     * @param {string} tierFilter - Current tier filter
     * @param {Object} userRank - Requesting user's rank info
     * @param {Object} interaction - Discord interaction
     * @returns {Promise<EmbedBuilder>} Leaderboard embed
     */
    async createLeaderboardEmbed(users, page, totalPages, tierFilter, userRank, interaction) {
        const tierInfo = tierFilter ? this.getTierInfo(tierFilter) : null;
        
        const embed = new EmbedBuilder()
            .setTitle(`${tierInfo ? `${tierInfo.emoji} ${tierFilter} Tier ` : '🏆 '}Cannabis Community Leaderboard`)
            .setDescription(`Growing strong together in the GrowmiesNJ community! 🌿\n${tierFilter ? `Showing **${tierFilter}** tier members only` : 'Showing all community tiers'}`)
            .setColor(tierInfo ? tierInfo.color : '#2ecc71')
            .setThumbnail(interaction.guild.iconURL({ dynamic: true, size: 128 }));

        // Add leaderboard rankings
        const rankingText = users.map(({ rank, user, member }) => {
            const tierEmoji = this.getTierInfo(user.current_tier).emoji;
            const rankEmoji = this.getRankEmoji(rank);
            
            return [
                `${rankEmoji} **#${rank}** ${tierEmoji} ${member.displayName}`,
                `├ Level ${user.current_level} • ${user.total_xp.toLocaleString()} XP`,
                `└ ${user.messages_count} msgs • ${Math.floor(user.voice_time_minutes / 60)}h ${user.voice_time_minutes % 60}m voice\n`
            ].join('\n');
        }).join('');

        embed.addFields({
            name: `📋 Rankings (Page ${page}/${totalPages})`,
            value: rankingText || 'No rankings to display',
            inline: false
        });

        // Add user's position if not on current page
        if (userRank && userRank.member) {
            const tierEmoji = this.getTierInfo(userRank.user.current_tier).emoji;
            const yourRankText = [
                `${tierEmoji} **#${userRank.rank}** ${userRank.member.displayName}`,
                `├ Level ${userRank.user.current_level} • ${userRank.user.total_xp.toLocaleString()} XP`,
                `└ ${userRank.user.messages_count} msgs • ${Math.floor(userRank.user.voice_time_minutes / 60)}h ${userRank.user.voice_time_minutes % 60}m voice`
            ].join('\n');

            embed.addFields({
                name: '📍 Your Position',
                value: yourRankText,
                inline: false
            });
        }

        // Add tier statistics
        if (!tierFilter) {
            const tierStats = await this.getTierStatistics(interaction.guild.id);
            embed.addFields({
                name: '🌿 Community Tier Distribution',
                value: [
                    `🌱 **Seedling:** ${tierStats.Seedling} members`,
                    `🌿 **Growing:** ${tierStats.Growing} members`,
                    `🌳 **Established:** ${tierStats.Established} members`,
                    `🏆 **Harvested:** ${tierStats.Harvested} members`
                ].join('\n'),
                inline: true
            });

            embed.addFields({
                name: '📊 Activity Overview',
                value: [
                    `💬 **Total Messages:** ${tierStats.totalMessages.toLocaleString()}`,
                    `🎤 **Voice Hours:** ${Math.floor(tierStats.totalVoiceMinutes / 60).toLocaleString()}h`,
                    `👍 **Reactions Given:** ${tierStats.totalReactions.toLocaleString()}`,
                    `🌱 **Active Growers:** ${tierStats.totalActiveUsers}`
                ].join('\n'),
                inline: true
            });
        }

        // Add navigation hint
        if (totalPages > 1) {
            embed.addFields({
                name: '🧭 Navigation',
                value: `Use \`/leaderboard page:${page > 1 ? page - 1 : totalPages}\` for ${page > 1 ? 'previous' : 'last'} page\nUse \`/leaderboard page:${page < totalPages ? page + 1 : 1}\` for ${page < totalPages ? 'next' : 'first'} page`,
                inline: false
            });
        }

        embed.setFooter({ 
            text: `GrowmiesNJ Cannabis Community • Page ${page}/${totalPages} • Requested by ${interaction.user.username}`,
            iconURL: interaction.guild.iconURL({ dynamic: true })
        })
        .setTimestamp();

        return embed;
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
     * Get rank emoji for position
     * @param {number} rank - User rank position
     * @returns {string} Rank emoji
     */
    getRankEmoji(rank) {
        if (rank === 1) return '🥇';
        if (rank === 2) return '🥈';
        if (rank === 3) return '🥉';
        if (rank <= 10) return '🏅';
        return '📊';
    },

    /**
     * Get tier statistics for the guild
     * @param {string} guildId - Discord guild ID
     * @returns {Promise<Object>} Tier statistics
     */
    async getTierStatistics(guildId) {
        try {
            const stats = await User.findAll({
                where: {
                    guild_id: guildId,
                    is_active: true,
                    verification_status: 'verified',
                    total_xp: {
                        [Op.gt]: 0
                    }
                },
                attributes: [
                    'current_tier',
                    [User.sequelize.fn('COUNT', User.sequelize.col('discord_id')), 'count'],
                    [User.sequelize.fn('SUM', User.sequelize.col('messages_count')), 'totalMessages'],
                    [User.sequelize.fn('SUM', User.sequelize.col('voice_time_minutes')), 'totalVoiceMinutes'],
                    [User.sequelize.fn('SUM', User.sequelize.col('reactions_received')), 'totalReactions']
                ],
                group: ['current_tier'],
                raw: true
            });

            const tierCounts = {
                Seedling: 0,
                Growing: 0,
                Established: 0,
                Harvested: 0,
                totalMessages: 0,
                totalVoiceMinutes: 0,
                totalReactions: 0,
                totalActiveUsers: 0
            };

            stats.forEach(stat => {
                tierCounts[stat.current_tier] = parseInt(stat.count);
                tierCounts.totalMessages += parseInt(stat.totalMessages || 0);
                tierCounts.totalVoiceMinutes += parseInt(stat.totalVoiceMinutes || 0);
                tierCounts.totalReactions += parseInt(stat.totalReactions || 0);
                tierCounts.totalActiveUsers += parseInt(stat.count);
            });

            return tierCounts;

        } catch (error) {
            console.error('❌ Error getting tier statistics:', error);
            return {
                Seedling: 0, Growing: 0, Established: 0, Harvested: 0,
                totalMessages: 0, totalVoiceMinutes: 0, totalReactions: 0, totalActiveUsers: 0
            };
        }
    }
};