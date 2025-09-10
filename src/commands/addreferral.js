const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { User } = require('../db');

module.exports.data = new SlashCommandBuilder()
	.setName('addreferral')
	.setDescription('Manually add paid referral credits (bonus invites) to a user')
	.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
	.addUserOption(opt => opt.setName('user').setDescription('User to credit').setRequired(true))
	.addIntegerOption(opt => opt.setName('count').setDescription('Number of bonus invites').setRequired(true));

module.exports.execute = async (interaction) => {
	const user = interaction.options.getUser('user');
	const count = interaction.options.getInteger('count');
	const [stats] = await User.findOrCreate({
		where: { userId: user.id, guildId: interaction.guild.id },
		defaults: { regularInvites: 0, fakeInvites: 0, leftInvites: 0, bonusInvites: 0 },
	});
	stats.bonusInvites += count;
	await stats.save();
	await interaction.reply({ content: `Added ${count} bonus invites to ${user.tag}.`, ephemeral: false });
};


