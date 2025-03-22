const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Bot avatar URL
const botAvatarURL = 'https://cdn.discordapp.com/avatars/1341505316675780702/ddc858659c9d9d51d8cde9f8cdb88657.webp?size=1024&format=webp';

// Path to store reputation data
const reputationFilePath = path.resolve(__dirname, '../Json/Reputation.json');

// Load or initialize reputation data
let reputationData = {};
if (fs.existsSync(reputationFilePath)) {
    reputationData = JSON.parse(fs.readFileSync(reputationFilePath, 'utf-8'));
}

// Save reputation data
function saveReputationData() {
    fs.writeFileSync(reputationFilePath, JSON.stringify(reputationData, null, 4));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rep')
        .setDescription('Manage reputation points')
        .addSubcommand(subcommand =>
            subcommand
                .setName('give')
                .setDescription('Give reputation points to a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to give reputation points to')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('points')
                        .setDescription('The number of reputation points to give')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove reputation points from a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to remove reputation points from')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('points')
                        .setDescription('The number of reputation points to remove')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('check')
                .setDescription('Check your reputation points')),

    async execute(interaction) {
        const subCommand = interaction.options.getSubcommand();
        const serverIconURL = interaction.guild.iconURL({ dynamic: true, size: 1024 });

        switch (subCommand) {
            case 'give': {
                if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                    return interaction.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle('Permission Denied')
                                .setDescription('You do not have permission to give reputation points.')
                                .setThumbnail(serverIconURL)
                                .setFooter({ text: interaction.guild.name, iconURL: botAvatarURL })
                                .setTimestamp()
                        ],
                        ephemeral: true
                    });
                }

                const targetUser = interaction.options.getUser('user');
                const points = interaction.options.getInteger('points');
                const userId = targetUser.id;
                
                if (!reputationData[userId]) {
                    reputationData[userId] = 0;
                }
                reputationData[userId] += points;
                saveReputationData();

                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setAuthor({ name: 'Reputation Given', iconURL: targetUser.displayAvatarURL({ dynamic: true }) })
                            .setDescription(`${targetUser} has been given **${points} reputation points** by ${interaction.user}.`)
                            .setThumbnail(serverIconURL)
                            .setFooter({ text: interaction.guild.name, iconURL: botAvatarURL })
                            .setTimestamp()
                    ]
                });
            }
            
            case 'remove': {
                if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                    return interaction.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle('Permission Denied')
                                .setDescription('You do not have permission to remove reputation points.')
                                .setThumbnail(serverIconURL)
                                .setFooter({ text: interaction.guild.name, iconURL: botAvatarURL })
                                .setTimestamp()
                        ],
                        ephemeral: true
                    });
                }

                const targetUser = interaction.options.getUser('user');
                const points = interaction.options.getInteger('points');
                const userId = targetUser.id;
                
                if (!reputationData[userId]) {
                    reputationData[userId] = 0;
                }
                reputationData[userId] = Math.max(0, reputationData[userId] - points);
                saveReputationData();

                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setAuthor({ name: 'Reputation Removed', iconURL: targetUser.displayAvatarURL({ dynamic: true }) })
                            .setDescription(`${targetUser} has lost **${points} reputation points**.`)
                            .setThumbnail(serverIconURL)
                            .setFooter({ text: interaction.guild.name, iconURL: botAvatarURL })
                            .setTimestamp()
                    ]
                });
            }

            case 'check': {
                const userId = interaction.user.id;
                const points = reputationData[userId] || 0;

                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setAuthor({ name: `${interaction.user.username}'s Reputation`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
                            .setDescription(`You have **${points} reputation points**.`)
                            .setThumbnail(serverIconURL)
                            .setFooter({ text: interaction.guild.name, iconURL: botAvatarURL })
                            .setTimestamp()
                    ]
                });
            }
        }
    }
};
