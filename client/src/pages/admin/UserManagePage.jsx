import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell.jsx';
import { TerminalBox, TerminalInput, TerminalButton, Spinner, TerminalAlert } from '../../components/ui/Terminal.jsx';
import UserTable from '../../components/admin/UserTable.jsx';
import UserDetailModal from '../../components/admin/UserDetailModal.jsx';
import useAdminStore from '../../store/adminStore.js';

const UserManagePage = () => {
  const {
    users, usersMeta, isLoading, error, actionMessage,
    fetchUsers, updateUser, banUser, unbanUser, adjustRank,
    clearError, clearActionMessage,
  } = useAdminStore();

  const [search, setSearch]       = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [bannedFilter, setBannedFilter] = useState('');
  const [page, setPage]           = useState(1);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    fetchUsers({ page, search: search || undefined, role: roleFilter || undefined, banned: bannedFilter || undefined });
  }, [page, search, roleFilter, bannedFilter, fetchUsers]);

  useEffect(() => {
    if (actionMessage) {
      const t = setTimeout(clearActionMessage, 2500);
      return () => clearTimeout(t);
    }
  }, [actionMessage, clearActionMessage]);

  const selectedUser = users.find((u) => u._id === selectedId) ?? null;

  const handleRoleChange = (id, role) => updateUser(id, { role });

  return (
    <AppShell>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <p style={{ fontSize: '10px', color: 'var(--red-dim)', fontFamily: 'var(--font-display)', letterSpacing: '0.1em', marginBottom: '4px' }}>
            SYS://ADMIN/USERS
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>User Management</h1>
        </div>
        <Link to="/admin" style={{ fontSize: '11px', color: 'var(--text-dim)' }}>← Dashboard</Link>
      </div>

      {error && <TerminalAlert type="error" message={error} onClose={clearError} />}
      {actionMessage && <TerminalAlert type="success" message={actionMessage} onClose={clearActionMessage} />}

      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <TerminalInput
            placeholder="Search username, email, display name..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <FilterSelect
          value={roleFilter}
          onChange={(v) => { setRoleFilter(v); setPage(1); }}
          options={[['', 'All roles'], ['player', 'Player'], ['moderator', 'Moderator'], ['admin', 'Admin']]}
        />
        <FilterSelect
          value={bannedFilter}
          onChange={(v) => { setBannedFilter(v); setPage(1); }}
          options={[['', 'All statuses'], ['false', 'Active'], ['true', 'Banned']]}
        />
      </div>

      <TerminalBox>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <Spinner size={28} />
          </div>
        ) : (
          <UserTable
            users={users}
            onBan={(id) => banUser(id, 'Policy violation')}
            onUnban={unbanUser}
            onRoleChange={handleRoleChange}
            onSelectUser={setSelectedId}
          />
        )}
      </TerminalBox>

      {usersMeta.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
          <TerminalButton variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            ← Prev
          </TerminalButton>
          <span style={{ fontSize: '12px', color: 'var(--text-dim)', padding: '8px 0' }}>
            Page {page} of {usersMeta.totalPages} ({usersMeta.total} total)
          </span>
          <TerminalButton variant="ghost" size="sm" disabled={page >= usersMeta.totalPages} onClick={() => setPage((p) => p + 1)}>
            Next →
          </TerminalButton>
        </div>
      )}

      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => setSelectedId(null)}
          onBan={banUser}
          onUnban={unbanUser}
          onAdjustRank={adjustRank}
        />
      )}
    </AppShell>
  );
};

const FilterSelect = ({ value, onChange, options }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    style={{
      background: 'var(--bg-input)', border: '1px solid var(--border-primary)',
      color: 'var(--text-primary)', fontSize: '12px', borderRadius: 'var(--radius-md)',
      padding: '10px 12px', fontFamily: 'var(--font-mono)', minWidth: '140px',
    }}
  >
    {options.map(([val, label]) => (
      <option key={val} value={val}>{label}</option>
    ))}
  </select>
);

export default UserManagePage;
