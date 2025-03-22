const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('banlist')
        .setDescription('Shows a list of all banned members'),
    
    async execute(interaction) {
        const guild = interaction.guild;

        try {
            // Fetch all banned users
            const banList = await guild.bans.fetch();

            if (banList.size === 0) {
                return interaction.reply({ content: 'There are no banned users.', ephemeral: true });
            }

            // Divide banned users into pages of 10 per page
            const bannedUsers = banList.map(ban => `**${ban.user.username}**`);
            const itemsPerPage = 10;
            let currentPage = 0;
            const totalPages = Math.ceil(bannedUsers.length / itemsPerPage);

            // Function to generate an embed for a specific page
            const generateEmbed = (page) => {
                const start = page * itemsPerPage;
                const end = start + itemsPerPage;
                const pageUsers = bannedUsers.slice(start, end).join('\n');
                const commandUser = interaction.user;

                return new EmbedBuilder()
                    .setTitle('Ban List')
                    .setDescription(`Members that have been banned (Page ${page + 1}/${totalPages}):\n\n${pageUsers}`)
                    .setThumbnail(commandUser.displayAvatarURL({ dynamic: true }))
                    .setImage('https://cdn-longterm.mee6.xyz/plugins/embeds/images/738050656933511298/4c80629edf805ce20ec90b238f8f94e9a078fcf9c2533f8996154a0977424c90.gif')
                    .setFooter({
                        text: 'Here are the members requested',
                        iconURL: interaction.client.user.displayAvatarURL({ dynamic: true })
                    })
                    .setColor('#FF0000');
            };

            // Create buttons for navigation
            const createActionRow = (page) => new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('prev')
                        .setLabel('Previous')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page === 0),
                    new ButtonBuilder()
                        .setCustomId('next')
                        .setLabel('Next')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page === totalPages - 1)
                );

            // Send the first page
            const embedMessage = await interaction.reply({
                embeds: [generateEmbed(currentPage)],
                components: [createActionRow(currentPage)],
                fetchReply: true
            });

            // Listen for button interactions
            const filter = (btnInteraction) => 
                btnInteraction.isButton() && btnInteraction.user.id === interaction.user.id;

            const collector = embedMessage.createMessageComponentCollector({ filter, time: 60000 });

            collector.on('collect', async (btnInteraction) => {
                // Acknowledge the interaction immediately to avoid "interaction failed" error
                await btnInteraction.deferUpdate();

                // Update the current page based on button pressed
                if (btnInteraction.customId === 'prev') {
                    currentPage = Math.max(currentPage - 1, 0);
                } else if (btnInteraction.customId === 'next') {
                    currentPage = Math.min(currentPage + 1, totalPages - 1);
                }

                // Edit the original message with the new embed and updated buttons
                await interaction.editReply({
                    embeds: [generateEmbed(currentPage)],
                    components: [createActionRow(currentPage)]
                });
            });

            collector.on('end', async () => {
                // Disable buttons when collector ends
                try {
                    await interaction.editReply({
                        components: [createActionRow(currentPage).setComponents(
                            new ButtonBuilder().setCustomId('prev').setLabel('Previous').setStyle(ButtonStyle.Primary).setDisabled(true),
                            new ButtonBuilder().setCustomId('next').setLabel('Next').setStyle(ButtonStyle.Primary).setDisabled(true)
                        )]
                    });
                } catch (error) {
                    console.error('Error disabling buttons after collector end:', error);
                }
            });
        } catch (error) {
            console.error('Error fetching ban list:', error);
            await interaction.reply({ content: 'There was an error retrieving the ban list.', ephemeral: true });
        }
    },
};