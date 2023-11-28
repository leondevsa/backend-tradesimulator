const catchAsync = require("../utils/catchAsync");
const httpStatus = require("http-status");
const ApiError = require("../utils/ApiError");
const { UserMdl, DepositMdl } = require("../models");
const web3 = require("../utils/web3");
const pick = require("../utils/pick");
const config = require('../config/config');
const { utils, BigNumber } = require("ethers");
const ObjectId = require('mongoose').Types.ObjectId;

const tokens = [
	{ ...config.bc.eth, id: 'eth', rate: '2100', min: '0.0005' }, // 0.005 / 3 = 0,0016 per 1 ETH  1 / 0,0016 = 
	{ ...config.bc.usdt, id: 'usdt', rate: '1',  min: '1' }
]
const txExpiration = 120

const info = catchAsync(async (req, res) => {
	const { userId } = req.query;
	let user	
	try { if (userId && ObjectId.isValid(userId)) user = await UserMdl.findById(userId) } catch (error) { }			
	res.send({ tokens, user })
})

const create = catchAsync(async (req, res) => {
	// deposit(address wallet_, address token_, uint256 amount_, uint256 depositAmount_, uint256 deadline_, bytes calldata serviceSignature_)
	const abi = [ 'address wallet_', 'address token_', 'uint256 amount_', 'uint256 depositAmount_', 'uint256 deadline_' ]
	const { wallet, token, amount } = req.body;
	
	const user = await UserMdl.findOne({ wallet: wallet.toLowerCase() })
	if (!user) throw new ApiError(httpStatus.NOT_ACCEPTABLE, "User not found")	

	const paymentToken = tokens.find(t => t.address.toLowerCase() === token.toLowerCase())
	if (!paymentToken) throw new ApiError(httpStatus.NOT_ACCEPTABLE, "Payment token not supported")	  
	 
	const amountBn = BigNumber.from(amount)	
	const rate = BigNumber.from(paymentToken.rate)
	console.log(rate.toString(), amountBn.toString())
		
	const depositAmount = amountBn.mul(rate)	
	if (amountBn.lt(utils.parseEther(paymentToken.min))) throw new ApiError(httpStatus.NOT_ACCEPTABLE, "Too small amount")
	const deadline = (await web3.blockTimestamp()) + txExpiration
    
	const args = [ wallet, token, amount, depositAmount.toString(), deadline ]
    const data = utils.arrayify(utils.keccak256(utils.defaultAbiCoder.encode( abi, args )))
    const serviceSignature = await web3.signer.signMessage(data);
	
	res.send([ ...args, serviceSignature ])
});

const list = catchAsync(async (req, res) => {
	const { wallet } = req.query;	
	const user = await UserMdl.findOne({ wallet: wallet.toLowerCase() })
	if (!user) throw new ApiError(httpStatus.NOT_ACCEPTABLE, "User not found")	

	const filter = { user };
	const options = pick(req.query, ["page", "limit", 'sort']);

	switch (req.query.sort) {
		case 'asc':
			options.sortBy = 'createdAt:asc';
			break;
		case 'desc':
			options.sortBy = 'createdAt:desc';
			break;		
	}

	const resp = await DepositMdl.paginate(filter, options);	
	res.send(resp)
})

module.exports = {
	info,
	list,
	create,
}