const { updateInviteUse } = require('../utils/inviteCache');

module.exports = (client) => {
	client.on('inviteCreate', (invite) => {
		updateInviteUse(invite.guild.id, invite.code, invite.uses ?? 0);
	});
};


