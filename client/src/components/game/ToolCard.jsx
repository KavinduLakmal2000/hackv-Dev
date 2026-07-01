import React, { useState } from 'react';
import ToolIcon from '../ui/ToolIcon.jsx';
import { TIER_COLORS } from '../../theme/toolCatalog.js';

// ─────────────────────────────────────────────────────────────────────────────
// ToolCard — the buyable card UI for both Firewall-type defense tools and
// SQL-Inject-type attack tools. Sends ONLY { toolId } to the server — cost,
// cooldown, and effect are resolved server-side. This component never knows
// whether the purchase will actually succeed; it just asks and reacts.
// ─────────────────────────────────────────────────────────────────────────────

const ToolCard = ({
  tool,            // { id, name, cost, tier, icon, desc }
  credits,         // current player credits — used only to grey out, not to block
  onUse,           // async (toolId) => { ok, ... }
  accent = 'green',// 'green' | 'red'
  deployed = false,// already active (defense tools that persist)
  disabled = false,
}) => {
  const [pending, setPending] = useState(false);
  const [flash, setFlash]     = useState(null); // 'success' | 'fail'

  const tierColor   = TIER_COLORS[tool.tier];
  const accentColor = accent === 'red' ? 'var(--red-bright)' : 'var(--green-bright)';
  const canAfford    = credits >= tool.cost;
  const isDisabled    = disabled || deployed || !canAfford || pending;

  const handleClick = async () => {
    if (isDisabled) return;
    setPending(true);
    const result = await onUse(tool.id);
    setPending(false);
    setFlash(result.ok ? 'success' : 'fail');
    setTimeout(() => setFlash(null), 500);
  };

  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      title={tool.desc}
      style={{
        position:     'relative',
        display:      'flex',
        flexDirection:'column',
        alignItems:   'flex-start',
        gap:          '8px',
        padding:      '14px',
        width:        '100%',
        textAlign:    'left',
        background:   deployed ? `${accentColor}11` : 'var(--bg-secondary)',
        border:       `1px solid ${deployed ? accentColor : 'var(--border-primary)'}`,
        borderRadius: 'var(--radius-md)',
        cursor:       isDisabled ? 'not-allowed' : 'pointer',
        opacity:      (!canAfford && !deployed) ? 0.45 : 1,
        transition:   'all var(--transition)',
        outline:      flash === 'success' ? `2px solid ${accentColor}` : flash === 'fail' ? '2px solid var(--red-bright)' : 'none',
      }}
      onMouseEnter={(e) => { if (!isDisabled) e.currentTarget.style.borderColor = accentColor; }}
      onMouseLeave={(e) => { if (!isDisabled) e.currentTarget.style.borderColor = deployed ? accentColor : 'var(--border-primary)'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
        <ToolIcon name={tool.icon} size={20} color={deployed ? accentColor : 'var(--text-secondary)'} />
        <span style={{
          fontSize: '8px', fontFamily: 'var(--font-display)', letterSpacing: '0.05em',
          color: tierColor, border: `1px solid ${tierColor}`, borderRadius: '3px',
          padding: '1px 5px', textTransform: 'uppercase', height: 'fit-content',
        }}>
          T{tool.tier}
        </span>
      </div>

      <div>
        <p style={{
          fontFamily: 'var(--font-display)', fontSize: '12px',
          color: deployed ? accentColor : 'var(--text-primary)', marginBottom: '2px',
        }}>
          {tool.name}
        </p>
        <p style={{ fontSize: '10px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
          {tool.desc}
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: '4px' }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: '12px',
          color: canAfford ? 'var(--text-primary)' : 'var(--red-dim)',
        }}>
          {tool.cost}cr
        </span>
        {deployed ? (
          <span style={{ fontSize: '10px', color: accentColor, fontFamily: 'var(--font-display)' }}>
            ACTIVE
          </span>
        ) : pending ? (
          <span style={{ fontSize: '10px', color: 'var(--text-dim)' }} className="cursor">
            SENDING
          </span>
        ) : null}
      </div>
    </button>
  );
};

export default ToolCard;
