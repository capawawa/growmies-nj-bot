/**
 * Seed Cannabis Knowledge Base Command for GrowmiesNJ Discord Bot
 * 
 * LLM Chat Integration: Admin command to manage cannabis knowledge base seeding
 * Allows administrators to populate, clear, and manage the cannabis knowledge database
 */

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const CannabisKnowledgeSeeder = require('../../utils/cannabisKnowledgeSeeder');
const { AuditLogger } = require('../../utils/auditLogger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('seed-cannabis-kb')
    .setDescription('🌿 Manage cannabis knowledge base seeding (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(subcommand =>
      subcommand
        .setName('populate')
        .setDescription('Seed the cannabis knowledge base with initial data')
        .addBooleanOption(option =>
          option
            .setName('force')
            .setDescription('Force re-seeding (clears existing admin entries first)')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('clear')
        .setDescription('Clear all admin-seeded knowledge base entries')
        .addBooleanOption(option =>
          option
            .setName('confirm')
            .setDescription('Confirm deletion of all admin-created entries')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('stats')
        .setDescription('View knowledge base statistics and content overview')
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const seeder = new CannabisKnowledgeSeeder();

    try {
      switch (subcommand) {
        case 'populate':
          await this.handlePopulate(interaction, seeder);
          break;
        case 'clear':
          await this.handleClear(interaction, seeder);
          break;
        case 'stats':
          await this.handleStats(interaction, seeder);
          break;
        default:
          await interaction.reply({
            content: '❌ Unknown subcommand. Please use populate, clear, or stats.',
            ephemeral: true
          });
      }
    } catch (error) {
      console.error('Seed Cannabis KB Command Error:', error);
      
      // Log the error for audit purposes
      await AuditLogger.log({
        userId: interaction.user.id,
        action: 'CANNABIS_KB_ERROR',
        details: `Error in seed-cannabis-kb command: ${error.message}`,
        metadata: { subcommand }
      });

      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ An error occurred while managing the cannabis knowledge base. Please try again later.',
          ephemeral: true
        });
      }
    }
  },

  /**
   * Handle knowledge base population
   */
  async handlePopulate(interaction, seeder) {
    const force = interaction.options.getBoolean('force') || false;

    await interaction.deferReply({ ephemeral: true });

    try {
      // Clear existing if force is true
      if (force) {
        const clearResult = await seeder.clearAll();
        if (!clearResult.success) {
          throw new Error(`Failed to clear existing data: ${clearResult.error}`);
        }
      }

      // Seed the knowledge base
      const result = await seeder.seedAll();

      if (result.success) {
        const embed = new EmbedBuilder()
          .setColor('#10B981') // Green
          .setTitle('🌿 Cannabis Knowledge Base Seeded Successfully')
          .setDescription('The cannabis knowledge base has been populated with educational content.')
          .addFields(
            { name: '📊 Entries Added', value: result.seededCount.toString(), inline: true },
            { name: '⚠️ Errors', value: result.errors.length.toString(), inline: true },
            { name: '🔄 Force Clear', value: force ? 'Yes' : 'No', inline: true }
          )
          .setTimestamp();

        if (result.errors.length > 0) {
          embed.addFields({
            name: '❌ Error Details',
            value: result.errors.slice(0, 5).join('\n') + (result.errors.length > 5 ? `\n... and ${result.errors.length - 5} more` : ''),
            inline: false
          });
        }

        // Log the successful seeding
        await AuditLogger.log({
          userId: interaction.user.id,
          action: 'CANNABIS_KB_SEEDED',
          details: `Successfully seeded cannabis knowledge base with ${result.seededCount} entries`,
          metadata: { 
            seededCount: result.seededCount, 
            errors: result.errors.length,
            force 
          }
        });

        await interaction.editReply({ embeds: [embed] });

      } else {
        throw new Error(result.error || 'Unknown seeding error');
      }

    } catch (error) {
      console.error('Knowledge base seeding failed:', error);

      const embed = new EmbedBuilder()
        .setColor('#EF4444') // Red
        .setTitle('❌ Cannabis Knowledge Base Seeding Failed')
        .setDescription('An error occurred while seeding the knowledge base.')
        .addFields({
          name: '🐛 Error Details',
          value: error.message.substring(0, 1024),
          inline: false
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    }
  },

  /**
   * Handle knowledge base clearing
   */
  async handleClear(interaction, seeder) {
    const confirm = interaction.options.getBoolean('confirm');

    if (!confirm) {
      await interaction.reply({
        content: '❌ You must confirm the deletion by setting the `confirm` option to `true`.',
        ephemeral: true
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const result = await seeder.clearAll();

      if (result.success) {
        const embed = new EmbedBuilder()
          .setColor('#F59E0B') // Amber
          .setTitle('🗑️ Cannabis Knowledge Base Cleared')
          .setDescription('All admin-created knowledge base entries have been removed.')
          .addFields({
            name: '📊 Entries Deleted',
            value: result.deletedCount.toString(),
            inline: true
          })
          .setTimestamp();

        // Log the clearing action
        await AuditLogger.log({
          userId: interaction.user.id,
          action: 'CANNABIS_KB_CLEARED',
          details: `Cleared ${result.deletedCount} admin-created knowledge base entries`,
          metadata: { deletedCount: result.deletedCount }
        });

        await interaction.editReply({ embeds: [embed] });

      } else {
        throw new Error(result.error || 'Unknown clearing error');
      }

    } catch (error) {
      console.error('Knowledge base clearing failed:', error);

      const embed = new EmbedBuilder()
        .setColor('#EF4444') // Red
        .setTitle('❌ Cannabis Knowledge Base Clearing Failed')
        .setDescription('An error occurred while clearing the knowledge base.')
        .addFields({
          name: '🐛 Error Details',
          value: error.message.substring(0, 1024),
          inline: false
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    }
  },

  /**
   * Handle knowledge base statistics
   */
  async handleStats(interaction, seeder) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const stats = await seeder.getStats();

      if (stats.success) {
        const embed = new EmbedBuilder()
          .setColor('#3B82F6') // Blue
          .setTitle('📊 Cannabis Knowledge Base Statistics')
          .setDescription('Current status of the cannabis knowledge database.')
          .addFields(
            { name: '📚 Total Entries', value: stats.total.toString(), inline: true },
            { name: '🗂️ Categories', value: Object.keys(stats.byCategory).length.toString(), inline: true }
          )
          .setTimestamp();

        // Add category breakdown
        if (Object.keys(stats.byCategory).length > 0) {
          const categoryBreakdown = Object.entries(stats.byCategory)
            .map(([category, count]) => `**${category}**: ${count}`)
            .join('\n');

          embed.addFields({
            name: '📋 Category Breakdown',
            value: categoryBreakdown,
            inline: false
          });
        }

        await interaction.editReply({ embeds: [embed] });

      } else {
        throw new Error(stats.error || 'Unknown stats error');
      }

    } catch (error) {
      console.error('Knowledge base stats failed:', error);

      const embed = new EmbedBuilder()
        .setColor('#EF4444') // Red
        .setTitle('❌ Cannot Retrieve Knowledge Base Statistics')
        .setDescription('An error occurred while fetching knowledge base statistics.')
        .addFields({
          name: '🐛 Error Details',
          value: error.message.substring(0, 1024),
          inline: false
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    }
  }
};