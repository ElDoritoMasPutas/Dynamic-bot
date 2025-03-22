const { EmbedBuilder, Events, PermissionsBitField } = require('discord.js');

module.exports = {
    name: Events.MessageDelete,
    async execute(message) {
        // Ignore direct messages
        if (!message.guild) return;

        // Save references to the original guild and channel
        const guild = message.guild;
        const channel = message.channel;
        const logChannelName = "messages";

        // Find or create the log channel
        let logChannel = guild.channels.cache.find(
            (channel) => channel.name === logChannelName
        );

        if (!logChannel) {
            try {
                logChannel = await guild.channels.create({
                    name: logChannelName,
                    type: 0, // Text Channel (in v14, you might use ChannelType.GuildText instead)
                    permissionOverwrites: [
                        {
                            id: guild.id, // Everyone role
                            deny: [PermissionsBitField.Flags.ViewChannel],
                        },
                        {
                            id: message.client.user.id, // Bot
                            allow: [
                                PermissionsBitField.Flags.ViewChannel,
                                PermissionsBitField.Flags.SendMessages,
                                PermissionsBitField.Flags.EmbedLinks,
                            ],
                        },
                    ],
                });
                console.log(`✅ Created #${logChannelName} logging channel in ${guild.name}`);
            } catch (err) {
                console.error(`❌ Failed to create logging channel: ${err}`);
                return;
            }
        }

        // Fetch partial messages if necessary
        if (message.partial) {
            try {
                await message.fetch();
            } catch (error) {
                if (error.code === 10008) {
                    console.log('Message not found (already deleted or not cached), skipping further processing.');
                    return;
                } else {
                    console.error('Error fetching partial message:', error);
                    return;
                }
            }
        }

        // We'll store any extra details from audit logs here
        let extraData = {};

        // If no content or embeds, attempt to fetch audit log (for deleted bot messages)
        if (!message.content && (!message.embeds || message.embeds.length === 0)) {
            try {
                const fetchedLogs = await guild.fetchAuditLogs({ type: 72, limit: 1 }); // 72 = MESSAGE_DELETE
                const deletionLog = fetchedLogs.entries.first();

                if (deletionLog) {
                    const { target, extra } = deletionLog;
                    if (target.bot) {
                        console.log(`🔍 Fetched deleted bot message: ${target.tag}`);
                        // Instead of overriding `message`, store extra data to merge later.
                        extraData = extra || {};
                    }
                }
            } catch (error) {
                console.error("❌ Failed to fetch deleted bot message:", error);
            }
        }

        // Merge extra data (if any) with the message data
        const content = extraData.content || message.content;
        const createdTimestamp = extraData.createdTimestamp || message.createdTimestamp;

        // Build the base embed log
        const embed = new EmbedBuilder()
            .setColor(0x000000)
            .setAuthor({
                name: `Deleted Message from ${message.author?.tag || "Unknown User"}`,
                iconURL: message.author?.displayAvatarURL({ dynamic: true }) || null,
                url: message.author ? `https://discord.com/users/${message.author.id}` : null,
            })
            .setDescription(`🗑️ Message deleted in <#${channel.id}>`)
            .addFields(
                {
                    name: "Message ID",
                    value: message.id || "Unknown ID",
                    inline: false,
                },
                {
                    name: "Created At",
                    value: createdTimestamp
                        ? `<t:${Math.floor(createdTimestamp / 1000)}:f>`
                        : "Unknown Time",
                    inline: false,
                }
            )
            .setFooter({
                text: `${guild.name}`,
                iconURL: guild.iconURL({ dynamic: true }) || null,
            })
            .setTimestamp();

        // Log text content
        if (content && content.trim() !== "") {
            const contentValue =
                content.length > 1024 ? content.slice(0, 1020) + "..." : content;
            embed.addFields({
                name: "Content",
                value: contentValue,
            });
        }

        // Log attachments
        if (message.attachments && message.attachments.size > 0) {
            const attachments = message.attachments
                .map((att) => {
                    const attName = att.name || "Unknown File";
                    return `[${attName}](${att.url})`;
                })
                .join("\n");

            embed.addFields({
                name: "Attachments",
                value: attachments || "No attachments",
            });
        }

        // Log links detected in the content
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const links = content ? content.match(urlRegex) : null;
        if (links && links.length > 0) {
            const linksValue = links.join("\n").slice(0, 1024);
            embed.addFields({
                name: "Links Detected",
                value: linksValue,
            });
        }

        // Send the main log embed
        logChannel.send({ embeds: [embed] }).catch((error) => {
            console.error("Error sending log embed:", error);
        });

        // If the original message contained embeds, log each one separately
        if (message.embeds && message.embeds.length > 0) {
            message.embeds.forEach((msgEmbed, index) => {
                const embedLog = new EmbedBuilder()
                    .setColor(msgEmbed.color || 0x000000)
                    .setTitle(
                        msgEmbed.title
                            ? `📜 Embed ${index + 1}: ${msgEmbed.title}`
                            : `📜 Embed ${index + 1}`
                    )
                    .setDescription(msgEmbed.description || "No description")
                    .setFooter({
                        text: `${guild.name}`,
                        iconURL: guild.iconURL({ dynamic: true }) || null,
                    })
                    .setTimestamp();

                // Include embed author if available
                if (msgEmbed.author) {
                    embedLog.setAuthor({
                        name: msgEmbed.author.name || "Unknown Author",
                        iconURL: msgEmbed.author.iconURL || null,
                        url: msgEmbed.author.url || null,
                    });
                }

                // Include fields from the embed if any
                if (msgEmbed.fields && msgEmbed.fields.length > 0) {
                    msgEmbed.fields.forEach((field) => {
                        embedLog.addFields({
                            name: field.name ? field.name.slice(0, 256) : "No name",
                            value: field.value ? field.value.slice(0, 1024) : "No value",
                            inline: field.inline || false,
                        });
                    });
                }

                // Include footer if present
                if (msgEmbed.footer) {
                    embedLog.setFooter({
                        text: msgEmbed.footer.text || `${guild.name}`,
                        iconURL: msgEmbed.footer.iconURL || guild.iconURL({ dynamic: true }) || null,
                    });
                }

                // Include thumbnail and image if available
                if (msgEmbed.thumbnail) {
                    embedLog.setThumbnail(msgEmbed.thumbnail.url);
                }
                if (msgEmbed.image) {
                    embedLog.setImage(msgEmbed.image.url);
                }

                // Optionally log a URL field if provided
                if (msgEmbed.url) {
                    embedLog.addFields({
                        name: "URL",
                        value: msgEmbed.url.toString(),
                    });
                }

                // Send each embed log separately
                logChannel.send({ embeds: [embedLog] }).catch((error) => {
                    console.error("Error sending embed log:", error);
                });
            });
        }
    },
};
