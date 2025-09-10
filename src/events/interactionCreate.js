const fs = require('fs');
const path = require('path');

module.exports = (client) => {
	const commands = new Map();
	const commandsPath = path.join(process.cwd(), 'src', 'commands');
	for (const file of fs.readdirSync(commandsPath)) {
		if (!file.endsWith('.js')) continue;
		const mod = require(path.join(commandsPath, file));
		if (mod?.data?.name && typeof mod.execute === 'function') {
			commands.set(mod.data.name, mod);
		}
	}

	console.log(`🔧 Loaded ${commands.size} commands: ${Array.from(commands.keys()).join(', ')}`);
	
	client.on('interactionCreate', async (interaction) => {
		if (!interaction.isChatInputCommand()) return;
		console.log(`💬 Command received: /${interaction.commandName} by ${interaction.user.tag}`);
		const cmd = commands.get(interaction.commandName);
		if (!cmd) {
			console.log(`❌ Unknown command: ${interaction.commandName}`);
			return;
		}
		try {
			await cmd.execute(interaction);
			console.log(`✅ Command executed successfully: ${interaction.commandName}`);
		} catch (err) {
			console.error('❌ Error executing command:', err);
			if (interaction.deferred || interaction.replied) {
				await interaction.followUp({ content: 'There was an error executing this command.', ephemeral: true });
			} else {
				await interaction.reply({ content: 'There was an error executing this command.', ephemeral: true });
			}
		}
	});
	return commands;
};


