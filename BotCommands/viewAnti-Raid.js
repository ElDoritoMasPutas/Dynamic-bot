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
        .setName('viewanti-raid')
        .setDescription('View the current anti-raid settings for this server'),

    async execute(interaction) {
        const guildId = interaction.guild.id;

        if (!config[guildId]) {
            return interaction.reply({ content: 'No anti-raid settings have been configured for this server.', ephemeral: true });
        }

        const settings = config[guildId];
        const settingsMessage = `
        **🔒 Anti-Raid Settings for ${interaction.guild.name}**
        - **Max Joins Per Minute:** ${settings.joinLimit}
        - **Max Messages Per 5 Seconds:** ${settings.messageLimit}
        - **Max Mentions Per Message:** ${settings.mentionLimit}
        - **Min Account Age (Days):** ${settings.accountAgeDays}
        - **Auto-Ban:** ${settings.autoBan ? '✅ Enabled' : '❌ Disabled'}
        - **Auto-Mute:** ${settings.autoMute ? '✅ Enabled' : '❌ Disabled'}
        - **Webhook Protection:** ${settings.webhookProtection ? '✅ Enabled' : '❌ Disabled'}
        - **Bot Join Restriction:** ${settings.botJoinRestriction ? '✅ Enabled' : '❌ Disabled'}
        - **Max Roles Per User:** ${settings.maxRolesPerUser}
        - **Log Channel:** ${settings.logChannel || 'Not Set'}
        - **Whitelisted Users:** ${settings.whitelist.length > 0 ? settings.whitelist.join(', ') : 'None'}
        `;

        return interaction.reply({ content: settingsMessage, ephemeral: true });
    }
};
