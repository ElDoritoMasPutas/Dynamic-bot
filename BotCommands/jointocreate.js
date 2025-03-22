const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { loadConfig, saveConfig } = require('../Utils/jtcPersist');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('jointocreate')
    .setDescription('Sets up a join-to-create voice channel that renames itself upon user join.')
    .addChannelOption(option =>
      option
        .setName('category')
        .setDescription('Select the category where the voice channel will be created.')
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildCategory)
    ),
  async execute(interaction) {
    if (!interaction.inGuild()) {
      return interaction.reply({
        content: 'This command can only be used in a server.',
        ephemeral: true
      });
    }
    if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        content: 'You do not have the required permissions to use this command.',
        ephemeral: true
      });
    }
    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return interaction.reply({
        content: "I don't have permission to manage channels.",
        ephemeral: true,
      });
    }

    const category = interaction.options.getChannel('category');

    try {
      // Create the join-to-create (hub) voice channel.
      const joinChannel = await interaction.guild.channels.create({
        name: 'Join to Create',
        type: ChannelType.GuildVoice,
        parent: category.id,
        permissionOverwrites: [
          {
            id: interaction.guild.id,
            allow: [PermissionFlagsBits.Connect],
          },
          {
            id: interaction.user.id,
            allow: [PermissionFlagsBits.ManageChannels],
          },
        ],
      });

      // Update in-memory collection on the client for quick access.
      interaction.client.joinToCreateChannels = interaction.client.joinToCreateChannels || new Map();
      interaction.client.joinToCreateChannels.set(interaction.guild.id, {
        joinChannelId: joinChannel.id,
        categoryId: category.id,
      });

      // Load persistent configuration, update for this guild, and then save.
      const config = await loadConfig();
      config[interaction.guild.id] = {
        joinChannelId: joinChannel.id,
        categoryId: category.id,
      };
      await saveConfig(config);

      await interaction.reply({
  content: `Join-to-create voice channel created: <#${joinChannel.id}>.`,
  ephemeral: true
});
    } catch (error) {
      console.error('Error creating the join-to-create channel:', error);
      await interaction.reply({
        content: 'There was an error while creating the voice channel. Please try again later.',
        ephemeral: true,
      });
    }
  },
};
