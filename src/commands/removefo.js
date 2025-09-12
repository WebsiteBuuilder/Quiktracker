const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { User } = require('../db');
const { updateLeaderboardForGuild } = require('../utils/leaderboard');

module.exports.data = new SlashCommandBuilder()
	.setName('removefo')
	.setDescription('Manually remove Free Orders (FO) from a user')
	.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
	.addUserOption(opt => opt.setName('user').setDescription('User to remove FO from').setRequired(true))
	.addIntegerOption(opt => opt.setName('count').setDescription('Number of Free Orders to remove').setRequired(true).setMinValue(1));

module.exports.execute = async (interaction) => {
	const user = interaction.options.getUser('user');
	const count = interaction.options.getInteger('count');
	
	const [stats] = await User.findOrCreate({
		where: { userId: user.id, guildId: interaction.guild.id },
		defaults: { regularInvites: 0, fakeInvites: 0, leftInvites: 0, paidReferrals: 0, freeOrders: 0 },
	});
	
	if (stats.freeOrders < count) {
		return await interaction.reply({ 
			content: `${user.tag} only has ${stats.freeOrders} Free Order${stats.freeOrders !== 1 ? 's' : ''}, cannot remove ${count}.`, 
			ephemeral: false 
		});
	}
	
	const oldFO = stats.freeOrders;
	stats.freeOrders -= count;
	await stats.save();
	
	const message = `Removed ${count} Free Order${count > 1 ? 's' : ''} from ${user.tag}. FO: ${oldFO} → ${stats.freeOrders}`;
	await interaction.reply({ content: message, ephemeral: false });

	// Refresh leaderboard after FO manual change
	updateLeaderboardForGuild(interaction.guild).catch(() => {});
};
