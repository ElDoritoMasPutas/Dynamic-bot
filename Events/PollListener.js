const { EmbedBuilder } = require('discord.js');
const { pollStore, getProgressBar } = require('../BotCommands/Pollquestion.js');
const fs = require('fs');
const path = require('path');
const pollsFilePath = path.join(__dirname, '..', 'Json', 'Polls.json');

/**
 * Saves the updated pollStore Map to the JSON file.
 */
function savePolls(pollStore) {
  try {
    const obj = Object.fromEntries(pollStore);
    fs.writeFileSync(pollsFilePath, JSON.stringify(obj, null, 2));
  } catch (err) {
    console.error('Error saving polls:', err);
  }
}

/**
 * Determines the winners of a poll from its votes array.
 */
function determineWinners(votes) {
  const maxVotes = Math.max(...votes);
  if (maxVotes === 0) return { maxVotes, winnerIndexes: [] };
  const winnerIndexes = votes.reduce((acc, count, index) => {
    if (count === maxVotes) acc.push(index);
    return acc;
  }, []);
  return { maxVotes, winnerIndexes };
}

/**
 * Closes the poll by determining winners, updating the embed (adding trophy emojis
 * and a "Poll Ended At" field if applicable), and removing voting buttons.
 * Then, it deletes only that poll's data from pollStore.
 *
 * @param {Client} client - Your Discord client.
 * @param {string} pollId - The unique poll ID.
 */
async function closePoll(client, pollId) {
  const poll = pollStore.get(pollId);
  if (!poll) {
    console.error(`Poll ${pollId} not found`);
    return;
  }

  const { winnerIndexes } = determineWinners(poll.votes);

  try {
    const channel = await client.channels.fetch(poll.channelId);
    if (!channel) return;
    const message = await channel.messages.fetch(poll.messageId);
    if (!message) return;

    const totalVotes = poll.votes.reduce((a, b) => a + b, 0);
    const numberEmojis = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
    const guildName = channel.guild?.name || 'Unknown Guild';

    // Build the closed poll embed with dynamic author & thumbnail info.
    const updatedEmbed = new EmbedBuilder()
      .setTitle('🗳️ Poll Closed!')
      .setDescription(`**${poll.question}**`)
      .setColor(0xFFC107)
      .setAuthor({
        name: `Poll made by ${poll.author.username}`,
        iconURL: poll.author.iconURL,
      })
      .setThumbnail(channel.guild?.iconURL({ dynamic: true }) ?? null)
      .setFooter({
        text: `${guildName} | The poll has ended.`,
        iconURL: client.user.displayAvatarURL({ dynamic: true }),
      });

    poll.options.forEach((option, index) => {
      const isWinner = winnerIndexes.includes(index);
      const optionLabel = isWinner ? `🏆 ${option}` : option;
      updatedEmbed.addFields({
        name: `${numberEmojis[index]} ${optionLabel}`,
        value: getProgressBar(poll.votes[index], totalVotes),
        inline: false,
      });
    });

    if (poll.closeTimestamp) {
      updatedEmbed.addFields({
        name: 'Poll Ended At',
        value: `<t:${Math.floor(poll.closeTimestamp / 1000)}:F>`,
        inline: false,
      });
    }

    await message.edit({ embeds: [updatedEmbed], components: [] });

    // Remove only this poll's data from the store and persist the change.
    pollStore.delete(pollId);
    savePolls(pollStore);
  } catch (error) {
    console.error(`Error closing poll ${pollId}:`, error);
  }
}

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith('poll_')) return;

    const [ , pollId, optionIndexStr ] = interaction.customId.split('_');
    const optionIndex = parseInt(optionIndexStr, 10);

    const poll = pollStore.get(pollId);
    if (!poll) {
      await interaction.reply({
        content: 'This poll is invalid or has expired.',
        ephemeral: true,
      });
      return;
    }

    if (poll.voters[interaction.user.id] !== undefined) {
      await interaction.reply({
        content: 'You have already voted!',
        ephemeral: true,
      });
      return;
    }

    poll.voters[interaction.user.id] = optionIndex;
    poll.votes[optionIndex]++;

    const totalVotes = poll.votes.reduce((a, b) => a + b, 0);
    const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0]);
    updatedEmbed.data.fields.forEach((field, i) => {
      if (i < poll.options.length) {
        updatedEmbed.data.fields[i].value = getProgressBar(poll.votes[i], totalVotes);
      }
    });

    savePolls(pollStore);
    await interaction.update({ embeds: [updatedEmbed] });
  },

  closePoll,
};
