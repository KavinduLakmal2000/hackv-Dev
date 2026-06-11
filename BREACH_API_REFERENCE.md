# BREACH — API Reference

> Base URL: `http://localhost:5000/api`
> Socket URL: `http://localhost:5000`
>
> **Auth:** Protected routes require `Authorization: Bearer <accessToken>` header.
> **Roles:** `🔓 public` · `🔑 player` · `🛡 moderator` · `👑 admin`

---

## Table of Contents

- [Auth](#auth)
- [Users](#users)
- [Lobbies](#lobbies)
- [Game](#game)
- [Admin](#admin)
- [Socket.io — Lobby Events](#socketio--lobby-events)
- [Socket.io — Game Events](#socketio--game-events)

---

## Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/auth/register` | 🔓 | Register a new account |
| `POST` | `/auth/login` | 🔓 | Login with email + password |
| `POST` | `/auth/logout` | 🔑 | Logout, clear refresh cookie, invalidate all tokens |
| `POST` | `/auth/refresh` | 🔓 | Issue new access token using httpOnly refresh cookie |
| `GET`  | `/auth/me` | 🔑 | Get current authenticated user |
| `GET`  | `/auth/google` | 🔓 | Initiate Google OAuth flow |
| `GET`  | `/auth/google/callback` | 🔓 | Google OAuth callback (handled by server) |
| `POST` | `/auth/forgot-password` | 🔓 | Request password reset email |
| `POST` | `/auth/reset-password` | 🔓 | Reset password using token from email |
| `POST` | `/auth/change-password` | 🔑 | Change password (requires current password) |

### POST `/auth/register`
```json
// Body
{
  "username": "ghost_hax",
  "email": "ghost@breach.gg",
  "password": "Secure123",
  "displayName": "Ghost"         // optional
}

// Response 201
{
  "success": true,
  "message": "Account created successfully",
  "data": {
    "accessToken": "<jwt>",
    "user": { "id": "...", "username": "ghost_hax", "role": "player", ... }
  }
}
```

### POST `/auth/login`
```json
// Body
{ "email": "ghost@breach.gg", "password": "Secure123" }

// Response 200
{
  "success": true,
  "data": {
    "accessToken": "<jwt>",
    "user": { ... }
  }
}
// Also sets: httpOnly cookie `breach_refresh`
```

### POST `/auth/refresh`
```json
// No body — reads `breach_refresh` httpOnly cookie automatically

// Response 200
{ "success": true, "data": { "accessToken": "<new_jwt>" } }
```

### POST `/auth/forgot-password`
```json
// Body
{ "email": "ghost@breach.gg" }

// Response 200 (always, even if email doesn't exist — prevents enumeration)
{ "success": true, "message": "If that email exists, a reset link has been sent." }
```

### POST `/auth/reset-password`
```json
// Body
{ "token": "<token_from_email>", "newPassword": "NewSecure456" }
```

### POST `/auth/change-password`
```json
// Body
{ "currentPassword": "Secure123", "newPassword": "NewSecure456" }
```

---

## Users

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET`    | `/users/me` | 🔑 | Get own full profile |
| `PATCH`  | `/users/me` | 🔑 | Update displayName, bio, preferredRole |
| `PATCH`  | `/users/me/avatar` | 🔑 | Update avatar URL |
| `GET`    | `/users/me/stats` | 🔑 | Get own stats + win rate |
| `GET`    | `/users/leaderboard` | 🔓 | Paginated leaderboard |
| `GET`    | `/users/:username` | 🔓 | View a player's public profile |

### PATCH `/users/me`
```json
// Body (all optional)
{
  "displayName": "Ghost v2",
  "bio": "I hack for fun and profit.",
  "preferredRole": "hacker"       // "developer" | "hacker" | "any"
}
```

### PATCH `/users/me/avatar`
```json
// Body
{ "avatarUrl": "https://res.cloudinary.com/breach/image/upload/..." }
// Allowed domains: res.cloudinary.com, lh3.googleusercontent.com, avatars.githubusercontent.com
```

### GET `/users/leaderboard`
```
Query params:
  page=1          (default: 1)
  limit=20        (default: 20, max: 50)
  tier=BLACK_HAT  (optional filter — SCRIPT_KIDDIE | GREY_HAT | BLACK_HAT | ZERO_DAY | APT)

// Response 200
{
  "data": {
    "leaderboard": [
      { "position": 1, "username": "ghost_hax", "rank": { "tier": "APT", "points": 12400 }, ... }
    ],
    "meta": { "total": 842, "page": 1, "limit": 20, "totalPages": 43 }
  }
}
```

---

## Lobbies

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET`    | `/lobbies` | 🔓 | List open public lobbies |
| `GET`    | `/lobbies/me/current` | 🔑 | Get my current active lobby |
| `GET`    | `/lobbies/:code` | 🔓 | Get lobby by 6-char code |
| `POST`   | `/lobbies` | 🔑 | Create a lobby |
| `POST`   | `/lobbies/:code/join` | 🔑 | Join a lobby |
| `POST`   | `/lobbies/:code/leave` | 🔑 | Leave a lobby |
| `PATCH`  | `/lobbies/:code/team` | 🔑 | Switch team |
| `PATCH`  | `/lobbies/:code/ready` | 🔑 | Toggle ready state |
| `PATCH`  | `/lobbies/:code/settings` | 🔑 | Host updates lobby settings |
| `POST`   | `/lobbies/:code/kick/:targetId` | 🔑 | Host kicks a player |
| `POST`   | `/lobbies/:code/start` | 🔑 | Host starts the game |

### GET `/lobbies`
```
Query params:
  mode=1v1      (optional — "1v1" | "5v5" | "training")
  page=1
  limit=20
```

### POST `/lobbies`
```json
// Body
{
  "mode": "1v1",                  // "1v1" | "5v5" | "training"
  "isPrivate": false,
  "password": "hunter2",          // optional, only used if isPrivate: true
  "settings": {
    "roundCount": 5,              // 1–10
    "roundDuration": 120,         // 60–300 seconds
    "startCredits": 500           // 100–2000
  }
}

// Response 201
{
  "data": {
    "lobby": { "code": "X7K2NP", "mode": "1v1", "status": "waiting", "players": [...] }
  }
}
```

### POST `/lobbies/:code/join`
```json
// Body (only needed for private lobbies)
{ "password": "hunter2" }
```

### PATCH `/lobbies/:code/team`
```json
// Body
{ "team": "hacker" }   // "developer" | "hacker"
```

### PATCH `/lobbies/:code/ready`
```json
// Body
{ "ready": true }
```

### PATCH `/lobbies/:code/settings`
```json
// Body (host only, all optional)
{
  "isPrivate": true,
  "password": "newpass",
  "settings": {
    "roundCount": 3,
    "roundDuration": 90,
    "startCredits": 750
  }
}
```

---

## Game

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/game/init/:code` | 🔑 | Create GameSession from lobby (call after lobby start) |
| `GET`  | `/game/:sessionId` | 🔑 | Get role-filtered game state |
| `POST` | `/game/:sessionId/round/start` | 🔑 | Start the current pending round |
| `POST` | `/game/:sessionId/round/expire` | 👑 | Admin force-expire a round |
| `POST` | `/game/:sessionId/defend` | 🔑 | Deploy a defense tool (developer only) |
| `POST` | `/game/:sessionId/secret-word` | 🔑 | Set the secret word for this round (developer only) |
| `POST` | `/game/:sessionId/attack` | 🔑 | Launch an attack tool (hacker only) |
| `POST` | `/game/:sessionId/guess` | 🔑 | Submit a secret word guess (hacker only) |

### POST `/game/init/:code`
```
Params: code = lobby code (e.g. X7K2NP)
Body: empty

// Response 201
{
  "data": {
    "session": {
      "id": "<sessionId>",
      "mode": "1v1",
      "status": "initializing",
      "players": [...],
      "rounds": [...],
      "score": { "developer": 0, "hacker": 0 }
    }
  }
}
```

### GET `/game/:sessionId`
```
Returns role-filtered state:
- Developer sees: their deployed tools, DB health, secret word they set
- Hacker sees:    breach progress, DB health, revealed letters, NOT secret word
```

### POST `/game/:sessionId/defend`
```json
// Body
{ "toolId": "FIREWALL" }

// Valid developer toolIds:
// FIREWALL | ENCRYPTION | HONEYPOT | IDS | VPN_SHIELD
// TWO_FA | WAF | ZERO_TRUST | DECOY_DB

// Response 200
{ "data": { "toolId": "FIREWALL", "creditsRemaining": 420 } }
```

### POST `/game/:sessionId/secret-word`
```json
// Body
{
  "word": "NETWORK",     // 2–20 alphanumeric chars
  "hint": "A layer"      // optional, max 40 chars, shown to hackers
}
```

### POST `/game/:sessionId/attack`
```json
// Body
{ "toolId": "SQL_INJECT" }

// Valid hacker toolIds:
// PORT_SCAN | SQL_INJECT | PING_FLOOD | RECON | BRUTE_FORCE
// STEALTH_MODE | SESSION_HIJACK | DATA_EXFIL | ZERO_DAY_EXPLOIT
// RANSOMWARE | ROOT_ACCESS

// Response 200
{
  "data": {
    "wasBlocked": false,
    "wasDetected": false,
    "damageDealt": 30,
    "breachProgress": 25,
    "dbHealth": 70,
    "creditsRemaining": 370,
    "effects": ["REVEAL_LETTERS:3"],
    "roundWinner": null
  }
}
```

### POST `/game/:sessionId/guess`
```json
// Body
{ "guess": "NETWORK" }

// Response 200
{
  "data": {
    "correct": true,
    "word": "NETWORK"    // only revealed if correct
  }
}
```

---

## Admin

> All admin routes require `👑 admin` role unless marked `🛡 moderator`.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET`    | `/admin/stats` | 👑 | Dashboard stats (users, signups, tiers) |
| `GET`    | `/admin/users` | 🛡 | List all users (paginated, searchable) |
| `GET`    | `/admin/users/:id` | 🛡 | Get full user detail |
| `PATCH`  | `/admin/users/:id` | 👑 | Update user role, credits, status |
| `DELETE` | `/admin/users/:id` | 👑 | Hard delete a user |
| `POST`   | `/admin/users/:id/ban` | 🛡 | Ban a user |
| `POST`   | `/admin/users/:id/unban` | 🛡 | Unban a user |
| `POST`   | `/admin/users/:id/rank` | 👑 | Manually adjust rank points |

### GET `/admin/users`
```
Query params:
  page=1
  limit=20        (max: 100)
  search=ghost    (searches username, email, displayName)
  role=player     (player | moderator | admin)
  banned=false    (true | false)
  sortBy=createdAt  (createdAt | rank.points | username | lastLoginAt)
  order=desc        (asc | desc)
```

### GET `/admin/stats`
```json
// Response 200
{
  "data": {
    "users": {
      "total": 1420,
      "banned": 12,
      "newToday": 34,
      "newThisWeek": 210,
      "newThisMonth": 780,
      "activeToday": 95
    },
    "tiers": {
      "SCRIPT_KIDDIE": 890,
      "GREY_HAT": 340,
      "BLACK_HAT": 142,
      "ZERO_DAY": 40,
      "APT": 8
    }
  }
}
```

### PATCH `/admin/users/:id`
```json
// Body (all optional)
{
  "role": "moderator",          // player | moderator | admin
  "isActive": true,
  "isBanned": false,
  "banReason": "Cheating",
  "credits": 1000,
  "premiumCurrency": 50
}
```

### POST `/admin/users/:id/ban`
```json
// Body
{ "reason": "Exploiting shop bypass" }   // optional
```

### POST `/admin/users/:id/rank`
```json
// Body
{
  "points": -500,                // positive = add, negative = remove
  "reason": "Tournament penalty"
}

// Response 200
{
  "data": {
    "before": { "points": 2000, "tier": "BLACK_HAT" },
    "after":  { "points": 1500, "tier": "GREY_HAT" },
    "delta":  -500
  }
}
```

---

## Socket.io — Lobby Events

> **Connection:** `io('http://localhost:5000', { auth: { token: 'Bearer <accessToken>' } })`
> All socket events use acknowledgment callbacks: `socket.emit(event, data, (ack) => {})`

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `lobby:join` | `{ code }` | Subscribe to lobby room for real-time updates |
| `lobby:leave` | `{ code }` | Unsubscribe from lobby room |
| `lobby:chat` | `{ code, message }` | Send a chat message (max 200 chars) |
| `lobby:ping` | — | Heartbeat, send every 30s |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `lobby:presence` | `{ userId, username, online }` | Player connected or disconnected |
| `lobby:chat` | `{ userId, username, message, timestamp }` | New chat message |
| `lobby:player_joined` | `{ player, lobby }` | Someone joined the lobby |
| `lobby:player_left` | `{ userId, newHostId, lobby }` | Someone left (host may have changed) |
| `lobby:player_kicked` | `{ kickedUserId, lobby }` | Host kicked a player |
| `lobby:team_changed` | `{ userId, team, lobby }` | A player switched teams |
| `lobby:ready_changed` | `{ userId, isReady, allReady, lobby }` | Ready state changed |
| `lobby:settings_updated` | `{ lobby }` | Host changed lobby settings |
| `lobby:game_starting` | `{ lobbyCode, mode, players, settings }` | Game is about to begin |

---

## Socket.io — Game Events

> After `lobby:game_starting`, client calls `POST /api/game/init/:code` then connects to game room.
> Room naming: `game:{sessionId}` · `game:{sessionId}:developer` · `game:{sessionId}:hacker`

### Client → Server

| Event | Payload | Auth | Description |
|-------|---------|------|-------------|
| `game:join` | `{ sessionId }` | 🔑 | Join game rooms, receive initial role-filtered state |
| `game:start_round` | `{ sessionId }` | 🔑 | Start the current pending round (any player) |
| `game:deploy` | `{ sessionId, toolId }` | 🔑 developer | Deploy a defense tool |
| `game:attack` | `{ sessionId, toolId }` | 🔑 hacker | Launch an attack |
| `game:set_secret_word` | `{ sessionId, word, hint? }` | 🔑 developer | Set round secret word |
| `game:guess` | `{ sessionId, guess }` | 🔑 hacker | Guess the secret word |
| `game:chat` | `{ sessionId, message }` | 🔑 | Team-only in-game chat |
| `game:request_state` | `{ sessionId }` | 🔑 | Re-sync state (use after reconnect) |

### Server → Client (All players)

| Event | Payload | Description |
|-------|---------|-------------|
| `game:tick` | `{ remaining }` | Countdown tick every second |
| `game:timer_warning` | `{ remaining }` | Fires at 30s, 10s, 5s remaining |
| `game:round_finished` | `{ roundNumber, winner, condition, score, secretWord }` | Round ended — secret word revealed to all |
| `game:switching_sides` | `{ score, message }` | Teams swap after round 5 |
| `game:finished` | `{ winner, score, players }` | Game over |
| `game:player_disconnected` | `{ userId, username, team }` | A player dropped |

### Server → Developer team only

| Event | Payload | Description |
|-------|---------|-------------|
| `game:round_started` | `{ roundNumber, endsAt, myTeam, enemyTeam, dbHealth, secretWord }` | Round begins (includes secret word they set) |
| `game:tool_deployed` | `{ deployedBy, toolId, toolName, layer, creditCost }` | Own tool deployed |
| `game:secret_word_confirmed` | `{ word, hint }` | Confirms their word was saved |
| `game:attack_incoming` | `{ wasBlocked, blockedBy, wasDetected, dbHealth, effects }` | Incoming attack result |

### Server → Hacker team only

| Event | Payload | Description |
|-------|---------|-------------|
| `game:round_started` | `{ roundNumber, endsAt, myTeam, enemyTeam, breachProgress, secretWordHint, secretWordLength }` | Round begins (no secret word) |
| `game:attack_result` | `{ toolId, wasBlocked, damageDealt, breachProgress, dbHealth, effects, creditsRemaining }` | Own attack result |
| `game:defense_added` | `{ layer }` | A defense was deployed (layer only, not which tool) |
| `game:secret_word_set` | `{ hint, length }` | Dev set a word (hint + char count only) |
| `game:letters_revealed` | `{ masked, revealedIndices }` | Data Exfil revealed letters e.g. `"N_T_O_K"` |

### Server → All (credit tick, every 10s)

| Event | Payload | Description |
|-------|---------|-------------|
| `game:credit_tick` | `{ playerCredits: [{ userId, credits }] }` | Passive income applied to all players |

---

## Standard Response Envelope

All REST responses follow this shape:

```json
// Success
{
  "success": true,
  "message": "OK",
  "data": { ... },
  "meta": { ... }       // pagination info where applicable
}

// Error
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Invalid email address" }
  ]
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| `200` | OK |
| `201` | Created |
| `204` | No content (logout) |
| `400` | Bad request / validation error |
| `401` | Unauthorized (missing/expired token) |
| `403` | Forbidden (wrong role) |
| `404` | Not found |
| `409` | Conflict (duplicate email, already in lobby, etc.) |
| `429` | Rate limited |
| `500` | Internal server error |

---

## Rate Limits

| Scope | Limit |
|-------|-------|
| Global API | 200 requests / 15 min / IP |
| `POST /auth/login` | 20 requests / 15 min / IP (failures only) |
| `POST /auth/register` | 20 requests / 15 min / IP |
| `POST /auth/forgot-password` | 20 requests / 15 min / IP |
| Socket `game:attack` | 5 events / 5s / socket |
| Socket `game:deploy` | 10 events / 10s / socket |
| Socket `game:guess` | 3 events / 10s / socket |
| Socket `lobby:chat` | 5 events / 3s / socket |

---

## Tool IDs Reference

### Developer Tools

| ID | Name | Cost | Tier | Counters |
|----|------|------|------|----------|
| `FIREWALL` | Firewall | 80 | 1 | PORT_SCAN, PING_FLOOD |
| `ENCRYPTION` | Encryption | 100 | 1 | SQL_INJECT, DATA_EXFIL |
| `HONEYPOT` | Honeypot | 120 | 1 | SQL_INJECT |
| `IDS` | IDS | 150 | 2 | PORT_SCAN, RECON |
| `VPN_SHIELD` | VPN Shield | 180 | 2 | PING_FLOOD, DDOS |
| `TWO_FA` | 2FA Gate | 200 | 2 | BRUTE_FORCE, CREDENTIAL_STUFFING |
| `WAF` | WAF | 250 | 3 | SQL_INJECT, XSS_INJECT, COMMAND_INJECT |
| `ZERO_TRUST` | Zero Trust | 300 | 3 | BRUTE_FORCE, SESSION_HIJACK |
| `DECOY_DB` | Decoy DB | 280 | 3 | DATA_EXFIL, SQL_INJECT |

### Hacker Tools

| ID | Name | Cost | Tier | Effect |
|----|------|------|------|--------|
| `PORT_SCAN` | Port Scan | 60 | 1 | Reveals a random active defense tool |
| `SQL_INJECT` | SQL Inject | 80 | 1 | 30 dmg, +15% breach progress |
| `PING_FLOOD` | Ping Flood | 70 | 1 | 15 dmg, -20% enemy block chance for 10s |
| `RECON` | Recon | 50 | 1 | Passive — reveals DB structure over 20s |
| `BRUTE_FORCE` | Brute Force | 120 | 2 | 45 dmg, +20% breach progress |
| `STEALTH_MODE` | Stealth Mode | 150 | 2 | Next 2 attacks bypass IDS detection |
| `SESSION_HIJACK` | Session Hijack | 180 | 2 | Bypasses auth layer, +30% breach progress |
| `DATA_EXFIL` | Data Exfil | 160 | 2 | Reveals 3 secret word letters on success |
| `ZERO_DAY_EXPLOIT` | Zero Day | 280 | 3 | Destroys 1 random defense tool, unblockable |
| `RANSOMWARE` | Ransomware | 260 | 3 | Locks developer tools for 20s |
| `ROOT_ACCESS` | Root Access | 350 | 3 | +100% breach progress, instant win if undetected |

---

## Rank Tiers

| Tier | Points Required |
|------|----------------|
| `SCRIPT_KIDDIE` | 0 |
| `GREY_HAT` | 500 |
| `BLACK_HAT` | 1,500 |
| `ZERO_DAY` | 4,000 |
| `APT` | 10,000 |

**Points per game:** Win +30 · Loss −15 · Draw +10
**Bonuses:** 5v5 mode ×1.5 · Secret word exposed/protected +10 · Full 5 rounds +5
**Training mode:** No rank points awarded
