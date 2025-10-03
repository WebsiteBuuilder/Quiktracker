const { EmbedBuilder } = require('discord.js');
const { User } = require('../db');

function getLeaderboardChannelId() {
	return process.env.LEADERBOARD_CHANNEL_ID || process.env.INVITE_ANNOUNCE_CHANNEL_ID || null;
}

function computeTotalsForUsers(userRows) {
	return userRows.map(row => {
		const regular = row.regularInvites || 0;
		const fake = row.fakeInvites || 0;
		const left = row.leftInvites || 0;
		const paidReferrals = row.paidReferrals || 0;
		const freeOrders = row.freeOrders || 0;
		const noFeeOrders = row.noFeeOrders || 0;
		const potentialFreeOrders = Math.floor(paidReferrals / 3);
		const redeemedFreeOrders = Math.max(0, potentialFreeOrders - freeOrders);
		const pfProgress = paidReferrals % 3;
		const total = regular - fake - left + paidReferrals;
		return {
			userId: row.userId,
			regular,
			fake,
			left,
			paidReferrals,
			freeOrders,
			noFeeOrders,
			potentialFreeOrders,
			redeemedFreeOrders,
			pfProgress,
			total,
		};
	});
}

function buildLeaderboardEmbed(guild, leaderboard, allTotals) {
	const medals = ['🥇', '🥈', '🥉'];

	// Progress bar helper
	const maxTotal = Math.max(1, ...leaderboard.map(x => x.total || 0));
	const renderBar = (value) => {
		const segments = 10;
		const filled = Math.max(0, Math.min(segments, Math.round((value / maxTotal) * segments)));
		return '▰'.repeat(filled) + '▱'.repeat(segments - filled);
	};

	const descriptionLines = leaderboard.length === 0
		? ['No invite data yet.']
		: [
			'Every 3 PF = 1 FO',
			...leaderboard.flatMap((entry, index) => {
				const medal = medals[index] || '🔹';
				const rank = String(index + 1).padStart(2, ' ');
				const header = `${medal} ${rank}. <@${entry.userId}> — **${entry.total}**`;
				const bar = renderBar(entry.total);
				const pfBar = '▰'.repeat(entry.pfProgress) + '▱'.repeat(3 - entry.pfProgress);
				const pfLine = `   PF progress: ${pfBar} (${entry.pfProgress}/3) • PF ${entry.paidReferrals}`;
				const foEarned = entry.potentialFreeOrders;
				const foAvail = entry.freeOrders;
				const foRedeemed = Math.max(0, entry.redeemedFreeOrders);
				const foLine = `   FO earned ${foEarned} • available ${foAvail}${foRedeemed > 0 ? ` • redeemed ${foRedeemed}` : ''} • $5 Orders ${entry.noFeeOrders}`;
				const stats = `(${entry.regular} Reg • ${entry.fake} Fake • ${entry.left} Left)`;
				return [header, `   ${bar}`, pfLine, foLine, `   ${stats}`];
			})
		];

	const sumTotal = (allTotals || []).reduce((acc, t) => acc + (t.total || 0), 0);
	const iconUrl = typeof guild.iconURL === 'function' ? guild.iconURL({ size: 128 }) : null;
	const bannerUrl = typeof guild.bannerURL === 'function' ? guild.bannerURL({ size: 1024 }) : null;

	const embed = new EmbedBuilder()
		.setTitle('🏆 Invites Leaderboard')
		.setDescription(descriptionLines.join('\n'))
		.setColor(0xF1C40F)
		.setTimestamp(new Date())
		.setFooter({ text: `${guild.name} • Tracked users: ${(allTotals || []).length} • Total: ${sumTotal}` });

	if (iconUrl) embed.setThumbnail(iconUrl);
	if (bannerUrl) embed.setImage(bannerUrl);
	return embed;
}

async function fetchOrCreatePinnedMessage(channel) {
	try {
		const pinned = await channel.messages.fetchPinned();
		const existing = pinned.find(m => m.author.id === channel.client.user.id);
		if (existing) return existing;
	} catch {}

	const created = await channel.send({ content: 'Initializing leaderboard…' });
	try { await created.pin(); } catch {}
	return created;
}

async function updateLeaderboardForGuild(guild) {
	try {
		const channelId = getLeaderboardChannelId() || guild.systemChannelId;
		if (!channelId) {
			console.log('❌ No leaderboard channel configured and no system channel available');
			return false;
		}
		const channel = guild.channels.cache.get(channelId) || await guild.channels.fetch(channelId).catch(() => null);
		if (!channel || !channel.isTextBased()) {
			console.log(`❌ Leaderboard channel not found or not text-based: ${channelId}`);
			return false;
		}

		const rows = await User.findAll({ where: { guildId: guild.id } });
		const totals = computeTotalsForUsers(rows);
		const top = totals
			.sort((a, b) => b.total - a.total || b.regular - a.regular)
			.slice(0, 10);

		const embed = buildLeaderboardEmbed(guild, top, totals);
		const message = await fetchOrCreatePinnedMessage(channel);
		await message.edit({ content: null, embeds: [embed] });
		return true;
	} catch (err) {
		console.error('❌ Failed to update leaderboard:', err.message);
		return false;
	}
}

module.exports = {
	updateLeaderboardForGuild,
	buildLeaderboardEmbed,
};


