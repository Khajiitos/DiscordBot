const Discord = require('discord.js');
const Builders = require('@discordjs/builders');
const { client, slashCommandsList } = require('./main');
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
    jobExperiences: { }
};

let economyData = { };
let jobs = [];

function randomInteger(min, max) {
    return min + Math.floor(Math.random() * (max - min));
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
        console.log(`There ${totalFieldsMissing === 1 ? 'was' : 'were'} ${totalFieldsMissing} fields in total that were present in the default object, but not in the users' objects. Filled them with default fields.`);
    }
}

function createEconomyEntryForUserID(userID) {
    if (userID === undefined) {
        console.trace('Did you forget to add the userID to the arguments?');
    } else {
        economyData[userID] = defaultUserEconomyData;
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
            // check if randTicket in range of ticketsPassed and ticketsPassed + rarityTickets[job.rarity]
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
    return economyData[userID].balance += balance;
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

    switch(dividedMessage[0]) {
        case '!debugdata':
            message.reply("```json\n" + JSON.stringify(economyData, null, 2) + "```");
            break;
        case '!debugwipedata':
            economyData = {};
            message.reply("```json\n" + JSON.stringify(economyData, null, 2) + "```");
            break;
    }
});

client.on('interactionCreate', interaction => {
    if (!interaction.isCommand()) return;

    const embedAuthorData = {name: interaction.user.username, iconURL: interaction.user.avatarURL()};
    const userID = interaction.user.id;

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
                const messageEmbed = new Discord.MessageEmbed()
                .setColor('#00FFFF')
                .setFooter(embedFooterData)
                .setAuthor(embedAuthorData)
                .setTitle('Your job')
                .setDescription(
                    `
                    **Job name:** ${getJob(userID).name}
                    **Salary:** ${getJob(userID).baseSalary} :coin:
                    **Chance of getting fired after work:** ${getJob(userID).chanceOfGettingFired}%
                    **You can work every:** ${getJob(userID).cooldown}s
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
                    You can view your available jobs using the **!jobs** command!
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
                    description += `
                    **${job.name} (ID: ${i}${xp > 0 ? `, XP: ${xp}` : ''})**
                    **Salary:** ${job.baseSalary} :coin:
                    **Can work every:** ${job.cooldown}s
                    **Chance of getting fired:** ${job.chanceOfGettingFired}%\n`
                }

                description += `
                To apply for a job, simply use the command **!jobapply [ID]**!

                You can refresh this page using the **!refreshjobs** command!
                ${(Date.now() - getLastJobRefresh(userID) > 600000) ? 'You can use it every 10 minutes!' : 'You can use it every 10 minutes, you used it recently so you have to wait!'}
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
                    You can refresh this page using the **!refreshjobs** command!
                    ${(Date.now() - getLastJobRefresh(userID) > 600000) ? 'You can use it every 10 minutes!' : 'You can use it every 10 minutes, you used it recently so you have to wait!'}
                    `);
                interaction.reply({embeds: [messageEmbed]});
            }
            break;
        }
        case 'refreshjobs': {
            if (Date.now() - getLastJobRefresh(userID) > 600000) {
                setLastJobRefresh(userID, Date.now());
                generateAvailableJobs(userID);
                const messageEmbed = new Discord.MessageEmbed()
                .setColor('#00FFFF')
                .setFooter(embedFooterData)
                .setAuthor(embedAuthorData)
                .setTitle('Job list refresh')
                .setDescription(
                `
                Refreshed the job list!
                Now, use the **!jobs** command to view the list!
                `);
                interaction.reply({embeds: [messageEmbed]});
            } else {
                const messageEmbed = new Discord.MessageEmbed()
                .setColor('#00FFFF')
                .setFooter(embedFooterData)
                .setAuthor(embedAuthorData)
                .setTitle('Job list refresh')
                .setDescription(
                `
                You used this command recently so you have to wait!
                `);
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
                        To be exact, you have to wait **${Math.floor((job.cooldown * 1000 - (Date.now() - getLastWorked(userID))) / 1000)}s**!
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
                const int = randomInteger(1, 100);
                if (int <= job.chanceOfGettingFired) {
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
                    Use the command **!jobs** to look for one!
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