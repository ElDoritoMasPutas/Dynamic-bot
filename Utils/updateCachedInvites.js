// src/utils/updateCachedInvites.js
const fs = require('fs');
const path = require('path');

async function updateCachedInvites(guild) {
  const invites = await guild.invites.fetch();
  const cachedInvitesPath = path.join(__dirname, '../Json/cachedInvites.json');

  let cachedInvites = {};

  if (fs.existsSync(cachedInvitesPath)) {
    cachedInvites = JSON.parse(fs.readFileSync(cachedInvitesPath, 'utf-8'));
  }

  cachedInvites[guild.id] = {};

  invites.forEach((invite) => {
    cachedInvites[guild.id][invite.code] = invite.uses;
  });

  fs.writeFileSync(cachedInvitesPath, JSON.stringify(cachedInvites, null, 2));
}

module.exports = { updateCachedInvites };
