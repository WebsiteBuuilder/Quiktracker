require('dotenv').config();
const { deployCommands } = require('../src/utils/deployCommands');

async function main() {
	try {
		// Deploy globally (takes up to 1 hour to appear)
		const globalResult = await deployCommands({
			token: process.env.DISCORD_TOKEN,
			clientId: process.env.CLIENT_ID,
			scope: 'global'
		});
		console.log(`✅ Deployed ${globalResult.count} commands globally (may take up to 1 hour)`);

		// Also deploy to specific guild for immediate testing
		const guildId = process.env.GUILD_ID;
		if (guildId) {
			const guildResult = await deployCommands({
				token: process.env.DISCORD_TOKEN,
				clientId: process.env.CLIENT_ID,
				guildId,
				scope: 'guild'
			});
			console.log(`✅ Deployed ${guildResult.count} commands to guild ${guildId} (available immediately)`);
		}
	} catch (err) {
		console.error('❌ Failed to deploy commands:', err.message);
		process.exit(1);
	}
}

main();


