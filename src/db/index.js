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
async function rebuildUsersTableWithCompositeKey(queryInterface, tableDescription) {
        try {
                const indexes = await queryInterface.showIndex('Users').catch(() => []);
                const hasCompositeUnique = indexes.some((index) => {
                        if (!index.unique || !Array.isArray(index.fields)) return false;
                        const fieldNames = index.fields.map((field) => field.attribute || field.name).sort();
                        return fieldNames.length === 2 && fieldNames[0] === 'guildId' && fieldNames[1] === 'userId';
                });
                const hasUserIdOnlyUnique = indexes.some((index) => {
                        if (!index.unique || !Array.isArray(index.fields)) return false;
                        const fieldNames = index.fields.map((field) => field.attribute || field.name);
                        return fieldNames.length === 1 && fieldNames[0] === 'userId';
                });

                if (hasCompositeUnique && !hasUserIdOnlyUnique) {
                        return;
                }

                console.log('🔄 Rebuilding Users table to enforce guild-scoped uniqueness...');

                const columns = {
                        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
                        userId: { type: DataTypes.STRING, allowNull: false },
                        guildId: { type: DataTypes.STRING, allowNull: false },
                        regularInvites: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
                        fakeInvites: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
                        leftInvites: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
                        paidReferrals: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
                        freeOrders: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
                        noFeeOrders: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
                        createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
                        updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
                };

                const columnNames = Object.keys(columns);

                await sequelize.transaction(async (transaction) => {
                        await queryInterface.dropTable('Users_backup', { transaction }).catch(() => {});
                        await queryInterface.renameTable('Users', 'Users_backup', { transaction });
                        await queryInterface.createTable(
                                'Users',
                                columns,
                                {
                                        uniqueKeys: { user_guild_unique: { fields: ['userId', 'guildId'] } },
                                        transaction,
                                },
                        );

                        const selectParts = columnNames.map((name) => {
                                if (tableDescription[name]) return `"${name}"`;
                                if (name === 'createdAt' || name === 'updatedAt') {
                                        return `CURRENT_TIMESTAMP AS "${name}"`;
                                }
                                const defaultValue = columns[name].defaultValue ?? 0;
                                if (typeof defaultValue === 'number') {
                                        return `${defaultValue} AS "${name}"`;
                                }
                                if (typeof defaultValue === 'string') {
                                        return `'${defaultValue}' AS "${name}"`;
                                }
                                if (defaultValue && typeof defaultValue.val === 'string') {
                                        return `${defaultValue.val} AS "${name}"`;
                                }
                                return `NULL AS "${name}"`;
                        });

                        await sequelize.query(
                                `INSERT INTO "Users" (${columnNames.map((name) => `"${name}"`).join(', ')}) SELECT ${selectParts.join(', ')} FROM "Users_backup";`,
                                { transaction },
                        );

                        await queryInterface.dropTable('Users_backup', { transaction });
                });

                console.log('✅ Rebuilt Users table with guild-scoped uniqueness');
        } catch (error) {
                console.error('❌ Failed to rebuild Users table:', error.message);
        }
}

async function migrateDatabase() {
        try {
                const queryInterface = sequelize.getQueryInterface();

                const tableExists = queryInterface.tableExists
                        ? await queryInterface.tableExists('Users')
                        : (await queryInterface.showAllTables())
                                        .map((table) => (typeof table === 'object' ? table.tableName : table))
                                        .includes('Users');

                if (!tableExists) {
                        console.log('ℹ️ Users table not found - it will be created during sync');
                        return;
                }

                let tableDescription = await queryInterface.describeTable('Users');

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

                // Add noFeeOrders column if it doesn't exist
                if (!tableDescription.noFeeOrders) {
                        console.log('🔄 Adding noFeeOrders column...');
                        await queryInterface.addColumn('Users', 'noFeeOrders', {
                                type: sequelize.Sequelize.INTEGER,
                                allowNull: false,
                                defaultValue: 0,
                        });
                        console.log('✅ Added noFeeOrders column');
                }

                // Refresh table description after potential schema changes
                tableDescription = await queryInterface.describeTable('Users');

                // Migrate existing bonusInvites to paidReferrals if bonusInvites column exists
                if (tableDescription.bonusInvites && tableDescription.paidReferrals) {
                        console.log('🔄 Migrating bonusInvites to paidReferrals...');
                        await sequelize.query('UPDATE Users SET paidReferrals = bonusInvites WHERE paidReferrals = 0');
                        console.log('✅ Migrated bonusInvites data');
                }

                await rebuildUsersTableWithCompositeKey(queryInterface, tableDescription);

                console.log('✅ Database migration completed');
        } catch (error) {
                console.error('❌ Migration error:', error.message);
                // Don't throw - let the app continue with sync
        }
}

const User = sequelize.define('User', {
        userId: { type: DataTypes.STRING, allowNull: false },
        guildId: { type: DataTypes.STRING, allowNull: false },
        regularInvites: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        fakeInvites: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        leftInvites: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        paidReferrals: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        freeOrders: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        noFeeOrders: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
}, {
        indexes: [
                {
                        unique: true,
                        fields: ['userId', 'guildId'],
                        name: 'users_userid_guildid_unique',
                },
        ],
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


