const { 
    PermissionFlagsBits, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    EmbedBuilder 
} = require('discord.js');
const fs = require('fs');
const path = require('path');

const giveawaysFilePath = path.join(__dirname, '../Json/Giveaways.json');

// Helper functions to load and save giveaways
function loadGiveaways() {
    if (!fs.existsSync(giveawaysFilePath)) {
        fs.writeFileSync(giveawaysFilePath, JSON.stringify({ giveaways: {} }, null, 2));
    }
    let data = JSON.parse(fs.readFileSync(giveawaysFilePath));
    if (!data.giveaways) data.giveaways = {};
    return data;
}

function saveGiveaways(data) {
    fs.writeFileSync(giveawaysFilePath, JSON.stringify(data, null, 2));
}

// A helper to safely send a reply if one hasn't already been sent
function safeReply(interaction, options) {
    if (interaction.replied || interaction.deferred) {
        return interaction.followUp(options);
    } else {
        return interaction.reply(options);
    }
}
// Alias safeFollowUp to safeReply for clarity.
const safeFollowUp = safeReply;

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        // Only process button interactions
        if (!interaction.isButton()) return;

        // Load giveaway data from JSON using the message's ID as key
        const giveawaysData = loadGiveaways();
        if (!interaction.message || !giveawaysData.giveaways[interaction.message.id]) return;
        const giveaway = giveawaysData.giveaways[interaction.message.id];

        // Ensure participants is an array
        if (!Array.isArray(giveaway.participants)) {
            giveaway.participants = [];
            saveGiveaways(giveawaysData);
        }

        // Helper: pick winners randomly (without repeats)
        function pickWinners(participants, count) {
            if (participants.length <= count) return participants;
            const winners = [];
            const copy = [...participants];
            for (let i = 0; i < count; i++) {
                const idx = Math.floor(Math.random() * copy.length);
                winners.push(copy[idx]);
                copy.splice(idx, 1);
            }
            return winners;
        }

        // Handle button interactions based on customId
        if (interaction.customId === 'join_giveaway') {
            // Only allow joining if the giveaway is active
            if (giveaway.status !== 'active') {
                return safeFollowUp(interaction, { content: 'This giveaway has ended. You cannot join now.', ephemeral: true });
            }
            if (giveaway.participants.includes(interaction.user.id)) {
                return safeFollowUp(interaction, { content: 'You have already joined the giveaway!', ephemeral: true });
            }
            giveaway.participants.push(interaction.user.id);
            saveGiveaways(giveawaysData);

            // Update the button label to "Join Giveaway" without participant count
            const currentComponents = interaction.message.components;
            if (currentComponents.length > 0) {
                const row = ActionRowBuilder.from(currentComponents[0]);
                const updatedComponents = row.components.map(button => {
                    if (button.customId === 'join_giveaway') {
                        return ButtonBuilder.from(button).setLabel('Join Giveaway');
                    }
                    return button;
                });
                row.setComponents(updatedComponents);
                await interaction.message.edit({ components: [row] });
            }

            // Update the embed participants field
            const embed = EmbedBuilder.from(interaction.message.embeds[0]);
            const currentParticipants = giveaway.participants.length;
            // Update the participants field at the bottom (do not create a new field at the top)
            const newFields = embed.data.fields.filter(field => field.name !== 'Participants');
            newFields.push({ name: 'Participants', value: `${currentParticipants}`, inline: false });
            embed.data.fields = newFields;

            // Update the message with the new embed
            await interaction.message.edit({ embeds: [embed] });

            return safeFollowUp(interaction, { content: `You joined the giveaway! Total participants: ${currentParticipants}`, ephemeral: true });
        }
        else if (interaction.customId === 'edit_description') {
            // Only the giveaway creator can edit the description.
            if (interaction.user.id !== giveaway.creatorId) {
                return safeReply(interaction, { content: 'Only the giveaway creator can edit the description.', ephemeral: true });
            }
            // For demonstration, update with placeholder text.
            giveaway.embedData.description = 'This giveaway description was updated by the creator.';
            saveGiveaways(giveawaysData);

            const embed = EmbedBuilder.from(interaction.message.embeds[0]);
            embed.setDescription(giveaway.embedData.description);
            await interaction.message.edit({ embeds: [embed] });
            return safeReply(interaction, { content: 'Giveaway description updated!', ephemeral: true });
        }
        else if (interaction.customId === 'reroll_winner') {
            // Only the giveaway creator or an administrator can re-roll winners.
            if (interaction.user.id !== giveaway.creatorId && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return safeReply(interaction, { content: 'You do not have permission to re-roll winners.', ephemeral: true });
            }
            if (giveaway.participants.length === 0) {
                return safeReply(interaction, { content: 'There are no participants for a re-roll.', ephemeral: true });
            }
            const winners = pickWinners(giveaway.participants, giveaway.numWinners);
            giveaway.winners = winners;
            saveGiveaways(giveawaysData);

            // Update the embed with new winner information.
            const embed = EmbedBuilder.from(interaction.message.embeds[0]);
            const newFields = (embed.data.fields || []).filter(field => field.name !== 'Winner(s)');
            embed.data.fields = newFields;
            embed.addFields({ name: 'Winner(s)', value: winners.map(id => `<@${id}>`).join(', '), inline: false });
            await interaction.message.edit({ embeds: [embed] });

            return safeReply(interaction, { 
                content: `New winner(s): ${winners.map(id => `<@${id}>`).join(', ')}`, 
                allowedMentions: { parse: ['users'] },
                ephemeral: true 
            });
        }
        else if (interaction.customId === 'new_giveaway') {
            // Only the giveaway creator can start a new giveaway.
            if (interaction.user.id !== giveaway.creatorId) {
                return safeReply(interaction, { content: 'Only the giveaway creator can start a new giveaway.', ephemeral: true });
            }
            return safeReply(interaction, { content: 'Please use the /giveaway command to start a new giveaway.', ephemeral: true });
        }
        else if (interaction.customId === 'close_giveaway') {
            // Only the giveaway creator may close the giveaway.
            if (interaction.user.id !== giveaway.creatorId) {
                return safeReply(interaction, { content: 'Only the giveaway creator can close this giveaway.', ephemeral: true });
            }
            giveaway.status = 'closed';
            saveGiveaways(giveawaysData);

            // Update the embed to indicate closure and disable all buttons.
            const embed = EmbedBuilder.from(interaction.message.embeds[0]);
            embed.addFields({ name: 'Status', value: 'Closed', inline: false });
            const disabledRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('join_giveaway')
                    .setLabel('Join Giveaway')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('edit_description')
                    .setLabel('Edit Description')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('reroll_winner')
                    .setLabel('Re-roll Winner')
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('new_giveaway')
                    .setLabel('New Giveaway')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('close_giveaway')
                    .setLabel('Close Giveaway')
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(true)
            );
            await interaction.message.edit({ embeds: [embed], components: [disabledRow] });
            return safeReply(interaction, { content: 'Giveaway closed.', ephemeral: true });
        }
    }
};