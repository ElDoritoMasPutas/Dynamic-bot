const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Path to your image configuration file
const configPath = path.join(__dirname, '../Json/commandimageconfig.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('massban')
        .setDescription('Ban multiple users by providing individual User ID options with a reason')
        .addStringOption(option =>
            option.setName('user_id_1')
                .setDescription('User ID to ban')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('user_id_2')
                .setDescription('User ID to ban')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('user_id_3')
                .setDescription('User ID to ban')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('user_id_4')
                .setDescription('User ID to ban')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('user_id_5')
                .setDescription('User ID to ban')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('user_id_6')
                .setDescription('User ID to ban')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('user_id_7')
                .setDescription('User ID to ban')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('user_id_8')
                .setDescription('User ID to ban')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('user_id_9')
                .setDescription('User ID to ban')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('user_id_10')
                .setDescription('User ID to ban')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the bans')
                .setRequired(false)
        ),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return interaction.reply({ content: 'You do not have permission to ban members.', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true }); // Acknowledge the interaction

        // Gather all user IDs after filtering out any empty values.
        const userIds = [
            interaction.options.getString('user_id_1'),
            interaction.options.getString('user_id_2'),
            interaction.options.getString('user_id_3'),
            interaction.options.getString('user_id_4'),
            interaction.options.getString('user_id_5'),
            interaction.options.getString('user_id_6'),
            interaction.options.getString('user_id_7'),
            interaction.options.getString('user_id_8'),
            interaction.options.getString('user_id_9'),
            interaction.options.getString('user_id_10')
        ].filter(Boolean);

        const reason = interaction.options.getString('reason') || 'No reason provided';

        if (userIds.length === 0) {
            return interaction.editReply({ content: 'No valid user IDs provided.' });
        }

        let bannedUserTags = [];
        let successfulBans = 0;

        for (let userId of userIds) {
            let userToBan;

            try {
                userToBan = await interaction.client.users.fetch(userId).catch(() => null);
            } catch (error) {
                console.error(`Error fetching user with ID ${userId}:`, error.message);
                continue;
            }

            if (!userToBan) continue;

            let memberToBan = null;
            try {
                memberToBan = interaction.guild.members.cache.get(userToBan.id) ||
                              await interaction.guild.members.fetch(userToBan.id).catch(() => null);
            } catch (error) {
                console.error(`Error fetching member ${userToBan.id}:`, error.message);
            }

            // Make sure you cannot massban someone with a higher role than the command invoker
            if (memberToBan && memberToBan.roles.highest.position >= interaction.member.roles.highest.position) {
                continue;
            }

            try {
                await interaction.guild.members.ban(userToBan.id, { reason });
                bannedUserTags.push(userToBan.tag);
                successfulBans++;
                // A small delay between bans to help prevent hitting rate limits.
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                console.error(`Error banning user ${userToBan.tag}:`, error.message);
            }
        }

        // Dynamic image logic for massban; default to null (no image) if not provided.
        let imageUrlMassBan = null;
        if (fs.existsSync(configPath)) {
            try {
                const fileData = fs.readFileSync(configPath, 'utf8');
                const commandImageConfig = JSON.parse(fileData);
                if (
                    commandImageConfig[interaction.guild.id] &&
                    commandImageConfig[interaction.guild.id].massban !== undefined
                ) {
                    const customUrl = commandImageConfig[interaction.guild.id].massban;
                    imageUrlMassBan = customUrl.trim() === '' ? null : customUrl;
                }
            } catch (error) {
                console.error('Error reading command image config:', error);
            }
        }

        // Build the mass ban log embed.
        const logEmbed = new EmbedBuilder()
            .setTitle('Mass Ban Logged')
            .setDescription(`**${successfulBans}** users have been banned.`)
            .addFields(
                { name: 'Banned Users', value: bannedUserTags.join(', ') || 'None', inline: false },
                { name: 'Banned By', value: interaction.user.tag, inline: true },
                { name: 'Reason', value: reason, inline: true }
            )
            .setColor(0x000000)
            .setFooter({ text: interaction.guild.name })
            .setTimestamp();

        // Set image only if one is provided.
        if (imageUrlMassBan) {
            logEmbed.setImage(imageUrlMassBan);
        }

        // Attempt to send the embed to the 'ban-logs' channel, or fallback to the current channel.
        const logChannel = interaction.guild.channels.cache.find(channel => channel.name === 'ban-logs');
        if (logChannel) {
            await logChannel.send({ embeds: [logEmbed] });
        } else {
            await interaction.channel.send({ embeds: [logEmbed] });
        }

        // Final response to the command invoker.
        await interaction.editReply({ content: `Successfully banned ${successfulBans} users.` });
    }
};
