/**
 * Meditation Command for GrowmiesNJ Discord Bot
 * 
 * Cannabis-Specific Music Feature: Guided meditation sessions with cannabis integration
 * Features age verification, session types, and cannabis compliance tracking
 */

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const musicService = require('../../services/musicService');
const { MusicSession } = require('../../database/models/MusicSession');
const EngagementService = require('../../services/engagementService');
const { checkAge21Plus } = require('../../utils/ageVerification');
const { BRAND_COLORS } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('meditation')
    .setDescription('🧘 Start a cannabis-enhanced guided meditation session (21+ only)')
    .addSubcommand(subcommand =>
      subcommand
        .setName('start')
        .setDescription('Begin a guided meditation session')
        .addStringOption(option =>
          option
            .setName('type')
            .setDescription('Type of meditation session')
            .setRequired(true)
            .addChoices(
              { name: '🌿 Cannabis Mindfulness', value: 'cannabis_mindfulness' },
              { name: '🌱 Strain Meditation', value: 'strain_meditation' },
              { name: '🔥 Consumption Ritual', value: 'consumption_ritual' },
              { name: '🧘 General Wellness', value: 'general_wellness' },
              { name: '😴 Sleep Preparation', value: 'sleep_preparation' },
              { name: '💚 Anxiety Relief', value: 'anxiety_relief' }
            )
        )
        .addIntegerOption(option =>
          option
            .setName('duration')
            .setDescription('Session duration in minutes (5-60)')
            .setRequired(false)
            .setMinValue(5)
            .setMaxValue(60)
        )
        .addStringOption(option =>
          option
            .setName('strain_focus')
            .setDescription('Cannabis strain to focus meditation on (optional)')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('library')
        .setDescription('Browse available meditation content')
        .addStringOption(option =>
          option
            .setName('category')
            .setDescription('Filter by meditation category')
            .setRequired(false)
            .addChoices(
              { name: '🌿 Cannabis Focused', value: 'cannabis' },
              { name: '🧘 General Meditation', value: 'general' },
              { name: '😴 Sleep & Relaxation', value: 'sleep' },
              { name: '💚 Anxiety & Stress', value: 'anxiety' }
            )
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('guide')
        .setDescription('Get meditation guidance and tips')
        .addStringOption(option =>
          option
            .setName('topic')
            .setDescription('Specific guidance topic')
            .setRequired(false)
            .addChoices(
              { name: '🌿 Cannabis & Meditation', value: 'cannabis_meditation' },
              { name: '🔰 Beginner Tips', value: 'beginner_tips' },
              { name: '🧘 Breathing Techniques', value: 'breathing' },
              { name: '🍃 Strain Selection', value: 'strain_selection' }
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
        case 'start':
          await this.handleStartMeditation(interaction, userId, guildId);
          break;
        case 'library':
          await this.handleMeditationLibrary(interaction, userId, guildId);
          break;
        case 'guide':
          await this.handleMeditationGuide(interaction, userId, guildId);
          break;
        default:
          await interaction.editReply({
            embeds: [this.createErrorEmbed('Unknown Command', 'Invalid subcommand specified.')]
          });
      }

    } catch (error) {
      console.error('Error executing meditation command:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor(BRAND_COLORS.ERROR)
        .setTitle('❌ Meditation Command Error')
        .setDescription('An unexpected error occurred while setting up meditation.')
        .setFooter({
          text: 'GrowmiesNJ • Cannabis Meditation System',
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
   * Handle start meditation subcommand
   */
  async handleStartMeditation(interaction, userId, guildId) {
    const meditationType = interaction.options.getString('type');
    const duration = interaction.options.getInteger('duration') || 15; // Default 15 minutes
    const strainFocus = interaction.options.getString('strain_focus');

    try {
      // Check if user is in a voice channel
      const member = interaction.guild.members.cache.get(userId);
      if (!member.voice.channel) {
        return await interaction.editReply({
          embeds: [this.createErrorEmbed(
            'Voice Channel Required',
            '🔊 You must be in a voice channel to start a meditation session.\n\nJoin a voice channel and try again!'
          )]
        });
      }

      // Check if there's already an active session
      if (musicService.hasActiveSession(guildId)) {
        const currentSession = await musicService.getQueueStatus(guildId);
        if (currentSession.session?.session_type === 'meditation') {
          return await interaction.editReply({
            embeds: [this.createErrorEmbed(
              'Meditation Already Active',
              '🧘 A meditation session is already in progress.\n\nUse `/stop` to end the current session first.'
            )]
          });
        }
      }

      // Start meditation session
      const sessionResult = await this.createMeditationSession(guildId, userId, {
        type: meditationType,
        duration: duration,
        strainFocus: strainFocus,
        voiceChannel: member.voice.channel
      });

      if (!sessionResult.success) {
        return await interaction.editReply({
          embeds: [this.createErrorEmbed(
            'Session Start Failed',
            `❌ ${sessionResult.error}\n\nPlease try again.`
          )]
        });
      }

      // Award XP for starting meditation session
      await EngagementService.trackEngagementActivity(
        userId,
        guildId,
        'cannabis_meditation_start',
        interaction.channelId,
        {
          meditation_type: meditationType,
          duration_minutes: duration,
          strain_focus: strainFocus,
          xp_earned: 10
        }
      );

      // Create meditation session embed
      const embed = await this.createMeditationSessionEmbed(sessionResult.session, meditationType, duration, strainFocus);
      const components = this.createMeditationControls(sessionResult.session.id, userId);

      await interaction.editReply({
        embeds: [embed],
        components: components
      });

      // Start the guided meditation content
      await this.startGuidedMeditation(sessionResult.session, meditationType, duration);

    } catch (error) {
      console.error('Error starting meditation session:', error);
      await interaction.editReply({
        embeds: [this.createErrorEmbed(
          'Start Failed',
          'Failed to start meditation session. Please try again.'
        )]
      });
    }
  },

  /**
   * Handle meditation library subcommand
   */
  async handleMeditationLibrary(interaction, userId, guildId) {
    const category = interaction.options.getString('category') || 'all';

    try {
      const library = await this.getMeditationLibrary(category);
      
      const embed = new EmbedBuilder()
        .setColor(BRAND_COLORS.PRIMARY_GREEN)
        .setTitle('🧘 Meditation Library')
        .setDescription('Browse our collection of cannabis-enhanced meditation content.')
        .addFields(
          {
            name: '🌿 Cannabis Mindfulness',
            value: 'Guided meditations focusing on cannabis awareness and mindful consumption',
            inline: false
          },
          {
            name: '🌱 Strain Meditation',
            value: 'Meditation sessions tailored to specific cannabis strain effects',
            inline: false
          },
          {
            name: '🔥 Consumption Rituals',
            value: 'Mindful practices for cannabis consumption and preparation',
            inline: false
          },
          {
            name: '🧘 General Wellness',
            value: 'Traditional meditation enhanced with cannabis relaxation',
            inline: false
          },
          {
            name: '😴 Sleep Preparation',
            value: 'Evening meditations for better sleep with indica strains',
            inline: false
          },
          {
            name: '💚 Anxiety Relief',
            value: 'Calming meditations for stress and anxiety management',
            inline: false
          }
        );

      embed.setFooter({
        text: 'GrowmiesNJ • 21+ Cannabis Meditation Library',
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

      const components = this.createLibraryComponents(category);

      await interaction.editReply({
        embeds: [embed],
        components: components
      });

    } catch (error) {
      console.error('Error showing meditation library:', error);
      await interaction.editReply({
        embeds: [this.createErrorEmbed(
          'Library Access Failed',
          'Failed to load meditation library. Please try again.'
        )]
      });
    }
  },

  /**
   * Handle meditation guide subcommand
   */
  async handleMeditationGuide(interaction, userId, guildId) {
    const topic = interaction.options.getString('topic') || 'cannabis_meditation';

    try {
      const guide = await this.getMeditationGuide(topic);
      
      const embed = new EmbedBuilder()
        .setColor(BRAND_COLORS.INFO)
        .setTitle(`🧘 ${guide.title}`)
        .setDescription(guide.description)
        .addFields(...guide.fields);

      embed.setFooter({
        text: 'GrowmiesNJ • Cannabis Meditation Guidance',
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error showing meditation guide:', error);
      await interaction.editReply({
        embeds: [this.createErrorEmbed(
          'Guide Access Failed',
          'Failed to load meditation guide. Please try again.'
        )]
      });
    }
  },

  /**
   * Create meditation session
   */
  async createMeditationSession(guildId, userId, options) {
    try {
      // Join voice channel
      const joinResult = await musicService.joinVoiceChannel(
        options.voiceChannel,
        {
          sessionType: 'meditation',
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
        voice_channel_id: options.voiceChannel.id,
        session_type: 'meditation',
        is_cannabis_content: true,
        started_by_user_id: userId,
        session_metadata: {
          meditation_type: options.type,
          duration_minutes: options.duration,
          strain_focus: options.strainFocus
        }
      });

      return { success: true, session };

    } catch (error) {
      console.error('Error creating meditation session:', error);
      return { success: false, error: 'Failed to create meditation session' };
    }
  },

  /**
   * Start guided meditation content
   */
  async startGuidedMeditation(session, type, duration) {
    // This would integrate with the meditation content system
    // For now, we'll create a placeholder that would be expanded with actual audio content
    
    const meditationContent = this.getMeditationContent(type, duration);
    
    // In a full implementation, this would:
    // 1. Load appropriate meditation audio tracks
    // 2. Start playing background music/nature sounds
    // 3. Begin guided voice instructions
    // 4. Set up timed intervals for different phases
    
    console.log(`Starting ${type} meditation for ${duration} minutes`);
    console.log('Meditation content:', meditationContent);
  },

  /**
   * Get meditation content based on type
   */
  getMeditationContent(type, duration) {
    const content = {
      cannabis_mindfulness: {
        intro: 'Welcome to cannabis mindfulness meditation. Take a moment to prepare your space...',
        phases: ['preparation', 'consumption', 'awareness', 'integration'],
        background: 'nature_sounds',
        voice_guide: true
      },
      strain_meditation: {
        intro: 'This meditation will guide you through experiencing your chosen strain mindfully...',
        phases: ['strain_awareness', 'effects_observation', 'body_scan', 'gratitude'],
        background: 'ambient_music',
        voice_guide: true
      },
      consumption_ritual: {
        intro: 'Let\'s create a sacred ritual around your cannabis consumption...',
        phases: ['setting_intention', 'preparation_ritual', 'mindful_consumption', 'reflection'],
        background: 'ceremonial_sounds',
        voice_guide: true
      },
      general_wellness: {
        intro: 'Welcome to this general wellness meditation enhanced with cannabis relaxation...',
        phases: ['relaxation', 'body_scan', 'breath_awareness', 'loving_kindness'],
        background: 'soft_music',
        voice_guide: true
      },
      sleep_preparation: {
        intro: 'This evening meditation will help prepare you for restful sleep...',
        phases: ['evening_reflection', 'body_relaxation', 'mind_clearing', 'sleep_preparation'],
        background: 'rain_sounds',
        voice_guide: true
      },
      anxiety_relief: {
        intro: 'This meditation focuses on releasing anxiety and finding calm...',
        phases: ['grounding', 'breath_work', 'tension_release', 'peace_cultivation'],
        background: 'healing_frequencies',
        voice_guide: true
      }
    };

    return content[type] || content.general_wellness;
  },

  /**
   * Create meditation session embed
   */
  async createMeditationSessionEmbed(session, type, duration, strainFocus) {
    const typeDisplays = {
      cannabis_mindfulness: '🌿 Cannabis Mindfulness',
      strain_meditation: '🌱 Strain Meditation',
      consumption_ritual: '🔥 Consumption Ritual',
      general_wellness: '🧘 General Wellness',
      sleep_preparation: '😴 Sleep Preparation',
      anxiety_relief: '💚 Anxiety Relief'
    };

    const embed = new EmbedBuilder()
      .setColor(BRAND_COLORS.PRIMARY_GREEN)
      .setTitle('🧘 Meditation Session Started')
      .setDescription(`Your **${typeDisplays[type]}** session is now beginning.`)
      .addFields(
        {
          name: '⏱️ Duration',
          value: `${duration} minutes`,
          inline: true
        },
        {
          name: '🎭 Session Type',
          value: typeDisplays[type],
          inline: true
        },
        {
          name: '🌿 Cannabis Enhanced',
          value: '✅ 21+ Verified',
          inline: true
        }
      );

    if (strainFocus) {
      embed.addFields({
        name: '🍃 Strain Focus',
        value: strainFocus,
        inline: false
      });
    }

    embed.addFields({
      name: '🧘 Instructions',
      value: '• Find a comfortable position\n• Ensure your cannabis is prepared if needed\n• Close your eyes and begin to relax\n• Follow the guided instructions',
      inline: false
    });

    embed.setFooter({
      text: 'GrowmiesNJ • Cannabis Meditation Session',
    })
    .setTimestamp();

    return embed;
  },

  /**
   * Create meditation control components
   */
  createMeditationControls(sessionId, userId) {
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`meditation_pause_${userId}`)
          .setLabel('Pause')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('⏸️'),
        new ButtonBuilder()
          .setCustomId(`meditation_skip_phase_${userId}`)
          .setLabel('Next Phase')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('⏭️'),
        new ButtonBuilder()
          .setCustomId(`meditation_end_${userId}`)
          .setLabel('End Session')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('⏹️')
      );

    return [row];
  },

  /**
   * Create library components
   */
  createLibraryComponents(category) {
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('meditation_library_select')
      .setPlaceholder('Choose a meditation type to learn more')
      .addOptions([
        {
          label: '🌿 Cannabis Mindfulness',
          value: 'cannabis_mindfulness',
          description: 'Mindful cannabis awareness and consumption'
        },
        {
          label: '🌱 Strain Meditation',
          value: 'strain_meditation',
          description: 'Meditation tailored to specific strain effects'
        },
        {
          label: '🔥 Consumption Rituals',
          value: 'consumption_ritual',
          description: 'Sacred practices for cannabis use'
        },
        {
          label: '🧘 General Wellness',
          value: 'general_wellness',
          description: 'Traditional meditation with cannabis enhancement'
        },
        {
          label: '😴 Sleep Preparation',
          value: 'sleep_preparation',
          description: 'Evening meditations for better sleep'
        }
      ]);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    return [row];
  },

  /**
   * Get meditation library content
   */
  async getMeditationLibrary(category) {
    // This would fetch from a content database
    // For now, return structured content
    return {
      cannabis: ['Cannabis Mindfulness', 'Strain Meditation', 'Consumption Rituals'],
      general: ['General Wellness', 'Breathing Techniques', 'Body Scan'],
      sleep: ['Sleep Preparation', 'Evening Relaxation', 'Dream Meditation'],
      anxiety: ['Anxiety Relief', 'Stress Release', 'Calm Cultivation']
    };
  },

  /**
   * Get meditation guide content
   */
  async getMeditationGuide(topic) {
    const guides = {
      cannabis_meditation: {
        title: 'Cannabis & Meditation Guide',
        description: 'Learn how to safely and effectively combine cannabis with meditation practice.',
        fields: [
          {
            name: '🌿 Getting Started',
            value: '• Start with low doses\n• Choose appropriate strains\n• Create a comfortable environment\n• Set clear intentions',
            inline: false
          },
          {
            name: '🧘 Best Practices',
            value: '• Meditate before consumption for clarity\n• Use cannabis as an enhancement, not a crutch\n• Focus on breath and body awareness\n• Practice regularly for best results',
            inline: false
          },
          {
            name: '⚠️ Safety Guidelines',
            value: '• Always verify you\'re 21+ and in a legal jurisdiction\n• Start low and go slow\n• Have a safe, comfortable space\n• Never drive or operate machinery',
            inline: false
          }
        ]
      },
      beginner_tips: {
        title: 'Beginner Meditation Tips',
        description: 'Essential guidance for starting your meditation journey.',
        fields: [
          {
            name: '🔰 Starting Out',
            value: '• Begin with 5-10 minute sessions\n• Find a quiet, comfortable space\n• Use guided meditations initially\n• Be patient with yourself',
            inline: false
          },
          {
            name: '🧘 Basic Techniques',
            value: '• Focus on your breath\n• Notice when your mind wanders\n• Gently return attention to the present\n• Practice daily for consistency',
            inline: false
          }
        ]
      },
      breathing: {
        title: 'Breathing Techniques',
        description: 'Master fundamental breathing practices for meditation.',
        fields: [
          {
            name: '🫁 4-7-8 Breathing',
            value: '• Inhale for 4 counts\n• Hold for 7 counts\n• Exhale for 8 counts\n• Repeat 3-4 cycles',
            inline: false
          },
          {
            name: '🌊 Box Breathing',
            value: '• Inhale for 4 counts\n• Hold for 4 counts\n• Exhale for 4 counts\n• Hold empty for 4 counts',
            inline: false
          }
        ]
      },
      strain_selection: {
        title: 'Strain Selection for Meditation',
        description: 'Choose the right cannabis strains to enhance your meditation practice.',
        fields: [
          {
            name: '🌿 Sativa Strains',
            value: '• Good for creative meditation\n• Enhances focus and awareness\n• Best for morning/afternoon sessions\n• Examples: Jack Herer, Green Crack',
            inline: false
          },
          {
            name: '🍃 Indica Strains',
            value: '• Perfect for deep relaxation\n• Ideal for evening meditation\n• Helps with body awareness\n• Examples: Purple Kush, Granddaddy Purple',
            inline: false
          },
          {
            name: '⚖️ Hybrid Strains',
            value: '• Balanced effects for versatile use\n• Good for any time of day\n• Combine mental clarity with relaxation\n• Examples: Blue Dream, Girl Scout Cookies',
            inline: false
          }
        ]
      }
    };

    return guides[topic] || guides.cannabis_meditation;
  },

  /**
   * Create age verification embed
   */
  createAgeVerificationEmbed() {
    return new EmbedBuilder()
      .setColor(BRAND_COLORS.WARNING)
      .setTitle('🔞 Age Verification Required')
      .setDescription('Cannabis meditation sessions require age verification (21+).')
      .addFields(
        {
          name: '⚠️ Access Restricted',
          value: 'This feature contains cannabis-related content and requires verification that you are 21 years or older.',
          inline: false
        },
        {
          name: '✅ Get Verified',
          value: 'Use `/verify age` to complete the age verification process and access cannabis features.',
          inline: false
        },
        {
          name: '🛡️ Privacy & Compliance',
          value: 'Age verification helps us maintain legal compliance and create a safe environment for our 21+ community.',
          inline: false
        }
      )
      .setFooter({ text: 'GrowmiesNJ • Legal Cannabis Community' })
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
      .setFooter({ text: 'GrowmiesNJ • Cannabis Meditation System' })
      .setTimestamp();
  }
};