const Discord = require('discord.js');
const Builders = require('@discordjs/builders');
const { client, slashCommandsList } = require('./main');
const fs = require('fs');

let timeout = null;

function msToNextFullMinute() {
    const date = new Date();
    return 60000 - ((date.getSeconds() * 1000) + date.getMilliseconds());
}

function update() {
    updateOnlineStatuses();
    timeout = setTimeout(update, msToNextFullMinute());
}

function presenceToChar(presence) {

    if (!presence) return 'f';

    let phone = false;

    if (presence.clientStatus) {
        const desktop = presence.clientStatus.web;
        const web = presence.clientStatus.web;
        const mobile = presence.clientStatus.mobile;

        phone = (!desktop || desktop === 'idle' || desktop == 'offline') && 
        (!web || web === 'idle' || web == 'offline') && mobile;
    }
    
    switch(presence.status) {
        case 'offline': return phone ? 'F' : 'f';
        case 'online': return phone ? 'O' : 'o';
        case 'dnd': return phone ? 'D' : 'd';
        case 'idle': return phone ? 'I' : 'i';
        default: return 'f';
    }
}

function updateOnlineStatuses() {
    let users = [];
    client.guilds.cache.forEach(guild => {
        guild.members.cache.forEach(guildMember => {
            if (!users.some(obj => obj.id === guildMember.user.id)) {
                users.push({
                    name: guildMember.user.username + '#' + guildMember.user.discriminator,
                    id: guildMember.user.id,
                    presenceChar: presenceToChar(guildMember.presence)
                });
            }
        });
    });
    
    if (!fs.existsSync('statusdata/')){
        fs.mkdirSync('statusdata/');
    }

    let nameDictionaryString = '';

    users.forEach(user => {
        let buffer = new Buffer.allocUnsafe(5);
        buffer.writeUInt32BE(Math.floor(Date.now() / 1000));
        buffer.write(user.presenceChar, 4);
        fs.appendFile(`statusdata/${user.id}`, buffer, ()=>{});
        nameDictionaryString += user.name + ':' + user.id + '\n';
    });

    fs.writeFile('namedictionary.txt', nameDictionaryString, ()=>{});
}

client.on('interactionCreate', interaction => {
    if (!interaction.isCommand()) return;
    
    switch(interaction.commandName) {
        case 'lastonline': {
            const user = interaction.options.getUser('user');

            if (!fs.existsSync(`statusdata/${user.id}`)){
                interaction.reply('I don\'t have data about this user.');
                return;
            }

            const data = fs.readFileSync(`statusdata/${user.id}`);
            const dataLength = data.length;

            if (dataLength < 5) {
                interaction.reply('I don\'t have data about this user.');
                return;
            }

            let lastOnlineTimestamp = null;
            let lastOnlineStatus = null;

            for (let offset = dataLength - 5; offset > 0; offset -= 5) {
                const entry = data.subarray(offset, offset + 5);
                const status = String.fromCharCode(entry.readUint8(4));

                if (status !== 'f' && status !== 'F') {
                    lastOnlineTimestamp = entry.readUInt32BE();
                    lastOnlineStatus = status;
                    break;
                }
            }

            const statusCharToDescription = {
                'o': 'Online',
                'O': 'Online on mobile',
                'd': 'Do not disturb',
                'D': 'Do not disturb on mobile',
                'i': 'Idle',
                'I': 'Idle on mobile'
            }

            if (lastOnlineTimestamp === null) {
                interaction.reply('I\'ve never seen this user online.');
            } else {
                if (Date.now() / 1000 - lastOnlineTimestamp < 60) {
                    interaction.reply(`${user.username} is online right now (${statusCharToDescription[lastOnlineStatus]}).`);
                } else {
                    interaction.reply(`${user.username} was last online <t:${lastOnlineTimestamp}:R> (${statusCharToDescription[lastOnlineStatus]})`);
                }
            }
            break;
        }
        case 'lastoffline': {
            const user = interaction.options.getUser('user');

            if (!fs.existsSync(`statusdata/${user.id}`)){
                interaction.reply('I don\'t have data about this user.');
                return;
            }

            const data = fs.readFileSync(`statusdata/${user.id}`);
            const dataLength = data.length;

            if (dataLength < 5) {
                interaction.reply('I don\'t have data about this user.');
                return;
            }

            let lastOfflineTimestamp = null;

            for (let offset = dataLength - 5; offset > 0; offset -= 5) {
                const entry = data.subarray(offset, offset + 5);
                const status = String.fromCharCode(entry.readUint8(4));

                if (status === 'f' || status === 'F') {
                    lastOfflineTimestamp = entry.readUInt32BE();
                    break;
                }
            }

            if (lastOfflineTimestamp === null) {
                interaction.reply('I\'ve never seen this user offline.');
            } else {
                if (Date.now() / 1000 - lastOfflineTimestamp < 60) {
                    interaction.reply(`${user.username} is offline right now.`);
                } else {
                    interaction.reply(`${user.username} was last offline <t:${lastOfflineTimestamp}:R>`);
                }
            }
            break;
        }
    }
});

client.once('ready', () => {
    timeout = setTimeout(update, msToNextFullMinute());
});

slashCommandsList.push(
    new Builders.SlashCommandBuilder()
    .setName('lastonline')
    .setDescription('Checks when a user was last online')
    .addUserOption(option =>
        option
        .setName('user')
        .setDescription('User')
        .setRequired(true)
    )
);

slashCommandsList.push(
    new Builders.SlashCommandBuilder()
    .setName('lastoffline')
    .setDescription('Checks when a user was last offline')
    .addUserOption(option =>
        option
        .setName('user')
        .setDescription('User')
        .setRequired(true)
    )
);