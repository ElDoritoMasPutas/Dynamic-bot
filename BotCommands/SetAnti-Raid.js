const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', 'Json', 'antiRaid.json');
let config;

try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (error) {
    console.error('Failed to load antiRaid config:', error);
    config = {};
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setanti-raid')
        .setDescription('Modify anti-raid settings for this server')
        .addBooleanOption(option =>
            option.setName('enabled')
                .setDescription('Enable or disable anti-raid functionality')
        )
        .addIntegerOption(option => 
            option.setName('joinlimit')
                .setDescription('Set max joins per minute')
                .setMinValue(1)
        )
        .addIntegerOption(option => 
            option.setName('messagelimit')
                .setDescription('Set max messages per 5 seconds')
                .setMinValue(1)
        )
        .addIntegerOption(option => 
            option.setName('mentionlimit')
                .setDescription('Set max mentions per message')
                .setMinValue(1)
        )
        .addIntegerOption(option => 
            option.setName('accountagedays')
                .setDescription('Set min account age in days')
                .setMinValue(1)
        )
        .addBooleanOption(option => 
            option.setName('autoban')
                .setDescription('Enable or disable auto-ban')
        )
        .addBooleanOption(option => 
            option.setName('automute')
                .setDescription('Enable or disable auto-mute')
        )
        .addBooleanOption(option => 
            option.setName('webhookprotection')
                .setDescription('Enable or disable webhook protection')
        )
        .addBooleanOption(option => 
            option.setName('botjoinrestriction')
                .setDescription('Enable or disable bot join restriction')
        )
        .addStringOption(option => 
            option.setName('logchannel')
                .setDescription('Set log channel name')
        )
        .addStringOption(option =>
            option.setName('whitelist')
                .setDescription('Comma-separated user IDs to whitelist')
        ),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        
        if (!config[guildId]) {
            config[guildId] = {
                antiRaidEnabled: false, // default to disabled
                joinLimit: 5,
                messageLimit: 10,
                mentionLimit: 5,
                accountAgeDays: 7,
                autoBan: true,
                autoMute: true,
                logChannel: 'anti-raid-logs',
                webhookProtection: true,
                botJoinRestriction: true,
                whitelist: []
            };
        }

        const settings = config[guildId];

        // Update the anti-raid enabled flag if provided
        const enabledOption = interaction.options.getBoolean('enabled');
        if (enabledOption !== null) {
            settings.antiRaidEnabled = enabledOption;
        }

        settings.joinLimit = interaction.options.getInteger('joinlimit') ?? settings.joinLimit;
        settings.messageLimit = interaction.options.getInteger('messagelimit') ?? settings.messageLimit;
        settings.mentionLimit = interaction.options.getInteger('mentionlimit') ?? settings.mentionLimit;
        settings.accountAgeDays = interaction.options.getInteger('accountagedays') ?? settings.accountAgeDays;
        settings.autoBan = interaction.options.getBoolean('autoban') ?? settings.autoBan;
        settings.autoMute = interaction.options.getBoolean('automute') ?? settings.autoMute;
        settings.webhookProtection = interaction.options.getBoolean('webhookprotection') ?? settings.webhookProtection;
        settings.botJoinRestriction = interaction.options.getBoolean('botjoinrestriction') ?? settings.botJoinRestriction;
        settings.logChannel = interaction.options.getString('logchannel') ?? settings.logChannel;

        const whitelistInput = interaction.options.getString('whitelist');
        if (whitelistInput) {
            settings.whitelist = whitelistInput.split(',').map(id => id.trim());
        }

        fs.writeFileSync(configPath, JSON.stringify(config, null, 4));
        
        return interaction.reply({ content: 'Anti-Raid settings updated successfully for this server!', ephemeral: true });
    }
};
