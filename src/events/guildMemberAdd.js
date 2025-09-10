const { User, JoinLog } = require('../db');
const { getGuildInviteUses, updateInviteUse } = require('../utils/inviteCache');
const { ensureRewardRole } = require('../utils/rewards');

const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

module.exports = (client) => {
	client.on('guildMemberAdd', async (member) => {
		try {
			// Fetch latest invites to compare and find which one increased
			const beforeUses = getGuildInviteUses(member.guild.id);
			const invites = await member.guild.invites.fetch();
			let usedInvite = null;
			invites.forEach(inv => {
				const before = beforeUses.get(inv.code) ?? 0;
				if ((inv.uses ?? 0) > before) usedInvite = inv;
				updateInviteUse(member.guild.id, inv.code, inv.uses ?? 0);
			});

			let inviterId = usedInvite?.inviter?.id ?? null;
			const inviteCode = usedInvite?.code ?? null;

			const isFake = (Date.now() - member.user.createdAt.getTime()) < FIVE_DAYS_MS;

			if (inviterId) {
				const [inviterStats] = await User.findOrCreate({
					where: { userId: inviterId, guildId: member.guild.id },
					defaults: { regularInvites: 0, fakeInvites: 0, leftInvites: 0, bonusInvites: 0 },
				});
				if (isFake) inviterStats.fakeInvites += 1; else inviterStats.regularInvites += 1;
				await inviterStats.save();

				// Track join mapping
				await JoinLog.create({
					guildId: member.guild.id,
					memberId: member.id,
					inviterId,
					inviteCode,
					isFake,
				});

				// Reward role check
				const threshold = Number(process.env.INVITE_THRESHOLD || 3);
				const rewardRoleId = process.env.REWARD_ROLE_ID;
				const inviterMember = await member.guild.members.fetch(inviterId).catch(() => null);
				if (inviterMember) await ensureRewardRole(inviterMember, inviterStats, threshold, rewardRoleId);
			}
		} catch (err) {
			console.error('Error in guildMemberAdd handler:', err);
		}
	});
};


