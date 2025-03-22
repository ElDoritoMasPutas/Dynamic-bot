// src/events/guildMemberAdd.js
const { Events, ChannelType, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { updateCachedInvites } = require('../Utils/updateCachedInvites');

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    const cachedInvitesPath = path.join(__dirname, '../Json/cachedInvites.json');
    const inviteChannelsPath = path.join(__dirname, '../Json/inviteChannels.json');
    const inviteImagesPath = path.join(__dirname, '../Json/inviteImages.json');

    // Load cached invites
    let cachedInvites = {};
    if (fs.existsSync(cachedInvitesPath)) {
      cachedInvites = JSON.parse(fs.readFileSync(cachedInvitesPath, 'utf-8'));
    }

    // Load invite channels
    let inviteChannels = {};
    if (fs.existsSync(inviteChannelsPath)) {
      inviteChannels = JSON.parse(fs.readFileSync(inviteChannelsPath, 'utf-8'));
    }

    // Load invite images
    let inviteImages = {};
    if (fs.existsSync(inviteImagesPath)) {
      inviteImages = JSON.parse(fs.readFileSync(inviteImagesPath, 'utf-8'));
    }

    // Fetch current invites
    let invites;
    try {
      invites = await member.guild.invites.fetch();
    } catch (error) {
      console.error(`Could not fetch invites for guild ${member.guild.id}:`, error);
      return;
    }

    // Get cached invites for this guild
    const guildInvites = cachedInvites[member.guild.id] || {};

    // Find the used invite
    const usedInvite = invites.find((invite) => {
      const cachedUses = guildInvites[invite.code] || 0;
      return invite.uses > cachedUses;
    });

    // Update the cached invites
    await updateCachedInvites(member.guild);

    // Determine inviter and invite count
    let inviter;
    let inviteCount = 0;
    if (usedInvite && usedInvite.inviter) {
      inviter = usedInvite.inviter;

      // Calculate inviter's total invites
      inviteCount = invites
        .filter((inv) => inv.inviter && inv.inviter.id === inviter.id)
        .reduce((acc, inv) => acc + inv.uses, 0);
    }

    // Get or create the invite tracker channel
    let channelId = inviteChannels[member.guild.id];
    let channel = member.guild.channels.cache.get(channelId);

    if (!channel) {
      channel = member.guild.channels.cache.find(
        (ch) => ch.name === '📊invite-tracker' && ch.type === ChannelType.GuildText
      );

      if (!channel) {
        try {
          channel = await member.guild.channels.create({
            name: '📊invite-tracker',
            type: ChannelType.GuildText,
            permissionOverwrites: [
              {
                id: member.guild.roles.everyone.id,
                allow: ['ViewChannel'],
                deny: ['SendMessages'],
              },
            ],
          });
        } catch (error) {
          console.error(`Error creating invite tracker channel:`, error);
          return;
        }
      }

      // Save the channel ID
      inviteChannels[member.guild.id] = channel.id;
      fs.writeFileSync(inviteChannelsPath, JSON.stringify(inviteChannels, null, 2));
    }

    // Get the image URL for this guild
    const imageUrl = inviteImages[member.guild.id];

    // Create the embed message
    const embed = new EmbedBuilder()
      .setColor(0x000000)
      .setTimestamp();

    // Set the image (if provided)
    if (imageUrl) {
      embed.setImage(imageUrl);
    }

    // Add thumbnail (member's avatar)
    embed.setThumbnail(member.user.displayAvatarURL({ dynamic: true }));

    // Set the footer (guild name and icon)
    embed.setFooter({
      text: member.guild.name,
      iconURL: member.guild.iconURL({ dynamic: true }) || undefined,
    });

    // Set the author (bot's name and avatar)
    embed.setAuthor({
      name: member.client.user.username,
      iconURL: member.client.user.displayAvatarURL({ dynamic: true }),
    });

    // Set the description
    if (inviter) {
      embed.setDescription(
        `<@${member.id}> has joined! Invited by <@${inviter.id}>, who now has **${inviteCount}** invite(s).`
      );
    } else {
      embed.setDescription(
        `🎉 Welcome <@${member.id}>! We couldn't determine who invited you, but we're glad you're here.`
      );
    }

    // Send the embed in the invite tracker channel
    try {
      await channel.send({ embeds: [embed] });
    } catch (error) {
      console.error(`Error sending message to invite tracker channel:`, error);
    }
  },
};
