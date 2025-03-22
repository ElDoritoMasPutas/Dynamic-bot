const { 
    Events, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ActionRowBuilder, 
    EmbedBuilder, 
    PermissionFlagsBits 
} = require('discord.js');

// Store embed data in memory for simplicity
const embedData = new Map();

// Define which custom IDs require admin permissions.
// This set includes both button IDs and modal IDs that should be admin-only.
const adminRequiredIds = new Set([
    'set_title', 'set_description', 'set_author', 'set_author_image',
    'set_thumbnail', 'set_footer', 'set_footer_icon', 'set_footer_image',
    'set_add_field',
    'set_title_modal', 'set_description_modal', 'set_author_modal', 'set_author_image_modal',
    'set_thumbnail_modal', 'set_footer_modal', 'set_footer_icon_modal', 'set_footer_image_modal',
    'set_add_field_modal'
]);

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        // Process only button interactions or modal submissions
        if (!interaction.isButton() && !interaction.isModalSubmit()) return;
        
        // If the interaction's customId is in our adminRequiredIds, then check for Administrator permission.
        if (adminRequiredIds.has(interaction.customId)) {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return await interaction.reply({ content: "❌ You don't have permission to use this!", ephemeral: true });
            }
        }
        
        const userId = interaction.user.id;
        if (!embedData.has(userId)) {
            embedData.set(userId, {
                title: null,
                description: null,
                author: null,
                authorIcon: null,
                thumbnail: null,
                footer: null,
                footerIcon: null,
                footerImage: null,
                fields: [],
                timestamp: false,
            });
        }
        
        const embed = embedData.get(userId);

        // Handle button interactions
        if (interaction.isButton()) {
            switch (interaction.customId) {
                case 'set_title':
                    return await showModal(interaction, 'set_title_modal', 'Set Embed Title', [
                        { id: 'title', label: 'Embed Title', style: TextInputStyle.Short }
                    ]);
                case 'set_description':
                    return await showModal(interaction, 'set_description_modal', 'Set Embed Description', [
                        { id: 'description', label: 'Embed Description', style: TextInputStyle.Paragraph }
                    ]);
                case 'set_author':
                    return await showModal(interaction, 'set_author_modal', 'Set Embed Author', [
                        { id: 'author', label: 'Author Name', style: TextInputStyle.Short }
                    ]);
                case 'set_author_image':
                    return await showModal(interaction, 'set_author_image_modal', 'Set Author Image', [
                        { id: 'authorIcon', label: 'Author Image URL', style: TextInputStyle.Short }
                    ]);
                case 'set_thumbnail':
                    return await showModal(interaction, 'set_thumbnail_modal', 'Set Thumbnail', [
                        { id: 'thumbnail', label: 'Thumbnail URL', style: TextInputStyle.Short }
                    ]);
                case 'set_footer':
                    return await showModal(interaction, 'set_footer_modal', 'Set Footer Text', [
                        { id: 'footer', label: 'Footer Text', style: TextInputStyle.Short }
                    ]);
                case 'set_footer_icon':
                    return await showModal(interaction, 'set_footer_icon_modal', 'Set Footer Icon', [
                        { id: 'footerIcon', label: 'Footer Icon URL', style: TextInputStyle.Short }
                    ]);
                case 'set_footer_image':
                    return await showModal(interaction, 'set_footer_image_modal', 'Set Footer Image', [
                        { id: 'footerImage', label: 'Footer Image URL', style: TextInputStyle.Short }
                    ]);
                case 'set_timestamp':
                    embed.timestamp = !embed.timestamp;
                    return await interaction.reply({ content: `Timestamp ${embed.timestamp ? 'enabled' : 'disabled'}.`, ephemeral: true });
                case 'set_add_field':
                    return await showModal(interaction, 'set_add_field_modal', 'Add Field', [
                        { id: 'field_name', label: 'Field Name', style: TextInputStyle.Short },
                        { id: 'field_value', label: 'Field Value', style: TextInputStyle.Paragraph }
                    ]);
                case 'set_send_embed': {
                    const finalEmbed = new EmbedBuilder()
                        .setTitle(embed.title)
                        .setDescription(embed.description)
                        .setAuthor(embed.author ? { name: embed.author, iconURL: embed.authorIcon || null } : null)
                        .setThumbnail(embed.thumbnail)
                        .setFooter(embed.footer ? { text: embed.footer, iconURL: embed.footerIcon } : null)
                        .setColor(0x000000);

                    if (embed.footerImage) finalEmbed.setImage(embed.footerImage);
                    if (embed.fields.length > 0) finalEmbed.addFields(embed.fields);
                    if (embed.timestamp) finalEmbed.setTimestamp();

                    await interaction.channel.send({ embeds: [finalEmbed] });
                    embedData.delete(userId);
                    return await interaction.reply({ content: 'Embed sent!', ephemeral: true });
                }
            }
        }
        
        // Handle modal submissions
        if (interaction.isModalSubmit()) {
            switch (interaction.customId) {
                case 'set_title_modal':
                    embed.title = interaction.fields.getTextInputValue('title') || 'No Title';
                    break;
                case 'set_description_modal':
                    embed.description = interaction.fields.getTextInputValue('description') || 'No Description';
                    break;
                case 'set_author_modal':
                    embed.author = interaction.fields.getTextInputValue('author') || 'No Author';
                    break;
                case 'set_author_image_modal':
                    embed.authorIcon = interaction.fields.getTextInputValue('authorIcon') || null;
                    break;
                case 'set_thumbnail_modal':
                    embed.thumbnail = interaction.fields.getTextInputValue('thumbnail') || null;
                    break;
                case 'set_footer_modal':
                    embed.footer = interaction.fields.getTextInputValue('footer') || 'No Footer';
                    break;
                case 'set_footer_icon_modal':
                    embed.footerIcon = interaction.fields.getTextInputValue('footerIcon') || null;
                    break;
                case 'set_footer_image_modal':
                    embed.footerImage = interaction.fields.getTextInputValue('footerImage') || null;
                    break;
                case 'set_add_field_modal':
                    const fieldName = interaction.fields.getTextInputValue('field_name') || 'Unnamed Field';
                    const fieldValue = interaction.fields.getTextInputValue('field_value') || 'No Value';
                    embed.fields.push({ name: fieldName, value: fieldValue });
                    break;
            }
            return await interaction.reply({ content: 'Modal submitted successfully.', ephemeral: true });
        }
    }
};

// Utility function to show modals
async function showModal(interaction, customId, title, inputs) {
    const modal = new ModalBuilder()
        .setCustomId(customId)
        .setTitle(title);

    const rows = inputs.map(input =>
        new ActionRowBuilder().addComponents(
            new TextInputBuilder()
                .setCustomId(input.id)
                .setLabel(input.label)
                .setStyle(input.style || TextInputStyle.Short)
                .setRequired(false)
        )
    );

    modal.addComponents(rows);
    await interaction.showModal(modal);
}