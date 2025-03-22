const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const FILE_PATH = path.join(__dirname, '../Json/birthdays.json');

// Helper: load birthdays from JSON
function loadBirthdays() {
  try {
    if (fs.existsSync(FILE_PATH)) {
      const data = fs.readFileSync(FILE_PATH, 'utf8');
      return JSON.parse(data);
    } else {
      return {};
    }
  } catch (error) {
    console.error(`Error loading birthdays: ${error}`);
    return {};
  }
}

// Helper: save birthdays to JSON
function saveBirthdays(birthdaysObj) {
  try {
    fs.writeFileSync(FILE_PATH, JSON.stringify(birthdaysObj, null, 2), 'utf8');
  } catch (error) {
    console.error(`Error saving birthdays: ${error}`);
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setbirthday')
    .setDescription('Set your own birthday or set another user\'s birthday.')
    // Required options first:
    .addStringOption(option =>
      option.setName('date')
        .setDescription('Birthday in MM-DD format (e.g., 12-25)')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('year')
        .setDescription('Birth year (e.g., 1998)')
        .setRequired(true))
    // Then the optional user option:
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user whose birthday you want to set. (Defaults to yourself)')),
  
  async execute(interaction) {
    // Ensure the command is used in a guild
    if (!interaction.guild) {
      return interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
    }
    
    // Get options
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const dateStr = interaction.options.getString('date');
    const year = interaction.options.getInteger('year');
    
    // Validate the date and year formats
    const birthdayRegex = /^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;
    const yearRegex = /^(19|20)\d{2}$/;
    if (!birthdayRegex.test(dateStr)) {
      return interaction.reply({ content: 'Invalid date format. Please use MM-DD (e.g., 12-25).', ephemeral: true });
    }
    if (!yearRegex.test(year.toString())) {
      return interaction.reply({ content: 'Invalid year format. Please provide a valid year (e.g., 1998).', ephemeral: true });
    }
    
    // Calculate next birthday
    const now = new Date();
    const currentYear = now.getFullYear();
    const [monthStr, dayStr] = dateStr.split('-');
    const month = parseInt(monthStr) - 1; // JavaScript months are 0-indexed
    const day = parseInt(dayStr);
    let nextBirthday = new Date(currentYear, month, day);
    if (nextBirthday < now) {
      nextBirthday = new Date(currentYear + 1, month, day);
    }
    // Calculate days until birthday (rounded up)
    const diffTime = nextBirthday.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Format the birthday date nicely
    const nextBirthdayFormatted = nextBirthday.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
    
    // Load current birthdays and update for this guild
    const birthdays = loadBirthdays();
    const guildId = interaction.guild.id;
    
    if (!birthdays[guildId]) birthdays[guildId] = {};
    birthdays[guildId][targetUser.id] = { birthday: `${year}-${dateStr}` };
    
    saveBirthdays(birthdays);
    
    // Create an embed reply
    const embed = new EmbedBuilder()
      .setTitle('Birthday Set!')
      .setDescription(`Duly noted, I'll wish <@${targetUser.id}> a happy birthday on **${nextBirthdayFormatted}** 🥳\nThat's in **${diffDays} day${diffDays === 1 ? '' : 's'}**!`)
      .setColor(0xffa500)
      .setTimestamp();
    
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
