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


# Complete real-time event map
Lobby room (lobby:{code})
Client → Server                   Server → Client
─────────────────────────────     ──────────────────────────────────
lobby:join   { code }         →   lobby:player_joined  (REST triggers)
lobby:leave  { code }         →   lobby:player_left    (REST triggers)
lobby:chat   { code, msg }    →   lobby:chat           { user, msg, ts }
lobby:ping                    →   lobby:presence       { userId, online }
                                  lobby:settings_updated
                                  lobby:game_starting
Game room (game:{sessionId})
Client → Server                   Server → Developers      Server → Hackers
─────────────────────────         ────────────────────      ─────────────────────
game:join  { sessionId }      →   game:round_started        game:round_started
game:start_round              →   (role-filtered state)      (role-filtered state)
game:deploy  { toolId }       →   game:tool_deployed        game:defense_added ←(no tool name)
game:attack  { toolId }       →   game:attack_incoming      game:attack_result
game:set_secret_word          →   game:secret_word_confirmed game:secret_word_set ←(no word)
game:guess   { guess }        →   game:round_finished        game:letters_revealed
game:chat    { msg }          →   game:chat (team-only)      game:chat (team-only)
game:request_state            →   game:tick  { remaining }   game:tick
                                  game:timer_warning         game:timer_warning
                                  game:switching_sides       game:switching_sides
                                  game:finished              game:finished


# Full Shop API

GET  /api/shop/catalog              → full catalog (public, ownership flags if authed)
POST /api/shop/buy                  → buy item with premium tokens
POST /api/shop/checkout             → create Stripe session (real money)
GET  /api/shop/checkout/verify      → confirm payment after Stripe redirect
POST /api/shop/webhook/stripe       → Stripe webhook (raw body, no JWT)
GET  /api/shop/inventory            → my owned items + equipped status
POST /api/shop/equip                → equip an owned item
POST /api/shop/unequip              → remove item from slot
GET  /api/shop/purchases            → my purchase history
POST /api/shop/admin/grant          → admin grants item to player

FilePurposeconfig/shopCatalog.jsFull item catalog — 25 items across 8 types, server-side pricescontrollers/shopController.jsAll shop actions including Stripe webhookroutes/shop.jsAll /api/shop/* endpointsmodels/Purchase.jsImmutable transaction ledgervalidators/shop.jsZod schemas for all shop actions

# Public (client bootstrap)
GET  /api/config                      → maintenance status, announcement, season

# Player mailbox
GET  /api/mail                        → inbox (personal + broadcasts)
GET  /api/mail/:mailId                → read mail (marks as read)
POST /api/mail/:mailId/claim          → claim credits/tokens/item reward
DEL  /api/mail/:mailId                → delete personal mail

# Admin mail
POST /api/admin/mail/broadcast        → send to all players (tier filter, reward, schedule)
POST /api/admin/mail/personal         → send to one player
GET  /api/admin/mail                  → list all sent mails
DEL  /api/admin/mail/:mailId          → delete a mail

# Admin config
GET  /api/admin/config                → full server config
PATCH /api/admin/config               → toggle maintenance / shop / matchmaking / announcement
GET  /api/admin/dashboard             → users + games + revenue + top players


FilePurposeutils/emailService.jsNodemailer transport + 6 branded HTML email templatesmodels/Mail.jsIn-game mailbox schema — broadcasts, personal, rewardsmodels/MaintenanceConfig.jsSingleton server config — maintenance, shop, matchmaking flagsmiddleware/maintenance.jsRequest guard with 30s cache — blocks all non-admin trafficcontrollers/mailController.jsInbox, read, claim reward, admin send/broadcastcontrollers/adminConfigController.jsConfig get/set, full dashboard aggregationroutes/adminConfig.jsAll /api/mail/*, /api/config, /api/admin/config, /api/admin/dashboardvalidators/admin.jsZod schemas for mail and config