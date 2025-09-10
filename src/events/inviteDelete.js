const { removeInvite } = require('../utils/inviteCache');

module.exports = (client) => {
	client.on('inviteDelete', (invite) => {
		removeInvite(invite.guild.id, invite.code);
	});
};


