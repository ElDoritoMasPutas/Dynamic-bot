const { SlashCommandBuilder } = require('@discordjs/builders');
const ytSearch = require('yt-search');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('youtube')
    .setDescription('Search for a YouTube video and post the link in the channel')
    .addStringOption(option =>
      option
        .setName('query')
        .setDescription('Search terms to find a YouTube video')
        .setRequired(true)
    ),

  async execute(interaction) {
    const searchQuery = interaction.options.getString('query'); // Retrieve the search query from the interaction

    try {
      // Perform YouTube search with the user's input
      const result = await ytSearch(searchQuery);

      // Check if any video results were found
      if (result.videos.length > 0) {
        const video = result.videos[0]; // Grab the first result
        await interaction.reply(`Here’s the top result for "${searchQuery}":\n${video.url}`);
      } else {
        await interaction.reply('No results found for your search query.');
      }
    } catch (error) {
      console.error('Error fetching YouTube video:', error);
      await interaction.reply('An error occurred while searching for the video.');
    }
  },
};
