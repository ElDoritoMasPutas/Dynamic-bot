const { Collection, Colors } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Use the global users file in src/Json/
const FILE_PATH = path.join(process.cwd(), 'src', 'Json', 'users.json');

const users = new Collection();

// Configuration variables
const config = {
  maxLevel: 0, // 0 means no max level
  xpPerMessage: [5, 12],
  cooldownSeconds: 3,
};

// Calculate total XP needed for a given level
function getTotalXPForLevel(level) {
  return 100 * Math.pow(1.5, level - 1);
}

/**
 * Checks the user's current level and applies any missing roles.
 */
async function updateUserRoles(userId, channel) {
  const guild = channel.guild;
  if (!guild) return;
  const user = users.get(userId);
  const member = await guild.members.fetch(userId);

  // Define level thresholds, role names, and their corresponding colors:
  const roleLevels = [
    { level: 1, name: '👶Newbie Chatter', color: Colors.LightGreen },
    { level: 5, name: '🏢Regular Chatter', color: Colors.Blue },
    { level: 10, name: '😍Chatterbox', color: Colors.Yellow },
    { level: 15, name: '♥ChatLover', color: Colors.Fuchsia },
    { level: 20, name: '🎉ChatStar', color: Colors.Green },
    { level: 25, name: '👑ChatKing', color: Colors.Red },
    { level: 30, name: '👼ChatGod', color: Colors.Aqua },
    { level: 40, name: '👿Chat Demon', color: Colors.DarkPurple },
    { level: 50, name: '🧙‍♂️Chataholic', color: Colors.Orange },
    { level: 60, name: '💣ChatManiac', color: Colors.Magenta },
    { level: 70, name: '💫Rising Star', color: Colors.LightBlue },
    { level: 80, name: '✨Grand Chatter', color: Colors.LightSlateGray },
    { level: 90, name: '💪Chat Leader', color: Colors.DodgerBlue },
    { level: 100, name: '⭐ChatMaster', color: Colors.DarkGreen },
    { level: 110, name: '🌟Top-Tier-Chatter', color: Colors.Gold }
  ];
  
  for (const { level, name, color } of roleLevels) {
    if (user.level >= level) {
      let role = guild.roles.cache.find(r => r.name === name);
      if (!role) {
        try {
          role = await guild.roles.create({
            name: name,
            color: color,
            reason: 'Role created for leveling system'
          });
        } catch (err) {
          console.error(`Error creating role ${name}:`, err);
          continue;
        }
      }
      if (!member.roles.cache.has(role.id)) {
        try {
          await member.roles.add(role);
        } catch (err) {
          console.error(`Error adding role ${name} to member ${member.id}:`, err);
        }
      }
    }
  }
}

/**
 * Process level-up if the user has enough XP.
 */
async function handleLevelUp(userId, channel) {
  const user = users.get(userId);
  const requiredXP = getTotalXPForLevel(user.level + 1);

  if (user.xp >= requiredXP) {
    // Deduct required XP and increment level
    user.xp -= requiredXP;
    user.level++;
    if (config.maxLevel > 0 && user.level > config.maxLevel) {
      user.level = config.maxLevel;
    }
    
    // Use the bot's dynamic info for the embed author
    const botIconURL = channel.client.user.displayAvatarURL({ dynamic: true, size: 1024 });
    const botName = channel.client.user.username;
    
    // Gather dynamic values for the embed:
    const guildIconURL = channel.guild ? channel.guild.iconURL({ dynamic: true, size: 1024 }) : null;
    const guildName = channel.guild ? channel.guild.name : "Server";
    const memberForAvatar = channel.guild ? channel.guild.members.cache.get(userId) : null;
    const userAvatarURL = memberForAvatar ? memberForAvatar.user.displayAvatarURL({ dynamic: true }) : null;
    
    // Create the level-up embed with dynamic bot info
    const embed = {
      author: {
        name: botName,
        icon_url: botIconURL,
      },
      title: "🎉 Level Up!",
      description: `<@${userId}> has reached **level ${user.level}**!`,
      color: Colors.Blurple,
      timestamp: new Date().toISOString(),
      footer: { 
        text: guildName,
        icon_url: userAvatarURL
      },
      image: { url: guildIconURL },
      thumbnail: { url: userAvatarURL }
    };
    channel.send({ embeds: [embed] });
    saveUserData();
  }
}

// Helper function to normalize user data for saving
function normalizeUserData(userData) {
  return {
    xp: userData.xp ?? 0,
    level: userData.level ?? 1,
    lastXPTime: userData.lastXPTime ?? 0,
    requiredXP: getTotalXPForLevel((userData.level ?? 1) + 1),
    username: userData.username ?? '',
    discriminator: userData.discriminator ?? '0',
    displayName: userData.displayName ?? ''
  };
}

// Updated saveUserData: Merge in-memory data with the current file data before writing.
function saveUserData() {
  let storedData = {};
  try {
    if (fs.existsSync(FILE_PATH)) {
      const data = fs.readFileSync(FILE_PATH, 'utf8');
      storedData = JSON.parse(data);
    }
  } catch (error) {
    console.error(`Error reading data from ${FILE_PATH} before saving:`, error);
  }
  
  // Merge in-memory users into storedData
  for (const [userId, inMemoryData] of users.entries()) {
    const normalizedData = normalizeUserData(inMemoryData);
    if (storedData[userId]) {
      // Use the data with the more recent lastXPTime
      if (normalizedData.lastXPTime > storedData[userId].lastXPTime) {
        storedData[userId] = normalizedData;
      }
    } else {
      storedData[userId] = normalizedData;
    }
  }
  
  try {
    fs.writeFileSync(FILE_PATH, JSON.stringify(storedData, null, 2), 'utf8');
    console.log(`Global user data saved to ${FILE_PATH}`);
  } catch (error) {
    console.error(`Error saving data to ${FILE_PATH}:`, error);
  }
}

// Load user data from the global file
function loadUserData() {
  try {
    if (fs.existsSync(FILE_PATH)) {
      const data = fs.readFileSync(FILE_PATH, 'utf8');
      const usersObj = JSON.parse(data);
      if (typeof usersObj === 'object' && usersObj !== null) {
        for (const [userId, userData] of Object.entries(usersObj)) {
          users.set(userId, {
            xp: userData.xp,
            level: userData.level,
            lastXPTime: userData.lastXPTime,
            requiredXP: userData.requiredXP || getTotalXPForLevel(userData.level + 1),
            username: userData.username || '',
            discriminator: userData.discriminator || '0',
            displayName: userData.displayName || ''
          });
        }
      }
      console.log('Global user data successfully loaded');
    }
  } catch (error) {
    console.error(`Error loading data from ${FILE_PATH}:`, error);
  }
}

module.exports = {
  name: 'messageCreate',
  async execute(message) {
    // Ignore messages from bots
    if (message.author.bot) return;
    
    const userId = message.author.id;
    
    // Initialize user data if not already present
    if (!users.has(userId)) {
      users.set(userId, { xp: 0, level: 1, lastXPTime: 0 });
    }
    
    // Update the user's metadata from the message
    const userData = users.get(userId);
    userData.username = message.author.username;
    userData.discriminator = message.author.tag.split('#')[1] || "0";
    userData.displayName = message.member ? message.member.displayName : message.author.username;
        
    const currentTime = Date.now();
    
    // Award XP if the cooldown period has passed
    if (currentTime - userData.lastXPTime >= config.cooldownSeconds * 1000) {
      const xpGain = Math.floor(Math.random() * (config.xpPerMessage[1] - config.xpPerMessage[0] + 1)) + config.xpPerMessage[0];
      userData.xp += xpGain;
      userData.lastXPTime = currentTime;
      
      // Process level-up (if any)
      await handleLevelUp(userId, message.channel);
      // Always update roles based on the current level
      await updateUserRoles(userId, message.channel);
      saveUserData();
    }
  },
  users, // Export the collection so it’s shared
  loadUserData,
  saveUserData,
  getTotalXPForLevel,
  handleLevelUp,
};
