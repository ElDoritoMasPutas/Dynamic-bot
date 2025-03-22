const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('embed')
        .setDescription('Send buttons to create a custom embed step-by-step')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        // Check if the user has the Administrator permission
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return await interaction.reply({
                content: '❌ You do not have permission to use this command. Only administrators can access it.',
                ephemeral: true, // Makes the message private to the user
            });
        }

        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('set_title')
                .setLabel('Set Title')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('set_description')
                .setLabel('Set Description')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('set_author')
                .setLabel('Set Author')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('set_author_image') // Author Image button
                .setLabel('Set Author Image')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('set_thumbnail')
                .setLabel('Set Thumbnail')
                .setStyle(ButtonStyle.Primary)
        );

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('set_footer')
                .setLabel('Set Footer Text')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('set_footer_icon')
                .setLabel('Set Footer Icon')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('set_footer_image')
                .setLabel('Set Footer Image')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('set_timestamp')
                .setLabel('Toggle Timestamp')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('set_add_field') // Add Field button
                .setLabel('Add Field')
                .setStyle(ButtonStyle.Secondary)
        );

        const row3 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('set_send_embed')
                .setLabel('Send Embed')
                .setStyle(ButtonStyle.Success)
        );

        await interaction.reply({
            content: 'Use the buttons below to customize your embed:',
            components: [row1, row2, row3],
        });
    },
};
