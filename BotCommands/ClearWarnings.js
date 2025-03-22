const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Paths for warnings data and command image config
const warnDirPath = path.join(__dirname, '../Json');
const warnFilePath = path.join(warnDirPath, 'warnedUsers.json');
const configPath = path.join(__dirname, '../Json/commandimageconfig.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clearwarnings')
        .setDescription('Clears all warnings for a specified user.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user whose warnings will be cleared')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for clearing warnings')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const guild = interaction.guild;
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const formattedReason = `\`\`${reason}\`\``;
        const botUser = interaction.client.user;

        // Read existing warnings
        let warnedUsers = {};
        try {
            if (fs.existsSync(warnFilePath)) {
                warnedUsers = JSON.parse(fs.readFileSync(warnFilePath, 'utf8'));
            }
        } catch (error) {
            console.error('Error reading warnedUsers.json:', error);
            return interaction.reply({ content: '⚠️ Error reading warning data.', ephemeral: true });
        }

        // Check if the user has warnings
        if (!warnedUsers[user.id] || warnedUsers[user.id].warns === 0) {
            return interaction.reply({ content: `✅ User ${user.tag} has no warnings to clear.`, ephemeral: true });
        }

        // Clear the warnings by deleting the user's record
        delete warnedUsers[user.id];

        // Save the updated warnings to file
        try {
            fs.writeFileSync(warnFilePath, JSON.stringify(warnedUsers, null, 4));
        } catch (error) {
            console.error('Error writing to warnedUsers.json:', error);
            return interaction.reply({ content: '⚠️ Error saving warning data.', ephemeral: true });
        }

        // Dynamic image logic: default to null so no image will be shown if not configured.
        let imageUrlClearWarnings = null;
        if (fs.existsSync(configPath)) {
            try {
                const fileData = fs.readFileSync(configPath, 'utf8');
                const commandImageConfig = JSON.parse(fileData);
                if (
                    commandImageConfig[guild.id] &&
                    commandImageConfig[guild.id].clearwarnings !== undefined
                ) {
                    const customUrl = commandImageConfig[guild.id].clearwarnings;
                    imageUrlClearWarnings = customUrl.trim() === '' ? null : customUrl;
                }
            } catch (error) {
                console.error('Error loading command image config:', error);
            }
        }

        // Build the clear warnings log embed.
        const clearWarnEmbed = new EmbedBuilder()
            .setColor(0x000000)
            .setTitle('Warnings Cleared')
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .setAuthor({ name: botUser.username, iconURL: botUser.displayAvatarURL() })
            .setDescription(`All warnings for <@${user.id}> have been cleared.`)
            .addFields(
                { name: 'Cleared By', value: `${interaction.user.tag}`, inline: true },
                { name: 'User ID', value: user.id, inline: true },
                { name: 'Reason', value: formattedReason, inline: true }
            )
            .setFooter({ text: guild.name, iconURL: botUser.displayAvatarURL() });

        // Apply the image only if one is provided.
        if (imageUrlClearWarnings) {
            clearWarnEmbed.setImage(imageUrlClearWarnings);
        }

        // Find or create the log channel.
        let logChannel = guild.channels.cache.find(ch => ch.name === 'warn-logs' && ch.isTextBased());
        if (!logChannel) {
            try {
                logChannel = await guild.channels.create({
                    name: 'warn-logs',
                    type: 0, // 0 represents a text channel.
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
            await logChannel.send({ embeds: [clearWarnEmbed] });
        } else {
            console.log('Log channel not found or could not be created. Sending log to the command channel.');
            await interaction.channel.send({ embeds: [clearWarnEmbed] });
        }

        // Ephemeral confirmation
        await interaction.reply({ content: `✅ Warnings for ${user.tag} have been cleared.`, ephemeral: true });
    }
};
