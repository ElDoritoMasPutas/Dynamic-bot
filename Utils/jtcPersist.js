const fs = require('fs').promises;
const path = require('path');

// Path to your persistent JSON file. Adjust the relative path as needed.
const configPath = path.join(__dirname, '../Json/jointocreate.json');

/**
 * Loads the join-to-create configuration.
 * The JSON structure is an object where each key is a guild ID and its value is an object.
 * 
 * Example:
 * {
 *   "guildID1": {
 *      "joinChannelId": "123456789012345678",
 *      "categoryId": "987654321098765432"
 *   },
 *   "guildID2": { … }
 * }
 * 
 * @returns {Promise<Object>} A promise that resolves to the config object.
 */
async function loadConfig() {
  try {
    const data = await fs.readFile(configPath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    // If the file doesn't exist, return an empty object.
    if (err.code === 'ENOENT') {
      return {};
    }
    console.error('Error loading join-to-create config:', err);
    return {};
  }
}

/**
 * Saves the join-to-create configuration.
 * @param {Object} config - The config object to be saved.
 * @returns {Promise<void>}
 */
async function saveConfig(config) {
  try {
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving join-to-create config:', err);
  }
}

module.exports = {
  loadConfig,
  saveConfig,
};
