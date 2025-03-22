const { 
    SlashCommandBuilder,
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    AttachmentBuilder,
    ChannelType
} = require('discord.js');
const path = require('path');
const fs = require('fs');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setbatchcommands')
        .setDescription('Sends an embed with information on Batch Commands'),
    async execute(interaction) {
        // Check if the user has Administrator permissions
        if (!interaction.member.permissions.has('ADMINISTRATOR')) {
            await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
            return;
        }
        
        // Attempt to find the target channel
        let targetChannel = interaction.guild.channels.cache.find(
            channel => channel.name === '🆘-batch-commands' && channel.type === ChannelType.GuildText
        );
        
        // If not found, create the channel
        if (!targetChannel) {
            try {
                targetChannel = await interaction.guild.channels.create({
                    name: '🆘-batch-commands',
                    type: ChannelType.GuildText,
                    reason: 'Batch commands channel not found, creating automatically.'
                });
            } catch (error) {
                console.error('Error creating channel:', error);
                await interaction.reply({ content: 'Failed to create the batch commands channel.', ephemeral: true });
                return;
            }
        }

        // Path to the image file in ../Json/Images/BatchCommands.png
        const filePath = path.join(__dirname, '../Images', 'BatchCommands.png');
        let fileAttachment = null;
        const MAX_SIZE = 8 * 1024 * 1024; // 8 MB

        try {
            const stats = fs.statSync(filePath);
            if (stats.size <= MAX_SIZE) {
                fileAttachment = new AttachmentBuilder(filePath);
            } else {
                console.warn(`File ${filePath} is too large (${stats.size} bytes). Skipping attachment.`);
            }
        } catch (error) {
            console.error('Error reading file stats:', error);
        }

        // Dynamically fetch server icon and bot avatar
        const serverIcon = interaction.guild.iconURL({ dynamic: true, size: 1024 }) || null;
        const botAvatar = interaction.client.user.avatarURL({ dynamic: true, size: 1024 }) || null;
        const serverName = interaction.guild.name;

        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('**BATCH COMMANDS**')
            .setDescription(
                '**About Batch Commands**\n\n' +
                'Batch Editor Syntax is the syntax used for batch editing on PKHeX and can be used to add extra features to Pokemon otherwise not included in regular showdown imports. ' +
                'Any batch editing commands go right before the moves and after the nature!\n\n' +
                'You can read more about batch editor syntax here:\n' +
                '[Using the Batch Editor in PKHeX](https://projectpokemon.org/home/forums/topic/45398-using-pkhex-how-to-use-the-batch-editor-in-pkhex/)\n\n' +
                'There’s a lot that can be done with batch editing, but the main things people are looking to edit are ribbons, if the Pokemon has Pokerus, met conditions, dynamax level, ' +
                'contest stats, PP ups, and IVs (To fix if a Pokemon isn’t registering as 6 IV when asked).'
            )
            // Use the server icon dynamically for the image if available
            .setImage(serverIcon)
            .setFooter({ text: serverName, iconURL: botAvatar });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('batch_iv')
                    .setLabel("IV's")
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('batch_game_origin')
                    .setLabel('Game of origin')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('batch_pokerus')
                    .setLabel('Pokerus')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('batch_friendship')
                    .setLabel('Friendship')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('batch_markings')
                    .setLabel('Markings')
                    .setStyle(ButtonStyle.Danger)
            );

        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('batch_dynamax_level')
                    .setLabel('Dynamax Level')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('batch_contest_stats')
                    .setLabel('Contest Stats')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('batch_met_conditions')
                    .setLabel('Met Conditions')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('batch_pp_ups')
                    .setLabel("PP Up's")
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('batch_size_scalar')
                    .setLabel('Size Scalar')
                    .setStyle(ButtonStyle.Secondary)
            );

        const row3 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('batch_met_date')
                    .setLabel('Met Date')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('batch_met_location')
                    .setLabel('Met Location')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('batch_met_level')
                    .setLabel('Met Level')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('batch_ribbons_marks')
                    .setLabel('Ribbons/Marks')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('batch_current_level')
                    .setLabel('Current Level')
                    .setStyle(ButtonStyle.Primary)
            );

        const row4 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('batch_hyper_training')
                    .setLabel('Hyper Training')
                    .setStyle(ButtonStyle.Success)
            );

        // Prepare the message options
        const messageOptions = {
            content: '',
            embeds: [embed],
            components: [row, row2, row3, row4]
        };

        // Attach the file if it passed the size check
        if (fileAttachment) {
            messageOptions.files = [fileAttachment];
        }

        // Send the message to the target channel
        await targetChannel.send(messageOptions);

        // Acknowledge the slash command with an ephemeral reply.
        await interaction.reply({ content: `Batch Commands sent in ${targetChannel}.`, ephemeral: true });
    },
};