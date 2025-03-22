const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Path to your image configuration file
const configPath = path.join(__dirname, '../Json/commandimageconfig.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Bans a user from the server.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to ban')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the ban')
                .setRequired(true)
        )
        .addBooleanOption(option =>
            option.setName('delete_messages')
                .setDescription('Delete messages from this user')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const deleteMessages = interaction.options.getBoolean('delete_messages') || false;
        const formattedReason = `\`\`${reason}\`\``; // Formats reason in Discord code block style
        const guild = interaction.guild;
        const botUser = interaction.client.user;
        let dmed = 'False';

        // Create a dropdown for message deletion options
        const deleteOptionsRow = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('delete_options')
                    .setPlaceholder('Message Deletion Options')
                    .addOptions([
                        { label: "Don't Delete Any", value: 'dont_delete', default: true },
                        { label: 'Previous Hour', value: 'previous_hour' },
                        { label: 'Previous 6 Hours', value: 'previous_6_hours' },
                        { label: 'Previous 12 Hours', value: 'previous_12_hours' },
                        { label: 'Previous 24 Hours', value: 'previous_24_hours' },
                        { label: 'Previous 3 Days', value: 'previous_3_days' },
                        { label: 'Previous 7 Days', value: 'previous_7_days' },
                    ])
            );

        // Dynamic image logic: default to null so no image shows if not configured.
        let imageUrlBan = null;
        if (fs.existsSync(configPath)) {
            try {
                const fileData = fs.readFileSync(configPath, 'utf8');
                const commandImageConfig = JSON.parse(fileData);
                if (commandImageConfig[guild.id] && commandImageConfig[guild.id].ban !== undefined) {
                    const customUrl = commandImageConfig[guild.id].ban;
                    imageUrlBan = customUrl.trim() === '' ? null : customUrl;
                }
            } catch (error) {
                console.error('Error reading command image config:', error);
            }
        }

        try {
            // First show the dropdown for message deletion options
            await interaction.reply({
                content: `You're about to ban ${user.tag}. Would you like to delete any messages from this user?`,
                components: [deleteOptionsRow],
                ephemeral: true
            });

            // Set up a collector for the dropdown interaction
            const filter = i => i.customId === 'delete_options' && i.user.id === interaction.user.id;
            const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000, max: 1 });

            collector.on('collect', async i => {
                const deleteOption = i.values[0];
                let deleteSeconds = 0;

                // Convert the selection to the appropriate number of seconds for Discord's API
                switch (deleteOption) {
                    case 'previous_hour':
                        deleteSeconds = 60 * 60; // 1 hour in seconds
                        break;
                    case 'previous_6_hours':
                        deleteSeconds = 6 * 60 * 60; // 6 hours in seconds
                        break;
                    case 'previous_12_hours':
                        deleteSeconds = 12 * 60 * 60; // 12 hours in seconds
                        break;
                    case 'previous_24_hours':
                        deleteSeconds = 24 * 60 * 60; // 24 hours in seconds
                        break;
                    case 'previous_3_days':
                        deleteSeconds = 3 * 24 * 60 * 60; // 3 days in seconds
                        break;
                    case 'previous_7_days':
                        deleteSeconds = 7 * 24 * 60 * 60; // 7 days in seconds
                        break;
                    default:
                        deleteSeconds = 0; // Don't delete any
                }

                // Attempt to fetch the member; if not found, proceed with banning via ID.
                let member;
                try {
                    member = await guild.members.fetch(user.id);
                } catch (error) {
                    console.log(`User not found as a guild member, proceeding with ID ban.`);
                }
                
                // Attempt to DM the user.
                try {
                    await user.send(`You have been banned from **${guild.name}** for: ${formattedReason}`);
                    dmed = 'True';
                } catch (error) {
                    console.log(`Could not DM the user: ${error}`);
                }
                
                // Ban the user with the selected delete message option
                await guild.bans.create(user.id, { 
                    deleteMessageSeconds: deleteSeconds,
                    reason: reason 
                });

                // Build the ban log embed using the (possibly dynamic) image.
                const banEmbed = new EmbedBuilder()
                    .setColor(0x000000)
                    .setTitle('User Banned')
                    .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                    .setAuthor({ name: botUser.username, iconURL: botUser.displayAvatarURL() })
                    .setDescription(`<@${user.id}> has been banned.`)
                    .addFields(
                        { name: 'Banned By', value: `${interaction.user.tag}`, inline: true },
                        { name: 'Reason', value: formattedReason, inline: true },
                        { name: 'User DMed', value: dmed, inline: true },
                        { name: 'User ID', value: user.id, inline: true },
                        { name: 'Messages Deleted', value: deleteOption.replace(/_/g, ' '), inline: true }
                    )
                    .setFooter({ text: guild.name, iconURL: botUser.displayAvatarURL() });

                // Set the image only if one is provided.
                if (imageUrlBan) {
                    banEmbed.setImage(imageUrlBan);
                }

                // Find or create the log channel.
                let logChannel = guild.channels.cache.find(ch => ch.name === 'ban-logs' && ch.isTextBased());
                if (!logChannel) {
                    try {
                        logChannel = await guild.channels.create({
                            name: 'ban-logs',
                            type: 0, // 0 represents a text channel
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
                    await logChannel.send({ embeds: [banEmbed] });
                } else {
                    console.log('Log channel not found or could not be created. Sending log to the command channel.');
                    await interaction.channel.send({ embeds: [banEmbed] });
                }

                // Update the ephemeral response
                await i.update({ 
                    content: `**User ${user.tag} has been banned successfully.** Messages deleted: ${deleteOption.replace(/_/g, ' ')}`, 
                    components: [] 
                });
            });

            collector.on('end', collected => {
                if (collected.size === 0) {
                    interaction.editReply({ 
                        content: 'Ban command timed out. Please try again.', 
                        components: [] 
                    });
                }
            });
        } catch (error) {
            console.error(`Error banning user: ${error}`);
            await interaction.reply({ content: 'There was an error trying to ban this user.', ephemeral: true });
        }
    }
};