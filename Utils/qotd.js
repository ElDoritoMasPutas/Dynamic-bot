// /utils/qotdUtil.js
const { ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Helper: Fisher-Yates (Durstenfeld) Shuffle
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Helper: Chunk an array into subarrays of a given size.
function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

async function postQOTD(client) {
  // Get the first guild the bot is in.
  const guild = client.guilds.cache.first();
  if (!guild) {
    console.error("Bot is not in any guild!");
    return;
  }
  
  // Define the active period (e.g., 24 hours in milliseconds)
  const activePeriod = 24 * 60 * 60 * 1000;
  const timestampPath = path.join(__dirname, '..', 'Json', 'qotdtimestamp.json');

  // Check if there's an active question present.
  if (fs.existsSync(timestampPath)) {
    try {
      const timestampData = JSON.parse(fs.readFileSync(timestampPath, 'utf-8'));
      const lastPosted = new Date(timestampData.timestamp);
      const now = new Date();
      
      if (now - lastPosted < activePeriod) {
        console.log("A trivia question is still active. Aborting new post.");
        return;
      }
    } catch (error) {
      console.error("Error reading the timestamp file:", error);
      // Optionally, decide to proceed even if there's an error here.
    }
  }
  
  // Find or create the trivia channel.
  const channelName = '⚡poké-qotd⚡';
  let qotdChannel = guild.channels.cache.find(
    channel => channel.name === channelName && channel.type === ChannelType.GuildText
  );
  if (!qotdChannel) {
    try {
      qotdChannel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        topic: 'Daily Pokémon Trivia – Test your knowledge as a trainer!',
        reason: 'Setting up the Pokémon Trivia channel'
      });
      console.log(`Created channel ${channelName}`);
    } catch (error) {
      console.error('Error creating channel:', error);
      return;
    }
  }
  
  // Load questions from Json/qotdquestions.json.
  const questionsPath = path.join(__dirname, '..', 'Json', 'qotdquestions.json');
  let questions = [];
  if (fs.existsSync(questionsPath)) {
    try {
      questions = JSON.parse(fs.readFileSync(questionsPath, 'utf-8'));
    } catch (error) {
      console.error("Error parsing 'qotdquestions.json':", error);
      return;
    }
  }
  // Support a single-question object format.
  if (!Array.isArray(questions)) {
    questions = [questions];
  }
  if (questions.length === 0) {
    console.error("No trivia questions found in file. Please add questions to 'qotdquestions.json'.");
    return;
  }
  
  // Select a random question.
  const randomIndex = Math.floor(Math.random() * questions.length);
  const selectedQuestion = questions[randomIndex];
  
  // Combine and shuffle answers.
  const allAnswers = [...selectedQuestion.correct_answers, ...selectedQuestion.incorrect_answers];
  const shuffledAnswers = shuffle(allAnswers.slice());
  
  // Create answer buttons in ActionRows (max 5 per row).
  const answerRows = [];
  const answerChunks = chunkArray(shuffledAnswers, 5);
  answerChunks.forEach((chunk, chunkIndex) => {
    const row = new ActionRowBuilder();
    chunk.forEach((answer, index) => {
      const overallIndex = chunkIndex * 5 + index; // Unique index across rows.
      const isCorrect = selectedQuestion.correct_answers.includes(answer);
      const customId = isCorrect ? `qotd_correct_${overallIndex}` : `qotd_incorrect_${overallIndex}`;
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(customId)
          .setLabel(answer)
          .setStyle(ButtonStyle.Primary)
      );
    });
    answerRows.push(row);
  });
  
  // Build control row with extra buttons.
  const controlRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('qotd_leaderboard')
      .setLabel('Leaderboard')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('qotd_time')
      .setLabel('Time Remaining')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('qotd_hint')
      .setLabel('Hint')
      .setStyle(ButtonStyle.Secondary)
  );
  
  const components = [...answerRows, controlRow];
  
  // Create the embed.
  const embed = new EmbedBuilder()
    .setTitle('⚡ Pokémon Trivia ⚡')
    .setDescription(selectedQuestion.question)
    .setColor(0xFFDE00)
    .setFooter({ text: 'Select the correct answer and prove your trainer skills!' })
    .setTimestamp();
  
  try {
    await qotdChannel.send({ embeds: [embed], components });
    console.log("Pokémon trivia posted successfully.");
    
    // Save the posting timestamp and hint for control buttons.
    const timestampData = {
      timestamp: new Date().toISOString(),
      hint: selectedQuestion.hint || "No hint available."
    };
    fs.writeFileSync(timestampPath, JSON.stringify(timestampData, null, 2));
    
    // Reset attempts for the new question.
    const attemptsPath = path.join(__dirname, '..', 'Json', 'qotdattempts.json');
    fs.writeFileSync(attemptsPath, JSON.stringify({}, null, 2));
  } catch (error) {
    console.error("Error sending Pokémon trivia:", error);
  }
}

module.exports = { postQOTD };
