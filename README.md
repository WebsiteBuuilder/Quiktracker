Quiktracker - Discord Invite Tracker Bot
=======================================

A Discord.js v14 bot with SQLite (via Sequelize) that tracks server invites, filters fake invites and leavers, supports manual paid referral credits, awards a reward after 3 verified invites, and exposes slash commands for real-time statistics. Designed for Railway deployment.

Setup
-----
1. Node.js 18+ recommended.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment:
   Create `.env` with:
   ```
   DISCORD_TOKEN=your_bot_token
   CLIENT_ID=your_application_id
   GUILD_ID=your_guild_id_for_dev
   REWARD_ROLE_ID=role_id_to_grant_on_threshold
   INVITE_THRESHOLD=3
   ```
4. Register slash commands (global):
   ```bash
   npm run deploy-commands
   ```
   Global deploy is enabled. It may take up to 1 hour for commands to appear everywhere.
   - You can also auto-deploy on startup by setting `DEPLOY_COMMANDS_ON_START=true` (see below).
5. Start the bot:
   ```bash
   npm start
   ```

Key Commands
------------
- `/invites [user]` — Show a user's invite statistics (regular, fake, left, bonus, total).
- `/addreferral user:<user> count:<int>` — Add manual paid referrals (bonus) to a user.
- `/addreferall user:<user> count:<int>` — Alias spelling for convenience.

Features
--------
- Tracks invite uses with caching and reconciliation on join/leave.
- Filters fake invites (configurable account age threshold, default 5 days).
- Tracks leavers and decrements inviter's verified count.
- Awards a role after `INVITE_THRESHOLD` verified invites.
- Real-time stats similar to invite-tracker style: regular, fake, left, bonus, total.
- Optional join announcements: set `INVITE_ANNOUNCE_CHANNEL_ID` to announce who invited whom and which code was used.

Railway Deployment
------------------
1. Push this project to GitHub (e.g., `WebsiteBuuilder/Quiktracker`).
2. In Railway, create a new project and link your GitHub repo.
3. Add environment variables from above to Railway.
4. Set the start command to `npm start` (Railway can infer from package.json).
5. Deploy. Logs will show when the bot is online.
6. Storage: By default, the SQLite file will be at `/data/database.sqlite` on Railway if the `/data` volume exists. You can override with `SQLITE_STORAGE`.
7. To enable announcements, add `INVITE_ANNOUNCE_CHANNEL_ID` with the target text channel ID.

Auto Command Deployment (optional)
----------------------------------
Add the following variables in Railway to deploy commands automatically on startup:
```
DEPLOY_COMMANDS_ON_START=true
COMMAND_DEPLOY_SCOPE=global   # or 'guild' if you want to target a single guild
# If using guild scope:
# GUILD_ID=your_guild_id
```

Notes
-----
- Ensure the bot has `Manage Roles`, `View Audit Log`, and `Manage Guild` permissions and the role hierarchy allows granting the reward role.
- Commands are deployed globally by default; allow up to 1 hour for propagation.
