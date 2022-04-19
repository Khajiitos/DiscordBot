const Discord = require('discord.js');
const Builders = require('@discordjs/builders');
const { client, slashCommandsList } = require('./main');

let games = [];

const embedFooterData = {text: 'TicTacToe bot by Khajiitos#5835', iconURL: 'https://cdn.discordapp.com/avatars/408330424562089984/9a944c01c8b129b05d74b7e4ec72c901.webp'};

function randomInteger(min, max) {
    return min + Math.floor(Math.random() * (max - min));
}

class TicTacToeGame {
    user = null;
    board = [0, 0, 0, 0, 0, 0, 0, 0, 0]; // 0 - empty, 1 - X (user), 2 - O (bot)
    turn = true; // false - bot's turn, true - user's turn
    gameOver = false;
    components = [];
    interaction = null;
    
    turnToString() {
        return this.turn ? `It's ${this.user.username}'s turn!` : 'It\'s the bot\'s turn!';
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
        // TODO: this might not be very secure
        var thisgame = this;

        if (this.turn === false) {
            setTimeout(() => {

                const selection = thisgame.findRandomEmptyField();
                if (selection == -1)
                    return;

                thisgame.board[selection] = 2;
                thisgame.turn = true;
                thisgame.updateMessage();
            }, randomInteger(1500, 2500));
        }

        this.components = [
            new Discord.MessageActionRow().addComponents(
                new Discord.MessageButton()
                .setCustomId('tttbutton0')
                .setLabel('A1')
                .setStyle('SECONDARY'),
                new Discord.MessageButton()
                .setCustomId('tttbutton1')
                .setLabel('A2')
                .setStyle('SECONDARY'),
                new Discord.MessageButton()
                .setCustomId('tttbutton2')
                .setLabel('A3')
                .setStyle('SECONDARY')
            ),
            new Discord.MessageActionRow().addComponents(
                new Discord.MessageButton()
                .setCustomId('tttbutton3')
                .setLabel('B1')
                .setStyle('SECONDARY'),
                new Discord.MessageButton()
                .setCustomId('tttbutton4')
                .setLabel('B2')
                .setStyle('SECONDARY'),
                new Discord.MessageButton()
                .setCustomId('tttbutton5')
                .setLabel('B3')
                .setStyle('SECONDARY')
            ),
            new Discord.MessageActionRow().addComponents(
                new Discord.MessageButton()
                .setCustomId('tttbutton6')
                .setLabel('C1')
                .setStyle('SECONDARY'),
                new Discord.MessageButton()
                .setCustomId('tttbutton7')
                .setLabel('C2')
                .setStyle('SECONDARY'),
                new Discord.MessageButton()
                .setCustomId('tttbutton8')
                .setLabel('C3')
                .setStyle('SECONDARY')
            )
        ];

        this.updateMessage();
    }

    findRandomEmptyField() {
        let fields = [];
        for (let i = 0; i < 9; i++){
            if (this.board[i] == 0)
                fields.push(i);
        }

        if (fields.length === 0)
            return -1;
        
        return fields[randomInteger(0, fields.length - 1)];
    }

    updateMessage() {

        const winnercheck = this.winnerCheck();

        if (winnercheck !== 0)
            this.gameOver = true;

        const embedAuthorData = {name: this.user.username, iconURL: this.user.avatarURL()};

        if (this.gameOver) {
            switch(winnercheck) {
                case 1: {
                    const messageEmbed = new Discord.MessageEmbed()
                    .setTitle('Tic Tac Toe')
                    .setDescription(`The game is over.\n**Winner**: *${this.user.username}*`)
                    .setColor('BLUE')
                    .setAuthor(embedAuthorData)
                    .setFooter(embedFooterData);
        
                    this.interaction.editReply({embeds: [messageEmbed], components: []});
                    break;
                }
                case 2: {
                    const messageEmbed = new Discord.MessageEmbed()
                    .setTitle('Tic Tac Toe')
                    .setDescription('The game is over.\n**Winner**: *BOT*')
                    .setColor('YELLOW')
                    .setAuthor(embedAuthorData)
                    .setFooter(embedFooterData);
        
                    this.interaction.editReply({embeds: [messageEmbed], components: []});
                    break;
                }
                case 3: {
                    const messageEmbed = new Discord.MessageEmbed()
                    .setTitle('Tic Tac Toe')
                    .setDescription('The game is over.\nIt\'s a draw!')
                    .setColor('RED')
                    .setAuthor(embedAuthorData)
                    .setFooter(embedFooterData);
        
                    this.interaction.editReply({embeds: [messageEmbed], components: []});
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

            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 3; j++) {
                    this.components[i].components[j].setDisabled(this.board[i * 3 + j] !== 0);
                }
            }

            this.interaction.editReply({embeds: [messageEmbed], components: this.components});
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

client.on('interactionCreate', interaction => {
    if (interaction.isCommand()) {

        switch(interaction.commandName) {
            case 'tictactoe_start': {
                if (games[interaction.user] != undefined) {
                    interaction.reply("You are already in a game!");
                    return;
                }
                let game = new TicTacToeGame();
                game.user = interaction.user;
                game.interaction = interaction;

                interaction.reply('Started a TicTacToe game!').then(() => {
                    game.createMessage();
                });

                games[interaction.user] = game;
                break;
            }
            case 'tictactoe_check': {
                interaction.reply(games[interaction.user] ? "You are in a tictactoe game." : "You aren't in a tictactoe game.");
                break;
            }
            case 'tictactoe_quit': {
                if (!games[interaction.user]) {
                    interaction.reply("You aren't in a game!");
                    return;
                }
                interaction.reply("lMaO u CaN't EvEn WiN wItH a StUpId BoT iN tIcTaCtOe So U lEaVe SmH").then(() => {
                    interaction.deleteReply();
                });
                games[interaction.user] = undefined;
                break;
            }
        }
    } else if (interaction.isButton()) {
        if (!interaction.customId.startsWith('tttbutton')) return;
        if (!games[interaction.user]) return;
        if (games[interaction.user].gameOver) return;

        // This prevents "This interaction failed" warnings
        interaction.deferUpdate();

        if (games[interaction.user].turn === false) return;

        const fieldNumber = interaction.customId.substring(9);

        if (typeof games[interaction.user].board[fieldNumber] !== 'undefined') {

            if (games[interaction.user].board[fieldNumber] !== 0)
                return;

            games[interaction.user].board[fieldNumber] = 1;
            games[interaction.user].turn = false;
            games[interaction.user].updateMessage();

            if (games[interaction.user] && !games[interaction.user].gameOver) {
                setTimeout(() => {

                    const selection = games[interaction.user].findRandomEmptyField();
                    if (selection === -1)
                        return;

                    games[interaction.user].board[selection] = 2;
                    games[interaction.user].turn = true;
                    games[interaction.user].updateMessage();
                }, randomInteger(1500, 2500));
            }
        } else {
            console.log(`Invalid field from string: "${interaction.customId}", "${fieldNumber}"`);
        }
    }
});

slashCommandsList.push(
    new Builders.SlashCommandBuilder()
    .setName('tictactoe_start')
    .setDescription('Starts a new TicTacToe game')
);

slashCommandsList.push(
    new Builders.SlashCommandBuilder()
    .setName('tictactoe_check')
    .setDescription('Checks if you\'re in a TicTacToe game')
);

slashCommandsList.push(
    new Builders.SlashCommandBuilder()
    .setName('tictactoe_quit')
    .setDescription('Quits your current TicTacToe game')
);