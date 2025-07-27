/**
 * Podcast Command for GrowmiesNJ Discord Bot
 * 
 * Cannabis-Specific Music Feature: Educational cannabis podcasts and content
 * Features age verification, content categories, and educational tracking
 */

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const musicService = require('../../services/musicService');
const { MusicSession } = require('../../database/models/MusicSession');
const { MusicQueue } = require('../../database/models/MusicQueue');
const EngagementService = require('../../services/engagementService');
const { checkAge21Plus } = require('../../utils/ageVerification');
const { BRAND_COLORS } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('podcast')
    .setDescription('🎙️ Play educational cannabis podcasts and content (21+ only)')
    .addSubcommand(subcommand =>
      subcommand
        .setName('play')
        .setDescription('Play a specific podcast or episode')
        .addStringOption(option =>
          option
            .setName('category')
            .setDescription('Podcast category to browse')
            .setRequired(true)
            .addChoices(
              { name: '🔬 Cannabis Science', value: 'science' },
              { name: '📚 Education & Awareness', value: 'education' },
              { name: '⚖️ Legal & Policy', value: 'legal' },
              { name: '🌱 Growing & Cultivation', value: 'growing' },
              { name: '💊 Medical Cannabis', value: 'medical' },
              { name: '🏭 Industry News', value: 'industry' },
              { name: '📖 History & Culture', value: 'history' }
            )
        )
        .addStringOption(option =>
          option
            .setName('search')
            .setDescription('Search for specific podcast or topic')
            .setRequired(false)
        )
        .addBooleanOption(option =>
          option
            .setName('auto_queue')
            .setDescription('Automatically queue related episodes')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('browse')
        .setDescription('Browse available podcast categories and episodes')
        .addStringOption(option =>
          option
            .setName('filter')
            .setDescription('Filter content by type')
            .setRequired(false)
            .addChoices(
              { name: '🎓 Beginner Friendly', value: 'beginner' },
              { name: '🔬 Advanced/Scientific', value: 'advanced' },
              { name: '⚖️ Legal Focus', value: 'legal' },
              { name: '💊 Medical Focus', value: 'medical' },
              { name: '🌱 Growing Focus', value: 'growing' }
            )
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('library')
        .setDescription('View your podcast library and listening history')
        .addStringOption(option =>
          option
            .setName('view')
            .setDescription('What to display from your library')
            .setRequired(false)
            .addChoices(
              { name: '📚 Recently Played', value: 'recent' },
              { name: '❤️ Favorites', value: 'favorites' },
              { name: '📋 Saved for Later', value: 'saved' },
              { name: '📊 Learning Progress', value: 'progress' }
            )
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('learn')
        .setDescription('Get educational resources and study guides')
        .addStringOption(option =>
          option
            .setName('topic')
            .setDescription('Specific cannabis education topic')
            .setRequired(true)
            .addChoices(
              { name: '🔬 Cannabis Science Basics', value: 'science_basics' },
              { name: '🌿 Cannabinoids & Terpenes', value: 'cannabinoids' },
              { name: '💊 Medical Applications', value: 'medical_apps' },
              { name: '⚖️ Legal Framework', value: 'legal_framework' },
              { name: '🌱 Cultivation Basics', value: 'cultivation' },
              { name: '🛡️ Safety & Dosing', value: 'safety' }
            )
        )
    ),

  async execute(interaction) {
    try {
      const subcommand = interaction.options.getSubcommand();
      const userId = interaction.user.id;
      const guildId = interaction.guild.id;

      await interaction.deferReply();

      // Age verification check for cannabis content
      const ageVerified = await checkAge21Plus(userId, guildId);
      if (!ageVerified.verified) {
        return await interaction.editReply({
          embeds: [this.createAgeVerificationEmbed()],
          ephemeral: true
        });
      }

      // Route to appropriate subcommand handler
      switch (subcommand) {
        case 'play':
          await this.handlePlayPodcast(interaction, userId, guildId);
          break;
        case 'browse':
          await this.handleBrowsePodcasts(interaction, userId, guildId);
          break;
        case 'library':
          await this.handlePodcastLibrary(interaction, userId, guildId);
          break;
        case 'learn':
          await this.handleEducationalContent(interaction, userId, guildId);
          break;
        default:
          await interaction.editReply({
            embeds: [this.createErrorEmbed('Unknown Command', 'Invalid subcommand specified.')]
          });
      }

    } catch (error) {
      console.error('Error executing podcast command:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor(BRAND_COLORS.ERROR)
        .setTitle('❌ Podcast Command Error')
        .setDescription('An unexpected error occurred while accessing podcast content.')
        .setFooter({
          text: 'GrowmiesNJ • Cannabis Education System',
          iconURL: interaction.client.user.displayAvatarURL()
        })
        .setTimestamp();

      if (interaction.deferred) {
        await interaction.editReply({ embeds: [errorEmbed] });
      } else {
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      }
    }
  },

  /**
   * Handle play podcast subcommand
   */
  async handlePlayPodcast(interaction, userId, guildId) {
    const category = interaction.options.getString('category');
    const search = interaction.options.getString('search');
    const autoQueue = interaction.options.getBoolean('auto_queue') || false;

    try {
      // Check if user is in a voice channel
      const member = interaction.guild.members.cache.get(userId);
      if (!member.voice.channel) {
        return await interaction.editReply({
          embeds: [this.createErrorEmbed(
            'Voice Channel Required',
            '🔊 You must be in a voice channel to play podcasts.\n\nJoin a voice channel and try again!'
          )]
        });
      }

      // Get podcast content for category/search
      const podcastContent = await this.getPodcastContent(category, search);
      
      if (!podcastContent.episodes || podcastContent.episodes.length === 0) {
        return await interaction.editReply({
          embeds: [this.createErrorEmbed(
            'No Content Found',
            `❌ No podcast episodes found for "${search || category}".\n\nTry a different search term or category.`
          )]
        });
      }

      // Start or join music session
      let sessionResult;
      if (musicService.hasActiveSession(guildId)) {
        const currentSession = await musicService.getQueueStatus(guildId);
        sessionResult = { success: true, session: currentSession.session };
      } else {
        sessionResult = await this.createEducationalSession(guildId, userId, member.voice.channel, category);
      }

      if (!sessionResult.success) {
        return await interaction.editReply({
          embeds: [this.createErrorEmbed(
            'Session Start Failed',
            `❌ ${sessionResult.error}\n\nPlease try again.`
          )]
        });
      }

      // Add podcast episode(s) to queue
      const selectedEpisode = podcastContent.episodes[0]; // For demo, select first episode
      await this.addPodcastToQueue(sessionResult.session.id, selectedEpisode, userId, autoQueue ? podcastContent.episodes : [selectedEpisode]);

      // Award XP for educational content engagement
      await EngagementService.trackEngagementActivity(
        userId,
        guildId,
        'cannabis_education_podcast',
        interaction.channelId,
        {
          category: category,
          episode_title: selectedEpisode.title,
          auto_queue: autoQueue,
          xp_earned: 15
        }
      );

      // Create podcast playback embed
      const embed = await this.createPodcastPlaybackEmbed(selectedEpisode, category, podcastContent.episodes.length);
      const components = this.createPodcastControls(selectedEpisode, userId, autoQueue);

      await interaction.editReply({
        embeds: [embed],
        components: components
      });

      // Start playing the podcast
      await musicService.playTrack(guildId, {
        url: selectedEpisode.audio_url,
        title: selectedEpisode.title,
        source: 'educational_podcast',
        isCannabisContent: true,
        requestedBy: userId
      });

    } catch (error) {
      console.error('Error playing podcast:', error);
      await interaction.editReply({
        embeds: [this.createErrorEmbed(
          'Playback Failed',
          'Failed to start podcast playback. Please try again.'
        )]
      });
    }
  },

  /**
   * Handle browse podcasts subcommand
   */
  async handleBrowsePodcasts(interaction, userId, guildId) {
    const filter = interaction.options.getString('filter') || 'all';

    try {
      const categories = await this.getPodcastCategories(filter);
      
      const embed = new EmbedBuilder()
        .setColor(BRAND_COLORS.PRIMARY_GREEN)
        .setTitle('🎙️ Cannabis Education Podcast Library')
        .setDescription('Browse our comprehensive collection of cannabis education content.');

      // Add category information
      for (const [categoryKey, categoryInfo] of Object.entries(categories)) {
        embed.addFields({
          name: `${categoryInfo.emoji} ${categoryInfo.name}`,
          value: `${categoryInfo.description}\n**Episodes:** ${categoryInfo.episodeCount}`,
          inline: true
        });
      }

      embed.addFields({
        name: '🎓 Educational Features',
        value: '• Expert interviews and research\n• Beginner to advanced content levels\n• Interactive learning materials\n• Progress tracking and certificates',
        inline: false
      });

      embed.setFooter({
        text: 'GrowmiesNJ • 21+ Cannabis Education Library',
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

      const components = this.createBrowseComponents(filter);

      await interaction.editReply({
        embeds: [embed],
        components: components
      });

    } catch (error) {
      console.error('Error browsing podcasts:', error);
      await interaction.editReply({
        embeds: [this.createErrorEmbed(
          'Browse Failed',
          'Failed to load podcast library. Please try again.'
        )]
      });
    }
  },

  /**
   * Handle podcast library subcommand
   */
  async handlePodcastLibrary(interaction, userId, guildId) {
    const view = interaction.options.getString('view') || 'recent';

    try {
      const libraryData = await this.getUserPodcastLibrary(userId, view);
      
      const embed = new EmbedBuilder()
        .setColor(BRAND_COLORS.INFO)
        .setTitle(`📚 Your Podcast Library - ${this.getViewDisplayName(view)}`)
        .setDescription(this.getLibraryDescription(view));

      if (libraryData.items && libraryData.items.length > 0) {
        const itemsList = libraryData.items.slice(0, 10).map((item, index) => {
          return `**${index + 1}.** ${item.title}\n${item.category} • ${item.duration} • ${item.status || 'Completed'}`;
        }).join('\n\n');

        embed.addFields({
          name: `📋 ${this.getViewDisplayName(view)} (${libraryData.items.length})`,
          value: itemsList,
          inline: false
        });
      } else {
        embed.addFields({
          name: '📭 No Content',
          value: `You haven't ${this.getViewAction(view)} any podcast episodes yet.\n\nUse \`/podcast play\` to start exploring cannabis education content!`,
          inline: false
        });
      }

      // Add learning statistics
      if (view === 'progress') {
        embed.addFields(
          {
            name: '📊 Learning Stats',
            value: `**Hours Listened:** ${libraryData.stats?.hoursListened || 0}\n**Episodes Completed:** ${libraryData.stats?.episodesCompleted || 0}\n**Certificates Earned:** ${libraryData.stats?.certificates || 0}`,
            inline: true
          },
          {
            name: '🎯 Current Focus',
            value: libraryData.stats?.currentFocus || 'Getting Started',
            inline: true
          }
        );
      }

      embed.setFooter({
        text: 'GrowmiesNJ • Personal Learning Library',
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

      const components = this.createLibraryComponents(view);

      await interaction.editReply({
        embeds: [embed],
        components: components
      });

    } catch (error) {
      console.error('Error showing podcast library:', error);
      await interaction.editReply({
        embeds: [this.createErrorEmbed(
          'Library Access Failed',
          'Failed to load your podcast library. Please try again.'
        )]
      });
    }
  },

  /**
   * Handle educational content subcommand
   */
  async handleEducationalContent(interaction, userId, guildId) {
    const topic = interaction.options.getString('topic');

    try {
      const educational = await this.getEducationalContent(topic);
      
      const embed = new EmbedBuilder()
        .setColor(BRAND_COLORS.SUCCESS)
        .setTitle(`🎓 ${educational.title}`)
        .setDescription(educational.description);

      // Add educational content fields
      for (const section of educational.sections) {
        embed.addFields({
          name: section.title,
          value: section.content,
          inline: false
        });
      }

      // Add recommended podcasts
      if (educational.recommendedPodcasts) {
        const podcastList = educational.recommendedPodcasts.map(podcast => 
          `• **${podcast.title}** (${podcast.duration})`
        ).join('\n');

        embed.addFields({
          name: '🎙️ Recommended Podcasts',
          value: podcastList,
          inline: false
        });
      }

      embed.setFooter({
        text: 'GrowmiesNJ • Cannabis Education Resources',
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

      const components = this.createEducationalComponents(topic);

      await interaction.editReply({
        embeds: [embed],
        components: components
      });

    } catch (error) {
      console.error('Error showing educational content:', error);
      await interaction.editReply({
        embeds: [this.createErrorEmbed(
          'Education Access Failed',
          'Failed to load educational content. Please try again.'
        )]
      });
    }
  },

  /**
   * Create educational session
   */
  async createEducationalSession(guildId, userId, voiceChannel, category) {
    try {
      // Join voice channel
      const joinResult = await musicService.joinVoiceChannel(
        voiceChannel,
        {
          sessionType: 'educational',
          isCannabisContent: true,
          startedBy: userId
        }
      );

      if (!joinResult.success) {
        return { success: false, error: joinResult.error };
      }

      // Create session in database
      const session = await MusicSession.create({
        guild_id: guildId,
        voice_channel_id: voiceChannel.id,
        session_type: 'educational',
        is_cannabis_content: true,
        started_by_user_id: userId,
        session_metadata: {
          content_type: 'podcast',
          category: category,
          educational_focus: true
        }
      });

      return { success: true, session };

    } catch (error) {
      console.error('Error creating educational session:', error);
      return { success: false, error: 'Failed to create educational session' };
    }
  },

  /**
   * Add podcast to queue
   */
  async addPodcastToQueue(sessionId, episode, userId, episodes) {
    try {
      // Add primary episode
      await MusicQueue.addToQueue(sessionId, {
        url: episode.audio_url,
        title: episode.title,
        duration: episode.duration_seconds,
        requestedBy: userId,
        source: 'educational_podcast',
        isCannabisContent: true,
        metadata: {
          category: episode.category,
          description: episode.description,
          educational: true,
          difficulty_level: episode.difficulty
        }
      });

      // Add additional episodes if auto-queue is enabled
      if (episodes.length > 1) {
        for (let i = 1; i < Math.min(episodes.length, 5); i++) {
          const additionalEpisode = episodes[i];
          await MusicQueue.addToQueue(sessionId, {
            url: additionalEpisode.audio_url,
            title: additionalEpisode.title,
            duration: additionalEpisode.duration_seconds,
            requestedBy: userId,
            source: 'educational_podcast',
            isCannabisContent: true,
            metadata: {
              category: additionalEpisode.category,
              description: additionalEpisode.description,
              educational: true,
              difficulty_level: additionalEpisode.difficulty,
              auto_queued: true
            }
          });
        }
      }

    } catch (error) {
      console.error('Error adding podcast to queue:', error);
      throw error;
    }
  },

  /**
   * Get podcast content for category/search
   */
  async getPodcastContent(category, search) {
    // This would integrate with a real podcast content database
    // For demo purposes, return structured mock data
    
    const contentDatabase = {
      science: {
        name: 'Cannabis Science',
        episodes: [
          {
            title: 'Understanding Cannabinoids: THC vs CBD',
            description: 'Deep dive into the science behind cannabis compounds',
            audio_url: 'https://example.com/podcast/cannabinoids-science.mp3',
            duration: '45:30',
            duration_seconds: 2730,
            category: 'Cannabis Science',
            difficulty: 'intermediate',
            thumbnail: 'https://example.com/thumbnails/science1.jpg'
          },
          {
            title: 'Terpenes and the Entourage Effect',
            description: 'How terpenes enhance cannabis effects',
            audio_url: 'https://example.com/podcast/terpenes-entourage.mp3',
            duration: '38:15',
            duration_seconds: 2295,
            category: 'Cannabis Science',
            difficulty: 'intermediate',
            thumbnail: 'https://example.com/thumbnails/science2.jpg'
          }
        ]
      },
      education: {
        name: 'Education & Awareness',
        episodes: [
          {
            title: 'Cannabis 101: A Beginner\'s Guide',
            description: 'Complete introduction to cannabis for newcomers',
            audio_url: 'https://example.com/podcast/cannabis-101.mp3',
            duration: '52:10',
            duration_seconds: 3130,
            category: 'Education',
            difficulty: 'beginner',
            thumbnail: 'https://example.com/thumbnails/edu1.jpg'
          }
        ]
      },
      legal: {
        name: 'Legal & Policy',
        episodes: [
          {
            title: 'Cannabis Legalization: State by State',
            description: 'Current legal landscape across the United States',
            audio_url: 'https://example.com/podcast/legal-landscape.mp3',
            duration: '41:25',
            duration_seconds: 2485,
            category: 'Legal & Policy',
            difficulty: 'intermediate',
            thumbnail: 'https://example.com/thumbnails/legal1.jpg'
          }
        ]
      },
      medical: {
        name: 'Medical Cannabis',
        episodes: [
          {
            title: 'Medical Cannabis for Chronic Pain',
            description: 'Evidence-based approach to cannabis pain management',
            audio_url: 'https://example.com/podcast/medical-pain.mp3',
            duration: '48:30',
            duration_seconds: 2910,
            category: 'Medical Cannabis',
            difficulty: 'advanced',
            thumbnail: 'https://example.com/thumbnails/medical1.jpg'
          }
        ]
      }
    };

    const categoryContent = contentDatabase[category] || contentDatabase.education;
    
    // Filter by search if provided
    if (search) {
      const filteredEpisodes = categoryContent.episodes.filter(episode =>
        episode.title.toLowerCase().includes(search.toLowerCase()) ||
        episode.description.toLowerCase().includes(search.toLowerCase())
      );
      return { ...categoryContent, episodes: filteredEpisodes };
    }

    return categoryContent;
  },

  /**
   * Get podcast categories
   */
  async getPodcastCategories(filter) {
    const categories = {
      science: {
        emoji: '🔬',
        name: 'Cannabis Science',
        description: 'Scientific research, cannabinoids, and chemistry',
        episodeCount: 25,
        difficulty: 'intermediate'
      },
      education: {
        emoji: '📚',
        name: 'Education & Awareness',
        description: 'General cannabis education and awareness',
        episodeCount: 40,
        difficulty: 'beginner'
      },
      legal: {
        emoji: '⚖️',
        name: 'Legal & Policy',
        description: 'Cannabis laws, regulations, and policy',
        episodeCount: 18,
        difficulty: 'intermediate'
      },
      growing: {
        emoji: '🌱',
        name: 'Growing & Cultivation',
        description: 'Cannabis cultivation and growing techniques',
        episodeCount: 32,
        difficulty: 'advanced'
      },
      medical: {
        emoji: '💊',
        name: 'Medical Cannabis',
        description: 'Medical applications and research',
        episodeCount: 28,
        difficulty: 'advanced'
      },
      industry: {
        emoji: '🏭',
        name: 'Industry News',
        description: 'Cannabis business and industry updates',
        episodeCount: 15,
        difficulty: 'intermediate'
      },
      history: {
        emoji: '📖',
        name: 'History & Culture',
        description: 'Cannabis history and cultural impact',
        episodeCount: 22,
        difficulty: 'beginner'
      }
    };

    // Filter categories based on filter parameter
    if (filter !== 'all') {
      return Object.fromEntries(
        Object.entries(categories).filter(([key, category]) => {
          switch (filter) {
            case 'beginner': return category.difficulty === 'beginner';
            case 'advanced': return category.difficulty === 'advanced';
            case 'legal': return key === 'legal';
            case 'medical': return key === 'medical';
            case 'growing': return key === 'growing';
            default: return true;
          }
        })
      );
    }

    return categories;
  },

  /**
   * Get user podcast library
   */
  async getUserPodcastLibrary(userId, view) {
    // This would fetch from user's actual library in database
    // Mock data for demonstration
    
    const mockLibrary = {
      recent: {
        items: [
          {
            title: 'Understanding Cannabinoids: THC vs CBD',
            category: 'Cannabis Science',
            duration: '45:30',
            status: 'Completed',
            date: '2024-01-15'
          },
          {
            title: 'Cannabis 101: A Beginner\'s Guide',
            category: 'Education',
            duration: '52:10',
            status: 'In Progress (35:20)',
            date: '2024-01-14'
          }
        ]
      },
      favorites: {
        items: [
          {
            title: 'Terpenes and the Entourage Effect',
            category: 'Cannabis Science',
            duration: '38:15',
            rating: '⭐⭐⭐⭐⭐'
          }
        ]
      },
      saved: {
        items: [
          {
            title: 'Cannabis Legalization: State by State',
            category: 'Legal & Policy',
            duration: '41:25',
            savedDate: '2024-01-10'
          }
        ]
      },
      progress: {
        items: [
          {
            title: 'Current Learning Path: Cannabis Science Fundamentals',
            category: 'Learning Path',
            duration: '8 episodes',
            status: '3/8 completed'
          }
        ],
        stats: {
          hoursListened: 12.5,
          episodesCompleted: 8,
          certificates: 2,
          currentFocus: 'Cannabis Science Fundamentals'
        }
      }
    };

    return mockLibrary[view] || mockLibrary.recent;
  },

  /**
   * Get educational content for topic
   */
  async getEducationalContent(topic) {
    const content = {
      science_basics: {
        title: 'Cannabis Science Basics',
        description: 'Fundamental scientific concepts about cannabis and its compounds.',
        sections: [
          {
            title: '🧬 Plant Biology',
            content: '• Cannabis sativa plant structure\n• Trichomes and resin production\n• Flowering cycles and harvest timing\n• Genetic variations and phenotypes'
          },
          {
            title: '⚗️ Chemical Compounds',
            content: '• 100+ identified cannabinoids\n• 200+ terpenes and flavonoids\n• Cannabinoid biosynthesis pathway\n• Chemical interaction mechanisms'
          },
          {
            title: '🧠 Endocannabinoid System',
            content: '• CB1 and CB2 receptors\n• Endogenous cannabinoids\n• Homeostasis regulation\n• Therapeutic implications'
          }
        ],
        recommendedPodcasts: [
          { title: 'Understanding Cannabinoids: THC vs CBD', duration: '45:30' },
          { title: 'The Endocannabinoid System Explained', duration: '38:15' }
        ]
      },
      cannabinoids: {
        title: 'Cannabinoids & Terpenes',
        description: 'Detailed exploration of cannabis compounds and their effects.',
        sections: [
          {
            title: '🌿 Major Cannabinoids',
            content: '• **THC:** Psychoactive, euphoric effects\n• **CBD:** Non-psychoactive, therapeutic\n• **CBG:** Potential antibacterial properties\n• **CBN:** Sedating, sleep-promoting'
          },
          {
            title: '🍃 Common Terpenes',
            content: '• **Myrcene:** Sedating, muscle relaxant\n• **Limonene:** Mood elevating, stress relief\n• **Pinene:** Alertness, memory retention\n• **Linalool:** Calming, anti-anxiety'
          },
          {
            title: '🔄 Entourage Effect',
            content: '• Synergistic compound interactions\n• Enhanced therapeutic benefits\n• Full-spectrum vs isolate products\n• Personalized cannabinoid profiles'
          }
        ],
        recommendedPodcasts: [
          { title: 'Terpenes and the Entourage Effect', duration: '38:15' },
          { title: 'Minor Cannabinoids: The Next Frontier', duration: '42:10' }
        ]
      }
    };

    return content[topic] || content.science_basics;
  },

  /**
   * Create podcast playback embed
   */
  async createPodcastPlaybackEmbed(episode, category, totalEpisodes) {
    const embed = new EmbedBuilder()
      .setColor(BRAND_COLORS.SUCCESS)
      .setTitle('🎙️ Now Playing: Educational Podcast')
      .setDescription(`**${episode.title}**\n${episode.description}`)
      .addFields(
        {
          name: '📚 Category',
          value: episode.category,
          inline: true
        },
        {
          name: '⏱️ Duration',
          value: episode.duration,
          inline: true
        },
        {
          name: '🎯 Difficulty',
          value: episode.difficulty || 'Intermediate',
          inline: true
        },
        {
          name: '🎓 Educational Content',
          value: `This is part of our ${category} series with ${totalEpisodes} total episodes available.`,
          inline: false
        },
        {
          name: '🌿 Cannabis Education',
          value: '⚠️ Educational content for 21+ verified users\n📚 Progress tracked for learning achievements',
          inline: false
        }
      );

    if (episode.thumbnail) {
      embed.setThumbnail(episode.thumbnail);
    }

    embed.setFooter({
      text: 'GrowmiesNJ • Cannabis Education Network',
    })
    .setTimestamp();

    return embed;
  },

  /**
   * Create podcast control components
   */
  createPodcastControls(episode, userId, autoQueue) {
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`podcast_favorite_${userId}`)
          .setLabel('❤️ Favorite')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`podcast_save_${userId}`)
          .setLabel('💾 Save for Later')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`podcast_transcript_${userId}`)
          .setLabel('📄 Transcript')
          .setStyle(ButtonStyle.Primary)
      );

    return [row];
  },

  /**
   * Create browse components
   */
  createBrowseComponents(filter) {
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('podcast_category_select')
      .setPlaceholder('Choose a podcast category')
      .addOptions([
        {
          label: '🔬 Cannabis Science',
          value: 'science',
          description: 'Scientific research and cannabinoid chemistry'
        },
        {
          label: '📚 Education & Awareness',
          value: 'education',
          description: 'General cannabis education for all levels'
        },
        {
          label: '⚖️ Legal & Policy',
          value: 'legal',
          description: 'Cannabis laws and regulations'
        },
        {
          label: '🌱 Growing & Cultivation',
          value: 'growing',
          description: 'Cannabis cultivation techniques'
        },
        {
          label: '💊 Medical Cannabis',
          value: 'medical',
          description: 'Medical applications and research'
        }
      ]);

    const row = new ActionRowBuilder().addComponents(selectMenu);
    return [row];
  },

  /**
   * Create library components
   */
  createLibraryComponents(view) {
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`library_recent`)
          .setLabel('📚 Recent')
          .setStyle(view === 'recent' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`library_favorites`)
          .setLabel('❤️ Favorites')
          .setStyle(view === 'favorites' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`library_progress`)
          .setLabel('📊 Progress')
          .setStyle(view === 'progress' ? ButtonStyle.Primary : ButtonStyle.Secondary)
      );

    return [row];
  },

  /**
   * Create educational components
   */
  createEducationalComponents(topic) {
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`education_quiz_${topic}`)
          .setLabel('📝 Take Quiz')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`education_resources_${topic}`)
          .setLabel('📚 More Resources')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`education_podcast_${topic}`)
          .setLabel('🎙️ Related Podcasts')
          .setStyle(ButtonStyle.Success)
      );

    return [row];
  },

  /**
   * Helper methods for library views
   */
  getViewDisplayName(view) {
    const names = {
      recent: 'Recently Played',
      favorites: 'Favorites',
      saved: 'Saved for Later',
      progress: 'Learning Progress'
    };
    return names[view] || 'Recently Played';
  },

  getLibraryDescription(view) {
    const descriptions = {
      recent: 'Your recently played podcast episodes and current listening progress.',
      favorites: 'Episodes you\'ve marked as favorites for easy access.',
      saved: 'Episodes saved to listen to later.',
      progress: 'Your learning journey and educational achievements.'
    };
    return descriptions[view] || descriptions.recent;
  },

  getViewAction(view) {
    const actions = {
      recent: 'listened to',
      favorites: 'favorited',
      saved: 'saved',
      progress: 'started learning from'
    };
    return actions[view] || actions.recent;
  },

  /**
   * Create age verification embed
   */
  createAgeVerificationEmbed() {
    return new EmbedBuilder()
      .setColor(BRAND_COLORS.WARNING)
      .setTitle('🔞 Age Verification Required')
      .setDescription('Cannabis educational podcasts require age verification (21+).')
      .addFields(
        {
          name: '⚠️ Access Restricted',
          value: 'This educational content discusses cannabis and requires verification that you are 21 years or older.',
          inline: false
        },
        {
          name: '✅ Get Verified',
          value: 'Use `/verify age` to complete the age verification process and access educational cannabis content.',
          inline: false
        },
        {
          name: '🎓 Educational Purpose',
          value: 'Our podcast library provides evidence-based cannabis education from licensed professionals and researchers.',
          inline: false
        }
      )
      .setFooter({ text: 'GrowmiesNJ • Cannabis Education Network' })
      .setTimestamp();
  },

  /**
   * Create error embed
   */
  createErrorEmbed(title, description) {
    return new EmbedBuilder()
      .setColor(BRAND_COLORS.ERROR)
      .setTitle(`❌ ${title}`)
      .setDescription(description)
      .setFooter({ text: 'GrowmiesNJ • Cannabis Education System' })
      .setTimestamp();
  }
};