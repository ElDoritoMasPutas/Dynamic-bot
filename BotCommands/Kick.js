const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Path to your image configuration file
const configPath = path.join(__dirname, '../Json/commandimageconfig.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kicks a user from the server.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to kick')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the kick')
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

        // Set default image to null, so if there’s no custom image, no image shows.
        let imageUrlKick = null;
        if (fs.existsSync(configPath)) {
            try {
                const fileData = fs.readFileSync(configPath, 'utf8');
                const commandImageConfig = JSON.parse(fileData);
                if (commandImageConfig[guild.id] && commandImageConfig[guild.id].kick !== undefined) {
                    let customUrl = commandImageConfig[guild.id].kick;
                    imageUrlKick = customUrl.trim() === '' ? null : customUrl;
                }
            } catch (error) {
                console.error('Error reading command image config:', error);
            }
        }

        try {
            // Fetch the member from the guild
            let member;
            try {
                member = await guild.members.fetch(user.id);
            } catch (error) {
                console.log(`User not found as a guild member, cannot kick.`);
                return interaction.reply({ content: 'This user is not a member of the server.', ephemeral: true });
            }

            // Attempt to DM the user
            try {
                await user.send(`You have been kicked from **${guild.name}** for: ${formattedReason}`);
                dmed = 'True';
            } catch (error) {
                console.log(`Could not DM the user: ${error}`);
            }

            // Kick the user
            await member.kick(reason);

            // Build the kick log embed using the (possibly dynamic) image
            const kickEmbed = new EmbedBuilder()
                .setColor(0x000000)
                .setTitle('User Kicked')
                .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                .setAuthor({ name: botUser.username, iconURL: botUser.displayAvatarURL() })
                .setDescription(`<@${user.id}> has been kicked.`)
                .addFields(
                    { name: 'Kicked By', value: `${interaction.user.tag}`, inline: true },
                    { name: 'Reason', value: formattedReason, inline: true },
                    { name: 'User DMed', value: dmed, inline: true },
                    { name: 'User ID', value: user.id, inline: true }
                )
                .setFooter({ text: guild.name, iconURL: botUser.displayAvatarURL() });
            
            // Apply the image only if one is provided.
            if (imageUrlKick) {
                kickEmbed.setImage(imageUrlKick);
            }

            // Find or create the log channel "kick-logs"
            let logChannel = guild.channels.cache.find(ch => ch.name === 'kick-logs' && ch.isTextBased());
            if (!logChannel) {
                try {
                    logChannel = await guild.channels.create({
                        name: 'kick-logs',
                        type: 0, 
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
                await logChannel.send({ embeds: [kickEmbed] });
            } else {
                console.log('Log channel not found or could not be created. Sending log to the command channel.');
                await interaction.channel.send({ embeds: [kickEmbed] });
            }

            // Ephemeral confirmation
            await interaction.reply({ content: `**User ${user.tag} has been kicked successfully.**`, ephemeral: true });
        } catch (error) {
            console.error(`Error kicking user: ${error}`);
            await interaction.reply({ content: 'There was an error trying to kick this user.', ephemeral: true });
        }
    }
};
