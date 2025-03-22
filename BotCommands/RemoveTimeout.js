const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Define the configuration file path (adjust if needed)
const configPath = path.join(__dirname, '../Json/commandimageconfig.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remove-timeout')
        .setDescription('Removes the timeout from a user.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to remove the timeout from')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for removing the timeout')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const guild = interaction.guild;
        const botUser = interaction.client.user;
        let dmed = 'False';

        try {
            // Fetch the member from the guild
            let member;
            try {
                member = await guild.members.fetch(user.id);
            } catch (error) {
                console.log(`User not found as a guild member.`);
                return interaction.reply({ content: 'User is not in the server.', ephemeral: true });
            }
            
            // Attempt to DM the user
            try {
                await user.send(`Your timeout in **${guild.name}** has been removed. Reason: "${reason}"`);
                dmed = 'True';
            } catch (error) {
                console.log(`Could not DM the user: ${error}`);
            }
            
            // Remove timeout by setting it to null
            await member.timeout(null, reason);

            // Dynamic image logic: default to null (no image) if not configured.
            let imageUrlRemoveTimeout = null;
            if (fs.existsSync(configPath)) {
                try {
                    const fileData = fs.readFileSync(configPath, 'utf8');
                    const commandImageConfig = JSON.parse(fileData);
                    if (
                        commandImageConfig[guild.id] &&
                        commandImageConfig[guild.id].removetimeout !== undefined
                    ) {
                        const customUrl = commandImageConfig[guild.id].removetimeout;
                        imageUrlRemoveTimeout = customUrl.trim() === '' ? null : customUrl;
                    }
                } catch (error) {
                    console.error('Error reading command image config:', error);
                }
            }

            // Build the remove timeout log embed
            const removeTimeoutEmbed = new EmbedBuilder()
                .setColor(0x000000)
                .setTitle('User Timeout Removed')
                .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                .setAuthor({ name: botUser.username, iconURL: botUser.displayAvatarURL() })
                .setDescription(`<@${user.id}> has had their timeout removed.`)
                .addFields(
                    { name: 'Removed By', value: `${interaction.user.tag}`, inline: true },
                    { name: 'Reason', value: `"${reason}"`, inline: true },
                    { name: 'User DMed', value: dmed, inline: true },
                    { name: 'User ID', value: user.id, inline: true }
                )
                .setFooter({ text: guild.name, iconURL: botUser.displayAvatarURL() });
            
            // Set the image only if a valid custom URL is provided
            if (imageUrlRemoveTimeout) {
                removeTimeoutEmbed.setImage(imageUrlRemoveTimeout);
            }

            // Find or create the log channel
            let logChannel = guild.channels.cache.find(ch => ch.name === 'timeout-logs' && ch.isTextBased());
            if (!logChannel) {
                try {
                    logChannel = await guild.channels.create({
                        name: 'timeout-logs',
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
                await logChannel.send({ embeds: [removeTimeoutEmbed] });
            } else {
                console.log('Log channel not found or could not be created. Sending log to the command channel.');
                await interaction.channel.send({ embeds: [removeTimeoutEmbed] });
            }

            // Ephemeral confirmation to the command invoker
            await interaction.reply({ content: `**Timeout removed from ${user.tag}.**`, ephemeral: true });
        } catch (error) {
            console.error(`Error removing timeout: ${error}`);
            await interaction.reply({ content: 'There was an error trying to remove the timeout from this user.', ephemeral: true });
        }
    }
};
