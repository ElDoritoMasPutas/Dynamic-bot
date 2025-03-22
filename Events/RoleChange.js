const { Events, EmbedBuilder } = require('discord.js');

module.exports = {
  name: Events.GuildMemberUpdate,
  async execute(oldMember, newMember) {
    // Ignore bot role changes
    if (newMember.user.bot) return;

    // Find a logging channel (role-updates or system channel as fallback)
    let logChannel = newMember.guild.channels.cache.find(channel => channel.name.toLowerCase().includes("role-logs"))
      || newMember.guild.systemChannel;

    if (!logChannel) return; // No suitable channel found

    // Detect added and removed roles
    const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
    const removedRoles = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));

    if (addedRoles.size === 0 && removedRoles.size === 0) return; // No role changes

    // Fetch the audit log entry to find out who changed the roles
    const auditLogs = await newMember.guild.fetchAuditLogs({ type: 25, limit: 5 }); // Fetch recent role update logs
    const roleLog = auditLogs.entries.find(entry => entry.target.id === newMember.user.id);

    let executor = roleLog ? `<@${roleLog.executor.id}> (${roleLog.executor.tag})` : "Unknown (Audit logs not found)";

    const roleChanges = [];
    if (addedRoles.size > 0) {
      roleChanges.push(`🟢 **Added Roles:** ${addedRoles.map(r => `<@&${r.id}>`).join(', ')}`);
    }
    if (removedRoles.size > 0) {
      roleChanges.push(`🔴 **Removed Roles:** ${removedRoles.map(r => `<@&${r.id}>`).join(', ')}`);
    }

    // Create the embed log message
    const roleUpdateEmbed = new EmbedBuilder()
      .setColor(0x000000)
      .setTitle("🔔 Role Update Detected")
      .setDescription(`Roles updated for <@${newMember.user.id}> (${newMember.user.tag})`)
      .addFields(
        { name: "📌 Changes", value: roleChanges.join("\n"), inline: false },
        { name: "🛠️ Changed By", value: executor, inline: false },
        { name: "🎭 Current Roles", value: newMember.roles.cache.map(r => `<@&${r.id}>`).join(", ") || "None", inline: false }
      )
      .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true }))
      .setFooter({
        text: `User ID: ${newMember.user.id}`,
        iconURL: newMember.guild.iconURL({ dynamic: true })
      })
      .setTimestamp();

    // Send the embed to the log channel
    logChannel.send({ embeds: [roleUpdateEmbed] });
  }
};