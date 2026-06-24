import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell.jsx';
import { TerminalBox, TerminalButton, TerminalInput, TerminalAlert, Spinner } from '../../components/ui/Terminal.jsx';
import ModeCard from '../../components/lobby/ModeCard.jsx';
import { Avatar } from '../../components/layout/Navbar.jsx';
import useLobbyStore from '../../store/lobbyStore.js';

const LobbyBrowserPage = () => {
  const navigate = useNavigate();
  const {
    publicLobbies, publicMeta, isLoading, error,
    fetchPublicLobbies, fetchMyCurrent, createLobby, joinLobby, clearError,
  } = useLobbyStore();

  const [view, setView]           = useState('browse'); // 'browse' | 'create' | 'join'
  const [modeFilter, setModeFilter] = useState('');
  const [createForm, setCreateForm] = useState({
    mode: '1v1', isPrivate: false, password: '',
    settings: { roundCount: 5, roundDuration: 120, startCredits: 500 },
  });
  const [joinCode, setJoinCode]     = useState('');
  const [joinPassword, setJoinPassword] = useState('');

  // Redirect straight into a lobby room if already in one
  useEffect(() => {
    (async () => {
      const existing = await fetchMyCurrent();
      if (existing) navigate(`/lobby/${existing.code}`);
    })();
  }, [fetchMyCurrent, navigate]);

  useEffect(() => {
    if (view === 'browse') fetchPublicLobbies({ mode: modeFilter || undefined });
  }, [view, modeFilter, fetchPublicLobbies]);

  const handleCreate = async (e) => {
    e.preventDefault();
    const result = await createLobby(createForm);
    if (result.ok) navigate(`/lobby/${result.lobby.code}`);
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    const result = await joinLobby(joinCode.toUpperCase(), joinPassword || undefined);
    if (result.ok) navigate(`/lobby/${result.lobby.code}`);
  };

  const handleQuickJoin = async (code) => {
    const result = await joinLobby(code);
    if (result.ok) navigate(`/lobby/${result.lobby.code}`);
  };

  return (
    <AppShell>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <p style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'var(--font-display)', letterSpacing: '0.1em', marginBottom: '4px' }}>
            SYS://MATCHMAKING
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>Lobby</h1>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <TerminalButton variant={view === 'browse' ? 'primary' : 'secondary'} size="sm" onClick={() => setView('browse')}>
            Browse
          </TerminalButton>
          <TerminalButton variant={view === 'create' ? 'primary' : 'secondary'} size="sm" onClick={() => setView('create')}>
            Create
          </TerminalButton>
          <TerminalButton variant={view === 'join' ? 'primary' : 'secondary'} size="sm" onClick={() => setView('join')}>
            Join by code
          </TerminalButton>
        </div>
      </div>

      {error && <TerminalAlert type="error" message={error} onClose={clearError} />}

      {/* ── Browse view ── */}
      {view === 'browse' && (
        <>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            {['', '1v1', '5v5', 'training'].map((m) => (
              <button
                key={m}
                onClick={() => setModeFilter(m)}
                style={{
                  padding: '6px 14px', fontSize: '11px', fontFamily: 'var(--font-display)',
                  letterSpacing: '0.05em', textTransform: 'uppercase',
                  border: `1px solid ${modeFilter === m ? 'var(--green-bright)' : 'var(--border-primary)'}`,
                  background: modeFilter === m ? 'var(--green-ghost)' : 'transparent',
                  color: modeFilter === m ? 'var(--green-bright)' : 'var(--text-dim)',
                  borderRadius: 'var(--radius-md)', cursor: 'pointer',
                }}
              >
                {m || 'All modes'}
              </button>
            ))}
          </div>

          <TerminalBox>
            {isLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                <Spinner size={28} />
              </div>
            ) : publicLobbies.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '30px', fontSize: '12px' }}>
                No open lobbies right now. Create one and be the first.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {publicLobbies.map((l) => (
                  <LobbyRow key={l.code} lobby={l} onJoin={() => handleQuickJoin(l.code)} />
                ))}
              </div>
            )}
          </TerminalBox>
        </>
      )}

      {/* ── Create view ── */}
      {view === 'create' && (
        <TerminalBox title="Create lobby">
          <form onSubmit={handleCreate}>
            <p style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'var(--font-display)', letterSpacing: '0.08em', marginBottom: '10px' }}>
              GAME MODE
            </p>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
              {['1v1', '5v5', 'training'].map((m) => (
                <ModeCard
                  key={m}
                  mode={m}
                  selected={createForm.mode === m}
                  onClick={() => setCreateForm((f) => ({ ...f, mode: m }))}
                />
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <input
                type="checkbox"
                id="isPrivate"
                checked={createForm.isPrivate}
                onChange={(e) => setCreateForm((f) => ({ ...f, isPrivate: e.target.checked }))}
                style={{ accentColor: 'var(--green-bright)' }}
              />
              <label htmlFor="isPrivate" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Private lobby (password protected)
              </label>
            </div>

            {createForm.isPrivate && (
              <TerminalInput
                label="Password"
                type="text"
                value={createForm.password}
                onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Set a join password"
                maxLength={20}
                prefix={null}
              />
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <SettingNumber
                label="Rounds"
                value={createForm.settings.roundCount}
                min={1} max={10}
                onChange={(v) => setCreateForm((f) => ({ ...f, settings: { ...f.settings, roundCount: v } }))}
              />
              <SettingNumber
                label="Round time (s)"
                value={createForm.settings.roundDuration}
                min={60} max={300} step={30}
                onChange={(v) => setCreateForm((f) => ({ ...f, settings: { ...f.settings, roundDuration: v } }))}
              />
              <SettingNumber
                label="Start credits"
                value={createForm.settings.startCredits}
                min={100} max={2000} step={50}
                onChange={(v) => setCreateForm((f) => ({ ...f, settings: { ...f.settings, startCredits: v } }))}
              />
            </div>

            <TerminalButton type="submit" variant="primary" size="lg" loading={isLoading} fullWidth>
              Create lobby
            </TerminalButton>
          </form>
        </TerminalBox>
      )}

      {/* ── Join by code view ── */}
      {view === 'join' && (
        <TerminalBox title="Join by code" style={{ maxWidth: '420px' }}>
          <form onSubmit={handleJoin}>
            <TerminalInput
              label="Lobby code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
              placeholder="X7K2NP"
              maxLength={6}
              autoFocus
              style={{ textTransform: 'uppercase', letterSpacing: '0.2em', textAlign: 'center', fontSize: '18px' }}
            />
            <TerminalInput
              label="Password (if private)"
              type="text"
              value={joinPassword}
              onChange={(e) => setJoinPassword(e.target.value)}
              placeholder="Optional"
              prefix={null}
            />
            <TerminalButton type="submit" variant="primary" size="lg" loading={isLoading} fullWidth disabled={joinCode.length !== 6}>
              Join lobby
            </TerminalButton>
          </form>
        </TerminalBox>
      )}
    </AppShell>
  );
};

const LobbyRow = ({ lobby, onJoin }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: '14px',
    padding: '12px 14px', border: '1px solid var(--border-dim)',
    borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)',
  }}>
    <span style={{
      fontFamily: 'var(--font-display)', fontSize: '11px', letterSpacing: '0.05em',
      color: 'var(--green-bright)', border: '1px solid var(--green-dim)',
      borderRadius: 'var(--radius-sm)', padding: '3px 8px', textTransform: 'uppercase',
    }}>
      {lobby.mode}
    </span>

    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-primary)', letterSpacing: '0.1em' }}>
      {lobby.code}
    </span>

    <div style={{ display: 'flex', marginLeft: '4px' }}>
      {lobby.players?.slice(0, 5).map((p, i) => (
        <div key={i} style={{ marginLeft: i > 0 ? '-8px' : 0 }}>
          <Avatar user={p} size={24} />
        </div>
      ))}
    </div>

    <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
      {lobby.playerCount}/{lobby.maxPlayers}
    </span>

    <div style={{ flex: 1 }} />

    <TerminalButton
      size="sm"
      variant="secondary"
      disabled={lobby.playerCount >= lobby.maxPlayers}
      onClick={onJoin}
    >
      {lobby.playerCount >= lobby.maxPlayers ? 'Full' : 'Join'}
    </TerminalButton>
  </div>
);

const SettingNumber = ({ label, value, min, max, step = 1, onChange }) => (
  <div>
    <p style={{ fontSize: '9px', color: 'var(--text-dim)', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', marginBottom: '6px' }}>
      {label.toUpperCase()}
    </p>
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(Math.min(max, Math.max(min, Number(e.target.value))))}
      style={{
        width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-primary)',
        borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)',
        fontSize: '13px', padding: '8px 10px', outline: 'none',
      }}
    />
  </div>
);

export default LobbyBrowserPage;
