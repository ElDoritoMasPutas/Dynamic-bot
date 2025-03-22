const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const FILE_PATH = path.join(process.cwd(), 'src', 'Json', 'users.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Check your global level and XP rank')
    .addUserOption(option =>
      option.setName('user').setDescription('User to check').setRequired(false)
    )
    .addBooleanOption(option => 
      option.setName('ephemeral').setDescription('Show the result only to you').setRequired(false)
    ),
  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const userId = user.id;
    const ephemeral = interaction.options.getBoolean('ephemeral') || false;
    
    // Read the global user data from disk
    let usersData = {};
    try {
      if (fs.existsSync(FILE_PATH)) {
        const data = fs.readFileSync(FILE_PATH, 'utf8');
        usersData = JSON.parse(data);
      }
    } catch (err) {
      console.error("Error reading user data:", err);
      return interaction.reply({ content: 'Error reading user data.', ephemeral: true });
    }
    
    // Use the existing data for the user if available; otherwise, use default values without writing back.
    const userData = usersData[userId] || { xp: 0, level: 1, lastXPTime: 0 };

    // Now, fetch the rank card from the API which uses the global JSON data.
    try {
      // Defer the reply to give time for the image to be generated
      await interaction.deferReply({ ephemeral });
      
      const apiUrl = `http://51.161.76.212:8104/api/rank-card/${userId}`;
      const response = await fetch(apiUrl);
      
      if (!response.ok) throw new Error('Failed to fetch rank card');
      
      const buffer = await response.buffer();
      
      // Create a row of buttons for customization if looking at own profile
      const isOwnProfile = interaction.user.id === userId;
      
      if (isOwnProfile) {
        // Create buttons for customization
        const row = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId(`customize_bg_${userId}`)
              .setLabel('Change Background')
              .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
              .setCustomId(`customize_theme_${userId}`)
              .setLabel('Change Theme')
              .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
              .setCustomId(`view_badges_${userId}`)
              .setLabel('View Badges')
              .setStyle(ButtonStyle.Success)
          );
        
        // Get some stats about the user
        const rank = getRank(usersData, userId);
        const totalXp = userData.xp || 0;
        const nextLevelXP = getTotalXPForLevel(userData.level + 1);
        const xpNeeded = nextLevelXP - totalXp;
        
        // Create an embed with additional information
        const embed = new EmbedBuilder()
          .setColor('#5865F2')
          .setTitle(`${user.displayName}'s Profile`)
          .setDescription(`Here's your current rank card and stats!`)
          .addFields(
            { name: 'Current Level', value: `${userData.level || 1}`, inline: true },
            { name: 'Rank', value: `#${rank}`, inline: true },
            { name: 'XP', value: `${totalXp.toLocaleString()} / ${nextLevelXP.toLocaleString()}`, inline: true },
            { name: 'Next Level In', value: `${xpNeeded.toLocaleString()} XP`, inline: true }
          )
          .setFooter({ text: 'Use the buttons below to customize your rank card' });
          
        // Send the rank card with the embed and buttons
        await interaction.editReply({
          files: [{ attachment: buffer, name: 'rank-card.png' }],
          embeds: [embed],
          components: [row]
        });
      } else {
        // Just send the rank card for other users
        await interaction.editReply({
          files: [{ attachment: buffer, name: 'rank-card.png' }]
        });
      }
    } catch (error) {
      console.error('Error fetching rank card:', error);
      await interaction.editReply('Sorry, there was an error generating the rank card.');
    }
  }
};

// Helper function to get the user's rank
function getRank(usersData, userId) {
  // Sort users by XP and determine rank
  const sortedUsers = Object.entries(usersData)
    .map(([id, data]) => ({
      id,
      level: data.level || 1,
      xp: data.xp || 0
    }))
    .sort((a, b) => {
      if (b.level !== a.level) return b.level - a.level;
      return b.xp - a.xp;
    });
  
  const userRank = sortedUsers.findIndex(user => user.id === userId) + 1;
  return userRank || sortedUsers.length + 1;
}

// Helper function to calculate XP for next level
function getTotalXPForLevel(level) {
  return 100 * Math.pow(1.5, level - 1);
}