const { Events, EmbedBuilder } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        // Only handle interactions with customIds starting with 'batch_'
        if (!interaction.isButton() || !interaction.customId.startsWith('batch_')) return;

        // Dynamically load bot avatar and server icon
        const botIcon = interaction.client.user.displayAvatarURL({ dynamic: true, size: 1024 });
        const serverIcon = interaction.guild.iconURL({ dynamic: true, size: 1024 });
        const mee6Image = "https://cdn-longterm.mee6.xyz/plugins/embeds/images/738050656933511298/4c80629edf805ce20ec90b238f8f94e9a078fcf9c2533f8996154a0977424c90.gif";

        // Use dynamic guild name for the footer text
        const guildName = interaction.guild.name;

        // Create a base embed with dynamic styling
        const embed = new EmbedBuilder()
            .setColor(0xFFD700) // Gold color
            .setThumbnail(serverIcon)
            .setImage(mee6Image)
            .setFooter({ text: `${guildName} Batch Commands`, iconURL: botIcon })
            .setTimestamp();

        // Customize embed based on the specific button pressed
        switch (interaction.customId) {
            case 'batch_iv':
                embed
                    .setTitle("IV's Information")
                    .setDescription(
                        "Configure IVs using the following commands:\n" +
                        "```\n" +
                        ".IV_ATK=<0-31>\n" +
                        ".IV_DEF=<0-31>\n" +
                        ".IV_SPD=<0-31>\n" +
                        ".IV_SPA=<0-31>\n" +
                        ".IV_SPE=<0-31>\n" +
                        ".IV_HP=<0-31>\n" +
                        "```"
                    );
                break;

            case 'batch_game_origin':
                embed
                    .setTitle("Game of Origin")
                    .setDescription(
                        "Ensure the Pokémon's origin is valid for home transfers.\n" +
                        "For example:\n" +
                        "• Shiny Manaphy must originate from DPPT\n" +
                        "• Shiny Deoxys must come from a game where shiny hunting is available."
                    );
                break;

            case 'batch_pokerus':
                embed
                    .setTitle("Pokerus Details")
                    .setDescription(
                        "Configure Pokerus with these commands:\n" +
                        "```\n" +
                        ".IsPokerusInfected=[True/False]\n" +
                        ".IsPokerusCured=[True/False]\n" +
                        ".PokerusDays=<0-4>\n" +
                        ".PokerusStrain=<0-15>\n" +
                        "```\n" +
                        "**Note:** Only available in SWSH and BDSP."
                    );
                break;

            case 'batch_friendship':
                embed
                    .setTitle("Friendship Information")
                    .setDescription(
                        "Set friendship values with:\n" +
                        "```\n" +
                        ".OriginalTrainerFriendship=<1-255>\n" +
                        ".HandlingTrainerFriendship=<1-255>\n" +
                        ".OriginalTrainerName=<YourName>\n" +
                        "```\n" +
                        "An OT is required to ensure friendship persists during trades."
                    );
                break;

            case 'batch_markings':
                embed
                    .setTitle("Markings")
                    .setDescription(
                        "Set Pokémon markings with commands like:\n" +
                        "```\n" +
                        ".MarkingDiamond=0\n" +
                        ".MarkingHeart=1\n" +
                        "```\n" +
                        "Where values (0, 1, or 2) determine the type of mark."
                    );
                break;

            case 'batch_dynamax_level':
                embed
                    .setTitle("Dynamax Level")
                    .setDescription(
                        "Adjust Dynamax level with:\n" +
                        "```\n" +
                        ".DynamaxLevel=<1-10>\n" +
                        "```\n" +
                        "This reflects the number of Dynamax Candies used."
                    );
                break;

            case 'batch_contest_stats':
                embed
                    .setTitle("Contest Stats")
                    .setDescription(
                        "Set contest stats using:\n" +
                        "```\n" +
                        ".ContestBeauty=<1-255>\n" +
                        ".ContestCool=<1-255>\n" +
                        ".ContestCute=<1-255>\n" +
                        ".ContestSheen=<1-255>\n" +
                        ".ContestSmart=<1-255>\n" +
                        ".ContestTough=<1-255>\n" +
                        "```\n" +
                        "Or use `.ContestStats=$suggestAll` to max them."
                    );
                break;

            case 'batch_met_conditions':
                embed
                    .setTitle("Met Conditions")
                    .setDescription(
                        "Use met conditions to set when and how your Pokémon was encountered:\n" +
                        "```\n" +
                        ".MetDate=YYYYMMDD\n" +
                        ".MetLevel=<Level>\n" +
                        ".EggMetDate=YYYYMMDD\n" +
                        "```\n" +
                        "Refer to additional info for more details."
                    );
                break;

            case 'batch_pp_ups':
                embed
                    .setTitle("PP Up's")
                    .setDescription(
                        "Enhance move PP with:\n" +
                        "```\n" +
                        ".Move1_PPUps=<0-3>\n" +
                        ".Move2_PPUps=<0-3>\n" +
                        ".Move3_PPUps=<0-3>\n" +
                        ".Move4_PPUps=<0-3>\n" +
                        "```\n" +
                        "This gives your moves extra power points."
                    );
                break;

            case 'batch_size_scalar':
                embed
                    .setTitle("Size Scalar")
                    .setDescription(
                        "Adjust your Pokémon's size using:\n" +
                        "```\n" +
                        ".Scale=<1-255>\n" +
                        ".HeightScalar=<1-255>\n" +
                        ".WeightScalar=<1-255>\n" +
                        "```\n" +
                        "These values determine the Pokémon's displayed size."
                    );
                break;

            case 'batch_met_date':
                embed
                    .setTitle("Met Date")
                    .setDescription(
                        "Set the date your Pokémon was met with:\n" +
                        "```\n" +
                        ".MetDate=YYYYMMDD\n" +
                        ".EggMetDate=YYYYMMDD\n" +
                        "```\n" +
                        "Format: YearMonthDay."
                    );
                break;

            case 'batch_met_location':
                embed
                    .setTitle("Met Location")
                    .setDescription(
                        "Specify where your Pokémon was met:\n" +
                        "```\n" +
                        ".MetLocation=<#>\n" +
                        ".Version=<#>\n" +
                        "```\n" +
                        "Refer to provided links for location codes and generation details."
                    );
                break;

            case 'batch_met_level':
                embed
                    .setTitle("Met Level")
                    .setDescription(
                        "Set the level at which your Pokémon was met:\n" +
                        "```\n" +
                        ".MetLevel=<1-100>\n" +
                        ".EXP=<value>\n" +
                        "```\n" +
                        "Example: `.EXP=1000000000` for high experience."
                    );
                break;

            case 'batch_ribbons_marks':
                embed
                    .setTitle("Ribbons & Marks")
                    .setDescription(
                        "Apply ribbons and marks with commands like:\n" +
                        "```\n" +
                        ".RibbonMarkAlpha=<True/False>\n" +
                        ".RibbonPartner=<True/False>\n" +
                        ".Ribbons=$SuggestAll\n" +
                        ".Ribbons=$SuggestNone\n" +
                        "```\n" +
                        "For a full list, refer to the provided links."
                    );
                break;

            case 'batch_current_level':
                embed
                    .setTitle("Current Level")
                    .setDescription(
                        "Set the current level of your Pokémon with:\n" +
                        "```\n" +
                        ".CurrentLevel=<1-100>\n" +
                        "```\n" +
                        "You can also randomize the level."
                    );
                break;

            case 'batch_hyper_training':
                embed
                    .setTitle("Hyper Training")
                    .setDescription(
                        "Hypertrain your Pokémon's IVs using:\n" +
                        "```\n" +
                        ".HyperTrainFlags=<0-255>\n" +
                        "```\n" +
                        "A value of 255 hypertrains all IVs."
                    );
                break;

            default:
                embed
                    .setTitle("Unknown Interaction")
                    .setDescription("This button does not have an assigned action.");
                break;
        }

        // Send the embed as an ephemeral message
        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
