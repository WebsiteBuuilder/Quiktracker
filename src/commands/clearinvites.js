const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { User } = require('../db');
const { updateLeaderboardForGuild } = require('../utils/leaderboard');

module.exports.data = new SlashCommandBuilder()
	.setName('clearinvites')
	.setDescription('Reset a user\'s invite statistics to zero')
	.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
	.addUserOption(opt => opt.setName('user').setDescription('User to clear invite stats for').setRequired(true));

module.exports.execute = async (interaction) => {
	const user = interaction.options.getUser('user');
	const [stats] = await User.findOrCreate({
		where: { userId: user.id, guildId: interaction.guild.id },
		defaults: { regularInvites: 0, fakeInvites: 0, leftInvites: 0, paidReferrals: 0, freeOrders: 0 },
	});

	// Store old values for confirmation message
	const oldStats = {
		regular: stats.regularInvites,
		fake: stats.fakeInvites,
		left: stats.leftInvites,
		pf: stats.paidReferrals,
		fo: stats.freeOrders,
		total: stats.regularInvites - stats.fakeInvites - stats.leftInvites + stats.paidReferrals
	};

	// Reset all stats to zero
	stats.regularInvites = 0;
	stats.fakeInvites = 0;
	stats.leftInvites = 0;
	stats.paidReferrals = 0;
	stats.freeOrders = 0;

	await stats.save();

	// Refresh leaderboard after clearing
	updateLeaderboardForGuild(interaction.guild).catch(() => {});

	const embed = {
		title: 'Invite Stats Cleared',
		description: `${user.tag}'s invite statistics have been reset to zero.`,
		fields: [
			{ name: 'Previous Stats', value: `Reg ${oldStats.regular} • Fake ${oldStats.fake} • Left ${oldStats.left} • PF ${oldStats.pf} • FO ${oldStats.fo} • Total ${oldStats.total}`, inline: false },
			{ name: 'New Stats', value: 'Reg 0 • Fake 0 • Left 0 • PF 0 • FO 0 • Total 0', inline: false }
		],
		color: 0xff0000,
		timestamp: new Date(),
	};

	await interaction.reply({ embeds: [embed], ephemeral: false });
};
