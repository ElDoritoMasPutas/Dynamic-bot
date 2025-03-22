// src/events/inviteCreate.js
const { Events } = require('discord.js');
const { updateCachedInvites } = require('../Utils/updateCachedInvites');

module.exports = {
  name: Events.InviteCreate,
  async execute(invite) {
    try {
      await updateCachedInvites(invite.guild);
    } catch (error) {
      console.error(`Error updating invites on inviteCreate:`, error);
    }
  },
};
