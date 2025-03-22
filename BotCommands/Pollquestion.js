const fs = require('fs');
const path = require('path');
const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');

// Define the path to our persistent JSON file.
const pollsFilePath = path.join(__dirname, '..', 'Json', 'Polls.json');

/**
 * Loads polls from the JSON file into a Map.
 */
function loadPolls() {
  if (!fs.existsSync(pollsFilePath)) return new Map();
  try {
    const data = fs.readFileSync(pollsFilePath, 'utf8');
    const obj = JSON.parse(data);
    return new Map(Object.entries(obj));
  } catch (err) {
    console.error('Error loading polls:', err);
    return new Map();
  }
}

/**
 * Saves the current pollStore Map to the JSON file.
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
 * Generates a progress bar string for a poll option.
 */
function getProgressBar(voteCount, total, segments = 10) {
  let percent = total > 0 ? voteCount / total : 0;
  let filled = Math.round(percent * segments);
  let bar = '█'.repeat(filled) + '░'.repeat(segments - filled);
  let percentage = total > 0 ? (percent * 100).toFixed(1) : '0.0';
  return `${bar} ${percentage}% (${voteCount} vote${voteCount === 1 ? '' : 's'})`;
}

/**
 * Parses a flexible duration string into milliseconds.
 *
 * Supported examples: "2m", "2 minutes", "2d", "two weeks", etc.
 * Returns null if parsing fails.
 */
function parseDuration(input) {
  if (!input) return null;
  input = input.trim().toLowerCase();

  // Try matching a number followed by letters (e.g. "2m")
  let regex = /^([\d.]+)\s*([a-zA-Z]+)$/;
  let amount, unit;
  let match = input.match(regex);
  if (match) {
    amount = parseFloat(match[1]);
    unit = match[2];
  } else {
    // Split by whitespace (e.g. "two minutes")
    const parts = input.split(/\s+/);
    if (parts.length >= 2) {
      amount = parseFloat(parts[0]);
      if (isNaN(amount)) {
        const numberWords = {
          "zero": 0, "one": 1, "two": 2, "three": 3, "four": 4,
          "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9,
          "ten": 10, "eleven": 11, "twelve": 12,
        };
        amount = numberWords[parts[0]] !== undefined ? numberWords[parts[0]] : NaN;
      }
      unit = parts[1];
    }
  }
  if (isNaN(amount) || !unit) return null;

  // Map unit synonyms to a multiplier (in milliseconds).
  const units = {
    "s": 1000, "sec": 1000, "secs": 1000, "second": 1000, "seconds": 1000,
    "m": 60000, "min": 60000, "mins": 60000, "minute": 60000, "minutes": 60000,
    "h": 3600000, "hr": 3600000, "hrs": 3600000, "hour": 3600000, "hours": 3600000,
    "d": 86400000, "day": 86400000, "days": 86400000,
    "w": 604800000, "week": 604800000, "weeks": 604800000,
  };

  const multiplier = units[unit];
  if (!multiplier) return null;
  return amount * multiplier;
}

// Load persistent polls (if any) into our in‑memory store.
const pollStore = loadPolls();

module.exports = {
  pollStore,
  getProgressBar,

  // Define the /poll command.
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Create a poll with up to 10 options & an optional time limit.')
    .addStringOption(option =>
      option.setName('question')
        .setDescription('The poll question.')
        .setRequired(true)
    )
      // Optional duration input as a string.
    .addStringOption(option =>
      option.setName('duration')
        .setDescription('Poll duration (e.g. "2m", "2 days", "two weeks").')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('option1')
        .setDescription('First option.')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('option2')
        .setDescription('Second option.')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('option3')
        .setDescription('Third option.')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('option4')
        .setDescription('Fourth option.')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('option5')
        .setDescription('Fifth option.')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('option6')
        .setDescription('Sixth option.')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('option7')
        .setDescription('Seventh option.')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('option8')
        .setDescription('Eighth option.')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('option9')
        .setDescription('Ninth option.')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('option10')
        .setDescription('Tenth option.')
        .setRequired(false)
    ),

  async execute(interaction) {
    const question = interaction.options.getString('question');

    // Collect options from option1 to option10.
    const options = [];
    for (let i = 1; i <= 10; i++) {
      const opt = interaction.options.getString(`option${i}`);
      if (opt) options.push(opt);
    }
    if (options.length < 2) {
      return interaction.reply({
        content: 'You must provide at least two options.',
        ephemeral: true,
      });
    }

    // Parse optional duration input.
    const durationInput = interaction.options.getString('duration');
    const duration = durationInput ? parseDuration(durationInput) : null;
    const closeTimestamp = duration ? Date.now() + duration : null;

    // Use the interaction ID as a unique poll ID.
    const pollId = interaction.id;

    // Also store the poll maker's author data.
    pollStore.set(pollId, {
      question,
      options,
      votes: new Array(options.length).fill(0),
      voters: {},
      channelId: null,
      messageId: null,
      closeTimestamp, // null if no duration.
      author: {
        username: interaction.user.username,
        iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
      },
    });

    const guildName = interaction.guild?.name || 'Unknown Guild';

    // Build the poll embed with full dynamic info.
    const embed = new EmbedBuilder()
      .setTitle('🗳️ Poll Time!')
      .setDescription(`**${question}**`)
      .setColor(0x00AE86)
      .setAuthor({
        name: `Poll made by ${interaction.user.username}`,
        iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
      })
      .setThumbnail(interaction.guild?.iconURL({ dynamic: true }) ?? null)
      .setFooter({
        text: `${guildName} | Vote by clicking one of the buttons below.`,
        iconURL: interaction.client.user.displayAvatarURL({ dynamic: true }),
      });

    // Add a field for each option with an initial 0% progress bar.
    const numberEmojis = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
    options.forEach((option, index) => {
      embed.addFields({
        name: `${numberEmojis[index]} ${option}`,
        value: getProgressBar(0, 0),
        inline: false,
      });
    });
    if (closeTimestamp) {
      embed.addFields({
        name: 'Poll Ends',
        value: `<t:${Math.floor(closeTimestamp / 1000)}:R>`,
        inline: false,
      });
    }

    // Create buttons for each option (grouped 5 per row).
    const buttons = options.map((option, index) =>
      new ButtonBuilder()
        .setCustomId(`poll_${pollId}_${index}`)
        .setLabel(option)
        .setStyle(ButtonStyle.Primary)
    );
    const rows = [];
    for (let i = 0; i < buttons.length; i += 5) {
      rows.push(new ActionRowBuilder().addComponents(...buttons.slice(i, i + 5)));
    }

    // Send the poll message and save its channel and message IDs.
    const pollMessage = await interaction.reply({
      embeds: [embed],
      components: rows,
      fetchReply: true,
    });

    const poll = pollStore.get(pollId);
    poll.channelId = interaction.channel.id;
    poll.messageId = pollMessage.id;
    savePolls(pollStore);

    // Schedule automatic closure if a duration was provided.
    if (closeTimestamp && duration) {
      const { closePoll } = require('../Events/PollListener.js');
      setTimeout(() => {
        closePoll(interaction.client, pollId);
      }, duration);
    }
  },
};
