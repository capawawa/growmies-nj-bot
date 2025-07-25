/**
 * Strain Info Command for GrowmiesNJ Discord Bot
 * 
 * Cannabis Strain Database System - Educational strain information with compliance
 * Provides detailed strain data including effects, genetics, and growing information
 */

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const EngagementService = require('../../services/engagementService');
const { AgeVerificationHelper } = require('../../utils/ageVerificationHelper');
const { WelcomeEmbeds, BRAND_COLORS } = require('../../utils/embeds');

// Comprehensive strain database with educational information
const STRAIN_DATABASE = {
  // Indica Strains
  'og-kush': {
    name: 'OG Kush',
    type: 'Indica Dominant Hybrid',
    genetics: 'Chemdawg × Lemon Thai × Pakistani Kush',
    thc: '19-25%',
    cbd: '0.1-0.3%',
    effects: ['Relaxed', 'Happy', 'Euphoric', 'Hungry', 'Sleepy'],
    medical: ['Stress', 'Insomnia', 'Depression', 'Pain', 'Lack of Appetite'],
    flavors: ['Earthy', 'Pine', 'Woody', 'Citrus'],
    difficulty: 'Moderate',
    flowering: '8-9 weeks',
    yield: 'Medium to High',
    description: 'OG Kush is a legendary strain with a unique terpene profile that boasts a complex aroma with notes of fuel, skunk, and spice. This classic strain is the backbone of many popular varieties and delivers a euphoric head high followed by deep body relaxation.',
    lineage: 'A cornerstone strain in cannabis breeding, OG Kush has spawned countless phenotypes and crosses.',
    growing_tips: 'Prefers warm, dry climates. Benefits from LST and SCROG techniques. Monitor humidity during flowering.',
    terpenes: ['Myrcene', 'Limonene', 'Caryophyllene'],
    category: 'Classic'
  },
  'purple-punch': {
    name: 'Purple Punch',
    type: 'Indica Dominant Hybrid',
    genetics: 'Larry OG × Granddaddy Purple',
    thc: '18-25%',
    cbd: '0.1-0.5%',
    effects: ['Relaxed', 'Sleepy', 'Happy', 'Euphoric', 'Hungry'],
    medical: ['Insomnia', 'Stress', 'Depression', 'Pain', 'Nausea'],
    flavors: ['Grape', 'Berry', 'Sweet', 'Vanilla'],
    difficulty: 'Easy',
    flowering: '7-8 weeks',
    yield: 'Medium',
    description: 'Purple Punch delivers a one-two punch of grape and berry flavors followed by sedating effects. This dessert-like strain is perfect for evening use and is beloved for its stunning purple hues and candy-like aroma.',
    lineage: 'Combines the legendary genetics of Larry OG and Granddaddy Purple.',
    growing_tips: 'Easy to grow, naturally turns purple in cooler temperatures. Great for beginners.',
    terpenes: ['Myrcene', 'Caryophyllene', 'Pinene'],
    category: 'Dessert'
  },
  // Sativa Strains
  'green-crack': {
    name: 'Green Crack',
    type: 'Sativa Dominant Hybrid',
    genetics: 'Skunk #1 × Unknown Indica',
    thc: '15-25%',
    cbd: '0.1-0.2%',
    effects: ['Energetic', 'Happy', 'Focused', 'Creative', 'Uplifted'],
    medical: ['Depression', 'Fatigue', 'Stress', 'ADHD', 'Migraines'],
    flavors: ['Citrus', 'Sweet', 'Tropical', 'Mango'],
    difficulty: 'Easy',
    flowering: '7-9 weeks',
    yield: 'High',
    description: 'Green Crack provides an invigorating mental buzz that keeps you going throughout the day. With a tangy, fruity flavor reminiscent of mango, this strain is perfect for daytime activities and creative pursuits.',
    lineage: 'A renamed version of "Cush" by Snoop Dogg, this strain has become a sativa staple.',
    growing_tips: 'Vigorous growth, responds well to topping. Prefers warm climates.',
    terpenes: ['Myrcene', 'Limonene', 'Caryophyllene'],
    category: 'Energizing'
  },
  'jack-herer': {
    name: 'Jack Herer',
    type: 'Sativa Dominant Hybrid',
    genetics: 'Haze × Northern Lights #5 × Shiva Skunk',
    thc: '15-24%',
    cbd: '0.1-0.7%',
    effects: ['Creative', 'Energetic', 'Happy', 'Focused', 'Uplifted'],
    medical: ['Depression', 'Stress', 'Fatigue', 'Headaches', 'Lack of Appetite'],
    flavors: ['Pine', 'Spicy', 'Woody', 'Herbal'],
    difficulty: 'Moderate',
    flowering: '8-10 weeks',
    yield: 'Medium to High',
    description: 'Named after the cannabis activist and author, Jack Herer is a blissful, clear-headed, and creative sativa-dominant strain. It delivers a spicy, pine-scented flavor and provides an excellent balance of cerebral elevation and physical relaxation.',
    lineage: 'Created in the Netherlands in the mid-1990s, combining classic genetics.',
    growing_tips: 'Stretches significantly during flower. Benefits from training techniques.',
    terpenes: ['Terpinolene', 'Caryophyllene', 'Pinene'],
    category: 'Classic'
  },
  // Hybrid Strains
  'blue-dream': {
    name: 'Blue Dream',
    type: 'Sativa Dominant Hybrid',
    genetics: 'Blueberry × Haze',
    thc: '17-24%',
    cbd: '0.1-0.2%',
    effects: ['Happy', 'Relaxed', 'Creative', 'Euphoric', 'Focused'],
    medical: ['Depression', 'Stress', 'Pain', 'Nausea', 'Fatigue'],
    flavors: ['Berry', 'Sweet', 'Herbal', 'Vanilla'],
    difficulty: 'Easy',
    flowering: '9-10 weeks',
    yield: 'High',
    description: 'Blue Dream achieves a perfect balance between full-body relaxation and gentle cerebral invigoration. With a sweet berry aroma, this California staple provides relief without heavy sedation, making it popular among both novice and veteran consumers.',
    lineage: 'A West Coast favorite combining Blueberry indica with Haze sativa.',
    growing_tips: 'Resilient and easy to grow. Responds well to various training methods.',
    terpenes: ['Myrcene', 'Pinene', 'Caryophyllene'],
    category: 'Balanced'
  },
  'gelato': {
    name: 'Gelato',
    type: 'Indica Dominant Hybrid',
    genetics: 'Sunset Sherbet × Thin Mint GSC',
    thc: '20-25%',
    cbd: '0.1-0.3%',
    effects: ['Relaxed', 'Happy', 'Euphoric', 'Creative', 'Uplifted'],
    medical: ['Stress', 'Depression', 'Pain', 'Insomnia', 'Inflammation'],
    flavors: ['Sweet', 'Berry', 'Citrus', 'Lavender'],
    difficulty: 'Moderate',
    flowering: '8-9 weeks',
    yield: 'Medium',
    description: 'Gelato is a tasty indica-dominant hybrid that provides a balanced high with strong euphoric effects. Known for its colorful appearance and dessert-like aroma, this strain delivers both mental stimulation and physical relaxation.',
    lineage: 'Part of the Cookie family, bred by Cookie Fam Genetics in California.',
    growing_tips: 'Produces beautiful purple and orange hues. Prefers controlled environments.',
    terpenes: ['Caryophyllene', 'Limonene', 'Humulene'],
    category: 'Premium'
  },
  'wedding-cake': {
    name: 'Wedding Cake',
    type: 'Indica Dominant Hybrid',
    genetics: 'Cherry Pie × Girl Scout Cookies',
    thc: '22-27%',
    cbd: '0.1-0.3%',
    effects: ['Relaxed', 'Happy', 'Euphoric', 'Hungry', 'Sleepy'],
    medical: ['Stress', 'Depression', 'Pain', 'Insomnia', 'Appetite Loss'],
    flavors: ['Sweet', 'Vanilla', 'Pepper', 'Earthy'],
    difficulty: 'Moderate',
    flowering: '8-9 weeks',
    yield: 'Medium to High',
    description: 'Wedding Cake is a potent indica-dominant hybrid that provides relaxing and euphoric effects. With rich, tangy flavors and frosty, trichome-covered buds, this strain is as beautiful as it is effective.',
    lineage: 'Also known as Pink Cookies, combines two beloved strains from the Cookie family.',
    growing_tips: 'Dense, resinous buds. Benefits from proper air circulation to prevent mold.',
    terpenes: ['Limonene', 'Caryophyllene', 'Myrcene'],
    category: 'Premium'
  }
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('strain-info')
    .setDescription('🌿 Get detailed information about cannabis strains (21+ only)')
    .addStringOption(option =>
      option
        .setName('strain')
        .setDescription('Strain name to look up')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addBooleanOption(option =>
      option
        .setName('growing')
        .setDescription('Include detailed growing information')
        .setRequired(false)
    )
    .addBooleanOption(option =>
      option
        .setName('medical')
        .setDescription('Include medical information (educational only)')
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      const userId = interaction.user.id;
      const guildId = interaction.guild.id;
      const strainName = interaction.options.getString('strain').toLowerCase();
      const includeGrowing = interaction.options.getBoolean('growing') || false;
      const includeMedical = interaction.options.getBoolean('medical') || false;

      // Check age verification (required for all cannabis content)
      const verificationResult = await AgeVerificationHelper.checkUserVerification(userId, guildId);
      
      if (!verificationResult.verified) {
        await AgeVerificationHelper.handleVerificationFailure(interaction, verificationResult.reason, false);
        
        // Log enforcement for audit
        await AgeVerificationHelper.logVerificationEnforcement(
          userId,
          guildId,
          'strain-info',
          verificationResult.reason
        );
        
        return;
      }

      // Search for strain in database
      const strainKey = this.findStrainKey(strainName);
      const strainData = STRAIN_DATABASE[strainKey];

      if (!strainData) {
        const notFoundEmbed = new EmbedBuilder()
          .setColor(BRAND_COLORS.SECONDARY)
          .setTitle('🌿 Strain Not Found')
          .setDescription(`Could not find information for "${strainName}".`)
          .addFields(
            {
              name: '📚 Available Strains',
              value: this.getAvailableStrains().slice(0, 10).join(', ') + (this.getAvailableStrains().length > 10 ? '...' : ''),
              inline: false
            },
            {
              name: '💡 Try',
              value: '• Check spelling\n• Use autocomplete suggestions\n• Browse popular strains with `/strain-info strain:blue-dream`',
              inline: false
            },
            {
              name: '🎮 Strain Game',
              value: 'Test your strain knowledge with `/strain-guess` for a fun learning experience!',
              inline: false
            }
          )
          .setFooter({
            text: 'GrowmiesNJ • Cannabis Education (21+)',
            iconURL: interaction.client.user.displayAvatarURL()
          })
          .setTimestamp();

        const suggestButton = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('strain_random')
              .setLabel('🎲 Random Strain')
              .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
              .setCustomId('strain_categories')
              .setLabel('📋 Browse Categories')
              .setStyle(ButtonStyle.Secondary)
          );

        return await interaction.editReply({
          embeds: [notFoundEmbed],
          components: [suggestButton]
        });
      }

      // Track engagement activity
      await EngagementService.trackEngagementActivity(
        userId,
        guildId,
        'strain_lookup',
        interaction.channelId,
        { strain: strainData.name, advanced_info: includeGrowing || includeMedical }
      );

      // Create main strain information embed
      const strainEmbed = new EmbedBuilder()
        .setColor(this.getStrainColor(strainData.type))
        .setTitle(`🌿 ${strainData.name}`)
        .setDescription(`**${strainData.type}** • *${strainData.genetics}*\n\n${strainData.description}`)
        .addFields(
          {
            name: '🧬 Genetics & Potency',
            value: `**Type:** ${strainData.type}\n**THC:** ${strainData.thc}\n**CBD:** ${strainData.cbd}\n**Category:** ${strainData.category}`,
            inline: true
          },
          {
            name: '🌟 Effects',
            value: strainData.effects.map(effect => `• ${effect}`).join('\n'),
            inline: true
          },
          {
            name: '👃 Flavors & Aromas',
            value: strainData.flavors.map(flavor => `• ${flavor}`).join('\n'),
            inline: true
          }
        );

      // Add terpene information
      if (strainData.terpenes) {
        strainEmbed.addFields({
          name: '🔬 Primary Terpenes',
          value: strainData.terpenes.map(terpene => `• ${terpene}`).join('\n'),
          inline: true
        });
      }

      // Add basic growing info
      strainEmbed.addFields({
        name: '🌱 Growing Basics',
        value: `**Difficulty:** ${strainData.difficulty}\n**Flowering:** ${strainData.flowering}\n**Yield:** ${strainData.yield}`,
        inline: true
      });

      // Add lineage information
      if (strainData.lineage) {
        strainEmbed.addFields({
          name: '📜 Lineage & History',
          value: strainData.lineage,
          inline: false
        });
      }

      strainEmbed.setFooter({
        text: 'GrowmiesNJ • Cannabis Education (21+) • For educational purposes only',
        iconURL: interaction.client.user.displayAvatarURL()
      })
      .setTimestamp();

      const embeds = [strainEmbed];

      // Add medical information embed if requested
      if (includeMedical && strainData.medical) {
        const medicalEmbed = new EmbedBuilder()
          .setColor('#28a745')
          .setTitle('🏥 Medical Information')
          .setDescription('**⚠️ DISCLAIMER:** This information is for educational purposes only and does not constitute medical advice. Consult with a qualified healthcare professional before using cannabis for medical purposes.')
          .addFields(
            {
              name: '💊 Commonly Reported Uses',
              value: strainData.medical.map(condition => `• ${condition}`).join('\n'),
              inline: false
            },
            {
              name: '⚖️ Legal Notice',
              value: 'Medical cannabis laws vary by location. Ensure compliance with local and state regulations.',
              inline: false
            }
          )
          .setFooter({
            text: 'Educational purposes only • Not medical advice',
            iconURL: interaction.client.user.displayAvatarURL()
          });

        embeds.push(medicalEmbed);
      }

      // Add detailed growing information embed if requested
      if (includeGrowing && strainData.growing_tips) {
        const growingEmbed = new EmbedBuilder()
          .setColor('#228B22')
          .setTitle('🌱 Growing Information')
          .setDescription('**📚 Educational cultivation information for jurisdictions where growing is legal.**')
          .addFields(
            {
              name: '🔧 Growing Tips',
              value: strainData.growing_tips,
              inline: false
            },
            {
              name: '📊 Specifications',
              value: `**Difficulty:** ${strainData.difficulty}\n**Flowering Time:** ${strainData.flowering}\n**Expected Yield:** ${strainData.yield}`,
              inline: true
            },
            {
              name: '⚖️ Legal Compliance',
              value: 'Growing cannabis is only legal in certain jurisdictions with proper licensing. Always comply with local laws and regulations.',
              inline: false
            }
          )
          .setFooter({
            text: 'Educational purposes only • Verify legal compliance',
            iconURL: interaction.client.user.displayAvatarURL()
          });

        embeds.push(growingEmbed);
      }

      // Create action buttons
      const actionRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`strain_similar_${strainKey}`)
            .setLabel('🔍 Similar Strains')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('strain_random')
            .setLabel('🎲 Random Strain')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('strain_quiz')
            .setLabel('🧠 Strain Quiz')
            .setStyle(ButtonStyle.Primary)
        );

      // Add toggle buttons for additional info
      const infoRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`strain_medical_${strainKey}`)
            .setLabel('🏥 Medical Info')
            .setStyle(includeMedical ? ButtonStyle.Success : ButtonStyle.Secondary)
            .setDisabled(includeMedical),
          new ButtonBuilder()
            .setCustomId(`strain_growing_${strainKey}`)
            .setLabel('🌱 Growing Info')
            .setStyle(includeGrowing ? ButtonStyle.Success : ButtonStyle.Secondary)
            .setDisabled(includeGrowing),
          new ButtonBuilder()
            .setCustomId(`strain_terpenes_${strainKey}`)
            .setLabel('🔬 Terpenes')
            .setStyle(ButtonStyle.Secondary)
        );

      await interaction.editReply({
        embeds: embeds,
        components: [actionRow, infoRow]
      });

    } catch (error) {
      console.error('Error executing strain-info command:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor('#ff6b6b')
        .setTitle('❌ Strain Database Error')
        .setDescription('An error occurred while retrieving strain information.')
        .addFields({
          name: '🔄 Try Again',
          value: 'Please try the command again or contact support if the issue persists.',
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
   * Autocomplete handler for strain suggestions
   */
  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused().toLowerCase();
    
    const strains = this.getAvailableStrains();
    const filtered = strains.filter(strain => 
      strain.toLowerCase().includes(focusedValue)
    ).slice(0, 25);

    await interaction.respond(
      filtered.map(strain => ({ name: strain, value: strain.toLowerCase().replace(/\s+/g, '-') }))
    );
  },

  /**
   * Helper methods
   */

  /**
   * Find strain key in database
   */
  findStrainKey(searchName) {
    const normalizedSearch = searchName.toLowerCase().replace(/\s+/g, '-');
    
    // Direct match
    if (STRAIN_DATABASE[normalizedSearch]) {
      return normalizedSearch;
    }

    // Fuzzy match
    for (const [key, strain] of Object.entries(STRAIN_DATABASE)) {
      if (strain.name.toLowerCase().includes(searchName) || 
          key.includes(normalizedSearch)) {
        return key;
      }
    }

    return null;
  },

  /**
   * Get list of available strain names
   */
  getAvailableStrains() {
    return Object.values(STRAIN_DATABASE).map(strain => strain.name);
  },

  /**
   * Get color based on strain type
   */
  getStrainColor(type) {
    if (type.toLowerCase().includes('indica')) {
      return '#8B4CB8'; // Purple for indica
    } else if (type.toLowerCase().includes('sativa')) {
      return '#32CD32'; // Green for sativa
    } else {
      return BRAND_COLORS.PRIMARY_GREEN; // Default brand green for hybrids
    }
  },

  /**
   * Get strain categories for browsing
   */
  getStrainCategories() {
    const categories = {};
    
    for (const [key, strain] of Object.entries(STRAIN_DATABASE)) {
      if (!categories[strain.category]) {
        categories[strain.category] = [];
      }
      categories[strain.category].push({ key, strain });
    }

    return categories;
  },

  /**
   * Get random strain
   */
  getRandomStrain() {
    const keys = Object.keys(STRAIN_DATABASE);
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    return { key: randomKey, strain: STRAIN_DATABASE[randomKey] };
  },

  /**
   * Find similar strains based on type and effects
   */
  getSimilarStrains(strainKey, limit = 3) {
    const targetStrain = STRAIN_DATABASE[strainKey];
    if (!targetStrain) return [];

    const similar = [];
    
    for (const [key, strain] of Object.entries(STRAIN_DATABASE)) {
      if (key === strainKey) continue;
      
      let score = 0;
      
      // Same type bonus
      if (strain.type === targetStrain.type) score += 3;
      
      // Similar effects
      const commonEffects = strain.effects.filter(effect => 
        targetStrain.effects.includes(effect)
      ).length;
      score += commonEffects;
      
      // Similar category
      if (strain.category === targetStrain.category) score += 2;
      
      if (score > 0) {
        similar.push({ key, strain, score });
      }
    }

    return similar
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
};