const { 
  SlashCommandBuilder, 
  ChannelType, 
  PermissionsBitField, 
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const fs = require('fs');
const path = require('path');

// Path to your JSON configuration file.
const configFilePath = path.join(__dirname, '../Json/guildConfig.json');

// Utility: Load the JSON configuration.
function loadConfig() {
  if (!fs.existsSync(configFilePath)) {
    fs.writeFileSync(configFilePath, '{}');
  }
  return JSON.parse(fs.readFileSync(configFilePath));
}

// Helper: Resolve a dynamic image option.
function resolveImage(option, customUrl, interaction, client, ackGif = null) {
  switch (option) {
    case 'guild':
      return interaction.guild.iconURL() || undefined;
    case 'user':
      return interaction.user.displayAvatarURL() || undefined;
    case 'bot':
      return client.user.displayAvatarURL() || undefined;
    case 'ack':
      return ackGif || undefined;
    case 'custom':
    default:
      return customUrl || undefined;
  }
}

// Helper: Resolve dynamic text for an element.
function resolveText(option, customText, interaction, client) {
  switch (option) {
    case 'guild':
      return interaction.guild.name || '';
    case 'user':
      return interaction.user.tag || '';
    case 'bot':
      return client.user.username || '';
    case 'custom':
    default:
      return customText || '';
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setrules')
    .setDescription('Posts a dynamic rules embed with a fancy acknowledgment system.'),
  async execute(interaction) {
    // Restrict usage to guild administrators.
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: 'You must be an Administrator to use this command.', ephemeral: true });
    }
    
    const guild = interaction.guild;

    // 1. Find (or create) the ❗rules❗ channel.
    let rulesChannel = guild.channels.cache.find(
      channel => channel.name === '❗rules❗' && channel.type === ChannelType.GuildText
    );
    if (!rulesChannel) {
      if (!guild.members.me.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        return interaction.reply({ content: "I don't have permission to create channels.", ephemeral: true });
      }
      rulesChannel = await guild.channels.create({
        name: '❗rules❗',
        type: ChannelType.GuildText,
        topic: 'Server rules and guidelines.',
      });
    }
    
    // 2. Load guild-specific configuration.
    const config = loadConfig();
    const guildConfig = config[guild.id] || {};

    // 3. Build the rules embed.
    const embedTitle = (guildConfig.embed_title_option === 'guild')
      ? guild.name
      : (guildConfig.embed_title || "Server Rules");
    const embedDescription = guildConfig.embed_description || (guildConfig.ack_message || "Please read the server rules carefully.");
    const embedColor = guildConfig.embed_color ? parseInt(guildConfig.embed_color.replace('#', ''), 16) : 0x00FF00;
    
    const authorText = resolveText(guildConfig.author_text_option, guildConfig.author_text, interaction, interaction.client) || interaction.user.username;
    const authorIcon = resolveImage(guildConfig.author_icon_option, guildConfig.author_icon, interaction, interaction.client) || interaction.user.displayAvatarURL();
    const thumbnail = resolveImage(guildConfig.thumbnail_option, guildConfig.thumbnail, interaction, interaction.client);
    const footerIcon = resolveImage(guildConfig.footer_icon_option, guildConfig.footer_icon, interaction, interaction.client);
    const footerText = guildConfig.footer_text || "Enjoy your stay!";
    
    const ackGif = guildConfig.ack_gif || "https://media.giphy.com/media/1BdIPc8i6vThupNsnJ/giphy.gif";
    const embedImage = resolveImage(guildConfig.embed_image_option, guildConfig.embed_image, interaction, interaction.client, ackGif);
    
    const rulesEmbed = new EmbedBuilder()
      .setTitle(embedTitle)
      .setDescription(embedDescription)
      .setColor(embedColor)
      .setTimestamp()
      .setAuthor({ name: authorText, iconURL: authorIcon })
      .setThumbnail(thumbnail)
      .setFooter({ text: footerText, iconURL: footerIcon })
      .setImage(embedImage);

    // 4. Create the "I Acknowledge" button.
    const acknowledgeButton = new ButtonBuilder()
      .setCustomId('acknowledgeRules')
      .setLabel('I Acknowledge')
      .setStyle(ButtonStyle.Primary);
    const buttonRow = new ActionRowBuilder().addComponents(acknowledgeButton);

    // 5. Post the rules embed with the button publicly.
    await rulesChannel.send({
      embeds: [rulesEmbed],
      components: [buttonRow]
    });

    // 6. Also post an acknowledgment embed that will be updated.
    const ackEmbed = new EmbedBuilder()
      .setTitle("Rules Acknowledgment")
      .setDescription("No one has acknowledged the rules yet.")
      .setColor(0xFFD700) // A fancy gold color
      .setTimestamp();
    const ackMessage = await rulesChannel.send({ embeds: [ackEmbed] });

    // 7. Store the acknowledgment message and list on the client for future updates.
    interaction.client.ackMessage = ackMessage;
    interaction.client.acknowledgers = new Set();

    // 8. Send a confirmation to the admin.
    return interaction.reply({
      content: `Rules embed and acknowledgment message posted in ${rulesChannel}.`,
      ephemeral: true
    });
  },
};
