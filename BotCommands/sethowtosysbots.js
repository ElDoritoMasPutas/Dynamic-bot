const { 
    SlashCommandBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    EmbedBuilder, 
    AttachmentBuilder, 
    ChannelType 
} = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sethowtosysbot')
        .setDescription('Sends the How-To SysBot guide with an image, embed, and buttons to the designated channel.'),
    async execute(interaction) {
        // Administrator check
        if (!interaction.member.permissions.has('ADMINISTRATOR')) {
            await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
            return;
        }

        const guild = interaction.guild;
        const channel = interaction.channel;
        const botAvatarURL = interaction.client.user.displayAvatarURL({ dynamic: true, size: 1024 });
        const guildIcon = guild.iconURL({ dynamic: true, size: 1024 }) || botAvatarURL;
        const guildName = guild.name;

        // Dynamically fetch the advanced instructions channel ("🆘-batch-commands")
        const advancedChannel = guild.channels.cache.find(
            ch => ch.name === '🆘-batch-commands' && ch.type === ChannelType.GuildText
        );
        const advancedChannelMention = advancedChannel ? `<#${advancedChannel.id}>` : 'the advanced instructions channel';

        // Find or create the target channel ("🆘how-to-sysbot")
        let targetChannel = guild.channels.cache.find(
            ch => ch.name === '🆘how-to-sysbot' && ch.type === ChannelType.GuildText
        );
        if (!targetChannel) {
            try {
                targetChannel = await guild.channels.create({
                    name: '🆘how-to-sysbot',
                    type: ChannelType.GuildText,
                    reason: 'How-To SysBot guide channel not found, creating automatically.'
                });
            } catch (error) {
                console.error('Error creating channel:', error);
                await interaction.reply({ content: 'Failed to create the How-To SysBot channel.', ephemeral: true });
                return;
            }
        }

        // Define the image path (two directories up)
        const imagePath = path.join(__dirname, '../Images/howtosysbots.jpg');
        // Check if the file exists
        if (!fs.existsSync(imagePath)) {
            await interaction.reply({ content: 'The required image file is missing. Please ensure the file exists in the correct location.', ephemeral: true });
            return;
        }
        // Create the attachment from the image file
        const fileAttachment = new AttachmentBuilder(imagePath);

        // Build the embed with dynamic values
        const embed = new EmbedBuilder()
            .setTitle('How-To SysBot')
            .setDescription(
                'Welcome to the **How-To SysBot** guide!\n\n' +
                'Ready to learn the ins and outs of SysBot in just a few minutes? Click the name of the game you\'re playing below, and you\'ll get easy-to-follow instructions. ' +
                'This guide is beginner friendly so beginners can start here 🙂\n\n' +
                `IF you need more advanced instructions, please visit ${advancedChannelMention} for batch commands that can be run via PKHeX or added on to the bot's trade code.\n\n` +
                'If you like what you see here and the work we\'re doing, please let <@1020776456734904411> know; we appreciate you all for being here and we\'re here to help 💖'
            )
            .setThumbnail(guildIcon)
            .setColor(0x000000)
            .setImage('https://cdn-longterm.mee6.xyz/plugins/embeds/images/738050656933511298/4c80629edf805ce20ec90b238f8f94e9a078fcf9c2533f8996154c0977424c90.gif')
            .setFooter({ text: `${guildName} SysBot Guide`, iconURL: botAvatarURL })
            .setTimestamp();

        // Create the buttons
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('pla_guide')
                .setLabel('PLA')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('lgpe_guide')
                .setLabel('LGPE')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('swsh_guide')
                .setLabel('SWSH')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('scvi_guide')
                .setLabel('SCVI')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('bdsp_guide')
                .setLabel('BDSP')
                .setStyle(ButtonStyle.Primary)
        );

        try {
            // Send the image file first to the target channel
            await targetChannel.send({ files: [fileAttachment] });
            // Then send the embed with buttons to the target channel
            await targetChannel.send({ embeds: [embed], components: [row] });
            await interaction.reply({ content: `How-To SysBot guide sent to <#${targetChannel.id}>!`, ephemeral: true });
        } catch (error) {
            console.error('Error sending How-To SysBot guide:', error);
            await interaction.reply({ content: 'There was an error sending the How-To SysBot guide.', ephemeral: true });
        }
    },
};
