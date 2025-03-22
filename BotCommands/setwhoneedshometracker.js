const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setwhoneedstracker')
        .setDescription('Set up the Who Needs a Tracker embed in the designated channel.'),
    async execute(interaction) {
        // Administrator check
        if (!interaction.member.permissions.has('ADMINISTRATOR')) {
            await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
            return;
        }

        const guild = interaction.guild;
        const botAvatarURL = interaction.client.user.displayAvatarURL({ dynamic: true, size: 1024 });
        const guildName = guild.name;

        // Look for the target channel named "🆘who-needs-tracker"
        let targetChannel = guild.channels.cache.find(
            channel => channel.name === '🆘who-needs-tracker' && channel.type === ChannelType.GuildText
        );

        // If the channel doesn't exist, create it
        if (!targetChannel) {
            try {
                targetChannel = await guild.channels.create({
                    name: '🆘who-needs-tracker',
                    type: ChannelType.GuildText,
                    reason: 'Channel for Who Needs Tracker embed creation.'
                });
            } catch (error) {
                console.error('Error creating channel:', error);
                await interaction.reply({ content: 'Failed to create the target channel.', ephemeral: true });
                return;
            }
        }

        // Create the embed with dynamic elements
        const embed = new EmbedBuilder()
            .setTitle('Who needs a tracker❓')
            .setDescription(
                `**For SV (Scarlet/Violet):** There are several Pokémon that cannot be caught in-game and will require home trackers unless events release them in Tera Raids. Visit [this link](https://www.serebii.net/scarletviolet/transferonly.shtml) to learn more. Ignore those released in Tera Raids.\n\n` +
                `**For SWSH (Sword/Shield):** Most Pokémon don't need home trackers unless you want their origin from games like Brilliant Diamond, Shining Pearl, Pokémon Legends Arceus, or Scarlet/Violet. [Here](https://www.serebii.net/swordshield/transferonly.shtml) is a small list for Sword/Shield.\n\n` +
                `**For PLA (Pokémon Legends Arceus):** The transfer-only ones are the shiny legendaries. You can request these files.\n\n` +
                `**For BDSP (Brilliant Diamond/Shining Pearl):** Only a few transfer-only Pokémon. Details [here](https://www.serebii.net/brilliantdiamondshiningpearl/transferonly.shtml). You can request these files.\n\n` +
                `**For LGPE (Let's Go Pikachu/Eevee):** No transfer-only Pokémon as it features the original 151 + Alolan variants (Rattata, Vulpix, Sandshrew, Grimer, Meowth, Diglett, Geodude, Exeggutor, Marowak, Raichu).`
            )
            .setThumbnail(botAvatarURL)
            .setImage('https://cdn-longterm.mee6.xyz/plugins/embeds/images/738050656933511298/4c80629edf805ce20ec90b238f8f94e9a078fcf9c2533f8996154a0977424c90.gif')
            .setFooter({ text: `${guildName} Home Tracker Info`, iconURL: botAvatarURL })
            .setTimestamp();

        try {
            await targetChannel.send({ embeds: [embed] });
            await targetChannel.send('Tracker embed has been set successfully.');
            await interaction.reply({ content: `Embed sent successfully to ${targetChannel}!`, ephemeral: true });
        } catch (error) {
            console.error('Error sending embed:', error);
            await interaction.reply({ content: 'An error occurred while sending the tracker embed.', ephemeral: true });
        }
    },
};
