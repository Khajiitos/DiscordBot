const Discord = require('discord.js');
const client = require('./main');
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
        console.log(buffer);
        fs.appendFile(`statusdata/${user.id}`, buffer, ()=>{});
        nameDictionaryString += user.name + ':' + user.id + '\n';
    });

    fs.writeFile('namedictionary.txt', nameDictionaryString, ()=>{});
}

client.once('ready', () => {
    timeout = setTimeout(update, msToNextFullMinute());
});