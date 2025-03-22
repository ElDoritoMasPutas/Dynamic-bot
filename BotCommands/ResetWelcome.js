const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', 'Json', 'welcomeChannels.json');
let config = require(configPath);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resetwelcome')
    .setDescription('Reset the welcome system for this server.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const guildId = interaction.guild.id;

    // Check if the server has a welcome system configured
    if (!config.servers || !config.servers[guildId]) {
      return interaction.reply({
        content: "⚠️ This server does not have a welcome system set up.",
        ephemeral: true
      });
    }

    // Delete the server's welcome settings
    delete config.servers[guildId];

    // Save the updated JSON file
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    await interaction.reply({
      content: "✅ The welcome system for this server has been **reset**. You can set it up again with `/setwelcome`. All settings, including custom messages, have been cleared.",
      ephemeral: true // ✅ Private response
    });
  }
};