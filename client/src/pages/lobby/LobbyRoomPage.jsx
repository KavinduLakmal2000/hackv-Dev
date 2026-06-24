import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell.jsx';
import { TerminalBox, TerminalButton, TerminalAlert, Spinner } from '../../components/ui/Terminal.jsx';
import TeamSlotGrid from '../../components/lobby/TeamSlotGrid.jsx';
import LobbyChat from '../../components/lobby/LobbyChat.jsx';
import useLobbyStore from '../../store/lobbyStore.js';
import useAuthStore from '../../store/authStore.js';
import { getSocket } from '../../socket/socketClient.js';

const LobbyRoomPage = () => {
  const { code }  = useParams();
  const navigate  = useNavigate();
  const { user }  = useAuthStore();
  const {
    currentLobby, isLoading, error,
    fetchMyCurrent, leaveLobby, chooseTeam, setReady,
    startGame, joinSocketRoom, leaveSocketRoom, attachSocketListeners, clearError,
  } = useLobbyStore();

  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);

  // Bootstrap: fetch the lobby, join the socket room, attach listeners
  useEffect(() => {
    let cleanup;
    (async () => {
      const lobby = await fetchMyCurrent();
      if (!lobby || lobby.code !== code.toUpperCase()) {
        // Not actually in this lobby (e.g. direct URL visit) — bounce to browser
        navigate('/lobby');
        return;
      }
      await joinSocketRoom(code.toUpperCase());
      cleanup = attachSocketListeners();
    })();

    return () => {
      cleanup?.();
      leaveSocketRoom(code.toUpperCase());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  // Listen for the game-starting event to navigate everyone at once
  useEffect(() => {
    const socket = getSocket();
    const handleGameStarting = (payload) => {
      navigate(`/game/${payload.lobbyCode}`);
    };
    socket.on('lobby:game_starting', handleGameStarting);
    return () => socket.off('lobby:game_starting', handleGameStarting);
  }, [navigate]);

  if (!currentLobby) {
    return (
      <AppShell>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}>
          <Spinner size={32} />
        </div>
      </AppShell>
    );
  }

  const me     = currentLobby.players.find((p) => (p.userId?._id || p.userId) === user?.id);
  const isHost = me?.isHost;
  const canStart = currentLobby.status === 'ready' && isHost;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentLobby.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleLeave = async () => {
    await leaveLobby();
    navigate('/lobby');
  };

  const handleStart = async () => {
    setStarting(true);
    const result = await startGame();
    if (!result.ok) setStarting(false);
    // On success, the 'lobby:game_starting' socket event handles navigation
  };

  return (
    <AppShell>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <p style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'var(--font-display)', letterSpacing: '0.1em', marginBottom: '4px' }}>
            SYS://LOBBY/{currentLobby.mode.toUpperCase()}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', fontSize: '1.5rem' }}>
              {currentLobby.code}
            </h1>
            <button
              onClick={handleCopyCode}
              style={{
                background: 'none', border: '1px solid var(--border-primary)',
                color: 'var(--text-dim)', borderRadius: 'var(--radius-md)',
                padding: '4px 10px', fontSize: '10px', cursor: 'pointer', fontFamily: 'var(--font-mono)',
              }}
            >
              {copied ? '✓ Copied' : 'Copy code'}
            </button>
            <StatusPill status={currentLobby.status} />
          </div>
        </div>
        <TerminalButton variant="danger" size="sm" onClick={handleLeave}>
          Leave lobby
        </TerminalButton>
      </div>

      {error && <TerminalAlert type="error" message={error} onClose={clearError} />}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px' }}>

        {/* ── Left: teams + controls ── */}
        <div>
          <TerminalBox title="Teams" style={{ marginBottom: '20px' }}>
            <TeamSlotGrid
              lobby={currentLobby}
              onChooseTeam={chooseTeam}
              onKick={(targetId) => useLobbyStore.getState().kickPlayer(targetId)}
            />
          </TerminalBox>

          <div style={{ display: 'flex', gap: '12px' }}>
            <TerminalButton
              variant={me?.isReady ? 'secondary' : 'primary'}
              size="lg"
              fullWidth
              disabled={!me?.team}
              onClick={() => setReady(!me?.isReady)}
            >
              {me?.isReady ? '✓ Ready — click to unready' : 'Ready up'}
            </TerminalButton>

            {isHost && (
              <TerminalButton
                variant="primary"
                size="lg"
                disabled={!canStart}
                loading={starting}
                onClick={handleStart}
                style={{ minWidth: '180px' }}
              >
                {canStart ? 'Start game' : 'Waiting for all ready'}
              </TerminalButton>
            )}
          </div>

          {!me?.team && (
            <p style={{ fontSize: '11px', color: 'var(--amber)', marginTop: '10px' }}>
              Pick a team before readying up.
            </p>
          )}
        </div>

        {/* ── Right: settings + chat ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <TerminalBox title="Match settings">
            <SettingRow label="Mode" value={currentLobby.mode} />
            <SettingRow label="Rounds" value={currentLobby.settings.roundCount} />
            <SettingRow label="Round time" value={`${currentLobby.settings.roundDuration}s`} />
            <SettingRow label="Start credits" value={currentLobby.settings.startCredits} />
            <SettingRow label="Privacy" value={currentLobby.isPrivate ? 'Private' : 'Public'} />
          </TerminalBox>

          <TerminalBox title="Lobby chat">
            <LobbyChat code={currentLobby.code} />
          </TerminalBox>
        </div>
      </div>
    </AppShell>
  );
};

const StatusPill = ({ status }) => {
  const colors = {
    waiting:     { c: 'var(--text-dim)',     bg: 'var(--bg-secondary)' },
    ready:       { c: 'var(--green-bright)', bg: 'var(--green-ghost)' },
    in_progress: { c: 'var(--amber)',        bg: 'var(--amber-dim)' },
  };
  const s = colors[status] ?? colors.waiting;
  return (
    <span style={{
      fontSize: '10px', fontFamily: 'var(--font-display)', letterSpacing: '0.05em',
      textTransform: 'uppercase', color: s.c, background: s.bg,
      border: `1px solid ${s.c}`, borderRadius: 'var(--radius-sm)', padding: '3px 10px',
    }}>
      {status.replace('_', ' ')}
    </span>
  );
};

const SettingRow = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-dim)' }}>
    <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{label}</span>
    <span style={{ fontSize: '11px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', textTransform: 'capitalize' }}>
      {value}
    </span>
  </div>
);

export default LobbyRoomPage;
