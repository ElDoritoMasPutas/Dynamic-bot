// Import necessary Discord.js classes and utilities
const { Events, EmbedBuilder, AuditLogEvent, PermissionsBitField, GatewayIntentBits } = require('discord.js');
const path = require('path');
const fs = require('fs');

// Path to the configuration file
const configPath = path.join(__dirname, '..', 'Json', 'GoodbyeChannels.json');

// Ensure the configuration file exists
if (!fs.existsSync(configPath)) {
  fs.writeFileSync(configPath, JSON.stringify({ servers: {} }, null, 2));
}

// Utility function: delay execution for a given number of milliseconds
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(member) {
    console.log(`🔍 Member left: ${member.user.tag} (ID: ${member.user.id})`);

    // Load the configuration dynamically each time the event is fired
    let config;
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (error) {
      console.error('❌ Error reading config file:', error);
      return;
    }

    const guildId = member.guild.id;
    const serverConfig = config.servers?.[guildId];

    if (!serverConfig) {
      console.log('❌ No goodbye config found for this server.');
      return;
    }

    // Fetch the goodbye channel directly from Discord to ensure it's up-to-date
    let goodbyeChannel;
    try {
      goodbyeChannel = await member.guild.channels.fetch(serverConfig.goodbyeChannel);
      if (!goodbyeChannel) throw new Error('Channel not found');
    } catch (error) {
      console.log(`❌ Goodbye channel not found or inaccessible: ${serverConfig.goodbyeChannel}`);
      return;
    }

    // Fetch the bot's member object to check permissions accurately
    let botMember;
    try {
      botMember = await member.guild.members.fetchMe();
    } catch (error) {
      console.error('❌ Could not fetch bot member:', error);
      return;
    }

    // Define the required permissions for the bot
    const requiredPermissions = new PermissionsBitField([
      PermissionsBitField.Flags.SendMessages,
      PermissionsBitField.Flags.EmbedLinks,
      PermissionsBitField.Flags.ViewAuditLog,
    ]);

    // Check if the bot has the necessary permissions in the goodbye channel
    if (!goodbyeChannel.permissionsFor(botMember).has(requiredPermissions)) {
      console.log(`🚨 Bot lacks necessary permissions in ${goodbyeChannel.name}`);
      return;
    }

    // Set default values assuming the member left voluntarily
    let leaveReason = '🚪 **Left the server voluntarily**';
    let actionTaken = 'Left';

    // Wait to allow Discord to update the audit logs (increase if necessary)
    await delay(5000);

    try {
      // Fetch the latest audit logs (increase limit if your server is very active)
      const auditLogs = await member.guild.fetchAuditLogs({ limit: 10 });

      const now = Date.now();

      // Find an audit log entry related to this member's kick or ban within the last 10 seconds
      const auditEntry = auditLogs.entries.find(entry =>
        entry.target.id === member.id &&
        (now - entry.createdTimestamp < 10000) && // within the last 10 seconds
        (
          entry.action === AuditLogEvent.MemberKick ||
          entry.action === AuditLogEvent.MemberBanAdd
        )
      );

      if (auditEntry) {
        const { action, reason, executor } = auditEntry;

        if (action === AuditLogEvent.MemberKick) {
          leaveReason = `👢 **Kicked by ${executor.tag}**\n📜 **Reason:** ${reason || 'No reason provided'}`;
          actionTaken = 'Kicked';
        } else if (action === AuditLogEvent.MemberBanAdd) {
          leaveReason = `⛔ **Banned by ${executor.tag}**\n📜 **Reason:** ${reason || 'No reason provided'}`;
          actionTaken = 'Banned';
        }
      }
    } catch (error) {
      console.error('❌ Could not fetch audit logs:', error);
    }

    // Build the goodbye embed message
    const goodbyeEmbed = new EmbedBuilder()
      .setColor(0x000000)
      .setTitle(`🚨 Member ${actionTaken}: ${member.user.tag}`)
      .setDescription(leaveReason)
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        {
          name: '📆 Account Created',
          value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
          inline: true,
        },
        {
          name: '🕰️ Joined Server',
          value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`,
          inline: true,
        }
      )
      .setFooter({
        text: `User ID: ${member.user.id}`,
        iconURL:
          member.guild.iconURL({ dynamic: true }) ||
          member.user.displayAvatarURL({ dynamic: true }),
      })
      .setTimestamp();

    // If a goodbye image is specified in the config, set it in the embed
    if (serverConfig.goodbyeImage) {
      goodbyeEmbed.setImage(serverConfig.goodbyeImage);
    }

    // Send the goodbye embed message to the specified channel
    try {
      await goodbyeChannel.send({ embeds: [goodbyeEmbed] });
      console.log(`✅ Goodbye message sent in ${goodbyeChannel.name}`);
    } catch (error) {
      console.error('❌ Could not send goodbye message:', error);
    }
  },
};
