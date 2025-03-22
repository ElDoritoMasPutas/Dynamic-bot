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

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        //console.log(`GuildMemberAdd triggered for ${member.guild.name} (${member.guild.id})`);
        const guildId = member.guild.id;

        if (!config[guildId]) {
            console.log(`No anti-raid config found for ${member.guild.name}.`);
            return;
        }

        const settings = config[guildId];

        // 🛑 Ignore whitelisted members
        if (settings.whitelist && settings.whitelist.includes(member.id)) return;

        // 🤖 Bot Account Restriction
        if (member.user.bot && settings.botJoinRestriction) {
            console.log(`Kicking bot ${member.user.tag} due to bot restrictions.`);
            await member.kick('Anti-Raid: Bot accounts are restricted.');
            await logAction(member.guild, `Kicked bot **${member.user.tag}** as bot joins are restricted.`);
            return;
        }

        // 📅 Account Age Restriction
        const accountAge = (Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24);
        if (accountAge < settings.accountAgeDays) {
            console.log(`Kicking ${member.user.tag} due to new account age.`);
            
            // 📨 Try sending a DM before kicking
            try {
                await member.send(`Your account is too new to join **${member.guild.name}**. If this is a mistake, please contact an admin.`).catch(() => {});
            } catch (error) {
                console.warn(`Could not send DM to ${member.user.tag}.`);
            }

            await member.kick(`Anti-Raid: Account younger than ${settings.accountAgeDays} days.`);
            await logAction(member.guild, `Kicked **${member.user.tag}** (Account Age: **${Math.floor(accountAge)} days**) for failing the minimum account age restriction.`);
            return;
        }
    }
};

// 📌 Logs actions into the correct channel
async function logAction(guild, logMessage) {
    //console.log(`Logging action in ${guild.name}: ${logMessage}`);

    if (!config[guild.id]) return;
    const logChannelName = config[guild.id].logChannel || 'anti-raid-logs';

    // 🔍 Find the log channel
    let logChannel = guild.channels.cache.find(ch => ch.name === logChannelName);

    // 📌 If the log channel doesn't exist, create it
    if (!logChannel) {
        try {
            logChannel = await guild.channels.create({
                name: logChannelName,
                type: 0, // Text channel
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone.id,
                        deny: [PermissionsBitField.Flags.SendMessages]
                    }
                ]
            });
            console.log(`Created log channel: ${logChannel.name}`);
        } catch (error) {
            console.error('Failed to create log channel:', error);
            return; // Prevents further execution if channel creation fails
        }
    }

    // ✅ Send the log message
    if (logChannel) logChannel.send(`⚠️ **Anti-Raid Alert:** ${logMessage}`);
}