import React, { useEffect, useState } from 'react';
import AppShell from '../../components/layout/AppShell.jsx';
import { TerminalBox, Spinner, TerminalAlert } from '../../components/ui/Terminal.jsx';
import useMailStore from '../../store/mailStore.js';
import useShopStore from '../../store/shopStore.js';

const PRIORITY_COLORS = {
  normal:    'var(--text-dim)',
  important: 'var(--amber)',
  critical:  'var(--red-bright)',
};

const InboxPage = () => {
  const {
    inbox, unreadCount, isLoading, error,
    fetchInbox, readMail, claimReward, deleteMail, clearError,
  } = useMailStore();

  const [openId, setOpenId] = useState(null);
  const [claimMsg, setClaimMsg] = useState('');

  useEffect(() => { fetchInbox(); }, [fetchInbox]);

  const handleOpen = async (mailId) => {
    setOpenId(openId === mailId ? null : mailId);
    await readMail(mailId);
  };

  const handleClaim = async (mailId) => {
    const result = await claimReward(mailId);
    if (result.ok) {
      const { credits, premiumCurrency } = result.claimed;
      setClaimMsg(`Claimed: ${credits > 0 ? `${credits} credits` : ''}${credits > 0 && premiumCurrency > 0 ? ', ' : ''}${premiumCurrency > 0 ? `${premiumCurrency} tokens` : ''}`);
      // Refresh wallet display in navbar
      useShopStore.getState().fetchCatalog();
      setTimeout(() => setClaimMsg(''), 3000);
    }
  };

  return (
    <AppShell>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <p style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'var(--font-display)', letterSpacing: '0.1em', marginBottom: '4px' }}>
            SYS://MAILBOX
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
            Inbox {unreadCount > 0 && <span style={{ fontSize: '14px', color: 'var(--green-bright)' }}>({unreadCount} unread)</span>}
          </h1>
        </div>
      </div>

      {error && <TerminalAlert type="error" message={error} onClose={clearError} />}
      {claimMsg && <TerminalAlert type="success" message={claimMsg} />}

      <TerminalBox>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <Spinner size={28} />
          </div>
        ) : inbox.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '30px', fontSize: '12px' }}>
            No messages.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {inbox.map((m) => {
              const hasReward = m.reward && (m.reward.credits > 0 || m.reward.premiumCurrency > 0 || m.reward.itemId);
              const isOpen = openId === m._id;

              return (
                <div key={m._id} style={{
                  border: `1px solid ${m.isRead ? 'var(--border-dim)' : 'var(--green-mid)'}`,
                  borderRadius: 'var(--radius-md)', overflow: 'hidden',
                }}>
                  <button
                    onClick={() => handleOpen(m._id)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '12px 14px', background: m.isRead ? 'transparent' : 'var(--green-ghost)',
                      border: 'none', cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    {!m.isRead && <Dot />}
                    <span style={{
                      fontSize: '9px', color: PRIORITY_COLORS[m.priority], border: `1px solid ${PRIORITY_COLORS[m.priority]}`,
                      borderRadius: '3px', padding: '2px 6px', textTransform: 'uppercase', fontFamily: 'var(--font-display)',
                    }}>
                      {m.priority}
                    </span>
                    <span style={{ flex: 1, fontSize: '13px', color: 'var(--text-primary)' }}>{m.subject}</span>
                    {hasReward && !m.rewardClaimed && (
                      <span style={{ fontSize: '10px', color: 'var(--amber)' }}>🎁 Reward</span>
                    )}
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      {new Date(m.createdAt).toLocaleDateString()}
                    </span>
                  </button>

                  {isOpen && (
                    <div style={{ padding: '14px', borderTop: '1px solid var(--border-dim)' }}>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', marginBottom: '14px' }}>
                        {m.body}
                      </p>
                      {hasReward && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                            {m.reward.credits > 0 && `${m.reward.credits} credits `}
                            {m.reward.premiumCurrency > 0 && `${m.reward.premiumCurrency} tokens`}
                          </span>
                          {m.rewardClaimed ? (
                            <span style={{ fontSize: '11px', color: 'var(--green-bright)' }}>✓ Claimed</span>
                          ) : (
                            <button
                              onClick={() => handleClaim(m._id)}
                              style={{
                                background: 'var(--amber)', color: 'var(--text-inverse)', border: 'none',
                                borderRadius: 'var(--radius-md)', padding: '6px 16px', fontSize: '11px',
                                fontFamily: 'var(--font-display)', cursor: 'pointer',
                              }}
                            >
                              Claim reward
                            </button>
                          )}
                        </div>
                      )}
                      {m.type !== 'broadcast' && (
                        <button
                          onClick={() => deleteMail(m._id)}
                          style={{ marginTop: '10px', background: 'none', border: 'none', color: 'var(--red-dim)', fontSize: '11px', cursor: 'pointer' }}
                        >
                          Delete message
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </TerminalBox>
    </AppShell>
  );
};

const Dot = () => (
  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--green-bright)', boxShadow: '0 0 6px var(--green-bright)', flexShrink: 0 }} />
);

export default InboxPage;
