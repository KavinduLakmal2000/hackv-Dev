import React, { useEffect, useState } from 'react';
import AppShell from '../../components/layout/AppShell.jsx';
import { TerminalBox, TerminalInput, TerminalButton, TerminalAlert, FieldErrors } from '../../components/ui/Terminal.jsx';
import RankBadge from '../../components/ui/RankBadge.jsx';
import { Avatar } from '../../components/layout/Navbar.jsx';
import useAuthStore from '../../store/authStore.js';
import useUserStore from '../../store/userStore.js';
import { PREFERRED_ROLES } from '../../theme/rankTiers.js';

const MyProfilePage = () => {
  const { user } = useAuthStore();
  const {
    stats, fetchMyStats, updateProfile, updateAvatar,
    isLoading, error, clearError,
  } = useUserStore();

  const [editing, setEditing]   = useState(false);
  const [form, setForm]         = useState({
    displayName:   user?.displayName ?? '',
    bio:            user?.bio ?? '',
    preferredRole:  user?.preferredRole ?? 'any',
  });
  const [serverErrors, setServerErrors] = useState([]);
  const [savedMsg, setSavedMsg] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '');

  useEffect(() => { fetchMyStats(); }, [fetchMyStats]);

  const handleSave = async (e) => {
    e.preventDefault();
    clearError();
    setServerErrors([]);
    setSavedMsg('');

    const result = await updateProfile(form);
    if (result.ok) {
      setEditing(false);
      setSavedMsg('Profile updated');
      setTimeout(() => setSavedMsg(''), 2500);
    } else if (result.errors) {
      setServerErrors(result.errors);
    }
  };

  const handleAvatarSave = async () => {
    if (!avatarUrl) return;
    const result = await updateAvatar(avatarUrl);
    if (!result.ok) alert(result.message);
  };

  if (!user) return null;

  return (
    <AppShell>
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '24px' }}>

        {/* ── Left: identity card ── */}
        <TerminalBox title="Operative ID">
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <Avatar user={user} size={80} />
          </div>

          <p style={{
            textAlign: 'center', fontFamily: 'var(--font-display)',
            fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '2px',
          }}>
            {user.displayName || user.username}
          </p>
          <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-dim)', marginBottom: '16px' }}>
            @{user.username}
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            <RankBadge rank={user.rank} size="md" showProgress />
          </div>

          <div style={{ borderTop: '1px solid var(--border-dim)', paddingTop: '14px' }}>
            <TerminalInput
              label="Avatar URL"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://..."
              prefix={null}
            />
            <TerminalButton variant="secondary" size="sm" fullWidth onClick={handleAvatarSave}>
              Update avatar
            </TerminalButton>
            <p style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '8px' }}>
              Must be hosted on Cloudinary, Google, or GitHub avatars.
            </p>
          </div>
        </TerminalBox>

        {/* ── Right: editable info + stats ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          <TerminalBox title="Profile">
            {savedMsg && <TerminalAlert type="success" message={savedMsg} />}
            {error && <TerminalAlert type="error" message={error} onClose={clearError} />}
            <FieldErrors errors={serverErrors} />

            {!editing ? (
              <>
                <Field label="Display name" value={user.displayName || '—'} />
                <Field label="Bio" value={user.bio || 'No bio set.'} />
                <Field label="Preferred role" value={
                  PREFERRED_ROLES.find((r) => r.value === user.preferredRole)?.label ?? 'No preference'
                } />
                <TerminalButton variant="secondary" onClick={() => setEditing(true)}>
                  Edit profile
                </TerminalButton>
              </>
            ) : (
              <form onSubmit={handleSave}>
                <TerminalInput
                  label="Display name"
                  value={form.displayName}
                  onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                  maxLength={40}
                  prefix={null}
                />
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-dim)', marginBottom: '6px', fontFamily: 'var(--font-display)', letterSpacing: '0.1em' }}>
                    BIO
                  </label>
                  <textarea
                    value={form.bio}
                    onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                    maxLength={160}
                    rows={3}
                    style={{
                      width: '100%', background: 'var(--bg-input)',
                      border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)',
                      color: 'var(--text-primary)', fontFamily: 'var(--font-mono)',
                      fontSize: '13px', padding: '10px 12px', resize: 'vertical', outline: 'none',
                    }}
                  />
                  <p style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'right' }}>
                    {form.bio.length}/160
                  </p>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-dim)', marginBottom: '8px', fontFamily: 'var(--font-display)', letterSpacing: '0.1em' }}>
                    PREFERRED ROLE
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {PREFERRED_ROLES.map((r) => (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, preferredRole: r.value }))}
                        style={{
                          flex: 1, padding: '10px', fontSize: '11px', fontFamily: 'var(--font-mono)',
                          background: form.preferredRole === r.value ? 'var(--green-ghost)' : 'transparent',
                          border: `1px solid ${form.preferredRole === r.value ? 'var(--green-bright)' : 'var(--border-primary)'}`,
                          color: form.preferredRole === r.value ? 'var(--green-bright)' : 'var(--text-dim)',
                          borderRadius: 'var(--radius-md)', cursor: 'pointer',
                        }}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <TerminalButton type="submit" variant="primary" loading={isLoading}>
                    Save changes
                  </TerminalButton>
                  <TerminalButton type="button" variant="ghost" onClick={() => setEditing(false)}>
                    Cancel
                  </TerminalButton>
                </div>
              </form>
            )}
          </TerminalBox>

          <TerminalBox title="Combat record">
            {stats ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                <Stat label="Wins"      value={stats.stats.wins} color="var(--green-bright)" />
                <Stat label="Losses"    value={stats.stats.losses} color="var(--red-bright)" />
                <Stat label="Draws"     value={stats.stats.draws} color="var(--text-dim)" />
                <Stat label="Win rate"  value={`${stats.stats.winRate}%`} color="var(--green-bright)" />
                <Stat label="Breaches"  value={stats.stats.successfulBreaches} color="var(--red-bright)" />
                <Stat label="Defenses"  value={stats.stats.successfulDefenses} color="var(--green-bright)" />
                <Stat label="Tools used"value={stats.stats.toolsDeployed} color="var(--text-dim)" />
                <Stat label="Rounds"    value={stats.stats.totalRounds} color="var(--text-dim)" />
              </div>
            ) : (
              <p style={{ color: 'var(--text-dim)', fontSize: '12px' }}>Loading combat record...</p>
            )}
          </TerminalBox>
        </div>
      </div>
    </AppShell>
  );
};

const Field = ({ label, value }) => (
  <div style={{ marginBottom: '14px' }}>
    <p style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'var(--font-display)', letterSpacing: '0.08em', marginBottom: '2px' }}>
      {label.toUpperCase()}
    </p>
    <p style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{value}</p>
  </div>
);

const Stat = ({ label, value, color }) => (
  <div>
    <p style={{ fontSize: '22px', fontFamily: 'var(--font-display)', color, fontWeight: 700 }}>{value}</p>
    <p style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
  </div>
);

export default MyProfilePage;
