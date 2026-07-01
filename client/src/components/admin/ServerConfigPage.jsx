import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell.jsx';
import {
  TerminalBox, TerminalButton, TerminalInput, TerminalAlert, Spinner,
} from '../../components/ui/Terminal.jsx';
import useAdminStore from '../../store/adminStore.js';

// ─────────────────────────────────────────────────────────────────────────────
// ServerConfigPage — toggles the same flags the backend's maintenanceGuard,
// registrationGuard, matchmakingGuard, and shopGuard middleware read on
// every request. Flipping "Maintenance mode" here takes effect across the
// whole live server within ~30s (the middleware's in-memory cache TTL),
// not just in this admin's browser tab.
// ─────────────────────────────────────────────────────────────────────────────

const ServerConfigPage = () => {
  const { config, isLoading, error, actionMessage, fetchConfig, updateConfig, clearError, clearActionMessage } = useAdminStore();

  const [maintenanceMsg, setMaintenanceMsg] = useState('');
  const [announcementMsg, setAnnouncementMsg] = useState('');
  const [announcementType, setAnnouncementType] = useState('info');

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  useEffect(() => {
    if (config) {
      setMaintenanceMsg(config.maintenanceMode?.message ?? '');
      setAnnouncementMsg(config.announcement?.message ?? '');
      setAnnouncementType(config.announcement?.type ?? 'info');
    }
  }, [config]);

  useEffect(() => {
    if (actionMessage) {
      const t = setTimeout(clearActionMessage, 2500);
      return () => clearTimeout(t);
    }
  }, [actionMessage, clearActionMessage]);

  if (isLoading && !config) {
    return (
      <AppShell>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}>
          <Spinner size={32} />
        </div>
      </AppShell>
    );
  }

  const toggleMaintenance = (enabled) =>
    updateConfig({ maintenanceMode: { enabled, message: maintenanceMsg } });

  const toggleFlag = (key, value) => updateConfig({ [key]: value });

  const saveAnnouncement = () =>
    updateConfig({ announcement: { enabled: true, message: announcementMsg, type: announcementType } });

  const clearAnnouncement = () =>
    updateConfig({ announcement: { enabled: false, message: '', type: 'info' } });

  return (
    <AppShell>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <p style={{ fontSize: '10px', color: 'var(--red-dim)', fontFamily: 'var(--font-display)', letterSpacing: '0.1em', marginBottom: '4px' }}>
            SYS://ADMIN/CONFIG
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>Server Configuration</h1>
        </div>
        <Link to="/admin" style={{ fontSize: '11px', color: 'var(--text-dim)' }}>← Dashboard</Link>
      </div>

      {error && <TerminalAlert type="error" message={error} onClose={clearError} />}
      {actionMessage && <TerminalAlert type="success" message={actionMessage} onClose={clearActionMessage} />}

      {config && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

          {/* ── Maintenance mode ── */}
          <TerminalBox title="Maintenance mode" accent="red">
            <ToggleRow
              label="Site-wide maintenance"
              sublabel="Blocks all non-admin API requests"
              enabled={config.maintenanceMode?.enabled ?? false}
              onToggle={(v) => toggleMaintenance(v)}
              dangerous
            />
            <TerminalInput
              label="Message shown to players"
              value={maintenanceMsg}
              onChange={(e) => setMaintenanceMsg(e.target.value)}
              placeholder="BREACH is undergoing maintenance..."
              prefix={null}
              maxLength={300}
            />
            <TerminalButton
              variant="secondary" size="sm"
              onClick={() => updateConfig({ maintenanceMode: { enabled: config.maintenanceMode?.enabled ?? false, message: maintenanceMsg } })}
            >
              Update message
            </TerminalButton>
          </TerminalBox>

          {/* ── Feature toggles ── */}
          <TerminalBox title="Feature gates">
            <ToggleRow
              label="Registration open"
              sublabel="Allow new account sign-ups"
              enabled={config.registrationOpen}
              onToggle={(v) => toggleFlag('registrationOpen', v)}
            />
            <ToggleRow
              label="Matchmaking open"
              sublabel="Allow lobby creation and joining"
              enabled={config.matchmakingOpen}
              onToggle={(v) => toggleFlag('matchmakingOpen', v)}
            />
            <ToggleRow
              label="Shop open"
              sublabel="Allow purchases (Stripe webhook always stays active)"
              enabled={config.shopOpen}
              onToggle={(v) => toggleFlag('shopOpen', v)}
            />
          </TerminalBox>

          {/* ── Announcement banner ── */}
          <TerminalBox title="Announcement banner" style={{ gridColumn: 'span 2' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              {['info', 'warning', 'critical'].map((t) => (
                <button
                  key={t}
                  onClick={() => setAnnouncementType(t)}
                  style={{
                    padding: '6px 14px', fontSize: '11px', textTransform: 'uppercase',
                    border: `1px solid ${announcementType === t ? 'var(--amber)' : 'var(--border-primary)'}`,
                    background: announcementType === t ? 'var(--amber-dim)' : 'transparent',
                    color: announcementType === t ? 'var(--amber)' : 'var(--text-dim)',
                    borderRadius: 'var(--radius-md)', cursor: 'pointer', fontFamily: 'var(--font-display)',
                  }}
                >
                  {t}
                </button>
              ))}
              {config.announcement?.enabled && (
                <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--green-bright)', alignSelf: 'center' }}>
                  ● Currently live
                </span>
              )}
            </div>
            <TerminalInput
              value={announcementMsg}
              onChange={(e) => setAnnouncementMsg(e.target.value)}
              placeholder="e.g. New season starts Friday!"
              prefix={null}
              maxLength={500}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <TerminalButton variant="primary" size="sm" onClick={saveAnnouncement} disabled={!announcementMsg.trim()}>
                Publish announcement
              </TerminalButton>
              {config.announcement?.enabled && (
                <TerminalButton variant="ghost" size="sm" onClick={clearAnnouncement}>
                  Clear
                </TerminalButton>
              )}
            </div>
          </TerminalBox>

          {/* ── Season info ── */}
          <TerminalBox title="Current season" style={{ gridColumn: 'span 2' }}>
            <div style={{ display: 'flex', gap: '20px' }}>
              <InfoBlock label="Season number" value={config.season?.number ?? 1} />
              <InfoBlock label="Season name" value={config.season?.name ?? 'Season 1'} />
              <InfoBlock label="Ends at" value={config.season?.endsAt ? new Date(config.season.endsAt).toLocaleDateString() : 'Not set'} />
            </div>
          </TerminalBox>
        </div>
      )}
    </AppShell>
  );
};

const ToggleRow = ({ label, sublabel, enabled, onToggle, dangerous }) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 0', borderBottom: '1px solid var(--border-dim)', marginBottom: '4px',
  }}>
    <div>
      <p style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{label}</p>
      <p style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{sublabel}</p>
    </div>
    <button
      onClick={() => onToggle(!enabled)}
      style={{
        width: '44px', height: '24px', borderRadius: '12px', position: 'relative',
        background: enabled ? (dangerous ? 'var(--red-bright)' : 'var(--green-bright)') : 'var(--border-primary)',
        border: 'none', cursor: 'pointer', transition: 'background 0.2s',
      }}
    >
      <span style={{
        position: 'absolute', top: '3px', left: enabled ? '23px' : '3px',
        width: '18px', height: '18px', borderRadius: '50%', background: 'var(--bg-void)',
        transition: 'left 0.2s',
      }} />
    </button>
  </div>
);

const InfoBlock = ({ label, value }) => (
  <div>
    <p style={{ fontSize: '9px', color: 'var(--text-dim)', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', marginBottom: '4px' }}>
      {label.toUpperCase()}
    </p>
    <p style={{ fontSize: '14px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{value}</p>
  </div>
);

export default ServerConfigPage;
