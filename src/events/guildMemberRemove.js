const { User, JoinLog } = require('../db');
const { updateLeaderboardForGuild } = require('../utils/leaderboard');
const { removeVouchyPoints } = require('../utils/vouchyIntegration');

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
				defaults: { regularInvites: 0, fakeInvites: 0, leftInvites: 0, paidReferrals: 0, freeOrders: 0 },
			});
			inviterStats.leftInvites += 1;
			await inviterStats.save();
			updateLeaderboardForGuild(member.guild).catch(() => {});
			console.log(`✅ Updated left invites for ${inviterId}: ${inviterStats.leftInvites}`);

			// Remove Vouchy point if the original invite was not fake
			if (!log.isFake) {
				try {
					console.log(`🎯 Removing 1 Vouchy point from ${inviterId} for member leave`);
					
					// Find a channel where we can send the Vouchy command
					const channelId = process.env.INVITE_ANNOUNCE_CHANNEL_ID || member.guild.systemChannelId;
					const channel = channelId ? (member.guild.channels.cache.get(channelId) || await member.guild.channels.fetch(channelId).catch(() => null)) : null;
					
					if (channel && channel.isTextBased()) {
						const success = await removeVouchyPoints(member.guild, channel, inviterId, 1);
						if (success) {
							console.log(`✅ Successfully triggered Vouchy removepoints for user ${inviterId}`);
						} else {
							console.log(`❌ Failed to trigger Vouchy removepoints for user ${inviterId}`);
						}
					} else {
						console.log(`❌ Could not find suitable channel to send Vouchy command`);
					}
				} catch (vouchyError) {
					console.error('❌ Error removing Vouchy points:', vouchyError.message);
					// Don't throw - continue with normal flow
				}
			}
		} catch (err) {
			console.error('❌ Error in guildMemberRemove handler:', err);
		}
	});
};


