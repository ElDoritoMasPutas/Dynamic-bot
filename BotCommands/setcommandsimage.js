const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Define the configuration file path — adjust if needed!
const configPath = path.join(__dirname, '../Json/commandimageconfig.json');

// Load existing configuration if it exists, else create an empty object.
let commandImageConfig = {};
if (fs.existsSync(configPath)) {
    try {
        const fileData = fs.readFileSync(configPath, 'utf8');
        commandImageConfig = JSON.parse(fileData);
    } catch (err) {
        console.error('Error reading command image config:', err);
        commandImageConfig = {};
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setcommandsimage')
        .setDescription('Configure images for your moderation commands.')
        // Kick
        .addSubcommand(subcommand =>
            subcommand
                .setName('kick')
                .setDescription('Set the image URL for the kick command.')
                .addStringOption(option =>
                    option
                        .setName('image')
                        .setDescription('Enter the image URL for kick')
                        .setRequired(true)
                )
        )
        // Ban
        .addSubcommand(subcommand =>
            subcommand
                .setName('ban')
                .setDescription('Set the image URL for the ban command.')
                .addStringOption(option =>
                    option
                        .setName('image')
                        .setDescription('Enter the image URL for ban')
                        .setRequired(true)
                )
        )
        // Timeout
        .addSubcommand(subcommand =>
            subcommand
                .setName('timeout')
                .setDescription('Set the image URL for the timeout command.')
                .addStringOption(option =>
                    option
                        .setName('image')
                        .setDescription('Enter the image URL for timeout')
                        .setRequired(true)
                )
        )
        // RemoveTimeout
        .addSubcommand(subcommand =>
            subcommand
                .setName('removetimeout')
                .setDescription('Set the image URL for the remove timeout command.')
                .addStringOption(option =>
                    option
                        .setName('image')
                        .setDescription('Enter the image URL for remove timeout')
                        .setRequired(true)
                )
        )
        // Warn
        .addSubcommand(subcommand =>
            subcommand
                .setName('warn')
                .setDescription('Set the image URL for the warn command.')
                .addStringOption(option =>
                    option
                        .setName('image')
                        .setDescription('Enter the image URL for warn')
                        .setRequired(true)
                )
        )
        // Mute
        .addSubcommand(subcommand =>
            subcommand
                .setName('mute')
                .setDescription('Set the image URL for the mute command.')
                .addStringOption(option =>
                    option
                        .setName('image')
                        .setDescription('Enter the image URL for mute')
                        .setRequired(true)
                )
        )
        // Unmute
        .addSubcommand(subcommand =>
            subcommand
                .setName('unmute')
                .setDescription('Set the image URL for the unmute command.')
                .addStringOption(option =>
                    option
                        .setName('image')
                        .setDescription('Enter the image URL for unmute')
                        .setRequired(true)
                )
        )
        // MassKick
        .addSubcommand(subcommand =>
            subcommand
                .setName('masskick')
                .setDescription('Set the image URL for the masskick command.')
                .addStringOption(option =>
                    option
                        .setName('image')
                        .setDescription('Enter the image URL for masskick')
                        .setRequired(true)
                )
        )
        // MassBan
        .addSubcommand(subcommand =>
            subcommand
                .setName('massban')
                .setDescription('Set the image URL for the massban command.')
                .addStringOption(option =>
                    option
                        .setName('image')
                        .setDescription('Enter the image URL for massban')
                        .setRequired(true)
                )
        )
        // Unban
        .addSubcommand(subcommand =>
            subcommand
                .setName('unban')
                .setDescription('Set the image URL for the unban command.')
                .addStringOption(option =>
                    option
                        .setName('image')
                        .setDescription('Enter the image URL for unban')
                        .setRequired(true)
                )
        )
        // ClearWarnings
        .addSubcommand(subcommand =>
            subcommand
                .setName('clearwarnings')
                .setDescription('Set the image URL for the clear warnings command.')
                .addStringOption(option =>
                    option
                        .setName('image')
                        .setDescription('Enter the image URL for clear warnings')
                        .setRequired(true)
                )
        ),
    async execute(interaction) {
        // Get the subcommand used and the image URL provided.
        const subcommand = interaction.options.getSubcommand();
        const imageUrl = interaction.options.getString('image');
        const guildID = interaction.guild.id;

        // Ensure the guild configuration exists.
        if (!commandImageConfig[guildID]) {
            commandImageConfig[guildID] = {};
        }

        // Save or update the image for the respective moderation command.
        commandImageConfig[guildID][subcommand] = imageUrl;

        // Save the updated configuration back to the JSON file.
        fs.writeFile(configPath, JSON.stringify(commandImageConfig, null, 4), (err) => {
            if (err) {
                console.error('Error writing to configuration file:', err);
                return interaction.reply({
                    content: 'There was an error saving your configuration.',
                    ephemeral: true
                });
            }
            interaction.reply({
                content: `Successfully set the image for **${subcommand}** to:\n${imageUrl}`,
                ephemeral: true
            });
        });
    }
};
