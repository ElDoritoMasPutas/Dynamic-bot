const { Events, EmbedBuilder, ChannelType } = require('discord.js');

module.exports = {
    name: Events.ChannelDelete,
    async execute(deletedChannel) {
        const guild = deletedChannel.guild;

        // Look for a text channel named "misc-logs"
        let logChannel = guild.channels.cache.find(
            channel => channel.name === 'misc-logs' && channel.type === ChannelType.GuildText
        );

        // If not found, create it dynamically
        if (!logChannel) {
            try {
                logChannel = await guild.channels.create({
                    name: 'misc-logs',
                    type: ChannelType.GuildText,
                    topic: 'Automatically generated channel for logging miscellaneous events.',
                    reason: 'Auto-created misc-logs channel for logging channel deletions.'
                });
            } catch (error) {
                console.error('Error creating misc-logs channel:', error);
                return;
            }
        }

        // Helper: Represent the channel type as a human-friendly string.
        const getChannelTypeName = (type) => {
            switch (type) {
                case ChannelType.GuildText:
                    return 'Text Channel';
                case ChannelType.GuildVoice:
                    return 'Voice Channel';
                case ChannelType.GuildCategory:
                    return 'Category';
                case ChannelType.GuildAnnouncement:
                    return 'Announcement Channel';
                case ChannelType.GuildStageVoice:
                    return 'Stage Channel';
                case ChannelType.GuildForum:
                    return 'Forum Channel';
                case ChannelType.GuildStore:
                    return 'Store Channel';
                default:
                    return 'Unknown';
            }
        };

        // Build a base embed that includes details common to all channels
        const deleteEmbed = new EmbedBuilder()
            .setColor(0x000000)
            .setTitle('🗑️ Channel Deleted')
            .setDescription(`A channel was deleted from **${guild.name}**.`)
            .addFields(
                { name: 'Channel Name', value: `${deletedChannel.name}`, inline: true },
                { name: 'Channel', value: `<#${deletedChannel.id}>`, inline: true },
                { name: 'Type', value: getChannelTypeName(deletedChannel.type), inline: true }
            )
            .setTimestamp();

        // For text-based channels (text, announcement, forum, etc.)
        if ('topic' in deletedChannel) {
            deleteEmbed.addFields({ name: 'Topic', value: deletedChannel.topic || 'None', inline: false });
        }
        if ('rateLimitPerUser' in deletedChannel) {
            deleteEmbed.addFields({ name: 'Slowmode', value: `${deletedChannel.rateLimitPerUser} seconds`, inline: true });
        }
        if ('nsfw' in deletedChannel) {
            deleteEmbed.addFields({ name: 'NSFW', value: deletedChannel.nsfw ? 'Enabled' : 'Disabled', inline: true });
        }

        // For voice channels (including stage channels)
        if (deletedChannel.type === ChannelType.GuildVoice || deletedChannel.type === ChannelType.GuildStageVoice) {
            deleteEmbed.addFields(
                { name: 'Bitrate', value: `${deletedChannel.bitrate}`, inline: true },
                { name: 'User Limit', value: `${deletedChannel.userLimit || 'None'}`, inline: true }
            );
        }

        // If the deleted channel was in a category, include that info.
        if (deletedChannel.parent) {
            deleteEmbed.addFields({ name: 'Parent Category', value: deletedChannel.parent.name, inline: true });
        }

        // Show channel position if available
        if (typeof deletedChannel.position !== 'undefined') {
            deleteEmbed.addFields({ name: 'Position', value: `${deletedChannel.position}`, inline: true });
        }

        // Display when the channel was originally created
        if (deletedChannel.createdAt) {
            deleteEmbed.addFields({
                name: 'Created At',
                value: `<t:${Math.floor(deletedChannel.createdAt.getTime() / 1000)}:F>`,
                inline: true
            });
        }

        // Forum channels may have extra properties—log them if available.
        if (deletedChannel.type === ChannelType.GuildForum) {
            if ('defaultReactionEmoji' in deletedChannel && deletedChannel.defaultReactionEmoji) {
                const emoji = deletedChannel.defaultReactionEmoji.emoji;
                deleteEmbed.addFields({ name: 'Default Emoji', value: emoji || 'None', inline: true });
            }
            if ('availableTags' in deletedChannel && Array.isArray(deletedChannel.availableTags)) {
                deleteEmbed.addFields({ name: 'Tag Count', value: `${deletedChannel.availableTags.length}`, inline: true });
            }
        }

        // Finally, send the embed to the misc-logs channel.
        await logChannel.send({ embeds: [deleteEmbed] });
    }
};
