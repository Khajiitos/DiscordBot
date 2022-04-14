const fs = require('fs');
const Discord = require('discord.js');

const intents = new Discord.Intents([
    //Discord.Intents.NON_PRIVILEGED, // include all non-privileged intents, would be better to specify which ones you actually need
    "GUILDS",
    "GUILD_PRESENCES",
    "GUILD_MESSAGES",
    "GUILD_MESSAGE_REACTIONS"
]);

//const client = new Discord.Client({ ws: { intents } });
const client = new Discord.Client({intents: intents});

module.exports = client;

client.once('ready', function() {
    console.log('Logged in!');
    console.log('ready');
    console.log('Status: ' + client.user.presence.status);
});

require('./tictactoe');
require('./onlinestatuses');

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
            }
            break;
        case ";rec":
            message.channel.send('https://media.discordapp.net/attachments/844656969432432680/925823807401390080/among.png');
            break;
    }
});

let token = fs.readFileSync('token.txt').toString();
client.login(token);