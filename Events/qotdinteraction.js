const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    if (!interaction.isButton()) return;

    // Define the attempts file path.
    const attemptsPath = path.join(__dirname, '..', 'Json', 'qotdattempts.json');

    // Helper: load attempts from file.
    const loadAttempts = () => {
      if (fs.existsSync(attemptsPath)) {
        try {
          return JSON.parse(fs.readFileSync(attemptsPath, 'utf-8'));
        } catch (err) {
          console.error('Error reading attempts file:', err);
        }
      }
      return {};
    };

    // Helper: save attempts to file.
    const saveAttempts = (data) => {
      fs.writeFileSync(attemptsPath, JSON.stringify(data, null, 2));
    };

    // Process only QOTD-related button interactions.
    if (interaction.customId.startsWith('qotd_')) {
      // For answer buttons (correct & incorrect)...
      if (interaction.customId.startsWith('qotd_correct') || interaction.customId.startsWith('qotd_incorrect')) {
        const attempts = loadAttempts();
        const userId = interaction.user.id;
        let userRecord = attempts[userId];

        // Initialize user record if it doesn't exist.
        if (!userRecord) {
          userRecord = { attempts: 0, answered: false };
        }

        // If the user has already answered correctly, do not allow further attempts.
        if (userRecord.answered) {
          return interaction.reply({ content: "You already answered correctly for this question!", ephemeral: true });
        }
        
        // Check if the user reached the maximum allowed attempts.
        if (userRecord.attempts >= 3) {
          return interaction.reply({ content: "You have reached the maximum of 3 attempts for this question!", ephemeral: true });
        }
        
        // Increment the attempt count for the user.
        userRecord.attempts++;
        attempts[userId] = userRecord;
        saveAttempts(attempts);
      }

      // Handle correct answer button(s)
      if (interaction.customId.startsWith('qotd_correct')) {
        // Mark the user as having answered correctly.
        const attempts = loadAttempts();
        const userId = interaction.user.id;
        let userRecord = attempts[userId] || { attempts: 0, answered: false };
        userRecord.answered = true;
        attempts[userId] = userRecord;
        saveAttempts(attempts);

        // Proceed to update the leaderboard.
        const leaderboardPath = path.join(__dirname, '..', 'Json', 'qotdleaderboard.json');
        let leaderboard = {};
        if (fs.existsSync(leaderboardPath)) {
          try {
            leaderboard = JSON.parse(fs.readFileSync(leaderboardPath, 'utf-8'));
          } catch (err) {
            console.error('Error reading leaderboard file:', err);
            return interaction.reply({ content: 'Error updating the leaderboard.', ephemeral: true });
          }
        }
        if (!leaderboard[userId]) {
          leaderboard[userId] = {
            username: interaction.user.tag,
            correct: 0,
          };
        }
        leaderboard[userId].correct += 1;
        try {
          fs.writeFileSync(leaderboardPath, JSON.stringify(leaderboard, null, 2));
        } catch (err) {
          console.error('Error updating leaderboard file:', err);
        }
        await interaction.deferReply({ ephemeral: true });
        return interaction.editReply({ content: 'Correct! You are a true Pokémon trainer! ⚡' });
      }
      
      // Handle incorrect answer button(s)
      else if (interaction.customId.startsWith('qotd_incorrect')) {
        await interaction.deferReply({ ephemeral: true });
        return interaction.editReply({ content: 'That is not correct. Better luck next time, trainer!' });
      }
      
      // Handle leaderboard button
      else if (interaction.customId === 'qotd_leaderboard') {
        const leaderboardPath = path.join(__dirname, '..', 'Json', 'qotdleaderboard.json');
        if (!fs.existsSync(leaderboardPath)) {
          return interaction.reply({ content: 'The leaderboard is empty!', ephemeral: true });
        }
        
        try {
          const leaderboard = JSON.parse(fs.readFileSync(leaderboardPath, 'utf-8'));
          const sortedUsers = Object.entries(leaderboard)
            .sort((a, b) => b[1].correct - a[1].correct);
          
          // Fetch all users to get their display names
          const leaderboardEntries = await Promise.all(
            sortedUsers.map(async ([userId, data], index) => {
              try {
                // Fetch user from client to get current display name
                const user = await interaction.client.users.fetch(userId);
                return `**${index + 1}. ${user.displayName}** — ${data.correct} correct`;
              } catch (error) {
                // Fall back to stored username if user fetch fails
                return `**${index + 1}. ${data.username}** — ${data.correct} correct`;
              }
            })
          );
          
          let description = leaderboardEntries.join('\n');
          if (!description) description = 'No entries yet. Be the first to score!';
          
          const embed = new EmbedBuilder()
            .setTitle('QOTD Leaderboard')
            .setDescription(description)
            .setColor(0xFFDE00)
            .setTimestamp();
            
          return interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (err) {
          console.error('Error displaying leaderboard:', err);
          return interaction.reply({ content: 'Error displaying the leaderboard.', ephemeral: true });
        }
      }
      
      // Handle Time Remaining button
      else if (interaction.customId === 'qotd_time') {
        const timestampPath = path.join(__dirname, '..', 'Json', 'qotdtimestamp.json');
        if (!fs.existsSync(timestampPath)) {
          return interaction.reply({ content: 'Time data is missing!', ephemeral: true });
        }
        const qotdData = JSON.parse(fs.readFileSync(timestampPath, 'utf-8'));
        const startTime = new Date(qotdData.timestamp).getTime();
        const now = Date.now();
        const duration = 24 * 60 * 60 * 1000; // 24 hours
        const remaining = Math.max(0, startTime + duration - now);
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
        return interaction.reply({ content: `Time Remaining: ${hours}h ${minutes}m ${seconds}s`, ephemeral: true });
      }
      
      // Handle Hint button
      else if (interaction.customId === 'qotd_hint') {
        const timestampPath = path.join(__dirname, '..', 'Json', 'qotdtimestamp.json');
        if (!fs.existsSync(timestampPath)) {
          return interaction.reply({ content: 'Hint data is missing!', ephemeral: true });
        }
        const qotdData = JSON.parse(fs.readFileSync(timestampPath, 'utf-8'));
        if (qotdData.hint) {
          return interaction.reply({ content: `Hint: ${qotdData.hint}`, ephemeral: true });
        } else {
          return interaction.reply({ content: 'No hint available for this question.', ephemeral: true });
        }
      }
    }
  },
};