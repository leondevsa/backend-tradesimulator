const mongoose = require("mongoose");
const converters = require('./plugins/converters');

const erc20tokenSchema = mongoose.Schema(
	{
		address: { type: String, required: true, index: true, set: converters.toLowerCase },
        chainId: { type: String, required: true, index: true },        
        symbol: { type: String, default: 'UNDEFINED' },
        decimals: { type: Number, default: 0 },
		name: { type: String },
	},
	{
		timestamps: true,	
        //includeUpdatedAt: true,
		//includeCreatedAt: true,	
	}
);

const ERC20Token = mongoose.model("ERC20Token", erc20tokenSchema);
module.exports = { ERC20Token, erc20tokenSchema };