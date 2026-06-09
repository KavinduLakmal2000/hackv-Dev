Slice 1 → Auth (register, Google OAuth, login, JWT)
Slice 2 → User Profile + Roles (player, admin)
Slice 3 → Lobby System (create/join room, modes: 1v1, 5v5, training)
Slice 4 → Game Session (round logic, credits, roles, timer)
Slice 5 → Real-time Engine (Socket.io game events, attack/defend actions)
Slice 6 → Tools & Shop (buy tools, server-side validation, anti-cheat)
Slice 7 → Admin Panel (dashboard, email system, ranking control)
Slice 8 → Security Layer (rate limiting, obfuscation, server-side game state)

POST /api/auth/register  →  { username, email, password }
POST /api/auth/login     →  { email, password }
GET  /api/auth/me        →  Bearer <accessToken>
GET  /api/health         →  { status: "online" }

# Player
GET    /api/users/me              → my full profile
PATCH  /api/users/me              → update displayName, bio, preferredRole
PATCH  /api/users/me/avatar       → update avatar URL
GET    /api/users/me/stats        → wins, losses, win rate
GET    /api/users/leaderboard     → top players (public)
GET    /api/users/:username       → public profile (public)


# Admin
GET    /api/admin/stats           → dashboard numbers
GET    /api/admin/users           → paginated user list (search, filter)
GET    /api/admin/users/:id       → full user detail
PATCH  /api/admin/users/:id       → update role / credits / status
DELETE /api/admin/users/:id       → hard delete
POST   /api/admin/users/:id/ban   → ban with reason
POST   /api/admin/users/:id/unban → lift ban
POST   /api/admin/users/:id/rank  → manually adjust rank points

controllers/userController.jsProfile view/edit, avatar, public profile, leaderboard, statscontrollers/adminController.jsUser list, ban/unban, role change, rank adjust, dashboard statsroutes/users.jsAll /api/users/* endpointsroutes/admin.jsAll /api/admin/* endpointsvalidators/user.jsZod schemas for profile updates + admin actionsutils/rank.jsTier system, point calculations, rank delta logic
Updated files

models/User.js — added bio and preferredRole fields
server.js — registered /api/users and /api/admin routes


# Full lobby API
GET  /api/lobbies              → browse public open lobbies
GET  /api/lobbies/me/current   → what lobby am I in?
GET  /api/lobbies/:code        → lobby details by code
POST /api/lobbies              → create lobby
POST /api/lobbies/:code/join   → join by code (+ password if private)
POST /api/lobbies/:code/leave  → leave (auto-promotes host)
PATCH /api/lobbies/:code/team  → pick developer or hacker team
PATCH /api/lobbies/:code/ready → toggle ready
PATCH /api/lobbies/:code/settings → host updates round/credits/privacy
POST /api/lobbies/:code/kick/:id  → host kicks a player
POST /api/lobbies/:code/start     → host starts (all must be ready)

models/Lobby.jsFull lobby schema — players, teams, status, settings, TTLcontrollers/lobbyController.jsAll 10 lobby actionsroutes/lobbies.jsAll /api/lobbies/* endpointsvalidators/lobby.jsZod schemas for every lobby actionutils/lobbyCode.jsCollision-safe 6-char code generator

# full game api

POST /api/game/init/:code          → create GameSession from lobby
GET  /api/game/:sessionId          → role-filtered game state
POST /api/game/:sessionId/round/start  → start the round
POST /api/game/:sessionId/defend       → deploy a defense tool
POST /api/game/:sessionId/attack       → launch an attack
POST /api/game/:sessionId/secret-word  → developer sets secret word
POST /api/game/:sessionId/guess        → hacker submits word guess
POST /api/game/:sessionId/round/expire → admin/timer ends a round

config/tools.jsFull tools catalog — 7 defense, 9 attack tools across 3 tiersmodels/GameSession.jsComplete game state schema — rounds, player states, attack logutils/gameEngine.jsPure combat logic — deploy, attack, win conditions, side-switchcontrollers/gameController.jsAll game actions wired to DB and Socket.ioroutes/game.jsAll /api/game/* endpointsvalidators/game.jsZod schemas for all game actions


