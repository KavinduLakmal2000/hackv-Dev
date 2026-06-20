# BREACH — Full Security Audit Report
> Slices 1–7 audited against the Slice 8 Security Layer requirements.
> Generated after completing all backend slices.

---

## Summary

| Category | Count | Status |
|---|---|---|
| Real bugs (actual breakage) | 3 | 🔴 Fixed in Slice 8 |
| Security gaps (missing features) | 9 | 🟡 Added in Slice 8 |
| Already solid (no action needed) | 18 | ✅ |

---

## 🔴 Real Bugs Found & Fixed

### BUG-1 — `registrationGuard` Dead Code
**File:** `server.js` lines 110–111

```js
// BROKEN — guard fires AFTER the route already resolved
app.use('/api/auth', authRoutes);           // ← request handled here
app.use('/api/auth/register', registrationGuard); // ← never reached
```

**Fix:** Move `registrationGuard` inside `auth.js` route, directly on the register handler.

```js
// routes/auth.js — FIXED
router.post('/register',
  registrationGuard,       // ← fires BEFORE the handler
  validate(registerSchema),
  authController.register
);
```

---

### BUG-2 — `shopGuard` Dead Code
**File:** `server.js` lines 67 and 117

```js
// BROKEN — shopGuard runs on an already-handled route
app.use('/api/shop', shopRoutes);   // ← line 67, route fully handled
app.use('/api/shop', shopGuard);    // ← line 117, request already sent
```

**Fix:** Mount `shopGuard` BEFORE `shopRoutes` (except the webhook).

```js
// FIXED order in server.js
app.use('/api/shop', shopGuard);    // ← guard first
app.use('/api/shop', shopRoutes);   // ← then the routes
```

---

### BUG-3 — `maintenanceGuard` Wrong Path Strings
**File:** `middleware/maintenance.js`

When middleware is mounted at `app.use('/api', handler)`, Express strips the mount prefix.
`req.path` inside the handler is `/health`, not `/api/health`.

```js
// BROKEN
if (req.path === '/api/health') return next();
if (req.path.startsWith('/api/auth/login')) return next();

// FIXED
if (req.path === '/health') return next();
if (req.path.startsWith('/auth/login')) return next();
if (req.path.startsWith('/auth/refresh')) return next();
if (req.path.startsWith('/auth/google')) return next();
```

---

## 🟡 Security Gaps Added in Slice 8

### GAP-1 — No Account-Level Brute Force Lockout
IP rate limiting alone is not enough — an attacker using distributed IPs can still hammer one account.

**Added:** `loginAttempts` + `lockUntil` fields on `User` model. After 10 failed attempts, account is locked for 15 minutes. Resets on successful login.

```js
// User model additions
loginAttempts: { type: Number, default: 0 },
lockUntil:     { type: Date,   default: null },
```

---

### GAP-2 — No Admin Audit Log
Admin actions only wrote to `console.log`. No searchable trail.

**Added:** `AuditLog` model — every admin action (ban, role change, rank adjust, config change, mail send, item grant) writes a structured record with: `adminId`, `action`, `targetId`, `before`, `after`, `ip`, `timestamp`.

---

### GAP-3 — Email Verification Never Enforced
`emailVerified` existed on the User model but was never checked in any middleware or route guard.

**Added:** `requireEmailVerified` middleware. Applied to:
- `POST /api/lobbies` (create lobby)
- `POST /api/lobbies/:code/join`
- `POST /api/game/*` (all game actions)

Google OAuth users are auto-verified. Local users get 24h to verify before being blocked from game features.

---

### GAP-4 — No Startup Environment Validation
Server would start silently with `JWT_ACCESS_SECRET=undefined` and sign tokens with the string `"undefined"`. Every token would be trivially forgeable.

**Added:** `validateEnv()` called before `connectDB()` in `server.js`. Crashes with a clear message listing every missing required variable before anything else initialises.

```
Required: NODE_ENV, MONGO_URI, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET,
          GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, CLIENT_URL, SERVER_URL
```

---

### GAP-5 — XSS in Text Inputs
`mongoSanitize` only strips `$` and `.` from MongoDB operators. It does not sanitise HTML. A `displayName` of `<script>alert(1)</script>` would be stored and rendered raw.

**Added:** `xss` package applied to all free-text fields (displayName, bio, mail subject/body, secret word, chat messages) via a sanitize util that strips all HTML tags.

---

### GAP-6 — Email Enumeration on Register
```
"Email already in use"    ← tells attacker the email exists
"Username already taken"  ← tells attacker the username exists
```

**Fixed:** Register now always responds with a generic message. The specific conflict detail is only returned if both fields are taken simultaneously (which implies the same person is registering twice).

Actually — keeping distinct messages is debatable for UX. **Decision:** keep distinct errors for username (not PII) but make email error generic: `"Check your email — if it's new, you'll be registered. If not, try logging in."` This is industry standard (GitHub, Google all do this).

---

### GAP-7 — No Request Correlation ID
Logs had no way to trace a single request across multiple log lines.

**Added:** `requestId` middleware using `crypto.randomUUID()` — attaches `X-Request-Id` header to every response and prefixes every log line with it.

---

### GAP-8 — Socket Event Payload Size Not Validated
`maxHttpBufferSize: 1e5` limits raw bytes, but individual event payloads (e.g. a `game:chat` message body) had no application-level size check inside the handler.

**Fixed:** Every socket handler now explicitly checks payload field sizes before any DB work. `message.slice(0, 200)` was already in `lobby:chat` but missing from `game:chat` and `game:set_secret_word`.

---

### GAP-9 — Google OAuth Token in URL Fragment
```js
// Slice 1 code
res.redirect(`${CLIENT_URL}/auth/callback#token=${accessToken}`)
```

URL fragments are not sent to servers but CAN appear in browser history, Referrer headers, and some proxy logs.

**Fixed:** Instead of putting the token in the fragment, the server sets the httpOnly refresh cookie and issues a one-time short-lived `state` code (5 min, single use). The client exchanges the state code for an access token via `POST /api/auth/google/exchange`. Token never touches the URL.

---

## ✅ Already Solid — No Changes Needed

### Authentication & Sessions
- JWT access token 15min + refresh token 7 days
- Refresh token rotation with **reuse detection** — reuse wipes ALL sessions
- `httpOnly + secure + SameSite=strict` cookie for refresh token
- Token version field (`refreshTokenVersion`) — ban/logout invalidates all existing tokens instantly
- Bcrypt with 12 salt rounds
- Generic `"Invalid email or password"` on login (no enumeration)
- Password reset token is SHA-256 hashed in DB (raw token only in email)
- `select: false` on `passwordHash`, `googleId`, `refreshTokenVersion`, `lastLoginIp`

### Game State Integrity
- All game state lives in MongoDB — client is display-only
- `secretWord` is `select: false` — never appears in any `.toJSON()` call
- `GameSession.toJSON()` strips `secretWord` from all rounds before any response
- `buildClientState()` in `gameSocket.js` applies role-based filtering — hackers physically cannot receive developer-team socket events
- Tool stats resolved from `config/tools.js` server-side — client sends only `toolId`
- Hacker cannot call `game:deploy`; developer cannot call `game:attack` — role check on every event handler
- All timers server-side (`timerManager`) — client countdown is cosmetic only

### Shop & Payments
- Item price never accepted from client — only `itemId`, price from `shopCatalog.js`
- Atomic `findOneAndUpdate` with balance in filter — prevents race condition double-spend
- Stripe webhook verified with `stripe.webhooks.constructEvent()` before any DB write
- Raw body preserved for Stripe route (before `express.json()` parses)
- Idempotency check on Stripe webhook — duplicate `checkout.session.completed` events ignored

### Input & Transport
- Zod validation on every REST route (body + query params)
- `mongoSanitize` — strips `$` operators from all inputs
- `hpp` — prevents HTTP parameter pollution
- `helmet` with custom CSP — `scriptSrc: ["'self'"]`, no inline scripts
- CORS whitelist — only `CLIENT_URL` and `localhost:5173`
- `express.json({ limit: '10kb' })` — rejects oversized payloads
- Per-socket event rate limiting: attacks 5/5s, deploys 10/10s, guesses 3/10s

### Access Control
- `verifyJWT` on all protected routes — checks token validity + version + ban status
- `requireAdmin` / `requireModerator` on all admin routes
- `socketAuth` runs on every socket connection — same JWT validation as REST
- Admin cannot demote themselves via `PATCH /admin/users/:id`
- Admin cannot ban themselves
- Moderators have scoped access (can ban/list users but not delete/adjust rank)

---

## Slice Coverage Matrix

| Slice | Feature | Implemented | Security Notes |
|---|---|---|---|
| 1 | Register / Login | ✅ | Bcrypt 12r, generic error, token version |
| 1 | Google OAuth | ✅ | Fixed: state-code exchange, no URL token |
| 1 | JWT + Refresh | ✅ | 15m/7d, rotation, reuse detection |
| 1 | Password Reset | ✅ | SHA-256 hashed token, 1hr expiry |
| 2 | User Profile | ✅ | Avatar domain whitelist |
| 2 | Leaderboard | ✅ | Public, no sensitive data |
| 2 | Admin User Mgmt | ✅ | Fixed: audit log added |
| 3 | Lobby Create/Join | ✅ | Fixed: emailVerified guard added |
| 3 | Private Lobbies | ✅ | Password checked server-side |
| 3 | Host Controls | ✅ | isHost verified server-side |
| 4 | Game Session | ✅ | All state in MongoDB |
| 4 | Secret Word | ✅ | select:false, never in client payload |
| 4 | Tool Resolution | ✅ | Server catalog only |
| 4 | Round Timers | ✅ | Server-side only |
| 5 | Socket Auth | ✅ | JWT on handshake, version checked |
| 5 | Socket Rate Limit | ✅ | Fixed: payload size validation added |
| 5 | Role-filtered Rooms | ✅ | dev/hacker team rooms separate |
| 5 | Game State Sync | ✅ | buildClientState() per-role |
| 6 | Shop Purchase | ✅ | Atomic, server-side price |
| 6 | Stripe Webhook | ✅ | Signature verified, idempotent |
| 6 | Rank-locked Items | ✅ | Server-side tier check |
| 7 | Mail System | ✅ | Reward claim atomic |
| 7 | Maintenance Mode | ✅ | Fixed: path strings corrected |
| 7 | Email Service | ✅ | Dev mode prints to console |
| 8 | Env Validation | ✅ | Added: crashes on missing secrets |
| 8 | Audit Log | ✅ | Added: all admin actions logged |
| 8 | Account Lockout | ✅ | Added: 10 attempts → 15min lock |
| 8 | Email Verification | ✅ | Added: enforced on game routes |
| 8 | XSS Sanitization | ✅ | Added: xss package on free-text |
| 8 | Request ID | ✅ | Added: X-Request-Id header |

---

## What Slice 8 Builds

Based on this audit, Slice 8 adds these files:

```
server/src/
├── models/
│   └── AuditLog.js               ← admin action trail
├── middleware/
│   ├── requestId.js              ← correlation ID on every request
│   ├── requireEmailVerified.js   ← email verification gate
│   └── sanitize.js               ← XSS stripping for text fields
├── utils/
│   └── validateEnv.js            ← startup env check
```

And fixes these existing files:
```
server.js                         ← fix guard ordering (BUG-1, BUG-2)
middleware/maintenance.js         ← fix req.path strings (BUG-3)
models/User.js                    ← add loginAttempts, lockUntil
controllers/authController.js    ← account lockout on login
controllers/adminController.js   ← write to AuditLog
controllers/adminConfigController.js ← write to AuditLog
controllers/shopController.js    ← write to AuditLog  
controllers/mailController.js    ← write to AuditLog
routes/auth.js                   ← fix registrationGuard position
routes/lobbies.js                ← add requireEmailVerified
routes/game.js                   ← add requireEmailVerified
config/passport.js               ← fix Google OAuth state-code flow
```
