import React from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// WalletDisplay — credits + premium currency, read directly from whatever
// the server's last response said. Never computed or incremented locally.
// ─────────────────────────────────────────────────────────────────────────────

const WalletDisplay = ({ wallet, size = 'md' }) => {
  const fontSize = size === 'sm' ? '11px' : size === 'lg' ? '14px' : '12px';

  return (
    <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
      <Currency icon={<CreditIcon />} value={wallet?.credits ?? 0} color="var(--green-bright)" fontSize={fontSize} label="Credits" />
      <Currency icon={<TokenIcon />} value={wallet?.premiumCurrency ?? 0} color="var(--amber)" fontSize={fontSize} label="Tokens" />
    </div>
  );
};

const Currency = ({ icon, value, color, fontSize, label }) => (
  <div title={label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
    <span style={{ color, display: 'flex' }}>{icon}</span>
    <span style={{ fontFamily: 'var(--font-mono)', fontSize, color: 'var(--text-primary)' }}>
      {value.toLocaleString()}
    </span>
  </div>
);

const CreditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
  </svg>
);

const TokenIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
    <path d="M12 7v10M9 9.5h4a1.5 1.5 0 010 3H9.5a1.5 1.5 0 000 3H15" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

export default WalletDisplay;
