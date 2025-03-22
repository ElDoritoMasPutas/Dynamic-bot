const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check the bot’s latency in style!'),
    
    async execute(interaction) {
        // Initial response time
        const sent = await interaction.reply({ content: '🏓 Pinging...', fetchReply: true });

        // Calculate different latencies
        const wsPing = interaction.client.ws.ping;
        const apiPing = sent.createdTimestamp - interaction.createdTimestamp;

        // Determine speed rating
        let rating;
        if (apiPing < 100) rating = '🟢 **Blazing Fast** ⚡';
        else if (apiPing < 200) rating = '🟡 **Moderate Speed** 🚀';
        else if (apiPing < 400) rating = '🟠 **Getting Slower** 🏃‍♂️';
        else rating = '🔴 **Snail Mode** 🐌';

        // Animated progress bar based on API ping
        const maxBar = 10;
        const filledBars = Math.min(maxBar, Math.round(apiPing / 50));
        const emptyBars = maxBar - filledBars;
        const progressBar = '🟩'.repeat(filledBars) + '⬜'.repeat(emptyBars);

        // Bot uptime
        const uptime = process.uptime();
        const uptimeString = new Date(uptime * 1000).toISOString().substr(11, 8); // HH:MM:SS format

        // Get server name (handles DM case)
        const guildName = interaction.guild ? interaction.guild.name : "Direct Messages";

        // Create an epic embed
        const embed = new EmbedBuilder()
            .setColor(wsPing < 150 ? 'Green' : wsPing < 300 ? 'Yellow' : 'Red')
            .setTitle(`🏓 Pong!`)
            .setDescription(`Latency stats for **${guildName}**:`)
            .addFields(
                { name: '🌐 WebSocket Ping', value: `\`${wsPing}ms\``, inline: true },
                { name: '📡 API Ping', value: `\`${apiPing}ms\``, inline: true },
                { name: '⏳ Uptime', value: `\`${uptimeString}\``, inline: true },
                { name: '📊 Speed Rating', value: rating, inline: false },
                { name: '📶 Ping Progress', value: progressBar, inline: false }
            )
            .setFooter({ text: `Ping calculated with ❤️ | Server: ${guildName}`, iconURL: interaction.client.user.displayAvatarURL() })
            .setTimestamp();

        // Edit the original response with the fancy embed
        await interaction.editReply({ content: '', embeds: [embed] });
    }
};