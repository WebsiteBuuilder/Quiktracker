require('dotenv').config();
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const fs = require('fs');
const path = require('path');

const commandsPath = path.join(process.cwd(), 'src', 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
const commands = [];
for (const file of commandFiles) {
	const cmd = require(path.join(commandsPath, file));
	if (cmd?.data?.toJSON) commands.push(cmd.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

async function main() {
	const clientId = process.env.CLIENT_ID;
	const guildId = process.env.GUILD_ID;
	if (!clientId || !guildId) {
		console.error('CLIENT_ID and GUILD_ID must be set in .env for guild command deploy');
		process.exit(1);
	}
	console.log(`Deploying ${commands.length} commands to guild ${guildId}...`);
	await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
	console.log('Commands deployed.');
}

main().catch(err => {
	console.error(err);
	process.exit(1);
});


