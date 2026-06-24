import React from 'react';
import Navbar from './Navbar.jsx';
import useSocket from '../../hooks/useSocket.js';

// ─────────────────────────────────────────────────────────────────────────────
// AppShell — Navbar + content area. Wraps every authenticated page.
// Also keeps the Socket.io connection alive for the whole authenticated
// session — mounting it here (rather than per-page) means the connection
// survives navigation between lobby/game/shop/etc.
// ─────────────────────────────────────────────────────────────────────────────

const AppShell = ({ children }) => {
  useSocket(); // connects on mount if authenticated, disconnects on logout

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <main style={{ flex: 1, padding: '32px 24px', maxWidth: '1100px', width: '100%', margin: '0 auto' }}>
        {children}
      </main>
    </div>
  );
};

export default AppShell;
