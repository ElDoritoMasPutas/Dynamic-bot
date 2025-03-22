const { Events } = require('discord.js');
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
    name: Events.MessageCreate,
    async execute(message) {
        if (!message.guild || message.author.bot) return;
        
        const guildId = message.guild.id;
        if (!config[guildId]) return;
        const settings = config[guildId];

        const mentionLimit = settings.mentionLimit || 5; // Default to 5 if not set
        const mentions = message.mentions.users.size + message.mentions.roles.size + message.mentions.everyone ? 1 : 0;

        if (mentions > mentionLimit) {
            console.log(`Deleting message from ${message.author.tag} for excessive mentions.`);
            await message.delete();
            await logAction(message.guild, `Deleted message from **${message.author.tag}** for excessive mentions (**${mentions}** mentions, limit: **${mentionLimit}**)`);
        }
    }
};

async function logAction(guild, logMessage) {
    //console.log(`Logging action in ${guild.name}: ${logMessage}`);

    if (!config[guild.id]) return;
    const logChannelName = config[guild.id].logChannel || 'anti-raid-logs';

    let logChannel = guild.channels.cache.find(ch => ch.name === logChannelName);
    if (!logChannel) {
        try {
            logChannel = await guild.channels.create({
                name: logChannelName,
                type: 0,
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone.id,
                        deny: ['SEND_MESSAGES']
                    }
                ]
            });
        } catch (error) {
            console.error('Failed to create log channel:', error);
            return;
        }
    }

    if (logChannel) logChannel.send(`⚠️ **Anti-Raid Alert:** ${logMessage}`);
}
