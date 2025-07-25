/**
 * Quiz Command for GrowmiesNJ Discord Bot
 * 
 * Cannabis Knowledge Quiz System with educational content and compliance
 * Supports multiple categories, difficulty levels, and age verification
 */

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { QuizQuestion } = require('../../database/models/QuizQuestion');
const EngagementService = require('../../services/engagementService');
const { AgeVerificationHelper } = require('../../utils/ageVerificationHelper');
const { WelcomeEmbeds, BRAND_COLORS } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('quiz')
    .setDescription('🧠 Test your cannabis knowledge with educational quizzes')
    .addStringOption(option =>
      option
        .setName('category')
        .setDescription('Choose a quiz category')
        .setRequired(false)
        .addChoices(
          { name: '🌱 General Knowledge', value: 'general_knowledge' },
          { name: '🔬 Cannabis Science', value: 'cannabis_science' },
          { name: '⚖️ Legal Compliance', value: 'legal_compliance' },
          { name: '🛡️ Safety Education', value: 'safety_education' },
          { name: '📰 Industry News', value: 'industry_news' },
          { name: '🌿 Strain Knowledge (21+)', value: 'strain_knowledge' },
          { name: '🌱 Growing & Cultivation (21+)', value: 'growing_cultivation' },
          { name: '💨 Consumption Methods (21+)', value: 'consumption_methods' }
        )
    )
    .addStringOption(option =>
      option
        .setName('difficulty')
        .setDescription('Choose difficulty level')
        .setRequired(false)
        .addChoices(
          { name: '🌱 Beginner', value: 'beginner' },
          { name: '🌿 Intermediate', value: 'intermediate' },
          { name: '🔥 Advanced', value: 'advanced' }
        )
    ),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      const userId = interaction.user.id;
      const guildId = interaction.guild.id;
      const category = interaction.options.getString('category') || null;
      const difficulty = interaction.options.getString('difficulty') || 'beginner';

      // Check if cannabis category requires age verification
      const cannabisCategories = ['strain_knowledge', 'growing_cultivation', 'consumption_methods'];
      const requiresAgeVerification = category && cannabisCategories.includes(category);

      if (requiresAgeVerification) {
        const isVerified = await AgeVerificationHelper.requireAgeVerification(interaction);
        if (!isVerified) return;
      }

      // Get quiz question based on category and difficulty
      let question;
      if (requiresAgeVerification) {
        question = await QuizQuestion.getCannabisQuestions(difficulty, category, 1);
      } else {
        question = await QuizQuestion.getRandomQuestions(difficulty, category, 1);
      }

      if (!question || question.length === 0) {
        const noQuestionEmbed = new EmbedBuilder()
          .setColor(BRAND_COLORS.SECONDARY)
          .setTitle('📚 No Questions Available')
          .setDescription('No quiz questions are currently available for this category and difficulty.')
          .addFields(
            {
              name: '💡 Try Different Options',
              value: '• Choose a different category\n• Select a different difficulty level\n• Try again later',
              inline: false
            }
          )
          .setFooter({
            text: 'GrowmiesNJ • Cannabis Education',
            iconURL: interaction.client.user.displayAvatarURL()
          })
          .setTimestamp();

        return await interaction.editReply({ embeds: [noQuestionEmbed] });
      }

      const quizQuestion = question[0];
      const questionData = quizQuestion.getFormattedQuestion();

      // Create quiz embed
      const quizEmbed = new EmbedBuilder()
        .setColor(BRAND_COLORS.PRIMARY_GREEN)
        .setTitle(`🧠 ${questionData.category.replace('_', ' ').toUpperCase()} Quiz`)
        .setDescription(`**${questionData.question}**`)
        .addFields(
          {
            name: '📊 Quiz Details',
            value: `**Difficulty:** ${questionData.difficulty.charAt(0).toUpperCase() + questionData.difficulty.slice(1)}\n**XP Reward:** ${questionData.xp_reward} XP\n**Category:** ${questionData.category.replace('_', ' ')}`,
            inline: true
          },
          {
            name: '⏱️ Time Bonus',
            value: 'Answer quickly for bonus XP!\n*Max 50% bonus for answers under 10 seconds*',
            inline: true
          }
        );

      // Add age verification notice for cannabis content
      if (questionData.requires_age) {
        quizEmbed.addFields({
          name: '🔞 Cannabis Content',
          value: 'This question contains cannabis-related educational content (21+ verified)',
          inline: false
        });
      }

      quizEmbed.setFooter({
        text: 'GrowmiesNJ • Cannabis Education • Select your answer below',
        iconURL: interaction.client.user.displayAvatarURL()
      })
      .setTimestamp();

      // Create answer buttons (max 5 per row, use multiple rows if needed)
      const answerRows = [];
      const answers = questionData.answers;
      
      for (let i = 0; i < answers.length; i += 5) {
        const row = new ActionRowBuilder();
        const rowAnswers = answers.slice(i, i + 5);
        
        rowAnswers.forEach((answer, index) => {
          const actualIndex = i + index;
          const button = new ButtonBuilder()
            .setCustomId(`quiz_answer_${quizQuestion.id}_${actualIndex}_${Date.now()}`)
            .setLabel(`${String.fromCharCode(65 + actualIndex)}. ${answer.substring(0, 75)}${answer.length > 75 ? '...' : ''}`)
            .setStyle(ButtonStyle.Secondary);
          
          row.addComponents(button);
        });
        
        answerRows.push(row);
      }

      // Add quit button
      const quitRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`quiz_quit_${quizQuestion.id}`)
            .setLabel('❌ Quit Quiz')
            .setStyle(ButtonStyle.Danger)
        );

      answerRows.push(quitRow);

      // Store quiz start time for speed bonus calculation
      const quizStartTime = Date.now();
      
      // Store quiz session data (you might want to use a cache like Redis in production)
      const quizSession = {
        questionId: quizQuestion.id,
        startTime: quizStartTime,
        userId: userId,
        guildId: guildId,
        category: questionData.category,
        difficulty: questionData.difficulty
      };

      // For now, we'll store in a simple Map (in production, use Redis or database)
      if (!global.quizSessions) {
        global.quizSessions = new Map();
      }
      global.quizSessions.set(`${userId}_${quizQuestion.id}`, quizSession);

      await interaction.editReply({
        embeds: [quizEmbed],
        components: answerRows
      });

    } catch (error) {
      console.error('Error executing quiz command:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor('#ff6b6b')
        .setTitle('❌ Quiz Error')
        .setDescription('An error occurred while loading the quiz question.')
        .addFields({
          name: '🔄 Try Again',
          value: 'Please try running the quiz command again.',
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
  }
};

/**
 * Handle quiz answer button interactions
 * This would typically be in a separate button handler file
 */
async function handleQuizAnswer(interaction) {
  try {
    await interaction.deferUpdate();

    const customId = interaction.customId;
    const parts = customId.split('_');
    
    if (parts[0] === 'quiz' && parts[1] === 'answer') {
      const questionId = parts[2];
      const answerIndex = parseInt(parts[3]);
      const timestamp = parts[4];

      // Get quiz session data
      const sessionKey = `${interaction.user.id}_${questionId}`;
      const quizSession = global.quizSessions?.get(sessionKey);

      if (!quizSession) {
        const expiredEmbed = new EmbedBuilder()
          .setColor('#ff6b6b')
          .setTitle('⏱️ Quiz Session Expired')
          .setDescription('This quiz session has expired. Please start a new quiz.')
          .setFooter({
            text: 'GrowmiesNJ • Session Management',
            iconURL: interaction.client.user.displayAvatarURL()
          });

        return await interaction.editReply({
          embeds: [expiredEmbed],
          components: []
        });
      }

      // Calculate time taken
      const timeTaken = Math.floor((Date.now() - quizSession.startTime) / 1000);

      // Process quiz completion through engagement service
      const result = await EngagementService.processQuizCompletion(
        interaction,
        questionId,
        answerIndex,
        timeTaken
      );

      // Clean up session
      global.quizSessions?.delete(sessionKey);

      if (!result.success) {
        const errorEmbed = new EmbedBuilder()
          .setColor('#ff6b6b')
          .setTitle('❌ Quiz Processing Error')
          .setDescription(result.message || 'An error occurred while processing your answer.')
          .setFooter({
            text: 'GrowmiesNJ • Error Handling',
            iconURL: interaction.client.user.displayAvatarURL()
          });

        return await interaction.editReply({
          embeds: [errorEmbed],
          components: []
        });
      }

      // Create result embed
      const resultColor = result.isCorrect ? BRAND_COLORS.PRIMARY_GREEN : '#ff6b6b';
      const resultEmoji = result.isCorrect ? '✅' : '❌';
      const resultTitle = result.isCorrect ? 'Correct Answer!' : 'Incorrect Answer';

      const resultEmbed = new EmbedBuilder()
        .setColor(resultColor)
        .setTitle(`${resultEmoji} ${resultTitle}`)
        .setDescription(`**Question:** ${result.question.question}`)
        .addFields(
          {
            name: '🎯 Your Answer',
            value: `${result.userAnswer}`,
            inline: true
          },
          {
            name: '✅ Correct Answer',
            value: `${result.correctAnswer}`,
            inline: true
          },
          {
            name: '🌟 XP Earned',
            value: `+${result.xpAwarded} XP`,
            inline: true
          }
        );

      if (result.explanation) {
        resultEmbed.addFields({
          name: '📚 Explanation',
          value: result.explanation,
          inline: false
        });
      }

      // Add performance stats
      resultEmbed.addFields({
        name: '📊 Your Stats',
        value: `**Total XP:** ${result.user.totalXP}\n**Questions Answered:** ${result.user.questionsAnswered}\n**Accuracy:** ${result.user.accuracy}%\n**Time:** ${timeTaken}s`,
        inline: true
      });

      // Add level up notification if applicable
      if (result.levelUp) {
        resultEmbed.addFields({
          name: '🎉 Level Up!',
          value: `Congratulations! You've reached **Level ${result.newLevel}** (${result.newTier})!`,
          inline: false
        });
      }

      resultEmbed.setFooter({
        text: 'GrowmiesNJ • Cannabis Education • Keep learning!',
        iconURL: interaction.client.user.displayAvatarURL()
      })
      .setTimestamp();

      // Create action buttons for next steps
      const actionRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('quiz_another')
            .setLabel('🧠 Another Quiz')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('quiz_stats')
            .setLabel('📊 My Stats')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('quiz_leaderboard')
            .setLabel('🏆 Leaderboard')
            .setStyle(ButtonStyle.Secondary)
        );

      await interaction.editReply({
        embeds: [resultEmbed],
        components: [actionRow]
      });

    } else if (parts[0] === 'quiz' && parts[1] === 'quit') {
      const questionId = parts[2];
      
      // Clean up session
      const sessionKey = `${interaction.user.id}_${questionId}`;
      global.quizSessions?.delete(sessionKey);

      const quitEmbed = new EmbedBuilder()
        .setColor(BRAND_COLORS.SECONDARY)
        .setTitle('👋 Quiz Cancelled')
        .setDescription('You have successfully quit the quiz. No XP was awarded.')
        .addFields({
          name: '🧠 Ready to Learn?',
          value: 'Use `/quiz` again when you\'re ready to test your cannabis knowledge!',
          inline: false
        })
        .setFooter({
          text: 'GrowmiesNJ • Cannabis Education',
          iconURL: interaction.client.user.displayAvatarURL()
        })
        .setTimestamp();

      await interaction.editReply({
        embeds: [quitEmbed],
        components: []
      });
    }

  } catch (error) {
    console.error('Error handling quiz answer:', error);
    
    const errorEmbed = new EmbedBuilder()
      .setColor('#ff6b6b')
      .setTitle('❌ Processing Error')
      .setDescription('An error occurred while processing your quiz answer.')
      .setFooter({
        text: 'GrowmiesNJ • Error Handling',
        iconURL: interaction.client.user.displayAvatarURL()
      });

    await interaction.editReply({
      embeds: [errorEmbed],
      components: []
    });
  }
}

module.exports.handleQuizAnswer = handleQuizAnswer;