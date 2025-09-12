require('dotenv').config();
const {
	Client,
	GatewayIntentBits,
	Partials,
	PermissionFlagsBits,
} = require('discord.js');
const { sequelize, migrateDatabase } = require('./db');
const { primeGuildInvites } = require('./utils/inviteCache');
const { updateLeaderboardForGuild } = require('./utils/leaderboard');
const { deployCommands, clearCommands } = require('./utils/deployCommands');

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
		// Run migration first to add new columns
		await migrateDatabase();
		
		// Then sync the database
		await sequelize.sync();
		console.log('📁 Database synced successfully');
	} catch (err) {
		console.error('❌ Database sync failed:', err);
	}
	
	for (const guild of client.guilds.cache.values()) {
		console.log(`🔄 Priming invites for guild: ${guild.name} (${guild.id})`);
		await primeGuildInvites(guild);
		// Render leaderboard once at startup
		await updateLeaderboardForGuild(guild).catch(() => {});
	}
	
	console.log('🎯 Bot is ready and tracking invites!');

	// Deploy commands on startup (guild-only by default)
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

		// Optional cleanup
		if (String(process.env.CLEAR_GLOBAL_COMMANDS || '').toLowerCase() === 'true') {
			console.log('🧹 Clearing global commands...');
			await clearCommands({ token, clientId, scope: 'global' });
			console.log('✅ Cleared global commands');
		}

		// Deploy to guild first for instant testing
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

		// Optional global deployment if explicitly enabled
		if (String(process.env.DEPLOY_GLOBAL_COMMANDS || '').toLowerCase() === 'true') {
			console.log('🌍 Deploying commands globally...');
			const globalResult = await deployCommands({ 
				token, 
				clientId,
				scope: 'global',
				commandsDir: 'src/commands'
			});
			console.log(`✅ Global commands deployed! Count: ${globalResult.count}`);
			console.log('Note: Global commands can take up to 1 hour to appear in all servers');
		}
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


