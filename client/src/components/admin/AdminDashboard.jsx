import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell.jsx';
import { TerminalBox, Spinner, TerminalAlert } from '../../components/ui/Terminal.jsx';
import StatCard from '../../components/admin/StatCard.jsx';
import RankBadge from '../../components/ui/RankBadge.jsx';
import { Avatar } from '../../components/layout/Navbar.jsx';
import useAdminStore from '../../store/adminStore.js';

const AdminDashboard = () => {
  const { dashboard, isLoading, error, fetchDashboard, clearError } = useAdminStore();

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  if (isLoading && !dashboard) {
    return (
      <AppShell>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}>
          <Spinner size={32} />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <p style={{ fontSize: '10px', color: 'var(--red-dim)', fontFamily: 'var(--font-display)', letterSpacing: '0.1em', marginBottom: '4px' }}>
            SYS://ADMIN/ROOT
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--red-bright)' }}>Command Center</h1>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <AdminNavLink to="/admin/users">Users</AdminNavLink>
          <AdminNavLink to="/admin/mail">Mail</AdminNavLink>
          <AdminNavLink to="/admin/config">Config</AdminNavLink>
        </div>
      </div>

      {error && <TerminalAlert type="error" message={error} onClose={clearError} />}

      {dashboard && (
        <>
          {/* ── Top metric row ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px', marginBottom: '24px' }}>
            <StatCard label="Total players" value={dashboard.users.total.toLocaleString()} color="var(--green-bright)" />
            <StatCard label="Online now" value={dashboard.users.connected} sublabel="websocket connections" color="var(--blue-info)" />
            <StatCard label="New today" value={dashboard.users.newToday} sublabel={`${dashboard.users.newThisWeek} this week`} color="var(--amber)" />
            <StatCard label="Banned" value={dashboard.users.banned} color="var(--red-bright)" />
            <StatCard label="Active games" value={dashboard.games.active} sublabel={`${dashboard.games.total} total played`} color="var(--green-bright)" />
          </div>

          {/* ── Revenue row ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '24px' }}>
            <StatCard label="Revenue today" value={`$${dashboard.revenue.todayUsd}`} color="var(--amber)" />
            <StatCard label="Revenue this month" value={`$${dashboard.revenue.thisMonthUsd}`} color="var(--amber)" />
            <StatCard label="Total revenue" value={`$${dashboard.revenue.totalUsd}`} color="var(--amber)" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

            {/* ── Tier breakdown ── */}
            <TerminalBox title="Rank distribution">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {Object.entries(dashboard.tiers).map(([tier, count]) => (
                  <div key={tier} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <RankBadge rank={{ tier, points: 0 }} size="sm" showPoints={false} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-primary)' }}>
                      {count.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </TerminalBox>

            {/* ── Top players ── */}
            <TerminalBox title="Top operatives">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {dashboard.topPlayers.map((p, i) => (
                  <div key={p._id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '12px', color: 'var(--amber)', width: '16px' }}>
                      {i + 1}
                    </span>
                    <Avatar user={p} size={24} />
                    <span style={{ fontSize: '12px', color: 'var(--text-primary)', flex: 1 }}>
                      {p.displayName || p.username}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                      {p.rank.points.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </TerminalBox>
          </div>

          {/* ── Recent signups ── */}
          <TerminalBox title="Recent signups" style={{ marginTop: '20px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-dim)' }}>
                  <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-dim)', fontSize: '10px' }}>Username</th>
                  <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-dim)', fontSize: '10px' }}>Email</th>
                  <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-dim)', fontSize: '10px' }}>Method</th>
                  <th style={{ textAlign: 'right', padding: '8px', color: 'var(--text-dim)', fontSize: '10px' }}>Joined</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.recentSignups.map((u) => (
                  <tr key={u._id} style={{ borderBottom: '1px solid var(--border-dim)' }}>
                    <td style={{ padding: '8px', color: 'var(--text-primary)' }}>{u.username}</td>
                    <td style={{ padding: '8px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{u.email}</td>
                    <td style={{ padding: '8px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{u.authProvider}</td>
                    <td style={{ padding: '8px', textAlign: 'right', color: 'var(--text-muted)' }}>
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TerminalBox>
        </>
      )}
    </AppShell>
  );
};

const AdminNavLink = ({ to, children }) => (
  <Link
    to={to}
    style={{
      padding: '6px 14px', fontSize: '11px', fontFamily: 'var(--font-display)',
      letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--red-dim)',
      border: '1px solid var(--red-dim)', borderRadius: 'var(--radius-md)', textDecoration: 'none',
    }}
  >
    {children}
  </Link>
);

export default AdminDashboard;
