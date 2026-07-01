import React, { useState } from 'react';
import { TerminalInput, TerminalButton } from '../ui/Terminal.jsx';

// ─────────────────────────────────────────────────────────────────────────────
// GuessPanel — HACKER VIEW ONLY.
// Shows the hint, word length, and any letters revealed via Data Exfil.
// The actual word is never sent to this client until they guess correctly.
// ─────────────────────────────────────────────────────────────────────────────

const GuessPanel = ({ hint, length, revealedMask, onGuess, lastWrong }) => {
  const [guess, setGuess]   = useState('');
  const [pending, setPending] = useState(false);
  const [shake, setShake]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = guess.trim();
    if (!trimmed) return;

    setPending(true);
    const result = await onGuess(trimmed);
    setPending(false);

    if (result.ok && !result.correct) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
      setGuess('');
    }
  };

  if (!length) {
    return (
      <p style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>
        Waiting for developer to set the secret word...
      </p>
    );
  }

  return (
    <div>
      <p style={{ fontSize: '10px', color: 'var(--red-bright)', fontFamily: 'var(--font-display)', letterSpacing: '0.08em', marginBottom: '10px' }}>
        EXPOSE THE SECRET WORD
      </p>

      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '12px' }}>
        {Array.from({ length }).map((_, i) => (
          <span key={i} style={{
            width: '24px', height: '30px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', border: '1px solid var(--red-dim)',
            borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-mono)',
            fontSize: '13px', color: 'var(--red-bright)', background: 'var(--red-ghost)',
          }}>
            {revealedMask?.[i] && revealedMask[i] !== '_' ? revealedMask[i] : ''}
          </span>
        ))}
      </div>

      {hint && (
        <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '12px' }}>
          Hint: <em>"{hint}"</em>
        </p>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px', animation: shake ? 'shake 0.3s' : 'none' }}>
        <input
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
          maxLength={20}
          placeholder="Type your guess..."
          style={{
            flex: 1, background: 'var(--bg-input)', border: `1px solid ${lastWrong ? 'var(--red-bright)' : 'var(--border-primary)'}`,
            borderRadius: 'var(--radius-md)', color: 'var(--text-primary)',
            fontFamily: 'var(--font-mono)', fontSize: '13px', padding: '10px 12px',
            outline: 'none', textTransform: 'uppercase',
          }}
        />
        <TerminalButton type="submit" variant="danger" size="md" loading={pending} disabled={!guess.trim()}>
          Submit
        </TerminalButton>
      </form>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
};

export default GuessPanel;
