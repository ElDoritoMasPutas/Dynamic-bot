const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Ensure the configuration directory exists
const configDir = path.join(__dirname, "..", "Json");
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir);
}
const configPath = path.join(configDir, "automod.json");
if (!fs.existsSync(configPath)) {
  fs.writeFileSync(configPath, JSON.stringify({}, null, 2));
}

// Load and save functions
const loadConfig = () => JSON.parse(fs.readFileSync(configPath, 'utf-8'));
const saveConfig = (config) => {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log("Config saved successfully.");
    // Immediately read it back
    const updatedConfig = fs.readFileSync(configPath, 'utf-8');
    console.log("Updated file contents:", updatedConfig);
  } catch (error) {
    console.error("Error saving config:", error);
  }
};

// Create default settings if they don't exist for a guild
const getSettings = (config, guildId) => {
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
    .setName('setautomod')
    .setDescription('Modify AutoMod settings for your server.')
    // Bad words: comma-separated, prefix with "-" to remove
    .addStringOption(option => 
      option.setName('badwords')
        .setDescription('Add or remove bad words (comma-separated; prefix with "-" to remove)'))
    // Blacklisted links: comma-separated, prefix with "-" to remove
    .addStringOption(option =>
      option.setName('blacklistedlinks')
        .setDescription('Add or remove blacklisted links (comma-separated; prefix with "-" to remove)'))
    .addIntegerOption(option =>
      option.setName('spamlimit')
        .setDescription('Set spam message limit per 5 seconds'))
    .addBooleanOption(option =>
      option.setName('blocklinks')
        .setDescription('Enable or disable blocking all links'))
    .addIntegerOption(option =>
      option.setName('maxmentions')
        .setDescription('Set the max number of mentions allowed per message'))
    .addIntegerOption(option =>
      option.setName('muteduration')
        .setDescription('Set mute duration in minutes'))
    .addIntegerOption(option =>
      option.setName('maxwarnings')
        .setDescription('Set maximum warnings before auto-mute'))
    .addStringOption(option =>
      option.setName('warningimage')
        .setDescription('Set the warning embed image URL')),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: '🚨 You need admin permissions to modify AutoMod settings!', ephemeral: true });
    }
    
    // Always load the latest configuration from file
    let config = loadConfig();
    const guildId = interaction.guild.id;
    const settings = getSettings(config, guildId);
    let responseMessages = [];
    
    // Handle bad words update
    const badWordsInput = interaction.options.getString('badwords');
    if (badWordsInput) {
      const words = badWordsInput.split(',').map(w => w.trim().toLowerCase()).filter(Boolean);
      let added = [];
      let removed = [];
      words.forEach(word => {
        if (word.startsWith('-')) {
          const actualWord = word.slice(1);
          if (settings.badWords.includes(actualWord)) {
            settings.badWords = settings.badWords.filter(w => w !== actualWord);
            removed.push(actualWord);
          }
        } else {
          if (!settings.badWords.includes(word)) {
            settings.badWords.push(word);
            added.push(word);
          }
        }
      });
      if (added.length) responseMessages.push(`✅ Added bad words: ${added.join(', ')}`);
      if (removed.length) responseMessages.push(`🗑️ Removed bad words: ${removed.join(', ')}`);
    }
    
    // Handle blacklisted links update
    const linksInput = interaction.options.getString('blacklistedlinks');
    if (linksInput) {
      const links = linksInput.split(',').map(link => link.trim().toLowerCase()).filter(Boolean);
      let added = [];
      let removed = [];
      links.forEach(link => {
        if (link.startsWith('-')) {
          const actualLink = link.slice(1);
          if (settings.blacklistedLinks.includes(actualLink)) {
            settings.blacklistedLinks = settings.blacklistedLinks.filter(l => l !== actualLink);
            removed.push(actualLink);
          }
        } else {
          if (!settings.blacklistedLinks.includes(link)) {
            settings.blacklistedLinks.push(link);
            added.push(link);
          }
        }
      });
      if (added.length) responseMessages.push(`✅ Added blacklisted links: ${added.join(', ')}`);
      if (removed.length) responseMessages.push(`🗑️ Removed blacklisted links: ${removed.join(', ')}`);
    }
    
    // Update other settings if options are provided
    const spamLimit = interaction.options.getInteger('spamlimit');
    if (spamLimit !== null) {
      settings.spamLimit = spamLimit;
      responseMessages.push(`✅ Spam limit set to ${spamLimit}`);
    }
    
    const blockLinks = interaction.options.getBoolean('blocklinks');
    if (blockLinks !== null) {
      settings.blockLinks = blockLinks;
      responseMessages.push(`✅ Block links set to ${blockLinks}`);
    }
    
    const maxMentions = interaction.options.getInteger('maxmentions');
    if (maxMentions !== null) {
      settings.maxMentions = maxMentions;
      responseMessages.push(`✅ Max mentions set to ${maxMentions}`);
    }
    
    const muteDuration = interaction.options.getInteger('muteduration');
    if (muteDuration !== null) {
      settings.muteDuration = muteDuration;
      responseMessages.push(`✅ Mute duration set to ${muteDuration} minutes`);
    }
    
    const maxWarnings = interaction.options.getInteger('maxwarnings');
    if (maxWarnings !== null) {
      settings.maxWarnings = maxWarnings;
      responseMessages.push(`✅ Max warnings set to ${maxWarnings}`);
    }
    
    const warningImage = interaction.options.getString('warningimage');
    if (warningImage) {
      settings.warningImage = warningImage;
      responseMessages.push(`✅ Warning image updated`);
    }
    
    // Save the updated configuration back to the JSON file
    config[guildId] = settings;
    saveConfig(config);
    
    if (responseMessages.length === 0) {
      responseMessages.push('No settings were changed.');
    }
    
    return interaction.reply({ content: responseMessages.join('\n'), ephemeral: true });
  }
};