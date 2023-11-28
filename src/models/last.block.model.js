const mongoose = require("mongoose");

const lastBlockSchema = mongoose.Schema(
	{
		chainId: { type: String, required: true },
        blockNumber: { type: Number, required: true },	
		name: { type: String, required: true },
	},
	{
		timestamps: true,
	}
);

const LastBlock = mongoose.model("LastBlock", lastBlockSchema);

module.exports = { LastBlock, lastBlockSchema };
