import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell.jsx';
import { TerminalBox, Spinner } from '../../components/ui/Terminal.jsx';
import RankBadge from '../../components/ui/RankBadge.jsx';
import { Avatar } from '../../components/layout/Navbar.jsx';
import useUserStore from '../../store/userStore.js';

const PublicProfilePage = () => {
  const { username } = useParams();
  const { publicProfile, isLoading, error, fetchPublicProfile, clearPublicProfile } = useUserStore();

  useEffect(() => {
    fetchPublicProfile(username);
    return () => clearPublicProfile();
  }, [username, fetchPublicProfile, clearPublicProfile]);

  if (isLoading) {
    return (
      <AppShell>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <Spinner size={32} />
        </div>
      </AppShell>
    );
  }

  if (error || !publicProfile) {
    return (
      <AppShell>
        <TerminalBox>
          <p style={{ color: 'var(--red-bright)', textAlign: 'center' }}>
            {error || 'Player not found'}
          </p>
          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <Link to="/leaderboard" style={{ fontSize: '12px' }}>← Back to leaderboard</Link>
          </div>
        </TerminalBox>
      </AppShell>
    );
  }

  const p = publicProfile;
  const total = p.stats.wins + p.stats.losses + p.stats.draws;
  const winRate = total === 0 ? 0 : Math.round((p.stats.wins / total) * 100);

  return (
    <AppShell>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <TerminalBox>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <Avatar user={p} size={88} />
            <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', marginTop: '12px' }}>
              {p.displayName || p.username}
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>@{p.username}</p>

            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '14px' }}>
              <RankBadge rank={p.rank} size="lg" showProgress />
            </div>

            {p.bio && (
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '16px', fontStyle: 'italic' }}>
                "{p.bio}"
              </p>
            )}
          </div>

          <div style={{
            borderTop: '1px solid var(--border-dim)', paddingTop: '20px',
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px',
          }}>
            <Stat label="Wins" value={p.stats.wins} color="var(--green-bright)" />
            <Stat label="Losses" value={p.stats.losses} color="var(--red-bright)" />
            <Stat label="Win rate" value={`${winRate}%`} color="var(--green-bright)" />
            <Stat label="Rounds" value={p.stats.totalRounds} color="var(--text-dim)" />
          </div>

          <p style={{ textAlign: 'center', fontSize: '10px', color: 'var(--text-muted)', marginTop: '20px' }}>
            Operative since {new Date(p.createdAt).toLocaleDateString()}
          </p>
        </TerminalBox>
      </div>
    </AppShell>
  );
};

const Stat = ({ label, value, color }) => (
  <div style={{ textAlign: 'center' }}>
    <p style={{ fontSize: '20px', fontFamily: 'var(--font-display)', color, fontWeight: 700 }}>{value}</p>
    <p style={{ fontSize: '9px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
  </div>
);

export default PublicProfilePage;
