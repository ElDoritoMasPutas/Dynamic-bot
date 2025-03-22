// commands/deletesticky.js
const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Use an absolute path from the project root
const stickyFilePath = path.join(process.cwd(), 'src', 'Json', 'stickyMessages.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('deletesticky')
    .setDescription("Delete the sticky configuration for this guild."),
  async execute(interaction) {
    // Check whether the user has permission to manage the guild.
    if (!interaction.member.permissions.has("MANAGE_GUILD")) {
      return interaction.reply({ content: "You do not have permission to use this command.", ephemeral: true });
    }

    // Load current sticky data from the JSON file.
    let stickyData = {};
    if (fs.existsSync(stickyFilePath)) {
      try {
        stickyData = JSON.parse(fs.readFileSync(stickyFilePath, 'utf-8'));
      } catch (error) {
        console.error("Error reading stickyMessages.json:", error);
        return interaction.reply({ content: "Error reading the configuration file.", ephemeral: true });
      }
    } else {
      return interaction.reply({ content: "The configuration file does not exist.", ephemeral: true });
    }

    const guildId = interaction.guild.id;
    if (!stickyData[guildId]) {
      return interaction.reply({ content: "No sticky configuration is set for this guild.", ephemeral: true });
    }

    // Remove the guild's sticky configuration.
    delete stickyData[guildId];

    // Write the updated configuration back to the JSON file.
    try {
      fs.writeFileSync(stickyFilePath, JSON.stringify(stickyData, null, 2), 'utf-8');
    } catch (error) {
      console.error("Error writing to stickyMessages.json:", error);
      return interaction.reply({ content: "Error updating the configuration file.", ephemeral: true });
    }

    return interaction.reply({ content: "Sticky configuration deleted successfully!", ephemeral: true });
  }
};
