const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');
const converters = require('./plugins/converters');

const userDepositSchema = mongoose.Schema(
  {  
    user: { type: mongoose.SchemaTypes.ObjectId, ref: 'User', required: true, index: true }, 
    chainId: { type: String, index: true, required: true },        
    blockNumber: { type: Number, default: 0, index: true },
    blockTimestamp: { type: Number, default: 0, index: true },
    logIndex: { type: Number, default: 0, index: true },   
            
    from: { type: String, required: true, set: converters.toLowerCase },    
    token: { type: String, required: true, set: converters.toLowerCase },  
    amount: { type: String, required: true, set: converters.toString },  
    depositAmount: { type: String, required: true, set: converters.toString },  

    txHash: { type: String, required: true, index: true },  
    rawEvent: { type: Object, private: true },  
    userBalanceBefore: { type: String, required: true }, 
  },
  {
    timestamps: { createdAt: false, updatedAt: true },
  }
);

// add plugin that converts mongoose to json
userDepositSchema.plugin(toJSON);
userDepositSchema.plugin(paginate);

const UserDeposit = mongoose.model('UserDeposit', userDepositSchema);

module.exports = { UserDeposit, userDepositSchema };
