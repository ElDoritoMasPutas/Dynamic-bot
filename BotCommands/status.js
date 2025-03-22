// Required imports
const fs = require('fs').promises;
const path = require('path');
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActivityType,
  EmbedBuilder,
} = require('discord.js'); // For v14

// Resolve the path to the root directory for status.json
const statusFilePath = path.resolve(__dirname, '../', 'Json', 'status.json');

let statusInterval;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Set the bot\'s status using the activity type and guild name')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(option =>
      option.setName('activitytype')
        .setDescription('The type of activity')
        .setRequired(true)
        .addChoices(
          { name: 'Watching', value: 'WATCHING' },
          { name: 'Listening', value: 'LISTENING' },
          { name: 'Playing', value: 'PLAYING' },
          { name: 'Streaming', value: 'STREAMING' },
          { name: 'Competing', value: 'COMPETING' },
        )),

  // Load the status when the bot starts
  loadStatus: async (client) => {
    try {
      // Check if status file exists
      await fs.access(statusFilePath);
      const statusData = JSON.parse(await fs.readFile(statusFilePath, 'utf-8'));

      if (statusData.activityType && statusData.guildName) {
        const activityMap = {
          WATCHING: ActivityType.Watching,
          LISTENING: ActivityType.Listening,
          PLAYING: ActivityType.Playing,
          STREAMING: ActivityType.Streaming,
          COMPETING: ActivityType.Competing,
        };

        const startTime = new Date(statusData.startTime || Date.now());
        const customStatus = `${statusData.activityTypeFormatted} ${statusData.guildName}`;

        client.user.setActivity(`${customStatus} | 0D|0H|0M`, { type: activityMap[statusData.activityType] });
        module.exports.startTimer(client, activityMap[statusData.activityType], customStatus, startTime);
      }
    } catch (error) {
      console.error('Error loading status:', error);
    }
  },

  // Start the timer to update the status periodically
  startTimer: (client, activityType, customStatus, startTime) => {
    if (statusInterval) clearInterval(statusInterval);

    statusInterval = setInterval(() => {
      const now = new Date();
      const elapsedMinutes = Math.floor((now - startTime) / 60000);

      const days = Math.floor(elapsedMinutes / 1440); // 1440 minutes in a day
      const hours = Math.floor((elapsedMinutes % 1440) / 60); // Remaining hours
      const minutes = elapsedMinutes % 60; // Remaining minutes

      // Format time as D|H|M
      const timeDisplay = `${days}D|${hours}H|${minutes}M`;
      client.user.setActivity(`${customStatus} | ${timeDisplay}`, { type: activityType });
    }, 15000); // Update every 15 seconds
  },

  // Execute the slash command
  async execute(interaction) {
    // Ensure the command is used in a guild
    if (!interaction.guild) {
      return interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
    }

    // Check if the user has the Administrator permission
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: 'You do not have permission to change the bot\'s status!', ephemeral: true });
    }

    try {
      const activityTypeInput = interaction.options.getString('activitytype').toUpperCase();

      // Validate activity type
      const activityMap = {
        WATCHING: ActivityType.Watching,
        LISTENING: ActivityType.Listening,
        PLAYING: ActivityType.Playing,
        STREAMING: ActivityType.Streaming,
        COMPETING: ActivityType.Competing,
      };

      if (!activityMap[activityTypeInput]) {
        return interaction.reply({ content: 'Invalid activity type! Please choose from WATCHING, LISTENING, PLAYING, STREAMING, or COMPETING.', ephemeral: true });
      }

      // Fetch the guild name where the command was issued
      const guildName = interaction.guild.name;

      // Generate the custom status message
      const activityTypeFormatted = activityTypeInput.charAt(0) + activityTypeInput.slice(1).toLowerCase(); // Capitalize first letter
      const customStatus = `${activityTypeFormatted} ${guildName}`;

      const startTime = new Date();
      const statusData = {
        activityType: activityTypeInput,
        activityTypeFormatted,
        guildName,
        startTime,
      };

      // Save the status data to the JSON file
      await fs.writeFile(statusFilePath, JSON.stringify(statusData, null, 2), 'utf-8');

      // Set the bot's activity
      interaction.client.user.setActivity(`${customStatus} | 0D|0H|0M`, { type: activityMap[activityTypeInput] });
      console.log('Status successfully updated with timer.');

      // Send an embedded reply to the user
      const embed = new EmbedBuilder()
        .setTitle('Status Updated')
        .setDescription(`Bot status has been updated to **${customStatus}**.`)
        .setColor(0x00AE86)
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });

      // Start the timer to update the status periodically
      module.exports.startTimer(interaction.client, activityMap[activityTypeInput], customStatus, startTime);
    } catch (error) {
      console.error('Error updating status:', error);
      await interaction.reply({ content: 'There was an error updating the status. Please try again later.', ephemeral: true });
    }
  },
};
