const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const reactionRolesUtil = require('../Utils/reactionRolesUtil');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reactionrole')
    .setDescription('Set up a reaction role message')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('create')
        .setDescription('Create a new reaction role message')
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('The channel to send the message in')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('message')
            .setDescription('The content of the message (use \\n for new lines)')
            .setRequired(true))
        // Options for up to 11 emoji-role pairs:
        .addStringOption(option =>
          option.setName('emoji1')
            .setDescription('The first emoji to use for the reaction')
            .setRequired(true))
        .addRoleOption(option =>
          option.setName('role1')
            .setDescription('The first role to assign')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('emoji2')
            .setDescription('The second emoji to use for the reaction')
            .setRequired(false))
        .addRoleOption(option =>
          option.setName('role2')
            .setDescription('The second role to assign')
            .setRequired(false))
        .addStringOption(option =>
          option.setName('emoji3')
            .setDescription('The third emoji to use for the reaction')
            .setRequired(false))
        .addRoleOption(option =>
          option.setName('role3')
            .setDescription('The third role to assign')
            .setRequired(false))
        .addStringOption(option =>
          option.setName('emoji4')
            .setDescription('The fourth emoji to use for the reaction')
            .setRequired(false))
        .addRoleOption(option =>
          option.setName('role4')
            .setDescription('The fourth role to assign')
            .setRequired(false))
        .addStringOption(option =>
          option.setName('emoji5')
            .setDescription('The fifth emoji to use for the reaction')
            .setRequired(false))
        .addRoleOption(option =>
          option.setName('role5')
            .setDescription('The fifth role to assign')
            .setRequired(false))
        .addStringOption(option =>
          option.setName('emoji6')
            .setDescription('The sixth emoji to use for the reaction')
            .setRequired(false))
        .addRoleOption(option =>
          option.setName('role6')
            .setDescription('The sixth role to assign')
            .setRequired(false))
        .addStringOption(option =>
          option.setName('emoji7')
            .setDescription('The seventh emoji to use for the reaction')
            .setRequired(false))
        .addRoleOption(option =>
          option.setName('role7')
            .setDescription('The seventh role to assign')
            .setRequired(false))
        .addStringOption(option =>
          option.setName('emoji8')
            .setDescription('The eighth emoji to use for the reaction')
            .setRequired(false))
        .addRoleOption(option =>
          option.setName('role8')
            .setDescription('The eighth role to assign')
            .setRequired(false))
        .addStringOption(option =>
          option.setName('emoji9')
            .setDescription('The ninth emoji to use for the reaction')
            .setRequired(false))
        .addRoleOption(option =>
          option.setName('role9')
            .setDescription('The ninth role to assign')
            .setRequired(false))
        .addStringOption(option =>
          option.setName('emoji10')
            .setDescription('The tenth emoji to use for the reaction')
            .setRequired(false))
        .addRoleOption(option =>
          option.setName('role10')
            .setDescription('The tenth role to assign')
            .setRequired(false))
        .addStringOption(option =>
          option.setName('emoji11')
            .setDescription('The eleventh emoji to use for the reaction')
            .setRequired(false))
        .addRoleOption(option =>
          option.setName('role11')
            .setDescription('The eleventh role to assign')
            .setRequired(false))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('delete')
        .setDescription('Delete an existing reaction role message mapping')
        .addStringOption(option =>
          option.setName('message_id')
            .setDescription('The ID of the reaction role message')
            .setRequired(true))),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    if (interaction.options.getSubcommand() === 'create') {
      const channel = interaction.options.getChannel('channel');
      let content = interaction.options.getString('message');
      // Convert literal "\n" to actual newlines.
      content = content.replace(/\\n/g, "\n");

      // Helper: Parse an emoji string from user input.
      function parseEmojiInput(emojiString) {
        const match = emojiString.match(/^<a?:(\w+):(\d+)>$/);
        if (!match) {
          // It's a Unicode emoji.
          return {
            isCustom: false,
            emojiName: emojiString,
            emojiId: null,
            display: emojiString,
          };
        }
        const isAnimated = emojiString.startsWith('<a:');
        const name = match[1];
        const id = match[2];
        return {
          isCustom: true,
          emojiName: name,
          emojiId: id,
          display: emojiString,
        };
      }

      // Build an array of emoji-role pairs.
      const pairs = [];
      for (let i = 1; i <= 11; i++) {
        const emoji = interaction.options.getString(`emoji${i}`);
        const role = interaction.options.getRole(`role${i}`);
        if (emoji && role) {
          const parsed = parseEmojiInput(emoji);
          pairs.push({ ...parsed, roleId: role.id });
        }
      }

      try {
        const botUser = interaction.client.user;
        const guild = interaction.guild;
        const embed = new EmbedBuilder()
          .setAuthor({ name: botUser.username, iconURL: botUser.displayAvatarURL() })
          .setThumbnail('https://media1.tenor.com/m/aS10CuNLYUgAAAAd/pokemon-pokemon-legends-z-a.gif')
          .setTitle(`🎉 ${guild.name}'s Reaction Roles 🎉`)
          .setDescription(content)
          .setColor(0x000000)
          .setImage('https://static.wikia.nocookie.net/pokemon/images/3/32/Dream_Ball_IX_Bag_Sprite.png/revision/latest?cb=20241008150413')
          .setFooter({ text: guild.name, iconURL: guild.iconURL() })
          .setTimestamp();

        // Add a field for each reaction role pair.
        pairs.forEach((pair, index) => {
          const role = guild.roles.cache.get(pair.roleId);
          embed.addFields({
            name: `Option ${index + 1}`,
            value: `React with ${pair.display} to get **${role ? role.name : 'the role'}**`,
          });
        });

        // Send the embed message.
        const msg = await channel.send({ embeds: [embed] });

        // React with each provided emoji.
        for (const pair of pairs) {
          if (pair.isCustom) {
            // For custom emoji, Discord expects the format "a:name:id" (if animated) or "name:id".
            const prefix = pair.display.startsWith('<a:') ? 'a:' : '';
            const reactionEmoji = `${prefix}${pair.emojiName}:${pair.emojiId}`;
            await msg.react(reactionEmoji);
          } else {
            await msg.react(pair.emojiName);
          }
        }

        // Save (or update) the mapping with the guild ID, message ID, and pairs.
        reactionRolesUtil.addMapping(guild.id, msg.id, pairs);

        await interaction.editReply({
          content: `Reaction role message created successfully!\n[Jump to message](${msg.url})`,
        });
      } catch (error) {
        console.error(error);
        await interaction.editReply({
          content: 'There was an error creating the reaction role message.',
        });
      }
    } else if (interaction.options.getSubcommand() === 'delete') {
      const messageId = interaction.options.getString('message_id');
      if (reactionRolesUtil.removeMapping(messageId)) {
        await interaction.editReply({ content: 'Mapping deleted successfully.' });
      } else {
        await interaction.editReply({ content: 'No mapping found for that message ID.' });
      }
    }
  },
};
