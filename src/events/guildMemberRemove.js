const { User, JoinLog } = require('../db');
const { ensureRewardRole } = require('../utils/rewards');

module.exports = (client) => {
	client.on('guildMemberRemove', async (member) => {
		console.log(`👋 Member left: ${member.user.tag} (${member.id}) from guild: ${member.guild.name}`);
		try {
			const log = await JoinLog.findOne({
				where: { guildId: member.guild.id, memberId: member.id },
				order: [['createdAt', 'DESC']],
			});
			if (!log || !log.inviterId) {
				console.log(`❓ No join log found for ${member.user.tag} or no inviter recorded`);
				return;
			}

			const inviterId = log.inviterId;
			console.log(`📉 Recording leave for inviter: ${inviterId}`);
			const [inviterStats] = await User.findOrCreate({
				where: { userId: inviterId, guildId: member.guild.id },
				defaults: { regularInvites: 0, fakeInvites: 0, leftInvites: 0, bonusInvites: 0 },
			});
			inviterStats.leftInvites += 1;
			await inviterStats.save();
			console.log(`✅ Updated left invites for ${inviterId}: ${inviterStats.leftInvites}`);

			const threshold = Number(process.env.INVITE_THRESHOLD || 3);
			const rewardRoleId = process.env.REWARD_ROLE_ID;
			const inviterMember = await member.guild.members.fetch(inviterId).catch(() => null);
			if (inviterMember) await ensureRewardRole(inviterMember, inviterStats, threshold, rewardRoleId);
		} catch (err) {
			console.error('❌ Error in guildMemberRemove handler:', err);
		}
	});
};


