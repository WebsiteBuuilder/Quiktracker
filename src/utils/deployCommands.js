const fs = require('fs');
const path = require('path');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');

function loadCommands(commandsDir) {
	const commandsPath = path.isAbsolute(commandsDir)
		? commandsDir
		: path.join(process.cwd(), commandsDir);
	const files = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));
	const payload = [];
	for (const file of files) {
		const mod = require(path.join(commandsPath, file));
		if (mod?.data?.toJSON) payload.push(mod.data.toJSON());
	}
	return payload;
}

async function deployCommands({ token, clientId, commandsDir = 'src/commands', scope = 'global', guildId }) {
	if (!token) throw new Error('Missing bot token');
	if (!clientId) throw new Error('Missing clientId');
	const rest = new REST({ version: '10' }).setToken(token);
	const body = loadCommands(commandsDir);
	if (scope === 'guild') {
		if (!guildId) throw new Error('Guild scope requires guildId');
		await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body });
		return { count: body.length, scope: 'guild', guildId };
	}
	await rest.put(Routes.applicationCommands(clientId), { body });
	return { count: body.length, scope: 'global' };
}

module.exports = { deployCommands };


