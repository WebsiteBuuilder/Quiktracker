const { User, JoinLog } = require('../db');
const { getGuildInviteUses, updateInviteUse } = require('../utils/inviteCache');

const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

module.exports = (client) => {
	client.on('guildMemberAdd', async (member) => {
		console.log(`👋 Member joined: ${member.user.tag} (${member.id}) in guild: ${member.guild.name}`);
		try {
			// Fetch latest invites to compare and find which one increased
			const beforeUses = getGuildInviteUses(member.guild.id);
			const invites = await member.guild.invites.fetch();
			console.log(`📋 Checking ${invites.size} invites for usage changes`);
			
			let usedInvite = null;
			invites.forEach(inv => {
				const before = beforeUses.get(inv.code) ?? 0;
				const now = inv.uses ?? 0;
				if (now > before) {
					console.log(`🎯 Found used invite: ${inv.code} (${before} → ${now}) by ${inv.inviter?.tag}`);
					usedInvite = inv;
				}
				updateInviteUse(member.guild.id, inv.code, now);
			});

			let inviterId = usedInvite?.inviter?.id ?? null;
			const inviteCode = usedInvite?.code ?? null;

			const accountAge = Date.now() - member.user.createdAt.getTime();
			const isFake = accountAge < FIVE_DAYS_MS;
			console.log(`🔍 Account age: ${Math.floor(accountAge / (24 * 60 * 60 * 1000))} days, isFake: ${isFake}`);

			if (inviterId) {
				const [inviterStats] = await User.findOrCreate({
					where: { userId: inviterId, guildId: member.guild.id },
					defaults: { regularInvites: 0, fakeInvites: 0, leftInvites: 0, paidReferrals: 0, freeOrders: 0 },
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

				// Award Vouchy points for successful (non-fake) invites
				if (!isFake) {
					try {
						console.log(`🎯 Awarding 1 Vouchy point to ${inviterId} for successful invite`);
						const addPointsCommand = `/addpoints <@${inviterId}> 1`;
						
						// Find a channel where the bot can execute the Vouchy command
						const channelId = process.env.INVITE_ANNOUNCE_CHANNEL_ID || member.guild.systemChannelId;
						const channel = channelId ? (member.guild.channels.cache.get(channelId) || await member.guild.channels.fetch(channelId).catch(() => null)) : null;
						
						if (channel && channel.isTextBased()) {
							await channel.send(addPointsCommand);
							console.log(`✅ Sent Vouchy command: ${addPointsCommand}`);
						} else {
							console.log(`❌ Could not find suitable channel to send Vouchy command`);
						}
					} catch (vouchyError) {
						console.error('❌ Error awarding Vouchy points:', vouchyError.message);
						// Don't throw - continue with normal flow
					}
				}

				// Announcement
				const channelId = process.env.INVITE_ANNOUNCE_CHANNEL_ID;
				console.log(`📢 Announcement channel ID: ${channelId}`);
				if (channelId) {
					const channel = member.guild.channels.cache.get(channelId) || await member.guild.channels.fetch(channelId).catch(() => null);
					if (channel && channel.isTextBased()) {
						const total = (inviterStats.regularInvites - inviterStats.fakeInvites - inviterStats.leftInvites + inviterStats.paidReferrals);
						const inviteUsesNow = usedInvite?.uses ?? 0;
						const message = `🎉 ${member} joined — invited by <@${inviterId}> using code \`${inviteCode}\` (uses: ${inviteUsesNow}). Invites: ${total} (Reg ${inviterStats.regularInvites} • Fake ${inviterStats.fakeInvites} • Left ${inviterStats.leftInvites} • PF ${inviterStats.paidReferrals} • FO ${inviterStats.freeOrders}).`;
						console.log(`📤 Sending announcement: ${message}`);
						await channel.send(message);
					} else {
						console.log(`❌ Could not find or access announcement channel: ${channelId}`);
					}
				}
			}
			else {
				// Unknown inviter (vanity or expired/unknown code)
				const channelId = process.env.INVITE_ANNOUNCE_CHANNEL_ID;
				if (channelId) {
					const channel = member.guild.channels.cache.get(channelId) || await member.guild.channels.fetch(channelId).catch(() => null);
					if (channel && channel.isTextBased()) {
						await channel.send(`🎉 ${member} joined — inviter unknown (vanity or expired invite).`);
					}
				}
			}
		} catch (err) {
			console.error('Error in guildMemberAdd handler:', err);
		}
	});
};


