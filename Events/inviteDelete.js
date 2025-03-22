// src/events/inviteDelete.js
const { Events } = require('discord.js');
const { updateCachedInvites } = require('../Utils/updateCachedInvites');

module.exports = {
  name: Events.InviteDelete,
  async execute(invite) {
    try {
      await updateCachedInvites(invite.guild);
    } catch (error) {
      console.error(`Error updating invites on inviteDelete:`, error);
    }
  },
};
