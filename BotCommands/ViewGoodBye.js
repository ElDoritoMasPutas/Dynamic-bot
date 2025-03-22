const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', 'Json', 'GoodbyeChannels.json');
let config = require(configPath);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('viewgoodbye')
    .setDescription('View the current goodbye message settings for this server.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const guildId = interaction.guild.id;

    if (!config.servers || !config.servers[guildId]) {
      return interaction.reply({
        content: "⚠️ This server has not set up a goodbye system yet. Use `/setgoodbye` to configure it.",
        ephemeral: true
      });
    }

    const serverConfig = config.servers[guildId];

    await interaction.reply({
      content: `📜 **Goodbye System Settings for ${interaction.guild.name}:**  
      - **Goodbye Channel:** <#${serverConfig.goodbyeChannel}>  
      - **Goodbye Image:** ${serverConfig.goodbyeImage ? `[Click to view](${serverConfig.goodbyeImage})` : "None set"}`,
      ephemeral: true // ✅ Private response
    });
  }
};
