const { 
	ChannelType, 
	PermissionsBitField, 
	EmbedBuilder 
} = require('discord.js');
const path = require('path');
const fs = require('fs');

// File to store modmail conversation mappings: { userId: { guildId, forumChannelId, threadId } }
const modmailFile = path.join(__dirname, '../Json/modmail.json');
let modmailData = fs.existsSync(modmailFile) ? JSON.parse(fs.readFileSync(modmailFile, 'utf-8')) : {};

// File to track if a user has been welcomed: { userId: { welcomed: true } }
const dmTrackerFile = path.join(__dirname, '../Json/dmTracker.json');
let dmTracker = fs.existsSync(dmTrackerFile) ? JSON.parse(fs.readFileSync(dmTrackerFile, 'utf-8')) : {};

// File to store banned users: { userId: true }
const modmailBannedFile = path.join(__dirname, '../Json/modmailbanned.json');
let bannedUsers = fs.existsSync(modmailBannedFile) ? JSON.parse(fs.readFileSync(modmailBannedFile, 'utf-8')) : {};

// Save functions
function saveModmailData() {
	fs.writeFileSync(modmailFile, JSON.stringify(modmailData, null, 2), 'utf-8');
}
function saveDMTracker() {
	fs.writeFileSync(dmTrackerFile, JSON.stringify(dmTracker, null, 2), 'utf-8');
}
function saveBannedUsers() {
	fs.writeFileSync(modmailBannedFile, JSON.stringify(bannedUsers, null, 2), 'utf-8');
}

/**
 * Reload bannedUsers from disk on every check so updates are reflected immediately.
 */
function isUserBanned(userId) {
	try {
		bannedUsers = JSON.parse(fs.readFileSync(modmailBannedFile, 'utf-8'));
	} catch (err) {
		console.error('Error reading banned file:', err);
	}
	const banned = bannedUsers[userId] === true;
	console.log(`isUserBanned check for ${userId}: ${banned}`);
	return banned;
}

module.exports = {
	name: 'messageCreate',
	once: false,
	async execute(message) {
		if (message.author.bot) return;
		const client = message.client;
		
		// ──[ DM Handling: User sends a DM to the bot ]────────────────────────────
		if (message.channel.type === ChannelType.DM) {
			console.log(`Received DM from ${message.author.tag}`);
			
			// Check if the user is banned (reloads file on each check).
			if (isUserBanned(message.author.id)) {
				console.log(`User ${message.author.tag} is banned from ModMail.`);
				return message.author.send("⛔ You have been banned from ModMail.");
			}
			
			// If the user hasn't been welcomed yet, send the welcome embed.
			if (!dmTracker[message.author.id] || !dmTracker[message.author.id].welcomed) {
				try {
					await message.author.send({
						embeds: [new EmbedBuilder()
							.setTitle("Contact Staff Here")
							.setDescription("Welcome to modmail, a member of staff will be with you shortly. Please provide a clear description of your issue.")
							.setColor(0x00FF00)]
					});
				} catch (err) {
					console.error(`Could not send welcome message to ${message.author.tag}: ${err}`);
				}
				// Mark the user as welcomed.
				if (!dmTracker[message.author.id]) dmTracker[message.author.id] = {};
				dmTracker[message.author.id].welcomed = true;
				saveDMTracker();
			}
			
			// Check if a modmail conversation already exists.
			if (modmailData[message.author.id]) {
				try {
					const guild = await client.guilds.fetch(modmailData[message.author.id].guildId);
					const forumChannel = await guild.channels.fetch(modmailData[message.author.id].forumChannelId);
					const thread = forumChannel.threads.cache.get(modmailData[message.author.id].threadId);
					if (thread) {
						await thread.send(`${message.author.tag}: ${message.content}`);
						if (message.attachments.size > 0) {
							message.attachments.forEach(async attachment => {
								await thread.send({ content: `${message.author.tag} sent an attachment:`, files: [attachment.url] });
							});
						}
						return;
					} else {
						// If the thread was deleted, remove the mapping.
						delete modmailData[message.author.id];
						saveModmailData();
					}
				} catch (err) {
					console.error("Error fetching existing modmail thread:", err);
					// Continue to create a new conversation.
				}
			}
			
			// No existing conversation – pick a target guild (here we use the first one the bot is in).
			const targetGuild = client.guilds.cache.first();
			if (!targetGuild) return message.author.send("❌ The bot isn't in any guilds to forward your message.");
			
			try {
				// Look for a forum channel named "📥-modmail" in the target guild.
				let forumChannel = targetGuild.channels.cache.find(c => 
					c.type === ChannelType.GuildForum && c.name === "📥-modmail"
				);
				if (!forumChannel) {
					// Create the forum channel if it doesn't exist.
					forumChannel = await targetGuild.channels.create({
						name: "📥-modmail",
						type: ChannelType.GuildForum,
						topic: "Universal Modmail forum channel for modmail submissions",
						defaultAutoArchiveDuration: 1440, // 24 hours
						defaultForumLayout: 0,            // 0 for list view; 1 for gallery view
						permissionOverwrites: [
							{
								id: targetGuild.roles.everyone.id,
								deny: [PermissionsBitField.Flags.ViewChannel]
							},
							{
								id: client.user.id,
								allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageThreads]
							}
						]
					});
				}
				
				// Create a new forum thread (forum post) for this conversation.
				// We use the user's ID as the thread name.
				const newThread = await forumChannel.threads.create({
					name: message.author.id,
					autoArchiveDuration: 1440,
					message: { content: `New ModMail from ${message.author.tag}: ${message.content}` },
					reason: `ModMail conversation with ${message.author.tag}`
				});
				
				// Save the mapping.
				modmailData[message.author.id] = {
					guildId: targetGuild.id,
					forumChannelId: forumChannel.id,
					threadId: newThread.id
				};
				saveModmailData();
				
				if (message.attachments.size > 0) {
					message.attachments.forEach(async attachment => {
						await newThread.send({ content: `${message.author.tag} sent an attachment:`, files: [attachment.url] });
					});
				}
				
				await message.author.send("✅ Your message has been forwarded to the moderators.");
			} catch (error) {
				console.error('Error creating modmail forum thread:', error);
				await message.author.send("❌ There was an error forwarding your message. Please try again later.");
			}
		}
		
		// ──[ Staff Replies: Message in a modmail forum thread ]─────────────────────
		if (message.guild) {
			if (
				message.channel.isThread() &&
				message.channel.parent &&
				message.channel.parent.type === ChannelType.GuildForum &&
				message.channel.parent.name === "📥-modmail"
			) {
				// Assume the thread's name is the user's ID.
				const userId = message.channel.name;
				try {
					const user = await client.users.fetch(userId);
					if (user) {
						const embed = new EmbedBuilder()
							.setTitle("Staff Response")
							.setDescription(`**${message.author.tag}:** ${message.content}`)
							.setColor(0x3498DB)
							.setTimestamp();
						await user.send({ embeds: [embed] });
						if (message.attachments.size > 0) {
							message.attachments.forEach(async attachment => {
								await user.send({ content: "Staff sent an attachment:", files: [attachment.url] });
							});
						}
					}
				} catch (error) {
					console.error('Error forwarding staff reply to user:', error);
				}
			}
		}
	}
};
