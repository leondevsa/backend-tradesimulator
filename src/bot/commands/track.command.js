const config = require('../../config/config');
const { formatEther, getAddress } = require('viem')
const { TrackedWalletMdl } = require('../../models');
module.exports = async (ctx) => {
	console.log(ctx)
    let resp 	
	const message = ctx.match
	if (message == 'list') {
			

	}
	
	
    let addressMatch = message.match(/(\b0x[a-fA-F0-9]{40}\b)/g)		
	if (addressMatch && addressMatch.length) {
		const address = getAddress(addressMatch[0])
		const text = message.replace(address, '').trim()
		let wallet = await TrackedWalletMdl.findOne({ user: ctx.user, address })	
		if (text.includes('delete')) {
			if (wallet) {
				wallet.delete()
				resp = 'Deleted'
			} else {			
				resp = 'Not found'		
			}
		} else {
			if (!wallet) {
				wallet = await TrackedWalletMdl.create({ user: ctx.user, address, name: text })
				resp = 'Wallet added and enabled. Send address again to stop tracking'
			} else {			
				if (text) {
					wallet.name = text
					resp = 'Name set'
				} else {
					wallet.enabled = !wallet.enabled
					resp = wallet.enabled ? 'Wallet enabled' : 'Wallet disabled'
				}
				await wallet.save()			
			}
		}
		//console.log('wallet', wallet)
	}
	if (resp) {
        ctx.reply(resp, { 
            parse_mode: "HTML",
            disable_web_page_preview: true
        });	
	}
};
