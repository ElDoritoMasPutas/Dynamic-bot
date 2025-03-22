const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, "..", "Json", "automod.json");

// Ensure the JSON file exists
if (!fs.existsSync(configPath)) {
  fs.writeFileSync(configPath, JSON.stringify({}, null, 2));
}

// Helper functions for config handling
const loadConfig = () => JSON.parse(fs.readFileSync(configPath, 'utf8'));
const saveConfig = (config) => fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

// Get the current settings for a guild, setting defaults if necessary
const getSettings = (guildId) => {
  let config = loadConfig();
  if (!config[guildId]) {
    config[guildId] = {
      badWords: [],
      blacklistedLinks: [],
      spamLimit: 5,
      blockLinks: true,
      maxMentions: 4,
      muteDuration: 10,
      maxWarnings: 3,
      warningImage: ""
    };
    saveConfig(config);
  }
  return config[guildId];
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('viewautomod')
    .setDescription('View the current AutoMod settings for this server.')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({
        content: '🚨 You need admin permissions to view AutoMod settings!',
        ephemeral: true
      });
    }

    const guildId = interaction.guild.id;
    const settings = getSettings(guildId);

    const embed = new EmbedBuilder()
      .setColor(0x000000)
      .setTitle(`⚙️ AutoMod Settings for ${interaction.guild.name}`)
      .addFields(
        {
          name: "📝 Bad Words List",
          value: settings.badWords.length > 0 ? settings.badWords.join(', ') : "None",
          inline: false
        },
        {
          name: "🚫 Blacklisted Links",
          value: settings.blacklistedLinks.length > 0 ? settings.blacklistedLinks.join(', ') : "None",
          inline: false
        },
        {
          name: "⚠️ Max Warnings Before Mute",
          value: `${settings.maxWarnings}`,
          inline: true
        },
        {
          name: "🔇 Mute Duration (Minutes)",
          value: `${settings.muteDuration}`,
          inline: true
        },
        {
          name: "🚀 Spam Limit (Msgs/5s)",
          value: `${settings.spamLimit}`,
          inline: true
        },
        {
          name: "🔗 Block All Links",
          value: settings.blockLinks ? "✅ Enabled" : "❌ Disabled",
          inline: true
        },
        {
          name: "🔊 Max Mentions per Message",
          value: `${settings.maxMentions}`,
          inline: true
        }
      )
      .setFooter({ text: "Use /setautomod to modify these settings." });

    if (settings.warningImage) {
      embed.setImage(settings.warningImage);
    }

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
