const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const FILE_PATH = path.join(process.cwd(), 'src', 'Json', 'users.json');

function getTotalXPForLevel(level) {
  return 100 * Math.pow(1.5, level - 1);
}

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    if (!interaction.isModalSubmit()) return;
    
    const { customId } = interaction;
    if (customId === 'custom_background_modal') {
      await handleCustomBackgroundSubmit(interaction);
    }
  }
};

async function handleCustomBackgroundSubmit(interaction) {
  try {
    await interaction.deferReply({ ephemeral: true });
    
    const userId = interaction.user.id;
    const backgroundUrl = interaction.fields.getTextInputValue('backgroundUrl').trim();
    
    if (!/^https?:\/\//.test(backgroundUrl)) {
      return interaction.editReply({ 
        content: 'Invalid URL. Please enter a valid image URL that starts with http:// or https://',
        ephemeral: true 
      });
    }
    
    let usersData = {};
    try {
      if (fs.existsSync(FILE_PATH)) {
        const data = fs.readFileSync(FILE_PATH, 'utf8');
        usersData = JSON.parse(data);
      }
    } catch (err) {
      console.error("Error reading user data:", err);
      return interaction.editReply({ content: 'Error reading user data.', ephemeral: true });
    }
    
    if (!usersData[userId]) {
      usersData[userId] = { 
        xp: 0, 
        level: 1, 
        lastXPTime: 0,
        username: interaction.user.username
      };
    }
    
    usersData[userId].background = backgroundUrl;
    
    try {
      fs.writeFileSync(FILE_PATH, JSON.stringify(usersData, null, 2), 'utf8');
    } catch (writeErr) {
      console.error("Error writing user data:", writeErr);
      return interaction.editReply({ content: 'Error saving background data.', ephemeral: true });
    }
    
    // Refresh the rank card preview
    try {
      const apiUrl = `http://51.161.76.212:8104/api/rank-card/${userId}`;
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error('Failed to fetch rank card');
      
      const buffer = await response.buffer();
      
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`customize_bg_${userId}`).setLabel('Change Background').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`customize_theme_${userId}`).setLabel('Change Theme').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`view_badges_${userId}`).setLabel('View Badges').setStyle(ButtonStyle.Success)
      );
      
      function getRank(usersData, userId) {
        const sortedUsers = Object.entries(usersData)
          .map(([id, data]) => ({ id, level: data.level || 1, xp: data.xp || 0 }))
          .sort((a, b) => (b.level !== a.level ? b.level - a.level : b.xp - a.xp));
        const userRank = sortedUsers.findIndex(user => user.id === userId) + 1;
        return userRank || sortedUsers.length + 1;
      }
      
      const userData = usersData[userId];
      const rank = getRank(usersData, userId);
      const totalXp = userData.xp || 0;
      const nextLevelXP = getTotalXPForLevel(userData.level + 1);
      const xpNeeded = nextLevelXP - totalXp;
      
      const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle(`${interaction.user.username}'s Profile`)
        .setDescription(`Here's your current rank card and stats!`)
        .addFields(
          { name: 'Current Level', value: `${userData.level || 1}`, inline: true },
          { name: 'Rank', value: `#${rank}`, inline: true },
          { name: 'XP', value: `${totalXp.toLocaleString()} / ${nextLevelXP.toLocaleString()}`, inline: true },
          { name: 'Next Level In', value: `${xpNeeded.toLocaleString()} XP`, inline: true }
        )
        .setFooter({ text: 'Use the buttons below to customize your rank card' });
      
      await interaction.editReply({
        content: 'Your background has been updated successfully!',
        files: [{ attachment: buffer, name: 'rank-card.png' }],
        embeds: [embed],
        components: [row]
      });
    } catch (previewError) {
      console.error('Error refreshing rank card after custom background:', previewError);
      await interaction.editReply({ 
        content: 'Your background was set, but there was an error generating the preview. Try using the rank command again.',
        ephemeral: true 
      });
    }
  } catch (error) {
    console.error('Error handling custom background submission:', error);
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: 'There was an error processing your request.', ephemeral: true });
    } else {
      await interaction.reply({ content: 'There was an error processing your request.', ephemeral: true });
    }
  }
}
