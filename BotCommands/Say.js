const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('say')
        .setDescription('Repeats your message exactly as a user would.')
        .addStringOption(option =>
            option.setName('message')
                .setDescription('The message to send (max 2000 characters)')
                .setRequired(true)
        )
        .addBooleanOption(option =>
            option.setName('embed')
                .setDescription('Send the message as an embed?')
                .setRequired(false)
        )
        .addAttachmentOption(option =>
            option.setName('file')
                .setDescription('Attach a file to the message')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        let messageContent = interaction.options.getString('message');
        const useEmbed = interaction.options.getBoolean('embed') || false;
        const file = interaction.options.getAttachment('file');

        // **Check message length (Prevent DiscordAPIError[50035])**
        if (messageContent.length > 2000) {
            return await interaction.editReply({ 
                content: `❌ Message too long! (Max: 2000 characters, Yours: ${messageContent.length})`, 
                ephemeral: true 
            });
        }

        // Prevent unwanted mentions
        messageContent = messageContent
            .replace(/@everyone/g, '@\u200beveryone')
            .replace(/@here/g, '@\u200bhere');

        // **SEND MESSAGE AS RAW TEXT TO LET DISCORD PROCESS EMOJIS NATURALLY**
        if (!useEmbed) {
            const sendOptions = { 
                content: messageContent, 
                allowedMentions: { parse: [] } // Prevents @everyone/@here mentions
            };

            if (file) sendOptions.files = [file.url];

            await interaction.channel.send(sendOptions);
            return await interaction.deleteReply(); // ✅ FIX: Don't edit reply after sending a message
        }

        // **EMBED MODE**
        const embed = new EmbedBuilder()
            .setDescription(messageContent)
            .setColor(0x000000)
            .setAuthor({
                name: interaction.client.user.username,
                iconURL: interaction.client.user.displayAvatarURL({ dynamic: true })
            })
            .setTimestamp();

        const sendOptions = { embeds: [embed] };
        if (file) sendOptions.files = [file.url];

        await interaction.channel.send(sendOptions);
        return await interaction.deleteReply(); // ✅ FIX: Don't edit reply after sending a message
    }
};