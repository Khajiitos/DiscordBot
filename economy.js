const Discord = require('discord.js');
const client = require('./main');
const fs = require('fs')

const embedFooterData = {text: 'Economy bot by Khajiitos#5835', iconURL: 'https://cdn.discordapp.com/avatars/408330424562089984/9a944c01c8b129b05d74b7e4ec72c901.webp'};

/*

{
    userid: {
        balance: 0
    }
}

*/
let economyData = { };

function createEconomyEntryForUserID(userID) {
    economyData[userID] = {
        balance: 0
    }
}

function hasEconomyEntry(userID) {
    return !!(economyData.userID);
}

function getBalanceFor(userID) {
    if (!hasEconomyEntry(userID)) {
        createEconomyEntryForUserID(userID);
    }
    return economyData[userID].balance;
}

function readEconomyDataFromFile() {
    fs.open('economydata.json', 'r', (errno, fd) => {
        if (errno) return;
        fs.read(fd, (errno, bytesRead, buffer) => {
            if (errno) return;
            try {
                economyData = JSON.parse(buffer);
            } catch(e) {
                
            }
        });
    });
}

function writeEconomyDataToFile(exitProcessAfterwards = false) {
    try {
        fs.open('economydata.json', 'w', (errno, fd) => {
            fs.write(fd, JSON.stringify(economyData), ()=>{});
            if (exitProcessAfterwards)
                process.exit();
        });
    } catch(e) {
        console.error('There was an error while trying to write to economydata.json.');
        if (exitProcessAfterwards)
            process.exit();
    }
}

readEconomyDataFromFile();
setInterval(writeEconomyDataToFile, 60000);

process.on('SIGINT', () => {
    console.log('Force saving economy data to economydata.json...');
    writeEconomyDataToFile(true);
});

client.on('messageCreate', (message) => {
    let dividedMessage = message.content.split(' ');

    if (message.author.bot || dividedMessage.length === 0) {
        return;
    }

    switch(dividedMessage[0]) {
        case '!economy':
        case '!eco':
            if (dividedMessage.length === 1 || dividedMessage[1] === 'help') {
                let embedAuthorData = {name: message.author.username, iconURL: message.author.avatarURL()};
        
                const messageEmbed = new Discord.MessageEmbed()
                .setColor('#00FFFF')
                .setTitle('Economy - Help')
                .setFooter(embedFooterData)
                .setAuthor(embedAuthorData)
                .setDescription(
                    `
                    hi
                    i think your balance is ${getBalanceFor(message.author.id)}
                    `);
                message.channel.send({embeds: [messageEmbed]});
            }
            break;
        case '!balance':
        case '!money':
        case '!bal':
            let embedAuthorData = {name: message.author.username, iconURL: message.author.avatarURL()};
        
            const messageEmbed = new Discord.MessageEmbed()
            .setColor('#00FFFF')
            .setFooter(embedFooterData)
            .setAuthor(embedAuthorData)
            .setDescription(
                `
                Your balance: ${getBalanceFor(message.author.id)}
                `);
            message.channel.send({embeds: [messageEmbed]});
    }

    if (dividedMessage[0] !== '!economy' && dividedMessage[0] !== '!eco') {
        return;
    }
});