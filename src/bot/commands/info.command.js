const { formatEther } = require('viem')
const config = require('../../config/config');

module.exports = async (ctx) => {    
    const balance = parseFloat(formatEther(BigInt(ctx.user.balance))).toFixed(6) 
    
    let resp = `Your ETH balance: ${balance} \n`    
    + `Internal wallet: ${ctx.user.walletAddress} \n`

    resp += `Please follow next link to make deposit \n`
    if (config.isProd) {
        resp += `<a href="${config.appUrl}/deposit?userId=${ctx.user._id}">DEPOSIT WEB PAGE</a> `
    } else {
        resp += `\n${config.appUrl}/deposit?userId=${ctx.user._id}`
    }  
    
    ctx.reply(resp, { 
        parse_mode: "HTML",
        disable_web_page_preview: true
    });
};