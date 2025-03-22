const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Define the correct paths for warning data
const warnDirPath = path.join(__dirname, '../Json');
const warnFilePath = path.join(warnDirPath, 'warnedUsers.json');

// Ensure the directory and file exist
if (!fs.existsSync(warnDirPath)) {
    fs.mkdirSync(warnDirPath, { recursive: true }); // Create directory if it doesn't exist
}

if (!fs.existsSync(warnFilePath)) {
    fs.writeFileSync(warnFilePath, JSON.stringify({}, null, 4)); // Create empty JSON file if missing
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Warns a user and keeps track of warnings.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to warn')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the warning')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const formattedReason = `\`\`${reason}\`\``;
        const guild = interaction.guild;
        const botUser = interaction.client.user;
        let dmed = 'False';

        // Read existing warnings
        let warnedUsers = {};
        try {
            warnedUsers = JSON.parse(fs.readFileSync(warnFilePath, 'utf8'));
        } catch (error) {
            console.error('Error reading warnedUsers.json:', error);
            warnedUsers = {}; // Reset if file read fails
        }

        // Initialize user warning count if needed
        if (!warnedUsers[user.id]) {
            warnedUsers[user.id] = { warns: 0 };
        }

        // Increment warning count
        warnedUsers[user.id].warns += 1;
        const warningCount = warnedUsers[user.id].warns;

        // Save updated warnings to file
        try {
            fs.writeFileSync(warnFilePath, JSON.stringify(warnedUsers, null, 4));
        } catch (error) {
            console.error('Error writing to warnedUsers.json:', error);
            return interaction.reply({ content: '⚠️ Error saving warning data.', ephemeral: true });
        }

        // DM the user about the warning
        try {
            await user.send(`You have been warned in **${guild.name}** for: ${formattedReason}. You now have ${warningCount} warning(s).`);
            dmed = 'True';
        } catch (error) {
            console.log(`Could not DM the user: ${error}`);
        }

        // Dynamic image logic for warn command
        let imageUrlWarn = null;
        const configPath = path.join(__dirname, '../Json/commandimageconfig.json');
        if (fs.existsSync(configPath)) {
            try {
                const fileData = fs.readFileSync(configPath, 'utf8');
                const commandImageConfig = JSON.parse(fileData);
                if (commandImageConfig[guild.id] && commandImageConfig[guild.id].warn !== undefined) {
                    const customUrl = commandImageConfig[guild.id].warn;
                    imageUrlWarn = customUrl.trim() === '' ? null : customUrl;
                }
            } catch (error) {
                console.error('Error reading command image config for warn:', error);
            }
        }

        // Build the warn log embed
        const warnEmbed = new EmbedBuilder()
            .setColor(0x000000)
            .setTitle('User Warned')
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .setAuthor({ name: botUser.username, iconURL: botUser.displayAvatarURL() })
            .setDescription(`<@${user.id}> has been warned.`)
            .addFields(
                { name: 'Warned By', value: `${interaction.user.tag}`, inline: true },
                { name: 'Reason', value: formattedReason, inline: true },
                { name: 'Total Warnings', value: `${warningCount}`, inline: true },
                { name: 'User DMed', value: dmed, inline: true },
                { name: 'User ID', value: user.id, inline: true }
            )
            .setFooter({ text: guild.name, iconURL: botUser.displayAvatarURL() });

        // Attach the custom image if one is provided
        if (imageUrlWarn) {
            warnEmbed.setImage(imageUrlWarn);
        }

        // Find or create the warn log channel
        let logChannel = guild.channels.cache.find(ch => ch.name === 'warn-logs' && ch.isTextBased());
        if (!logChannel) {
            try {
                logChannel = await guild.channels.create({
                    name: 'warn-logs',
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
            await logChannel.send({ embeds: [warnEmbed] });
        } else {
            console.log('Log channel not found or could not be created. Sending log to the command channel.');
            await interaction.channel.send({ embeds: [warnEmbed] });
        }

        // Mute the user if they reach 3 warnings
        if (warningCount >= 3) {
            try {
                let member = await guild.members.fetch(user.id);
                const muteRole = guild.roles.cache.find(role => role.name === 'Muted');

                if (!muteRole) {
                    console.log('Mute role not found.');
                    return interaction.reply({ content: `⚠️ User ${user.tag} has reached 3 warnings but no mute role exists.`, ephemeral: true });
                }

                await member.roles.add(muteRole);
                await interaction.reply({ content: `🚨 User ${user.tag} has been muted for reaching 3 warnings.`, ephemeral: true });

                try {
                    await user.send(`You have been **muted** in **${guild.name}** for accumulating 3 warnings.`);
                } catch (error) {
                    console.log(`Could not DM the user about the mute: ${error}`);
                }
            } catch (error) {
                console.log(`Error muting user: ${error}`);
            }
        } else {
            // Ephemeral confirmation if no mute is applied
            await interaction.reply({ content: `⚠️ User ${user.tag} has been warned. They now have **${warningCount} warning(s).**`, ephemeral: true });
        }
    }
};
