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
		const total = regular - fake - left + paidReferrals;
		return {
			userId: row.userId,
			regular,
			fake,
			left,
			paidReferrals,
			freeOrders,
			noFeeOrders,
			total,
		};
	});
}

function buildLeaderboardEmbed(guild, leaderboard, allTotals) {
	const medals = ['🥇', '🥈', '🥉'];
	const descriptionLines = leaderboard.length === 0
		? ['No invite data yet.']
		: leaderboard.map((entry, index) => {
			const medal = medals[index] || '🔹';
			const rank = String(index + 1).padStart(2, ' ');
			return `${medal} ${rank}. <@${entry.userId}> — **${entry.total}**  (Reg ${entry.regular} • Fake ${entry.fake} • Left ${entry.left} • PF ${entry.paidReferrals} • FO ${entry.freeOrders} • NF ${entry.noFeeOrders})`;
		});

	const sumTotal = (allTotals || []).reduce((acc, t) => acc + (t.total || 0), 0);
	const iconUrl = typeof guild.iconURL === 'function' ? guild.iconURL({ size: 128 }) : null;

	const embed = new EmbedBuilder()
		.setTitle('🏆 Invites Leaderboard')
		.setDescription(descriptionLines.join('\n'))
		.setColor(0xF1C40F)
		.setTimestamp(new Date())
		.setFooter({ text: `${guild.name} • Tracked users: ${(allTotals || []).length} • Total: ${sumTotal}` });

	if (iconUrl) embed.setThumbnail(iconUrl);
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


