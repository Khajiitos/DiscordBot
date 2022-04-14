const Discord = require('discord.js');
const client = require('./main');
const fs = require('fs');

class UserWithStatus {
    userNameAndTag = "ab#1234";
    userid = 0;
    timestamp = 0;
    status = 'f';
}

function isUsingPhone(clientStatus) {
    if (clientStatus == null)
        return false;

    let desktop = clientStatus.desktop;
    let web = clientStatus.web;
    let mobile = clientStatus.mobile;

    if ( (web && web === 'idle') || (desktop && desktop === 'idle') && mobile)
        return true;

    return !desktop && !web && mobile;
}

function updateOnlineStatuses() {
    //online, offline, dnd, idle
    let arr = [];
    let count = 0;

    function cb(arra) {

        let nameDictionaryString = "";
        arra.forEach(val => {

            let filepath = 'statusdata/';
            let writethis = val.timestamp + val.status + '\n';

            if (!fs.existsSync(filepath))
                fs.mkdirSync(filepath);

            filepath += val.userid + '.txt';
            fs.appendFile(filepath, writethis, function (err) {
                if (err) return console.log(err);
            });
            nameDictionaryString += val.userNameAndTag + ':' + val.userid + '\n';
        });
        fs.writeFile('namedictionary.txt', nameDictionaryString, function (err) {
            if (err) return console.log(err);
        });
    }

    function shortenedOnlineStatus(status, phone = false) {
        switch(status) {
            case "offline": return phone ? 'F' : 'f';
            case "online": return phone ? 'O' : 'o';
            case "dnd": return phone ? 'D' : 'd';
            case "idle": return phone ? 'I' : 'i';
        }
        return '!';
    }

    function secondsSince2021start() {
        return Math.floor((Date.now() / 1000)) - 1609459200;
    }

    client.guilds.cache.forEach(guild => {
        guild.members.cache.forEach(guildMember => {
            let user = new UserWithStatus();
            user.userNameAndTag = guildMember.user.username + '#' + guildMember.user.discriminator;
            user.timestamp = secondsSince2021start();
            user.userid = guildMember.user.id;
            user.status = shortenedOnlineStatus('offline', false); // fix this later
            arr.push(user); 
        });
    });

    let uniqueArray = [...new Map(arr.map(item => [item['userid'], item])).values()]
    cb(uniqueArray);
}

client.once('ready', () => {

    function msToNextFullMinute() {
        let date = new Date();
        let ret =  60000 - ((date.getSeconds() * 1000) + date.getMilliseconds());
        return ret;
    }

    function update() {
        updateOnlineStatuses();
        clearInterval(timer);
        timer = setInterval(update, msToNextFullMinute());
    }

    var timer = setInterval(update, msToNextFullMinute());
});