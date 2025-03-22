const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', 'Json', 'GoodbyeChannels.json');
let config = require(configPath);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setgoodbye')
    .setDescription('Set up the goodbye message system for this server.')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('The channel where goodbye messages will be sent.')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('image')
        .setDescription('Optional goodbye banner image URL.')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const guildId = interaction.guild.id;
    const goodbyeChannel = interaction.options.getChannel('channel');
    const imageUrl = interaction.options.getString('image') || null; // Optional image

    if (!config.servers) {
      config.servers = {};
    }

    config.servers[guildId] = {
      goodbyeChannel: goodbyeChannel.id,
      goodbyeImage: imageUrl
    };

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    await interaction.reply({
      content: `✅ **Goodbye system updated!**  
      - **Goodbye Channel:** <#${goodbyeChannel.id}>  
      - **Goodbye Image:** ${imageUrl ? `[Click to view](${imageUrl})` : "None set"}`,
      ephemeral: true // ✅ Private response
    });
  }
};
