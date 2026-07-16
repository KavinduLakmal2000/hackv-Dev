
```
hacker vs dev
├─ BREACH_API_REFERENCE.md
├─ BREACH_SECURITY_AUDIT.md
├─ README.md
├─ breach_full_file_structure.svg
├─ client
│  ├─ index.html
│  ├─ package-lock.json
│  ├─ package.json
│  ├─ src
│  │  ├─ App.jsx
│  │  ├─ api
│  │  │  ├─ admin.js
│  │  │  ├─ auth.js
│  │  │  ├─ axiosInstance.js
│  │  │  ├─ game.js
│  │  │  ├─ lobby.js
│  │  │  ├─ mail.js
│  │  │  ├─ shop.js
│  │  │  └─ user.js
│  │  ├─ components
│  │  │  ├─ admin
│  │  │  │  ├─ StatCard.jsx
│  │  │  │  ├─ UserDetailModal.jsx
│  │  │  │  └─ UserTable.jsx
│  │  │  ├─ game
│  │  │  │  ├─ BreachProgressBar.jsx
│  │  │  │  ├─ DBHealthBar.jsx
│  │  │  │  ├─ DeveloperView.jsx
│  │  │  │  ├─ EventFeed.jsx
│  │  │  │  ├─ GuessPanel.jsx
│  │  │  │  ├─ HackerView.jsx
│  │  │  │  ├─ RoundTimer.jsx
│  │  │  │  ├─ SecretWordPanel.jsx
│  │  │  │  └─ ToolCard.jsx
│  │  │  ├─ layout
│  │  │  │  ├─ AppShell.jsx
│  │  │  │  ├─ AuthLayout.jsx
│  │  │  │  ├─ Navbar.jsx
│  │  │  │  └─ RouteGuard.jsx
│  │  │  ├─ lobby
│  │  │  │  ├─ LobbyChat.jsx
│  │  │  │  ├─ ModeCard.jsx
│  │  │  │  └─ TeamSlotGrid.jsx
│  │  │  ├─ shop
│  │  │  │  ├─ PremiumPackCard.jsx
│  │  │  │  └─ ShopItemCard.jsx
│  │  │  └─ ui
│  │  │     ├─ AnnouncementBanner.jsx
│  │  │     ├─ ErrorBoundary.jsx
│  │  │     ├─ RankBadge.jsx
│  │  │     ├─ Skeleton.jsx
│  │  │     ├─ Terminal.jsx
│  │  │     ├─ ToolIcon.jsx
│  │  │     └─ WalletDisplay.jsx
│  │  ├─ hooks
│  │  │  └─ useSocket.js
│  │  ├─ main.jsx
│  │  ├─ pages
│  │  │  ├─ NotFoundPage.jsx
│  │  │  ├─ admin
│  │  │  │  ├─ AdminDashboard.jsx
│  │  │  │  ├─ MailComposePage.jsx
│  │  │  │  ├─ ServerConfigPage.jsx
│  │  │  │  └─ UserManagePage.jsx
│  │  │  ├─ auth
│  │  │  │  ├─ ForgotResetPage.jsx
│  │  │  │  ├─ LoginPage.jsx
│  │  │  │  ├─ OAuthCallbackPage.jsx
│  │  │  │  └─ RegisterPage.jsx
│  │  │  ├─ game
│  │  │  │  └─ GamePage.jsx
│  │  │  ├─ lobby
│  │  │  │  ├─ LobbyBrowserPage.jsx
│  │  │  │  └─ LobbyRoomPage.jsx
│  │  │  ├─ mail
│  │  │  │  └─ InboxPage.jsx
│  │  │  ├─ profile
│  │  │  │  ├─ LeaderboardPage.jsx
│  │  │  │  ├─ MyProfilePage.jsx
│  │  │  │  └─ PublicProfilePage.jsx
│  │  │  └─ shop
│  │  │     ├─ CheckoutSuccessPage.jsx
│  │  │     ├─ InventoryPage.jsx
│  │  │     └─ ShopPage.jsx
│  │  ├─ socket
│  │  │  └─ socketClient.js
│  │  ├─ store
│  │  │  ├─ adminStore.js
│  │  │  ├─ authStore.js
│  │  │  ├─ gameStore.js
│  │  │  ├─ lobbyStore.js
│  │  │  ├─ mailStore.js
│  │  │  ├─ shopStore.js
│  │  │  └─ userStore.js
│  │  ├─ theme
│  │  │  ├─ rankTiers.js
│  │  │  ├─ shopCatalog.js
│  │  │  ├─ terminal.css
│  │  │  └─ toolCatalog.js
│  │  └─ utils
│  │     ├─ logger.js
│  │     ├─ sanitize.js
│  │     └─ validateEnv.js
│  └─ vite.config.js
└─ server
   ├─ README.md
   ├─ package-lock.json
   ├─ package.json
   ├─ src
   │  ├─ config
   │  │  ├─ database.js
   │  │  ├─ passport.js
   │  │  ├─ shopCatalog.js
   │  │  └─ tools.js
   │  ├─ controllers
   │  │  ├─ adminConfigController.js
   │  │  ├─ adminController.js
   │  │  ├─ authController.js
   │  │  ├─ gameController.js
   │  │  ├─ lobbyController.js
   │  │  ├─ mailController.js
   │  │  ├─ shopController.js
   │  │  └─ userController.js
   │  ├─ middleware
   │  │  ├─ auth.js
   │  │  ├─ maintenance.js
   │  │  ├─ requestId.js
   │  │  ├─ requireEmailVerified.js
   │  │  ├─ sanitize.js
   │  │  └─ socketAuth.js
   │  ├─ models
   │  │  ├─ AuditLog.js
   │  │  ├─ GameSession.js
   │  │  ├─ Lobby.js
   │  │  ├─ Mail.js
   │  │  ├─ MaintenanceConfig.js
   │  │  ├─ Purchase.js
   │  │  └─ User.js
   │  ├─ routes
   │  │  ├─ admin.js
   │  │  ├─ adminConfig.js
   │  │  ├─ auth.js
   │  │  ├─ game.js
   │  │  ├─ lobbies.js
   │  │  ├─ shop.js
   │  │  └─ users.js
   │  ├─ server.js
   │  ├─ sockets
   │  │  ├─ gameSocket.js
   │  │  ├─ index.js
   │  │  └─ lobbySocket.js
   │  ├─ utils
   │  │  ├─ apiResponse.js
   │  │  ├─ auditLogger.js
   │  │  ├─ emailService.js
   │  │  ├─ gameEngine.js
   │  │  ├─ jwt.js
   │  │  ├─ lobbyCode.js
   │  │  ├─ rank.js
   │  │  ├─ timerManager.js
   │  │  └─ validateEnv.js
   │  └─ validators
   │     ├─ admin.js
   │     ├─ auth.js
   │     ├─ game.js
   │     ├─ lobby.js
   │     ├─ shop.js
   │     └─ user.js
   └─ tests
      └─ sanitize.test.js

```