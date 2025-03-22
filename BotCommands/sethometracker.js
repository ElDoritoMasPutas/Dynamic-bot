const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    AttachmentBuilder, 
    ChannelType 
} = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sethometracker')
        .setDescription('Provides information about the HOME Tracker in Pokémon HOME.'),
    async execute(interaction) {
        // Administrator check
        if (!interaction.member.permissions.has('ADMINISTRATOR')) {
            await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
            return;
        }

        const guild = interaction.guild;
        const botAvatarURL = interaction.client.user.displayAvatarURL({ dynamic: true, size: 512 });
        const guildName = guild.name;
        const botName = interaction.client.user.username;

        // Updated file path
        const imagePath = path.join(__dirname, '../Images', 'hometracker.jpg');

        // Check if the file exists
        if (!fs.existsSync(imagePath)) {
            await interaction.reply({ content: 'The required image file is missing. Please ensure the file exists in the correct location.', ephemeral: true });
            return;
        }

        // Create the attachment
        const fileAttachment = new AttachmentBuilder(imagePath);

        // Find the target channel (or create it if not found)
        let targetChannel = guild.channels.cache.find(
            channel => channel.name === '🆘home-tracker' && channel.type === ChannelType.GuildText
        );

        if (!targetChannel) {
            try {
                targetChannel = await guild.channels.create({
                    name: '🆘home-tracker',
                    type: ChannelType.GuildText,
                    reason: 'HOME Tracker channel not found, creating automatically.'
                });
            } catch (error) {
                console.error('Error creating channel:', error);
                await interaction.reply({ content: 'Failed to create the HOME Tracker channel.', ephemeral: true });
                return;
            }
        }

        // Create the embeds with dynamic guild name and bot avatar
        const embed1 = new EmbedBuilder()
            .setTitle('What is a HOME Tracker?')
            .setDescription("In Pokémon HOME, each Pokémon is assigned a unique identifier known as the HOME Tracker. This 64-bit number is crucial for monitoring a Pokémon's journey across various games and ensuring data integrity during transfers.")
            .setThumbnail(botAvatarURL)
            .setImage('https://cdn-longterm.mee6.xyz/plugins/embeds/images/738050656933511298/4c80629edf805ce20ec90b238f8f94e9a078fcf9c2533f8996154a0977424c90.gif')
            .setFooter({ text: `${guildName} HOME Tracker Info`, iconURL: botAvatarURL })
            .setTimestamp();

        const embed2 = new EmbedBuilder()
            .setTitle('Key Functions of the HOME Tracker')
            .setDescription(
                "**Unique Identification:** The HOME Tracker provides a distinct ID for each Pokémon, allowing the system to accurately track its movements between games.\n\n" +
                "**Data Management:** When a Pokémon is deposited into Pokémon HOME, it receives a HOME Tracker ID. This ID is stored in the Pokémon's data structure, facilitating consistent tracking across different titles.\n\n" +
                "**Transfer Records:** The HOME Tracker logs the origin and destination of each transfer, maintaining a comprehensive history of the Pokémon's transfers."
            )
            .setThumbnail(botAvatarURL)
            .setImage('https://cdn-longterm.mee6.xyz/plugins/embeds/images/738050656933511298/4c80629edf805ce20ec90b238f8f94e9a078fcf9c2533f8996154a0977424c90.gif')
            .setFooter({ text: `${guildName} HOME Tracker Info`, iconURL: botAvatarURL })
            .setTimestamp();

        const embed3 = new EmbedBuilder()
            .setTitle('Technical Details')
            .setDescription(
                "**Core and Child Structures:** Upon receiving a HOME Tracker, data is written to both the core structure and the corresponding child structure of the Pokémon's data. Child structures related to specific games are generated when the Pokémon is transferred into those games. If a Pokémon hasn't visited certain games, the corresponding child structures remain uninitialized.\n\n" +
                "**Data Integrity:** The HOME Tracker ensures that any modifications or unauthorized changes to a Pokémon's data are detectable, preserving the integrity of the Pokémon's information.\n\n" +
                "Understanding the HOME Tracker is essential for trainers who transfer Pokémon between games, as it ensures a seamless and secure experience within the Pokémon ecosystem."
            )
            .setThumbnail(botAvatarURL)
            .setImage('https://cdn-longterm.mee6.xyz/plugins/embeds/images/738050656933511298/4c80629edf805ce20ec90b238f8f94e9a078fcf9c2533f8996154a0977424c90.gif')
            .setFooter({ text: `${guildName} HOME Tracker Info`, iconURL: botAvatarURL })
            .setTimestamp();

        const embed4 = new EmbedBuilder()
            .setTitle('If you need assistance')
            .setDescription(
                `**If you would like a Pokémon that requires a HOME Tracker, please DM ${botName} 😊 and let us know what Pokémon you would like to have! We can get you anything you want for any game 💖**\n\n` +
                `For more information, please visit this link [here](https://projectpokemon.org/home/forums/topic/56296-read-home-tracker-value/) to learn even more about HOME Trackers.\n\n` +
                `Please visit <#${targetChannel.id}> to learn which Pokémon needs these HOME Trackers and then request your file.`
            )
            .setThumbnail(botAvatarURL)
            .setImage('https://cdn-longterm.mee6.xyz/plugins/embeds/images/738050656933511298/4c80629edf805ce20ec90b238f8f94e9a078fcf9c2533f8996154a0977424c90.gif')
            .setFooter({ text: `${guildName} HOME Tracker Info`, iconURL: botAvatarURL })
            .setTimestamp();

        // Send the attachment and embeds to the target channel
        await targetChannel.send({ files: [fileAttachment] });
        await targetChannel.send({ embeds: [embed1, embed2, embed3, embed4] });

        // Acknowledge the slash command execution
        await interaction.reply({ content: 'HOME Tracker info sent!', ephemeral: true });
    },
};
