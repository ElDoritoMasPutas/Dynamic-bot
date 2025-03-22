const { SlashCommandBuilder, ChannelType } = require('discord.js');
const { saveCountersToFile } = require('../Utils/Membercounter.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('togglemembers')
    .setDescription('Toggle member counters (online, total, bots, or all) on/off.')
    .addStringOption((option) =>
      option
        .setName('type')
        .setDescription('Which counter(s) to toggle?')
        .setRequired(true)
        .addChoices(
          { name: 'Online', value: 'online' },
          { name: 'Total', value: 'total' },
          { name: 'Bots', value: 'bots' },
          { name: 'All', value: 'all' }
        )
    ),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const type = interaction.options.getString('type');
    const guild = interaction.guild;
    const client = interaction.client;

    if (!client.memberCounters) client.memberCounters = new Map();
    let counters = client.memberCounters.get(guild.id);
    if (!counters) {
      counters = {
        online: { enabled: false, id: null, channel: null, interval: null },
        total: { enabled: false, id: null, channel: null, interval: null },
        bots: { enabled: false, id: null, channel: null, interval: null },
      };
    }

    const toggleCounter = async (counterType) => {
      if (counters[counterType].enabled) {
        // Disable: clear the update interval and delete the channel
        if (counters[counterType].interval) clearInterval(counters[counterType].interval);
        if (counters[counterType].channel) {
          try {
            await counters[counterType].channel.delete('Member counter toggled off');
          } catch (err) {
            console.error(`Error deleting ${counterType} counter channel:`, err);
          }
        }
        counters[counterType] = { enabled: false, id: null, channel: null, interval: null };
      } else {
        // Enable the counter: determine the initial channel name based on counter type
        let channelName = '';
        if (counterType === 'online') channelName = 'Online Members: 0';
        else if (counterType === 'total') channelName = `Total Members: ${guild.memberCount}`;
        else if (counterType === 'bots') channelName = 'Bots: 0';

        try {
          const channel = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildVoice,
            reason: 'Member counter system',
          });
          // Save both the channel and its ID for later retrieval
          counters[counterType] = { enabled: true, id: channel.id, channel, interval: null };
        } catch (err) {
          console.error(`Error creating ${counterType} counter channel:`, err);
          return;
        }
      }
    };

    if (type === 'online' || type === 'all') await toggleCounter('online');
    if (type === 'total' || type === 'all') await toggleCounter('total');
    if (type === 'bots' || type === 'all') await toggleCounter('bots');

    client.memberCounters.set(guild.id, counters);
    saveCountersToFile(client);
    await interaction.editReply(`Toggled member counters (${type}) successfully!`);
  },
};
