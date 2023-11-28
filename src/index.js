const mongoose = require("mongoose");
const app = require("./app");
const config = require("./config/config");
const logger = require("./config/logger");
const { ResetSrv, DepositIndexerSrv, TrackedWalletSrv } = require("./services");
const TmBot = require("./bot");

let server;
mongoose.set("strictQuery", true);
mongoose.connect(config.mongoose.url, config.mongoose.options).then(() => {
	logger.info("Connected to MongoDB");
		
	server = app.listen(config.port, async () => {
		logger.info(`Listening to port ${config.port}`);

		//await ResetSrv.start()
		
		TmBot.start();
		TrackedWalletSrv.start()
		DepositIndexerSrv.start(10000);
	});	
});

const exitHandler = () => {
	if (server) {
		server.close(() => {
			logger.info("Server closed !");
			process.exit(1);
		});
	} else {
		process.exit(1);
	}
};

const unexpectedErrorHandler = (error) => {
	logger.error(error);
	exitHandler();
};

process.on("uncaughtException", unexpectedErrorHandler);
process.on("unhandledRejection", unexpectedErrorHandler);

process.on("SIGTERM", () => {
	logger.info("SIGTERM received");
	if (server) {
		server.close();
	}
});
