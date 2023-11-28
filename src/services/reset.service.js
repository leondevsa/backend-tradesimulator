const { 
	UserMdl,
	UserDepositMdl,
	TrackedWalletMdl,
	TrackedTransactionMdl,
	ERC20TokenMdl 
} = require('../models');

const start = async function() {	
	
	await UserMdl.deleteMany({})		
	await UserDepositMdl.deleteMany({})	
	await TrackedWalletMdl.deleteMany({})
	await TrackedTransactionMdl.deleteMany({})
	//await ERC20TokenMdl.deleteMany({})
	    
	console.log('RESET COMPLETED')
}

module.exports = {
	start,	
};