const { ApplicationCommandType } = require('discord.js');

function resolveVouchyChannel(guild) {
	const configuredChannelId = process.env.VOUCHY_CHANNEL_ID || process.env.INVITE_ANNOUNCE_CHANNEL_ID || guild.systemChannelId;
	if (!configuredChannelId) return null;
	return guild.channels.cache.get(configuredChannelId) || null;
}

function buildCommandVariants(commandName, userId, amount) {
	const variants = [];
	const prefix = process.env.VOUCHY_PREFIX || '';
	const vouchyBotId = process.env.VOUCHY_BOT_ID || '';

	// 1) Prefixed (if provided)
	if (prefix) variants.push(`${prefix}${commandName} <@${userId}> ${amount}`);

	// 2) Mention bot first if provided
	if (vouchyBotId) variants.push(`<@${vouchyBotId}> ${commandName} <@${userId}> ${amount}`);

	// 3) Slash-looking (some bots parse message content)
	variants.push(`/${commandName} <@${userId}> ${amount}`);

	// 4) Plain command
	variants.push(`${commandName} <@${userId}> ${amount}`);

	// De-duplicate while preserving order
	return Array.from(new Set(variants));
}

/**
 * Execute Vouchy commands by creating a proper application command interaction
 */
async function executeVouchyCommand(guild, channel, commandName, userId, amount) {
	try {
		console.log(`🎯 Attempting to execute Vouchy command: ${commandName} for user ${userId} with amount ${amount}`);

		// Resolve channel if not provided
		const targetChannel = channel || resolveVouchyChannel(guild);
		if (!targetChannel || !targetChannel.isTextBased()) {
			console.log('❌ No valid Vouchy channel found');
			return false;
		}

		const messagesToTry = buildCommandVariants(commandName, userId, amount);
		let sentAny = false;
		for (const msg of messagesToTry) {
			try {
				await targetChannel.send(msg);
				console.log(`📤 Sent Vouchy command variant: ${msg}`);
				sentAny = true;
			} catch (sendErr) {
				console.error(`❌ Failed to send variant "${msg}":`, sendErr.message);
			}
		}

		// Optional: Try webhooks if configured explicitly
		const useWebhook = String(process.env.VOUCHY_USE_WEBHOOK || '').toLowerCase() === 'true';
		if (useWebhook) {
			try {
				const webhooks = await targetChannel.fetchWebhooks();
				const webhook = webhooks.first();
				if (webhook) {
					for (const msg of messagesToTry) {
						try {
							await webhook.send({ content: msg, username: 'InviteBot' });
							console.log(`📤 Sent via webhook: ${msg}`);
							sentAny = true;
						} catch (whErr) {
							console.error('❌ Webhook send failed:', whErr.message);
						}
					}
				}
			} catch (webhookError) {
				console.log('ℹ️ No webhook method available');
			}
		}
		
		return sentAny;
		
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
