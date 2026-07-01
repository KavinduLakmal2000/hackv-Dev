import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import useAuthStore from './store/authStore.js';

import LoginPage          from './pages/auth/LoginPage.jsx';
import RegisterPage       from './pages/auth/RegisterPage.jsx';
import OAuthCallbackPage  from './pages/auth/OAuthCallbackPage.jsx';
import {
  ForgotPasswordPage,
  ResetPasswordPage,
} from './pages/auth/ForgotResetPage.jsx';
import LobbyBrowserPage    from './pages/lobby/LobbyBrowserPage.jsx';
import LobbyRoomPage       from './pages/lobby/LobbyRoomPage.jsx';
import GamePage            from './pages/game/GamePage.jsx';
import ShopPage            from './pages/shop/ShopPage.jsx';
import InventoryPage       from './pages/shop/InventoryPage.jsx';
import CheckoutSuccessPage from './pages/shop/CheckoutSuccessPage.jsx';
import InboxPage           from './pages/mail/InboxPage.jsx';
import AdminDashboard      from './pages/admin/AdminDashboard.jsx';
import UserManagePage      from './pages/admin/UserManagePage.jsx';
import MailComposePage     from './pages/admin/MailComposePage.jsx';
import ServerConfigPage    from './pages/admin/ServerConfigPage.jsx';
import MyProfilePage       from './pages/profile/MyProfilePage.jsx';
import PublicProfilePage   from './pages/profile/PublicProfilePage.jsx';
import LeaderboardPage     from './pages/profile/LeaderboardPage.jsx';

import { RequireAuth, RequireGuest, RequireAdmin } from './components/layout/RouteGuard.jsx';
import { Spinner } from './components/ui/Terminal.jsx';

import './theme/terminal.css';

const App = () => {
  const { initialize, isReady } = useAuthStore();

  // Bootstrap session on first load — tries silent refresh via httpOnly cookie
  useEffect(() => {
    initialize();
  }, [initialize]);

  if (!isReady) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-void)',
      }}>
        <Spinner size={32} />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* ── Public auth routes (redirect away if already logged in) ── */}
        <Route path="/login" element={
          <RequireGuest><LoginPage /></RequireGuest>
        } />
        <Route path="/register" element={
          <RequireGuest><RegisterPage /></RequireGuest>
        } />
        <Route path="/forgot-password" element={
          <RequireGuest><ForgotPasswordPage /></RequireGuest>
        } />
        <Route path="/reset-password" element={
          <RequireGuest><ResetPasswordPage /></RequireGuest>
        } />

        {/* OAuth callback — must be accessible regardless of guest/auth state */}
        <Route path="/auth/callback" element={<OAuthCallbackPage />} />

        {/* ── Protected routes ── */}
        <Route path="/lobby" element={
          <RequireAuth><LobbyBrowserPage /></RequireAuth>
        } />
        <Route path="/lobby/:code" element={
          <RequireAuth><LobbyRoomPage /></RequireAuth>
        } />
        <Route path="/game/:code" element={
          <RequireAuth><GamePage /></RequireAuth>
        } />
        <Route path="/shop" element={
          <RequireAuth><ShopPage /></RequireAuth>
        } />
        <Route path="/inventory" element={
          <RequireAuth><InventoryPage /></RequireAuth>
        } />
        <Route path="/shop/success" element={
          <RequireAuth><CheckoutSuccessPage /></RequireAuth>
        } />
        <Route path="/profile" element={
          <RequireAuth><MyProfilePage /></RequireAuth>
        } />
        <Route path="/profile/:username" element={
          <RequireAuth><PublicProfilePage /></RequireAuth>
        } />
        <Route path="/leaderboard" element={
          <RequireAuth><LeaderboardPage /></RequireAuth>
        } />
        <Route path="/mail" element={
          <RequireAuth><InboxPage /></RequireAuth>
        } />

        {/* ── Admin routes (admin role required) ── */}
        <Route path="/admin" element={
          <RequireAdmin><AdminDashboard /></RequireAdmin>
        } />
        <Route path="/admin/users" element={
          <RequireAdmin><UserManagePage /></RequireAdmin>
        } />
        <Route path="/admin/mail" element={
          <RequireAdmin><MailComposePage /></RequireAdmin>
        } />
        <Route path="/admin/config" element={
          <RequireAdmin><ServerConfigPage /></RequireAdmin>
        } />

        {/* ── Fallbacks ── */}
        <Route path="/" element={<Navigate to="/lobby" replace />} />
        <Route path="*" element={<Navigate to="/lobby" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
