const { Events, EmbedBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    name: Events.GuildRoleDelete,
    async execute(role) {
        console.log(`[DEBUG] RoleDelete event fired!`);

        if (!role.guild) return;

        let logChannel = role.guild.channels.cache.find(channel => channel.name.toLowerCase().includes("role-logs"));

        if (!logChannel) {
            try {
                logChannel = await role.guild.channels.create({
                    name: "role-logs",
                    type: 0, // Text channel
                    permissionOverwrites: [
                        {
                            id: role.guild.roles.everyone.id,
                            allow: [PermissionsBitField.Flags.ViewChannel],
                        }
                    ]
                });
                console.log("[DEBUG] Created role-logs channel.");
            } catch (error) {
                console.error("[ERROR] Failed to create role-logs channel:", error);
                return;
            }
        }

        const embed = new EmbedBuilder()
            .setColor(0x000000)
            .setTitle("❌ Role Deleted")
            .setDescription(`A role has been **deleted** in **${role.guild.name}**`)
            .addFields(
                { name: "📌 Role Name", value: role.name || "Unknown", inline: true },
                { name: "🎨 Role Color", value: role.hexColor?.toUpperCase() || "None", inline: true },
                { name: "🛠️ Deleted By", value: "Fetching data...", inline: false }
            )
            .setFooter({ text: `Role ID: ${role.id || "Unknown"}`, iconURL: role.guild.iconURL({ dynamic: true }) })
            .setTimestamp();

        const message = await logChannel.send({ embeds: [embed] });

        await new Promise(resolve => setTimeout(resolve, 3000));

        let executor = "Unknown (Audit logs not found)";
        try {
            const auditLogs = await role.guild.fetchAuditLogs({ type: 32, limit: 1 });
            const logEntry = auditLogs.entries.first();

            if (logEntry) {
                executor = `<@${logEntry.executor.id}> (${logEntry.executor.tag})`;
                console.log(`[DEBUG] Role was deleted by: ${logEntry.executor.tag}`);
            }
        } catch (error) {
            console.error("[ERROR] Failed to fetch audit logs:", error);
        }

        const updatedEmbed = EmbedBuilder.from(embed).setFields(
            { name: "📌 Role Name", value: role.name || "Unknown", inline: true },
            { name: "🎨 Role Color", value: role.hexColor?.toUpperCase() || "None", inline: true },
            { name: "🛠️ Deleted By", value: executor, inline: false }
        );

        await message.edit({ embeds: [updatedEmbed] });
    }
};