const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

// File paths for storing birthdays and sent birthdays
const FILE_PATH = path.join(__dirname, '../Json/birthdays.json'); // Adjust to the correct path
const SENT_FILE_PATH = path.join(__dirname, '../Json/sentbirthdays.json'); // Adjust path

// -------------------
// JSON Helper Functions
// -------------------

function loadBirthdays() {
    try {
        if (fs.existsSync(FILE_PATH)) {
            const data = fs.readFileSync(FILE_PATH, 'utf8');
            return JSON.parse(data);
        } else {
            console.log(`${FILE_PATH} does not exist, starting with empty data.`);
            return {};
        }
    } catch (error) {
        console.error(`Error loading data from ${FILE_PATH}:`, error);
        return {};
    }
}

function saveBirthdays(birthdaysObj) {
    try {
        fs.writeFileSync(FILE_PATH, JSON.stringify(birthdaysObj, null, 2), 'utf8');
        console.log(`Birthday data saved to ${FILE_PATH}`);
    } catch (error) {
        console.error(`Error saving data to ${FILE_PATH}:`, error);
    }
}

function loadSentBirthdays() {
    try {
        if (fs.existsSync(SENT_FILE_PATH)) {
            const data = fs.readFileSync(SENT_FILE_PATH, 'utf8');
            return JSON.parse(data);
        } else {
            console.log(`${SENT_FILE_PATH} does not exist, starting with empty data.`);
            return {};
        }
    } catch (error) {
        console.error(`Error loading data from ${SENT_FILE_PATH}:`, error);
        return {};
    }
}

function saveSentBirthdays(sentBirthdaysObj) {
    try {
        fs.writeFileSync(SENT_FILE_PATH, JSON.stringify(sentBirthdaysObj, null, 2), 'utf8');
        console.log(`Sent birthdays data saved to ${SENT_FILE_PATH}`);
    } catch (error) {
        console.error(`Error saving data to ${SENT_FILE_PATH}:`, error);
    }
}

// Reset all sent birthdays per guild
function resetSentBirthdays() {
    const allSentBirthdays = loadSentBirthdays();
    for (const guildId in allSentBirthdays) {
        for (const userId in allSentBirthdays[guildId]) {
            allSentBirthdays[guildId][userId] = false;
        }
    }
    saveSentBirthdays(allSentBirthdays);
    console.log('Sent birthdays reset for the new day.');
}

// -------------------
// Helper Functions for Dynamic Channel and Role Creation
// -------------------

async function getOrCreateBirthdayChannel(guild) {
    let channel = guild.channels.cache.find(c => c.name === '🥳🎂birthdays🎂🥳' && c.type === 0);
    if (!channel) {
        try {
            channel = await guild.channels.create({
                name: '🥳🎂birthdays🎂🥳',
                type: 0,
                reason: 'Channel for birthday messages'
            });
            console.log(`Created birthday channel: ${channel.name} in ${guild.name}`);
        } catch (error) {
            console.error('Error creating birthday channel:', error);
        }
    }
    return channel;
}

async function getOrCreateBirthdayRole(guild) {
    let role = guild.roles.cache.find(r => r.name === '🎉Birthday');
    if (!role) {
        try {
            role = await guild.roles.create({
                name: '🎉Birthday',
                color: '#FF0000', // Red
                reason: 'Role for birthday users'
            });
            console.log(`Created birthday role: ${role.name} in ${guild.name}`);
        } catch (error) {
            console.error('Error creating birthday role:', error);
        }
    }
    return role;
}

// -------------------
// Birthday Check Functions
// -------------------

// Process missed birthdays for every guild
async function checkMissedBirthdays(client) {
    console.log('Running missed birthday check...');
    const allBirthdays = loadBirthdays(); // Structure: { guildId: { userId: { birthday: "YYYY-MM-DD" } } }
    const allSentBirthdays = loadSentBirthdays();
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    client.guilds.cache.forEach(async guild => {
        const guildBirthdays = allBirthdays[guild.id] || {};
        if (!allSentBirthdays[guild.id]) allSentBirthdays[guild.id] = {};
        const sentBirthdays = allSentBirthdays[guild.id];

        const birthdayChannel = await getOrCreateBirthdayChannel(guild);
        if (!birthdayChannel) {
            console.error(`Birthday channel not found in ${guild.name}`);
            return;
        }

        let missedBirthdays = [];

        for (const [userId, userData] of Object.entries(guildBirthdays)) {
            const birthDate = new Date(userData.birthday);
            const birthdayYesterday = new Date(yesterday.getFullYear(), birthDate.getMonth(), birthDate.getDate());
            if (birthdayYesterday.toISOString().split('T')[0] === yesterdayStr) {
                if (sentBirthdays[userId]) {
                    console.log(`Missed birthday for ${userId} in ${guild.name} was already sent.`);
                    continue;
                }
                missedBirthdays.push(userId);
            }
        }

        if (missedBirthdays.length > 0) {
            const embed = new EmbedBuilder()
                .setAuthor({
                    name: `${client.user.username} Birthday Bot`,
                    iconURL: client.user.displayAvatarURL({ dynamic: true }),
                })
                .setTitle('🎉 Missed Birthdays 🎉')
                .setColor('#FF4500')
                .setThumbnail(guild.iconURL())
                .setDescription('Here are the birthdays we missed recently:')
                .setFooter({ text: guild.name, iconURL: guild.iconURL() })
                .setTimestamp();

            for (const userId of missedBirthdays) {
                const member = await guild.members.fetch(userId).catch(() => null);
                const username = member ? member.user.username : `Unknown User (ID: ${userId})`;
                embed.addFields({
                    name: username,
                    value: `🎂 Birthday was on ${yesterday.toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                    })}`,
                    inline: true,
                });
                sentBirthdays[userId] = true;
            }

            birthdayChannel.send({ embeds: [embed] })
                .then(() => saveSentBirthdays(allSentBirthdays))
                .catch((error) => {
                    console.error(`Failed to send missed birthdays embed in ${guild.name}:`, error);
                });
        } else {
            console.log(`No missed birthdays found in ${guild.name}.`);
        }
        saveSentBirthdays(allSentBirthdays);
    });
}

// Process today's birthdays for every guild
async function checkBirthdaysDaily(client) {
    console.log('🎂 Running daily birthday check...');
    const allBirthdays = loadBirthdays(); // Structure: { guildId: { userId: { birthday: "YYYY-MM-DD" } } }
    const allSentBirthdays = loadSentBirthdays();
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    client.guilds.cache.forEach(async guild => {
        const guildBirthdays = allBirthdays[guild.id] || {};
        if (!allSentBirthdays[guild.id]) allSentBirthdays[guild.id] = {};
        const sentBirthdays = allSentBirthdays[guild.id];

        const birthdayChannel = await getOrCreateBirthdayChannel(guild);
        if (!birthdayChannel) {
            console.error(`Birthday channel not found in ${guild.name}.`);
            return;
        }

        const birthdayRole = await getOrCreateBirthdayRole(guild);

        for (const [userId, userData] of Object.entries(guildBirthdays)) {
            const birthDate = new Date(userData.birthday);
            const birthdayToday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());

            if (todayStr === birthdayToday.toISOString().split('T')[0]) {
                if (sentBirthdays[userId]) {
                    console.log(`✅ Birthday message already sent for user ${userId} in ${guild.name}`);
                    continue;
                }

                let member;
                try {
                    member = await guild.members.fetch(userId);
                } catch (error) {
                    console.error(`⚠️ Failed to fetch user with ID ${userId} in ${guild.name}:`, error.message);
                    continue;
                }

                if (!member) {
                    console.error(`⚠️ User ${userId} not found in ${guild.name}`);
                    continue;
                }

                // Create Birthday Embed with dynamic avatar and server icon image
                const embed = new EmbedBuilder()
                    .setAuthor({
                        name: `Birthday Greetings from ${client.user.username}`,
                        iconURL: client.user.displayAvatarURL({ dynamic: true }),
                    })
                    .setColor('#FFD700')
                    .setTitle(`🎉 Happy Birthday, <@${member.id}>! 🎉`)
                    .setDescription('Wishing you an amazing day on your birthday! 🎂 Enjoy your special day!')
                    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                    .setImage(guild.iconURL({ dynamic: true }))
                    .setFooter({ text: guild.name, iconURL: guild.iconURL() })
                    .setTimestamp();

                birthdayChannel.send({
                    content: `@everyone It's <@${member.id}>'s birthday today! Wish them a happy birthday 😀`,
                    embeds: [embed]
                }).catch(error => {
                    console.error(`⚠️ Failed to send birthday message for ${member.user.username} in ${guild.name}:`, error.message);
                });

                // Assign the birthday role if not already assigned
                if (!member.roles.cache.has(birthdayRole.id)) {
                    member.roles.add(birthdayRole)
                        .then(() => {
                            console.log(`Assigned birthday role to ${member.user.tag} in ${guild.name}`);
                        })
                        .catch(error => {
                            console.error(`Failed to assign birthday role to ${member.user.tag} in ${guild.name}:`, error.message);
                        });
                }

                sentBirthdays[userId] = true;
            }
        }
        saveSentBirthdays(allSentBirthdays);
    });
}

async function removeBirthdayRolesDaily(client) {
    console.log("🔄 Removing expired birthday roles...");
    client.guilds.cache.forEach(guild => {
        const birthdayRole = guild.roles.cache.find(r => r.name === '🎉Birthday');
        if (!birthdayRole) {
            console.error(`⚠️ Birthday role not found in ${guild.name}!`);
            return;
        }

        birthdayRole.members.forEach(async (member) => {
            try {
                await member.roles.remove(birthdayRole);
                console.log(`Removed Birthday Role from ${member.user.tag} in ${guild.name}`);
            } catch (error) {
                console.error(`Error removing role from ${member.user.tag} in ${guild.name}:`, error);
            }
        });
    });
}

// -------------------
// Scheduler
// -------------------

function startBirthdayScheduler(client) {
    console.log('Starting the birthday scheduler...');
    setInterval(() => {
        const now = new Date();
        // Reset sent birthdays at midnight for all guilds
        if (now.getHours() === 0 && now.getMinutes() === 0) {
            resetSentBirthdays();
            removeBirthdayRolesDaily(client);
        }
        checkBirthdaysDaily(client);
        checkMissedBirthdays(client);
    }, 1000 * 60 * 60); // Run every hour
}

module.exports = {
    startBirthdayScheduler,
    getOrCreateBirthdayRole,
    getOrCreateBirthdayChannel,
};
