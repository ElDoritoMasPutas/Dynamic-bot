const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Use absolute paths for better reliability
const configPath = path.resolve(__dirname, '..', 'Json', 'welcomeChannels.json');
let config;
try {
  config = require(configPath);
  console.log(`Successfully loaded welcome configuration from ${configPath}`);
} catch (error) {
  console.error(`Failed to load welcome configuration from ${configPath}: ${error.message}`);
  config = { servers: {} };
  
  // Ensure the directory exists
  const configDir = path.dirname(configPath);
  if (!fs.existsSync(configDir)) {
    try {
      fs.mkdirSync(configDir, { recursive: true });
      console.log(`Created config directory: ${configDir}`);
    } catch (dirError) {
      console.error(`Failed to create config directory: ${dirError.message}`);
    }
  }
}

// Save configuration to file
function saveConfig() {
  try {
    // Ensure the directory exists
    const configDir = path.dirname(configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`Saved welcome configuration to ${configPath}`);
    return true;
  } catch (error) {
    console.error(`Failed to save welcome configuration: ${error.message}`);
    return false;
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setwelcome')
    .setDescription('Configure the welcome system with channels, messages, and choose a Pokémon background.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    // General configuration subcommand.
    .addSubcommand(sub =>
      sub.setName('config')
         .setDescription('Configure general welcome settings.')
         .addChannelOption(option =>
            option.setName('welcome')
                  .setDescription('The channel for welcome messages.')
                  .setRequired(true)
         )
         .addChannelOption(option =>
            option.setName('rules')
                  .setDescription('The channel for server rules.')
                  .setRequired(true)
         )
         .addChannelOption(option =>
            option.setName('general')
                  .setDescription('The channel for general chat.')
                  .setRequired(true)
         )
         .addStringOption(option =>
            option.setName('description')
                  .setDescription('Custom welcome message (use {user}, {server}, {rules}, {general}).')
                  .setRequired(false)
         )
         .addStringOption(option =>
            option.setName('dmmessage')
                  .setDescription('Custom DM message (use {user}, {server}).')
                  .setRequired(false)
         )
    )
    // Pokémon image selection subcommand group.
    .addSubcommandGroup(group =>
      group.setName('pokemon')
           .setDescription('Select a Pokémon background image for welcome banners.')
           .addSubcommand(sub =>
              sub.setName('milotic')
                 .setDescription('Use Milotic image.')
           )
           .addSubcommand(sub =>
              sub.setName('lycanroc')
                 .setDescription('Use Lycanroc image.')
           )
           .addSubcommand(sub =>
              sub.setName('roaringmoon')
                 .setDescription('Use Roaring Moon image.')
           )
           .addSubcommand(sub =>
              sub.setName('arceus')
                 .setDescription('Use Arceus image.')
           )
           .addSubcommand(sub =>
              sub.setName('dialga')
                 .setDescription('Use Dialga image.')
           )
           .addSubcommand(sub =>
              sub.setName('giratina')
                 .setDescription('Use Giratina image.')
           )
           .addSubcommand(sub =>
              sub.setName('cresselia')
                 .setDescription('Use Cresselia image.')
           )
           .addSubcommand(sub =>
              sub.setName('manaphy')
                 .setDescription('Use Manaphy image.')
           )
           .addSubcommand(sub =>
              sub.setName('cyndaquil')
                 .setDescription('Use Cyndaquil image.')
           )
           .addSubcommand(sub =>
              sub.setName('pikachu')
                 .setDescription('Use Pikachu image.')
           )
           .addSubcommand(sub =>
              sub.setName('darkrai')
                 .setDescription('Use Darkrai image.')
           )
           .addSubcommand(sub =>
              sub.setName('latias')
                 .setDescription('Use Latias image.')
           )
           .addSubcommand(sub =>
              sub.setName('melmetal')
                 .setDescription('Use Melmetal image.')
           )
           .addSubcommand(sub =>
              sub.setName('shaymin')
                 .setDescription('Use Shaymin image.')
           )
           .addSubcommand(sub =>
              sub.setName('hoopa')
                 .setDescription('Use Hoopa image.')
           )
           .addSubcommand(sub =>
              sub.setName('volcanion')
                 .setDescription('Use Volcanion image.')
           )
           .addSubcommand(sub =>
              sub.setName('meloetta')
                 .setDescription('Use Meloetta image.')
           )
           .addSubcommand(sub =>
              sub.setName('jirachi')
                 .setDescription('Use Jirachi image.')
           )
           .addSubcommand(sub =>
              sub.setName('deoxys')
                 .setDescription('Use Deoxys image.')
           )
           .addSubcommand(sub =>
              sub.setName('victini')
                 .setDescription('Use Victini image.')
           )
    ),

  async execute(interaction) {
    const guildId = interaction.guild.id;
    
    // Ensure we have a config section for this server
    if (!config.servers) config.servers = {};
    if (!config.servers[guildId]) config.servers[guildId] = {};

    // Check if a subcommand group was used
    const subcommandGroup = interaction.options.getSubcommandGroup(false);

    // Verify the Images directory exists for Pokémon images
    const imagesDir = path.resolve(__dirname, '..', 'Images');
    if (!fs.existsSync(imagesDir)) {
      try {
        fs.mkdirSync(imagesDir, { recursive: true });
        console.log(`Created Images directory: ${imagesDir}`);
      } catch (error) {
        console.error(`Failed to create Images directory: ${error.message}`);
        return interaction.reply({
          content: "⚠️ Could not create the Images directory for Pokémon images. Please check permissions.",
          ephemeral: true
        });
      }
    }

    if (subcommandGroup === 'pokemon') {
      // Get the Pokémon name directly from the subcommand name
      const pokemonName = interaction.options.getSubcommand(); // e.g. "milotic"
      const pokemonFileName = `${pokemonName}.png`;
      const pokemonImagePath = path.resolve(imagesDir, pokemonFileName);
      
      // Check if the image file exists
      const imageExists = fs.existsSync(pokemonImagePath);
      
      // Set the background image (bgimage) to the corresponding file (e.g. "milotic.png")
      config.servers[guildId].bgimage = pokemonFileName;
      
      if (!saveConfig()) {
        return interaction.reply({
          content: "⚠️ An error occurred while saving the Pokémon settings. Please check console for details.",
          ephemeral: true
        });
      }
      
      // Create a rich embed response with image preview if possible
      const embed = new EmbedBuilder()
        .setColor(0x00AAFF)
        .setTitle('Welcome Background Updated')
        .setDescription(`Background image set to **${pokemonName}**.${!imageExists ? '\n\n⚠️ **Warning:** Image file not found! Please add it to your Images folder.' : ''}`)
        .addFields(
          { name: "File Name", value: pokemonFileName, inline: true },
          { name: "Status", value: imageExists ? "✅ File Found" : "⚠️ File Missing", inline: true }
        )
        .setFooter({ text: "Your welcome messages will now use this background" });
      
      // Add expected file path for missing images
      if (!imageExists) {
        embed.addFields({ name: "Expected Path", value: `\`${pokemonImagePath}\`` });
      }
        
      return interaction.reply({
        embeds: [embed],
        ephemeral: true
      });
    } else {
      // Handle the general welcome configuration
      const welcomeChannel = interaction.options.getChannel('welcome');
      const rulesChannel = interaction.options.getChannel('rules');
      const generalChannel = interaction.options.getChannel('general');
      const welcomeDescription = interaction.options.getString('description') || 'Welcome {user} to {server}! 🎉';
      const dmMessage = interaction.options.getString('dmmessage') || 'Hey {user}, welcome to {server}! Check the rules!';

      config.servers[guildId].welcomeChannel = welcomeChannel.id;
      config.servers[guildId].rulesChannel = rulesChannel.id;
      config.servers[guildId].generalChannel = generalChannel.id;
      config.servers[guildId].welcomeDescription = welcomeDescription;
      config.servers[guildId].dmMessage = dmMessage;

      if (!saveConfig()) {
        return interaction.reply({
          content: "⚠️ An error occurred while saving the welcome settings. Please check console for details.",
          ephemeral: true
        });
      }

      // Check if a Pokémon background is set
      const currentBackground = config.servers[guildId].bgimage || "Not set";
      let backgroundStatus = "Not set";
      
      if (config.servers[guildId].bgimage) {
        const backgroundPath = path.resolve(imagesDir, config.servers[guildId].bgimage);
        backgroundStatus = fs.existsSync(backgroundPath) ? 
          `✅ ${config.servers[guildId].bgimage}` : 
          `⚠️ ${config.servers[guildId].bgimage} (File not found)`;
      }

      // Create a rich embed response
      const embed = new EmbedBuilder()
        .setColor(0x00AAFF)
        .setTitle('Welcome System Updated')
        .setDescription(`Your welcome system has been configured successfully.`)
        .addFields(
          { name: "Welcome Channel", value: `<#${welcomeChannel.id}>`, inline: true },
          { name: "Rules Channel", value: `<#${rulesChannel.id}>`, inline: true },
          { name: "General Chat", value: `<#${generalChannel.id}>`, inline: true },
          { name: "Background Image", value: backgroundStatus, inline: false },
          { name: "Welcome Message", value: `\`\`\`${welcomeDescription.replace(/`/g, "'")}\`\`\``, inline: false },
          { name: "DM Message", value: `\`\`\`${dmMessage.replace(/`/g, "'")}\`\`\``, inline: false }
        )
        .setFooter({ text: "Use /setwelcome pokemon [name] to change the background image" });

      return interaction.reply({
        embeds: [embed],
        ephemeral: true
      });
    }
  }
};