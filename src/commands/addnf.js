const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { User } = require('../db');
const { updateLeaderboardForGuild } = require('../utils/leaderboard');

module.exports.data = new SlashCommandBuilder()
	.setName('addnf')
	.setDescription('Add $5 Orders to a user (subtotal on order must be $20-22)')
	.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
	.addUserOption(opt => opt.setName('user').setDescription('User to add $5 Orders to').setRequired(true))
	.addIntegerOption(opt => opt.setName('count').setDescription('Number of $5 Orders to add').setRequired(true).setMinValue(1));

module.exports.execute = async (interaction) => {
	const user = interaction.options.getUser('user');
	const count = interaction.options.getInteger('count');

	const [stats] = await User.findOrCreate({
		where: { userId: user.id, guildId: interaction.guild.id },
		defaults: { regularInvites: 0, fakeInvites: 0, leftInvites: 0, paidReferrals: 0, freeOrders: 0, noFeeOrders: 0 },
	});

	const oldNF = stats.noFeeOrders;
	stats.noFeeOrders += count;
	await stats.save();

	const message = `Added ${count} $5 Order${count > 1 ? 's' : ''} to ${user.tag}. $5 Orders: ${oldNF} → ${stats.noFeeOrders} (subtotal must be $20-22)`;
	await interaction.reply({ content: message, ephemeral: false });

	// Refresh leaderboard after NF change
	updateLeaderboardForGuild(interaction.guild).catch(() => {});
};
