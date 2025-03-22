const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Create a new ticket'),
    async execute(interaction) {
        // Check if the user has admin permissions
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({
                content: '❌ You do not have permission to use this command. Only admins can create a ticket system.',
                ephemeral: true, // Keeps the response private
            });
        }

        // Create the modal
        const modal = new ModalBuilder()
            .setCustomId('ticketModal')
            .setTitle('Create Ticket');

        // Create the input fields
        const ticketTypeInput = new TextInputBuilder()
            .setCustomId('ticketType')
            .setLabel('Ticket Type')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('e.g., Bug Report, Support Request')
            .setRequired(true);

        const channelNameInput = new TextInputBuilder()
            .setCustomId('channelName')
            .setLabel('Channel Name')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('e.g., support, bugs')
            .setRequired(true);

        // Add the input fields to rows
        const firstRow = new ActionRowBuilder().addComponents(ticketTypeInput);
        const secondRow = new ActionRowBuilder().addComponents(channelNameInput);
        modal.addComponents(firstRow, secondRow);

        // Show the modal
        await interaction.showModal(modal);
    },
};
