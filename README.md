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
   ```
4. Register slash commands:
   ```bash
   npm run deploy-commands
   ```
   By default we deploy to your guild for instant testing (set `GUILD_ID`). Global deploy is optional.
5. Start the bot:
   ```bash
   npm start
   ```

Key Commands
------------
- `/invites [user]` — Show a user's invite statistics (regular, fake, left, PF, FO, total).
- `/addpf user:<user>` — Add 1 Paid Referral (PF) to a user. Users get 1 Free Order (FO) for every 3 PF.

Features
--------
- Tracks invite uses with caching and reconciliation on join/leave.
- Filters fake invites (configurable account age threshold, default 5 days).
- Tracks leavers and decrements inviter's verified count.
- PF/FO reward system: Users automatically get 1 Free Order (FO) for every 3 Paid Referrals (PF).
- Vouchy integration: Automatically awards 1 point via `/addpoints` for each successful invite.
- Real-time stats: regular, fake, left, PF, FO, total.
- Optional join announcements: set `INVITE_ANNOUNCE_CHANNEL_ID` to announce who invited whom and which code was used.
 - Vouchy integration: configure `VOUCHY_CHANNEL_ID`, `VOUCHY_PREFIX`, and/or `VOUCHY_BOT_ID` for reliable command execution. Set `VOUCHY_USE_WEBHOOK=true` to also try webhook delivery.
 - Live leaderboard: bot pins a single message with top inviters and updates it automatically on joins/leaves and PF/FO changes. Set `LEADERBOARD_CHANNEL_ID` (falls back to `INVITE_ANNOUNCE_CHANNEL_ID` or system channel).

Railway Deployment
------------------
1. Push this project to GitHub (e.g., `WebsiteBuuilder/Quiktracker`).
2. In Railway, create a new project and link your GitHub repo.
3. Add environment variables from above to Railway.
4. Set the start command to `npm start` (Railway can infer from package.json).
5. Deploy. Logs will show when the bot is online.
6. Storage: By default, the SQLite file will be at `/data/database.sqlite` on Railway if the `/data` volume exists. You can override with `SQLITE_STORAGE`.
7. To enable announcements, add `INVITE_ANNOUNCE_CHANNEL_ID` with the target text channel ID.

Command Deployment Options
----------------------------------
Control deployment behavior via env variables:
```
GUILD_ID=your_guild_id              # recommended for instant commands
DEPLOY_GLOBAL_COMMANDS=false        # set true to also deploy globally
CLEAR_GLOBAL_COMMANDS=true          # set true once to clear duplicates
LEADERBOARD_CHANNEL_ID=channel_id   # optional dedicated leaderboard channel
```

Notes
-----
- Ensure the bot has `View Audit Log` and `Manage Guild` permissions.
- Commands are deployed globally by default; allow up to 1 hour for propagation.
