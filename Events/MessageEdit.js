const { EmbedBuilder, Events, PermissionsBitField } = require('discord.js');

module.exports = {
  name: Events.MessageUpdate,
  async execute(oldMessage, newMessage) {
    // Ensure we're in a guild context
    if (!oldMessage.guild) return;

    // If the old message is partial, try to fetch it
    if (oldMessage.partial) {
      try {
        oldMessage = await oldMessage.fetch();
      } catch (err) {
        console.error("Error fetching the old message:", err);
        return;
      }
    }

    // Ensure the author exists before accessing properties on it
    if (!oldMessage.author) {
      console.error("The old message has no author; aborting log.");
      return;
    }
    
    // Ignore messages from bots
    if (oldMessage.author.bot) return;

    // Check for a logging channel called "messages"
    let logChannel = oldMessage.guild.channels.cache.find(
      (channel) => channel.name === "messages"
    );

    // If the logging channel doesn't exist, create it
    if (!logChannel) {
      try {
        // Make sure our client user exists before trying to use it.
        const botUser = oldMessage.client?.user;
        if (!botUser) {
          console.error("Bot user not found");
          return;
        }

        logChannel = await oldMessage.guild.channels.create({
          name: "messages",
          type: 0, // 0 is for text channels in Discord.js v14
          permissionOverwrites: [
            {
              id: oldMessage.guild.id, // Everyone role
              deny: [PermissionsBitField.Flags.ViewChannel], // Make it private
            },
            {
              id: botUser.id, // Bot
              allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.EmbedLinks,
              ],
            },
          ],
        });

        console.log(`✅ Created #messages logging channel in ${oldMessage.guild.name}`);
      } catch (err) {
        console.error("❌ Failed to create logging channel:", err);
        return;
      }
    }

    // Ignore edits that don't change the content
    if (oldMessage.content === newMessage.content) return;

    // Build the log embed
    const embed = new EmbedBuilder()
      .setColor(0x000000)
      .setAuthor({
        name: `Edited Message from ${oldMessage.author.tag}`,
        iconURL: oldMessage.author.displayAvatarURL({ dynamic: true }),
        url: `https://discord.com/users/${oldMessage.author.id}`,
      })
      .setDescription(`✏️ Message edited in <#${oldMessage.channel.id}>`)
      .addFields(
        { name: "Message ID", value: oldMessage.id, inline: false },
        { name: "Created At", value: `<t:${Math.floor(oldMessage.createdTimestamp / 1000)}:f>`, inline: false },
        { name: "Edited At", value: `<t:${Math.floor(newMessage.editedTimestamp / 1000)}:f>`, inline: false }
      )
      .setFooter({
        text: oldMessage.guild.name,
        iconURL: oldMessage.guild.iconURL({ dynamic: true }),
      })
      .setTimestamp();

    // Log old & new content, handling long texts by truncating
    if (oldMessage.content) {
      embed.addFields({
        name: "Old Content",
        value:
          oldMessage.content.length > 1024
            ? oldMessage.content.slice(0, 1020) + "..."
            : oldMessage.content,
      });
    }
    if (newMessage.content) {
      embed.addFields({
        name: "New Content",
        value:
          newMessage.content.length > 1024
            ? newMessage.content.slice(0, 1020) + "..."
            : newMessage.content,
      });
    }

    // Log attachments if any
    const oldAttachments = oldMessage.attachments.size
      ? oldMessage.attachments.map(att => `[${att.name}](${att.url})`).join("\n")
      : "None";
    const newAttachments = newMessage.attachments.size
      ? newMessage.attachments.map(att => `[${att.name}](${att.url})`).join("\n")
      : "None";

    embed.addFields(
      { name: "Old Attachments", value: oldAttachments },
      { name: "New Attachments", value: newAttachments }
    );

    // (Optional) Log URL links if present
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const oldLinks = oldMessage.content?.match(urlRegex);
    const newLinks = newMessage.content?.match(urlRegex);
    if (oldLinks || newLinks) {
      embed.addFields(
        { name: "Old Links", value: oldLinks ? oldLinks.join("\n") : "None" },
        { name: "New Links", value: newLinks ? newLinks.join("\n") : "None" }
      );
    }

    // Finally, send the embed to the log channel
    logChannel.send({ embeds: [embed] });
  },
};
