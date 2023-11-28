const config = require("../config/config");
const logger = require("../config/logger");
const { TrackedTransactionMdl, ERC20TokenMdl } = require('../models');
const dayjs = require('dayjs');
const { txHashShort, addressShort } = require('../utils/web3')
const { tmBot } = require('../bot')
const { utils, BigNumber, ethers } = require('ethers');
const { createPublicClient, http, decodeEventLog, getEventSelector, formatUnits, getAddress, formatEther } = require('viem')
const { fetchWethPriceInDaiFromUniswap } = require('../utils/fetchpricefromUniswap')
const { mainnet } = require('viem/chains')
const explorerUrl = mainnet.blockExplorers.default.url

const WETH = ('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2').toLowerCase()

const erc20Abi = JSON.parse((new utils.Interface([
	"event Transfer(address indexed from, address indexed to, uint256 value)",	
	"function name() view returns (string)",
	"function symbol() view returns (string)",
	"function decimals() view returns (uint8)",
	
])).format(ethers.utils.FormatTypes.json))

const uniswapV2Abi = JSON.parse((new utils.Interface([
	"event Swap (address indexed sender, uint256 amount0In, uint256 amount1In, uint256 amount0Out, uint256 amount1Out, address indexed to)",	
	"function token0() external view returns (address)",
    "function token1() external view returns (address)",	
])).format(ethers.utils.FormatTypes.json))


const publicClient = createPublicClient({
  	chain: mainnet,
  	transport: http()
})

async function getToken(data) {
	const address = data.address.toLowerCase()
	let token = await ERC20TokenMdl.findOne({ address, chainId: data.chainId })
	if (!token) {
		try {
			const symbol = await publicClient.readContract({
				address: data.address,
				abi: erc20Abi,
				functionName: 'symbol',
			})
			const decimals = await publicClient.readContract({
				address: data.address,
				abi: erc20Abi,
				functionName: 'decimals',
			})
			token = await ERC20TokenMdl.create({ address: data.address.toLowerCase(), chainId: data.chainId, symbol, decimals })			
		} catch (error) {
			console.log('getToken error', error)
		}							
	}

	if (!token) {
		token = { 
			address: data.address.toLowerCase(),
			name: 'Unknown',
			symbol: '???',
			decimals: 0
		}
	}
	return token
}

const start = async function(delay = 10000) {		
	logger.info("TRACKER STARTED");
			
	setTimeout(async function tick() {
		try {						
			const transactions = await TrackedTransactionMdl.find({ tmSent: false }).limit(30).populate({ path: 'wallet', populate: { path: 'user', model: 'User' } })	
			if (!transactions.length) return setTimeout(tick, 10000); 	
			console.log('FOUND TXS', transactions.length)
	
			const prices = await fetchWethPriceInDaiFromUniswap()
	
			for (let transaction of transactions) {
				try {
					const address = transaction.wallet.address.replace('0x', '').toLowerCase()
					let message = `<a href="${explorerUrl}/address/${transaction.wallet.address}">${transaction.wallet.name ? transaction.wallet.name : ''} ${addressShort(transaction.wallet.address)}</a> \n`				
					message += `<b>TX: </b> <a href="${explorerUrl}/tx/${transaction.tx.hash}#code">${txHashShort(transaction.tx.hash)}</a> <b> TIME: </b> ${dayjs(transaction.tx.block.timestamp).format('MM/DD HH:mm:ss')} \n`
	
					if (transaction.tx.value > 0) {						
						const value = parseFloat(formatEther(transaction.tx.value)).toFixed(8)
						const fiatValue = parseFloat(parseFloat(value * prices).toFixed(2))
						if (transaction.tx.from?.includes(address)) {
							message += `<b>ETH OUT: </b> ${value} ETH (~$ ${fiatValue} ) <b> TO: </b>  <a href="${explorerUrl}/address/${transaction.tx.to}">${addressShort(transaction.tx.to)}</a> \n`
						}
						if (transaction.tx.to?.includes(address)) {
							message += `<b>ETH IN: </b> ${value} ETH (~$ ${fiatValue} ) <b> FROM: </b> <a href="${explorerUrl}/address/${transaction.tx.from}">${addressShort(transaction.tx.from)}</a> \n`
						}
					}
											
					for (let log of transaction.logs) {	
						let logType	
						//console.log(log.topics[0])
						if (log.topics[0] === getEventSelector(uniswapV2Abi.find(e => e.name === "Swap"))) logType = 'uniswapSwap'
						if (log.topics[0] === getEventSelector(erc20Abi.find(e => e.name === "Transfer"))) logType = 'erc20Transfer'
						if (log.topics[0] === getEventSelector(wethAbi.find(e => e.name === "Withdrawal"))) logType = 'wethWithdraw'
						
						// uniswap swap						
						if (logType === 'uniswapSwap') {
							let token0, token1
							try {
								const swap = decodeEventLog({
									abi: uniswapV2Abi,
									data: log.data,
									topics: log.topics
								})
		
								const token0Address = await publicClient.readContract({
									address: log.address,
									abi: uniswapV2Abi,
									functionName: 'token0',
								})
		
								const token1Address = await publicClient.readContract({
									address: log.address,
									abi: uniswapV2Abi,
									functionName: 'token1',
								})
		
								token0 = await getToken({ address: token0Address, chainId: transaction.chainId })	
								token1 = await getToken({ address: token1Address, chainId: transaction.chainId })
								
								let tokenIn, tokenOut, valueIn, valueOut, valueInUSD ='', valueOutUSD=''
								if (swap.args.amount0In) { // token0 > token1
									tokenIn = token0
									tokenOut = token1
									valueIn = parseFloat(parseFloat(formatUnits(swap.args.amount0In, token0.decimals)).toFixed(4))
									valueOut = parseFloat(parseFloat(formatUnits(swap.args.amount1Out, token1.decimals)).toFixed(4))								
								} else {
									tokenIn = token1
									tokenOut = token0
									valueIn = parseFloat(parseFloat(formatUnits(swap.args.amount1In, token1.decimals)).toFixed(4))
									valueOut = parseFloat(parseFloat(formatUnits(swap.args.amount0Out, token0.decimals)).toFixed(4))
								}
		
								if (tokenIn.address == WETH) {
									valueInUSD = `(~$ ${parseFloat(valueIn * prices).toFixed(2)})`
								} else if (tokenOut.address == WETH) {
									valueOutUSD = `(~$ ${parseFloat(valueOut * prices).toFixed(2)})`
								}
		
								message += `<b>SWAP: </b> ${valueIn} <a href="${explorerUrl}/address/${tokenIn.address}">${tokenIn.symbol}</a> ${valueInUSD} <b> FOR: </b> ${valueOut} <a href="${explorerUrl}/address/${tokenOut.address}">${tokenOut.symbol}</a> ${valueOutUSD} \n`														
							} catch (error) {
								console.error('UNISWAP ERROR', error)
							}	
						}
						
						// wethWithdraw common transfers
						if (logType === 'wethWithdraw') { 
							const withdraw = decodeEventLog({
								abi: wethAbi,
								data: log.data,
								topics: log.topics
							})
							console.log(withdraw)							
							const value = parseFloat(parseFloat(formatEther(withdraw.args.wad)).toFixed(4))

							if (withdraw.args.src.toLowerCase() === RouterV3) {
								message += `<b>ETH IN: </b> ${value} (~$ ${parseFloat(value * prices).toFixed(2)}) \n`
							}

							if (withdraw.args.src.toLowerCase() === RouterV2) {
								message += `<b>ETH IN: </b> ${value} (~$ ${parseFloat(value * prices).toFixed(2)}) \n`
							}												
						}

						// erc20 common transfers
						if (logType === 'erc20Transfer') { 
							const transfer = decodeEventLog({
								abi: erc20Abi,
								data: log.data,
								topics: log.topics
							})
	
							const token = await getToken({ address: log.address, chainId: transaction.chainId })						
							const value = parseFloat(parseFloat(formatUnits(transfer.args.value, token.decimals)).toFixed(4))
							let valueUSD = ''
							if (token.address == WETH) {
								valueUSD = `(~$ ${parseFloat(value * prices).toFixed(2)})`
							}
	
							if (transfer.args.from.toLowerCase().includes(address)) {
								message += `<b>ERC20 OUT: </b> ${value} <a href="${explorerUrl}/address/${log.address}">${token.symbol}</a> ${valueUSD} <b> TO: </b> <a href="${explorerUrl}/address/${transfer.args.to}">${addressShort(transfer.args.to)}</a> \n`
							}
							if (transfer.args.to.toLowerCase().includes(address)) {
								message += `<b>ERC20 IN: </b> ${value} <a href="${explorerUrl}/address/${log.address}">${token.symbol}</a> ${valueUSD} <b> FROM: </b> <a href="${explorerUrl}/address/${transfer.args.from}">${addressShort(transfer.args.from, true)}</a> \n`
							}						
						} 

						if (!logType) {
							//message += `<b>CONTRACT INTERACTION: </b> <a href="${explorerUrl}/address/${log.address}">${addressShort(log.address)}</a> \n`
						}
						
					}

					for (let trace of transaction.traces) {	
						if (trace.action.value > 0) {
							const value = parseFloat(formatEther(trace.action.value)).toFixed(8)
							const fiatValue = parseFloat(parseFloat(value * prices).toFixed(2))
							if (trace.action.from?.includes(address)) {
								message += `<b>ETH OUT: </b> ${value} ETH (~$ ${fiatValue} ) <b> TO: </b>  <a href="${explorerUrl}/address/${trace.action.to}">${addressShort(trace.action.to)}</a> \n`
							}
							if (trace.action.to?.includes(address)) {
								message += `<b>ETH IN: </b> ${value} ETH (~$ ${fiatValue} ) <b> FROM: </b> <a href="${explorerUrl}/address/${trace.action.from}">${addressShort(trace.action.from)}</a> \n`
							}
						}
					}
					
					//console.log(message)
	
					await tmBot.api.sendMessage(
						transaction.wallet.user.tmId, 
						//BOT_DEVELOPER,
						message,
						{ 
							parse_mode: "HTML",
							disable_web_page_preview: true
						},
					);
					transaction.tmSent = true
					await transaction.save()				
					
				} catch (error) {
					console.log(error)
				}
			}		
		} catch (error) {
			console.log('TM SENDER ERROR', error)			
		}
		//return
		setTimeout(tick, delay);             
	}, 2000)	
}

module.exports = {
	start,
};