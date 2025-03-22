const { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ChannelType 
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('aboutme')
    .setDescription('Set your about me info with various options.')
    .addStringOption(option =>
      option.setName('name')
        .setDescription('Your name (Discord or IRL). We recommend using your Discord name.')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('about')
        .setDescription('Tell us about yourself (favorite hobbies, bad habits, etc.).')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('foods')
        .setDescription("Your favorite foods (any particular cuisine you're fond of?)")
        .setRequired(true))
    .addStringOption(option =>
      option.setName('pokemon')
        .setDescription("Your favorite Pokemon (everyone has one, even if it's Pikachu).")
        .setRequired(true))
    .addStringOption(option =>
      option.setName('battle')
        .setDescription("Do you like to battle? (PVP isn't for everyone, share your thoughts!)")
        .setRequired(true)),
  
  async execute(interaction) {
    // Retrieve user options
    const name = interaction.options.getString('name');
    const about = interaction.options.getString('about');
    const foods = interaction.options.getString('foods');
    const pokemon = interaction.options.getString('pokemon');
    const battle = interaction.options.getString('battle');
    
    // Construct description text with all the gathered info
    const description = 
      `**Name:** ${name}\n` +
      `**About:** ${about}\n` +
      `**Favorite Foods:** ${foods}\n` +
      `**Favorite Pokemon:** ${pokemon}\n` +
      `**Likes to Battle:** ${battle}`;
    
    // Create an embed with the provided info
    const embed = new EmbedBuilder()
      .setAuthor({ name:`${name}'s About Me`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
      .setDescription(description)
      .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
      .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
      .setImage(interaction.client.user.displayAvatarURL({ dynamic: true }))
      .setColor('0x000000')
      .setTimestamp();
    
    // Attempt to find the "about-me" channel in the guild
    let aboutMeChannel = interaction.guild.channels.cache.find(
      channel => channel.name === 'about-me' && channel.type === ChannelType.GuildText
    );
    
    // If the channel doesn't exist, create it
    if (!aboutMeChannel) {
      aboutMeChannel = await interaction.guild.channels.create({
        name: 'about-me',
        type: ChannelType.GuildText,
        reason: 'Needed a channel for about me embeds',
      });
    }
    
    // Send the embed to the about-me channel
    await aboutMeChannel.send({ embeds: [embed] });
    
    // Reply to the interaction, letting the user know their info was posted
    await interaction.reply({ content: 'Your about me information has been posted!', ephemeral: true });
  }
};
