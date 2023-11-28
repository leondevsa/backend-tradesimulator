const config = require('../../config/config');
const { formatEther } = require('viem')

module.exports = async (ctx) => {
    const balance = parseFloat(formatEther(BigInt(ctx.user.balance))).toFixed(6) 
    let resp = `Hey ${ctx.from?.first_name}! Welcome \n\n`    
    + `We created internal wallet for you \n`
    + `Your balance is ${balance} ETH \n`

    + `${ctx.user.walletAddress} \n\n`
    + `Follow next link to make deposit \n`
    
    if (config.isProd) {
        resp += `\n<a href="${config.appUrl}/deposit?userId=${ctx.user._id}">DEPOSIT WEB PAGE</a> `
    } else {
        resp += `\n${config.appUrl}/deposit?userId=${ctx.user._id}`
    } 

    ctx.reply(resp, { 
        parse_mode: "HTML",
        disable_web_page_preview: true
    });
};
