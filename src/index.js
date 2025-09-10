require('dotenv').config();
const {
	Client,
	GatewayIntentBits,
	Partials,
} = require('discord.js');
const { sequelize } = require('./db');
const { primeGuildInvites } = require('./utils/inviteCache');

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildInvites,
	],
	partials: [Partials.GuildMember, Partials.User],
});

client.once('ready', async () => {
	console.log(`Logged in as ${client.user.tag}`);
	await sequelize.sync();
	for (const guild of client.guilds.cache.values()) {
		await primeGuildInvites(guild);
	}
});

// Event wiring
require('./events/inviteCreate')(client);
require('./events/inviteDelete')(client);
require('./events/guildMemberAdd')(client);
require('./events/guildMemberRemove')(client);
require('./events/interactionCreate')(client);

client.login(process.env.DISCORD_TOKEN);


