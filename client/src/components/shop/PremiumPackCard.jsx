import React, { useState } from 'react';
import { formatUsd } from '../../theme/shopCatalog.js';

// ─────────────────────────────────────────────────────────────────────────────
// PremiumPackCard — real-money purchases. Clicking redirects to Stripe's
// hosted Checkout page. No card data, payment logic, or pricing math
// ever touches this client — Stripe handles the entire payment surface,
// and the webhook (server-side, signature-verified) is what actually
// credits the account after payment completes.
// ─────────────────────────────────────────────────────────────────────────────

const PremiumPackCard = ({ pack, onCheckout }) => {
  const [pending, setPending] = useState(false);

  const handleClick = async () => {
    setPending(true);
    await onCheckout(pack.id);
    // No need to reset pending — page navigates away to Stripe on success
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
      padding: '20px 16px', background: 'var(--bg-secondary)',
      border: `1px solid ${pack.badge ? 'var(--amber)' : 'var(--border-primary)'}`,
      borderRadius: 'var(--radius-md)', position: 'relative', textAlign: 'center',
    }}>
      {pack.badge && (
        <span style={{
          position: 'absolute', top: '-8px',
          fontSize: '8px', fontFamily: 'var(--font-display)', letterSpacing: '0.05em',
          background: 'var(--amber)', color: 'var(--text-inverse)',
          padding: '2px 10px', borderRadius: '3px',
        }}>
          {pack.badge}
        </span>
      )}

      <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--amber)', fontWeight: 900, marginTop: '6px' }}>
        {pack.premiumGiven.toLocaleString()}
      </p>
      <p style={{ fontSize: '10px', color: 'var(--text-dim)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        Tokens
      </p>
      <p style={{ fontSize: '10px', color: 'var(--text-muted)', minHeight: '14px' }}>
        {pack.desc}
      </p>

      <button
        onClick={handleClick}
        disabled={pending}
        style={{
          width: '100%', marginTop: '6px', padding: '10px',
          background: 'var(--amber)', color: 'var(--text-inverse)', border: 'none',
          borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-display)',
          fontSize: '13px', letterSpacing: '0.05em', cursor: pending ? 'wait' : 'pointer',
          opacity: pending ? 0.6 : 1,
        }}
      >
        {pending ? 'Redirecting...' : formatUsd(pack.priceUsdCents)}
      </button>
    </div>
  );
};

export default PremiumPackCard;
