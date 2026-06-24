import React from 'react';
import { Avatar } from '../layout/Navbar.jsx';
import useAuthStore from '../../store/authStore.js';

// ─────────────────────────────────────────────────────────────────────────────
// TeamSlotGrid — shows both teams side by side with filled/empty player slots.
// Clicking an empty slot on a team you're not on switches you to that team.
// ─────────────────────────────────────────────────────────────────────────────

const MODE_SLOTS = { '1v1': 1, '5v5': 5, training: 1 };

const TeamSlotGrid = ({ lobby, onChooseTeam, onKick }) => {
  const { user } = useAuthStore();
  const slotsPerTeam = MODE_SLOTS[lobby.mode] ?? 1;

  const developers = lobby.players.filter((p) => p.team === 'developer');
  const hackers     = lobby.players.filter((p) => p.team === 'hacker');
  const me          = lobby.players.find((p) => p.userId === user?.id || p.userId?._id === user?.id);
  const isHost      = me?.isHost;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
      <TeamColumn
        team="developer"
        label="Developers"
        color="var(--green-bright)"
        players={developers}
        slots={slotsPerTeam}
        meId={user?.id}
        isHost={isHost}
        onJoin={() => onChooseTeam('developer')}
        onKick={onKick}
        canJoin={me?.team !== 'developer'}
      />
      <TeamColumn
        team="hacker"
        label="Hackers"
        color="var(--red-bright)"
        players={hackers}
        slots={slotsPerTeam}
        meId={user?.id}
        isHost={isHost}
        onJoin={() => onChooseTeam('hacker')}
        onKick={onKick}
        canJoin={me?.team !== 'hacker'}
      />
    </div>
  );
};

const TeamColumn = ({ team, label, color, players, slots, meId, isHost, onJoin, onKick, canJoin }) => {
  const emptySlots = Math.max(0, slots - players.length);

  return (
    <div style={{
      border:       `1px solid ${color}33`,
      borderRadius: 'var(--radius-md)',
      padding:      '16px',
      background:   `${color}08`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <h4 style={{
          fontFamily:   'var(--font-display)',
          fontSize:     '0.85rem',
          color,
          letterSpacing:'0.05em',
          textTransform:'uppercase',
        }}>
          {label}
        </h4>
        <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
          {players.length}/{slots}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {players.map((p) => (
          <PlayerSlot
            key={p.userId?._id || p.userId}
            player={p}
            color={color}
            isMe={(p.userId?._id || p.userId) === meId}
            canKick={isHost && (p.userId?._id || p.userId) !== meId}
            onKick={() => onKick?.(p.userId?._id || p.userId)}
          />
        ))}

        {Array.from({ length: emptySlots }).map((_, i) => (
          <EmptySlot key={i} color={color} onClick={canJoin ? onJoin : undefined} />
        ))}
      </div>
    </div>
  );
};

const PlayerSlot = ({ player, color, isMe, canKick, onKick }) => (
  <div style={{
    display:      'flex',
    alignItems:   'center',
    gap:          '10px',
    padding:      '8px 10px',
    background:   'var(--bg-secondary)',
    border:       '1px solid var(--border-dim)',
    borderRadius: 'var(--radius-md)',
  }}>
    <Avatar user={player} size={28} />
    <span style={{
      flex:       1,
      fontSize:   '12px',
      color:      isMe ? color : 'var(--text-primary)',
      fontFamily: 'var(--font-mono)',
    }}>
      {player.displayName || player.username}
      {isMe && <span style={{ color: 'var(--text-dim)', fontSize: '10px' }}> (you)</span>}
    </span>

    {player.isHost && <HostBadge />}

    <ReadyDot ready={player.isReady} />

    {canKick && (
      <button
        onClick={onKick}
        title="Kick player"
        style={{
          background: 'none', border: 'none', color: 'var(--red-dim)',
          cursor: 'pointer', fontSize: '12px', padding: '2px',
        }}
      >
        ✕
      </button>
    )}
  </div>
);

const EmptySlot = ({ color, onClick }) => (
  <button
    onClick={onClick}
    disabled={!onClick}
    style={{
      display:      'flex',
      alignItems:   'center',
      justifyContent:'center',
      padding:      '8px 10px',
      height:       '44px',
      background:   'transparent',
      border:       `1px dashed ${color}44`,
      borderRadius: 'var(--radius-md)',
      cursor:       onClick ? 'pointer' : 'default',
      fontSize:     '11px',
      color:        'var(--text-muted)',
      fontFamily:   'var(--font-mono)',
    }}
  >
    {onClick ? '+ Join slot' : 'Open slot'}
  </button>
);

const ReadyDot = ({ ready }) => (
  <span
    title={ready ? 'Ready' : 'Not ready'}
    style={{
      display:      'inline-block',
      width:        '8px',
      height:       '8px',
      borderRadius: '50%',
      background:   ready ? 'var(--green-bright)' : 'var(--border-primary)',
      boxShadow:    ready ? '0 0 6px var(--green-bright)' : 'none',
      flexShrink:   0,
    }}
  />
);

const HostBadge = () => (
  <span style={{
    fontSize:     '9px',
    color:        'var(--amber)',
    fontFamily:   'var(--font-display)',
    letterSpacing:'0.05em',
    border:       '1px solid var(--amber)',
    borderRadius: '3px',
    padding:      '1px 5px',
    flexShrink:   0,
  }}>
    HOST
  </span>
);

export default TeamSlotGrid;
