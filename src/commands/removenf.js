const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { User } = require('../db');
const { updateLeaderboardForGuild } = require('../utils/leaderboard');

module.exports.data = new SlashCommandBuilder()
	.setName('removenf')
	.setDescription('Remove No Fee Orders (NF) from a user')
	.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
	.addUserOption(opt => opt.setName('user').setDescription('User to remove NF from').setRequired(true))
	.addIntegerOption(opt => opt.setName('count').setDescription('Number of No Fee Orders to remove').setRequired(true).setMinValue(1));

module.exports.execute = async (interaction) => {
	const user = interaction.options.getUser('user');
	const count = interaction.options.getInteger('count');

	const [stats] = await User.findOrCreate({
		where: { userId: user.id, guildId: interaction.guild.id },
		defaults: { regularInvites: 0, fakeInvites: 0, leftInvites: 0, paidReferrals: 0, freeOrders: 0, noFeeOrders: 0 },
	});

	if (stats.noFeeOrders < count) {
		return await interaction.reply({
			content: `${user.tag} only has ${stats.noFeeOrders} No Fee Order${stats.noFeeOrders !== 1 ? 's' : ''}, cannot remove ${count}.`,
			ephemeral: false
		});
	}

	const oldNF = stats.noFeeOrders;
	stats.noFeeOrders -= count;
	await stats.save();

	const message = `Removed ${count} No Fee Order${count > 1 ? 's' : ''} from ${user.tag}. NF: ${oldNF} → ${stats.noFeeOrders}`;
	await interaction.reply({ content: message, ephemeral: false });

	// Refresh leaderboard after NF change
	updateLeaderboardForGuild(interaction.guild).catch(() => {});
};
