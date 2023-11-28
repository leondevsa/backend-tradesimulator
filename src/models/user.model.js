const mongoose = require("mongoose");
const { toJSON, paginate } = require('./plugins');
const converters = require('./plugins/converters');

const userSchema = mongoose.Schema(
	{
		tmId: { type: String, index: true, unique: true, required: true },	        
		walletAddress: { type: String, index: true, unique: true, required: true, set: converters.toLowerCase },
		walletMnemonic: { type: String, private: true },
		balance: { type: String, default: '0', set: converters.toString },
		name: { type: String },
    },
	{
		timestamps: true,	
        includeUpdatedAt: true,
		//includeCreatedAt: true,	
	}
);
userSchema.plugin(toJSON);
const User = mongoose.model("User", userSchema);
module.exports = { User, userSchema };