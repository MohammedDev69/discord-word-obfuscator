# Discord Obfuscator & Community Bot

A production-ready Discord bot built with **discord.js v14** and **Node.js** featuring dual command support (**Slash Commands** and **Prefix Commands**), automated moderation with persistent warnings, post obfuscation to bypass filters, order tickets, and self-role management.

---

## Features

### 1. Text Obfuscation & Camouflage
- Interactive panel button with a 2000-character modal.
- Automatically substitutes sensitive keywords (e.g., nitro, accounts, exchange, selling) with camouflaged variants to evade aggressive auto-filters.
- Returns the obfuscated result privately to the user (`ephemeral`).

### 2. Auto-Moderation & Persistent Warnings
- Monitors configured channels for prohibited keywords.
- Automatically deletes offending messages.
- Assigns progressive warning roles (`warn 1`, `warn 2`, `warn 3`).
- Sends instant DM alerts to users and detailed red embeds to the log channel.
- Enforces maximum punishment when warning threshold is reached (strips all roles and assigns preserved role).
- **Persistent storage**: Warnings are saved in `data/warnings.json` and persist across bot restarts.

### 3. Orders & Ticket System
- Modal form for buyers to specify requested item and budget/details.
- Alerts sellers in a dedicated channel with a claim button.
- Automatically generates private ticket channels with restricted permissions between buyer and claimer.
- Ticket close button with countdown and audit logging before deletion.

### 4. Toggle Self-Role Button
- Single-click role assignment button.
- Toggles role status: adds if missing, removes if already held.
- Built-in permission hierarchy checks.

---

## Commands

Both Slash Commands (`/`) and Prefix Commands (`+` or `!`) are supported.

| Slash Command | Prefix Command | Required Permission | Description |
| :--- | :--- | :--- | :--- |
| `/help` | `+help` | Everyone | Displays command guide |
| `/ping` | `+ping` | Everyone | Checks bot and API latency |
| `/encode` | `+encode` or `+تشفير` | Manage Messages | Sends text obfuscator panel |
| `/order` | `+order` or `+طلب` | Manage Messages | Sends product order panel |
| `/role` | `+role` or `+button` | Manage Roles | Sends self-role claim button |
| `/warnings [user]` | `+warnings [@user]` | Everyone | Views warning history |
| `/clearwarns <user>` | `+clearwarns <@user>` | Manage Server | Clears warnings for a user |

---

## Configuration

Set your bot token in `.env`:
```env
DISCORD_TOKEN=your_bot_token_here
```

Configure your channels, roles, and monitored keywords in `config.json`:
- `prefix`: Command prefix (default: `+`).
- `automod.monitoredChannels`: Array of channel IDs to monitor.
- `automod.logChannelId`: Audit log channel ID.
- `automod.warnRoleIds`: Role IDs for each warning tier.
- `tickets.ordersChannelId`: Channel ID where order alerts are posted.
- `tickets.ticketCategoryId`: Category ID where ticket channels are created.
- `tickets.sellersRoleId`: Seller role ID to mention.
- `roles.buttonRoleId`: Target role ID for the button role.

---

## Running the Bot

```bash
npm start
# or
node index.js
```
