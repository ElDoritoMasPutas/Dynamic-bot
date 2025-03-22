const { Client, GatewayIntentBits, Partials, Collection, REST, Routes, Events } = require('discord.js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildPresences
    ],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction,
        Partials.User
    ]
});

client.setMaxListeners(20);

const token = process.env.BOT_TOKEN;
const clientId = process.env.CLIENT_ID;

if (!token || !clientId) {
    console.error("Missing BOT_TOKEN or CLIENT_ID in .env file.");
    process.exit(1);
}

client.commands = new Collection();
client.events = new Collection();

const commands = [];

const commandFiles = fs.readdirSync('./src/BotCommands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(`./src/BotCommands/${file}`);
    if (command.data && command.execute) {
        client.commands.set(command.data.name, command);
        commands.push(command.data.toJSON());
    } else {
        console.warn(`Skipping invalid command file: ${file}`);
    }
}

const eventFiles = fs.readdirSync('./src/Events').filter(file => file.endsWith('.js'));
for (const file of eventFiles) {
    const event = require(`./src/Events/${file}`);
    if (event.name && typeof event.execute === 'function') {
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args, client));
        } else {
            client.on(event.name, (...args) => event.execute(...args, client));
        }
    } else {
        console.warn(`Skipping invalid event file: ${file}`);
    }
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log('Refreshing application commands...');
        await rest.put(Routes.applicationCommands(clientId), { body: commands });
        console.log('Successfully reloaded application commands.');
    } catch (error) {
        console.error('Error registering commands:', error);
    }
})();

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on(Events.InteractionCreate, async interaction => {
    if (interaction.isCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(`Error executing command ${interaction.commandName}:`, error);
            await interaction.reply({ content: 'There was an error executing this command!', ephemeral: true });
        }
    } else if (interaction.isButton() || interaction.isModalSubmit()) {
        const handler = client.commands.get(interaction.customId);
        if (handler && handler.execute) {
            try {
                await handler.execute(interaction);
            } catch (error) {
                console.error(`Error in interaction handler:`, error);
            }
        }
    }
});

client.login(token);
