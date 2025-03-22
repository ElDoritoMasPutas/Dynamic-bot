const path = require('path');

// ready-leveling.js
module.exports = {
  name: 'ready',
  once: true,
  execute(client) {
    // Import your leveling module (adjust the path accordingly)
    const leveling = require('./levelingsystem.js');
    // Load saved user data into the leveling system
    leveling.loadUserData();
    console.log(`Arceus leveling system data loaded`);
  }
};
