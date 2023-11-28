const { Fetcher, Route, Token, Trade, TokenAmount, TradeType, ChainId } = require("@uniswap/sdk");
const { ethers, utils } = require('ethers');

const fetchWethPriceInDaiFromUniswap = async () => {
    const  provider  = new ethers.providers.WebSocketProvider("wss://mainnet.infura.io/ws/v3/6ef4b3d917eb4a42b16877f7539ff595");

    try {
      const DAI = new Token(1, utils.getAddress("0x6B175474E89094C44Da98b954EedeAC495271d0F"), 18);
      const WETH = await Fetcher.fetchTokenData(1, utils.getAddress("0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"), provider);
  
      // Get DAI/WETH Pair
      const daiWethPair = await Fetcher.fetchPairData(DAI, WETH, provider);
  
      // Create a route for the DAI/WETH pair
      const route = new Route([daiWethPair], DAI);
  
      // Create trade instance for WETH price in terms of DAI
      const trade = new Trade(
        route,
        new TokenAmount(DAI, '1000000000000000000'),  // 1 DAI (18 decimals)
        TradeType.EXACT_INPUT
      );
  
      // Get the price of WETH in terms of DAI
      const wethPriceInDai = trade.executionPrice.invert().toSignificant(7);
  
      return wethPriceInDai;
    } catch (error) {
      console.error("Error fetching WETH price from Uniswap: ", error);
      return null;
    }
  };

module.exports = { fetchWethPriceInDaiFromUniswap };
