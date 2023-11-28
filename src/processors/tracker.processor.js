const mongoose = require("mongoose");
const config = require('../config/config');
const logger = require("../config/logger");
const { TrackedWalletMdl, TrackedTransactionMdl } = require('../models');
const dayjs = require('dayjs');
const { EvmBatchProcessor } = require('@subsquid/evm-processor');
const { lookupArchive }  = require('@subsquid/archive-registry')
const { Database, LocalDest }  = require('@subsquid/file-store')
const { Table }  = require('@subsquid/file-store-json')
const { createPublicClient, http } = require('viem')
const { mainnet } = require('viem/chains')

const chain = mainnet
const publicClient = createPublicClient({
	chain,
	transport: http()
})

mongoose.set("strictQuery", true);
mongoose.connect(config.mongoose.url, config.mongoose.options).then(async () => {
	logger.info("Processor connected to MongoDB");
	//return		
	const currentBlockNum = await publicClient.getBlockNumber()

	const processor = new EvmBatchProcessor()
	.setBlockRange({
		from: currentBlockNum.toString(),
		//from: 18417940,
		//to: 18417940,
	})
	.setDataSource({
		//archive: lookupArchive(chain.id == 1 ? 'eth-mainnet' : 'eth-goerli'),
		chain: chain.rpcUrls.default.http[0]
	})
	.setFinalityConfirmation(config.blocksToConfirm)
	.addTransaction({
		//traces: true,		
		//logs: false
		//from: addresses,
		//to: addresses
	})		
	.addLog({
		//topic0: [
		//  // topic0: 'Transfer(address,address,uint256)'
		//  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
		//],
		transaction: true	
	})
	//.addTrace({
	//	type: ['call'],
    //	transaction: true,		
	//})
	.setFields({
		log: {
			topics: true,
			data: true
		},
		transaction: {
			from: true,
			value: true,
			hash: true
		},
		trace: {
			callFrom: true,
			callTo: true,
			callValue: true,
			callInput: true,
		}		
	})			

	const dbOptions = {
		tables: {
			TransfersTable: new Table('txs.json', { lines: true })
		},
		dest: new LocalDest('./localData'),
		chunkSizeMb: 10,
		syncIntervalBlocks: undefined
	}

	function getTx(blockData, txId, wallet) {
		const tx = blockData.transactions.find(t => t.id === txId)
		
		const logs = blockData.logs
		.filter(l => l.block.id === blockData.header.id && l.transactionIndex === tx.transactionIndex)
		.map(l => {
			const log = { ...l }
			delete log.block
			delete log.transaction
			return log
		})

		const traces = blockData.traces
		.filter(t => t.block.id === blockData.header.id && t.transactionIndex === tx.transactionIndex)
		.map(t => {
			const trace = { ...t }
			delete trace.block
			delete trace.transaction
			return trace
		})
		
		return {
			wallet,
			tx,
			block: blockData.header,
			logs,
			traces
		}  
	} 
	
	processor.run(new Database(dbOptions), async (ctx) => {
		try {
			const wallets = await TrackedWalletMdl.find({ enabled: true })
			const match = {}

			for (let wallet of wallets) {				
				if (!match[wallet.id]) match[wallet.id] = { wallet, transactions: {} }	
				const address = wallet.address.replace('0x', '').toLowerCase()
				
			
				for (let blockData of ctx.blocks) {
					// tx
					for (let txData of blockData.transactions) {
						if (!match[wallet.id].transactions[txData.id]) {
							if (txData.from?.includes(address) || txData.to?.includes(address) || txData.input?.includes(address)) {
								console.log('match tx', address, wallet.id)
								match[wallet.id].transactions[txData.id] = getTx(blockData, txData.id, wallet)
							}							
						}
					}
					// log
					for (let logData of blockData.logs) {
						if (!match[wallet.id].transactions[logData.transaction.id]) {
							if (logData.data.includes(address) || logData.topics.find(t => t.includes(address))) {
								console.log('match log', address, wallet.id)
								match[wallet.id].transactions[logData.transaction.id] = getTx(blockData, logData.transaction.id, wallet)
							}
						}
					}
					// trace
					for (let traceData of blockData.traces) {
						if (!match[wallet.id].transactions[traceData.transaction.id]) {
							if (traceData.action.from?.includes(address) || traceData.action.to?.includes(address) || traceData.action.input.includes(address)) {
								console.log('match trace', address, wallet.id)
								match[wallet.id].transactions[traceData.transaction.id] = getTx(blockData, traceData.transaction.id, wallet)
							}							
						}
					}
				}			
			}
			
			const walletIds = Object.keys(match)
			for (let walletId of walletIds) {
				const record = match[walletId]				
				const txIds = Object.keys(record.transactions)
				for (let txId of txIds) {
					const transaction = record.transactions[txId];
					await TrackedTransactionMdl.updateOne(
						{ wallet: record.wallet, sqId: txId, chainId: chain.id },
						{ $set: { 
							wallet: record.wallet, 
							chainId: chain.id,
							sqId: transaction.tx.id, 
							tx: transaction.tx,
							logs: transaction.logs,
							traces: transaction.traces,
							//block: transaction.block						
						}},
						{ upsert: true }
					)
				}	
			}
		} catch (error) {
			console.log('ERROR', error)
		}		
	});
	logger.info("Processor started");
});