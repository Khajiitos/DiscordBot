const Discord = require('discord.js');
const Builders = require('@discordjs/builders');
const { client, slashCommandsList, config } = require('./main');
const fs = require('fs');

const embedFooterData = {text: 'Economy bot by Khajiitos#5835', iconURL: 'https://cdn.discordapp.com/avatars/408330424562089984/9a944c01c8b129b05d74b7e4ec72c901.webp'};

const defaultUserEconomyData = {
    balance: 0,
    job: null,
    availableJobs: [
        {
            name: 'Janitor',
            chanceOfGettingFired: 10,
            baseSalary: 5,
            cooldown: 60
        }
    ],
    lastWorked: 0,
    lastJobRefresh: 0,
    lastCoinflipped: 0,
    lastRobbed: 0,
    arrestedUntil: 0,
    crimeExperience: 0,
    jobExperiences: { }
};

let economyData = {};
let jobs = [];

function randomInteger(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
}

function readJobsFromFile() {
    fs.readFile('jobs.json', (errno, data) => {
        if (errno) return console.error(errno);
        try {
            jobs = JSON.parse(data.toString());
        } catch(e) {
            console.error('Failed to parse JSON from jobs.json.');
            console.error(e);
        }
    });
}

function validateAllFieldsPresentInEconomyData() {
    let totalFieldsMissing = 0;
    for (let userID of Object.keys(economyData)) { 
        for (let field of Object.keys(defaultUserEconomyData)) {
            if (typeof economyData[userID][field] === 'undefined') {
                economyData[userID][field] = defaultUserEconomyData[field];
                totalFieldsMissing++;
            }
        }
    }
    if (totalFieldsMissing > 0) {
        console.log(`There ${totalFieldsMissing === 1 ? 'was' : 'were'} ${totalFieldsMissing} field${totalFieldsMissing !== 1 ? 's' : ''} in total that were present in the default object, but not in the users' objects. Filled them with default fields.`);
    }
}

function getInGameTime() {
    const date = new Date();
    // minutes into the day
    const timeOfDay = Math.floor((date.getMinutes() * 60 + date.getSeconds()) * 0.4);
    return {
        time: timeOfDay,
        hour: Math.floor(timeOfDay / 60),
        minute: timeOfDay % 60,
        as12hString: function() {
            let am = true;
            let hour = this.hour;
            if (hour == 0) {
                am = true;
                hour = 12;
            } else if (hour == 12) {
                am = false;
                hour = 12;
            } else if (hour > 12) {
                am = false;
                hour = hour - 12;
            }
            return `${hour}:${this.padWithZero(this.minute)} ${am ? 'AM' : 'PM'}`;
        },
        as24hString: function() {
            return `${this.padWithZero(this.hour)}:${this.padWithZero(this.minute)} ${am ? 'AM' : 'PM'}`;
        },
        padWithZero: (number) => {
            if (number >= 10) return number;
            return '0' + number;
        }
    }
}

function createEconomyEntryForUserID(userID) {
    if (userID === undefined) {
        console.trace('Did you forget to add the userID to the arguments?');
    } else {
        economyData[userID] = JSON.parse(JSON.stringify(defaultUserEconomyData));
    }
}

function hasEconomyEntry(userID) {
    return !!(economyData[userID]);
}

function generateAvailableJobs(userID) {
    if (!hasEconomyEntry(userID)) {
        createEconomyEntryForUserID(userID);
    }

    economyData[userID].availableJobs = [];

    const totalWorkExperience = getTotalJobExperience(userID);
    let jobAmount = 0;

    /*
    The function can generate from 0 to 3 random available jobs.
    There is an 80% chance that at least 1 job will be generated.
    There is an 50% chance that at least 2 jobs will be generated.
    There is an 25% chance that at least 3 jobs will be generated.
    TODO: maybe increase the chance of getting more jobs based on work experience?
    */

    const randJobAmount = randomInteger(1, 100);
    
    if (randJobAmount <= 25) jobAmount = 3;
    else if (randJobAmount <= 50) jobAmount = 2;
    else if (randJobAmount <= 80) jobAmount = 1;

    if (jobAmount === 0) {
        return;
    }

    /*
    Each job specified in jobs.json has a "rarity" attribute.
    For now, it goes from 0 to 3.
    */
    const rarityTickets = [10, 8, 5, 3];

    let jobsPossible = [];
    let totalTickets = 0;
    for (let job of jobs) {
        if (totalWorkExperience >= job.minRequiredWorkExperience) {
            jobsPossible.push(job);
            totalTickets += rarityTickets[job.rarity];
        }
    }

    for (let i = 0; i < jobAmount; i++) {
        const randTicket = randomInteger(1, totalTickets);
        let ticketsPassed = 1;
        for (let job of jobsPossible) {
            if (randTicket >= ticketsPassed && randTicket <= ticketsPassed + rarityTickets[job.rarity]) {
                economyData[userID].availableJobs.push({
                    name: job.name,
                    chanceOfGettingFired: job.chanceOfGettingFired,
                    baseSalary: randomInteger(job.minBaseSalary, job.maxBaseSalary),
                    cooldown: randomInteger(job.minCooldown, job.maxCooldown)
                });
            }
            ticketsPassed += rarityTickets[job.rarity] + 1;
        }
    }
}

function getBalanceFor(userID) {
    if (!hasEconomyEntry(userID)) {
        createEconomyEntryForUserID(userID);
    }
    return economyData[userID].balance;
}

function setBalanceFor(userID, balance) {
    if (!hasEconomyEntry(userID)) {
        createEconomyEntryForUserID(userID);
    }
    return economyData[userID].balance = balance;
}

function addToBalance(userID, balance) {
    if (!hasEconomyEntry(userID)) {
        createEconomyEntryForUserID(userID);
    }
    return economyData[userID].balance += balance;
}

function removeFromBalance(userID, balance) {
    if (!hasEconomyEntry(userID)) {
        createEconomyEntryForUserID(userID);
    }
    return economyData[userID].balance -= balance;
}

function hasJob(userID) {
    if (!hasEconomyEntry(userID)) {
        createEconomyEntryForUserID(userID);
    }
    return !!(economyData[userID].job);
}

function getJob(userID) {
    if (!hasEconomyEntry(userID)) {
        createEconomyEntryForUserID(userID);
    }
    return economyData[userID].job;
}

function getAvailableJobs(userID) {
    if (!hasEconomyEntry(userID)) {
        createEconomyEntryForUserID(userID);
    }
    return economyData[userID].availableJobs;
}

function getLastJobRefresh(userID) {
    if (!hasEconomyEntry(userID)) {
        createEconomyEntryForUserID(userID);
    }
    return economyData[userID].lastJobRefresh;
}

function setLastJobRefresh(userID, jobRefresh) {
    if (!hasEconomyEntry(userID)) {
        createEconomyEntryForUserID(userID);
    }
    economyData[userID].lastJobRefresh = jobRefresh;
}

function getJobExperiences(userID) {
    if (!hasEconomyEntry(userID)) {
        createEconomyEntryForUserID(userID);
    }
    return economyData[userID].jobExperiences;
}

function getTotalJobExperience(userID) {
    const experiences = getJobExperiences(userID);
    let exp = 0;
    for (let key of Object.keys(experiences)) {
        exp += experiences[key];
    }
    return exp;
}

function getJobExperienceIn(userID, jobName) {
    const experiences = getJobExperiences(userID);
    return (typeof experiences[jobName] !== 'undefined') ? experiences[jobName] : 0;
}

function setJobExperienceIn(userID, jobName, jobExperience) {
    if (!hasEconomyEntry(userID)) {
        createEconomyEntryForUserID(userID);
    }
    economyData[userID].jobExperiences[jobName] = jobExperience;
}

function addJobExperienceIn(userID, jobName, jobExperience) {
    if (!hasEconomyEntry(userID)) {
        createEconomyEntryForUserID(userID);
    }
    if (typeof economyData[userID].jobExperiences[jobName] !== 'undefined') {
        economyData[userID].jobExperiences[jobName] += jobExperience;
    } else {
        economyData[userID].jobExperiences[jobName] = jobExperience;
    }
}

function getLastWorked(userID) {
    if (!hasEconomyEntry(userID)) {
        createEconomyEntryForUserID(userID);
    }
    return economyData[userID].lastWorked;
}

function setLastWorked(userID, lastWorked) {
    if (!hasEconomyEntry(userID)) {
        createEconomyEntryForUserID(userID);
    }
    economyData[userID].lastWorked = lastWorked;
}

function setJob(userID, job) {
    if (!hasEconomyEntry(userID)) {
        createEconomyEntryForUserID(userID);
    }
    economyData[userID].job = job;
}

function getLastCoinflipped(userID) {
    if (!hasEconomyEntry(userID)) {
        createEconomyEntryForUserID(userID);
    }
    return economyData[userID].lastCoinflipped;
}

function setLastCoinflipped(userID, lastCoinflipped) {
    if (!hasEconomyEntry(userID)) {
        createEconomyEntryForUserID(userID);
    }
    economyData[userID].lastCoinflipped = lastCoinflipped;
}

function getCrimeExperience(userID) {
    if (!hasEconomyEntry(userID)) {
        createEconomyEntryForUserID(userID);
    }
    return economyData[userID].crimeExperience;
}

function addToCrimeExperience(userID, amount) {
    if (!hasEconomyEntry(userID)) {
        createEconomyEntryForUserID(userID);
    }
    economyData[userID].crimeExperience += amount;
}

function getArrestedUntil(userID) {
    if (!hasEconomyEntry(userID)) {
        createEconomyEntryForUserID(userID);
    }
    return economyData[userID].arrestedUntil;
}

function setArrestedUntil(userID, arrestedUntil) {
    if (!hasEconomyEntry(userID)) {
        createEconomyEntryForUserID(userID);
    }
    economyData[userID].arrestedUntil = arrestedUntil;
}

function isArrested(userID) {
    return getArrestedUntil(userID) > Date.now();
}

function getLastRobbed(userID) {
    if (!hasEconomyEntry(userID)) {
        createEconomyEntryForUserID(userID);
    }
    return economyData[userID].lastRobbed;
}

function setLastRobbed(userID, lastRobbed) {
    if (!hasEconomyEntry(userID)) {
        createEconomyEntryForUserID(userID);
    }
    economyData[userID].lastRobbed = lastRobbed;
}

function getFireChanceReductionIn(userID, jobName) {
    if (!hasEconomyEntry(userID)) {
        createEconomyEntryForUserID(userID);
    }
    return Math.floor(getJobExperienceIn(userID, jobName) / 3) / 10;
}

function readEconomyDataFromFile() {

    fs.readFile('economydata.json', (errno, data) => {
        if (errno) return console.error(errno);
        try {
            economyData = JSON.parse(data.toString());
            validateAllFieldsPresentInEconomyData();
        } catch(e) {
            console.error('Failed to parse JSON from economydata.json.');
            console.error(e);
        }
    });
}

function writeEconomyDataToFile(exitProcessAfterwards = false) {
    try {
        fs.open('economydata.json', 'w', (errno, fd) => {
            if (errno) return console.error(errno);
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

function getUsernameAndDiscriminatorFromUserID(userid) {
    if (typeof client.users.cache.get(userid) !== 'undefined') {
        const user = client.users.cache.get(userid);
        return user.username + '#' + user.discriminator;
    } else {
        return userid;
    }
}

readJobsFromFile();
readEconomyDataFromFile();
setInterval(writeEconomyDataToFile, 60000);

process.on('SIGINT', () => {
    console.log('Force saving economy data to economydata.json...');
    writeEconomyDataToFile(true);
});

client.on('messageCreate', (message) => {

    const dividedMessage = message.content.split(' ');

    if (message.author.bot || dividedMessage.length === 0) {
        return;
    }

    if (!config.owners.includes(message.author.id)) {
        return;
    }

    switch(dividedMessage[0]) {
        case '!debugdata': {
            message.reply("```json\n" + JSON.stringify(economyData, null, 2) + "```");
            break;
        }
        case '!debugwipedata': {
            economyData = {};
            message.reply("```json\n" + JSON.stringify(economyData, null, 2) + "```");
            break;
        }
    }
});

client.on('interactionCreate', interaction => {
    if (!interaction.isCommand()) return;

    const embedAuthorData = {name: interaction.user.username, iconURL: interaction.user.avatarURL()};
    const userID = interaction.user.id;

    if (isArrested(userID)) {
        const disallowedCommands = [
            'work',
            'jobapply',
            'coinflip',
            'shop',
            'rob'
        ];

        if (disallowedCommands.some(command => command === interaction.commandName)) {
            const messageEmbed = new Discord.MessageEmbed()
            .setColor('#00FFFF')
            .setFooter(embedFooterData)
            .setAuthor(embedAuthorData)
            .setTitle('Arrested')
            .setDescription(
            `
            You're arrested!
            You can't use this command yet!

            You'll be freed in **${Math.ceil((getArrestedUntil(userID) - Date.now()) / 1000)}s**.
            `);
            interaction.reply({embeds: [messageEmbed]});
            return;
        }
    }

    switch(interaction.commandName) {
        case 'balance':
        case 'money': {
            const messageEmbed = new Discord.MessageEmbed()
            .setColor('#00FFFF')
            .setFooter(embedFooterData)
            .setAuthor(embedAuthorData)
            .setDescription(
                `
                Your balance: ${getBalanceFor(userID)} :coin:
                `);
            interaction.reply({embeds: [messageEmbed]});
            break;
        }
        case 'job': {
            if (hasJob(userID)) {
                const job = getJob(userID);
                const fireChanceReduction = getFireChanceReductionIn(userID, job.name);
                const messageEmbed = new Discord.MessageEmbed()
                .setColor('#00FFFF')
                .setFooter(embedFooterData)
                .setAuthor(embedAuthorData)
                .setTitle('Your job')
                .setDescription(
                    `
                    **Job name:** ${job.name}
                    **Salary:** ${job.baseSalary} :coin:
                    **Chance of getting fired after work:** ${job.chanceOfGettingFired}% ${fireChanceReduction > 0 ? `*-${fireChanceReduction}%*` : ''}
                    **You can work every:** ${job.cooldown}s
                    `);
                interaction.reply({embeds: [messageEmbed]});
            } else {
                const messageEmbed = new Discord.MessageEmbed()
                .setColor('#00FFFF')
                .setFooter(embedFooterData)
                .setAuthor(embedAuthorData)
                .setDescription(
                    `
                    You don't have a job!
                    You can view your available jobs using the **/jobs** command!
                    `);
                interaction.reply({embeds: [messageEmbed]});
            }
            break;
        }
        case 'jobs': {
            let jobs = getAvailableJobs(userID);
            if (jobs.length !== 0) {

                let description = `**Your total work experience:** ${getTotalJobExperience(userID)} XP\n`;
                for (let i = 0; i < jobs.length; i++) {
                    const job = jobs[i];
                    const xp = getJobExperienceIn(userID, job.name);
                    const fireChanceReduction = getFireChanceReductionIn(userID, job.name);
                    description += `
                    **${job.name} (ID: ${i}${xp > 0 ? `, XP: ${xp}` : ''})**
                    **Salary:** ${job.baseSalary} :coin:
                    **Can work every:** ${job.cooldown}s
                    **Chance of getting fired:** ${job.chanceOfGettingFired}% ${fireChanceReduction > 0 ? `*-${fireChanceReduction}%*` : ''}\n`
                }
                description += `
                To apply for a job, simply use the command **/jobapply [ID]**!

                You can refresh this page using the **/refreshjobs** command!
                ${(Date.now() - getLastJobRefresh(userID) > 600000) ? 'You can use it every 10 minutes!' : `You'll be able to use it again in **${Math.ceil((600000 - (Date.now() - getLastJobRefresh(userID))) / 1000)}s**!`}
                `;

                const messageEmbed = new Discord.MessageEmbed()
                .setColor('#00FFFF')
                .setFooter(embedFooterData)
                .setAuthor(embedAuthorData)
                .setTitle('Job list')
                .setDescription(description);
                interaction.reply({embeds: [messageEmbed]});
            } else {
                const messageEmbed = new Discord.MessageEmbed()
                .setColor('#00FFFF')
                .setFooter(embedFooterData)
                .setAuthor(embedAuthorData)
                .setTitle('Job list')
                .setDescription(
                    `
                    There are no jobs available for you!
                    You can refresh this page using the **/refreshjobs** command!
                    ${(Date.now() - getLastJobRefresh(userID) > 600000) ? 'You can use it every 10 minutes!' : `You'll be able to use it again in **${Math.ceil((600000 - (Date.now() - getLastJobRefresh(userID))) / 1000)}s**!`}
                    `);
                interaction.reply({embeds: [messageEmbed]});
            }
            break;
        }
        case 'refreshjobs': {
            if (Date.now() - getLastJobRefresh(userID) > 600000) {
                setLastJobRefresh(userID, Date.now());
                generateAvailableJobs(userID);
                const jobs = getAvailableJobs(userID);
                const messageEmbed = new Discord.MessageEmbed()
                .setColor('#00FFFF')
                .setFooter(embedFooterData)
                .setAuthor(embedAuthorData)
                .setTitle('Job list refresh')

                let description = `Refreshed your job list!\n**Your total work experience:** ${getTotalJobExperience(userID)} XP\n`;
                if (jobs.length !== 0) {
                    for (let i = 0; i < jobs.length; i++) {
                        const job = jobs[i];
                        const xp = getJobExperienceIn(userID, job.name);
                        const fireChanceReduction = getFireChanceReductionIn(userID, job.name);
                        description += `
                        **${job.name} (ID: ${i}${xp > 0 ? `, XP: ${xp}` : ''})**
                        **Salary:** ${job.baseSalary} :coin:
                        **Can work every:** ${job.cooldown}s
                        **Chance of getting fired:** ${job.chanceOfGettingFired}% ${fireChanceReduction > 0 ? `*-${fireChanceReduction}%*` : ''}\n`
                    }
                } else {
                    description += 'There are no jobs available for you!\n'
                }
                description += '\nYou\'ll be able to use this command again in 10 minutes!';
                messageEmbed.setDescription(description);
                interaction.reply({embeds: [messageEmbed]});
            } else {
                const messageEmbed = new Discord.MessageEmbed()
                .setColor('#00FFFF')
                .setFooter(embedFooterData)
                .setAuthor(embedAuthorData)
                .setTitle('Job list refresh')
                .setDescription(
                `
                You used this command recently!
                You'll be able to use it again in **${Math.ceil((600000 - (Date.now() - getLastJobRefresh(userID))) / 1000)}s**!
                `
                );
                interaction.reply({embeds: [messageEmbed]});
            }
            break;
        }
        case 'work': {
            if (hasJob(userID)) {

                const job = getJob(userID);

                if (Date.now() - getLastWorked(userID) < job.cooldown * 1000) {
                    const messageEmbed = new Discord.MessageEmbed()
                    .setColor('#00FFFF')
                    .setFooter(embedFooterData)
                    .setAuthor(embedAuthorData)
                    .setTitle('Work')
                    .setDescription(
                        `
                        You worked recently, you have to wait a bit!
                        To be exact, you have to wait **${Math.ceil((job.cooldown * 1000 - (Date.now() - getLastWorked(userID))) / 1000)}s**!
                        `
                    );
                    interaction.reply({embeds: [messageEmbed]});
                    return;
                }

                addJobExperienceIn(userID, job.name, 1);
                addToBalance(userID, job.baseSalary);
                let description = 
                `
                **${interaction.user.username} the ${job.name}**
                You worked hard and earned ${job.baseSalary} :coin:!
                Total money: ${getBalanceFor(userID)} :coin:

                +1 ${job.name} XP (total: ${getJobExperienceIn(userID, job.name)})
                Total work experience: ${getTotalJobExperience(userID)}
                `;
                const int = randomInteger(1, 1000);
                if (int <= job.chanceOfGettingFired * 10 - getFireChanceReductionIn(userID, job.name) * 10) {
                    description += 
                    `
                    You kinda sucked during your work today. As a result, you got fired.
                    How unfortunate!
                    `;
                    setJob(userID, null);
                } else {
                    description += 
                    `
                    You'll be able to work again in ${job.cooldown} seconds.
                    `;
                    setLastWorked(userID, Date.now());
                }

                const messageEmbed = new Discord.MessageEmbed()
                .setColor('#00FFFF')
                .setFooter(embedFooterData)
                .setAuthor(embedAuthorData)
                .setTitle('Work')
                .setDescription(description);
                interaction.reply({embeds: [messageEmbed]});
            } else {
                const messageEmbed = new Discord.MessageEmbed()
                .setColor('#00FFFF')
                .setFooter(embedFooterData)
                .setAuthor(embedAuthorData)
                .setTitle('Work')
                .setDescription(
                    `
                    You don't have a job!
                    Use the command **/jobs** to look for one!
                    `);
                interaction.reply({embeds: [messageEmbed]});
            }
            break;
        }
        case 'jobapply': {
            const availableJobs = getAvailableJobs(userID);
            const jobid = interaction.options.getInteger('jobid');

            if (typeof availableJobs[jobid] !== 'undefined') {
                let description = '';

                if (hasJob(userID)) {
                    description = 
                    `
                    You left your old job.
                    *Welcome to your new job!*
                    `
                } else {
                    description = 
                    `
                    *Welcome to your new job!*
                    `
                }

                setJob(userID, availableJobs[jobid]);
                economyData[userID].availableJobs.splice(jobid, 1);

                const messageEmbed = new Discord.MessageEmbed()
                .setColor('#00FFFF')
                .setFooter(embedFooterData)
                .setAuthor(embedAuthorData)
                .setTitle('Work')
                .setDescription(description);
                interaction.reply({embeds: [messageEmbed]});
            } else {
                interaction.reply('This job does not exist!');
            }
            break;
        }
        case 'coinflip': {

            const messageEmbed = new Discord.MessageEmbed()
            .setColor('#00FFFF')
            .setFooter(embedFooterData)
            .setAuthor(embedAuthorData)
            .setTitle('Coinflip')

            if (Date.now() - getLastCoinflipped(userID) < 300000) {
                messageEmbed.setDescription(`You have to wait **${Math.ceil(((300000 - (Date.now() - getLastCoinflipped(userID))) / 1000))}s** more to use this command again!`);
                interaction.reply({embeds: [messageEmbed]});
                return;
            }

            let money = interaction.options.getInteger('money');

            if (money === 0) {
                money = Math.floor(getBalanceFor(userID) / 2);
            }

            let description = '';

            if (money < 0) {
                description =
                `
                You can't gamble air!
                `
            } else if (money > getBalanceFor(userID)) {
                description =
                `
                You don't have this much money!
                `
            } else if (money > Math.floor(getBalanceFor(userID) / 2)) {
                description = 
                `
                You can gamble up to half of your money at once!
                `
            } else if (getBalanceFor(userID) < 2) {
                description = 
                `
                You don't have enough money to gamble!
                You need at least 2 :coin:!
                `
            } else {
                const win = randomInteger(0, 1) === 0;

                if (win) {
                    addToBalance(userID, money);
                    description = 
                    `
                    Congratulations!
                    You won ${money} :coin:!
                    `
                } else {
                    removeFromBalance(userID, money);
                    description = 
                    `
                    :cry: You've lost ${money} :coin:.
                    `
                }
                description +=
                `
                You now have ${getBalanceFor(userID)} :coin:
                `
                messageEmbed.setDescription(description);
                interaction.reply({embeds: [messageEmbed]});
                setLastCoinflipped(userID, Date.now());
                return;
            }

            description +=
            `
            You have ${getBalanceFor(userID)} :coin:,
            and you can gamble up to ${Math.floor(getBalanceFor(userID) / 2)} :coin: at once!
            `

            messageEmbed.setDescription(description);
            interaction.reply({embeds: [messageEmbed]});
            break;
        }
        case 'baltop': {
            let arr = [];
            for (let player of Object.keys(economyData)) {
                arr.push({
                    userid: player,
                    balance: economyData[player].balance
                });
            }

            arr.sort((a, b) => {
                return b.balance - a.balance;
            });

            let description = '';

            for (let i = 0; i < Math.min(arr.length, 10); i++) {
                description += `**${i + 1}.** ${getUsernameAndDiscriminatorFromUserID(arr[i].userid)} - ${arr[i].balance} :coin:\n`;
            }

            const messageEmbed = new Discord.MessageEmbed()
            .setColor('#00FFFF')
            .setFooter(embedFooterData)
            .setAuthor(embedAuthorData)
            .setTitle('Balance top')
            .setDescription(description);

            interaction.reply({embeds: [messageEmbed]});
            break;
        }
        case 'rob': {

            if (Date.now() - getLastRobbed(userID) < 300000) {
                const messageEmbed = new Discord.MessageEmbed()
                .setColor('#00FFFF')
                .setFooter(embedFooterData)
                .setAuthor(embedAuthorData)
                .setTitle('Robbery')
                .setDescription(
                `
                You have to wait **${Math.ceil((300000 - (Date.now() - getLastRobbed(userID))) / 1000)}s** before using this command again!
                `);
                interaction.reply({embeds: [messageEmbed]});
                return;
            }

            const crimeExperience = getCrimeExperience(userID);
            let successChance = Math.floor(33 + Math.min(crimeExperience, 33));

            const messageEmbed = new Discord.MessageEmbed()
            .setColor('#00FFFF')
            .setFooter(embedFooterData)
            .setAuthor(embedAuthorData)
            .setTitle('Robbery')

            if (randomInteger(1, 100) <= successChance) {
                let moneyAmount = randomInteger(10, 25);
                moneyAmount += Math.floor((crimeExperience / 5));

                addToBalance(userID, moneyAmount);
                addToCrimeExperience(userID, 1);

                messageEmbed.setDescription(
                    `
                    You successfully robbed someone!
                    You gained ${moneyAmount} :coin:!
    
                    +1 Crime XP (total: ${getCrimeExperience(userID)} XP)
    
                    You'll be able to use this command again in **300s**.`
                );
                interaction.reply({embeds: [messageEmbed]});
            } else {
                const escaped = randomInteger(0, 1) === 0;

                if (escaped) {
                    messageEmbed.setDescription(
                    `
                    You failed to rob someone.
                    Luckily you escaped, so you won't face any consequences.
    
                    You'll be able to use this command again in **300s**.`
                    );
                    interaction.reply({embeds: [messageEmbed]});
                } else {
                    messageEmbed.setDescription(
                    `
                    You failed to rob someone.
                    You got arrested for **600s**.
                    ${hasJob(userID) ? 'Also you got fired from your job.\n' : ''}
                    How depressing!
                    `);
                    interaction.reply({embeds: [messageEmbed]});
                    setArrestedUntil(userID, Date.now() + 600000);
                    setJob(userID, null);
                }
            }
            setLastRobbed(userID, Date.now());
            break;
        }
        case 'lawyer': {
            const user = interaction.options.getUser('user');
            const maxPrice = interaction.options.getInteger('maxprice', false);

            const messageEmbed = new Discord.MessageEmbed()
            .setColor('#00FFFF')
            .setFooter(embedFooterData)
            .setAuthor(embedAuthorData)
            .setTitle('Lawyer')

            if ((user && (!hasEconomyEntry(user.id) || !isArrested(user.id))) || !isArrested(userID)) {
                messageEmbed.setDescription(
                user ?
                `
                This person is not arrested!
                `
                :
                `
                You are not arrested!
                `);
                interaction.reply({embeds: [messageEmbed]});
                return;
            }

            if (maxPrice === 0 || getBalanceFor(userID) === 0) {
                messageEmbed.setDescription(
                `
                    Are you serious?
                    What are you trying to do with these 0 :coin: of yours?
                    Buy a lawyer?
                `);
                interaction.reply({embeds: [messageEmbed]});
                return;
            }

            if (maxPrice < 0) {
                messageEmbed.setDescription(
                `
                    Buying a lawyer costs money.
                    Negative amount of money is no money.
                    It's not like you're gonna get a lawyer for free.
                    You tryna cheat the system by putting the max price as negative.
                    No, you're not gonna get money this way.
                    Why don't you work or something to earn some money?
                    That way you can stop doing stuff like this.
                    I hope you're not going to try to put max price as negative again.
                    Will you?
                    Please don't.
                `);
                interaction.reply({embeds: [messageEmbed]});
                return;
            }

            const arrestedSeconds = Math.ceil((getArrestedUntil(user ? user.id : userID) - Date.now()) / 1000);
            const coinsSpent = Math.min(maxPrice !== null ? maxPrice : Infinity, getBalanceFor(userID), Math.ceil(arrestedSeconds / 10));
            const releasedFromArrest = coinsSpent * 10 >= arrestedSeconds;

            removeFromBalance(userID, coinsSpent);
            setArrestedUntil(user ? user.id : userID, getArrestedUntil(user ? user.id : userID) - (coinsSpent * 10000));

            if (user) {
                if (releasedFromArrest) {
                    messageEmbed.setDescription(
                    `
                        You spent ${coinsSpent} :coin: to buy a lawyer for **${user.username}**.
                        Thanks to you, **${user.username}** was released from arrest **${arrestedSeconds}s** earlier.

                        Your current balance: **${getBalanceFor(userID)} :coin:**
                    `
                    );
                } else {
                    messageEmbed.setDescription(
                    `
                        You spent ${coinsSpent} :coin: to buy a lawyer for **${user.username}**.
                        **${user.username}** will be released from arrest **${coinsSpent * 10}s** earlier.
    
                        Your current balance: **${getBalanceFor(userID)} :coin:**
                    `
                    );
                }
            } else {
                if (releasedFromArrest) {
                    messageEmbed.setDescription(
                    `
                        You spent ${coinsSpent} :coin: to buy a lawyer for yourself.
                        You were released from arrest **${arrestedSeconds}s** earlier.

                        Your current balance: **${getBalanceFor(userID)} :coin:**
                    `
                    );
                } else {
                    messageEmbed.setDescription(
                    `
                        You spent ${coinsSpent} :coin: to buy a lawyer for yourself.
                        You will be released from arrest **${coinsSpent * 10}s** earlier.
    
                        Your current balance: **${getBalanceFor(userID)} :coin:**
                    `
                    );
                }
            }
            interaction.reply({embeds: [messageEmbed]});
            break;
        }
        case 'cooldowns': {
            const messageEmbed = new Discord.MessageEmbed()
            .setColor('#00FFFF')
            .setFooter(embedFooterData)
            .setAuthor(embedAuthorData)
            .setTitle('Cooldowns')

            let description = '';

            const arrestedUntil = getArrestedUntil(userID);

            const lastWorked = getLastWorked(userID);
            const job = getJob(userID);
            const workCooldown = job ? job.cooldown : -1;

            const lastRobbed = getLastRobbed(userID);
            const lastCoinflipped = getLastCoinflipped(userID);
            const lastJobRefresh = getLastJobRefresh(userID);

            if (isArrested(userID)) {
                description += `Arrested for: **${Math.ceil((arrestedUntil - Date.now()) / 1000)}s**\n`;
            }
            if (Date.now() - lastWorked < workCooldown * 1000) {
                description += `Work cooldown: **${Math.ceil((workCooldown * 1000 - (Date.now() - lastWorked)) / 1000)}s**\n`
            }
            if (Date.now() - lastRobbed < 300000) {
                description += `Rob cooldown: **${Math.ceil((300000 - (Date.now() - lastRobbed)) / 1000)}s**\n`;
            }
            if (Date.now() - lastCoinflipped < 300000) {
                description += `Coinflip cooldown: **${Math.ceil((300000 - (Date.now() - lastCoinflipped)) / 1000)}s**\n`;
            }
            if (Date.now() - lastJobRefresh < 600000) {
                description += `Job refresh cooldown: **${Math.ceil((600000 - (Date.now() - lastJobRefresh)) / 1000)}s**`;
            }

            if (description === '') {
                description = 'You don\'t have any cooldowns.';
            }

            messageEmbed.setDescription(description);
            interaction.reply({embeds: [messageEmbed]});
            break;
        }
        case 'shop': {
            interaction.reply('later');
            break;
        }
        case 'time': {
            const messageEmbed = new Discord.MessageEmbed()
            .setColor('#00FFFF')
            .setTitle('Time')
            .setDescription(`The time is: ${getInGameTime().as12hString()}`)

            interaction.reply({embeds: [messageEmbed]});
        }
    }
});

slashCommandsList.push(
    new Builders.SlashCommandBuilder()
    .setName('balance')
    .setDescription('Views your balance')
);

slashCommandsList.push(
    new Builders.SlashCommandBuilder()
    .setName('money')
    .setDescription('Views your balance')
);

slashCommandsList.push(
    new Builders.SlashCommandBuilder()
    .setName('job')
    .setDescription('Views your current job')
);

slashCommandsList.push(
    new Builders.SlashCommandBuilder()
    .setName('jobs')
    .setDescription('Views jobs available to you')
);

slashCommandsList.push(
    new Builders.SlashCommandBuilder()
    .setName('jobapply')
    .setDescription('Applies to a job')
    .addIntegerOption(option => 
        option
        .setName('jobid')
        .setDescription('ID of the job you\'re applying to')
        .setRequired(true)
    )
);

slashCommandsList.push(
    new Builders.SlashCommandBuilder()
    .setName('refreshjobs')
    .setDescription('Refreshes jobs available to you')
);

slashCommandsList.push(
    new Builders.SlashCommandBuilder()
    .setName('work')
    .setDescription('Works if you have a job')
);

slashCommandsList.push(
    new Builders.SlashCommandBuilder()
    .setName('coinflip')
    .setDescription('Gambles up to half of your money')
    .addIntegerOption(option =>
        option
        .setName('money')
        .setDescription('Amount of money you\'re willing to gamble (0 - everything you can)')
        .setRequired(true)
        .setMinValue(0)
    )
);

slashCommandsList.push(
    new Builders.SlashCommandBuilder()
    .setName('baltop')
    .setDescription('Views the richest players')
);

slashCommandsList.push(
    new Builders.SlashCommandBuilder()
    .setName('shop')
    .setDescription('Opens the shop')
);

slashCommandsList.push(
    new Builders.SlashCommandBuilder()
    .setName('rob')
    .setDescription('Robs a stranger')
);

slashCommandsList.push(
    new Builders.SlashCommandBuilder()
    .setName('lawyer')
    .setDescription('Buys a lawyer to release you or another person from arrest (1 coin - 10s)')
    .addUserOption(option =>
        option
        .setName('user')
        .setDescription('User you\'re buying a lawyer for (leave empty if for yourself)')
    )
    .addIntegerOption(option =>
        option
        .setName('maxprice')
        .setDescription('Max amount of coins you\'re willing to spend on a lawyer')
        .setMinValue(0) // this doesn't work
    )
);

slashCommandsList.push(
    new Builders.SlashCommandBuilder()
    .setName('cooldowns')
    .setDescription('Views your cooldowns')
);

slashCommandsList.push(
    new Builders.SlashCommandBuilder()
    .setName('time')
    .setDescription('Views the current in-game time')
);