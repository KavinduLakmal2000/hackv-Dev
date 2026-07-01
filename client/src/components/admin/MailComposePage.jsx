import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell.jsx';
import {
  TerminalBox, TerminalInput, TerminalButton, TerminalAlert, FieldErrors,
} from '../../components/ui/Terminal.jsx';
import useAdminStore from '../../store/adminStore.js';
import { TIERS } from '../../theme/rankTiers.js';

const MailComposePage = () => {
  const {
    sendBroadcast, sendPersonalMail, fetchSentMail, sentMail,
    deleteSentMail, isLoading, error, actionMessage, clearError, clearActionMessage,
  } = useAdminStore();

  const [mode, setMode] = useState('broadcast');
  const [form, setForm] = useState({
    recipientId: '',
    subject:     '',
    body:        '',
    priority:    'normal',
    targetTier:  '',
    reward: { credits: 0, premiumCurrency: 0, itemId: '' },
  });
  const [serverErrors, setServerErrors] = useState([]);

  useEffect(() => {
    if (mode === 'history') fetchSentMail();
  }, [mode, fetchSentMail]);

  useEffect(() => {
    if (actionMessage) {
      const t = setTimeout(clearActionMessage, 2500);
      return () => clearTimeout(t);
    }
  }, [actionMessage, clearActionMessage]);

  const resetForm = () => setForm({
    recipientId: '', subject: '', body: '', priority: 'normal', targetTier: '',
    reward: { credits: 0, premiumCurrency: 0, itemId: '' },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    setServerErrors([]);

    const reward = {
      credits:         Number(form.reward.credits) || 0,
      premiumCurrency: Number(form.reward.premiumCurrency) || 0,
      ...(form.reward.itemId ? { itemId: form.reward.itemId } : {}),
    };

    let result;
    if (mode === 'broadcast') {
      result = await sendBroadcast({
        subject: form.subject, body: form.body, priority: form.priority,
        reward, targetTier: form.targetTier || undefined,
      });
    } else {
      result = await sendPersonalMail({
        recipientId: form.recipientId, subject: form.subject, body: form.body,
        priority: form.priority, reward,
      });
    }

    if (result.ok) resetForm();
    else if (result.errors) setServerErrors(result.errors);
  };

  return (
    <AppShell>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <p style={{ fontSize: '10px', color: 'var(--red-dim)', fontFamily: 'var(--font-display)', letterSpacing: '0.1em', marginBottom: '4px' }}>
            SYS://ADMIN/MAIL
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>Mail System</h1>
        </div>
        <Link to="/admin" style={{ fontSize: '11px', color: 'var(--text-dim)' }}>← Dashboard</Link>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {[['broadcast', 'Broadcast'], ['personal', 'Personal'], ['history', 'Sent History']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            style={{
              padding: '7px 16px', fontSize: '11px', fontFamily: 'var(--font-display)',
              letterSpacing: '0.05em', textTransform: 'uppercase',
              border: `1px solid ${mode === key ? 'var(--green-bright)' : 'var(--border-primary)'}`,
              background: mode === key ? 'var(--green-ghost)' : 'transparent',
              color: mode === key ? 'var(--green-bright)' : 'var(--text-dim)',
              borderRadius: 'var(--radius-md)', cursor: 'pointer',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <TerminalAlert type="error" message={error} onClose={clearError} />}
      {actionMessage && <TerminalAlert type="success" message={actionMessage} onClose={clearActionMessage} />}
      <FieldErrors errors={serverErrors} />

      {mode === 'history' ? (
        <TerminalBox title="Sent mail">
          {sentMail.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '24px', fontSize: '12px' }}>
              No mail sent yet.
            </p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-dim)' }}>
                  <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-dim)', fontSize: '10px' }}>Subject</th>
                  <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-dim)', fontSize: '10px' }}>Type</th>
                  <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-dim)', fontSize: '10px' }}>To</th>
                  <th style={{ textAlign: 'right', padding: '8px', color: 'var(--text-dim)', fontSize: '10px' }}>Sent</th>
                  <th style={{ textAlign: 'right', padding: '8px' }} />
                </tr>
              </thead>
              <tbody>
                {sentMail.map((m) => (
                  <tr key={m._id} style={{ borderBottom: '1px solid var(--border-dim)' }}>
                    <td style={{ padding: '8px', color: 'var(--text-primary)' }}>{m.subject}</td>
                    <td style={{ padding: '8px', color: 'var(--text-dim)', textTransform: 'capitalize' }}>{m.type}</td>
                    <td style={{ padding: '8px', color: 'var(--text-muted)' }}>
                      {m.recipientId?.username || 'Everyone'}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', color: 'var(--text-muted)' }}>
                      {new Date(m.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>
                      <button
                        onClick={() => deleteSentMail(m._id)}
                        style={{ background: 'none', border: 'none', color: 'var(--red-dim)', cursor: 'pointer', fontSize: '11px' }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </TerminalBox>
      ) : (
        <TerminalBox title={mode === 'broadcast' ? 'Compose broadcast' : 'Compose personal mail'}>
          <form onSubmit={handleSubmit}>
            {mode === 'personal' && (
              <TerminalInput
                label="Recipient user ID"
                value={form.recipientId}
                onChange={(e) => setForm((f) => ({ ...f, recipientId: e.target.value }))}
                placeholder="MongoDB ObjectId from User Management"
                prefix={null}
              />
            )}

            {mode === 'broadcast' && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-dim)', marginBottom: '6px', fontFamily: 'var(--font-display)', letterSpacing: '0.08em' }}>
                  TARGET TIER (OPTIONAL)
                </label>
                <select
                  value={form.targetTier}
                  onChange={(e) => setForm((f) => ({ ...f, targetTier: e.target.value }))}
                  style={{
                    width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-primary)',
                    color: 'var(--text-primary)', borderRadius: 'var(--radius-md)', padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: '13px',
                  }}
                >
                  <option value="">All players</option>
                  {TIERS.map((t) => <option key={t.name} value={t.name}>{t.label}+</option>)}
                </select>
              </div>
            )}

            <TerminalInput
              label="Subject"
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              maxLength={120}
              prefix={null}
            />

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-dim)', marginBottom: '6px', fontFamily: 'var(--font-display)', letterSpacing: '0.08em' }}>
                BODY
              </label>
              <textarea
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                maxLength={4000}
                rows={6}
                style={{
                  width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-primary)',
                  borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)',
                  fontSize: '13px', padding: '10px 12px', resize: 'vertical', outline: 'none',
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-dim)', marginBottom: '8px', fontFamily: 'var(--font-display)', letterSpacing: '0.08em' }}>
                PRIORITY
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {['normal', 'important', 'critical'].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, priority: p }))}
                    style={{
                      flex: 1, padding: '8px', fontSize: '11px', textTransform: 'uppercase',
                      background: form.priority === p ? 'var(--green-ghost)' : 'transparent',
                      border: `1px solid ${form.priority === p ? 'var(--green-bright)' : 'var(--border-primary)'}`,
                      color: form.priority === p ? 'var(--green-bright)' : 'var(--text-dim)',
                      borderRadius: 'var(--radius-md)', cursor: 'pointer', fontFamily: 'var(--font-display)',
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-dim)', paddingTop: '16px', marginBottom: '20px' }}>
              <p style={{ fontSize: '10px', color: 'var(--amber)', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', marginBottom: '10px' }}>
                ATTACH REWARD (OPTIONAL)
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <TerminalInput
                  label="Credits"
                  type="number"
                  value={form.reward.credits}
                  onChange={(e) => setForm((f) => ({ ...f, reward: { ...f.reward, credits: e.target.value } }))}
                  prefix={null}
                  min={0}
                />
                <TerminalInput
                  label="Premium tokens"
                  type="number"
                  value={form.reward.premiumCurrency}
                  onChange={(e) => setForm((f) => ({ ...f, reward: { ...f.reward, premiumCurrency: e.target.value } }))}
                  prefix={null}
                  min={0}
                />
              </div>
            </div>

            <TerminalButton type="submit" variant="primary" size="lg" loading={isLoading} fullWidth>
              {mode === 'broadcast' ? 'Send to all players' : 'Send mail'}
            </TerminalButton>
          </form>
        </TerminalBox>
      )}
    </AppShell>
  );
};

export default MailComposePage;
