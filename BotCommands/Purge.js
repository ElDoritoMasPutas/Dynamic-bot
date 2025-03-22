const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('purge')
        .setDescription('Deletes a specified number of messages from a channel.')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('The number of messages to delete (max 1000)')
                .setRequired(true)
        )
        .addChannelOption(option =>
            option.setName('target_channel')
                .setDescription('The channel to purge messages from')
                .addChannelTypes(0) // Text channels only
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    async execute(interaction) {
        // Defer reply for asynchronous operations
        await interaction.deferReply({ ephemeral: true });

        const amount = interaction.options.getInteger('amount');
        const targetChannel = interaction.options.getChannel('target_channel') || interaction.channel; // Default to current channel
        const botUser = interaction.client.user;
        const guild = interaction.guild;

        if (amount < 1 || amount > 1000) {
            return interaction.editReply({ content: 'Please provide a number between 1 and 1000.' });
        }

        let deletedCount = 0;
        let remaining = amount;

        // Cooldown durations (in milliseconds)
        const cooldownBatch = 1000;      // Delay after processing each batch
        const cooldownIndividual = 500;  // Delay after each individual deletion

        try {
            // Process messages in batches
            while (remaining > 0) {
                const batchSize = Math.min(remaining, 100); // Maximum messages we can fetch at a time
                const messages = await targetChannel.messages.fetch({ limit: batchSize });

                if (messages.size === 0) break; // No more messages to fetch

                const now = Date.now();
                const fourteenDays = 14 * 24 * 60 * 60 * 1000;

                // Split messages based on Discord's bulk deletion limit (messages older than 14 days cannot be bulk deleted)
                const bulkDeletable = messages.filter(msg => (now - msg.createdTimestamp) < fourteenDays);
                const individuallyDeletable = messages.filter(msg => (now - msg.createdTimestamp) >= fourteenDays);

                // Bulk delete the messages that are eligible.
                if (bulkDeletable.size > 0) {
                    const deletedBulk = await targetChannel.bulkDelete(bulkDeletable, true);
                    deletedCount += deletedBulk.size;
                }

                // Delete individually with a cooldown between each deletion.
                if (individuallyDeletable.size > 0) {
                    for (const msg of individuallyDeletable.values()) {
                        await msg.delete();
                        deletedCount++;
                        // Delay between individual deletions
                        await new Promise(resolve => setTimeout(resolve, cooldownIndividual));
                    }
                }

                // Subtract the total messages processed in this batch.
                remaining -= messages.size;

                // Cooldown between each batch
                await new Promise(resolve => setTimeout(resolve, cooldownBatch));
            }

            // Create the purge log embed
            const purgeEmbed = new EmbedBuilder()
                .setColor(0x000000)
                .setTitle('Messages Purged')
                .setDescription(`**${deletedCount} messages** have been deleted in <#${targetChannel.id}>.`)
                .addFields(
                    { name: 'Purged By', value: `${interaction.user.tag}`, inline: true },
                    { name: 'Channel', value: `<#${targetChannel.id}>`, inline: true },
                    { name: 'Total Deleted', value: `${deletedCount}`, inline: true }
                )
                .setImage('https://media1.tenor.com/m/SxjYImCbavgAAAAd/purging-chat-purge.gif')
                .setTimestamp()
                .setFooter({ text: guild.name, iconURL: botUser.displayAvatarURL() });

            // Find or create a log channel called "misc-logs"
            let logChannel = guild.channels.cache.find(ch => ch.name === 'misc-logs' && ch.isTextBased());
            if (!logChannel) {
                try {
                    logChannel = await guild.channels.create({
                        name: 'misc-logs',
                        type: 0, // Text channel
                        permissionOverwrites: [
                            {
                                id: guild.id,
                                deny: [PermissionFlagsBits.ViewChannel],
                            }
                        ]
                    });
                } catch (error) {
                    console.log('Failed to create log channel:', error);
                }
            }

            if (logChannel) {
                await logChannel.send({ embeds: [purgeEmbed] });
            } else {
                console.log('Log channel not found or could not be created. Sending log to the command channel.');
                await interaction.channel.send({ embeds: [purgeEmbed] });
            }

            await interaction.editReply({ content: `Successfully deleted **${deletedCount}** messages.` });
        } catch (error) {
            console.error(`Error purging messages: ${error}`);
            await interaction.editReply({ content: 'There was an error trying to purge messages.' });
        }
    }
};
