const { EmbedBuilder, ChannelType } = require('discord.js');

// Ensure that the boost channel exists
async function ensureBoostChannel(guild) {
  let boostChannel = guild.channels.cache.find(
    channel => channel.name === '✨server-boosts' &&
               channel.type === ChannelType.GuildText
  );
  
  if (!boostChannel) {
    try {
      boostChannel = await guild.channels.create({
        name: '✨server-boosts',
        type: ChannelType.GuildText,
        topic: 'Celebrate server boosts and boosters!',
        reason: 'Auto-created ✨server-boosts channel for logging server boost events'
      });
      console.log('✨server-boosts channel not found. Created new ✨server-boosts channel.');
    } catch (error) {
      console.error('Failed to create ✨server-boosts channel:', error);
      throw error;
    }
  }
  return boostChannel;
}

// Helper: Retrieve an existing boost message (if any) for a boosting member.
async function getExistingBoostMessage(guild, member, isBoosting) {
  const boostChannel = await ensureBoostChannel(guild);
  const fetchedMessages = await boostChannel.messages.fetch({ limit: 50 });
  
  return fetchedMessages.find(msg => {
    if (msg.author.id !== guild.client.user.id) return false;
    if (!msg.embeds.length) return false;
    const embed = msg.embeds[0];
    if (!embed.description) return false;
    if (isBoosting) {
      // For boost events, check if the description contains the member mention
      // and that it isn’t already an "ended" message.
      return embed.description.includes(`<@${member.id}>`) &&
             embed.description.includes('boost');
    } else {
      // For unboost events, look for the "stopped boosting" text.
      return embed.description.includes(`<@${member.id}>`) &&
             embed.description.includes('stopped boosting');
    }
  });
}

// Helper: Determine the current boost count from the embed's description.
function getBoostCountFromDescription(description, memberId) {
  // If the description is the original one, count is 1.
  if (description.includes(`<@${memberId}> has started boosting`)) {
    return 1;
  }
  // Try to extract words like "double", "triple", etc.
  const regex = new RegExp(`<@${memberId}> has (\\w+) boosted the server`);
  const match = description.match(regex);
  if (match) {
    const word = match[1];
    const mapping = {
      'double': 2,
      'triple': 3,
      'quadruple': 4,
      'quintuple': 5,
      'sextuple': 6,
      'septuple': 7,
      'octuple': 8,
      'nonuple': 9,
      'decuple': 10,
    };
    if (mapping[word]) return mapping[word];
  }
  // Default to 1 if nothing else is found.
  return 1;
}

// Helper: Return a description string based on the boost count.
function getBoostDescription(memberId, count) {
  if (count === 1) {
    return `<@${memberId}> has started boosting the server! 🎉`;
  } else if (count === 2) {
    return `<@${memberId}> has double boosted the server! 🎉`;
  } else if (count === 3) {
    return `<@${memberId}> has triple boosted the server! 🎉`;
  } else if (count === 4) {
    return `<@${memberId}> has quadruple boosted the server! 🎉`;
  } else {
    return `<@${memberId}> has boosted the server (${count} times)! 🎉`;
  }
}

// Log the boost event
async function logBoostEvent(guild, member, isBoosting, boostStartTime) {
  const boostChannel = await ensureBoostChannel(guild);

  if (isBoosting) {
    // Check for an existing boost message so we can update it
    try {
      const existingBoostMsg = await getExistingBoostMessage(guild, member, true);
      if (existingBoostMsg) {
        const currentEmbed = existingBoostMsg.embeds[0];
        const currentDesc = currentEmbed.description || '';
        const currentCount = getBoostCountFromDescription(currentDesc, member.id);
        const newCount = currentCount + 1;
        const newDescription = getBoostDescription(member.id, newCount);

        // Create a new embed based on the old one and update its description and title.
        const updatedEmbed = EmbedBuilder.from(currentEmbed)
          .setTitle(`✨ Server Boost ${newCount > 1 ? `(${newCount}x)` : 'Started'}`)
          .setDescription(newDescription)
          .setTimestamp();

        // Optionally, you can also update other fields (for example, if you want to reflect the new boost time).
        await existingBoostMsg.edit({ embeds: [updatedEmbed] });
        console.log(`Updated boost notification for ${member.user.tag} to count ${newCount}`);
        return;
      }
    } catch (error) {
      console.error('Error checking for existing boost messages:', error);
      // Continue to create a new message if something goes wrong.
    }
  } else {
    // For boost removal, we do not update an existing boost message.
    // (You could choose to update the message instead if desired.)
    // Here we log a separate ended message.
  }

  // Build a new embed for a new event (or for boost removal)
  const embedColor = isBoosting ? '#ff69b4' : '#d3d3d3';
  const emoji = isBoosting ? '✨' : '⚪';
  const boostEmbed = new EmbedBuilder()
    .setTitle(`${emoji} Server Boost ${isBoosting ? 'Started' : 'Ended'}`)
    .setColor(embedColor)
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .setFooter({ text: 'Server Boost Event' })
    .setTimestamp();

  if (isBoosting) {
    // For a new boost, count is 1.
    boostEmbed
      .setDescription(getBoostDescription(member.id, 1))
      .addFields({
        name: 'Boost Started On',
        value: `<t:${Math.floor(boostStartTime.getTime() / 1000)}:F>`,
        inline: true
      })
      .setImage('https://media1.tenor.com/m/IyGjy93XSeMAAAAC/boost.gif');
  } else {
    boostEmbed
      .setDescription(`<@${member.id}> has stopped boosting the server.`)
      .addFields({
        name: 'Boost Ended',
        value: 'Boost no longer active.',
        inline: true
      });
  }

  try {
    await boostChannel.send({ embeds: [boostEmbed] });
  } catch (error) {
    console.error('Error sending boost log:', error);
  }
}

// Handle a boost update when a member's boost status changes.
async function handleBoostUpdate(oldMember, newMember) {
  const wasBoosting = Boolean(oldMember.premiumSince);
  const isBoosting  = Boolean(newMember.premiumSince);
  
  if (wasBoosting !== isBoosting) {
    if (isBoosting) {
      await logBoostEvent(newMember.guild, newMember, true, newMember.premiumSince);
    } else {
      await logBoostEvent(newMember.guild, newMember, false, oldMember.premiumSince);
    }
  }
}

// Check for recent boosts on startup or periodically.
async function checkRecentBoosts(guild, timeThresholdMinutes = 60) {
  try {
    await guild.members.fetch();
  } catch (err) {
    console.error('Error fetching members:', err);
    return;
  }
  
  const now = Date.now();
  const recentBoosters = guild.members.cache.filter(member => {
    if (member.premiumSince) {
      const boostTime = member.premiumSince.getTime();
      return (now - boostTime) < timeThresholdMinutes * 60 * 1000;
    }
    return false;
  });
  
  if (recentBoosters.size === 0) {
    console.log(`No recent boosters found in guild: ${guild.name}`);
    return;
  }
  
  for (const booster of recentBoosters.values()) {
    // Check if an existing boost message is already logged.
    const existingBoostMsg = await getExistingBoostMessage(guild, booster, true);
    if (existingBoostMsg) {
      console.log(`Existing boost message found for ${booster.user.tag}, skipping log.`);
      continue;
    }
    await logBoostEvent(guild, booster, true, booster.premiumSince);
  }
  console.log(`Logged boost events for recent boosters in guild: ${guild.name}`);
}


module.exports = {
  handleBoostUpdate,
  checkRecentBoosts
};
