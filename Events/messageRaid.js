const { Events, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', 'Json', 'antiRaid.json');
let config = {};

try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (error) {
    console.error('Failed to load antiRaid config:', error);
}

// Store recent messages to track spam
const messageTracker = new Map();

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        // For DM messages, log them and let them go through without anti-raid processing.
        if (!message.guild) {
            return;
        }
        if (message.author.bot) return;
        
        const guildId = message.guild.id;

        if (!config[guildId]) return;
        const settings = config[guildId];

        // Ignore bots and whitelisted users
        if (message.author.bot || (settings.whitelist && settings.whitelist.includes(message.author.id))) return;

        // 🔹 Link Spam Detection
        if ((message.content.match(/https?:\/\//g) || []).length > settings.linkLimit) {
            console.log(`🚫 Deleting message from ${message.author.tag} for excessive links.`);
            await message.delete().catch(err => console.error('❌ Failed to delete message:', err));
            return;
        }

        // 🔹 Basic Spam Detection (Messages per second)
        if (!messageTracker.has(message.author.id)) {
            messageTracker.set(message.author.id, []);
        }

        const now = Date.now();
        const timestamps = messageTracker.get(message.author.id);
        timestamps.push(now);

        // Remove messages older than 5 seconds from tracking
        while (timestamps.length > 0 && timestamps[0] < now - 5000) {
            timestamps.shift();
        }

        if (timestamps.length > settings.messageLimit) {
            console.log(`⛔ Muting ${message.author.tag} for spamming.`);
            const member = await fetchMember(message);

            if (!member) {
                console.warn(`⚠️ Could not fetch member for ${message.author.tag}. Skipping mute.`);
                return;
            }

            const muteRole = await getMuteRole(message.guild);

            if (muteRole) {
                await member.roles.add(muteRole).catch(err => console.error('❌ Failed to add mute role:', err));

                // 🔹 Log the action
                await logAction(message.guild, `<@${message.author.id}> has been muted for spamming.`);
            } else {
                console.warn("⚠️ Mute role not found! Consider adding a 'Muted' role for better moderation.");
            }
        }
    }
};

// 🔹 Fetch Member Safely
async function fetchMember(message) {
    try {
        return await message.guild.members.fetch(message.author.id);
    } catch (error) {
        console.error(`❌ Error fetching member ${message.author.tag}:`, error);
        return null;
    }
}

// 🔹 Ensure the Mute role exists
async function getMuteRole(guild) {
    let muteRole = guild.roles.cache.find(role => role.name.toLowerCase() === 'muted');

    if (!muteRole) {
        console.log('🔹 No "Muted" role found, creating one...');
        try {
            muteRole = await guild.roles.create({
                name: 'Muted',
                permissions: [],
                reason: 'AutoMod Mute Role'
            });

            guild.channels.cache.forEach(async (channel) => {
                await channel.permissionOverwrites.create(muteRole, { SendMessages: false }).catch(() => {});
            });

        } catch (error) {
            console.error('❌ Error creating "Muted" role:', error);
        }
    }

    return muteRole;
}

// 🔹 Log Actions to a Server Log Channel
async function logAction(guild, logMessage) {
    //console.log(`📜 Logging action in ${guild.name}: ${logMessage}`);

    const guildId = guild.id;
    if (!config[guildId]) return;
    const logChannelName = config[guildId].logChannel || 'anti-raid-logs';

    let logChannel = guild.channels.cache.find(ch => ch.name === logChannelName);

    // 🔹 If the log channel doesn’t exist, create it
    if (!logChannel) {
        try {
            logChannel = await guild.channels.create({
                name: logChannelName,
                type: 0, // 0 represents a text channel
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone.id,
                        deny: [PermissionsBitField.Flags.SendMessages]
                    }
                ]
            });
        } catch (error) {
            console.error('❌ Failed to create log channel:', error);
            return; // Prevents further execution if channel creation fails
        }
    }

    if (logChannel) logChannel.send(`⚠️ **Anti-Raid Alert:** ${logMessage}`);
}
