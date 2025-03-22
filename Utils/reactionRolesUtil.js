const fs = require('fs');
const path = require('path');
const dataPath = path.join(__dirname, 'reactionRolesData.json');

// Mappings are stored as an array.
// Each entry: { guildId, messageId, pairs: [ { isCustom, emojiName, emojiId, display, roleId }, ... ] }
let reactionRoles = [];

// Load existing data, or initialize as an empty array.
if (fs.existsSync(dataPath)) {
  try {
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    reactionRoles = Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('Error reading reaction roles data:', err);
    reactionRoles = [];
  }
}

function saveData() {
  fs.writeFileSync(dataPath, JSON.stringify(reactionRoles, null, 2));
}

/**
 * Adds or updates a mapping for a reaction role message.
 * @param {string} guildId - Guild ID.
 * @param {string} messageId - Message ID.
 * @param {Array} pairs - Array of objects: { isCustom, emojiName, emojiId, display, roleId }.
 */
function addMapping(guildId, messageId, pairs) {
  const index = reactionRoles.findIndex(mapping => mapping.guildId === guildId);
  if (index !== -1) {
    reactionRoles[index] = { guildId, messageId, pairs };
  } else {
    reactionRoles.push({ guildId, messageId, pairs });
  }
  saveData();
}

/**
 * Removes a mapping by message ID.
 * @param {string} messageId
 * @returns {boolean} true if removed.
 */
function removeMapping(messageId) {
  const index = reactionRoles.findIndex(mapping => mapping.messageId === messageId);
  if (index !== -1) {
    reactionRoles.splice(index, 1);
    saveData();
    return true;
  }
  return false;
}

/**
 * Retrieves the pairs for a given message ID.
 * @param {string} messageId
 * @returns {Array|undefined} The pairs array if found.
 */
function getMapping(messageId) {
  const mapping = reactionRoles.find(mapping => mapping.messageId === messageId);
  return mapping ? mapping.pairs : undefined;
}

module.exports = {
  addMapping,
  removeMapping,
  getMapping,
};
