const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { User } = require('../db');

module.exports.data = new SlashCommandBuilder()
	.setName('invites')
	.setDescription('Show invite statistics for a user')
	.addUserOption(opt => opt.setName('user').setDescription('User to check').setRequired(false));

module.exports.execute = async (interaction) => {
	const user = interaction.options.getUser('user') || interaction.user;
	const stats = await User.findOne({ where: { userId: user.id, guildId: interaction.guild.id } });
	const regular = stats?.regularInvites ?? 0;
	const fake = stats?.fakeInvites ?? 0;
	const left = stats?.leftInvites ?? 0;
	const pf = stats?.paidReferrals ?? 0;
	const fo = stats?.freeOrders ?? 0;
	const nf = stats?.noFeeOrders ?? 0;
	const total = regular - fake - left + pf;

	const embed = new EmbedBuilder()
		.setTitle(`Invites for ${user.tag}`)
		.addFields(
			{ name: 'Regular', value: String(regular), inline: true },
			{ name: 'Fake', value: String(fake), inline: true },
			{ name: 'Left', value: String(left), inline: true },
			{ name: 'PF', value: String(pf), inline: true },
			{ name: 'FO', value: String(fo), inline: true },
			{ name: 'NF', value: String(nf), inline: true },
		)
		.setColor(0x5865F2);

	await interaction.reply({ embeds: [embed], ephemeral: false });
};


