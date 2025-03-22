const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, "..", "Json", "automod.json");
const warningsPath = path.join(__dirname, "..", "Json", "warnedUsers.json");

if (!fs.existsSync(configPath)) fs.writeFileSync(configPath, JSON.stringify({}, null, 2));
if (!fs.existsSync(warningsPath)) fs.writeFileSync(warningsPath, JSON.stringify({}, null, 2));

const config = JSON.parse(fs.readFileSync(configPath));
const warnings = JSON.parse(fs.readFileSync(warningsPath));

const defaultSettings = {
    badWords: [],
    blacklistedLinks: [],
    spamLimit: 5,
    blockLinks: true,
    maxMentions: 4,
    muteDuration: 10,
    maxWarnings: 3,
    warningImage: ""
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resetautomod')
        .setDescription('⚠️ Reset all AutoMod settings and warnings for this server.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: '🚨 You need admin permissions to reset AutoMod settings!', ephemeral: true });
        }

        const guildId = interaction.guild.id;

        // Reset AutoMod settings for the guild
        config[guildId] = { ...defaultSettings };
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

        // Reset warnings for the guild
        if (warnings[guildId]) {
            delete warnings[guildId];
            fs.writeFileSync(warningsPath, JSON.stringify(warnings, null, 2));
        }

        const embed = new EmbedBuilder()
            .setColor(0xff0000)
            .setTitle("🔄 AutoMod Reset")
            .setDescription(`All AutoMod settings and warnings for **${interaction.guild.name}** have been reset.`)
            .setFooter({ text: "Use /setautomod to configure AutoMod again." });

        return interaction.reply({ embeds: [embed], ephemeral: true });
    }
};
