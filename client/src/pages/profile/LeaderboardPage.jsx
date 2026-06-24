import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell.jsx';
import { TerminalBox, TerminalButton, Spinner } from '../../components/ui/Terminal.jsx';
import RankBadge from '../../components/ui/RankBadge.jsx';
import { Avatar } from '../../components/layout/Navbar.jsx';
import useUserStore from '../../store/userStore.js';
import useAuthStore from '../../store/authStore.js';
import { TIERS } from '../../theme/rankTiers.js';

const LeaderboardPage = () => {
  const { leaderboard, leaderboardMeta, isLoading, fetchLeaderboard } = useUserStore();
  const { user } = useAuthStore();
  const [tierFilter, setTierFilter] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchLeaderboard({ page, tier: tierFilter || undefined });
  }, [page, tierFilter, fetchLeaderboard]);

  const handleTierClick = (tierName) => {
    setTierFilter((cur) => (cur === tierName ? '' : tierName));
    setPage(1);
  };

  return (
    <AppShell>
      <div style={{ marginBottom: '24px' }}>
        <p style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'var(--font-display)', letterSpacing: '0.1em', marginBottom: '4px' }}>
          SYS://RANKINGS
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>Leaderboard</h1>
      </div>

      {/* Tier filter chips */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {TIERS.slice().reverse().map((t) => (
          <button
            key={t.name}
            onClick={() => handleTierClick(t.name)}
            style={{
              padding:      '6px 14px',
              fontSize:     '11px',
              fontFamily:   'var(--font-display)',
              letterSpacing:'0.05em',
              textTransform:'uppercase',
              border:       `1px solid ${tierFilter === t.name ? t.color : 'var(--border-primary)'}`,
              background:   tierFilter === t.name ? `${t.color}1a` : 'transparent',
              color:        tierFilter === t.name ? t.color : 'var(--text-dim)',
              borderRadius: 'var(--radius-md)',
              cursor:       'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <TerminalBox>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <Spinner size={28} />
          </div>
        ) : leaderboard.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '20px' }}>
            No operatives found in this tier.
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-dim)' }}>
                <Th>#</Th>
                <Th>Operative</Th>
                <Th>Tier</Th>
                <Th align="right">Points</Th>
                <Th align="right">W / L</Th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((p) => {
                const isMe = p.username === user?.username;
                return (
                  <tr
                    key={p.username}
                    style={{
                      borderBottom: '1px solid var(--border-dim)',
                      background:   isMe ? 'var(--green-ghost)' : 'transparent',
                    }}
                  >
                    <Td>
                      <span style={{
                        color:      p.position <= 3 ? 'var(--amber)' : 'var(--text-dim)',
                        fontFamily: 'var(--font-display)',
                        fontWeight: 700,
                      }}>
                        {p.position}
                      </span>
                    </Td>
                    <Td>
                      <Link
                        to={`/profile/${p.username}`}
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}
                      >
                        <Avatar user={p} size={28} />
                        <span style={{ color: 'var(--text-primary)', fontSize: '13px' }}>
                          {p.displayName || p.username}
                          {isMe && <span style={{ color: 'var(--green-bright)', fontSize: '10px', marginLeft: '6px' }}>(you)</span>}
                        </span>
                      </Link>
                    </Td>
                    <Td><RankBadge rank={p.rank} size="sm" showPoints={false} /></Td>
                    <Td align="right">
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                        {p.rank.points.toLocaleString()}
                      </span>
                    </Td>
                    <Td align="right">
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                        <span style={{ color: 'var(--green-bright)' }}>{p.stats?.wins ?? 0}</span>
                        {' / '}
                        <span style={{ color: 'var(--red-bright)' }}>{p.stats?.losses ?? 0}</span>
                      </span>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </TerminalBox>

      {/* Pagination */}
      {leaderboardMeta.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
          <TerminalButton
            variant="ghost" size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            ← Prev
          </TerminalButton>
          <span style={{ fontSize: '12px', color: 'var(--text-dim)', padding: '8px 0' }}>
            Page {page} of {leaderboardMeta.totalPages}
          </span>
          <TerminalButton
            variant="ghost" size="sm"
            disabled={page >= leaderboardMeta.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next →
          </TerminalButton>
        </div>
      )}
    </AppShell>
  );
};

const Th = ({ children, align = 'left' }) => (
  <th style={{
    textAlign: align, padding: '10px 12px', fontSize: '10px',
    color: 'var(--text-dim)', fontFamily: 'var(--font-display)',
    letterSpacing: '0.08em', textTransform: 'uppercase',
  }}>
    {children}
  </th>
);

const Td = ({ children, align = 'left' }) => (
  <td style={{ textAlign: align, padding: '10px 12px' }}>{children}</td>
);

export default LeaderboardPage;
