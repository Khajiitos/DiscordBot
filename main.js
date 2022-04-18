const fs = require('fs');
const Discord = require('discord.js');
const Rest = require('@discordjs/rest');
const DiscordApiTypes = require('discord-api-types/v9');

const intents = new Discord.Intents([
    "GUILDS",
    "GUILD_PRESENCES",
    "GUILD_MESSAGES",
    "GUILD_MESSAGE_REACTIONS"
]);

const client = new Discord.Client({intents: intents});
const slashCommandsList = [];

module.exports = {client, slashCommandsList};

client.once('ready', () => {
    console.log(`Logged in as ${client.user.username}#${client.user.discriminator}!`);

	rest.put(
		DiscordApiTypes.Routes.applicationCommands(client.user.id),
		{ body: slashCommandsList },
	);
});

require('./tictactoe');
require('./onlinestatuses');
require('./economy');

client.on('messageCreate', message => {

    let dividedMessage = message.content.split(' ');

    if (message.author.bot)
        return;
    
    switch(dividedMessage[0]) {
        case "!avatar":
            const messageEmbed = new Discord.MessageEmbed()
            .setColor('#0000FF')
            .setImage(message.author.avatarURL())
            .setTitle('Your avatar');
            message.channel.send({embeds: [messageEmbed]});
            break;
        case "!jseval":
            if (message.author.id == '408330424562089984') {
                try {
                    let code = dividedMessage.slice(1).join(' ');
                    let ret = String(eval(code));
                    if (ret == '')
                        ret = ' ';
                    message.channel.send('```' + ret + '```');
                } catch(error) {
                    message.channel.send('```' + error.toString() + '```');
                }
            } else {
                message.reply(':flushed:');
            }
            break;
        case ";rec":
            message.channel.send('https://media.discordapp.net/attachments/844656969432432680/925823807401390080/among.png');
            break;
    }
});

let token = fs.readFileSync('token.txt').toString();
const rest = new Rest.REST({ version: '9' }).setToken(token);

client.login(token);