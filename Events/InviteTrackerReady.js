// src/events/ready.js
const { Events } = require('discord.js');
const { updateCachedInvites } = require('../Utils/updateCachedInvites');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`Invites Cached`);

    client.guilds.cache.forEach(async (guild) => {
      try {
        await updateCachedInvites(guild);
      } catch (error) {
        console.error(`Error updating invites for guild ${guild.id}:`, error);
      }
    });
  },
};
