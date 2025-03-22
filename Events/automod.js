const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, "..", "Json", "automod.json");
const warningsPath = path.join(__dirname, "..", "Json", "warnedUsers.json");

// Ensure JSON files exist
if (!fs.existsSync(configPath)) fs.writeFileSync(configPath, JSON.stringify({}, null, 2));
if (!fs.existsSync(warningsPath)) fs.writeFileSync(warningsPath, JSON.stringify({}, null, 2));

// Helper functions for config
function loadConfig() {
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

function saveConfig(config) {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

// Helper functions for warnings
function loadWarnings() {
  return JSON.parse(fs.readFileSync(warningsPath, 'utf8'));
}

function saveWarnings(warnings) {
  fs.writeFileSync(warningsPath, JSON.stringify(warnings, null, 2));
}

// Get settings for a guild (always reads from disk to prevent stale data)
function getSettings(guildId) {
  let config = loadConfig();
  if (!config[guildId]) {
    config[guildId] = {
      badWords: [],
      blacklistedLinks: [],
      spamLimit: 5,
      blockLinks: true,
      maxMentions: 4,
      muteDuration: 10,
      maxWarnings: 3,
      warningImage: ""
    };
  } else {
    // Ensure missing settings are added with defaults
    if (typeof config[guildId].badWords === "undefined") config[guildId].badWords = [];
    if (typeof config[guildId].blacklistedLinks === "undefined") config[guildId].blacklistedLinks = [];
    if (typeof config[guildId].spamLimit === "undefined") config[guildId].spamLimit = 5;
    if (typeof config[guildId].blockLinks === "undefined") config[guildId].blockLinks = true;
    if (typeof config[guildId].maxMentions === "undefined") config[guildId].maxMentions = 4;
    if (typeof config[guildId].muteDuration === "undefined") config[guildId].muteDuration = 10;
    if (typeof config[guildId].maxWarnings === "undefined") config[guildId].maxWarnings = 3;
    if (typeof config[guildId].warningImage === "undefined") config[guildId].warningImage = "";
  }
  saveConfig(config);
  return config[guildId];
}

// In-memory cache for messages per user (for spam detection)
const messageCache = new Map();

module.exports = {
  name: 'messageCreate',
  async execute(message) {
    if (!message.guild) return;
    if (!message.member) return;
    if (message.author.bot) return;

    const settings = getSettings(message.guild.id);
    const contentLower = message.content.toLowerCase();
    const userId = message.author.id;

    // Skip checks for admins or those with ManageMessages permission
    if (message.member.permissions.has(PermissionsBitField.Flags.Administrator) ||
        message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      return;
    }

    let violation = "";

    // 1️⃣ BAD WORD FILTER
    if (settings.badWords.some(word => contentLower.includes(word))) {
      violation = `🚨 Your message contained banned words from **${message.guild.name}**. Please adjust your vocabulary.`;
    }

    // 2️⃣ BLACKLISTED LINKS
    if (settings.blacklistedLinks.some(link => contentLower.includes(link))) {
      violation = `🚫 You posted a blacklisted link in **${message.guild.name}**.`;
    }

    // 3️⃣ SPAM DETECTION
    if (!messageCache.has(userId)) messageCache.set(userId, []);
    const now = Date.now();
    let timestamps = messageCache.get(userId);
    timestamps.push(now);
    // Keep only timestamps within the last 5 seconds
    timestamps = timestamps.filter(t => now - t < 5000);
    messageCache.set(userId, timestamps);
    if (timestamps.length > settings.spamLimit) {
      violation = `⚠️ You are sending messages too quickly in **${message.guild.name}** (Spam detected).`;
    }

    // 4️⃣ BLOCK ALL LINKS (if enabled)
    if (settings.blockLinks && /(https?:\/\/[^\s]+)/g.test(message.content)) {
      violation = `🚫 Links are not allowed in **${message.guild.name}**.`;
    }

          // Count all user mentions (including duplicates)
      const userMentionsCount = (message.content.match(/<@!?(\d+)>/g) || []).length;
      
      // Count occurrences of @everyone and @here
      const everyoneCount = (message.content.match(/@everyone/g) || []).length + (message.content.match(/@here/g) || []).length;
      
      if ((userMentionsCount + everyoneCount) > settings.maxMentions) {
        violation = `⚠️ Too many mentions in **${message.guild.name}**! Max allowed: ${settings.maxMentions}.`;
      }


    // If any violation occurred, handle it
    if (violation) {
      await message.delete().catch(() => {});

      // Update warnings persistently
      let warnings = loadWarnings();
      if (!warnings[message.guild.id]) warnings[message.guild.id] = {};
      if (!warnings[message.guild.id][userId]) warnings[message.guild.id][userId] = 0;
      warnings[message.guild.id][userId]++;
      saveWarnings(warnings);

      // Build and send a warning DM embed
      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle("🚨 AutoMod Warning")
        .setDescription(violation)
        .addFields({ name: "📌 Warning Count:", value: `${warnings[message.guild.id][userId]}/${settings.maxWarnings}` })
        .setFooter({ text: "Follow the rules to avoid being muted." });
      if (settings.warningImage) embed.setImage(settings.warningImage);

      await message.author.send({ embeds: [embed] }).catch(() => {
        console.log(`❌ Could not send DM to ${message.author.tag}`);
      });

      // Auto-mute if max warnings reached
      if (warnings[message.guild.id][userId] >= settings.maxWarnings) {
        await muteUser(message.member, settings.muteDuration, "Exceeded max warnings.");
        warnings[message.guild.id][userId] = 0; // Reset warnings after mute
        saveWarnings(warnings);
      }
    }
  },
};

// Mute a user by adding a mute role, sending a DM, and then removing the role after a duration.
async function muteUser(member, duration, reason) {
  if (!member.manageable) return;
  try {
    const muteRole = await getMuteRole(member.guild);
    await member.roles.add(muteRole);

    const dmEmbed = new EmbedBuilder()
      .setColor(0x000000)
      .setTitle("⛔ You have been muted")
      .setDescription(`You have been muted for **${duration} minutes** due to: ${reason}`)
      .setFooter({ text: "Please DM me to appeal to staff, if you are rude you will be banned." });

    await member.send({ embeds: [dmEmbed] }).catch(() => {
      console.log(`❌ Could not DM ${member.user.tag}`);
    });

    setTimeout(async () => {
      if (member.roles.cache.has(muteRole.id)) {
        await member.roles.remove(muteRole);
      }
    }, duration * 60 * 1000);
  } catch (err) {
    console.error('Error muting user:', err);
  }
}

// Ensure a mute role exists; if not, create one.
async function getMuteRole(guild) {
  let muteRole = guild.roles.cache.find(r => r.name.toLowerCase() === 'offender');
  if (!muteRole) {
    muteRole = await guild.roles.create({
      name: 'Offender',
      permissions: [],
    });
  }
  return muteRole;
}