const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Global user data file path (using the src/Json folder)
const FILE_PATH = path.join(process.cwd(), 'src', 'Json', 'users.json');

// Helper function to calculate total XP required for a given level
function getTotalXPForLevel(level) {
  return 100 * Math.pow(1.5, level - 1);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leveleditxp')
    .setDescription('Edit a user’s level and XP progress')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(option =>
      option
        .setName('target')
        .setDescription('The user whose level you want to edit')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName('level')
        .setDescription('The new level to set (must be greater than 0)')
        .setRequired(true)
    ),

  async execute(interaction) {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }
    
    const targetUser = interaction.options.getUser('target');
    const targetLevel = interaction.options.getInteger('level');
    
    if (targetLevel <= 0) {
      return interaction.reply({ content: 'Please provide a valid level greater than 0.', ephemeral: true });
    }
    
    // Read the current global user data
    let usersData = {};
    if (fs.existsSync(FILE_PATH)) {
      try {
        const data = fs.readFileSync(FILE_PATH, 'utf8');
        usersData = JSON.parse(data);
      } catch (err) {
        console.error('Error reading user data:', err);
        return interaction.reply({ content: 'There was an error reading the user data.', ephemeral: true });
      }
    }
    
    // Initialize target user's data if it doesn't exist
    if (!usersData[targetUser.id]) {
      usersData[targetUser.id] = { xp: 0, level: 1, lastXPTime: 0 };
    }
    
    const currentData = usersData[targetUser.id];
    // Calculate the current XP progress within the user's level
    // (This part might be a bit arbitrary; adjust as needed.)
    const currentLevelBaseXP = getTotalXPForLevel(currentData.level);
    const xpProgress = currentData.xp - currentLevelBaseXP;
    
    // Calculate the total XP for the target level and update XP accordingly
    const targetLevelBaseXP = getTotalXPForLevel(targetLevel);
    const newXP = targetLevelBaseXP + xpProgress;
    
    // Update the user's global record and recalc requiredXP for next level
    currentData.level = targetLevel;
    currentData.xp = newXP;
    currentData.requiredXP = getTotalXPForLevel(targetLevel + 1);
    usersData[targetUser.id] = currentData;
    
    try {
      fs.writeFileSync(FILE_PATH, JSON.stringify(usersData, null, 2), 'utf8');
    } catch (err) {
      console.error('Error saving user data:', err);
      return interaction.reply({ content: 'There was an error saving the user data.', ephemeral: true });
    }
    
    // ***IMPORTANT: Update the in-memory collection as well***
    // Assuming your leveling system module exports a Collection named `users`
    // You might require that module here if it's in the same file, or use a shared variable.
    // For example, if you exported "users" from your levelingsystem.js:
    const leveling = require('../Events/levelingsystem.js'); // Adjust path as needed
    leveling.users.set(targetUser.id, currentData);
    
    // Create a fancy embed with an @mention for the target user and the command author
    const embed = new EmbedBuilder()
      .setAuthor({
        name: `Global Level Edited for ${targetUser.username}`,
        iconURL: targetUser.displayAvatarURL({ dynamic: true })
      })
      .setTitle('🛠️ Manual Level Adjustment')
      .setDescription(`The leveling record for <@${targetUser.id}> has been updated by <@${interaction.user.id}>.`)
      .addFields(
        { name: 'New Level', value: `**${targetLevel}**`, inline: true },
        { name: 'XP Updated', value: `**${newXP.toFixed(2)} XP**`, inline: true }
      )
      .setColor(0x000000)
      .setTimestamp()
      .setFooter({
        text: 'leveling system',
        iconURL: 'https://cdn.discordapp.com/avatars/1341505316675780702/ddc858659c9d9d51d8cde9f8cdb88657.webp?size=1024&format=webp'
      });
    
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
