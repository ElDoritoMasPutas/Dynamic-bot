const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Define the configuration file path (adjust if needed)
const configPath = path.join(__dirname, '../Json/commandimageconfig.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('Unmutes a user in the server.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to unmute')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the mute')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const guild = interaction.guild;
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const formattedReason = `\`\`${reason}\`\``;
        const botUser = interaction.client.user;

        try {
            let member;
            try {
                member = await guild.members.fetch(user.id);
            } catch (error) {
                console.log('User not found as a guild member.');
                return interaction.reply({ content: 'User is not in the server.', ephemeral: true });
            }

            // Check if the Muted role exists
            const muteRole = guild.roles.cache.find(role => role.name.toLowerCase() === 'muted');
            if (!muteRole) {
                return interaction.reply({ content: 'Muted role does not exist.', ephemeral: true });
            }

            // Check if the user has the muted role
            if (!member.roles.cache.has(muteRole.id)) {
                return interaction.reply({ content: 'User is not muted.', ephemeral: true });
            }

            // Remove the muted role
            await member.roles.remove(muteRole);

            // Dynamic image logic for the unmute command.
            let imageUrlUnmute = null;
            if (fs.existsSync(configPath)) {
                try {
                    const fileData = fs.readFileSync(configPath, 'utf8');
                    const commandImageConfig = JSON.parse(fileData);
                    if (commandImageConfig[guild.id] && commandImageConfig[guild.id].unmute !== undefined) {
                        const customUrl = commandImageConfig[guild.id].unmute;
                        imageUrlUnmute = customUrl.trim() === '' ? null : customUrl;
                    }
                } catch (error) {
                    console.error('Error reading command image config:', error);
                }
            }

            // Build the unmute log embed
            const unmuteEmbed = new EmbedBuilder()
                .setColor(0x000000)
                .setTitle('User Unmuted')
                .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                .setAuthor({ name: botUser.username, iconURL: botUser.displayAvatarURL() })
                .setDescription(`<@${user.id}> has been unmuted.`)
                .addFields(
                    { name: 'Unmuted By', value: `${interaction.user.tag}`, inline: true },
                    { name: 'User ID', value: user.id, inline: true },
                    { name: 'Reason', value: formattedReason, inline: true }
                )
                .setFooter({ text: guild.name, iconURL: botUser.displayAvatarURL() });

            // Set the image only if a valid custom URL was provided
            if (imageUrlUnmute) {
                unmuteEmbed.setImage(imageUrlUnmute);
            }

            // Find or create the log channel
            let logChannel = guild.channels.cache.find(ch => ch.name === 'mute-logs' && ch.isTextBased());
            if (!logChannel) {
                try {
                    logChannel = await guild.channels.create({
                        name: 'mute-logs',
                        type: 0, // Text channel
                        permissionOverwrites: [
                            {
                                id: guild.id,
                                deny: [PermissionFlagsBits.ViewChannel],
                            }
                        ]
                    });
                } catch (error) {
                    console.log('Failed to create log channel:', error);
                }
            }

            if (logChannel) {
                await logChannel.send({ embeds: [unmuteEmbed] });
            } else {
                console.log('Log channel not found or could not be created. Sending log to the command channel.');
                await interaction.channel.send({ embeds: [unmuteEmbed] });
            }

            // Ephemeral confirmation
            await interaction.reply({ content: `**User ${user.tag} has been unmuted successfully.**`, ephemeral: true });
        } catch (error) {
            console.error(`Error unmuting user: ${error}`);
            await interaction.reply({ content: 'There was an error trying to unmute this user.', ephemeral: true });
        }
    }
};
