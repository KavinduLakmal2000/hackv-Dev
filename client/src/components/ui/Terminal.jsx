import React from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// BREACH Terminal UI Components
// All inputs, buttons, panels in the hacker-terminal aesthetic.
// ─────────────────────────────────────────────────────────────────────────────

// ── TerminalBox ───────────────────────────────────────────────────────────────
// A panel with a labelled header border — the signature UI frame

export const TerminalBox = ({ title, children, className = '', accent = 'green', style }) => {
  const borderColor = accent === 'red' ? 'var(--red-mid)' : 'var(--green-mid)';
  const titleColor  = accent === 'red' ? 'var(--red-bright)' : 'var(--green-bright)';

  return (
    <div
      className={`terminal-box ${className}`}
      style={{
        border:       `1px solid ${borderColor}`,
        borderRadius: 'var(--radius-md)',
        background:   'var(--bg-secondary)',
        position:     'relative',
        ...style,
      }}
    >
      {title && (
        <div style={{
          position:     'absolute',
          top:          '-10px',
          left:         '16px',
          background:   'var(--bg-secondary)',
          padding:      '0 8px',
          fontSize:     '10px',
          fontFamily:   'var(--font-display)',
          letterSpacing:'0.1em',
          color:        titleColor,
          textTransform:'uppercase',
        }}>
          {title}
        </div>
      )}
      <div style={{ padding: '24px' }}>
        {children}
      </div>
    </div>
  );
};

// ── TerminalInput ─────────────────────────────────────────────────────────────

export const TerminalInput = React.forwardRef(({
  label,
  error,
  prefix = '>',
  type = 'text',
  className = '',
  ...props
}, ref) => (
  <div style={{ marginBottom: '16px' }}>
    {label && (
      <label style={{
        display:      'block',
        fontSize:     '10px',
        fontFamily:   'var(--font-display)',
        letterSpacing:'0.1em',
        color:        'var(--text-dim)',
        marginBottom: '6px',
        textTransform:'uppercase',
      }}>
        {label}
      </label>
    )}
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      {prefix && (
        <span style={{
          position:   'absolute',
          left:       '12px',
          color:      error ? 'var(--red-bright)' : 'var(--green-dim)',
          fontSize:   '12px',
          fontFamily: 'var(--font-mono)',
          userSelect: 'none',
        }}>
          {prefix}
        </span>
      )}
      <input
        ref={ref}
        type={type}
        className={className}
        style={{
          width:        '100%',
          background:   'var(--bg-input)',
          border:       `1px solid ${error ? 'var(--red-mid)' : 'var(--border-primary)'}`,
          borderRadius: 'var(--radius-md)',
          color:        'var(--text-primary)',
          fontFamily:   'var(--font-mono)',
          fontSize:     '13px',
          padding:      prefix ? '10px 12px 10px 28px' : '10px 12px',
          outline:      'none',
          transition:   'border-color var(--transition)',
          caretColor:   'var(--green-bright)',
        }}
        onFocus={(e) => {
          e.target.style.borderColor = error ? 'var(--red-bright)' : 'var(--green-bright)';
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          e.target.style.borderColor = error ? 'var(--red-mid)' : 'var(--border-primary)';
          props.onBlur?.(e);
        }}
        {...props}
      />
    </div>
    {error && (
      <p style={{
        fontSize:   '11px',
        color:      'var(--red-bright)',
        marginTop:  '4px',
        fontFamily: 'var(--font-mono)',
      }}>
        ✗ {error}
      </p>
    )}
  </div>
));
TerminalInput.displayName = 'TerminalInput';

// ── TerminalButton ────────────────────────────────────────────────────────────

export const TerminalButton = ({
  children,
  variant  = 'primary',  // 'primary' | 'secondary' | 'danger' | 'ghost'
  size     = 'md',
  loading  = false,
  disabled = false,
  fullWidth= false,
  onClick,
  type     = 'button',
  ...props
}) => {
  const styles = {
    primary: {
      background:   'var(--green-bright)',
      color:        'var(--text-inverse)',
      border:       '1px solid var(--green-bright)',
    },
    secondary: {
      background:   'transparent',
      color:        'var(--green-bright)',
      border:       '1px solid var(--green-mid)',
    },
    danger: {
      background:   'var(--red-ghost)',
      color:        'var(--red-bright)',
      border:       '1px solid var(--red-mid)',
    },
    ghost: {
      background:   'transparent',
      color:        'var(--text-dim)',
      border:       '1px solid transparent',
    },
  };

  const sizes = {
    sm: { padding: '6px 14px', fontSize: '11px' },
    md: { padding: '10px 20px', fontSize: '12px' },
    lg: { padding: '14px 28px', fontSize: '13px' },
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      style={{
        ...styles[variant],
        ...sizes[size],
        width:        fullWidth ? '100%' : 'auto',
        fontFamily:   'var(--font-display)',
        letterSpacing:'0.08em',
        textTransform:'uppercase',
        borderRadius: 'var(--radius-md)',
        cursor:       (disabled || loading) ? 'not-allowed' : 'pointer',
        opacity:      (disabled || loading) ? 0.5 : 1,
        transition:   'all var(--transition)',
        display:      'inline-flex',
        alignItems:   'center',
        justifyContent:'center',
        gap:          '8px',
      }}
      onMouseEnter={(e) => {
        if (!disabled && !loading) {
          if (variant === 'primary') e.currentTarget.style.background = '#00cc33';
          if (variant === 'secondary') e.currentTarget.style.background = 'var(--green-ghost)';
          if (variant === 'danger') e.currentTarget.style.background = '#330000';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !loading) {
          e.currentTarget.style.background = styles[variant].background;
        }
      }}
      {...props}
    >
      {loading ? (
        <>
          <span style={{ animation: 'blink 0.8s step-end infinite' }}>_</span>
          PROCESSING
        </>
      ) : children}
    </button>
  );
};

// ── TerminalAlert ─────────────────────────────────────────────────────────────

export const TerminalAlert = ({ type = 'error', message, onClose }) => {
  if (!message) return null;
  const colors = {
    error:   { border: 'var(--red-mid)',   color: 'var(--red-bright)',   prefix: '[ERR]' },
    success: { border: 'var(--green-mid)', color: 'var(--green-bright)', prefix: '[OK]'  },
    warning: { border: 'var(--amber)',     color: 'var(--amber)',        prefix: '[WARN]'},
    info:    { border: 'var(--blue-info)', color: 'var(--blue-info)',    prefix: '[INFO]'},
  };
  const c = colors[type];
  return (
    <div style={{
      border:       `1px solid ${c.border}`,
      borderRadius: 'var(--radius-md)',
      padding:      '10px 14px',
      marginBottom: '16px',
      display:      'flex',
      alignItems:   'flex-start',
      gap:          '10px',
      background:   type === 'error' ? 'var(--red-ghost)' : 'var(--green-ghost)',
    }}>
      <span style={{ color: c.color, fontFamily: 'var(--font-mono)', fontSize: '11px', flexShrink: 0, paddingTop: '1px' }}>
        {c.prefix}
      </span>
      <span style={{ color: c.color, fontFamily: 'var(--font-mono)', fontSize: '12px', flex: 1 }}>
        {message}
      </span>
      {onClose && (
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: c.color, cursor: 'pointer', fontSize: '14px', lineHeight: 1 }}>
          ✕
        </button>
      )}
    </div>
  );
};

// ── TerminalDivider ────────────────────────────────────────────────────────────

export const TerminalDivider = ({ label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' }}>
    <div style={{ flex: 1, height: '1px', background: 'var(--border-dim)' }} />
    {label && (
      <span style={{
        fontSize:     '10px',
        color:        'var(--text-muted)',
        fontFamily:   'var(--font-display)',
        letterSpacing:'0.1em',
        textTransform:'uppercase',
      }}>
        {label}
      </span>
    )}
    <div style={{ flex: 1, height: '1px', background: 'var(--border-dim)' }} />
  </div>
);

// ── Spinner ────────────────────────────────────────────────────────────────────

export const Spinner = ({ size = 20, color = 'var(--green-bright)' }) => (
  <div style={{
    width:        size,
    height:       size,
    border:       `2px solid var(--border-dim)`,
    borderTop:    `2px solid ${color}`,
    borderRadius: '50%',
    animation:    'spin 0.8s linear infinite',
    flexShrink:   0,
  }} />
);

// ── FieldError list (for Zod validation errors) ───────────────────────────────

export const FieldErrors = ({ errors }) => {
  if (!errors?.length) return null;
  return (
    <div style={{ marginBottom: '16px' }}>
      {errors.map((e, i) => (
        <p key={i} style={{ fontSize: '11px', color: 'var(--red-bright)', fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>
          ✗ {e.field ? `${e.field}: ` : ''}{e.message}
        </p>
      ))}
    </div>
  );
};
