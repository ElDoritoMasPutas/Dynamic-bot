const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');
const { EmbedBuilder } = require('discord.js');

// Replace with your valid API keys
const TENOR_API_KEY = 'AIzaSyCf5MRUQpnAlZkwYqwoCPN7GIQiIWaUXlg';
const GIPHY_API_KEY = 'pbRAFuZKQVgxZCQTuZwLyP9wo8xNDOEI';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gif')
        .setDescription('Fetches a random GIF based on the search term provided')
        .addStringOption(option => 
            option.setName('query')
                .setDescription('Search term for the GIF')
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply(); // Defer reply to handle delays
        
        const searchTerm = interaction.options.getString('query');
        let gifUrl = '';

        // Choose randomly between Giphy or Tenor
        const gifSource = Math.random() < 0.5 ? 'giphy' : 'tenor';

        if (gifSource === 'giphy') {
            try {
                const response = await axios.get(`https://api.giphy.com/v1/gifs/search`, {
                    params: {
                        api_key: GIPHY_API_KEY,
                        q: searchTerm,
                        limit: 1,
                        offset: Math.floor(Math.random() * 50),
                        rating: 'r'
                    }
                });
                const gifData = response.data.data[0];
                gifUrl = gifData ? gifData.images.original.url : null;
            } catch (error) {
                console.error("Error fetching Giphy GIF:", error);
                return interaction.editReply("Couldn't find a GIF on Giphy for that search term.");
            }
        } else {
            try {
                const response = await axios.get('https://g.tenor.com/v2/search', {
                    params: {
                        key: TENOR_API_KEY,
                        q: searchTerm,
                        limit: 1
                    }
                });
                const gifData = response.data.results[0];
                gifUrl = gifData ? gifData.media_formats.gif.url : null;
            } catch (error) {
                console.error("Error fetching Tenor GIF:", error);
                return interaction.editReply("Couldn't find a GIF on Tenor for that search term.");
            }
        }

        if (!gifUrl) {
            return interaction.editReply("Sorry, I couldn't find any GIFs for your search term.");
        }

        const gifEmbed = new EmbedBuilder()
            .setColor('#00FF99')
            .setTitle(`Here's your GIF for: ${searchTerm}`)
            .setImage(gifUrl)
            .setFooter({ text: `Sourced from ${gifSource}` })
            .setTimestamp();

        await interaction.editReply({ embeds: [gifEmbed] });
    },
};