const Discord = require('discord.js');
const client = require('./main');

let games = [];

const reactions = ['1⃣', '2⃣', '3⃣', '4⃣', '5⃣', '6⃣', '7⃣', '8⃣', '9⃣'];
const embedFooterData = {text: 'TicTacToe bot by Khajiitos#5835', iconURL: 'https://cdn.discordapp.com/avatars/408330424562089984/9a944c01c8b129b05d74b7e4ec72c901.webp'};

function randomInteger(min, max) {
    return min + Math.floor(Math.random() * (max - min));
}

class TicTacToeGame {
    user = null;
    board = [0, 0, 0, 0, 0, 0, 0, 0, 0]; // 0 - empty, 1 - X (user), 2 - O (bot)
    turn = true; // false - bot's turn, true - user's turn
    message = null;
    channel = null;
    gameOver = false;
    
    turnToString() {
        return this.turn ? `It's ${this.user.username}'s turn!` : 'It\'s the bot\'s turn!';
    }

    onReaction(reaction) {

        if (this.turn == false)
            return;

        if (this.gameOver)
            return;

        for (let i = 0; i < reactions.length; i++) {
            if (reaction == reactions[i]) {

                if (this.board[i] != 0)
                    return;

                this.board[i] = 1;
                this.turn = false;
                this.updateMessage();
                if (!this.gameOver) {
                    // TODO: this might not be very secure
                    var thisgame = this;
                    setTimeout(function() {

                        let selection = thisgame.findRandomEmptyField();
                        if (selection == -1)
                            return;

                        thisgame.board[selection] = 2;
                        thisgame.turn = true;
                        thisgame.updateMessage();
                    }, randomInteger(1500, 2500));
                    break;
                }
            }
        }
    }

    getColor() {
        return this.turn ? 'BLUE' : 'YELLOW';
    }

    // ⭕ ❌ ➖
    characterAtField(field) {
        switch(this.board[field]) {
            case 0: return '➖';
            case 1: return '❌';
            case 2: return '⭕';
            default: return '➖';
        }
    }

    boardString() {
        return `\n\n${this.characterAtField(0)} ${this.characterAtField(1)} ${this.characterAtField(2)}\n
        ${this.characterAtField(3)} ${this.characterAtField(4)} ${this.characterAtField(5)}\n
        ${this.characterAtField(6)} ${this.characterAtField(7)} ${this.characterAtField(8)}\n`;
    }

    createMessage() {
        if (this.channel instanceof Discord.Channel && this.user instanceof Discord.User && this.message instanceof Discord.Message) {
            // TODO: this might not be very secure
            var thisgame = this;

            if (this.turn == false) {
                setTimeout(function() {

                    let selection = thisgame.findRandomEmptyField();
                    if (selection == -1)
                        return;

                    thisgame.board[selection] = 2;
                    thisgame.turn = true;
                    thisgame.updateMessage();
                }, randomInteger(1500, 2500));
            }

            this.updateMessage();

            for (let i = 0; i < reactions.length; i++){
                this.message.react(reactions[i]).catch(error => {
                    console.log(error);
                    console.log('Failed to react to a message, game cancelled.');
                    games[this.user] = undefined;
                    return;
                });
            }
        } else {
            console.log('uninitialized variables');
        }
    }

    findRandomEmptyField() {
        let fields = [];
        for (let i = 0; i < 9; i++){
            if (this.board[i] == 0)
                fields.push(i);
        }
        let len = fields.length;

        if (len == 0)
            return -1;
        
        return fields[randomInteger(0, len - 1)];
    }

    updateMessage() {
        if (this.message == null)
            return console.log("this.message was null");

        if (this.message instanceof Discord.Message){

            let winnercheck = this.winnerCheck();

            if (winnercheck != 0)
                this.gameOver = true;

            let embedAuthorData = {name: this.user.username, iconURL: this.user.avatarURL()};

            if (this.gameOver) {
                switch(winnercheck){
                    case 1: {
                        const messageEmbed = new Discord.MessageEmbed()
                        .setTitle('Tic Tac Toe')
                        .setDescription(`The game is over.\n**Winner**: *${this.user.username}*`)
                        .setColor('BLUE')
                        .setAuthor(embedAuthorData)
                        .setFooter(embedFooterData);
            
                        this.message.edit({embeds: [messageEmbed]});
                        break;
                    }
                    case 2: {
                        const messageEmbed = new Discord.MessageEmbed()
                        .setTitle('Tic Tac Toe')
                        .setDescription('The game is over.\n**Winner**: *BOT*')
                        .setColor('YELLOW')
                        .setAuthor(embedAuthorData)
                        .setFooter(embedFooterData);
            
                        this.message.edit({embeds: [messageEmbed]});
                        break;
                    }
                    case 3: {
                        const messageEmbed = new Discord.MessageEmbed()
                        .setTitle('Tic Tac Toe')
                        .setDescription('The game is over.\nIt\'s a draw!')
                        .setColor('RED')
                        .setAuthor(embedAuthorData)
                        .setFooter(embedFooterData);
            
                        this.message.edit({embeds: [messageEmbed]});
                        break;
                    }
                }
                games[this.user] = undefined;
            } else {
                const messageEmbed = new Discord.MessageEmbed()
                .setTitle('Tic Tac Toe')
                .setDescription(`${this.boardString()}\nPlaying as ❌\n${this.turnToString()}\n`)
                .setColor(this.getColor())
                .setAuthor(embedAuthorData)
                .setFooter(embedFooterData);
    
                this.message.edit({embeds: [messageEmbed]});
            }
        } else {
            console.log('TicTacToeGame.message is not an instance of Discord.Message');
        }
    }

    winnerCheck() {
        // 0 - no winner yet
        // 1 - player won
        // 2 - bot won
        // 3 - game is over and it's a draw

        if (this.board[0] != 0 && this.board[0] == this.board[1] && this.board[1] == this.board[2])
			return this.board[0];
	
		if (this.board[3] != 0 && this.board[3] == this.board[4] && this.board[4] == this.board[5]) 
			return this.board[3];
		
		if (this.board[6] != 0 && this.board[6] == this.board[7] && this.board[7] == this.board[8]) 
			return this.board[6];
		
		if (this.board[0] != 0 && this.board[0] == this.board[3] && this.board[3] == this.board[6]) 
			return this.board[0];
		
		if (this.board[1] != 0 && this.board[1] == this.board[4] && this.board[4] == this.board[7]) 
			return this.board[1];
		
		if (this.board[2] != 0 && this.board[2] == this.board[5] && this.board[5] == this.board[8]) 
			return this.board[2];
		
		if (this.board[0] != 0 && this.board[0] == this.board[4] && this.board[4] == this.board[8]) 
			return this.board[0];
		
		if (this.board[2] != 0 && this.board[2] == this.board[4] && this.board[4] == this.board[6]) 
			return this.board[2];
		
		if (this.board[0] != 0 && this.board[1] != 0 && this.board[2] != 0
			&& this.board[3] != 0 && this.board[4] != 0 && this.board[5] != 0
			&& this.board[6] != 0 && this.board[7] != 0 && this.board[8] != 0) {
			return 3;
		}

        return 0;
    }
}

client.on('messageCreate', (message) => {

    let dividedMessage = message.content.toLowerCase().split(' ');

    if (message.author.bot || dividedMessage.length === 0) {
        return;
    }

    if (dividedMessage[0] !== '!tictactoe' && dividedMessage[0] !== '!ttt') {
        return;
    }

    if (dividedMessage.length === 1 || dividedMessage[1] === 'help') {
        let embedAuthorData = {name: message.author.username, iconURL: message.author.avatarURL()};

        const messageEmbed = new Discord.MessageEmbed()
        .setColor('#00FFFF')
        .setTitle('TicTacToe - Help')
        .setFooter(embedFooterData)
        .setAuthor(embedAuthorData)
        .setDescription(
            `
            **!tictactoe help** - shows this page
            **!tictactoe start** - starts a new Tic Tac Toe game
            **!tictactoe check** - checks if you're in a Tic Tac Toe game
            **!tictactoe quit** - quits your current TicTacToe game
            **!tictactoe update** - updates the board if any issues have occured
            `);
        message.channel.send({embeds: [messageEmbed]});
        return;
    }

    switch(dividedMessage[1]) {
        case 'start':
            if (games[message.author] != undefined) {
                message.reply("You are already in a game!");
                return;
            }
            let game = new TicTacToeGame();
            game.channel = message.channel;
            game.user = message.author;
            message.reply('started a TicTacToe game!').then(message => {
                game.message = message;
                game.createMessage();
            });
            games[message.author] = game;
            break;
        case 'check':
            message.reply(games[message.author] ? "You are in a tictactoe game." : "You aren't in a tictactoe game.");
            break;
        case 'quit':
            if (!games[message.author]) {
                message.reply("You aren't in a game!");
                return;
            }
            message.reply("lMaO u CaN't EvEn WiN wItH a StUpId BoT iN tIcTaCtOe So U lEaVe SmH");
            if (games[message.author].message instanceof Discord.Message) {
                games[message.author].message.edit(content="This game has ended!");
            }
            games[message.author] = undefined;
            break;
        case 'update':
            if (games[message.author] != undefined) {
                games[message.author].updateMessage();
            } else {
                message.reply('You don\'t seem to be in a Tic Tac Toe game.');
            }
            break;
        default:
            message.reply('I don\'t recognize this subcommand. Try using **!tictactoe help** for a list of commands.');
    }
});

client.on('messageReactionAdd', (reaction, user) => {

    if (reaction.message.author != client.user)
        return;

    if (user == client.user)
        return;

    if (games[user] != undefined && reaction.message == games[user].message) {
        for (let i = 0; i < reactions.length; i++) {
            if (reaction.emoji.toString() == reactions[i]) {
                games[user].onReaction(reaction.emoji.toString());
                break;
            }
        }
    }
    reaction.users.remove(user);
});

client.on('messageDelete', message => {

    if (message.author != client.user)
        return;

    for (const [user, game] of Object.entries(games)) {
        
        if (game == null || game == undefined)
            continue;

        if (game.message == message) {
            games[user] = undefined;
            console.log('A game was deleted because the message was removed.');
        }
    }
});