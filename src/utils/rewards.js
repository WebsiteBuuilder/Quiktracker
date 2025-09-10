async function ensureRewardRole(member, userStats, threshold, rewardRoleId) {
	if (!rewardRoleId) return;
	try {
		const verifiedInvites = userStats.regularInvites - userStats.fakeInvites - userStats.leftInvites + userStats.bonusInvites;
		if (verifiedInvites >= threshold) {
			if (!member.roles.cache.has(rewardRoleId)) {
				await member.roles.add(rewardRoleId, 'Invite threshold reached');
			}
		} else {
			if (member.roles.cache.has(rewardRoleId)) {
				await member.roles.remove(rewardRoleId, 'Invite count dropped below threshold');
			}
		}
	} catch (err) {
		console.error('Failed to ensure reward role:', err);
	}
}

module.exports = { ensureRewardRole };


