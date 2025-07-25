/**
 * Strain Guess Command for GrowmiesNJ Discord Bot
 * 
 * Interactive Cannabis Strain Guessing Game - Educational gaming with XP rewards
 * Test strain knowledge through clues and interactive gameplay
 */

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const EngagementService = require('../../services/engagementService');
const { AgeVerificationHelper } = require('../../utils/ageVerificationHelper');
const { WelcomeEmbeds, BRAND_COLORS } = require('../../utils/embeds');

// Import strain database
const strainInfoCommand = require('./strain-info');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('strain-guess')
    .setDescription('🎮 Test your cannabis strain knowledge with a guessing game (21+ only)')
    .addStringOption(option =>
      option
        .setName('difficulty')
        .setDescription('Choose game difficulty')
        .setRequired(false)
        .addChoices(
          { name: '🌱 Beginner - More clues, common strains', value: 'beginner' },
          { name: '🌿 Intermediate - Moderate clues', value: 'intermediate' },
          { name: '🔥 Expert - Minimal clues, rare strains', value: 'expert' }
        )
    )
    .addStringOption(option =>
      option
        .setName('category')
        .setDescription('Focus on specific strain category')
        .setRequired(false)
        .addChoices(
          { name: '🏛️ Classic Strains', value: 'classic' },
          { name: '🍰 Dessert Strains', value: 'dessert' },
          { name: '⚡ Energizing Strains', value: 'energizing' },
          { name: '🔄 Balanced Hybrids', value: 'balanced' },
          { name: '👑 Premium Strains', value: 'premium' }
        )
    )
    .addIntegerOption(option =>
      option
        .setName('rounds')
        .setDescription('Number of rounds to play (1-10)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(10)
    ),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      const userId = interaction.user.id;
      const guildId = interaction.guild.id;
      const difficulty = interaction.options.getString('difficulty') || 'beginner';
      const category = interaction.options.getString('category') || null;
      const rounds = interaction.options.getInteger('rounds') || 1;

      // Check age verification (required for all cannabis content)
      const isVerified = await AgeVerificationHelper.requireAgeVerification(interaction);
      if (!isVerified) return;

      // Start the guessing game
      await this.startGuessingGame(interaction, difficulty, category, rounds);

    } catch (error) {
      console.error('Error executing strain-guess command:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor('#ff6b6b')
        .setTitle('❌ Game Error')
        .setDescription('An error occurred while starting the strain guessing game.')
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
   * Start the strain guessing game
   */
  async startGuessingGame(interaction, difficulty, category, rounds) {
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;

    // Get available strains for the game
    const availableStrains = this.getGameStrains(category, difficulty);
    
    if (availableStrains.length === 0) {
      const noStrainsEmbed = new EmbedBuilder()
        .setColor(BRAND_COLORS.SECONDARY)
        .setTitle('🌿 No Strains Available')
        .setDescription('No strains are available for the selected category and difficulty.')
        .addFields({
          name: '💡 Try',
          value: '• Choose a different category\n• Select a different difficulty\n• Play without filters',
          inline: false
        })
        .setFooter({
          text: 'GrowmiesNJ • Strain Guessing Game',
          iconURL: interaction.client.user.displayAvatarURL()
        });

      return await interaction.editReply({ embeds: [noStrainsEmbed] });
    }

    // Initialize game session
    const gameSession = {
      userId,
      guildId,
      difficulty,
      category,
      totalRounds: rounds,
      currentRound: 1,
      score: 0,
      streak: 0,
      bestStreak: 0,
      hints: 0,
      timeBonus: 0,
      startTime: Date.now(),
      availableStrains: [...availableStrains],
      usedStrains: [],
      currentStrain: null,
      guessesLeft: this.getMaxGuesses(difficulty),
      hintLevel: 0
    };

    // Store game session (in production, use Redis or database)
    if (!global.strainGuessSessions) {
      global.strainGuessSessions = new Map();
    }
    global.strainGuessSessions.set(userId, gameSession);

    // Start first round
    await this.startRound(interaction, gameSession);
  },

  /**
   * Start a new round of the guessing game
   */
  async startRound(interaction, gameSession) {
    // Select random strain from available pool
    const randomIndex = Math.floor(Math.random() * gameSession.availableStrains.length);
    const selectedStrain = gameSession.availableStrains.splice(randomIndex, 1)[0];
    
    gameSession.currentStrain = selectedStrain;
    gameSession.usedStrains.push(selectedStrain);
    gameSession.guessesLeft = this.getMaxGuesses(gameSession.difficulty);
    gameSession.hintLevel = 0;
    gameSession.roundStartTime = Date.now();

    // Generate initial clues based on difficulty
    const clues = this.generateClues(selectedStrain.strain, gameSession.difficulty, gameSession.hintLevel);

    const gameEmbed = new EmbedBuilder()
      .setColor(BRAND_COLORS.PRIMARY_GREEN)
      .setTitle(`🎮 Strain Guessing Game - Round ${gameSession.currentRound}/${gameSession.totalRounds}`)
      .setDescription('**Can you guess this cannabis strain from the clues?**')
      .addFields(
        {
          name: '🔍 Clues',
          value: clues.join('\n'),
          inline: false
        },
        {
          name: '📊 Game Stats',
          value: `**Score:** ${gameSession.score} pts\n**Streak:** ${gameSession.streak}\n**Difficulty:** ${gameSession.difficulty.charAt(0).toUpperCase() + gameSession.difficulty.slice(1)}`,
          inline: true
        },
        {
          name: '🎯 Round Info',
          value: `**Guesses Left:** ${gameSession.guessesLeft}\n**Hints Used:** ${gameSession.hintLevel}\n**Category:** ${gameSession.category || 'All'}`,
          inline: true
        }
      )
      .setFooter({
        text: 'GrowmiesNJ • Type your guess or use buttons below',
        iconURL: interaction.client.user.displayAvatarURL()
      })
      .setTimestamp();

    // Create action buttons
    const actionRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`strain_guess_hint_${interaction.user.id}`)
          .setLabel('💡 Get Hint')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(gameSession.hintLevel >= this.getMaxHints(gameSession.difficulty)),
        new ButtonBuilder()
          .setCustomId(`strain_guess_skip_${interaction.user.id}`)
          .setLabel('⏭️ Skip')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`strain_guess_quit_${interaction.user.id}`)
          .setLabel('❌ Quit Game')
          .setStyle(ButtonStyle.Danger)
      );

    const difficultyInfo = this.getDifficultyInfo(gameSession.difficulty);
    gameEmbed.addFields({
      name: '🎮 How to Play',
      value: `Type the strain name in chat! ${difficultyInfo}`,
      inline: false
    });

    await interaction.editReply({
      embeds: [gameEmbed],
      components: [actionRow]
    });

    // Set up message collector for text guesses
    this.setupMessageCollector(interaction, gameSession);
  },

  /**
   * Set up message collector for user guesses
   */
  setupMessageCollector(interaction, gameSession) {
    const filter = (message) => {
      return message.author.id === gameSession.userId && 
             message.channel.id === interaction.channel.id;
    };

    const collector = interaction.channel.createMessageCollector({
      filter,
      time: 120000, // 2 minutes per round
      max: gameSession.guessesLeft
    });

    collector.on('collect', async (message) => {
      const guess = message.content.toLowerCase().trim();
      const correctName = gameSession.currentStrain.strain.name.toLowerCase();
      
      // Check if guess is correct (allow partial matches for longer names)
      const isCorrect = this.checkGuess(guess, correctName);
      
      if (isCorrect) {
        collector.stop('correct');
        await this.handleCorrectGuess(interaction, gameSession, guess);
      } else {
        gameSession.guessesLeft--;
        
        if (gameSession.guessesLeft <= 0) {
          collector.stop('no_guesses');
          await this.handleGameOver(interaction, gameSession, false);
        } else {
          await this.handleIncorrectGuess(interaction, gameSession, guess);
        }
      }
    });

    collector.on('end', async (collected, reason) => {
      if (reason === 'time') {
        await this.handleGameOver(interaction, gameSession, false, 'Time\'s up!');
      }
    });

    // Store collector reference
    gameSession.collector = collector;
  },

  /**
   * Handle correct guess
   */
  async handleCorrectGuess(interaction, gameSession, guess) {
    const strain = gameSession.currentStrain.strain;
    const roundTime = Date.now() - gameSession.roundStartTime;
    
    // Calculate points
    const basePoints = this.getBasePoints(gameSession.difficulty);
    const timeBonus = this.calculateTimeBonus(roundTime, gameSession.difficulty);
    const hintPenalty = gameSession.hintLevel * 5;
    const roundPoints = Math.max(5, basePoints + timeBonus - hintPenalty);
    
    gameSession.score += roundPoints;
    gameSession.streak++;
    gameSession.bestStreak = Math.max(gameSession.bestStreak, gameSession.streak);

    // Award XP through engagement service
    await EngagementService.trackEngagementActivity(
      gameSession.userId,
      gameSession.guildId,
      'strain_guess_correct',
      interaction.channelId,
      {
        strain: strain.name,
        difficulty: gameSession.difficulty,
        points: roundPoints,
        round: gameSession.currentRound
      }
    );

    const correctEmbed = new EmbedBuilder()
      .setColor('#28a745')
      .setTitle(`🎉 Correct! It's ${strain.name}!`)
      .setDescription(`Great job! You guessed **${strain.name}** correctly!`)
      .addFields(
        {
          name: '🏆 Round Results',
          value: `**Points Earned:** ${roundPoints}\n**Time:** ${Math.round(roundTime/1000)}s\n**Hints Used:** ${gameSession.hintLevel}`,
          inline: true
        },
        {
          name: '📊 Game Stats',
          value: `**Total Score:** ${gameSession.score}\n**Streak:** ${gameSession.streak}\n**Best Streak:** ${gameSession.bestStreak}`,
          inline: true
        },
        {
          name: '🌿 About This Strain',
          value: `**Type:** ${strain.type}\n**Effects:** ${strain.effects.slice(0, 3).join(', ')}\n**THC:** ${strain.thc}`,
          inline: false
        }
      )
      .setFooter({
        text: 'GrowmiesNJ • Cannabis Education (21+)',
        iconURL: interaction.client.user.displayAvatarURL()
      })
      .setTimestamp();

    // Check if game is complete
    if (gameSession.currentRound >= gameSession.totalRounds) {
      await this.handleGameComplete(interaction, gameSession);
    } else {
      gameSession.currentRound++;
      
      const continueButton = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`strain_guess_continue_${interaction.user.id}`)
            .setLabel('➡️ Next Round')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`strain_guess_quit_${interaction.user.id}`)
            .setLabel('🏁 End Game')
            .setStyle(ButtonStyle.Secondary)
        );

      await interaction.followUp({
        embeds: [correctEmbed],
        components: [continueButton]
      });
    }
  },

  /**
   * Handle incorrect guess
   */
  async handleIncorrectGuess(interaction, gameSession, guess) {
    const strain = gameSession.currentStrain.strain;
    
    const incorrectEmbed = new EmbedBuilder()
      .setColor('#ff6b6b')
      .setTitle('❌ Incorrect Guess')
      .setDescription(`"${guess}" is not correct. Keep trying!`)
      .addFields(
        {
          name: '🎯 Guesses Remaining',
          value: `${gameSession.guessesLeft} guess${gameSession.guessesLeft !== 1 ? 'es' : ''} left`,
          inline: true
        },
        {
          name: '💡 Need Help?',
          value: `Use the hint button for more clues!`,
          inline: true
        }
      )
      .setFooter({
        text: 'Keep guessing! Type your next guess in chat.',
        iconURL: interaction.client.user.displayAvatarURL()
      });

    await interaction.followUp({
      embeds: [incorrectEmbed],
      ephemeral: true
    });
  },

  /**
   * Handle game over (failure)
   */
  async handleGameOver(interaction, gameSession, won = false, reason = 'No guesses left') {
    const strain = gameSession.currentStrain.strain;
    gameSession.streak = 0; // Reset streak on failure

    const gameOverEmbed = new EmbedBuilder()
      .setColor('#ff6b6b')
      .setTitle('🎮 Game Over')
      .setDescription(`${reason}\n\nThe correct answer was **${strain.name}**.`)
      .addFields(
        {
          name: '📊 Final Stats',
          value: `**Score:** ${gameSession.score} pts\n**Round:** ${gameSession.currentRound}/${gameSession.totalRounds}\n**Best Streak:** ${gameSession.bestStreak}`,
          inline: true
        },
        {
          name: '🌿 About This Strain',
          value: `**Type:** ${strain.type}\n**Effects:** ${strain.effects.slice(0, 3).join(', ')}\n**THC:** ${strain.thc}`,
          inline: true
        }
      )
      .setFooter({
        text: 'GrowmiesNJ • Better luck next time!',
        iconURL: interaction.client.user.displayAvatarURL()
      })
      .setTimestamp();

    const actionRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`strain_guess_new_${interaction.user.id}`)
          .setLabel('🎮 Play Again')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`strain_info_${gameSession.currentStrain.key}`)
          .setLabel('🌿 Learn More')
          .setStyle(ButtonStyle.Secondary)
      );

    // Clean up session
    global.strainGuessSessions?.delete(gameSession.userId);

    await interaction.followUp({
      embeds: [gameOverEmbed],
      components: [actionRow]
    });
  },

  /**
   * Handle game completion (all rounds finished)
   */
  async handleGameComplete(interaction, gameSession) {
    const totalTime = Date.now() - gameSession.startTime;
    const avgTimePerRound = Math.round(totalTime / gameSession.totalRounds / 1000);
    
    // Calculate final bonus XP
    const bonusXP = Math.floor(gameSession.score / 10);
    if (bonusXP > 0) {
      await EngagementService.trackEngagementActivity(
        gameSession.userId,
        gameSession.guildId,
        'strain_guess_complete',
        interaction.channelId,
        {
          totalScore: gameSession.score,
          rounds: gameSession.totalRounds,
          difficulty: gameSession.difficulty,
          bestStreak: gameSession.bestStreak
        }
      );
    }

    const completionEmbed = new EmbedBuilder()
      .setColor('#28a745')
      .setTitle('🏆 Game Complete!')
      .setDescription('Congratulations on completing the strain guessing game!')
      .addFields(
        {
          name: '📊 Final Statistics',
          value: `**Total Score:** ${gameSession.score} points\n**Rounds Completed:** ${gameSession.totalRounds}\n**Best Streak:** ${gameSession.bestStreak}\n**Average Time:** ${avgTimePerRound}s per round`,
          inline: false
        },
        {
          name: '🏆 Performance Rating',
          value: this.getPerformanceRating(gameSession),
          inline: true
        },
        {
          name: '🎯 XP Earned',
          value: `+${bonusXP} bonus XP for completion!`,
          inline: true
        }
      )
      .setFooter({
        text: 'GrowmiesNJ • Thanks for playing!',
        iconURL: interaction.client.user.displayAvatarURL()
      })
      .setTimestamp();

    const actionRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`strain_guess_new_${interaction.user.id}`)
          .setLabel('🎮 Play Again')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('strain_guess_leaderboard')
          .setLabel('🏆 Leaderboard')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('strain_quiz_challenge')
          .setLabel('🧠 Strain Quiz')
          .setStyle(ButtonStyle.Secondary)
      );

    // Clean up session
    global.strainGuessSessions?.delete(gameSession.userId);

    await interaction.followUp({
      embeds: [completionEmbed],
      components: [actionRow]
    });
  },

  /**
   * Helper methods
   */

  /**
   * Get strains for the game based on category and difficulty
   */
  getGameStrains(category, difficulty) {
    const strains = [];
    
    for (const [key, strain] of Object.entries(this.getStrainDatabase())) {
      if (category && strain.category !== category) continue;
      
      // Filter by difficulty (expert mode includes rarer strains)
      if (difficulty === 'beginner' && !['classic', 'balanced'].includes(strain.category)) continue;
      if (difficulty === 'intermediate' && strain.category === 'premium') continue;
      
      strains.push({ key, strain });
    }
    
    return strains;
  },

  /**
   * Generate clues based on difficulty and hint level
   */
  generateClues(strain, difficulty, hintLevel) {
    const clues = [];
    
    // Base clues for all difficulties
    const allClues = [
      `🧬 **Type:** ${strain.type}`,
      `🌟 **Category:** ${strain.category.charAt(0).toUpperCase() + strain.category.slice(1)}`,
      `📊 **THC Range:** ${strain.thc}`,
      `🎭 **Primary Effects:** ${strain.effects.slice(0, 2).join(', ')}`,
      `👃 **Flavor Profile:** ${strain.flavors.slice(0, 2).join(', ')}`,
      `🌱 **Growing Difficulty:** ${strain.difficulty}`,
      `⏰ **Flowering Time:** ${strain.flowering}`,
      `🧬 **Genetics:** ${strain.genetics}`,
      `🔬 **Terpenes:** ${strain.terpenes.slice(0, 2).join(', ')}`,
      `💊 **Common Uses:** ${strain.medical ? strain.medical.slice(0, 2).join(', ') : 'Recreation'}`
    ];

    // Difficulty-based clue count
    let clueCount;
    switch (difficulty) {
      case 'beginner': clueCount = 4 + hintLevel; break;
      case 'intermediate': clueCount = 3 + hintLevel; break;
      case 'expert': clueCount = 2 + hintLevel; break;
      default: clueCount = 3 + hintLevel;
    }

    // Add clues based on hint level
    for (let i = 0; i < Math.min(clueCount, allClues.length); i++) {
      clues.push(allClues[i]);
    }

    // Add name hint for higher hint levels
    if (hintLevel >= 2) {
      const name = strain.name;
      const nameHint = this.generateNameHint(name, hintLevel);
      clues.push(`💡 **Name Hint:** ${nameHint}`);
    }

    return clues;
  },

  /**
   * Generate name hint based on hint level
   */
  generateNameHint(name, hintLevel) {
    if (hintLevel >= 4) {
      // Show most letters
      return name.replace(/[a-z]/gi, (char, index) => index % 2 === 0 ? char : '_');
    } else if (hintLevel >= 3) {
      // Show first and last letters of each word
      return name.split(' ').map(word => 
        word.length > 2 ? word[0] + '_'.repeat(word.length - 2) + word[word.length - 1] : word
      ).join(' ');
    } else {
      // Show word count and lengths
      const wordLengths = name.split(' ').map(word => word.length);
      return `${wordLengths.length} word${wordLengths.length !== 1 ? 's' : ''}: ${wordLengths.map(len => `${len} letters`).join(', ')}`;
    }
  },

  /**
   * Check if guess matches the correct answer
   */
  checkGuess(guess, correctName) {
    // Exact match
    if (guess === correctName) return true;
    
    // Remove common words and check
    const cleanGuess = guess.replace(/\b(og|kush|haze|cookies|cake|dream|skunk)\b/g, '').trim();
    const cleanCorrect = correctName.replace(/\b(og|kush|haze|cookies|cake|dream|skunk)\b/g, '').trim();
    
    if (cleanGuess === cleanCorrect) return true;
    
    // Check if all significant words match
    const guessWords = guess.split(/\s+/).filter(word => word.length > 2);
    const correctWords = correctName.split(/\s+/).filter(word => word.length > 2);
    
    return guessWords.length > 0 && guessWords.every(word => 
      correctWords.some(correctWord => correctWord.includes(word) || word.includes(correctWord))
    );
  },

  /**
   * Get base points for difficulty
   */
  getBasePoints(difficulty) {
    switch (difficulty) {
      case 'beginner': return 10;
      case 'intermediate': return 20;
      case 'expert': return 35;
      default: return 15;
    }
  },

  /**
   * Calculate time bonus
   */
  calculateTimeBonus(timeMs, difficulty) {
    const seconds = timeMs / 1000;
    const maxTime = difficulty === 'expert' ? 90 : difficulty === 'intermediate' ? 60 : 45;
    const bonusMultiplier = difficulty === 'expert' ? 1.5 : difficulty === 'intermediate' ? 1.2 : 1.0;
    
    if (seconds <= maxTime / 3) return Math.floor(15 * bonusMultiplier);
    if (seconds <= maxTime / 2) return Math.floor(10 * bonusMultiplier);
    if (seconds <= maxTime) return Math.floor(5 * bonusMultiplier);
    return 0;
  },

  /**
   * Get maximum guesses for difficulty
   */
  getMaxGuesses(difficulty) {
    switch (difficulty) {
      case 'beginner': return 5;
      case 'intermediate': return 3;
      case 'expert': return 2;
      default: return 3;
    }
  },

  /**
   * Get maximum hints for difficulty
   */
  getMaxHints(difficulty) {
    switch (difficulty) {
      case 'beginner': return 3;
      case 'intermediate': return 2;
      case 'expert': return 1;
      default: return 2;
    }
  },

  /**
   * Get difficulty information
   */
  getDifficultyInfo(difficulty) {
    switch (difficulty) {
      case 'beginner': return 'More clues, 5 guesses, common strains';
      case 'intermediate': return 'Moderate clues, 3 guesses, mixed strains';
      case 'expert': return 'Minimal clues, 2 guesses, rare strains';
      default: return 'Standard difficulty';
    }
  },

  /**
   * Get performance rating
   */
  getPerformanceRating(gameSession) {
    const scorePerRound = gameSession.score / gameSession.totalRounds;
    const streakRatio = gameSession.bestStreak / gameSession.totalRounds;
    
    if (scorePerRound >= 30 && streakRatio >= 0.8) return '🏆 Cannabis Expert';
    if (scorePerRound >= 25 && streakRatio >= 0.6) return '🥇 Strain Master';
    if (scorePerRound >= 20 && streakRatio >= 0.4) return '🥈 Strain Enthusiast';
    if (scorePerRound >= 15) return '🥉 Budding Expert';
    return '🌱 Learning Grower';
  },

  /**
   * Get strain database (placeholder - should import from strain-info)
   */
  getStrainDatabase() {
    // This should import the actual strain database
    // For now, using a placeholder that references the strain-info data
    return require('./strain-info').STRAIN_DATABASE || {};
  }
};