const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder, ChannelType } = require('discord.js');
const path = require('path');
const fs = require('fs');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setpkhex')
        .setDescription('Sends multiple attachments across several fancy embeds with unique instructions.'),
    async execute(interaction) {
        try {
            const guild = interaction.guild;

            // Resolve file paths relative to the command file location
            const basePath = path.resolve(__dirname, '..', 'Images');
            const attachments = [
                path.join(basePath, 'pkhex1.png'),
                path.join(basePath, 'pkhex2.png'),
                path.join(basePath, 'pkhex3.png'),
                path.join(basePath, 'pkhex4.png'),
                path.join(basePath, 'pkhex5.png'),
            ];

            const descriptions = [
                'Step 1: Start [here](https://github.com/bdawg1989/PKHeX-ALL-IN-ONE/releases/tag/24.11.11-2) by downloading PKHex (make sure to download the .exe !!PC-only!) (Now navigate to options > settings and choose your desired game and exit off that screen)',
                'Step 2: Open the PKHex application and locate your save file from your Pokémon game (or start with a blank save if you\'re not editing a save file and just genning a pokemon that\'s in the game (select a pokemon by going to Data > Encounter Database)',
                'Step 3: Edit your Pokémon stats, moves, and items. Be cautious and follow legal limits (max stats are 252 for 2 stats and 6 in one more, for moves you can click relearn flags and "give all" for the item that\'s on the first page under the pokemon info "held item") (if you need assistance with this step please refer to <#1197288667539046410> and select general inquiries and we will help you!',
                'Step 4: Save your modified file and transfer it back to your device (or upload the file as an attachment to the bot and type .trade // .trade true or %trade for ahsoka etc)',
                'Step 5: Enjoy your modified Pokémon!',
            ];

            const embeds = [];
            const files = [];

            // Dynamically fetch the bot's avatar and name
            const botAvatarURL = interaction.client.user.displayAvatarURL({ dynamic: true, size: 1024 });
            const botName = interaction.client.user.username;

            // Loop over attachments and corresponding descriptions
            for (let i = 0; i < Math.min(attachments.length, descriptions.length); i++) {
                if (fs.existsSync(attachments[i])) {
                    const file = new AttachmentBuilder(attachments[i]);
                    files.push(file);

                    const embed = new EmbedBuilder()
                        .setAuthor({ name: botName, iconURL: botAvatarURL })
                        .setTitle(`PKHex Guide - Step ${i + 1}`)
                        .setDescription(descriptions[i])
                        .setColor('#000000')
                        .setImage(`attachment://${path.basename(attachments[i])}`)
                        .setFooter({
                            text: `Guide Part ${i + 1} of ${descriptions.length}`,
                            iconURL: botAvatarURL,
                        })
                        .setTimestamp();

                    embeds.push(embed);
                } else {
                    console.log(`File not found: ${attachments[i]}`);
                }
            }

            if (embeds.length === 0) {
                await interaction.reply({ content: 'No valid files or instructions found for this command.', ephemeral: true });
                return;
            }

            // Find or create the target channel "🆘pkhex-how-to"
            let targetChannel = guild.channels.cache.find(ch => ch.name === '🆘pkhex-how-to' && ch.type === ChannelType.GuildText);
            if (!targetChannel) {
                try {
                    targetChannel = await guild.channels.create({
                        name: '🆘pkhex-how-to',
                        type: ChannelType.GuildText,
                        reason: 'PKHex how-to guide channel not found, creating automatically.',
                    });
                } catch (error) {
                    console.error('Error creating channel:', error);
                    await interaction.reply({ content: 'Failed to create the PKHex how-to channel.', ephemeral: true });
                    return;
                }
            }

            // Send the embeds with attachments to the target channel
            await targetChannel.send({
                content: '**Follow these steps to use PKHex effectively!**',
                embeds: embeds,
                files: files,
            });

            // Acknowledge the slash command execution
            await interaction.reply({ content: `PKHex guide sent to <#${targetChannel.id}>!`, ephemeral: true });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'An error occurred while executing the command.', ephemeral: true });
        }
    },
};
