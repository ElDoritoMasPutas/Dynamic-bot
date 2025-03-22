const { ChannelType, PermissionFlagsBits } = require('discord.js');
const { loadConfig } = require('../Utils/jtcPersist');

module.exports = {
  name: 'voiceStateUpdate',
  async execute(oldState, newState) {
    const client = newState.client;
    const guild = newState.guild;
    
    // Ensure we have an in-memory collection for join-to-create channels.
    client.joinToCreateChannels = client.joinToCreateChannels || new Map();

    // Attempt to get this guild's configuration from in-memory.
    let guildConfig = client.joinToCreateChannels.get(guild.id);
    if (!guildConfig) {
      // Fallback: load from persistent storage.
      const config = await loadConfig();
      if (config[guild.id]) {
        guildConfig = config[guild.id];
        client.joinToCreateChannels.set(guild.id, guildConfig);
      } else {
        console.error(`No join-to-create configuration found for guild ${guild.id}.`);
        return;
      }
    }

    const hubChannelId = guildConfig.joinChannelId;
    const hubChannel = guild.channels.cache.get(hubChannelId);
    if (!hubChannel) {
      console.error(`Hub channel (ID: ${hubChannelId}) not found in guild ${guild.id}.`);
      return;
    }

    console.log(
      `voiceStateUpdate triggered in guild ${guild.id} for hub channel "${hubChannel.name}" (ID: ${hubChannel.id}).`
    );

    // ----------------------------
    // PART 1: When a member joins the hub channel.
    // ----------------------------
    if (newState.channelId === hubChannel.id && oldState.channelId !== hubChannel.id) {
      const member = newState.member;
      console.log(`${member.user.username} joined the hub channel "${hubChannel.name}". Creating a temporary channel...`);

      try {
        const tempChannel = await guild.channels.create({
          name: `${member.user.username}'s Voice Channel`,
          type: ChannelType.GuildVoice,
          reason: 'Temporary channel created via join-to-create system',
          parent: hubChannel.parent ? hubChannel.parent.id : null,
          permissionOverwrites: [
            {
              id: guild.id,
              allow: [PermissionFlagsBits.Connect],
            },
            {
              id: member.id,
              allow: [PermissionFlagsBits.ManageChannels],
            },
          ],
        });

        // Initialize or update our tracking for temporary channels.
        client.temporaryChannels = client.temporaryChannels || new Map();
        client.temporaryChannels.set(tempChannel.id, true);

        // Move the member into their temporary channel.
        await member.voice.setChannel(tempChannel);
        console.log(`Moved ${member.user.username} to temporary channel "${tempChannel.name}".`);
      } catch (error) {
        console.error(`Error creating or moving ${member.user.username} to a temporary channel:`, error);
      }
    }

    // ----------------------------
    // PART 2: When a member leaves a temporary channel.
    // If the channel becomes empty, delete it.
    // ----------------------------
    if (
      oldState.channel &&
      client.temporaryChannels &&
      client.temporaryChannels.has(oldState.channel.id)
    ) {
      const channel = oldState.channel;
      if (channel.members.size === 0) {
        console.log(`Temporary channel "${channel.name}" is now empty. Scheduling deletion...`);
        // Adding a short delay (e.g., 5 seconds) to avoid quickly deleting if someone rejoins.
        setTimeout(async () => {
          if (channel.members.size === 0) {
            try {
              await channel.delete('Temporary voice channel deleted because it became empty.');
              console.log(`Temporary channel "${channel.name}" has been deleted.`);
              client.temporaryChannels.delete(channel.id);
            } catch (error) {
              console.error(`Error deleting temporary channel "${channel.name}":`, error);
            }
          }
        }, 5000);
      }
    }
  },
};
