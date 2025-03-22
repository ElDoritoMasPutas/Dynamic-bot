const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', 'Json', 'welcomeChannels.json');
let config = require(configPath);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('viewwelcome')
    .setDescription('View the current welcome system settings for this server.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const guildId = interaction.guild.id;

    // Check if the server has saved welcome settings
    if (!config.servers || !config.servers[guildId]) {
      return interaction.reply({
        content: "⚠️ This server has not set up a welcome system yet. Use `/setwelcome` to configure it.",
        ephemeral: true
      });
    }

    const serverConfig = config.servers[guildId];

    await interaction.reply({
      content: `📜 **Welcome System Settings for ${interaction.guild.name}:**  
      - **Welcome Channel:** <#${serverConfig.welcomeChannel}>  
      - **Rules Channel:** <#${serverConfig.rulesChannel}>  
      - **General Chat:** <#${serverConfig.generalChannel}>  
      - **Welcome Image:** ${serverConfig.welcomeImage ? `[Click to view](${serverConfig.welcomeImage})` : "None set"}  
      - **Welcome Message:** ${serverConfig.welcomeDescription || "Default welcome message."}  
      - **DM Message:** ${serverConfig.dmMessage || "Default DM message."}`,
      ephemeral: true
    });
  }
};
