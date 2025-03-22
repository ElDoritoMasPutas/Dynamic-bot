const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

const giveawaysFilePath = path.join(__dirname, '../Json/Giveaways.json');
const archivedGiveawaysFilePath = path.join(__dirname, '../Json/archivedGiveaways.json');

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

// Helper functions for archived giveaways
function loadArchivedGiveaways() {
    if (!fs.existsSync(archivedGiveawaysFilePath)) {
        fs.writeFileSync(archivedGiveawaysFilePath, JSON.stringify({ archived: {} }, null, 2));
    }
    let data = JSON.parse(fs.readFileSync(archivedGiveawaysFilePath));
    if (!data.archived) data.archived = {};
    return data;
}

function saveArchivedGiveaways(data) {
    fs.writeFileSync(archivedGiveawaysFilePath, JSON.stringify(data, null, 2));
}

// Helper function to pick winners randomly (without repeats)
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

module.exports = {
    name: 'ready',
    once: false,
    async execute(client) {
        console.log(`Giveaway scheduler running...`);
        setInterval(async () => {
            const giveawaysData = loadGiveaways();
            const now = Date.now();

            for (const messageId in giveawaysData.giveaways) {
                const giveaway = giveawaysData.giveaways[messageId];

                if (giveaway.status === 'active' && now >= giveaway.endTimestamp) {
                    try {
                        const guild = client.guilds.cache.get(giveaway.guildId);
                        if (!guild) continue;
                        const channel = guild.channels.cache.get(giveaway.channelId);
                        if (!channel) continue;
                        const giveawayMessage = await channel.messages.fetch(giveaway.messageId);
                        
                        // Pick winners from participants
                        const winners = giveaway.participants.length > 0 
                            ? pickWinners(giveaway.participants, giveaway.numWinners)
                            : [];
                        
                        // Update giveaway status details
                        giveaway.status = 'ended';
                        giveaway.winners = winners;
                        saveGiveaways(giveawaysData);
                        
                        // Update the embed with winner information
                        const oldEmbed = giveawayMessage.embeds[0];
                        const endedEmbed = EmbedBuilder.from(oldEmbed);
                        if (winners.length > 0) {
                            endedEmbed.addFields({ 
                                name: "Winner(s)", 
                                value: winners.map(id => `<@${id}>`).join(', '), 
                                inline: false 
                            });
                        } else {
                            endedEmbed.addFields({ 
                                name: "Winner(s)", 
                                value: 'No participants', 
                                inline: false 
                            });
                        }
                        
                        // Create extra buttons for the creator to use (edit, re-roll, new giveaway, close)
                        const editButton = new ButtonBuilder()
                            .setCustomId('edit_description')
                            .setLabel('Edit Description')
                            .setStyle(ButtonStyle.Secondary);
                        const rerollButton = new ButtonBuilder()
                            .setCustomId('reroll_winner')
                            .setLabel('Re-roll Winner')
                            .setStyle(ButtonStyle.Success);
                        const newGiveawayButton = new ButtonBuilder()
                            .setCustomId('new_giveaway')
                            .setLabel('New Giveaway')
                            .setStyle(ButtonStyle.Primary);
                        const closeButton = new ButtonBuilder()
                            .setCustomId('close_giveaway')
                            .setLabel('Close Giveaway')
                            .setStyle(ButtonStyle.Danger);
                        const extraRow = new ActionRowBuilder()
                            .addComponents(editButton, rerollButton, newGiveawayButton, closeButton);
                        
                        await giveawayMessage.edit({
                            embeds: [endedEmbed],
                            components: [extraRow]
                        });
                        
                        // Optionally, send a follow-up message to announce winners
                        if (winners.length > 0) {
                            await channel.send(`Giveaway ended! Winner(s): ${winners.map(id => `<@${id}>`).join(', ')}`);
                        } else {
                            await channel.send(`Giveaway ended with no participants.`);
                        }
                    } catch (error) {
                        console.error(`Error processing giveaway ${messageId}:`, error);
                    } finally {
                        // Archive the giveaway and remove it from active giveaways
                        const archivedData = loadArchivedGiveaways();
                        archivedData.archived[messageId] = giveaway;
                        saveArchivedGiveaways(archivedData);

                        delete giveawaysData.giveaways[messageId];
                        saveGiveaways(giveawaysData);
                    }
                }
            }
        }, 30000); // Check every 30 seconds
    }
};
