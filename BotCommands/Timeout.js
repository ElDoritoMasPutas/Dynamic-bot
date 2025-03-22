const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Define the configuration file path (adjust as needed)
const configPath = path.join(__dirname, '../Json/commandimageconfig.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('Times out a user for a specified duration.')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to timeout')
                .setRequired(true)
        )
        .addStringOption(option => 
            option.setName('duration')
                .setDescription('Duration of the timeout (e.g., 10m, 1h, 2d, 1w)')
                .setRequired(true)
        )
        .addStringOption(option => 
            option.setName('reason')
                .setDescription('Reason for the timeout')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const durationInput = interaction.options.getString('duration');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const guild = interaction.guild;
        const botUser = interaction.client.user;
        let dmed = 'False';

        // Function to parse duration strings (e.g., "10m", "1h", "2d", "1w")
        function parseDuration(duration) {
            const regex = /^(\d+)([smhdw])$/i;
            const match = duration.match(regex);
            if (!match) return null;
            const value = parseInt(match[1]);
            const unit = match[2].toLowerCase();
            
            switch (unit) {
                case 's': return value * 1000; // seconds
                case 'm': return value * 60 * 1000; // minutes
                case 'h': return value * 60 * 60 * 1000; // hours
                case 'd': return value * 24 * 60 * 60 * 1000; // days
                case 'w': return value * 7 * 24 * 60 * 60 * 1000; // weeks
                default: return null;
            }
        }

        const timeoutDuration = parseDuration(durationInput);
        if (!timeoutDuration || timeoutDuration > 2419200000) {
            return interaction.reply({ content: 'Invalid duration format. Use something like `10m`, `1h`, `2d`, `1w` (max 28 days).', ephemeral: true });
        }

        try {
            let member;
            try {
                member = await guild.members.fetch(user.id);
            } catch (error) {
                console.log(`User not found as a guild member.`);
                return interaction.reply({ content: 'User is not in the server.', ephemeral: true });
            }
            
            // Attempt to DM the user
            try {
                await user.send(`You have been timed out in **${guild.name}** for ${durationInput} due to: \`\`${reason}\`\``);
                dmed = 'True';
            } catch (error) {
                console.log(`Could not DM the user: ${error}`);
            }
            
            // Apply timeout
            await member.timeout(timeoutDuration, reason);

            // Dynamic image logic: default to null (no image) unless custom URL is configured.
            let imageUrlTimeout = null;
            if (fs.existsSync(configPath)) {
                try {
                    const fileData = fs.readFileSync(configPath, 'utf8');
                    const commandImageConfig = JSON.parse(fileData);
                    if (commandImageConfig[guild.id] && commandImageConfig[guild.id].timeout !== undefined) {
                        const customUrl = commandImageConfig[guild.id].timeout;
                        imageUrlTimeout = customUrl.trim() === '' ? null : customUrl;
                    }
                } catch (error) {
                    console.error('Error reading command image config:', error);
                }
            }

            // Build the timeout log embed
            const timeoutEmbed = new EmbedBuilder()
                .setColor(0x000000)
                .setTitle('User Timed Out')
                .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                .setAuthor({ name: botUser.username, iconURL: botUser.displayAvatarURL() })
                .setDescription(`<@${user.id}> has been timed out.`)
                .addFields(
                    { name: 'Timed Out By', value: `${interaction.user.tag}`, inline: true },
                    { name: 'Duration', value: `${durationInput}`, inline: true },
                    { name: 'Reason', value: `\`\`${reason}\`\``, inline: true },
                    { name: 'User DMed', value: dmed, inline: true },
                    { name: 'User ID', value: user.id, inline: true }
                )
                .setFooter({ text: guild.name, iconURL: botUser.displayAvatarURL() });
            
            // Apply the image only if a custom URL was provided.
            if (imageUrlTimeout) {
                timeoutEmbed.setImage(imageUrlTimeout);
            }

            // Find or create the timeout log channel.
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
                await logChannel.send({ embeds: [timeoutEmbed] });
            } else {
                console.log('Log channel not found or could not be created. Sending log to the command channel.');
                await interaction.channel.send({ embeds: [timeoutEmbed] });
            }

            // Ephemeral confirmation
            await interaction.reply({ content: `**User ${user.tag} has been timed out for ${durationInput}.**`, ephemeral: true });
        } catch (error) {
            console.error(`Error timing out user: ${error}`);
            await interaction.reply({ content: 'There was an error trying to timeout this user.', ephemeral: true });
        }
    }
};
