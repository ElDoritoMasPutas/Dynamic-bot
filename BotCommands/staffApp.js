const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ChannelType, 
    PermissionFlagsBits 
} = require('discord.js');
const fs = require('fs');
const path = require('path');

// Define the path to your JSON config file (make sure the folder exists)
const configFilePath = path.join(__dirname, '../Json/staffApplication.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setstaffapp')
    .setDescription('Configure the staff application system (set questions, image, title, description) for this server.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    // Required question options – must be defined before optional ones.
    .addStringOption(option =>
      option.setName('question1')
        .setDescription('Question 1')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('question2')
        .setDescription('Question 2')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('question3')
        .setDescription('Question 3')
        .setRequired(true)
    )
    // Existing optional questions.
    .addStringOption(option =>
      option.setName('question4')
        .setDescription('Question 4 (optional)')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('question5')
        .setDescription('Question 5 (optional)')
        .setRequired(false)
    )
    // Five additional optional questions.
    .addStringOption(option =>
      option.setName('question6')
        .setDescription('Question 6 (optional)')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('question7')
        .setDescription('Question 7 (optional)')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('question8')
        .setDescription('Question 8 (optional)')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('question9')
        .setDescription('Question 9 (optional)')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('question10')
        .setDescription('Question 10 (optional)')
        .setRequired(false)
    )
    // Optional customization for embed appearance.
    .addStringOption(option =>
      option.setName('image')
        .setDescription('Image URL for the embed (optional)')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('title')
        .setDescription('Title for the embed (optional)')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('description')
        .setDescription('Description for the embed (optional)')
        .setRequired(false)
    ),
  async execute(interaction) {
    const guild = interaction.guild;
    const guildId = guild.id;

    // Read existing config or initialize an empty object.
    let config = {};
    if (fs.existsSync(configFilePath)) {
      try {
        config = JSON.parse(fs.readFileSync(configFilePath, 'utf8'));
      } catch (err) {
        console.error('Error reading config file:', err);
        config = {};
      }
    }

    // Gather the questions from the command options.
    const questions = [];
    for (let i = 1; i <= 10; i++) {
      const q = interaction.options.getString(`question${i}`);
      if (q) questions.push(q);
    }

    // Optional customization values.
    const image = interaction.options.getString('image') || null;
    const title = interaction.options.getString('title') || `${guild.name} Staff Application`;
    const description = interaction.options.getString('description') || 
      `Ready to join our team? Click "Apply Now" to begin your application.`;

    // Save configuration for this guild.
    config[guildId] = { image, questions, title, description };
    try {
      fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2), 'utf8');
    } catch (err) {
      console.error('Error writing config file:', err);
      return interaction.reply({ content: 'There was an error saving the configuration.', ephemeral: true });
    }

    // Helper: find or create a text channel by name (case-insensitive).
    async function getOrCreateChannel(channelName) {
      let channel = guild.channels.cache.find(c => 
        c.type === ChannelType.GuildText &&
        c.name.toLowerCase() === channelName.toLowerCase()
      );
      if (!channel) {
        channel = await guild.channels.create({
          name: channelName.toLowerCase(), // Discord stores channel names in lowercase.
          type: ChannelType.GuildText,
          topic: `${channelName} channel created by the application system`,
          permissionOverwrites: [
            { id: guild.roles.everyone.id, allow: [PermissionFlagsBits.ViewChannel] }
          ]
        });
      }
      return channel;
    }

    // Ensure the required channels exist.
    const staffAppChannel = await getOrCreateChannel('📄staff-application📄');
    await getOrCreateChannel('📄application-review📄');
    await getOrCreateChannel('📄application-logs📄');

    // Build an appealing embed for the application system.
    const embed = new EmbedBuilder()
      .setColor(0xFFCC00)
      .setTitle(title)
      .setDescription(description)
      .setFooter({ text: `${guild.name} Staff Application System`, iconURL: guild.iconURL() })
      .setTimestamp();
    if (image) embed.setImage(image);

    // Create the "Apply Now" button.
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('staffApplication')
        .setLabel('Apply Now')
        .setStyle(ButtonStyle.Primary)
    );

    // Send the embed with the button to the Staff-Application channel.
    await staffAppChannel.send({ embeds: [embed], components: [row] });

    // Reply to the admin.
    return interaction.reply({ content: 'Staff application system configured successfully!', ephemeral: true });
  },
};
