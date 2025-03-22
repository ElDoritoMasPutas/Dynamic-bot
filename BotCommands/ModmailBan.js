const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const bannedFile = path.join(__dirname, '..', 'Json', 'modmailbanned.json');
let bannedUsers = {};
try {
    bannedUsers = JSON.parse(fs.readFileSync(bannedFile, 'utf8'));
} catch (err) {
    console.error('Failed to load modmail banned file:', err);
}

function saveBannedUsers() {
    fs.writeFileSync(bannedFile, JSON.stringify(bannedUsers, null, 2), 'utf8');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('banmail')
        .setDescription('Ban a user from using ModMail')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user to ban from ModMail')
                .setRequired(true)
        ),
    async execute(interaction) {
        // Ensure the invoking member has administrator permission.
        if (!interaction.member.permissions.has('ADMINISTRATOR')) {
            return interaction.reply({ content: '⛔ You do not have permission to ban users from ModMail.', ephemeral: true });
        }
        
        const targetUser = interaction.options.getUser('target');
        bannedUsers[targetUser.id] = true;
        saveBannedUsers();
        
        return interaction.reply({ content: `✅ <@${targetUser.id}> has been banned from using ModMail.`, ephemeral: true });
    }
};
