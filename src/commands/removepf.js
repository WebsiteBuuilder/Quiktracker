const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { User } = require('../db');
const { updateLeaderboardForGuild } = require('../utils/leaderboard');

module.exports.data = new SlashCommandBuilder()
	.setName('removepf')
	.setDescription('Remove 1 Paid Referral (PF) from a user')
	.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
	.addUserOption(opt => opt.setName('user').setDescription('User to remove PF from').setRequired(true));

module.exports.execute = async (interaction) => {
	const user = interaction.options.getUser('user');
	const [stats] = await User.findOrCreate({
		where: { userId: user.id, guildId: interaction.guild.id },
		defaults: { regularInvites: 0, fakeInvites: 0, leftInvites: 0, paidReferrals: 0, freeOrders: 0 },
	});
	
	if (stats.paidReferrals <= 0) {
		return await interaction.reply({ content: `${user.tag} has no PF to remove.`, ephemeral: false });
	}
	
	const oldPF = stats.paidReferrals;
	const oldFO = stats.freeOrders;
	
	stats.paidReferrals -= 1;
	
	// Recalculate Free Orders based on new PF count (1 FO per 3 PF)
	const newFreeOrders = Math.floor(stats.paidReferrals / 3);
	stats.freeOrders = newFreeOrders;
	
	await stats.save();

	// Refresh leaderboard after PF/FO change
	updateLeaderboardForGuild(interaction.guild).catch(() => {});
	
	let message = `Removed 1 PF from ${user.tag}. PF: ${oldPF} → ${stats.paidReferrals}`;
	
	if (newFreeOrders < oldFO) {
		const lostFO = oldFO - newFreeOrders;
		message += ` ⚠️ Lost ${lostFO} Free Order${lostFO > 1 ? 's' : ''}! FO: ${oldFO} → ${stats.freeOrders}`;
	}
	
	await interaction.reply({ content: message, ephemeral: false });
};
