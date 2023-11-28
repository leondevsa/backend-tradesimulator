const config = require('../config/config');
const web3 = require('../utils/web3');
const { tmBot } = require('../bot');
const { utils, BigNumber, ethers } = require('ethers');
const { UserMdl, UserDepositMdl, LastBlockMdl } = require('../models');

const start = async function(delay = 10000) {	
	const eventEmitter = web3.contract('depositor')
	
	const blocksBehind = 20
	const pastBlocksDelay = 300
	const currentBlocksDelay = delay
		
	const chainId = config.chainId
	console.log(`EVENTS SCAN STARTED chainId: ${chainId}`)
	const step = 1000		
    				
	setTimeout(async function tick() {
        try {			
			const currentBlock = await web3.rpc.getBlockNumber()	
								
			let lastBlock = await LastBlockMdl.findOne({ chainId, name: 'deposits' })
			
			if (!lastBlock) lastBlock = await LastBlockMdl.create({ blockNumber: eventEmitter.startBlock, chainId, name: 'deposits' })		
							
			if (lastBlock.blockNumber < currentBlock) {		
				console.log(lastBlock.blockNumber)			
				let fromBlock = lastBlock.blockNumber - blocksBehind
				let toBlock = lastBlock.blockNumber + step - 1			
				if (toBlock > currentBlock) {
					toBlock = currentBlock
					delay = currentBlocksDelay					
				} else {
					delay = pastBlocksDelay
				}
				
				const rawEventsUnsorted = await eventEmitter.instance.queryFilter(eventEmitter.instance.filters.Deposit(), fromBlock, toBlock)	
				const rawEvents = rawEventsUnsorted.sort(function (a, b) { return parseInt(a.blockNumber) - parseInt(b.blockNumber) || parseInt(a.logIndex) - parseInt(b.logIndex) });			
				
				console.log(`SCAN from: ${fromBlock} to: ${toBlock} current: ${currentBlock} left: ${currentBlock - toBlock} events: ${rawEvents.length}`)
				
				for (let ei = 0; ei < rawEvents.length; ei++) {
					const rawEvent = rawEvents[ei];

					// event Deposit(address wallet, address token, uint256 amount, uint256 depositAmount, address from, uint256 timestamp)					
					const user = await UserMdl.findOne({ wallet: rawEvent.args.wallet.toLowerCase()})
					const newDeposit = {
						user,
						chainId,
						blockNumber: rawEvent.blockNumber,
						blockTimestamp: rawEvent.args.timestamp,	
						logIndex: rawEvent.logIndex,	
						from: rawEvent.args.from,
						token: rawEvent.args.token,
						amount: rawEvent.args.amount,
						depositAmount: rawEvent.args.depositAmount,
						txHash: rawEvent.transactionHash,
						rawEvent,	
						userBalanceBefore: user.balance,					
					}

					const isDepositAdded = await UserDepositMdl.findOne({ chainId, txHash: newDeposit.txHash })					
					if (isDepositAdded) continue

					console.log(`DEPOSIT from: ${newDeposit.from} to: ${newDeposit.user.walletAddress} amount: ${newDeposit.depositAmount}`)

					await UserDepositMdl.create(newDeposit)		
					user.balance = BigNumber.from(user.balance).add(rawEvent.args.depositAmount)	
					await user.save()	

					
					await tmBot.api.sendMessage(
						user.tmId,
						`<b>You received ${utils.formatEther(rawEvent.args.depositAmount)} ETH for simulation trading</b>`,
						{ parse_mode: "HTML" },
					);
				}
									
				lastBlock.blockNumber = toBlock
				await lastBlock.save()
				console.log('SCAN COMPLETED')
			}
			
        } catch (error) {
            console.log('EVENTS LISTENER ERROR', error)			
        }
      	setTimeout(tick, delay);             
    }, 1000)
}

module.exports = {
	start,
};