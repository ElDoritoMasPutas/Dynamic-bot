const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Define the configuration file path (adjust if needed)
const configPath = path.join(__dirname, '../Json/commandimageconfig.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Mutes a user in the server.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to mute')
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
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const formattedReason = `\`\`${reason}\`\``;
        const guild = interaction.guild;
        const botUser = interaction.client.user;
        let dmed = 'False';

        try {
            // Fetch the member from the guild
            let member;
            try {
                member = await guild.members.fetch(user.id);
            } catch (error) {
                console.log('User not found as a guild member.');
                return interaction.reply({ content: 'User is not in the server.', ephemeral: true });
            }

            // Check if the Muted role exists; create it if necessary.
            let muteRole = guild.roles.cache.find(role => role.name.toLowerCase() === 'offender');
            if (!muteRole) {
                try {
                    muteRole = await guild.roles.create({
                        name: 'Offender',
                        color: 0xFF0000, // Red color
                        permissions: []
                    });

                    // Apply permission overwrites for text and voice channels.
                    guild.channels.cache.forEach(async (channel) => {
                        if (channel.isTextBased()) {
                            await channel.permissionOverwrites.create(muteRole, {
                                SendMessages: false,
                                AddReactions: false
                            });
                        } else if (channel.isVoiceBased()) {
                            await channel.permissionOverwrites.create(muteRole, {
                                Speak: false,
                                Stream: false
                            });
                        }
                    });

                    console.log('Muted role created successfully.');
                } catch (error) {
                    console.error('Failed to create Muted role:', error);
                    return interaction.reply({ content: 'Could not create or find a Muted role.', ephemeral: true });
                }
            } else {
                console.log('Muted role already exists, skipping creation.');
            }

            // Attempt to DM the user
            try {
                await user.send(`You have been muted in **${guild.name}** for: ${formattedReason}`);
                dmed = 'True';
            } catch (error) {
                console.log(`Could not DM the user: ${error}`);
            }

            // Assign the muted role to the member
            await member.roles.add(muteRole, reason);

            // Dynamic image logic: default to null (no image) if not configured.
            let imageUrlMute = null;
            if (fs.existsSync(configPath)) {
                try {
                    const fileData = fs.readFileSync(configPath, 'utf8');
                    const commandImageConfig = JSON.parse(fileData);
                    if (commandImageConfig[guild.id] && commandImageConfig[guild.id].mute !== undefined) {
                        const customUrl = commandImageConfig[guild.id].mute;
                        imageUrlMute = customUrl.trim() === '' ? null : customUrl;
                    }
                } catch (error) {
                    console.error('Error reading command image config:', error);
                }
            }

            // Build the mute log embed
            const muteEmbed = new EmbedBuilder()
                .setColor(0x000000)
                .setTitle('User Muted')
                .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                .setAuthor({ name: botUser.username, iconURL: botUser.displayAvatarURL() })
                .setDescription(`<@${user.id}> has been muted.`)
                .addFields(
                    { name: 'Muted By', value: `${interaction.user.tag}`, inline: true },
                    { name: 'Reason', value: formattedReason, inline: true },
                    { name: 'User DMed', value: dmed, inline: true },
                    { name: 'User ID', value: user.id, inline: true }
                )
                .setFooter({ text: guild.name, iconURL: botUser.displayAvatarURL() });
            
            // Set the image in the embed only if a custom URL is present.
            if (imageUrlMute) {
                muteEmbed.setImage(imageUrlMute);
            }

            // Find or create the "mute-logs" channel.
            let logChannel = guild.channels.cache.find(ch => ch.name === 'mute-logs' && ch.isTextBased());
            if (!logChannel) {
                try {
                    logChannel = await guild.channels.create({
                        name: 'mute-logs',
                        type: 0, // Type 0 represents a text channel.
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
                await logChannel.send({ embeds: [muteEmbed] });
            } else {
                console.log('Log channel not found or could not be created. Sending log to the command channel.');
                await interaction.channel.send({ embeds: [muteEmbed] });
            }

            // Ephemeral confirmation to the command invoker
            await interaction.reply({ content: `**User ${user.tag} has been muted successfully.**`, ephemeral: true });
        } catch (error) {
            console.error(`Error muting user: ${error}`);
            await interaction.reply({ content: 'There was an error trying to mute this user.', ephemeral: true });
        }
    }
};
