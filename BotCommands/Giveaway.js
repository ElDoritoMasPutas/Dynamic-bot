const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
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

// Parse duration string (supports "1m", "1 minute", "2h", "2 hours", etc.)
function parseDuration(str) {
    let s = str.toLowerCase().trim();
    const regex = /^(\d+)\s*(m|minute|minutes|h|hour|hours)$/;
    const match = s.match(regex);
    if (!match) return null;
    const value = parseInt(match[1]);
    const unit = match[2];
    if (unit.startsWith('m')) {
        return value * 60000;
    } else if (unit.startsWith('h')) {
        return value * 3600000;
    } else {
        return null;
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('Start a giveaway')
        .addStringOption(option =>
            option.setName('title')
                .setDescription('Giveaway title')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('description')
                .setDescription('Giveaway description')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('duration')
                .setDescription('Duration (e.g. "1m", "1 minute", "2h", "2 hours")')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('winners')
                .setDescription('Number of winners')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('image')
                .setDescription('Image URL for the giveaway')
                .setRequired(false)),
    async execute(interaction) {
        // Check (or create) a giveaway role to ping
        let giveawayRole = interaction.guild.roles.cache.find(role => role.name === 'giveaway');
        if (!giveawayRole) {
            try {
                giveawayRole = await interaction.guild.roles.create({
                    name: 'giveaway',
                    mentionable: true, // Make sure the role is mentionable
                    reason: 'Needed for giveaway pings'
                });
            } catch (error) {
                return interaction.reply({ 
                    content: 'Error: Could not create the giveaway role.', 
                    ephemeral: true 
                });
            }
        }
        
        // Get options from the slash command
        const title = interaction.options.getString('title');
        const description = interaction.options.getString('description');
        const durationStr = interaction.options.getString('duration');
        const durationMs = parseDuration(durationStr);
        if (!durationMs) {
            return interaction.reply({ 
                content: 'Invalid duration format. Use formats like "1m", "1 minute", "2h", or "2 hours".', 
                ephemeral: true 
            });
        }
        const numWinners = interaction.options.getInteger('winners');
        const imageUrl = interaction.options.getString('image');
        const endTimestamp = Date.now() + durationMs;
        
        // Format duration nicely for display
        let displayDuration;
        if (durationMs >= 3600000) {
            const hours = durationMs / 3600000;
            displayDuration = `${hours} hour(s)`;
        } else {
            const minutes = durationMs / 60000;
            displayDuration = `${minutes} minute(s)`;
        }
        
        // Build the giveaway embed
        const embed = new EmbedBuilder()
            .setAuthor({ 
                name: interaction.client.user.username, 
                iconURL: interaction.client.user.displayAvatarURL({ dynamic: true })
            })
            .setTitle(title)
            .setDescription(description)
            .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
            .addFields(
                { name: "Started by", value: `<@${interaction.user.id}>`, inline: true },
                { name: "Duration", value: displayDuration, inline: true },
                { name: "Winners", value: `${numWinners}`, inline: true },
                { name: "Participants", value: "0", inline: true }
            )
            .setFooter({ 
                text: `${interaction.guild.name} giveaway system`, 
                iconURL: interaction.client.user.displayAvatarURL({ dynamic: true })
            })
            .setTimestamp();
        
        if (imageUrl) embed.setImage(imageUrl);
        
        // Create a static join button
        const joinButton = new ButtonBuilder()
            .setCustomId('join_giveaway')
            .setLabel('Join Giveaway')
            .setStyle(ButtonStyle.Primary);
        
        const row = new ActionRowBuilder().addComponents(joinButton);
        
        // Send the giveaway announcement and fetch the message
        const giveawayMessage = await interaction.reply({
            content: `A new giveaway has started <@&${giveawayRole.id}>!`,
            embeds: [embed],
            components: [row],
            fetchReply: true,
            allowedMentions: {
                roles: [giveawayRole.id] // Ensure the role mention is allowed
            }
        });
        
        // Save giveaway data to JSON
        const giveawaysData = loadGiveaways();
        giveawaysData.giveaways[giveawayMessage.id] = {
            guildId: interaction.guild.id,
            channelId: interaction.channel.id,
            messageId: giveawayMessage.id,
            creatorId: interaction.user.id,
            participants: [],
            embedData: {
                title: title,
                description: description,
                creator: interaction.user.id,
                image: imageUrl || null
            },
            numWinners: numWinners,
            duration: durationMs,
            status: 'active',
            endTimestamp: endTimestamp
        };
        saveGiveaways(giveawaysData);
        
        // The command only creates the giveaway; the scheduling and winner selection is handled by an event.
    }
};
