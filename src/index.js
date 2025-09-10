require('dotenv').config();
const {
	Client,
	GatewayIntentBits,
	Partials,
} = require('discord.js');
const { sequelize } = require('./db');
const { primeGuildInvites } = require('./utils/inviteCache');
const { deployCommands } = require('./utils/deployCommands');

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildInvites,
	],
	partials: [Partials.GuildMember, Partials.User],
});

client.once('ready', async () => {
	console.log(`✅ Logged in as ${client.user.tag}`);
	console.log(`📊 Connected to ${client.guilds.cache.size} guild(s)`);
	
	try {
		await sequelize.sync();
		console.log('📁 Database synced successfully');
	} catch (err) {
		console.error('❌ Database sync failed:', err);
	}
	
	for (const guild of client.guilds.cache.values()) {
		console.log(`🔄 Priming invites for guild: ${guild.name} (${guild.id})`);
		await primeGuildInvites(guild);
	}
	
	console.log('🎯 Bot is ready and tracking invites!');

	// Optional: auto-deploy commands on start
	if (String(process.env.DEPLOY_COMMANDS_ON_START || '').toLowerCase() === 'true') {
		try {
			const clientId = process.env.CLIENT_ID;
			const guildId = process.env.GUILD_ID;
			const token = process.env.DISCORD_TOKEN;
			const scope = process.env.COMMAND_DEPLOY_SCOPE === 'guild' ? 'guild' : 'global';
			const result = await deployCommands({ token, clientId, commandsDir: 'src/commands', scope, guildId });
			console.log(`🚀 Auto-deployed ${result.count} ${result.scope} command(s)` + (result.guildId ? ` to guild ${result.guildId}` : ''));
		} catch (e) {
			console.error('❌ Auto-deploy failed:', e);
		}
	}
});

// Event wiring
require('./events/inviteCreate')(client);
require('./events/inviteDelete')(client);
require('./events/guildMemberAdd')(client);
require('./events/guildMemberRemove')(client);
require('./events/interactionCreate')(client);

client.login(process.env.DISCORD_TOKEN);


