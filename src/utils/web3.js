const config = require('../config/config');
const { ethers } = require('ethers');

const rpc = new ethers.providers.JsonRpcProvider({ url: config.rpcUrl, timeout: 10000 }, 'any')
const signer = new ethers.Wallet(config.signerWalletPk).connect(rpc);	

const contract = function (name, address) {
	if (config.bc[name]) {
		return {
			instance: new ethers.Contract(address ? address : config.bc[name].address, config.bc[name].abi, rpc),
			...config.bc[name]
		};
	}
	return null;
};

const blockTimestamp = async function() {
	const blockNum = await rpc.getBlockNumber();
	const block = await rpc.getBlock(blockNum);
	return block.timestamp;
}

const txHashShort = (txHash) => {
	if (txHash) return txHash.replace(txHash.substring(8, 60), '.....');
	return '.....';
}

const addressShort = (tokenAddress) => {
	if (tokenAddress) return tokenAddress.replace(tokenAddress.substring(6, 38), "...")
	return '...'      
}


module.exports = {
	rpc,
	signer,
	contract,	
	blockTimestamp,	
	txHashShort,
	addressShort
};
