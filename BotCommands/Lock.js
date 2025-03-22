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
        .setName('lock')
        .setDescription('Locks the channel by preventing all non-admins from sending messages.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        const channel = interaction.channel;
        const guild = interaction.guild;

        let lockedPermissions = readLockedPermissions();

        if (lockedPermissions[channel.id]) {
            return interaction.reply({ content: '❌ This channel is already locked!', ephemeral: true });
        }

        const savedPermissions = []; // Store previous permissions
        let lockedRoles = 0;
        let lockedUsers = 0;

        try {
            // Lock roles
            guild.roles.cache.forEach(async (role) => {
                if (role.permissions.has(PermissionFlagsBits.Administrator)) return;

                const currentPerms = channel.permissionsFor(role);
                if (currentPerms && currentPerms.has(PermissionFlagsBits.SendMessages)) {
                    savedPermissions.push({ id: role.id, type: 'role', allow: true });

                    await channel.permissionOverwrites.edit(role, { SendMessages: false });
                    lockedRoles++;
                }
            });

            // Lock users
            const usersToLock = channel.permissionOverwrites.cache.filter(perm =>
                perm.allow.has(PermissionFlagsBits.SendMessages) && perm.type === 1
            );

            for (const [userId] of usersToLock) {
                const user = await guild.members.fetch(userId).catch(() => null);
                if (user) {
                    savedPermissions.push({ id: userId, type: 'user', allow: true });

                    await channel.permissionOverwrites.edit(user, { SendMessages: false });
                    lockedUsers++;
                }
            }

            // Save to JSON
            lockedPermissions[channel.id] = savedPermissions;
            writeLockedPermissions(lockedPermissions);

            await interaction.reply({ 
                content: `🔒 This channel has been locked. Disabled Send Messages for **${lockedRoles} roles** and **${lockedUsers} users**.`,
                ephemeral: true 
            });
        } catch (error) {
            console.error(error);
            await interaction.reply({ 
                content: `❌ Failed to lock the channel. Make sure I have the correct permissions!`, 
                ephemeral: true 
            });
        }
    }
};