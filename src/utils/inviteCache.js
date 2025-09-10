const guildInviteUses = new Map();

async function primeGuildInvites(guild) {
	try {
		const invites = await guild.invites.fetch();
		const map = new Map();
		invites.forEach(inv => {
			map.set(inv.code, inv.uses ?? 0);
		});
		guildInviteUses.set(guild.id, map);
	} catch (err) {
		console.error(`Failed to fetch invites for guild ${guild.id}:`, err.message);
	}
}

function getGuildInviteUses(guildId) {
	if (!guildInviteUses.has(guildId)) guildInviteUses.set(guildId, new Map());
	return guildInviteUses.get(guildId);
}

function updateInviteUse(guildId, code, uses) {
	const map = getGuildInviteUses(guildId);
	map.set(code, uses ?? 0);
}

function removeInvite(guildId, code) {
	const map = getGuildInviteUses(guildId);
	map.delete(code);
}

module.exports = {
	primeGuildInvites,
	getGuildInviteUses,
	updateInviteUse,
	removeInvite,
};


