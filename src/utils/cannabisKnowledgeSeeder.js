/**
 * Cannabis Knowledge Base Seeder for GrowmiesNJ Discord Bot
 * 
 * LLM Chat Integration: Seed database with cannabis educational content
 * Provides initial strain data, cultivation tips, legal info, and educational resources
 */

const { CannabisKnowledgeBase } = require('../database/models/CannabisKnowledgeBase');

/**
 * Cannabis Knowledge Seeder Class
 */
class CannabisKnowledgeSeeder {
  constructor() {
    this.seededCount = 0;
    this.errors = [];
  }

  /**
   * Seed all cannabis knowledge categories
   */
  async seedAll() {
    console.log('🌿 Starting cannabis knowledge base seeding...');
    
    try {
      await this.seedStrainInformation();
      await this.seedCultivationTips();
      await this.seedLegalInformation();
      await this.seedGeneralEducation();
      await this.seedTerpeneInformation();
      await this.seedConsumptionMethods();
      
      console.log(`✅ Cannabis knowledge seeding completed! ${this.seededCount} entries added.`);
      
      if (this.errors.length > 0) {
        console.warn(`⚠️ ${this.errors.length} errors occurred during seeding:`);
        this.errors.forEach(error => console.warn(`  - ${error}`));
      }
      
      return {
        success: true,
        seededCount: this.seededCount,
        errors: this.errors
      };
      
    } catch (error) {
      console.error('❌ Failed to seed cannabis knowledge base:', error);
      return {
        success: false,
        error: error.message,
        seededCount: this.seededCount,
        errors: this.errors
      };
    }
  }

  /**
   * Seed popular cannabis strain information
   */
  async seedStrainInformation() {
    console.log('📊 Seeding strain information...');
    
    const strains = [
      {
        title: 'Blue Dream - Hybrid Cannabis Strain',
        content: 'Blue Dream is a balanced hybrid strain that combines the best of both indica and sativa effects. Originally from California, this strain is known for its sweet berry aroma and balanced high that provides both cerebral stimulation and physical relaxation. THC levels typically range from 17-24%. The strain is popular among both recreational and medical users for its versatility and consistent effects. Growing characteristics include a flowering time of 9-10 weeks and moderate difficulty level.',
        category: 'strains',
        tags: ['hybrid', 'california', 'sweet', 'balanced', 'popular'],
        accuracy_rating: 9.5,
        source: 'Community consensus and breeder information',
        verified: true
      },
      {
        title: 'OG Kush - Indica-Dominant Strain',
        content: 'OG Kush is a legendary indica-dominant hybrid strain that has become a cornerstone of West Coast cannabis culture. Known for its distinctive earthy, pine, and lemon aroma, OG Kush delivers potent effects that typically include euphoria followed by deep relaxation. THC content usually ranges from 20-26%. The strain is renowned for its stress-relieving properties and is often used in the evening. Cultivation requires moderate to advanced skill with a flowering period of 8-9 weeks.',
        category: 'strains',
        tags: ['indica-dominant', 'west-coast', 'pine', 'potent', 'stress-relief'],
        accuracy_rating: 9.0,
        source: 'Breeder documentation and user reports',
        verified: true
      },
      {
        title: 'Sour Diesel - Energizing Sativa',
        content: 'Sour Diesel is a prominent sativa-dominant strain famous for its diesel-like aroma and energizing effects. This strain typically produces an uplifting, cerebral high that can enhance creativity and focus, making it popular for daytime use. THC levels generally range from 18-22%. The strain is known for its fast-acting effects and long-lasting duration. Growing Sour Diesel requires patience as it has a longer flowering time of 10-11 weeks but produces generous yields.',
        category: 'strains',
        tags: ['sativa', 'energizing', 'diesel', 'creative', 'daytime'],
        accuracy_rating: 8.8,
        source: 'Cultivator reports and strain databases',
        verified: true
      },
      {
        title: 'Girl Scout Cookies - Potent Hybrid',
        content: 'Girl Scout Cookies (GSC) is a potent hybrid strain that has gained massive popularity for its sweet and earthy flavor profile combined with powerful effects. This strain typically delivers a euphoric high followed by deep relaxation, making it suitable for both recreational and medical use. THC content often ranges from 20-28%. GSC is known for its distinctive appearance with purple leaves and orange hairs. The strain requires intermediate growing skills with a flowering time of 9-10 weeks.',
        category: 'strains',
        tags: ['hybrid', 'potent', 'sweet', 'euphoric', 'purple'],
        accuracy_rating: 9.2,
        source: 'Dispensary testing and user feedback',
        verified: true
      },
      {
        title: 'Northern Lights - Classic Indica',
        content: 'Northern Lights is one of the most famous pure indica strains, renowned for its relaxing and sedating effects. This strain produces a dreamy, euphoric high that gradually transitions into deep physical relaxation, making it ideal for evening use and sleep aid. THC levels typically range from 16-21%. Northern Lights is known for its sweet and spicy aroma with earthy undertones. The strain is relatively easy to grow with a short flowering period of 7-8 weeks, making it popular among novice cultivators.',
        category: 'strains',
        tags: ['indica', 'relaxing', 'sedating', 'sleep', 'easy-grow'],
        accuracy_rating: 9.7,
        source: 'Historical breeder records and cultivation guides',
        verified: true
      }
    ];

    for (const strain of strains) {
      await this.createKnowledgeEntry(strain);
    }
  }

  /**
   * Seed cannabis cultivation tips and techniques
   */
  async seedCultivationTips() {
    console.log('🌱 Seeding cultivation tips...');
    
    const cultivationTips = [
      {
        title: 'Cannabis Germination Best Practices',
        content: 'Successful cannabis germination requires proper moisture, temperature, and darkness. The paper towel method is popular: place seeds between damp paper towels in a warm (70-80°F), dark location. Seeds typically germinate within 24-72 hours. Once taproots appear, carefully transplant to growing medium. Maintain consistent moisture without overwatering. Use pH-neutral water (6.0-7.0) and avoid disturbing seeds unnecessarily. Quality seeds have a hard, dry shell with tiger stripes or spots.',
        category: 'cultivation',
        tags: ['germination', 'seeds', 'temperature', 'moisture', 'beginner'],
        accuracy_rating: 9.5,
        source: 'Agricultural extension and growing guides',
        verified: true
      },
      {
        title: 'Indoor Lighting for Cannabis Cultivation',
        content: 'Proper lighting is crucial for indoor cannabis cultivation. LED lights are energy-efficient and produce less heat, while HPS lights provide intense light but generate more heat. During vegetative stage, provide 18-24 hours of light per day. For flowering, switch to 12 hours light/12 hours darkness. Maintain proper distance: LEDs 18-24 inches, HPS 24-36 inches from canopy. Light intensity should be 600-1000 PPFD during veg, 1000-1500 PPFD during flowering. Monitor for light burn and heat stress.',
        category: 'cultivation',
        tags: ['lighting', 'indoor', 'LED', 'HPS', 'PPFD'],
        accuracy_rating: 9.0,
        source: 'Horticultural lighting research and grower experience',
        verified: true
      },
      {
        title: 'Cannabis Nutrient Management',
        content: 'Cannabis plants require different nutrients during growth stages. Nitrogen (N) is crucial during vegetative growth, while phosphorus (P) and potassium (K) become more important during flowering. Use lower concentrations initially and gradually increase. Monitor pH levels: soil 6.0-7.0, hydro 5.5-6.5. Signs of deficiency include yellowing leaves (nitrogen), purple stems (phosphorus), or brown leaf edges (potassium). Flush with plain water during final weeks before harvest. Organic nutrients release slowly; synthetic nutrients act quickly but require careful monitoring.',
        category: 'cultivation',
        tags: ['nutrients', 'NPK', 'pH', 'feeding', 'deficiency'],
        accuracy_rating: 8.8,
        source: 'Plant nutrition science and cultivation manuals',
        verified: true
      },
      {
        title: 'Training Techniques: LST and Topping',
        content: 'Low Stress Training (LST) involves gently bending and tying down branches to create an even canopy and increase light exposure to lower bud sites. Begin LST during early vegetative stage when stems are flexible. Topping involves cutting the main stem above a node to promote lateral growth and multiple main colas. Top plants after 4-6 nodes develop. These techniques can significantly increase yields but require patience and practice. Always use clean tools and avoid training during flowering stage.',
        category: 'cultivation',
        tags: ['training', 'LST', 'topping', 'yield', 'canopy'],
        accuracy_rating: 9.2,
        source: 'Advanced cultivation techniques and grower communities',
        verified: true
      },
      {
        title: 'Harvest Timing and Curing Process',
        content: 'Proper harvest timing maximizes potency and quality. Use a jewelers loupe to examine trichomes: clear (too early), cloudy (peak THC), amber (more CBN, sedating effects). Harvest when 70-90% trichomes are cloudy. Cut plants at base and hang in dark, well-ventilated area (60-70°F, 45-55% humidity) for 7-14 days until stems snap rather than bend. Trim excess leaves and cure in airtight jars, opening daily for first week, then weekly for 2-8+ weeks. Proper curing improves flavor, smoothness, and potency.',
        category: 'cultivation',
        tags: ['harvest', 'trichomes', 'curing', 'drying', 'quality'],
        accuracy_rating: 9.8,
        source: 'Post-harvest processing research and expert guidance',
        verified: true
      }
    ];

    for (const tip of cultivationTips) {
      await this.createKnowledgeEntry(tip);
    }
  }

  /**
   * Seed New Jersey cannabis legal information
   */
  async seedLegalInformation() {
    console.log('⚖️ Seeding legal information...');
    
    const legalInfo = [
      {
        title: 'New Jersey Cannabis Legalization Overview',
        content: 'New Jersey legalized recreational cannabis for adults 21 and older through the Cannabis Regulatory, Enforcement Assistance, and Marketplace Modernization Act (CREAMM). The law allows possession of up to 6 ounces of cannabis and 17 grams of concentrate. Home cultivation is currently not permitted for recreational users. Medical cannabis patients may cultivate with proper authorization. Cannabis can only be purchased from licensed dispensaries. Public consumption remains prohibited except in designated areas. The New Jersey Cannabis Regulatory Commission (NJ-CRC) oversees the industry.',
        category: 'legal',
        tags: ['NJ-law', 'legalization', 'possession-limits', 'CREAMM', 'NJ-CRC'],
        accuracy_rating: 9.5,
        source: 'New Jersey state legislation and NJ-CRC guidelines',
        verified: true
      },
      {
        title: 'New Jersey Cannabis Possession Limits',
        content: 'Under New Jersey law, adults 21+ may possess up to 6 ounces of usable cannabis and up to 17 grams of cannabis concentrate. These limits apply to combined amounts from multiple sources. Possession above these limits may result in criminal charges. Cannabis must be kept in original dispensary packaging when in public. Storage at home should be in a secure location away from minors. Medical cannabis patients may possess up to 3 ounces per month unless physician recommends higher amounts. Always carry valid ID when possessing cannabis.',
        category: 'legal',
        tags: ['possession', 'limits', '6-ounces', 'concentrate', 'medical'],
        accuracy_rating: 9.8,
        source: 'NJ Cannabis Control Act and regulatory updates',
        verified: true
      },
      {
        title: 'Cannabis and Employment in New Jersey',
        content: 'New Jersey law provides some employment protections for cannabis users. Employers cannot take adverse action solely based on positive cannabis tests, with exceptions for safety-sensitive positions and federal contractors. However, employers may still prohibit workplace impairment and consumption. Medical cannabis patients have stronger protections under the Jake Honig Compassionate Use Medical Cannabis Act. Employees should understand their workplace policies and industry-specific regulations. When in doubt, consult with employment attorneys familiar with cannabis law.',
        category: 'legal',
        tags: ['employment', 'workplace', 'drug-testing', 'protections', 'medical-patients'],
        accuracy_rating: 8.5,
        source: 'NJ employment law and recent court decisions',
        verified: true
      },
      {
        title: 'Cannabis Transportation Laws in New Jersey',
        content: 'Cannabis must be transported in sealed, original dispensary containers. Keep cannabis in the trunk or locked glove compartment, never in passenger areas. Never consume cannabis in vehicles or allow passengers to do so. Cannabis cannot be transported across state lines, even to other legal states. DUI laws apply to cannabis - driving under the influence remains illegal and penalties are severe. If stopped by police, be honest about possession but exercise your right to remain silent about consumption. Store receipts with products to prove legal purchase.',
        category: 'legal',
        tags: ['transportation', 'vehicles', 'DUI', 'sealed-containers', 'interstate'],
        accuracy_rating: 9.0,
        source: 'NJ motor vehicle laws and cannabis transportation regulations',
        verified: true
      },
      {
        title: 'Municipal Cannabis Ordinances in New Jersey',
        content: 'While cannabis is legal at the state level, New Jersey municipalities may implement local ordinances restricting cannabis businesses and public consumption. Some towns have opted out of allowing dispensaries or consumption lounges. Check local ordinances in your municipality for specific restrictions. Penalties for violating local cannabis laws may include fines. Some areas may have designated public consumption areas in the future. When traveling within New Jersey, be aware that local laws may be more restrictive than state law.',
        category: 'legal',
        tags: ['municipal', 'local-laws', 'dispensaries', 'opt-out', 'public-consumption'],
        accuracy_rating: 8.8,
        source: 'Municipal government websites and local ordinance databases',
        verified: true
      }
    ];

    for (const info of legalInfo) {
      await this.createKnowledgeEntry(info);
    }
  }

  /**
   * Seed general cannabis education content
   */
  async seedGeneralEducation() {
    console.log('📚 Seeding general education content...');
    
    const educationContent = [
      {
        title: 'Understanding Cannabis Plant Biology',
        content: 'Cannabis (Cannabis sativa L.) is an annual flowering plant with distinct male and female plants (dioecious). Female plants produce the resinous flowers containing cannabinoids like THC and CBD. The plant contains over 100 cannabinoids and 200+ terpenes that work together in the "entourage effect." Cannabis has three main subspecies: sativa (tall, energizing), indica (short, relaxing), and ruderalis (auto-flowering). Modern strains are typically hybrids combining traits from multiple subspecies. Understanding plant biology helps growers optimize cultivation and consumers make informed choices.',
        category: 'general',
        tags: ['biology', 'cannabinoids', 'terpenes', 'sativa', 'indica'],
        accuracy_rating: 9.8,
        source: 'Botanical research and peer-reviewed cannabis studies',
        verified: true
      },
      {
        title: 'The Endocannabinoid System Explained',
        content: 'The endocannabinoid system (ECS) is a biological system present in all mammals that helps maintain homeostasis. It consists of endocannabinoids (produced by the body), receptors (CB1 and CB2), and enzymes that break down cannabinoids. CB1 receptors are primarily in the brain and central nervous system, while CB2 receptors are mainly in immune cells and peripheral tissues. Cannabis cannabinoids like THC and CBD interact with this system, which is why cannabis affects mood, appetite, sleep, and pain perception.',
        category: 'general',
        tags: ['ECS', 'CB1', 'CB2', 'homeostasis', 'receptors'],
        accuracy_rating: 9.5,
        source: 'Medical research and endocannabinoid system studies',
        verified: true
      },
      {
        title: 'Cannabis Consumption Methods Overview',
        content: 'Cannabis can be consumed through various methods, each with different onset times and durations. Smoking and vaporizing provide rapid onset (minutes) but shorter duration (1-3 hours). Edibles take longer to take effect (30-120 minutes) but last much longer (4-8 hours). Tinctures placed under the tongue offer moderate onset (15-45 minutes). Topicals provide localized effects without psychoactive properties. Each method has different bioavailability rates, affecting how much THC enters the bloodstream. Choose methods based on desired effects, medical needs, and personal preferences.',
        category: 'general',
        tags: ['consumption', 'smoking', 'edibles', 'vaping', 'bioavailability'],
        accuracy_rating: 9.0,
        source: 'Pharmacokinetic studies and consumption research',
        verified: true
      },
      {
        title: 'Cannabis Safety and Harm Reduction',
        content: 'Responsible cannabis use involves understanding dosage, setting, and personal limits. Start with low doses, especially with edibles, and wait for full effects before consuming more. Avoid mixing cannabis with alcohol or other substances. Never drive or operate machinery while impaired. Store cannabis securely away from children and pets. Be aware of potential side effects like anxiety, paranoia, or rapid heart rate. Pregnant and breastfeeding individuals should avoid cannabis. People with mental health conditions should consult healthcare providers before use.',
        category: 'general',
        tags: ['safety', 'dosage', 'harm-reduction', 'responsible-use', 'side-effects'],
        accuracy_rating: 9.7,
        source: 'Public health guidelines and harm reduction research',
        verified: true
      }
    ];

    for (const content of educationContent) {
      await this.createKnowledgeEntry(content);
    }
  }

  /**
   * Seed terpene information
   */
  async seedTerpeneInformation() {
    console.log('🍃 Seeding terpene information...');
    
    const terpeneInfo = [
      {
        title: 'Myrcene - The Sedating Terpene',
        content: 'Myrcene is one of the most common terpenes in cannabis, known for its earthy, musky aroma with hints of cloves. This terpene is associated with sedating, relaxing effects and is often found in indica-dominant strains. Myrcene may enhance the psychoactive effects of THC by improving cannabinoid absorption. It is also found in mangoes, hops, and lemongrass. Strains high in myrcene (>0.5%) are often associated with "couch-lock" effects. Medical applications may include muscle relaxation, pain relief, and sleep aid.',
        category: 'terpenes',
        tags: ['myrcene', 'sedating', 'earthy', 'indica', 'sleep'],
        accuracy_rating: 9.0,
        source: 'Terpene research and strain analysis data',
        verified: true
      },
      {
        title: 'Limonene - The Uplifting Citrus Terpene',
        content: 'Limonene is a prominent terpene with a fresh, citrusy aroma found in cannabis and citrus fruit peels. This terpene is associated with uplifting, mood-enhancing effects and may help reduce stress and anxiety. Limonene is more commonly found in sativa-dominant strains and may contribute to energizing effects. Research suggests limonene may have anti-inflammatory, antioxidant, and potentially anti-cancer properties. It may also enhance the absorption of other terpenes and cannabinoids through the skin and mucous membranes.',
        category: 'terpenes',
        tags: ['limonene', 'citrus', 'uplifting', 'sativa', 'mood'],
        accuracy_rating: 8.8,
        source: 'Aromatherapy research and cannabis terpene studies',
        verified: true
      },
      {
        title: 'Pinene - The Focus-Enhancing Terpene',
        content: 'Pinene is a terpene with a fresh pine aroma, existing in two forms: alpha-pinene (pine) and beta-pinene (rosemary, basil). This terpene is associated with increased alertness, memory retention, and focus. Pinene may counteract some of the memory-impairing effects of THC. It is found in pine needles, rosemary, and some cannabis strains. Pinene has shown bronchodilator properties, potentially helping with respiratory function. Medical research suggests anti-inflammatory and antimicrobial properties.',
        category: 'terpenes',
        tags: ['pinene', 'pine', 'focus', 'memory', 'alertness'],
        accuracy_rating: 9.2,
        source: 'Neuroscience research and terpene interaction studies',
        verified: true
      }
    ];

    for (const terpene of terpeneInfo) {
      await this.createKnowledgeEntry(terpene);
    }
  }

  /**
   * Seed consumption methods information
   */
  async seedConsumptionMethods() {
    console.log('💨 Seeding consumption methods...');
    
    const consumptionMethods = [
      {
        title: 'Vaporizing Cannabis - Benefits and Techniques',
        content: 'Vaporizing heats cannabis to release cannabinoids and terpenes without combustion, reducing harmful byproducts. Optimal vaping temperatures range from 350-430°F (175-220°C). Lower temperatures (350-375°F) preserve more terpenes and provide lighter effects, while higher temperatures (400-430°F) release more cannabinoids for stronger effects. Vaping is more efficient than smoking, using less material for similar effects. Benefits include reduced respiratory irritation, better flavor profiles, and more precise dosing. Dry herb vaporizers and concentrate vaporizers offer different experiences.',
        category: 'consumption',
        tags: ['vaporizing', 'temperature', 'efficiency', 'health', 'terpenes'],
        accuracy_rating: 9.3,
        source: 'Vaporization research and user experience studies',
        verified: true
      },
      {
        title: 'Cannabis Edibles - Dosing and Effects',
        content: 'Cannabis edibles provide long-lasting effects through first-pass metabolism in the liver, converting THC to 11-hydroxy-THC, which is more potent and longer-lasting. Start with 2.5-5mg THC for beginners, wait 2 hours before consuming more. Effects can last 4-8 hours or longer. Factors affecting onset include metabolism, body weight, tolerance, and stomach contents. Edibles provide discrete consumption and precise dosing but have delayed onset that can lead to overconsumption. Always read labels carefully and store securely away from children.',
        category: 'consumption',
        tags: ['edibles', 'dosing', '11-hydroxy-THC', 'metabolism', 'duration'],
        accuracy_rating: 9.5,
        source: 'Pharmacokinetic studies and clinical research',
        verified: true
      }
    ];

    for (const method of consumptionMethods) {
      await this.createKnowledgeEntry(method);
    }
  }

  /**
   * Create a knowledge base entry
   */
  async createKnowledgeEntry(entryData) {
    try {
      // Check if entry already exists
      const existing = await CannabisKnowledgeBase.findOne({
        where: { title: entryData.title }
      });

      if (existing) {
        console.log(`⏭️ Skipping existing entry: ${entryData.title}`);
        return;
      }

      await CannabisKnowledgeBase.create({
        ...entryData,
        admin_approved: true,
        created_by_admin: true,
        usage_count: 0
      });

      this.seededCount++;
      console.log(`✅ Created: ${entryData.title}`);

    } catch (error) {
      const errorMsg = `Failed to create ${entryData.title}: ${error.message}`;
      this.errors.push(errorMsg);
      console.error(`❌ ${errorMsg}`);
    }
  }

  /**
   * Clear all seeded knowledge (for testing)
   */
  async clearAll() {
    try {
      const deleted = await CannabisKnowledgeBase.destroy({
        where: { created_by_admin: true }
      });
      
      console.log(`🗑️ Cleared ${deleted} admin-created knowledge entries`);
      return { success: true, deletedCount: deleted };
      
    } catch (error) {
      console.error('❌ Failed to clear knowledge base:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get seeding statistics
   */
  async getStats() {
    try {
      const stats = await CannabisKnowledgeBase.findAll({
        attributes: [
          'category',
          [require('sequelize').fn('COUNT', '*'), 'count']
        ],
        group: ['category'],
        raw: true
      });

      const total = await CannabisKnowledgeBase.count();
      
      return {
        success: true,
        total,
        byCategory: stats.reduce((acc, stat) => {
          acc[stat.category] = parseInt(stat.count);
          return acc;
        }, {})
      };
      
    } catch (error) {
      console.error('❌ Failed to get knowledge base stats:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = CannabisKnowledgeSeeder;