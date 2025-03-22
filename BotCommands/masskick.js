const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Define the configuration file path – adjust if needed!
const configPath = path.join(__dirname, '../Json/commandimageconfig.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('masskick')
        .setDescription('Kick multiple users by providing individual user mentions with a reason')
        .addUserOption(option =>
            option.setName('user_1')
                .setDescription('First user to kick')
                .setRequired(true)
        )
        .addUserOption(option =>
            option.setName('user_2')
                .setDescription('Second user to kick')
                .setRequired(false)
        )
        .addUserOption(option =>
            option.setName('user_3')
                .setDescription('Third user to kick')
                .setRequired(false)
        )
        .addUserOption(option =>
            option.setName('user_4')
                .setDescription('Fourth user to kick')
                .setRequired(false)
        )
        .addUserOption(option =>
            option.setName('user_5')
                .setDescription('Fifth user to kick')
                .setRequired(false)
        )
        .addUserOption(option =>
            option.setName('user_6')
                .setDescription('Sixth user to kick')
                .setRequired(false)
        )
        .addUserOption(option =>
            option.setName('user_7')
                .setDescription('Seventh user to kick')
                .setRequired(false)
        )
        .addUserOption(option =>
            option.setName('user_8')
                .setDescription('Eighth user to kick')
                .setRequired(false)
        )
        .addUserOption(option =>
            option.setName('user_9')
                .setDescription('Ninth user to kick')
                .setRequired(false)
        )
        .addUserOption(option =>
            option.setName('user_10')
                .setDescription('Tenth user to kick')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the kicks')
                .setRequired(false)
        ),

    async execute(interaction) {
        // Ensure the invoker has kick permissions.
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
            return interaction.reply({ content: 'You do not have permission to kick members.', ephemeral: true });
        }
        await interaction.deferReply({ ephemeral: true });

        // Gather all user mentions.
        const usersToKick = [
            interaction.options.getUser('user_1'),
            interaction.options.getUser('user_2'),
            interaction.options.getUser('user_3'),
            interaction.options.getUser('user_4'),
            interaction.options.getUser('user_5'),
            interaction.options.getUser('user_6'),
            interaction.options.getUser('user_7'),
            interaction.options.getUser('user_8'),
            interaction.options.getUser('user_9'),
            interaction.options.getUser('user_10')
        ].filter(Boolean);

        const reason = interaction.options.getString('reason') || 'No reason provided';

        if (usersToKick.length === 0) {
            return interaction.editReply({ content: 'No valid users provided.' });
        }

        let kickedUsers = [];
        let successfulKicks = 0;

        // Loop through each user to kick.
        for (let user of usersToKick) {
            let memberToKick = null;
            try {
                memberToKick = interaction.guild.members.cache.get(user.id) ||
                               await interaction.guild.members.fetch(user.id).catch(() => null);
            } catch (error) {
                console.error(`Error fetching member ${user.id}:`, error.message);
            }
            if (!memberToKick) continue;

            // Skip if the target's highest role is equal or greater than the invoker's.
            if (memberToKick.roles.highest.position >= interaction.member.roles.highest.position) {
                continue;
            }

            try {
                await memberToKick.kick(reason);
                kickedUsers.push(`${user.tag} (<@${user.id}>)`);
                successfulKicks++;
                // A brief delay to avoid rate limit issues.
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                console.error(`Error kicking user ${user.tag}:`, error.message);
            }
        }

        // Dynamic image logic for masskick.
        // Initialize with null so no image appears by default.
        let imageUrlMassKick = null;
        if (fs.existsSync(configPath)) {
            try {
                const fileData = fs.readFileSync(configPath, 'utf8');
                const commandImageConfig = JSON.parse(fileData);
                if (commandImageConfig[interaction.guild.id] && commandImageConfig[interaction.guild.id].masskick !== undefined) {
                    const customUrl = commandImageConfig[interaction.guild.id].masskick;
                    imageUrlMassKick = customUrl.trim() === '' ? null : customUrl;
                }
            } catch (error) {
                console.error('Error reading command image config:', error);
            }
        }

        // Build the log embed.
        const logEmbed = new EmbedBuilder()
            .setTitle('Mass Kick Logged')
            .setDescription(`**${successfulKicks}** users have been kicked.`)
            .addFields(
                { name: 'Kicked Users', value: kickedUsers.join('\n') || 'None', inline: false },
                { name: 'Kicked By', value: interaction.user.tag, inline: true },
                { name: 'Reason', value: reason, inline: true }
            )
            .setColor(0x000000)
            .setFooter({ text: `${interaction.guild.name}` })
            .setTimestamp();

        // Set the embed image only if a custom image URL is provided.
        if (imageUrlMassKick) {
            logEmbed.setImage(imageUrlMassKick);
        }

        // Send the embed to "kick-logs" channel, or fallback to the current channel.
        const logChannel = interaction.guild.channels.cache.find(channel => channel.name === 'kick-logs');
        if (logChannel) {
            await logChannel.send({ embeds: [logEmbed] });
        } else {
            await interaction.channel.send({ embeds: [logEmbed] });
        }

        await interaction.editReply({ content: `Successfully kicked **${successfulKicks}** users.` });
    }
};
