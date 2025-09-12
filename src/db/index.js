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

// Migration function to add new columns if they don't exist
async function migrateDatabase() {
	try {
		const queryInterface = sequelize.getQueryInterface();
		const tableDescription = await queryInterface.describeTable('Users');
		
		// Add paidReferrals column if it doesn't exist
		if (!tableDescription.paidReferrals) {
			console.log('🔄 Adding paidReferrals column...');
			await queryInterface.addColumn('Users', 'paidReferrals', {
				type: sequelize.Sequelize.INTEGER,
				allowNull: false,
				defaultValue: 0,
			});
			console.log('✅ Added paidReferrals column');
		}
		
		// Add freeOrders column if it doesn't exist
		if (!tableDescription.freeOrders) {
			console.log('🔄 Adding freeOrders column...');
			await queryInterface.addColumn('Users', 'freeOrders', {
				type: sequelize.Sequelize.INTEGER,
				allowNull: false,
				defaultValue: 0,
			});
			console.log('✅ Added freeOrders column');
		}
		
		// Migrate existing bonusInvites to paidReferrals if bonusInvites column exists
		if (tableDescription.bonusInvites && tableDescription.paidReferrals) {
			console.log('🔄 Migrating bonusInvites to paidReferrals...');
			await sequelize.query('UPDATE Users SET paidReferrals = bonusInvites WHERE paidReferrals = 0');
			console.log('✅ Migrated bonusInvites data');
		}
		
		console.log('✅ Database migration completed');
	} catch (error) {
		console.error('❌ Migration error:', error.message);
		// Don't throw - let the app continue with sync
	}
}

const User = sequelize.define('User', {
	userId: { type: DataTypes.STRING, allowNull: false, unique: true },
	guildId: { type: DataTypes.STRING, allowNull: false },
	regularInvites: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
	fakeInvites: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
	leftInvites: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
	paidReferrals: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
	freeOrders: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
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
	migrateDatabase,
};


