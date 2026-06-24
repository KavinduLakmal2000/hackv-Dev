
```
hacker vs dev
├─ BREACH_API_REFERENCE.md
├─ BREACH_SECURITY_AUDIT.md
├─ README.md
├─ breach_full_file_structure.svg
├─ client
│  ├─ package-lock.json
│  ├─ package.json
│  └─ src
│     ├─ App.jsx
│     ├─ api
│     │  ├─ auth.js
│     │  ├─ axiosInstance.js
│     │  ├─ lobby.js
│     │  └─ user.js
│     ├─ components
│     │  ├─ game
│     │  ├─ layout
│     │  │  ├─ AppShell.jsx
│     │  │  ├─ AuthLayout.jsx
│     │  │  ├─ Navbar.jsx
│     │  │  └─ RouteGuard.jsx
│     │  ├─ lobby
│     │  │  ├─ LobbyChat.jsx
│     │  │  ├─ ModeCard.jsx
│     │  │  └─ TeamSlotGrid.jsx
│     │  └─ ui
│     │     ├─ RankBadge.jsx
│     │     └─ Terminal.jsx
│     ├─ hooks
│     │  └─ useSocket.js
│     ├─ pages
│     │  ├─ auth
│     │  │  ├─ ForgotResetPage.jsx
│     │  │  ├─ LoginPage.jsx
│     │  │  ├─ OAuthCallbackPage.jsx
│     │  │  └─ RegisterPage.jsx
│     │  ├─ lobby
│     │  │  ├─ LobbyBrowserPage.jsx
│     │  │  └─ LobbyRoomPage.jsx
│     │  └─ profile
│     │     ├─ LeaderboardPage.jsx
│     │     ├─ MyProfilePage.jsx
│     │     └─ PublicProfilePage.jsx
│     ├─ socket
│     │  └─ socketClient.js
│     ├─ store
│     │  ├─ authStore.js
│     │  ├─ lobbyStore.js
│     │  └─ userStore.js
│     └─ theme
│        ├─ rankTiers.js
│        └─ terminal.css
└─ server
   ├─ README.md
   ├─ package-lock.json
   ├─ package.json
   └─ src
      ├─ config
      │  ├─ database.js
      │  ├─ passport.js
      │  ├─ shopCatalog.js
      │  └─ tools.js
      ├─ controllers
      │  ├─ adminConfigController.js
      │  ├─ adminController.js
      │  ├─ authController.js
      │  ├─ gameController.js
      │  ├─ lobbyController.js
      │  ├─ mailController.js
      │  ├─ shopController.js
      │  └─ userController.js
      ├─ middleware
      │  ├─ auth.js
      │  ├─ maintenance.js
      │  └─ socketAuth.js
      ├─ models
      │  ├─ GameSession.js
      │  ├─ Lobby.js
      │  ├─ Mail.js
      │  ├─ MaintenanceConfig.js
      │  ├─ Purchase.js
      │  └─ User.js
      ├─ routes
      │  ├─ admin.js
      │  ├─ adminConfig.js
      │  ├─ auth.js
      │  ├─ game.js
      │  ├─ lobbies.js
      │  ├─ shop.js
      │  └─ users.js
      ├─ server.js
      ├─ sockets
      │  ├─ gameSocket.js
      │  ├─ index.js
      │  └─ lobbySocket.js
      ├─ utils
      │  ├─ apiResponse.js
      │  ├─ emailService.js
      │  ├─ gameEngine.js
      │  ├─ jwt.js
      │  ├─ lobbyCode.js
      │  ├─ rank.js
      │  └─ timerManager.js
      └─ validators
         ├─ admin.js
         ├─ auth.js
         ├─ game.js
         ├─ lobby.js
         ├─ shop.js
         └─ user.js

```