const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../Json/lockedPermissions.json');

// Function to read JSON
function readLockedPermissions() {
    if (!fs.existsSync(filePath)) return {};
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data || '{}');
}

// Function to write JSON
function writeLockedPermissions(data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf8');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('Unlocks the channel by restoring previous message permissions.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        const channel = interaction.channel;

        let lockedPermissions = readLockedPermissions();

        if (!lockedPermissions[channel.id]) {
            return interaction.reply({ content: '❌ This channel is not locked!', ephemeral: true });
        }

        const savedPermissions = lockedPermissions[channel.id];
        let restoredRoles = 0;
        let restoredUsers = 0;

        try {
            for (const perm of savedPermissions) {
                if (perm.type === 'role') {
                    const role = channel.guild.roles.cache.get(perm.id);
                    if (role) {
                        await channel.permissionOverwrites.edit(role, { SendMessages: perm.allow });
                        restoredRoles++;
                    }
                } else if (perm.type === 'user') {
                    const user = await channel.guild.members.fetch(perm.id).catch(() => null);
                    if (user) {
                        await channel.permissionOverwrites.edit(user, { SendMessages: perm.allow });
                        restoredUsers++;
                    }
                }
            }

            // Remove from JSON
            delete lockedPermissions[channel.id];
            writeLockedPermissions(lockedPermissions);

            await interaction.reply({ 
                content: `🔓 This channel has been unlocked. Restored Send Messages for **${restoredRoles} roles** and **${restoredUsers} users**.`,
                ephemeral: true 
            });
        } catch (error) {
            console.error(error);
            await interaction.reply({ 
                content: `❌ Failed to unlock the channel. Make sure I have the correct permissions!`, 
                ephemeral: true 
            });
        }
    }
};