const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('editembed')
        .setDescription('Edit an existing embed in a message.')
        .addStringOption(option => option.setName('message_id').setDescription('The ID of the message to edit').setRequired(true))
        .addStringOption(option => option.setName('author').setDescription('Set the author name (type "delete" to remove)'))
        .addStringOption(option => option.setName('author_icon').setDescription('Set the author icon URL (type "delete" to remove)'))
        .addStringOption(option => option.setName('title').setDescription('Set the title of the embed (type "delete" to remove)'))
        .addStringOption(option => option.setName('description').setDescription('Set the description of the embed (type "delete" to remove)'))
        .addStringOption(option => option.setName('thumbnail').setDescription('Set the thumbnail URL (type "delete" to remove)'))
        .addStringOption(option => option.setName('footer_text').setDescription('Set the footer text (type "delete" to remove)'))
        .addStringOption(option => option.setName('footer_icon').setDescription('Set the footer icon URL (type "delete" to remove)'))
        .addStringOption(option => option.setName('footer_image').setDescription('Set the footer image URL (not supported)')),
        
    async execute(interaction) {
        const messageId = interaction.options.getString('message_id');
        const author = interaction.options.getString('author');
        const authorIcon = interaction.options.getString('author_icon');
        const title = interaction.options.getString('title');
        const description = interaction.options.getString('description');
        const thumbnail = interaction.options.getString('thumbnail');
        const footerText = interaction.options.getString('footer_text');
        const footerIcon = interaction.options.getString('footer_icon');
        const footerImage = interaction.options.getString('footer_image'); // Not used by EmbedBuilder

        try {
            const channel = interaction.channel;
            const message = await channel.messages.fetch(messageId);
            
            if (!message) {
                return interaction.reply({ content: 'Message not found.', ephemeral: true });
            }
            if (!message.embeds.length) {
                return interaction.reply({ content: 'No embed found in this message.', ephemeral: true });
            }

            let embed = EmbedBuilder.from(message.embeds[0]);

            // Update author field
            if (author !== null) {
                if (author.toLowerCase() === "delete") {
                    embed.setAuthor(null);
                } else {
                    embed.setAuthor({
                        name: author,
                        iconURL: (authorIcon !== null && authorIcon.toLowerCase() === "delete") ? null : (authorIcon || embed.author?.iconURL)
                    });
                }
            }
            
            // Update title
            if (title !== null) {
                if (title.toLowerCase() === "delete") {
                    embed.setTitle(null);
                } else {
                    embed.setTitle(title);
                }
            }
            
            // Update description
            if (description !== null) {
                if (description.toLowerCase() === "delete") {
                    embed.setDescription(null);
                } else {
                    embed.setDescription(description);
                }
            }
            
            // Update thumbnail
            if (thumbnail !== null) {
                if (thumbnail.toLowerCase() === "delete") {
                    embed.setThumbnail(null);
                } else {
                    embed.setThumbnail(thumbnail);
                }
            }
            
            // Update footer (text and icon)
            if (footerText !== null || footerIcon !== null) {
                let newFooterText = footerText;
                let newFooterIcon = footerIcon;
                if (footerText !== null && footerText.toLowerCase() === "delete") {
                    newFooterText = null;
                }
                if (footerIcon !== null && footerIcon.toLowerCase() === "delete") {
                    newFooterIcon = null;
                }
                if (newFooterText === null && newFooterIcon === null) {
                    embed.setFooter(null);
                } else {
                    embed.setFooter({
                        text: newFooterText !== null ? newFooterText : embed.footer?.text,
                        iconURL: newFooterIcon !== null ? newFooterIcon : embed.footer?.iconURL
                    });
                }
            }
            
            // Note: footer_image is not supported by discord.js EmbedBuilder.
            
            await message.edit({ embeds: [embed] });
            await interaction.reply({ content: 'Embed updated successfully!', ephemeral: true });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'Error editing embed. Make sure the message ID is correct.', ephemeral: true });
        }
    }
};
