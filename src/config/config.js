const dotenv = require("dotenv");
const path = require("path");
const Joi = require("joi");
const bcConfig = require('../../../bcConfig.json');

process.env.NODE_ENV === "production"
	? dotenv.config({ path: path.join(__dirname, "../../.env") })
	: dotenv.config({ path: path.join(__dirname, "../../.env.dev") });

const envVarsSchema = Joi.object()
	.keys({		
		NODE_ENV: Joi.string().valid("production", "development", "test").required(),
		PORT: Joi.number().default(3000),
		APP_URL: Joi.string().required().description("App url"),
		CHAIN_ID: Joi.string().required().description("Chain ID"),
		SIGNER_WALLET_PK: Joi.string().required().description("Service wallet PK"),
		MONGODB_URL: Joi.string().required().description("Mongo DB url"),	
		RPC_URL: Joi.string().required().description("Node rpc url"),				
			
		BLOCKS_TO_CONFIRM: Joi.string().required().description("Blocks to confirm"),	
		TM_TOKEN: Joi.string().required().description("Telegram token"),
		TM_DEVELOPER_ID: Joi.string()
	})
	.unknown();

const { value: envVars, error } = envVarsSchema
	.prefs({ errors: { label: "key" } })
	.validate(process.env);

if (error) {
	throw new Error(`Config validation error: ${error.message}`);
}

module.exports = {
	isProd: process.env.NODE_ENV === "production", 
	env: envVars.NODE_ENV,	
	port: envVars.PORT,
	appUrl: envVars.APP_URL,
	rpcUrl: envVars.RPC_URL,
	chainId: envVars.CHAIN_ID,	
	signerWalletPk: envVars.SIGNER_WALLET_PK,
	tmDevId: envVars.TM_DEVELOPER_ID,
	tmToken: envVars.TM_TOKEN,
	bc: bcConfig[envVars.CHAIN_ID],
	
	blocksToConfirm: envVars.BLOCKS_TO_CONFIRM, 
	mongoose: {
		url: envVars.MONGODB_URL + (envVars.NODE_ENV === "test" ? "-test" : ""),
		options: {
			useNewUrlParser: true,
			useUnifiedTopology: true,
		},
	},	
};
