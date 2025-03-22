const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const bannedFile = path.join(__dirname, '..', 'Json', 'modmailbanned.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unbanmail')
        .setDescription('Unban a user from using ModMail')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user to unban from ModMail')
                .setRequired(true)
        ),
    async execute(interaction) {
        // Ensure the invoking member has administrator permission.
        if (!interaction.member.permissions.has('ADMINISTRATOR')) {
            return interaction.reply({ content: '⛔ You do not have permission to unban users from ModMail.', ephemeral: true });
        }
        
        // Reload the banned list from disk.
        let bannedUsers = {};
        try {
            bannedUsers = JSON.parse(fs.readFileSync(bannedFile, 'utf8'));
        } catch (err) {
            console.error('Failed to load modmail banned file:', err);
        }
        
        const targetUser = interaction.options.getUser('target');
        
        // Check if the user is currently banned.
        if (bannedUsers[targetUser.id]) {
            delete bannedUsers[targetUser.id];
            fs.writeFileSync(bannedFile, JSON.stringify(bannedUsers, null, 2), 'utf8');
            return interaction.reply({ content: `✅ <@${targetUser.id}> has been unbanned from using ModMail.`, ephemeral: true });
        } else {
            return interaction.reply({ content: `⚠️ <@${targetUser.id}> is not banned from ModMail.`, ephemeral: true });
        }
    }
};
