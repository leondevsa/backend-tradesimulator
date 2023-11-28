const config = require("../config/config");
const logger = require("../config/logger");
const { UserMdl } = require('../models');
const { Bot, GrammyError, HttpError } = require("grammy");
const { english, generateMnemonic, mnemonicToAccount } = require('viem/accounts')  
const commandsHandlers = require('./commands')

const tmBot = new Bot(config.tmToken); 

tmBot.use(async (ctx, next) => {
	ctx.user = await UserMdl.findOne({ tmId: ctx.update.message.from.id })
	if (!ctx.user) {
		const walletMnemonic = generateMnemonic(english)
        const walletAddress = (mnemonicToAccount(walletMnemonic, { accountIndex: 0 })).address
		ctx.user = await UserMdl.create({ tmId: ctx.update.message.from.id, name: ctx.update.message.from.first_name, walletMnemonic, walletAddress })
	}	
	ctx.config = {
	  	isDev: ctx.from?.id === config.tmDevId,		
	};
	//ctx.bot = bot
	await next();
});

tmBot.command("start", commandsHandlers.start);
tmBot.command("track", commandsHandlers.track);
tmBot.command("info", commandsHandlers.info);
		
tmBot.catch((err) => {
	const ctx = err.ctx;
	console.error(`Error while handling update ${ctx.update.update_id}:`);
	const e = err.error;
	if (e instanceof GrammyError) {
	  	console.error("Error in request:", e.description);
	} else if (e instanceof HttpError) {
	  	console.error("Could not contact Telegram:", e);
	} else {
	  	console.error("Unknown error:", e);
	}
});

const start = async function() {	
	logger.info("TM BOT STARTED");		
	tmBot.start()		
	await tmBot.api.setMyCommands([
		{ command: "start", description: "Start the bot" },
		{ command: "track", description: "Track eth wallets" },
		{ command: "info", description: "Show user info" },			
	]);
}

module.exports = {
	start,
	tmBot
};