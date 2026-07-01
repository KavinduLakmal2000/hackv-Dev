import React, { useState } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// ShopItemCard — sends ONLY { itemId } to the store's buyItem action.
// The displayed price/cost is for the player's information only; the
// server independently re-validates the real price and never trusts
// anything this component sends beyond the item's identifier.
// ─────────────────────────────────────────────────────────────────────────────

const ShopItemCard = ({ item, owned, equipped, canAfford, onBuy, onEquip, onUnequip }) => {
  const [pending, setPending] = useState(false);

  const handleBuy = async () => {
    setPending(true);
    await onBuy(item.id);
    setPending(false);
  };

  const locked = item.requiredTier && !item._tierMet;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px',
      background: 'var(--bg-secondary)',
      border: `1px solid ${owned ? 'var(--green-mid)' : 'var(--border-primary)'}`,
      borderRadius: 'var(--radius-md)', position: 'relative',
    }}>
      {item.badge && (
        <span style={{
          position: 'absolute', top: '-8px', right: '12px',
          fontSize: '8px', fontFamily: 'var(--font-display)', letterSpacing: '0.05em',
          background: 'var(--amber)', color: 'var(--text-inverse)',
          padding: '2px 8px', borderRadius: '3px',
        }}>
          {item.badge}
        </span>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '13px', color: 'var(--text-primary)' }}>
          {item.name}
        </p>
        {owned && (
          <span style={{ fontSize: '9px', color: 'var(--green-bright)', fontFamily: 'var(--font-display)' }}>
            OWNED
          </span>
        )}
      </div>

      <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4, minHeight: '32px' }}>
        {item.desc}
      </p>

      {item.requiredTier && (
        <p style={{ fontSize: '9px', color: 'var(--amber)' }}>
          Requires {item.requiredTier.replace('_', ' ')} rank
        </p>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
        {!owned ? (
          <>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: '13px',
              color: canAfford ? 'var(--amber)' : 'var(--red-dim)',
            }}>
              {item.premiumCost === 0 ? 'Free (rank)' : `${item.premiumCost} tokens`}
            </span>
            <BuyButton onClick={handleBuy} disabled={!canAfford || pending} pending={pending} />
          </>
        ) : item.slot ? (
          equipped ? (
            <button onClick={() => onUnequip(item.slot)} style={ghostBtnStyle}>
              Unequip
            </button>
          ) : (
            <button onClick={() => onEquip(item.id, item.slot)} style={primaryBtnStyle}>
              Equip
            </button>
          )
        ) : (
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Used automatically</span>
        )}
      </div>
    </div>
  );
};

const BuyButton = ({ onClick, disabled, pending }) => (
  <button onClick={onClick} disabled={disabled} style={{ ...primaryBtnStyle, opacity: disabled ? 0.4 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}>
    {pending ? '...' : 'Buy'}
  </button>
);

const primaryBtnStyle = {
  background: 'var(--green-bright)', color: 'var(--text-inverse)', border: 'none',
  borderRadius: 'var(--radius-md)', padding: '6px 16px', fontSize: '11px',
  fontFamily: 'var(--font-display)', letterSpacing: '0.05em', textTransform: 'uppercase', cursor: 'pointer',
};

const ghostBtnStyle = {
  background: 'transparent', color: 'var(--green-bright)', border: '1px solid var(--green-mid)',
  borderRadius: 'var(--radius-md)', padding: '6px 16px', fontSize: '11px',
  fontFamily: 'var(--font-display)', letterSpacing: '0.05em', textTransform: 'uppercase', cursor: 'pointer',
};

export default ShopItemCard;
