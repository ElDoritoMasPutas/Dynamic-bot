const { Events, EmbedBuilder, PermissionsBitField, ChannelType } = require('discord.js');

module.exports = {
    name: Events.ChannelUpdate,
    async execute(oldChannel, newChannel) {
        const guild = newChannel.guild;

        // Attempt to find a text channel named "misc-logs"
        let logChannel = guild.channels.cache.find(
            channel => channel.name === 'misc-logs' && channel.type === ChannelType.GuildText
        );

        // If not found, create it dynamically
        if (!logChannel) {
            try {
                logChannel = await guild.channels.create({
                    name: 'misc-logs',
                    type: ChannelType.GuildText,
                    topic: 'Logs here.',
                    reason: 'Needed for misc-logs.'
                });
            } catch (error) {
                console.error('Error creating misc-logs channel:', error);
                return; // Stop if channel creation fails
            }
        }

        // Log channel name change
        if (oldChannel.name !== newChannel.name) {
            const nameChangeEmbed = new EmbedBuilder()
                .setColor(0x000000)
                .setTitle('🔄 Channel Name Changed')
                .setDescription('The channel name has been updated.')
                .addFields(
                    { name: 'Old Name', value: oldChannel.name, inline: true },
                    { name: 'New Name', value: newChannel.name, inline: true },
                    { name: 'Channel', value: `<#${newChannel.id}>`, inline: true }
                )
                .setTimestamp();

            await logChannel.send({ embeds: [nameChangeEmbed] });
        }

        // Log channel topic change (if applicable)
        if ('topic' in newChannel && oldChannel.topic !== newChannel.topic) {
            const topicChangeEmbed = new EmbedBuilder()
                .setColor(0x000000)
                .setTitle('🔄 Channel Topic Changed')
                .setDescription('The channel topic has been updated.')
                .addFields(
                    { name: 'Old Topic', value: oldChannel.topic || 'None', inline: true },
                    { name: 'New Topic', value: newChannel.topic || 'None', inline: true },
                    { name: 'Channel', value: `<#${newChannel.id}>`, inline: true }
                )
                .setTimestamp();

            await logChannel.send({ embeds: [topicChangeEmbed] });
        }

        // Log NSFW setting change (if applicable)
        if ('nsfw' in newChannel && oldChannel.nsfw !== newChannel.nsfw) {
            const nsfwChangeEmbed = new EmbedBuilder()
                .setColor(0x000000)
                .setTitle('🔄 Channel NSFW Setting Changed')
                .setDescription('The NSFW setting has been updated.')
                .addFields(
                    { name: 'Old NSFW', value: oldChannel.nsfw ? 'Enabled' : 'Disabled', inline: true },
                    { name: 'New NSFW', value: newChannel.nsfw ? 'Enabled' : 'Disabled', inline: true },
                    { name: 'Channel', value: `<#${newChannel.id}>`, inline: true }
                )
                .setTimestamp();

            await logChannel.send({ embeds: [nsfwChangeEmbed] });
        }

        // Log slowmode change (for text channels with rateLimitPerUser)
        if ('rateLimitPerUser' in newChannel && oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser) {
            const slowmodeChangeEmbed = new EmbedBuilder()
                .setColor(0x000000)
                .setTitle('🔄 Channel Slowmode Changed')
                .setDescription('Slowmode (rate limit) has been updated.')
                .addFields(
                    { name: 'Old Slowmode', value: `${oldChannel.rateLimitPerUser} seconds`, inline: true },
                    { name: 'New Slowmode', value: `${newChannel.rateLimitPerUser} seconds`, inline: true },
                    { name: 'Channel', value: `<#${newChannel.id}>`, inline: true }
                )
                .setTimestamp();

            await logChannel.send({ embeds: [slowmodeChangeEmbed] });
        }

        // Log voice channel bitrate change (if applicable)
        if ('bitrate' in newChannel && oldChannel.bitrate !== newChannel.bitrate) {
            const bitrateChangeEmbed = new EmbedBuilder()
                .setColor(0x000000)
                .setTitle('🔄 Voice Channel Bitrate Changed')
                .setDescription('The bitrate has been updated.')
                .addFields(
                    { name: 'Old Bitrate', value: `${oldChannel.bitrate}`, inline: true },
                    { name: 'New Bitrate', value: `${newChannel.bitrate}`, inline: true },
                    { name: 'Channel', value: `<#${newChannel.id}>`, inline: true }
                )
                .setTimestamp();

            await logChannel.send({ embeds: [bitrateChangeEmbed] });
        }

        // Log voice channel user limit change (if applicable)
        if ('userLimit' in newChannel && oldChannel.userLimit !== newChannel.userLimit) {
            const userLimitChangeEmbed = new EmbedBuilder()
                .setColor(0x000000)
                .setTitle('🔄 Voice Channel User Limit Changed')
                .setDescription('The user limit has been updated.')
                .addFields(
                    { name: 'Old Limit', value: `${oldChannel.userLimit || 'None'}`, inline: true },
                    { name: 'New Limit', value: `${newChannel.userLimit || 'None'}`, inline: true },
                    { name: 'Channel', value: `<#${newChannel.id}>`, inline: true }
                )
                .setTimestamp();

            await logChannel.send({ embeds: [userLimitChangeEmbed] });
        }

        // Compare permission overwrites
        const oldPermissions = oldChannel.permissionOverwrites.cache;
        const newPermissions = newChannel.permissionOverwrites.cache;

        // Identify added, removed, and updated permission overwrites
        const addedPermissions = newPermissions.filter(perm => !oldPermissions.has(perm.id));
        const removedPermissions = oldPermissions.filter(perm => !newPermissions.has(perm.id));
        const updatedPermissions = newPermissions.filter(perm => {
            const oldPerm = oldPermissions.get(perm.id);
            if (!oldPerm) return false;
            return !oldPerm.allow.equals(perm.allow) || !oldPerm.deny.equals(perm.deny);
        });

        // Helper function to detect permission changes between overwrites
        const getPermissionChanges = (oldPerm, newPerm) => {
            const changedPermissions = [];
            Object.entries(PermissionsBitField.Flags).forEach(([flagName, flagBit]) => {
                if (oldPerm.allow.has(flagBit) !== newPerm.allow.has(flagBit)) {
                    changedPermissions.push(`${newPerm.allow.has(flagBit) ? '✅' : '❌'} ${flagName}`);
                } else if (oldPerm.deny.has(flagBit) !== newPerm.deny.has(flagBit)) {
                    changedPermissions.push(`${newPerm.deny.has(flagBit) ? '❌' : '✅'} ${flagName}`);
                }
            });
            return changedPermissions;
        };

        // Log added permission overwrites
        if (addedPermissions.size > 0) {
            const addedPermEmbed = new EmbedBuilder()
                .setColor(0x000000)
                .setTitle('🔄 Channel Permissions Added')
                .setDescription(`New permissions have been added to ${newChannel.name}.`)
                .addFields(
                    {
                        name: 'Added Permissions',
                        value: addedPermissions
                            .map(perm =>
                                `${perm.type === 0 ? `<@&${perm.id}>` : `<@${perm.id}>`}`
                            )
                            .join('\n'),
                        inline: true
                    },
                    { name: 'Channel', value: `<#${newChannel.id}>`, inline: true }
                )
                .setTimestamp();

            await logChannel.send({ embeds: [addedPermEmbed] });
        }

        // Log removed permission overwrites
        if (removedPermissions.size > 0) {
            const removedPermEmbed = new EmbedBuilder()
                .setColor(0x000000)
                .setTitle('🔄 Channel Permissions Removed')
                .setDescription(`Permissions have been removed from ${newChannel.name}.`)
                .addFields(
                    {
                        name: 'Removed Permissions',
                        value: removedPermissions
                            .map(perm =>
                                `${perm.type === 0 ? `<@&${perm.id}>` : `<@${perm.id}>`}`
                            )
                            .join('\n'),
                        inline: true
                    },
                    { name: 'Channel', value: `<#${newChannel.id}>`, inline: true }
                )
                .setTimestamp();

            await logChannel.send({ embeds: [removedPermEmbed] });
        }

        // Log updated permission overwrites
        if (updatedPermissions.size > 0) {
            for (const [id, newPerm] of updatedPermissions) {
                const oldPerm = oldPermissions.get(id);
                const changes = getPermissionChanges(oldPerm, newPerm);

                if (changes.length > 0) {
                    const updatedPermEmbed = new EmbedBuilder()
                        .setColor(0x000000)
                        .setTitle('🔄 Channel Permissions Updated')
                        .setDescription(`Permissions have been updated for ${newChannel.name}.`)
                        .addFields(
                            { name: 'User/Role', value: newPerm.type === 0 ? `<@&${newPerm.id}>` : `<@${newPerm.id}>`, inline: true },
                            { name: 'Changes', value: changes.join('\n'), inline: true },
                            { name: 'Channel', value: `<#${newChannel.id}>`, inline: true }
                        )
                        .setTimestamp();

                    await logChannel.send({ embeds: [updatedPermEmbed] });
                }
            }
        }
    }
};
