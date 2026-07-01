import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../../store/authStore.js';
import useShopStore from '../../store/shopStore.js';
import useMailStore from '../../store/mailStore.js';
import RankBadge from '../ui/RankBadge.jsx';
import WalletDisplay from '../ui/WalletDisplay.jsx';

// ─────────────────────────────────────────────────────────────────────────────
// Navbar — persistent top bar for all authenticated pages.
// ─────────────────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { to: '/lobby',       label: 'Lobby' },
  { to: '/leaderboard', label: 'Leaderboard' },
  { to: '/shop',        label: 'Shop' },
  { to: '/mail',        label: 'Mail' },
];

const Navbar = () => {
  const { user, logout, isAdmin } = useAuthStore();
  const { wallet, fetchCatalog } = useShopStore();
  const { unreadCount, fetchInbox } = useMailStore();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // Lightweight wallet fetch so credits/tokens are visible everywhere,
  // not just on the shop page. fetchCatalog also returns wallet.
  useEffect(() => { fetchCatalog(); }, [fetchCatalog]);
  useEffect(() => { fetchInbox({ unread: true, limit: 1 }); }, [fetchInbox]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav style={{
      position:     'sticky',
      top:          0,
      zIndex:       50,
      background:   'var(--bg-primary)',
      borderBottom: '1px solid var(--border-dim)',
      padding:      '0 24px',
      height:       '56px',
      display:      'flex',
      alignItems:   'center',
      gap:          '32px',
    }}>
      {/* Logo */}
      <Link to="/lobby" style={{ textDecoration: 'none', flexShrink: 0 }}>
        <span style={{
          fontFamily:    'var(--font-display)',
          fontWeight:    900,
          fontSize:      '1.1rem',
          letterSpacing: '0.2em',
          color:         'var(--green-bright)',
        }}>
          BREACH
        </span>
      </Link>

      {/* Nav links */}
      <div style={{ display: 'flex', gap: '4px', flex: 1 }}>
        {NAV_LINKS.map((link) => {
          const active = location.pathname.startsWith(link.to);
          return (
            <Link
              key={link.to}
              to={link.to}
              style={{
                padding:      '8px 14px',
                fontSize:     '12px',
                fontFamily:   'var(--font-display)',
                letterSpacing:'0.05em',
                textTransform:'uppercase',
                color:        active ? 'var(--green-bright)' : 'var(--text-dim)',
                borderBottom: active ? '2px solid var(--green-bright)' : '2px solid transparent',
                textDecoration: 'none',
                transition:   'color var(--transition)',
                position:     'relative',
              }}
            >
              {link.label}
              {link.to === '/mail' && unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: '4px', right: '2px',
                  width: '6px', height: '6px', borderRadius: '50%',
                  background: 'var(--red-bright)', boxShadow: '0 0 6px var(--red-bright)',
                }} />
              )}
            </Link>
          );
        })}
        {isAdmin() && (
          <Link
            to="/admin"
            style={{
              padding:      '8px 14px',
              fontSize:     '12px',
              fontFamily:   'var(--font-display)',
              letterSpacing:'0.05em',
              textTransform:'uppercase',
              color:        location.pathname.startsWith('/admin') ? 'var(--red-bright)' : 'var(--red-dim)',
              borderBottom: location.pathname.startsWith('/admin') ? '2px solid var(--red-bright)' : '2px solid transparent',
              textDecoration: 'none',
            }}
          >
            Admin
          </Link>
        )}
      </div>

      {/* Wallet */}
      <WalletDisplay wallet={wallet} size="sm" />

      {/* User menu */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <button
          onClick={() => setMenuOpen((o) => !o)}
          style={{
            display:    'flex',
            alignItems: 'center',
            gap:        '10px',
            background: 'none',
            border:     'none',
            cursor:     'pointer',
            padding:    '4px',
          }}
        >
          <Avatar user={user} size={28} />
          <span style={{ fontSize: '12px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {user?.displayName || user?.username}
          </span>
          {user?.rank && <RankBadge rank={user.rank} size="sm" showPoints={false} />}
        </button>

        {menuOpen && (
          <>
            <div
              onClick={() => setMenuOpen(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 60 }}
            />
            <div style={{
              position:     'absolute',
              top:          '40px',
              right:        0,
              width:        '180px',
              background:   'var(--bg-elevated)',
              border:       '1px solid var(--border-primary)',
              borderRadius: 'var(--radius-md)',
              zIndex:       70,
              overflow:     'hidden',
            }}>
              <MenuLink to="/profile" onClick={() => setMenuOpen(false)}>My Profile</MenuLink>
              <MenuLink to="/inventory" onClick={() => setMenuOpen(false)}>Inventory</MenuLink>
              <div style={{ borderTop: '1px solid var(--border-dim)' }} />
              <button
                onClick={handleLogout}
                style={{
                  display:    'block',
                  width:      '100%',
                  textAlign:  'left',
                  padding:    '10px 14px',
                  background: 'none',
                  border:     'none',
                  color:      'var(--red-bright)',
                  fontSize:   '12px',
                  fontFamily: 'var(--font-mono)',
                  cursor:     'pointer',
                }}
              >
                Log out
              </button>
            </div>
          </>
        )}
      </div>
    </nav>
  );
};

const MenuLink = ({ to, children, onClick }) => (
  <Link
    to={to}
    onClick={onClick}
    style={{
      display:    'block',
      padding:    '10px 14px',
      fontSize:   '12px',
      fontFamily: 'var(--font-mono)',
      color:      'var(--text-secondary)',
      textDecoration: 'none',
    }}
  >
    {children}
  </Link>
);

export const Avatar = ({ user, size = 32 }) => {
  if (user?.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt=""
        width={size}
        height={size}
        style={{ borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-primary)' }}
      />
    );
  }
  const initial = (user?.displayName || user?.username || '?')[0].toUpperCase();
  return (
    <div style={{
      width:        size,
      height:       size,
      borderRadius: '50%',
      background:   'var(--green-ghost)',
      border:       '1px solid var(--green-dim)',
      display:      'flex',
      alignItems:   'center',
      justifyContent:'center',
      fontSize:     size * 0.4,
      color:        'var(--green-bright)',
      fontFamily:   'var(--font-display)',
      flexShrink:   0,
    }}>
      {initial}
    </div>
  );
};

export default Navbar;
