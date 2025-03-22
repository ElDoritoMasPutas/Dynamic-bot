const { Events } = require('discord.js');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', 'Json', 'antiRaid.json');
let config = {};

try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (error) {
    console.error('Failed to load antiRaid config:', error);
}

module.exports = {
    name: Events.GuildUpdate,
    async execute(oldGuild, newGuild) {
       // console.log(`GuildUpdate triggered for ${newGuild.name}`);

        if (!config[newGuild.id]) return;
        const settings = config[newGuild.id];

        if (settings.autoBan) {
            const members = await newGuild.members.fetch();
            members.forEach(async member => {
                if (!member.user.bot && !settings.whitelist.includes(member.id)) {
                    //console.log(`Banning ${member.user.tag} due to raid detection.`);
                    await member.ban({ reason: 'Anti-Raid: Automated raid detection' });
                }
            });
        }
    }
};
