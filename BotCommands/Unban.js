const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Define the configuration file path
const configPath = path.join(__dirname, '../Json/commandimageconfig.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Unbans a user from the server.')
        .addStringOption(option =>
            option.setName('user_id')
                .setDescription('The ID of the user to unban')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the unban')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(interaction) {
        const userId = interaction.options.getString('user_id');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const formattedReason = `\`\`${reason}\`\``;
        const guild = interaction.guild;
        const botUser = interaction.client.user;

        // Dynamic image logic: default to null (no image) if not configured.
        let imageUrlUnban = null;
        if (fs.existsSync(configPath)) {
            try {
                const fileData = fs.readFileSync(configPath, 'utf8');
                const commandImageConfig = JSON.parse(fileData);
                if (commandImageConfig[guild.id] && commandImageConfig[guild.id].unban !== undefined) {
                    const customUrl = commandImageConfig[guild.id].unban;
                    imageUrlUnban = customUrl.trim() === '' ? null : customUrl;
                }
            } catch (error) {
                console.error('Error reading command image config:', error);
            }
        }

        try {
            // Fetch the ban list to check if the user is banned.
            const bans = await guild.bans.fetch();
            const bannedUser = bans.get(userId);

            if (!bannedUser) {
                return await interaction.reply({ content: `⚠️ No banned user found with ID **${userId}**.`, ephemeral: true });
            }

            // Unban the user.
            await guild.bans.remove(userId, reason);

            // Build the unban log embed using the (possibly dynamic) image.
            const unbanEmbed = new EmbedBuilder()
                .setColor(0x000000)
                .setTitle('User Unbanned')
                .setThumbnail(bannedUser.user.displayAvatarURL({ dynamic: true }))
                .setAuthor({ name: botUser.username, iconURL: botUser.displayAvatarURL() })
                .setDescription(`${bannedUser.user.tag} has been unbanned.`)
                .addFields(
                    { name: 'Unbanned By', value: `${interaction.user.tag}`, inline: true },
                    { name: 'Reason', value: formattedReason, inline: true },
                    { name: 'User ID', value: userId, inline: true }
                )
                .setFooter({ text: guild.name, iconURL: botUser.displayAvatarURL() });

            // Set the image only if a custom URL is provided.
            if (imageUrlUnban) {
                unbanEmbed.setImage(imageUrlUnban);
            }

            // Find or create the log channel.
            let logChannel = guild.channels.cache.find(ch => ch.name === 'ban-logs' && ch.isTextBased());
            if (!logChannel) {
                try {
                    logChannel = await guild.channels.create({
                        name: 'ban-logs',
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
                await logChannel.send({ embeds: [unbanEmbed] });
            } else {
                console.log('Log channel not found or could not be created. Sending log to the command channel.');
                await interaction.channel.send({ embeds: [unbanEmbed] });
            }

            // Ephemeral confirmation.
            await interaction.reply({ content: `**User <@${userId}> has been unbanned successfully.**`, ephemeral: true });
        } catch (error) {
            console.error(`Error unbanning user: ${error}`);
            await interaction.reply({ content: 'There was an error trying to unban this user.', ephemeral: true });
        }
    }
};
