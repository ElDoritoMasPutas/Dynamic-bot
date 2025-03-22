const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', 'Json', 'antiRaid.json');
let config = {};

try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (error) {
    console.error('Failed to load antiRaid config:', error);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('removeanti-raid')
        .setDescription('Remove all anti-raid settings for this server'),

    async execute(interaction) {
        const guildId = interaction.guild.id;

        if (!config[guildId]) {
            return interaction.reply({ content: 'No anti-raid settings exist for this server.', ephemeral: true });
        }

        delete config[guildId];

        fs.writeFileSync(configPath, JSON.stringify(config, null, 4));

        return interaction.reply({ content: 'Anti-Raid settings have been removed for this server.', ephemeral: true });
    }
};
