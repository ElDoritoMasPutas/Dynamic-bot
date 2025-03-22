const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', 'Json', 'GoodbyeChannels.json');
let config = require(configPath);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('removegoodbye')
    .setDescription('Remove the goodbye message system for this server.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const guildId = interaction.guild.id;

    if (!config.servers || !config.servers[guildId]) {
      return interaction.reply({
        content: "⚠️ This server does not have a goodbye system set up.",
        ephemeral: true
      });
    }

    delete config.servers[guildId];

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    await interaction.reply({
      content: "✅ The goodbye system for this server has been **removed**. You can set it up again with `/setgoodbye`.",
      ephemeral: true // ✅ Private response
    });
  }
};
