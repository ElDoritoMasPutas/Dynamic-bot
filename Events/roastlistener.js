const { EmbedBuilder } = require('discord.js');
const shuffle = require('../Utils/shuffle');
const randomColor = require('../Utils/randomColor');

// Full list of roasts (both classics and fresh ones!)
const roasts = [
    "You have the perfect face for... a podcast!",
    "You must be really busy because you're always doing nothing.",
    "Your brain must be like a web browser—20 tabs open and none of them are working.",
    "You're like a pro gamer... just without the 'pro' part.",
    "You’re the reason we have instructions on shampoo bottles, aren’t you?",
    "I bet you bring a lot of value... to 'team spirit' rather than 'strategy.'",
    "You're so unique... in the way you always lose things.",
    "You're like a magician—you make all of my patience disappear.",
    "You must be a magician because whenever I talk to you, time flies... and I don’t get anything done.",
    "I don’t know what’s longer—your to-do list or your list of excuses.",
    "You’re like a fine wine... best left in the cellar for a while.",
    "You're the human version of a speed bump—slow down, but not in a bad way!",
    "You're like a DIY project: sounds fun at first, but gets complicated quickly.",
    "You’re living proof that even if something is broken, it can still be functional.",
    "You’re one of a kind—luckily, because two of you would be too much!",
    "You're like Wi-Fi: sometimes you're just a little spotty.",
    "I’d call you sharp, but I don’t want to exaggerate.",
    "If you were any slower, I’d suggest you try 'pause' instead of 'play.'",
    "You're like a pop quiz—nobody asked for you, but here you are!",
    "You have a face for radio and a voice for silent films!",
    "You’re not awkward, you’re just... a limited edition.",
    "You should put that on your resume: 'Can tie shoelaces... most of the time.'",
    "You're so original... nobody can figure out what you're trying to do.",
    "Your life is like a 'choose your own adventure' book, except every choice ends in a nap.",
    "You have a great sense of humor, especially for someone who doesn’t get jokes.",
    "You’re like a slow Wi-Fi connection—eventually, we’ll get there.",
    "You should write a book. Something like, ‘How to Be Confusing in 10 Easy Steps.’",
    "I’m trying to imagine you with a personality... give me a minute.",
    "You have a great energy about you... I just wish it came with a 'mute' button sometimes.",
    "You're like a movie without a plot—people still enjoy watching you, though!",
    "You must be a lost sock in the laundry of life... nobody knows where you went, but we kind of miss you.",
    "You're not procrastinating—you're just giving everyone else a head start.",
    "You’re like a penny—two-sided, but not really worth much unless someone needs exact change.",
    "You're the human version of a participation award—still appreciated, though!",
    "You're like a cloud—once you disappear, it's a beautiful day.",
    "Your secrets are safe with me. I never even listen when you tell me them.",
    "You're so laid back, I'm surprised gravity hasn't claimed you yet.",
    "You’re proof that even the smallest spark of effort can feel like an explosion.",
    "You bring people together... mostly because you're the topic of 'What just happened?'",
    "You're like a password—complicated, and no one wants to deal with you.",
    "Your greatest strength? Probably the Wi-Fi signal you’re riding on.",
    "You’re the blueprint for 'how not to do it.' Still inspirational though!",
    "Your potential is limitless—if we're counting how many things you're avoiding!",
    "You're like a software update—everyone ignores you until you crash something important.",
    "Your spirit animal must be a turtle—slow, but kind of endearing.",
    "You're like an elevator... full of ups and downs, but mostly stuck in awkward silence.",
    "Your 'on fire' moments remind me of a sparkler. Bright, but don't get too close.",
    "You're a team player... if the team is imaginary.",
    "You're like a parking spot—never there when anyone actually needs you.",
    "You’re like a Google search: you come up with results no one asked for.",
    "You're like a demo version of yourself—just enough to get by, but missing key features.",
    "You're proof that being loud is not the same as being interesting.",
    "You're the human equivalent of a pop-up ad—surprising, unnecessary, and occasionally funny.",
    "You’re like coffee—an acquired taste, and some people just can’t handle you.",
    "You're like a meme in 2025: funny for five seconds, then forgotten forever.",
    "You're great in a crisis... mostly because you're the one who caused it.",
    "You’re the kind of friend who’d watch me struggle just to narrate it hilariously.",
    "You're like a low-budget superhero—big dreams, but limited by reality.",
    "You must be a puzzle—because everyone’s trying to figure you out, but nobody's finished yet.",
    "You should start a podcast: ‘Long Talks About Nothing.’ Guaranteed subscribers: 1 (you)."
];

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        // Only act on button interactions with the custom ID
        if (!interaction.isButton() || interaction.customId !== 'another_roast') return;

        // Ensure the message has an embed from the initial command
        if (!interaction.message || !interaction.message.embeds.length) return;
        const originalEmbed = interaction.message.embeds[0];

        // Shuffle the roasts and pick one fresh roast
        shuffle(roasts);
        const newRoast = roasts[0];

        // Extract the user mention from the current embed's description.
        // It should look like: "<@UserID>, <roast text>"
        let newDescription;
        const descriptionMatch = originalEmbed.description.match(/^(.*?,)\s*.*/);
        if (descriptionMatch && descriptionMatch[1]) {
            newDescription = `${descriptionMatch[1]} ${newRoast}`;
        } else {
            newDescription = newRoast; // Fallback in case regex fails.
        }

        // Create an updated embed with a new random color and updated description.
        const updatedEmbed = EmbedBuilder.from(originalEmbed)
            .setColor(randomColor())
            .setDescription(newDescription)
            .setTimestamp();

        // Finally, update the message with the new embed.
        await interaction.update({ embeds: [updatedEmbed] });
    },
};
