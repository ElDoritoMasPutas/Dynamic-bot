// commands/setsticky.js
const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Define an absolute path to the JSON file using process.cwd()
const stickyFilePath = path.join(process.cwd(), 'src', 'Json', 'stickyMessages.json');

// Load existing sticky data if it exists.
let stickyData = {};
if (fs.existsSync(stickyFilePath)) {
  try {
    stickyData = JSON.parse(fs.readFileSync(stickyFilePath, 'utf-8'));
  } catch (error) {
    console.error('Error reading stickyMessages.json:', error);
  }
}

// Helper function to update the JSON file.
function updateStickyData() {
  try {
    fs.writeFileSync(stickyFilePath, JSON.stringify(stickyData, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing to stickyMessages.json:', error);
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setsticky')
    .setDescription('Configure and set the sticky embed for this server.')
    // Required options (true) come first.
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('Select the channel where the sticky embed will be active.')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('title')
        .setDescription('Embed title.')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('description')
        .setDescription('Embed description.')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName('color')
        .setDescription('Embed color (in decimal, e.g., 3447003; for black, use 0).')
        .setRequired(true)
    )
    // Optional options (false) follow.
    .addStringOption(option =>
      option
        .setName('author')
        .setDescription('Embed author text (optional). Leave empty to use the bot’s name dynamically.')
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName('author_image')
        .setDescription('Embed author image URL (optional). Leave empty to use the bot\'s avatar dynamically.')
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName('thumbnail')
        .setDescription('Embed thumbnail URL (optional).')
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName('image')
        .setDescription('Embed image URL (optional).')
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName('footer_text')
        .setDescription('Embed footer text. Leave empty to use the server name dynamically.')
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName('footer_icon')
        .setDescription('Embed footer icon URL. Leave empty to use the guild icon dynamically.')
        .setRequired(false)
    )
    .addBooleanOption(option =>
      option
        .setName('timestamp')
        .setDescription('Include a timestamp in the embed?')
        .setRequired(false)
    ),
  async execute(interaction) {
    // Check for the required permissions.
    if (!interaction.member.permissions.has("MANAGE_GUILD")) {
      return interaction.reply({ content: "You do not have permission to use this command.", ephemeral: true });
    }
    
    // Get the selected channel from the channel option.
    const channel = interaction.options.getChannel('channel');
    const channelIDs = [channel.id];

    // Get required options.
    const title = interaction.options.getString('title');
    const description = interaction.options.getString('description');
    const color = interaction.options.getInteger('color');

    // Get optional options.
    // If not provided, default to dynamic placeholders.
    const author = interaction.options.getString('author') || "<DYNAMIC_AUTHOR>";
    const authorImage = interaction.options.getString('author_image') || "<DYNAMIC_AUTHOR_ICON>";
    const thumbnail = interaction.options.getString('thumbnail') || null;
    const image = interaction.options.getString('image') || null;
    const footerText = interaction.options.getString('footer_text') || "<DYNAMIC_FOOTER>";
    const footerIcon = interaction.options.getString('footer_icon') || "<DYNAMIC_ICON>";
    const timestamp = interaction.options.getBoolean('timestamp') || false;

    // Build the complete embed configuration object.
    const embedConfig = {
      author: { 
        name: author,
        icon_url: authorImage
      },
      title,
      description,
      thumbnail,
      image, // New image field added.
      footer: {
        text: footerText,
        icon_url: footerIcon,
        timestamp // This flag will instruct the event to add a timestamp.
      },
      color
    };

    // Update the configuration for this guild.
    const guildId = interaction.guild.id;
    stickyData[guildId] = {
      channelIDs,
      embed: embedConfig,
      currentStickyMessages: {} // Reset the current sticky messages on config change.
    };

    // Write the updated configuration back to JSON.
    updateStickyData();

    await interaction.reply({ content: "Sticky configuration updated successfully!", ephemeral: true });
  }
};
