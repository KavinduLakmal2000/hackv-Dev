import React from 'react';
import RankBadge from '../ui/RankBadge.jsx';
import { Avatar } from '../layout/Navbar.jsx';

// ─────────────────────────────────────────────────────────────────────────────
// UserTable — admin user list. Every action (ban, role change, rank
// adjustment) routes through adminStore, which calls the real admin-only
// endpoints. This table never assumes an action succeeded — it reflects
// whatever the store's state says after the server responds.
// ─────────────────────────────────────────────────────────────────────────────

const UserTable = ({ users, onBan, onUnban, onRoleChange, onSelectUser }) => {
  if (users.length === 0) {
    return <p style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '30px', fontSize: '12px' }}>No users found.</p>;
  }

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
      <thead>
        <tr style={{ borderBottom: '1px solid var(--border-dim)' }}>
          <Th>User</Th>
          <Th>Email</Th>
          <Th>Role</Th>
          <Th>Rank</Th>
          <Th>Status</Th>
          <Th>Joined</Th>
          <Th align="right">Actions</Th>
        </tr>
      </thead>
      <tbody>
        {users.map((u) => (
          <tr key={u._id} style={{ borderBottom: '1px solid var(--border-dim)' }}>
            <Td>
              <button
                onClick={() => onSelectUser(u._id)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <Avatar user={u} size={26} />
                <span style={{ color: 'var(--text-primary)' }}>{u.displayName || u.username}</span>
              </button>
            </Td>
            <Td><span style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{u.email}</span></Td>
            <Td>
              <select
                value={u.role}
                onChange={(e) => onRoleChange(u._id, e.target.value)}
                style={{
                  background: 'var(--bg-input)', border: '1px solid var(--border-primary)',
                  color: 'var(--text-primary)', fontSize: '11px', borderRadius: 'var(--radius-sm)',
                  padding: '3px 6px', fontFamily: 'var(--font-mono)',
                }}
              >
                <option value="player">player</option>
                <option value="moderator">moderator</option>
                <option value="admin">admin</option>
              </select>
            </Td>
            <Td><RankBadge rank={u.rank} size="sm" showPoints={false} /></Td>
            <Td>
              {u.isBanned ? (
                <span style={{ color: 'var(--red-bright)', fontSize: '10px', fontFamily: 'var(--font-display)' }}>BANNED</span>
              ) : (
                <span style={{ color: 'var(--green-bright)', fontSize: '10px', fontFamily: 'var(--font-display)' }}>ACTIVE</span>
              )}
            </Td>
            <Td><span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{new Date(u.createdAt).toLocaleDateString()}</span></Td>
            <Td align="right">
              {u.isBanned ? (
                <ActionBtn color="var(--green-bright)" onClick={() => onUnban(u._id)}>Unban</ActionBtn>
              ) : (
                <ActionBtn color="var(--red-bright)" onClick={() => onBan(u._id)}>Ban</ActionBtn>
              )}
            </Td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const Th = ({ children, align = 'left' }) => (
  <th style={{
    textAlign: align, padding: '10px 12px', fontSize: '10px', color: 'var(--text-dim)',
    fontFamily: 'var(--font-display)', letterSpacing: '0.06em', textTransform: 'uppercase',
  }}>
    {children}
  </th>
);

const Td = ({ children, align = 'left' }) => (
  <td style={{ textAlign: align, padding: '10px 12px' }}>{children}</td>
);

const ActionBtn = ({ children, color, onClick }) => (
  <button
    onClick={onClick}
    style={{
      background: 'none', border: `1px solid ${color}`, color, borderRadius: 'var(--radius-sm)',
      padding: '4px 10px', fontSize: '10px', fontFamily: 'var(--font-display)',
      letterSpacing: '0.04em', cursor: 'pointer',
    }}
  >
    {children}
  </button>
);

export default UserTable;
