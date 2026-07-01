import React, { useState } from 'react';
import { TerminalBox, TerminalButton, TerminalInput, TerminalAlert } from '../ui/Terminal.jsx';
import RankBadge from '../ui/RankBadge.jsx';
import { Avatar } from '../layout/Navbar.jsx';

// ─────────────────────────────────────────────────────────────────────────────
// UserDetailModal — ban-with-reason and rank-adjust-with-reason flows.
// Both actions require the admin to type a reason, matching the backend's
// validators which require a non-empty reason string for rank adjustments
// and log everything via AuditLog (Slice 8 security work).
// ─────────────────────────────────────────────────────────────────────────────

const UserDetailModal = ({ user, onClose, onBan, onUnban, onAdjustRank }) => {
  const [banReason, setBanReason]     = useState('');
  const [rankPoints, setRankPoints]   = useState('');
  const [rankReason, setRankReason]   = useState('');
  const [error, setError]             = useState('');
  const [pending, setPending]         = useState(false);

  if (!user) return null;

  const handleBan = async () => {
    setPending(true);
    const result = await onBan(user._id, banReason || 'Policy violation');
    setPending(false);
    if (!result.ok) setError(result.message);
  };

  const handleRankAdjust = async (e) => {
    e.preventDefault();
    setError('');
    const points = parseInt(rankPoints, 10);
    if (isNaN(points) || points === 0) { setError('Enter a non-zero point value'); return; }
    if (!rankReason.trim()) { setError('Reason is required'); return; }

    setPending(true);
    const result = await onAdjustRank(user._id, points, rankReason.trim());
    setPending(false);
    if (result.ok) { setRankPoints(''); setRankReason(''); }
    else setError(result.message);
  };

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: '480px', maxHeight: '85vh', overflowY: 'auto' }}>
        <TerminalBox title={`Operative — ${user.username}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <Avatar user={user} size={48} />
            <div>
              <p style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                {user.displayName || user.username}
              </p>
              <p style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{user.email}</p>
            </div>
          </div>

          {error && <TerminalAlert type="error" message={error} onClose={() => setError('')} />}

          <div style={{ marginBottom: '20px' }}>
            <RankBadge rank={user.rank} size="md" showProgress />
          </div>

          {/* ── Ban / Unban ── */}
          <div style={{ borderTop: '1px solid var(--border-dim)', paddingTop: '16px', marginBottom: '20px' }}>
            <p style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', marginBottom: '10px' }}>
              ACCOUNT STATUS
            </p>
            {user.isBanned ? (
              <div>
                <p style={{ fontSize: '12px', color: 'var(--red-bright)', marginBottom: '10px' }}>
                  Banned: {user.banReason}
                </p>
                <TerminalButton variant="secondary" size="sm" loading={pending} onClick={() => onUnban(user._id)}>
                  Unban operative
                </TerminalButton>
              </div>
            ) : (
              <>
                <TerminalInput
                  label="Ban reason"
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder="Policy violation"
                  prefix={null}
                  maxLength={255}
                />
                <TerminalButton variant="danger" size="sm" loading={pending} onClick={handleBan}>
                  Ban operative
                </TerminalButton>
              </>
            )}
          </div>

          {/* ── Rank adjustment ── */}
          <div style={{ borderTop: '1px solid var(--border-dim)', paddingTop: '16px' }}>
            <p style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', marginBottom: '10px' }}>
              MANUAL RANK ADJUSTMENT
            </p>
            <form onSubmit={handleRankAdjust}>
              <TerminalInput
                label="Points (+/-)"
                type="number"
                value={rankPoints}
                onChange={(e) => setRankPoints(e.target.value)}
                placeholder="e.g. -500 or 1000"
                prefix={null}
              />
              <TerminalInput
                label="Reason (required)"
                value={rankReason}
                onChange={(e) => setRankReason(e.target.value)}
                placeholder="Tournament reward / correction"
                prefix={null}
                maxLength={255}
              />
              <TerminalButton type="submit" variant="primary" size="sm" loading={pending}>
                Apply adjustment
              </TerminalButton>
            </form>
          </div>

          <TerminalButton variant="ghost" size="sm" onClick={onClose} style={{ marginTop: '16px' }}>
            Close
          </TerminalButton>
        </TerminalBox>
      </div>
    </div>
  );
};

export default UserDetailModal;
