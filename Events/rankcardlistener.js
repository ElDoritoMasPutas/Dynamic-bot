const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

// Adjust this path if needed:
const FILE_PATH = path.join(process.cwd(), 'src', 'Json', 'users.json');

// Import your single THEMES from a dedicated themes.js
// (Adjust the path to wherever you placed themes.js)
const THEMES = require('../Utils/themes.js');

// Backgrounds array
const BACKGROUNDS = [
  { name: 'Charizard X', url: 'https://www.pngkit.com/png/full/132-1322393_mega-charizard-x-by-mrmagikman-on-deviantart-picture.png' },
  { name: 'Dark Forest', url: 'https://images4.alphacoders.com/113/113596.jpg' },
  { name: 'Galaxy', url: 'https://i.ibb.co/r2ZS59mX/galaxy.jpg' },
  { name: 'Mountains', url: 'https://i.ibb.co/yc1BR7Tn/mountains.jpg' },
  { name: 'Cyberpunk City', url: 'https://i.ibb.co/MwQLZpM/cyber-punk-city-1.jpg' },
  { name: 'Pixel Art', url: 'https://i.ibb.co/V0RDd97r/pixel-art.jpg' },
  { name: 'Abstract Blue', url: 'https://i.ibb.co/whcPW9hg/blue-abstract.jpg' },
  { name: 'Gaming', url: 'https://i.ibb.co/Lzc6SRkR/god-of-war.jpg' }
];

// Helper function to calculate XP for next level
function getTotalXPForLevel(level) {
  return 100 * Math.pow(1.5, level - 1);
}

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    // We handle BOTH button & select menu interactions in this file
    if (interaction.isButton()) {
      await handleButtonInteraction(interaction);
    } else if (interaction.isStringSelectMenu()) {
      await handleSelectMenuInteraction(interaction);
    }
  },
};

// -------------------- MAIN HANDLERS --------------------

async function handleButtonInteraction(interaction) {
  const { customId } = interaction;
  
  if (customId.startsWith('customize_bg_')) {
    await handleBackgroundCustomization(interaction);
  } else if (customId.startsWith('customize_theme_')) {
    await handleThemeCustomization(interaction);
  } else if (customId.startsWith('view_badges_')) {
    await handleViewBadges(interaction);
  } else if (customId === 'custom_bg_url') {
    await showCustomBackgroundModal(interaction);
  } else if (customId === 'back_to_rank') {
    // Refresh the card, but do NOT defer again
    await refreshRankCard(interaction);
  }
}

async function handleSelectMenuInteraction(interaction) {
  // We do a single deferral here, so we can editReply later
  await interaction.deferReply({ ephemeral: true });

  const { customId, values } = interaction;
  const selectedValue = values[0];
  const userId = interaction.user.id;

  // If user is choosing a background
  if (customId.startsWith('select_bg_')) {
    if (selectedValue === 'custom_url') {
      // Show the custom background modal
      const modal = new ModalBuilder()
        .setCustomId('custom_background_modal')
        .setTitle('Custom Background');
      const backgroundUrlInput = new TextInputBuilder()
        .setCustomId('backgroundUrl')
        .setLabel('Enter the URL of your background image')
        .setPlaceholder('https://example.com/your-image.jpg')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
      const firstActionRow = new ActionRowBuilder().addComponents(backgroundUrlInput);
      modal.addComponents(firstActionRow);
      return await interaction.showModal(modal);
    } else {
      // Save the background to JSON
      await updateUserBackground(userId, selectedValue);
      await refreshRankCard(interaction);
      // Because we've already deferredReply, we just editReply in refreshRankCard
    }
  }
  // If user is choosing a theme
  else if (customId.startsWith('select_theme_')) {
    const selectedTheme = THEMES[selectedValue];
    if (!selectedTheme) {
      return interaction.followUp({ content: 'Invalid theme selection.', ephemeral: true });
    }
    // Save the theme
    await updateUserTheme(userId, selectedTheme);
    await refreshRankCard(interaction);
    // Follow up with confirmation
    await interaction.followUp({
      content: `Theme changed to **${selectedTheme.name}**! Your rank card will now use this theme's colors.`,
      ephemeral: true
    });
  }
}

// -------------------- BUTTON FUNCTIONS --------------------

async function handleBackgroundCustomization(interaction) {
  try {
    // Defer ephemeral reply once
    await interaction.deferReply({ ephemeral: true });
    
    const userId = interaction.user.id;
    // Build a dropdown for backgrounds
    const backgroundOptions = BACKGROUNDS.map(bg => ({
      label: bg.name,
      value: bg.url,
      description: `Set your background to ${bg.name}`
    }));
    backgroundOptions.push({
      label: 'Custom URL',
      value: 'custom_url',
      description: 'Use your own image URL as background'
    });
    
    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`select_bg_${userId}`)
        .setPlaceholder('Choose a background')
        .addOptions(backgroundOptions)
    );
    
    const backButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('back_to_rank')
        .setLabel('Back to Rank Card')
        .setStyle(ButtonStyle.Secondary)
    );
    
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('Background Customization')
      .setDescription('Choose a background from the dropdown or add a custom URL.')
      .setFooter({ text: 'The preview will update after you make your selection' });
    
    // Because we've deferred, we now do editReply
    await interaction.editReply({ embeds: [embed], components: [row, backButton] });
  } catch (error) {
    console.error('Error handling background customization:', error);
    await interaction.editReply({ content: 'There was an error processing your request.' });
  }
}

async function handleThemeCustomization(interaction) {
  try {
    await interaction.deferReply({ ephemeral: true });
    
    const userId = interaction.user.id;
    // Build theme dropdown
    const themeOptions = Object.entries(THEMES).map(([key, theme]) => ({
      label: theme.name,
      value: key,
      description: `Set your theme to ${theme.name}`
    }));
    
    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`select_theme_${userId}`)
        .setPlaceholder('Choose a theme')
        .addOptions(themeOptions)
    );
    
    const backButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('back_to_rank')
        .setLabel('Back to Rank Card')
        .setStyle(ButtonStyle.Secondary)
    );
    
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('Theme Customization')
      .setDescription('Choose a color theme for your rank card from the dropdown menu below.')
      .setFooter({ text: 'The preview will update after you make your selection' });
    
    await interaction.editReply({ embeds: [embed], components: [row, backButton] });
  } catch (error) {
    console.error('Error handling theme customization:', error);
    await interaction.editReply({ content: 'There was an error processing your request.' });
  }
}

async function handleViewBadges(interaction) {
  try {
    await interaction.deferReply({ ephemeral: true });
    
    const userId = interaction.user.id;
    let usersData = {};
    try {
      if (fs.existsSync(FILE_PATH)) {
        const data = fs.readFileSync(FILE_PATH, 'utf8');
        usersData = JSON.parse(data);
      }
    } catch (err) {
      console.error("Error reading user data:", err);
      return interaction.editReply({ content: 'Error reading user data.' });
    }
    
    const userData = usersData[userId] || { badges: [] };
    const badges = userData.badges || [];
    
    const backButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('back_to_rank')
        .setLabel('Back to Rank Card')
        .setStyle(ButtonStyle.Secondary)
    );
    
    if (badges.length === 0) {
      const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('Your Badges')
        .setDescription('You do not have any badges yet. Earn badges by participating in events!')
        .setFooter({ text: 'Check back later for new badges' });
      return interaction.editReply({ embeds: [embed], components: [backButton] });
    }
    
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('Your Badges')
      .setDescription('Here are all the badges you have earned:');
    
    badges.forEach((badge, index) => {
      embed.addFields({
        name: `${index + 1}. ${badge.name}`,
        value: `Awarded: ${new Date(badge.awarded).toLocaleDateString()}`
      });
    });
    
    embed.setFooter({ text: `You have ${badges.length} badge(s)` });
    
    await interaction.editReply({ embeds: [embed], components: [backButton] });
  } catch (error) {
    console.error('Error handling badge viewing:', error);
    await interaction.editReply({ content: 'There was an error processing your request.' });
  }
}

async function showCustomBackgroundModal(interaction) {
  try {
    const modal = new ModalBuilder()
      .setCustomId('custom_background_modal')
      .setTitle('Custom Background');
    
    const backgroundUrlInput = new TextInputBuilder()
      .setCustomId('backgroundUrl')
      .setLabel('Enter the URL of your background image')
      .setPlaceholder('https://example.com/your-image.jpg')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);
    
    const firstActionRow = new ActionRowBuilder().addComponents(backgroundUrlInput);
    modal.addComponents(firstActionRow);
    
    // For modals, we just showModal; no ephemeral reply needed
    await interaction.showModal(modal);
  } catch (error) {
    console.error('Error showing custom background modal:', error);
    await interaction.reply({ content: 'There was an error processing your request.', ephemeral: true });
  }
}

// -------------------- REFRESH RANK CARD --------------------

async function refreshRankCard(interaction) {
  try {
    // DO NOT defer again here, because we already did in the calling function
    // just read data and edit the existing ephemeral reply
    
    const userId = interaction.user.id;
    let usersData = {};
    try {
      if (fs.existsSync(FILE_PATH)) {
        const data = fs.readFileSync(FILE_PATH, 'utf8');
        usersData = JSON.parse(data);
      }
    } catch (err) {
      console.error("Error reading user data:", err);
      return interaction.editReply({ content: 'Error reading user data.' });
    }
    
    const userData = usersData[userId] || { xp: 0, level: 1 };
    
    // Fetch rank card from your API
    const apiUrl = `http://51.161.76.212:8104/api/rank-card/${userId}`;
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error('Failed to fetch rank card');
    
    const buffer = await response.buffer();
    
    // Create customization buttons
    const row = new ActionRowBuilder().addComponents(
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
    
    // Calculate rank, XP, etc.
    function getRank(users, id) {
      const sorted = Object.entries(users).map(([uid, data]) => ({
        uid,
        level: data.level || 1,
        xp: data.xp || 0
      })).sort((a, b) => {
        if (b.level !== a.level) return b.level - a.level;
        return b.xp - a.xp;
      });
      const userRank = sorted.findIndex(u => u.uid === id) + 1;
      return userRank || sorted.length + 1;
    }
    
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
    
    // If user has a theme, display it
    if (userData.theme && userData.theme.name) {
      embed.addFields({ name: 'Current Theme', value: userData.theme.name, inline: true });
    }
    
    // Now edit the ephemeral reply we already deferred
    await interaction.editReply({
      files: [{ attachment: buffer, name: 'rank-card.png' }],
      embeds: [embed],
      components: [row]
    });
  } catch (error) {
    console.error('Error refreshing rank card:', error);
    await interaction.editReply({ content: 'There was an error refreshing your rank card.' });
  }
}

// -------------------- HELPER: UPDATE JSON --------------------

async function updateUserBackground(userId, backgroundUrl) {
  let usersData = {};
  if (fs.existsSync(FILE_PATH)) {
    const data = fs.readFileSync(FILE_PATH, 'utf8');
    usersData = JSON.parse(data);
  }
  if (!usersData[userId]) {
    usersData[userId] = { xp: 0, level: 1, username: userId };
  }
  usersData[userId].background = backgroundUrl;
  fs.writeFileSync(FILE_PATH, JSON.stringify(usersData, null, 2), 'utf8');
}

async function updateUserTheme(userId, theme) {
  let usersData = {};
  if (fs.existsSync(FILE_PATH)) {
    const data = fs.readFileSync(FILE_PATH, 'utf8');
    usersData = JSON.parse(data);
  }
  if (!usersData[userId]) {
    usersData[userId] = { xp: 0, level: 1, username: userId };
  }
  usersData[userId].theme = theme;
  fs.writeFileSync(FILE_PATH, JSON.stringify(usersData, null, 2), 'utf8');
}
