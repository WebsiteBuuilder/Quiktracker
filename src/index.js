require('dotenv').config();
const {
	Client,
	GatewayIntentBits,
	Partials,
	PermissionFlagsBits,
} = require('discord.js');
const { sequelize } = require('./db');
const { primeGuildInvites } = require('./utils/inviteCache');
const { deployCommands } = require('./utils/deployCommands');

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildInvites,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
	],
	partials: [Partials.GuildMember, Partials.User, Partials.Channel],
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

	// Force deploy commands on startup
	console.log('🔄 Starting command registration...');
	try {
		const clientId = process.env.CLIENT_ID;
		const guildId = process.env.GUILD_ID;
		const token = process.env.DISCORD_TOKEN;

		console.log(`📝 Using Client ID: ${clientId}`);
		console.log(`🏠 Target Guild ID: ${guildId || 'Not set - commands will only deploy globally'}`);

		if (!clientId || !token) {
			throw new Error('Missing required environment variables: CLIENT_ID and/or DISCORD_TOKEN');
		}

		// Always deploy to guild first for instant testing
		if (guildId) {
			console.log('⚡ Deploying commands to guild (instant)...');
			const guildResult = await deployCommands({
				token,
				clientId,
				guildId,
				scope: 'guild',
				commandsDir: 'src/commands'
			});
			console.log(`✅ Guild commands deployed! Count: ${guildResult.count}`);
		}

		// Then deploy globally
		console.log('🌍 Deploying commands globally...');
		const globalResult = await deployCommands({ 
			token, 
			clientId,
			scope: 'global',
			commandsDir: 'src/commands'
		});
		console.log(`✅ Global commands deployed! Count: ${globalResult.count}`);
		console.log('Note: Global commands can take up to 1 hour to appear in all servers');
	} catch (e) {
		console.error('❌ Command registration failed:', e.message);
		console.error('Full error:', e);
	}
});

// Event wiring
require('./events/inviteCreate')(client);
require('./events/inviteDelete')(client);
require('./events/guildMemberAdd')(client);
require('./events/guildMemberRemove')(client);
require('./events/interactionCreate')(client);

client.login(process.env.DISCORD_TOKEN);


