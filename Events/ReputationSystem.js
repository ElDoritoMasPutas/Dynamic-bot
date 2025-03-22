const { EmbedBuilder, Colors, Events } = require('discord.js');
const fs = require('fs');
const path = require('path');

const reputationFilePath = path.resolve(__dirname, '../Json/Reputation.json');

// Load or initialize reputation data
let reputationData = {};
if (fs.existsSync(reputationFilePath)) {
    reputationData = JSON.parse(fs.readFileSync(reputationFilePath, 'utf-8'));
}

// Watch for changes in reputation file
fs.watchFile(reputationFilePath, async (curr, prev) => {
    if (curr.mtime !== prev.mtime) {
        if (process.env.DEBUG === 'true') {
            console.log('🔄 Reputation file changed, updating data...');
        }
        reputationData = JSON.parse(fs.readFileSync(reputationFilePath, 'utf-8'));
    }
});

// Save reputation data
function saveReputationData() {
    fs.writeFileSync(reputationFilePath, JSON.stringify(reputationData, null, 4));
}

const levels = [
    { points: 5, name: 'Rep Jester', color: Colors.Blue },
    { points: 10, name: 'Rep Knight', color: Colors.Green },
    { points: 15, name: 'Rep King', color: Colors.Purple },
    { points: 20, name: 'Rep Lord', color: Colors.Orange },
    { points: 25, name: 'Rep God', color: Colors.Red }
];

async function checkAndAssignRoles(guild) {
    if (process.env.DEBUG === 'true') {
        console.log(`🔎 Checking roles for all users in ${guild.name}...`);
    }
    for (const userId in reputationData) {
        const userReputation = reputationData[userId];
        const member = await guild.members.fetch(userId).catch(err => {
            if (process.env.DEBUG === 'true') {
                console.error(`❌ Error fetching member ${userId}:`, err);
            }
            return null;
        });
        if (!member) continue;

        for (const level of levels) {
            let role = guild.roles.cache.find(r => r.name === level.name);
            
            if (!role) {
                if (process.env.DEBUG === 'true') {
                    console.log(`⚠️ Role ${level.name} not found, creating it...`);
                }
                try {
                    role = await guild.roles.create({
                        name: level.name,
                        color: level.color,
                        hoist: true,
                        reason: 'Reputation level role created'
                    });
                    if (process.env.DEBUG === 'true') {
                        console.log(`✅ Role ${level.name} created.`);
                    }
                } catch (error) {
                    if (process.env.DEBUG === 'true') {
                        console.error(`❌ Error creating role ${level.name}:`, error);
                    }
                    continue;
                }
            }

            if (userReputation >= level.points && !member.roles.cache.has(role.id)) {
                if (process.env.DEBUG === 'true') {
                    console.log(`🎉 Assigning role ${level.name} to ${member.user.username}...`);
                }
                await member.roles.add(role);
                if (process.env.DEBUG === 'true') {
                    console.log(`✅ Role ${level.name} successfully assigned to ${member.user.username}`);
                }

                // Send an embed message (DM)
                member.send({
                    embeds: [
                        new EmbedBuilder()
                            .setAuthor({ name: member.user.username, iconURL: member.user.displayAvatarURL({ dynamic: true }) })
                            .setTitle('🎉 Level Up! 🎉')
                            .setDescription(`You've reached **${level.name}** with **${userReputation}** reputation points! 🔥`)
                            .setColor(level.color)
                            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                            .setFooter({ text: guild.name, iconURL: guild.iconURL({ dynamic: true }) })
                            .setTimestamp()
                    ]
                }).catch(() => {
                    if (process.env.DEBUG === 'true') {
                        console.log(`⚠️ Could not DM ${member.user.username}.`);
                    }
                });
            }
        }
    }
}

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        if (process.env.DEBUG === 'true') {
            console.log(`Message received from: ${message.author.username} (${message.author.id})`);
            console.log('🔍 Fetching all guilds...');
        }
        if (message.author.bot) return;
        const client = message.client;
        for (const guild of client.guilds.cache.values()) {
            await checkAndAssignRoles(guild);
        }
    }
};
