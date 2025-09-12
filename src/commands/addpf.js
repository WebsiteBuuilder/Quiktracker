const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { User } = require('../db');
const { updateLeaderboardForGuild } = require('../utils/leaderboard');

module.exports.data = new SlashCommandBuilder()
	.setName('addpf')
	.setDescription('Add 1 Paid Referral (PF) to a user')
	.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
	.addUserOption(opt => opt.setName('user').setDescription('User to credit').setRequired(true));

module.exports.execute = async (interaction) => {
	const user = interaction.options.getUser('user');
	const [stats] = await User.findOrCreate({
		where: { userId: user.id, guildId: interaction.guild.id },
		defaults: { regularInvites: 0, fakeInvites: 0, leftInvites: 0, paidReferrals: 0, freeOrders: 0 },
	});
	
	stats.paidReferrals += 1;
	
	// Calculate if user earned a new Free Order (1 FO per 3 PF)
	const newFreeOrders = Math.floor(stats.paidReferrals / 3);
	const oldFreeOrders = stats.freeOrders;
	stats.freeOrders = newFreeOrders;
	
	await stats.save();

	// Refresh leaderboard after PF/FO change
	updateLeaderboardForGuild(interaction.guild).catch(() => {});
	
	let message = `Added 1 PF to ${user.tag}. Total PF: ${stats.paidReferrals}`;
	
	if (newFreeOrders > oldFreeOrders) {
		const earnedFO = newFreeOrders - oldFreeOrders;
		message += ` 🎉 Earned ${earnedFO} Free Order${earnedFO > 1 ? 's' : ''}! Total FO: ${stats.freeOrders}`;
	}
	
	await interaction.reply({ content: message, ephemeral: false });
};
