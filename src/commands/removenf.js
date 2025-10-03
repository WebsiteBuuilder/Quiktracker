const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { User } = require('../db');
const { updateLeaderboardForGuild } = require('../utils/leaderboard');

module.exports.data = new SlashCommandBuilder()
	.setName('removenf')
	.setDescription('Remove $5 Orders from a user (subtotal on order must be $20-22)')
	.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
	.addUserOption(opt => opt.setName('user').setDescription('User to remove $5 Orders from').setRequired(true))
	.addIntegerOption(opt => opt.setName('count').setDescription('Number of $5 Orders to remove').setRequired(true).setMinValue(1));

module.exports.execute = async (interaction) => {
	const user = interaction.options.getUser('user');
	const count = interaction.options.getInteger('count');

	const [stats] = await User.findOrCreate({
		where: { userId: user.id, guildId: interaction.guild.id },
		defaults: { regularInvites: 0, fakeInvites: 0, leftInvites: 0, paidReferrals: 0, freeOrders: 0, noFeeOrders: 0 },
	});

	if (stats.noFeeOrders < count) {
		return await interaction.reply({
			content: `${user.tag} only has ${stats.noFeeOrders} $5 Order${stats.noFeeOrders !== 1 ? 's' : ''}, cannot remove ${count}.`,
			ephemeral: false
		});
	}

	const oldNF = stats.noFeeOrders;
	stats.noFeeOrders -= count;
	await stats.save();

	const message = `Removed ${count} $5 Order${count > 1 ? 's' : ''} from ${user.tag}. $5 Orders: ${oldNF} → ${stats.noFeeOrders}`;
	await interaction.reply({ content: message, ephemeral: false });

	// Refresh leaderboard after NF change
	updateLeaderboardForGuild(interaction.guild).catch(() => {});
};
