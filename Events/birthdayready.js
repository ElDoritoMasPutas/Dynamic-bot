module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        const birthdayScheduler = require('../Utils/birthday.js');
        
        // Iterate over each guild to ensure both the birthday role and channel exist
        for (const guild of client.guilds.cache.values()) {
            await birthdayScheduler.getOrCreateBirthdayRole(guild);
            await birthdayScheduler.getOrCreateBirthdayChannel(guild);
        }
        
        // Start the birthday scheduler
        birthdayScheduler.startBirthdayScheduler(client);
        
        console.log(`Nurse Joy birthday scheduler has started!`);
    },
};
