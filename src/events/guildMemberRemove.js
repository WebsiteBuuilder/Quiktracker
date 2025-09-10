const { User, JoinLog } = require('../db');
const { ensureRewardRole } = require('../utils/rewards');

module.exports = (client) => {
	client.on('guildMemberRemove', async (member) => {
		try {
			const log = await JoinLog.findOne({
				where: { guildId: member.guild.id, memberId: member.id },
				order: [['createdAt', 'DESC']],
			});
			if (!log || !log.inviterId) return;

			const inviterId = log.inviterId;
			const [inviterStats] = await User.findOrCreate({
				where: { userId: inviterId, guildId: member.guild.id },
				defaults: { regularInvites: 0, fakeInvites: 0, leftInvites: 0, bonusInvites: 0 },
			});
			inviterStats.leftInvites += 1;
			await inviterStats.save();

			const threshold = Number(process.env.INVITE_THRESHOLD || 3);
			const rewardRoleId = process.env.REWARD_ROLE_ID;
			const inviterMember = await member.guild.members.fetch(inviterId).catch(() => null);
			if (inviterMember) await ensureRewardRole(inviterMember, inviterStats, threshold, rewardRoleId);
		} catch (err) {
			console.error('Error in guildMemberRemove handler:', err);
		}
	});
};


