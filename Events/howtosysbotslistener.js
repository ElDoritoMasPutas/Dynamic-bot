const { EmbedBuilder, ChannelType } = require('discord.js');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        // Only handle button interactions
        if (!interaction.isButton()) return;

        // Dynamically fetch bot avatar, bot name, guild name, and guild icon
        const botAvatarURL = interaction.client.user.displayAvatarURL({ dynamic: true, size: 1024 });
        const botName = interaction.client.user.username;
        const guildName = interaction.guild.name;
        const guildIcon = interaction.guild.iconURL({ dynamic: true, size: 1024 }) || botAvatarURL;

        // Fetch the batch commands channel ("🆘-batch-commands")
        const batchChannel = interaction.guild.channels.cache.find(
            ch => ch.name === '🆘-batch-commands' && ch.type === ChannelType.GuildText
        );
        // Fetch the home tracker channel ("🆘home-tracker") for fallback (if needed)
        const hometrackerchannel = interaction.guild.channels.cache.find(
            ch => ch.name === '🆘home-tracker' && ch.type === ChannelType.GuildText
        );
        
        const batchChannelMention = batchChannel ? `<#${batchChannel.id}>` : 'the batch commands channel';
        const hometrackerchannelMention = hometrackerchannel ? `<#${hometrackerchannel.id}>` : 'home tracker channel';

        // Define guide details using strings with explicit \n characters and dynamic batch channel mention everywhere
        const guides = {
            pla_guide: {
                title: 'PLA Guide',
                description: 'To get started with PLA (Pokemon Legends Arceus) you must know that all pokemon must be of origin when trading with the bots unless there are home trackers present. (please refer [here](https://pokemondb.net/pokedex/game/legends-arceus) (Do note that none of the legendaries can be shiny! You need a file with a home tracker for them!)\n\n' +
                             'If you don\'t know what a home tracker is then please visit ' + hometrackerchannelMention + ' to learn more about home trackers and their purpose in home legality.\n\n' +
                             'To start a trade run .trade followed by the pokemon name, that is the easiest and fastest way to trade with no customizations, but luckily for you we have more guides for customizations like ' + batchChannelMention + ' as explained in the main embed.\n\n' +
                             'If you still need more help please DM **' + botName + '** and an admin or owner will get with you regarding your issue 💖\n\n' +
                             'There is also the website [here](https://genpkm.com/pokecreator.php) to help you easily and fully customize a pokemon, use the batch command channel mentioned to further edit the pokemon.\n\n' +
                             'An example advanced command for PLA would be like this\n\n' +
                             '.trade Goodra-Hisui @ Peat Block\n' +
                             'Shiny: Yes\n' +
                             'Sap Sipper\n' +
                             'Ball: LAUltra Ball\n' +
                             'Level: 60\n' +
                             'Alpha: Yes\n' +
                             'Gender: Female\n' +
                             'Nature: Modest\n' +
                             'EVs: 252 SpA / 252 DEF / 4 HP\n' +
                             '.MetDate=20211004\n' +
                             '.RelearnMoves=$SuggestAll\n' +
                             '-Dragon Pulse\n' +
                             '-Ice Beam\n' +
                             '-Sludge Bomb\n' +
                             '-Thunderbolt'
            },
            lgpe_guide: {
                title: 'LGPE Guide',
                description: 'To get started with LGPE (Let\'s Go Pikachu/Eevee) you must know that there are no non-native pokemon in LGPE since it only has 151 pokemon plus the Alolan variants (e.g., Rattata, Vulpix, Sandshrew, Grimer, Meowth, Diglett, Geodude, Exeggutor, Marowak, Raichu). You can run .trade Grimer-Alola to obtain these and other regional pokemon! Please refer [here](https://pokemondb.net/pokedex/game/lets-go-pikachu-eevee) for a full idea of what you can generate in LGPE and potentially transfer to SV 😉\n\n' +
                             'If you don\'t know what a home tracker is then please visit ' + hometrackerchannelMention + ' to learn more about home trackers and their purpose in home legality.\n\n' +
                             'To start a trade run .trade followed by the pokemon name, that is the easiest and fastest way to trade with no customizations. We also have more guides for customizations like ' + batchChannelMention + ' as explained in the main embed.\n\n' +
                             'If you still need more help please DM **' + botName + '** and an admin or owner will get with you regarding your issue 💖\n\n' +
                             'There is also the website [here](https://genpkm.com/pokecreator.php) to help you easily and fully customize a pokemon, use the batch command channel mentioned to further edit the pokemon.\n\n' +
                             'An advanced command would be like this\n\n' +
                             '.trade Alakazam @ Master Ball\n' +
                             'Shiny: Yes\n' +
                             'Ability: Inner Focus\n' +
                             'Ball: Ultra Ball\n' +
                             'Level: 50\n' +
                             'Gender: Male\n' +
                             'Nature: Modest\n' +
                             'EVs: 252 SpA / 252 SPE / 4 HP\n' +
                             '.MetDate=20201004\n' +
                             '.EggMetDate=20201004\n' +
                             '.IV_ATK=0\n' +
                             '.RelearnMoves=$SuggestAll\n' +
                             '-Psychic\n' +
                             '-Shadow Ball\n' +
                             '-Calm Mind\n' +
                             '-Recover'
            },
            swsh_guide: {
                title: 'SWSH Guide',
                description: 'To get started with SWSH (Sword and Shield) you must know that home trackers were not present in this game, so literally anything available in SWSH can be transferred to SV (Scarlet and Violet). Simply DM **' + botName + '** and we will get you the file for the pokemon you want to trade to SWSH (Just let us know 💖).\n\n' +
                             'If you don\'t know what a home tracker is, please visit ' + hometrackerchannelMention + ' to learn more about home trackers and understand why you might need one to transfer between certain games (again, SWSH doesn\'t need one). To view a full SWSH Pokedex, check out [here](https://www.serebii.net/swordshield/galarpokedex.shtml), for Isle of Armor [here](https://www.serebii.net/swordshield/isleofarmordex.shtml), for Crown Tundra [here](https://www.serebii.net/swordshield/thecrowntundradex.shtml), and for all other available pokemon [here](https://www.serebii.net/swordshield/pokemonnotindex.shtml).\n\n' +
                             'If you still need more help, please DM **' + botName + '** and an admin or owner will assist you 💖\n\n' +
                             'There is also the website [here](https://genpkm.com/pokecreator.php) to help you easily and fully customize a pokemon. Use the batch command channel mentioned to further edit the pokemon.\n\n' +
                             'An advanced command would be like this\n\n' +
                             '.trade Weezing-Galar @ Black Sludge\n' +
                             'Shiny: Yes\n' +
                             'Level: 60\n' +
                             'Ball: Ultra Ball\n' +
                             'Ability: Levitate\n' +
                             'Nature: Bold\n' +
                             'EVs: 252 DEF / 252 SpA / 4 HP\n' +
                             '.IV_ATK=0\n' +
                             '.MetDate=20221004\n' +
                             '.EggMetDate=20221004\n' +
                             '.RelearnMoves=$SuggestAll\n' +
                             '-Misty Terrain\n' +
                             '-Sludge Bomb\n' +
                             '-Strange Steam\n' +
                             '-Stockpile'
            },
            scvi_guide: {
                title: 'SCVI Guide',
                description: 'To get started with SV (Scarlet and Violet) you must know that there are a lot of non-native pokemon in SV that MUST HAVE home trackers for a list of Paldea pokemon. Please refer [here](https://pokemondb.net/pokedex/game/scarlet-violet) for Kitakami, [here](https://pokemondb.net/pokedex/game/scarlet-violet/teal-mask) for Blueberry, and [here](https://pokemondb.net/pokedex/game/scarlet-violet/indigo-disk) for Indigo Disk.\n\n' +
                             'If you don\'t know what a home tracker is then please visit ' + hometrackerchannelMention + ' to learn more about home trackers and their purpose in home legality.\n\n' +
                             'To start a trade run .trade followed by the pokemon name (the easiest and fastest way to trade with no customizations), but luckily for you we have more guides for customizations like ' + batchChannelMention + ' as explained in the main embed.\n\n' +
                             'If you still need more help, please DM **' + botName + '** and an admin or owner will assist you 💖\n\n' +
                             'There is also the website [here](https://genpkm.com/pokecreator.php) to help you easily and fully customize a pokemon. Use the batch command channel mentioned to further edit the pokemon.\n\n' +
                             'An advanced command would be like this\n\n' +
                             '.trade Rampardos @ Choice Scarf\n' +
                             'Shiny: Yes\n' +
                             'Ability: Sheer Force\n' +
                             'Tera Type: Ground\n' +
                             'Ball: Ultra Ball\n' +
                             'Level: 100\n' +
                             'Gender: Male\n' +
                             'Nature: Adamant\n' +
                             'EVs: 252 ATK / 252 SPE / 4 HP\n' +
                             '.MetDate=20241004\n' +
                             '.EggMetDate=20241004\n' +
                             '.RelearnMoves=$SuggestAll\n' +
                             '-Earthquake\n' +
                             '-Stone Edge\n' +
                             '-Iron Head\n' +
                             '-Supercell Slam'
            },
            bdsp_guide: {
                title: 'BDSP Guide',
                description: 'To get started with BDSP (Brilliant Diamond and Shining Pearl) you must know that there are not a whole lot of non-native pokemon in BDSP that need home trackers for a list of pokemon. Please refer [here](https://www.serebii.net/brilliantdiamondshiningpearl/transferonly.shtml).\n\n' +
                             'If you don\'t know what a home tracker is then please visit ' + hometrackerchannelMention + ' to learn more about home trackers and their purpose in home legality.\n\n' +
                             'To start a trade run .trade followed by the pokemon name (the easiest and fastest way to trade with no customizations), but luckily for you we have more guides for customizations like ' + batchChannelMention + ' as explained in the main embed.\n\n' +
                             'If you still need more help, please DM **' + botName + '** and an admin or owner will assist you 💖\n\n' +
                             'There is also the website [here](https://genpkm.com/pokecreator.php) to help you easily and fully customize a pokemon. Use the batch command channel mentioned to further edit the pokemon.\n\n' +
                             'An advanced command would be like this\n\n' +
                             '.trade Charizard @ Choice Scarf\n' +
                             'Shiny: Yes\n' +
                             'Ball: Ultra Ball\n' +
                             'Level: 100\n' +
                             'Ability: Solar Power\n' +
                             'Gender: Male\n' +
                             'Nature: Modest\n' +
                             'EVs: 252 SpA / 252 SPE / 4 HP\n' +
                             '.MetDate=20231004\n' +
                             '.EggMetDate=20231004\n' +
                             '.RelearnMoves=$SuggestAll\n' +
                             '-Sunny Day\n' +
                             '-Flamethrower\n' +
                             '-Solar Beam\n' +
                             '-Roost'
            },
        };

        // Check if the button customId matches one of our guides
        if (Object.keys(guides).includes(interaction.customId)) {
            try {
                const guide = guides[interaction.customId];

                // Build the embed dynamically
                const embed = new EmbedBuilder()
                    .setTitle(guide.title)
                    .setDescription(guide.description)
                    .setThumbnail(botAvatarURL)
                    .setImage('https://cdn-longterm.mee6.xyz/plugins/embeds/images/738050656933511298/4c80629edf805ce20ec90b238f8f94e9a078fcf9c2533f8996154c0977424c90.gif')
                    .setColor(0x000000)
                    .setFooter({ text: `${guildName} SysBot Guide`, iconURL: guildIcon })
                    .setTimestamp();

                await interaction.reply({ embeds: [embed], ephemeral: true });
            } catch (error) {
                console.error('Error handling button interaction:', error);
                await interaction.reply({
                    content: 'There was an error while processing this guide. Please try again later.',
                    ephemeral: true,
                });
            }
        }
    },
};
