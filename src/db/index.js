const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');
const fs = require('fs');

function resolveStoragePath() {
	const envPath = process.env.SQLITE_STORAGE || process.env.SQLITE_FILE || process.env.DATABASE_FILE;
	if (envPath) return path.isAbsolute(envPath) ? envPath : path.join(process.cwd(), envPath);
	const dataDir = process.env.DATA_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH || '/data';
	try {
		if (fs.existsSync(dataDir)) return path.join(dataDir, 'database.sqlite');
	} catch {}
	return path.join(process.cwd(), 'database.sqlite');
}

const sequelize = new Sequelize({
	dialect: 'sqlite',
	storage: resolveStoragePath(),
	logging: false,
});

const User = sequelize.define('User', {
	userId: { type: DataTypes.STRING, allowNull: false, unique: true },
	guildId: { type: DataTypes.STRING, allowNull: false },
	regularInvites: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
	fakeInvites: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
	leftInvites: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
	bonusInvites: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
});

const JoinLog = sequelize.define('JoinLog', {
	guildId: { type: DataTypes.STRING, allowNull: false },
	memberId: { type: DataTypes.STRING, allowNull: false },
	inviterId: { type: DataTypes.STRING, allowNull: true },
	inviteCode: { type: DataTypes.STRING, allowNull: true },
	isFake: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
});

module.exports = {
	sequelize,
	User,
	JoinLog,
};


