const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');

const configFilePath = path.join(__dirname, '../Json/guildConfig.json'); // Adjust the path as needed

// Utility functions to load and save JSON configuration.
function loadConfig() {
  if (!fs.existsSync(configFilePath)) {
    fs.writeFileSync(configFilePath, '{}');
  }
  return JSON.parse(fs.readFileSync(configFilePath));
}

function saveConfig(config) {
  fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rulesconfig')
    .setDescription('Configure your guild settings for rules channel.')
    // Acknowledge message & GIF
    .addStringOption(option =>
      option.setName('ack_message')
        .setDescription('The acknowledgement message to display.')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('ack_gif')
        .setDescription('The GIF URL to display upon acknowledgement.')
        .setRequired(false)
    )
    // Embed title: choose between custom or guild name.
    .addStringOption(option =>
      option.setName('embed_title_option')
        .setDescription('Select embed title source.')
        .addChoices(
          { name: 'Custom', value: 'custom' },
          { name: 'Guild Name', value: 'guild' }
        )
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('embed_title')
        .setDescription('The custom embed title (if not using Guild Name).')
        .setRequired(false)
    )
    // Embed description (custom)
    .addStringOption(option =>
      option.setName('embed_description')
        .setDescription('The description for the rules embed.')
        .setRequired(false)
    )
    // Embed color
    .addStringOption(option =>
      option.setName('embed_color')
        .setDescription('The HEX color for the embed (e.g., #0099FF).')
        .setRequired(false)
    )
    // Author text: choose between custom, user tag, guild name, or bot name.
    .addStringOption(option =>
      option.setName('author_text_option')
        .setDescription('Select author text source.')
        .addChoices(
          { name: 'Custom', value: 'custom' },
          { name: 'User Tag', value: 'user' },
          { name: 'Guild Name', value: 'guild' },
          { name: 'Bot Name', value: 'bot' }
        )
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('author_text')
        .setDescription('The custom author text (if not using a dynamic option).')
        .setRequired(false)
    )
    // Author icon: choose from custom URL, guild icon, user avatar, or bot avatar.
    .addStringOption(option =>
      option.setName('author_icon_option')
        .setDescription('Select author icon source.')
        .addChoices(
          { name: 'Custom', value: 'custom' },
          { name: 'Guild Icon', value: 'guild' },
          { name: 'User Avatar', value: 'user' },
          { name: 'Bot Avatar', value: 'bot' }
        )
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('author_icon')
        .setDescription('The custom author icon URL (if using Custom).')
        .setRequired(false)
    )
    // Thumbnail: choose source.
    .addStringOption(option =>
      option.setName('thumbnail_option')
        .setDescription('Select thumbnail image source.')
        .addChoices(
          { name: 'Custom', value: 'custom' },
          { name: 'Guild Icon', value: 'guild' },
          { name: 'User Avatar', value: 'user' },
          { name: 'Bot Avatar', value: 'bot' }
        )
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('thumbnail')
        .setDescription('The custom thumbnail URL (if using Custom).')
        .setRequired(false)
    )
    // Footer icon: choose source.
    .addStringOption(option =>
      option.setName('footer_icon_option')
        .setDescription('Select footer icon source.')
        .addChoices(
          { name: 'Custom', value: 'custom' },
          { name: 'Guild Icon', value: 'guild' },
          { name: 'User Avatar', value: 'user' },
          { name: 'Bot Avatar', value: 'bot' }
        )
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('footer_icon')
        .setDescription('The custom footer icon URL (if using Custom).')
        .setRequired(false)
    )
    // Footer text (custom)
    .addStringOption(option =>
      option.setName('footer_text')
        .setDescription('The text for the footer.')
        .setRequired(false)
    )
    // **New:** Embed image: choose source for the main image.
    .addStringOption(option =>
      option.setName('embed_image_option')
        .setDescription('Select main embed image source.')
        .addChoices(
          { name: 'Custom', value: 'custom' },
          { name: 'Guild Icon', value: 'guild' },
          { name: 'User Avatar', value: 'user' },
          { name: 'Bot Avatar', value: 'bot' },
          { name: 'Ack GIF', value: 'ack' }
        )
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('embed_image')
        .setDescription('The custom embed image URL (if using Custom).')
        .setRequired(false)
    ),
  async execute(interaction) {
    // Only allow administrators to update configuration.
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: 'You must be an administrator to use this command.', ephemeral: true });
    }
    
    const guildId = interaction.guild.id;
    const config = loadConfig();
    if (!config[guildId]) config[guildId] = {};

    // Save each option if provided.
    const opts = [
      'ack_message',
      'ack_gif',
      'embed_title_option',
      'embed_title',
      'embed_description',
      'embed_color',
      'author_text_option',
      'author_text',
      'author_icon_option',
      'author_icon',
      'thumbnail_option',
      'thumbnail',
      'footer_icon_option',
      'footer_icon',
      'footer_text',
      'embed_image_option',
      'embed_image'
    ];
    opts.forEach(key => {
      const value = interaction.options.getString(key);
      if (value !== null) {
        config[guildId][key] = value;
      }
    });

    saveConfig(config);
    await interaction.reply({ content: 'Configuration updated successfully!', ephemeral: true });
  },
};
