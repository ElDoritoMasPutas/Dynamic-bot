// /events/ready.js
const cron = require('node-cron');
const { postQOTD } = require('../Utils/qotd.js');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`QOTD system loaded!`);
    
    // Post a QOTD immediately on startup.
    await postQOTD(client);
    
    // Schedule a daily job at 9:00 AM server time to post a new QOTD.
    cron.schedule('0 9 * * *', () => {
      console.log("Scheduled QOTD posting triggered at 9:00 AM.");
      postQOTD(client);
    });
  }
};
