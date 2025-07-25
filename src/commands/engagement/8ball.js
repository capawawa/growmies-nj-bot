/**
 * 8Ball Command for GrowmiesNJ Discord Bot
 * 
 * Cannabis-themed magic 8-ball with cosmic predictions and spiritual guidance
 * Features cannabis-themed responses, shake animations, and mystical interactions
 */

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const EngagementService = require('../../services/engagementService');
const { WelcomeEmbeds, BRAND_COLORS } = require('../../utils/embeds');

// Cannabis-themed 8-ball responses organized by category
const CANNABIS_RESPONSES = {
  // Highly positive responses
  positive: [
    "🌟 The cannabis cosmos say: Absolutely, the universe aligns!",
    "✨ The sacred herb whispers: Yes, your path is blessed!",
    "🌿 Mother Nature herself nods: It is destined to be!",
    "💚 The green spirits proclaim: Without a doubt, proceed!",
    "🔮 The crystal trichomes reveal: Yes, fortune smiles upon you!",
    "🌱 The seedling prophecy says: Growth and success await!",
    "🦋 The transformation energies confirm: Yes, embrace the change!",
    "🌞 The cultivation gods declare: Most certainly, bask in success!",
    "💎 The diamond clarity shows: Undoubtedly, your vision is pure!",
    "🚀 The elevated consciousness says: Yes, reach for the stars!"
  ],
  
  // Positive with caution
  cautiously_positive: [
    "🌿 The leaves rustle with approval, but patience is key",
    "💭 The smoke signals suggest yes, when the time is right",
    "🌱 The growing energies lean positive, nurture it well",
    "🕯️ The flame dances favorably, but proceed mindfully",
    "🌊 The flow state indicates yes, go with the current",
    "🦉 The wise owl hoots: Likely yes, but observe first",
    "🌙 The lunar wisdom suggests: Probably, under moonlight guidance",
    "🔥 The gentle fire whispers: Signs point to yes, with care",
    "🍃 The wind carries hope: Most likely, let it develop naturally",
    "⭐ The stellar alignment hints: Yes, but trust the process"
  ],
  
  // Neutral/uncertain responses
  neutral: [
    "🌀 The cosmic swirl remains unclear... ask again later",
    "🌫️ The mystical mist obscures the answer... try again soon",
    "⚖️ The universal balance is shifting... concentrate and ask again",
    "🔄 The cycle of growth continues... reply hazy, try again",
    "🌊 The tidal energies are in flux... better not tell you now",
    "🎭 The cosmic theater plays multiple acts... cannot predict now",
    "🌈 The spectrum of possibilities is wide... ask again later",
    "🕳️ The void holds its secrets... concentrate and ask again",
    "🌪️ The whirlwind of fate spins... outcome remains unclear",
    "🔮 The crystal ball clouds over... my reply is hazy"
  ],
  
  // Negative with wisdom
  cautiously_negative: [
    "🍂 The autumn leaves suggest: Don't count on it this season",
    "🌧️ The cleansing rain says: My sources say no, for now",
    "🌙 The shadow wisdom whispers: Outlook not so good, wait",
    "⛰️ The mountain spirits counsel: Very doubtful, seek another path",
    "🌊 The deep currents warn: My reply is no, flow differently",
    "🦉 The night owl hoots: Don't count on it, observe longer",
    "🍃 The withering leaves caution: Very doubtful this cycle",
    "🔥 The dying ember suggests: Better not, conserve energy",
    "⚡ The storm clouds gather: Signs point to no, seek shelter",
    "🌑 The new moon advises: Most unlikely, plant new seeds"
  ],
  
  // Firmly negative
  negative: [
    "❌ The cosmic forces are clear: Absolutely not this time",
    "🚫 The guardian spirits protect: No, this path is blocked",
    "⛔ The universal laws declare: Definitely not, respect boundaries",
    "🌪️ The tornado of truth spins: No way, change direction",
    "🔒 The sacred vault is sealed: Not happening, find another key",
    "💔 The heart chakra weeps: No, this would bring imbalance",
    "🌑 The void speaks definitively: Absolutely not, embrace stillness",
    "🚧 The cosmic roadblock appears: No passage, detour required",
    "❄️ The winter wisdom freezes: No, wait for spring's warmth",
    "🗡️ The cutting truth reveals: No, this would harm your growth"
  ]
};

// Special themed responses for cannabis-related questions
const CANNABIS_THEMED_RESPONSES = [
  "🌿 The sacred plant spirits guide your question...",
  "💨 Through the mystical haze, clarity emerges...",
  "🔥 The ritual flame illuminates the truth...",
  "🌱 From the soil of wisdom, answers grow...",
  "💚 The green goddess shares her ancient knowledge...",
  "🌙 Under the harvest moon, all is revealed...",
  "✨ The trichome crystals sparkle with insight...",
  "🦋 Through transformation, understanding blooms...",
  "🌸 The flowering of consciousness brings answers...",
  "🧘 In the meditative state, truth is found..."
];

// XP rewards based on response rarity
const XP_REWARDS = {
  common: 3,      // Neutral responses
  uncommon: 4,    // Cautious responses  
  rare: 5,        // Clear positive/negative
  legendary: 8    // Special cannabis-themed responses
};

// Animation frames for the shaking effect
const SHAKE_FRAMES = [
  "🎱 *The mystical orb begins to stir...*",
  "🌀 *Cosmic energies swirl within...*", 
  "✨ *The cannabis spirits awaken...*",
  "🔮 *Ancient wisdom bubbles to the surface...*",
  "💫 *The universe prepares to speak...*"
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('8ball')
    .setDescription('🔮 Consult the mystical cannabis 8-ball for cosmic guidance!')
    .addStringOption(option =>
      option
        .setName('question')
        .setDescription('Ask the universe your burning question')
        .setRequired(true)
        .setMaxLength(200)
    )
    .addBooleanOption(option =>
      option
        .setName('private')
        .setDescription('Keep the cosmic wisdom private (only you can see)')
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      const userId = interaction.user.id;
      const guildId = interaction.guild.id;
      const question = interaction.options.getString('question');
      const isPrivate = interaction.options.getBoolean('private') || false;

      await interaction.deferReply({ ephemeral: isPrivate });

      // Validate question
      if (question.length < 3) {
        const errorEmbed = new EmbedBuilder()
          .setColor('#ff6b6b')
          .setTitle('❌ Question Too Short')
          .setDescription('The cosmic spirits need a more substantial question to provide guidance. Please ask something with at least 3 characters.')
          .setFooter({
            text: 'GrowmiesNJ • Mystical Guidance',
            iconURL: interaction.client.user.displayAvatarURL()
          });

        return await interaction.editReply({ embeds: [errorEmbed] });
      }

      // Show the shaking animation
      await this.showShakeAnimation(interaction, question);

    } catch (error) {
      console.error('Error executing 8ball command:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor('#ff6b6b')
        .setTitle('❌ Mystical Error')
        .setDescription('The cosmic energies are disrupted. The mystical orb cannot provide guidance at this time.')
        .addFields({
          name: '🔄 Try Again',
          value: 'Please consult the 8-ball again or contact support if the issue persists.',
          inline: false
        })
        .setFooter({
          text: 'GrowmiesNJ • Error Handling',
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
   * Show the shaking animation sequence
   */
  async showShakeAnimation(interaction, question) {
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;

    // Show initial shake frame
    const shakeEmbed = new EmbedBuilder()
      .setColor(BRAND_COLORS.PRIMARY_GREEN)
      .setTitle('🔮 Mystical Cannabis 8-Ball')
      .setDescription(SHAKE_FRAMES[0])
      .addFields({
        name: '❓ Your Question',
        value: `*"${question}"*`,
        inline: false
      })
      .setFooter({
        text: 'GrowmiesNJ • Consulting the cosmic wisdom...',
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

    await interaction.editReply({ embeds: [shakeEmbed] });

    // Animate through shake frames
    for (let i = 1; i < SHAKE_FRAMES.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 800)); // 800ms delay
      
      shakeEmbed.setDescription(SHAKE_FRAMES[i]);
      await interaction.editReply({ embeds: [shakeEmbed] });
    }

    // Final dramatic pause
    await new Promise(resolve => setTimeout(resolve, 1200));

    // Generate and show the response
    await this.showMysticalResponse(interaction, question, userId, guildId);
  },

  /**
   * Generate and display the mystical response
   */
  async showMysticalResponse(interaction, question, userId, guildId) {
    // Determine response type and select appropriate response
    const responseData = this.generateResponse(question);
    const { response, category, isSpecial, xp } = responseData;

    // Get a random themed intro
    const themedIntro = CANNABIS_THEMED_RESPONSES[
      Math.floor(Math.random() * CANNABIS_THEMED_RESPONSES.length)
    ];

    // Calculate total XP
    const baseXP = XP_REWARDS[category] || XP_REWARDS.common;
    const bonusXP = isSpecial ? 3 : 0;
    const totalXP = baseXP + bonusXP;

    // Track engagement
    await EngagementService.trackEngagementActivity(
      userId,
      guildId,
      '8ball',
      interaction.channelId,
      {
        question: question.substring(0, 50), // Truncate for storage
        responseCategory: category,
        isSpecial,
        xpEarned: totalXP
      }
    );

    // Create response embed
    const responseEmbed = this.createResponseEmbed(
      interaction.user,
      question,
      themedIntro,
      response,
      category,
      totalXP,
      isSpecial
    );

    // Create action buttons
    const actionRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`8ball_again_${userId}`)
          .setLabel('🔮 Ask Again')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`8ball_different_${userId}`)
          .setLabel('❓ Different Question')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`8ball_wisdom_${userId}`)
          .setLabel('🧘 Mystical Wisdom')
          .setStyle(ButtonStyle.Secondary)
      );

    await interaction.editReply({
      embeds: [responseEmbed],
      components: [actionRow]
    });
  },

  /**
   * Generate a response based on the question
   */
  generateResponse(question) {
    const questionLower = question.toLowerCase();
    
    // Check for cannabis-related keywords for special responses
    const cannabisKeywords = [
      'weed', 'cannabis', 'marijuana', 'hemp', 'thc', 'cbd', 'indica', 'sativa', 
      'hybrid', 'strain', 'bud', 'flower', 'smoke', 'vape', 'edible', 'dab',
      'grow', 'cultivation', 'harvest', 'trichome', 'resin'
    ];
    
    const isSpecial = cannabisKeywords.some(keyword => questionLower.includes(keyword));
    
    // Determine response category based on question sentiment and randomness
    let category;
    let responses;
    
    if (isSpecial) {
      // For cannabis-related questions, bias toward positive responses
      const rand = Math.random();
      if (rand < 0.4) {
        category = 'positive';
        responses = CANNABIS_RESPONSES.positive;
      } else if (rand < 0.7) {
        category = 'cautiously_positive';
        responses = CANNABIS_RESPONSES.cautiously_positive;
      } else if (rand < 0.85) {
        category = 'neutral';
        responses = CANNABIS_RESPONSES.neutral;
      } else if (rand < 0.95) {
        category = 'cautiously_negative';
        responses = CANNABIS_RESPONSES.cautiously_negative;
      } else {
        category = 'negative';
        responses = CANNABIS_RESPONSES.negative;
      }
    } else {
      // For general questions, use standard distribution
      const rand = Math.random();
      if (rand < 0.2) {
        category = 'positive';
        responses = CANNABIS_RESPONSES.positive;
      } else if (rand < 0.35) {
        category = 'cautiously_positive';
        responses = CANNABIS_RESPONSES.cautiously_positive;
      } else if (rand < 0.65) {
        category = 'neutral';
        responses = CANNABIS_RESPONSES.neutral;
      } else if (rand < 0.85) {
        category = 'cautiously_negative';
        responses = CANNABIS_RESPONSES.cautiously_negative;
      } else {
        category = 'negative';
        responses = CANNABIS_RESPONSES.negative;
      }
    }

    // Select random response from category
    const response = responses[Math.floor(Math.random() * responses.length)];

    return {
      response,
      category,
      isSpecial,
      xp: XP_REWARDS[category] || XP_REWARDS.common
    };
  },

  /**
   * Create the response embed
   */
  createResponseEmbed(user, question, themedIntro, response, category, totalXP, isSpecial) {
    // Determine embed color based on response category
    const categoryColors = {
      positive: '#28a745',           // Green
      cautiously_positive: '#20c997', // Teal
      neutral: '#6f42c1',            // Purple
      cautiously_negative: '#fd7e14', // Orange
      negative: '#dc3545'            // Red
    };

    const embedColor = categoryColors[category] || BRAND_COLORS.PRIMARY_GREEN;

    // Create the main embed
    const embed = new EmbedBuilder()
      .setColor(embedColor)
      .setTitle('🔮 The Mystical Cannabis 8-Ball Has Spoken')
      .setDescription(themedIntro)
      .addFields(
        {
          name: '❓ Your Question',
          value: `*"${question}"*`,
          inline: false
        },
        {
          name: '🌟 Cosmic Wisdom',
          value: response,
          inline: false
        },
        {
          name: '💫 Spiritual Reward',
          value: `+${totalXP} XP earned`,
          inline: true
        }
      );

    // Add special indicators
    if (isSpecial) {
      embed.addFields({
        name: '🌿 Special Cannabis Guidance',
        value: 'The sacred plant spirits provided enhanced insight for your question!',
        inline: true
      });
    }

    // Add mystical footer with cosmic timestamp
    const mysticalTexts = [
      'As above, so below',
      'The universe provides',
      'In cannabis we trust',
      'Sacred wisdom flows',
      'The cosmos align',
      'Ancient knowledge shared',
      'Mystical guidance given',
      'The void has spoken'
    ];

    const mysticalText = mysticalTexts[Math.floor(Math.random() * mysticalTexts.length)];

    embed.setFooter({
      text: `GrowmiesNJ • ${mysticalText}`,
      iconURL: user.displayAvatarURL()
    })
    .setTimestamp();

    return embed;
  },

  /**
   * Show mystical wisdom tips
   */
  async showMysticalWisdom(interaction) {
    const wisdomEmbed = new EmbedBuilder()
      .setColor(BRAND_COLORS.PRIMARY_GREEN)
      .setTitle('🧘 Mystical Cannabis Wisdom')
      .setDescription('Ancient secrets from the cosmic consciousness...')
      .addFields(
        {
          name: '🔮 Reading the Signs',
          value: '• The 8-ball reflects your inner wisdom\n• Cannabis-related questions receive enhanced guidance\n• Trust the process, even with unclear answers\n• The universe provides exactly what you need',
          inline: false
        },
        {
          name: '🌿 Question Crafting',
          value: '• Ask open-ended questions for better guidance\n• Focus on your true desires, not fears\n• The more specific, the clearer the wisdom\n• Cannabis spirits favor authentic curiosity',
          inline: false
        },
        {
          name: '✨ Interpretation Tips',
          value: '• Green responses bring growth energy\n• Purple responses suggest patience\n• Orange responses warn of caution\n• Red responses protect from harm',
          inline: false
        },
        {
          name: '🎯 Maximizing Benefits',
          value: '• Ask regularly to build cosmic connection\n• Share wisdom with fellow community members\n• Reflect on answers before acting\n• Cannabis-themed questions unlock special insights',
          inline: false
        }
      )
      .setFooter({
        text: 'GrowmiesNJ • May the cosmic forces guide your journey',
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

    await interaction.reply({ embeds: [wisdomEmbed], ephemeral: true });
  }
};