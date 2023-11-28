const mongoose = require("mongoose");
const converters = require('./plugins/converters');

const trackedWalletSchema = mongoose.Schema(
	{
		user: { type: mongoose.SchemaTypes.ObjectId, ref: 'User', required: true, index: true },
        address: { type: String, required: true, index: true, set: converters.toLowerCase },		
		name: { type: String },
        enabled: { type: Boolean, default: true },
	},
	{
		timestamps: true,	
        //includeUpdatedAt: true,
		//includeCreatedAt: true,	
	}
);

const TrackedWallet = mongoose.model("TrackedWallet", trackedWalletSchema);
module.exports = { TrackedWallet, trackedWalletSchema };