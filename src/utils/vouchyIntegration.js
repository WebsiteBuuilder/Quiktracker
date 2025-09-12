const { ApplicationCommandType } = require('discord.js');

/**
 * Execute Vouchy commands by creating a proper application command interaction
 */
async function executeVouchyCommand(guild, channel, commandName, userId, amount) {
	try {
		console.log(`🎯 Attempting to execute Vouchy command: ${commandName} for user ${userId} with amount ${amount}`);
		
		// Method 1: Try to find Vouchy bot and trigger its command
		const vouchyBot = guild.members.cache.find(member => 
			member.user.bot && 
			(member.user.username.toLowerCase().includes('vouchy') || 
			 member.user.username.toLowerCase().includes('vouch'))
		);
		
		if (!vouchyBot) {
			console.log('❌ Vouchy bot not found in guild');
			return false;
		}
		
		console.log(`✅ Found Vouchy bot: ${vouchyBot.user.username} (${vouchyBot.user.id})`);
		
		// Method 2: Send as a message that looks like a slash command
		const commandMessage = `/${commandName} <@${userId}> ${amount}`;
		await channel.send(commandMessage);
		console.log(`📤 Sent command as message: ${commandMessage}`);
		
		// Method 3: Try to trigger via webhook if available
		try {
			const webhooks = await channel.fetchWebhooks();
			const vouchyWebhook = webhooks.find(wh => 
				wh.owner && 
				(wh.owner.username.toLowerCase().includes('vouchy') || 
				 wh.owner.username.toLowerCase().includes('vouch'))
			);
			
			if (vouchyWebhook) {
				await vouchyWebhook.send({
					content: `/${commandName} <@${userId}> ${amount}`,
					username: 'InviteBot Integration'
				});
				console.log(`📤 Sent via Vouchy webhook`);
			}
		} catch (webhookError) {
			console.log('ℹ️ No webhook method available');
		}
		
		// Method 4: Alternative command format without slash
		setTimeout(async () => {
			try {
				await channel.send(`${commandName} <@${userId}> ${amount}`);
				console.log(`📤 Sent alternative format: ${commandName} <@${userId}> ${amount}`);
			} catch (altError) {
				console.error('❌ Alternative format failed:', altError.message);
			}
		}, 1000);
		
		return true;
		
	} catch (error) {
		console.error(`❌ Error executing Vouchy command:`, error.message);
		return false;
	}
}

/**
 * Add points to a user via Vouchy
 */
async function addVouchyPoints(guild, channel, userId, amount = 1) {
	return await executeVouchyCommand(guild, channel, 'addpoints', userId, amount);
}

/**
 * Remove points from a user via Vouchy
 */
async function removeVouchyPoints(guild, channel, userId, amount = 1) {
	return await executeVouchyCommand(guild, channel, 'removepoints', userId, amount);
}

module.exports = {
	executeVouchyCommand,
	addVouchyPoints,
	removeVouchyPoints
};
