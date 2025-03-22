const fs = require('fs');
const path = require('path');

// Path to the JSON file (adjust as needed)
const saveFilePath = path.join(__dirname, '../Json/membercounter.json');

// Function to load counter configurations from the JSON file
function loadCountersFromFile() {
  if (!fs.existsSync(saveFilePath)) {
    console.log('No existing counter file found. Starting fresh.');
    return {};
  }
  try {
    const data = fs.readFileSync(saveFilePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading member counter file:', err);
    return {};
  }
}

// Function to save counter configurations to the JSON file
function saveCountersToFile(client) {
  const data = Array.from(client.memberCounters.entries()).reduce((acc, [guildId, counters]) => {
    acc[guildId] = {
      online: counters.online?.id || null,
      total: counters.total?.id || null,
      bots: counters.bots?.id || null,
    };
    return acc;
  }, {});

  try {
    fs.writeFileSync(saveFilePath, JSON.stringify(data, null, 2), 'utf8');
    console.log('Saved counters to file:', data);
  } catch (err) {
    console.error('Error writing member counter file:', err);
  }
}

module.exports = {
  loadCountersFromFile,
  saveCountersToFile,
};
