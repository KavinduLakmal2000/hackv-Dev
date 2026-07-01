import React, { useState } from 'react';
import { TerminalInput, TerminalButton, TerminalAlert } from '../ui/Terminal.jsx';

// ─────────────────────────────────────────────────────────────────────────────
// SecretWordPanel — DEVELOPER VIEW ONLY.
// Once set, the server locks it for the round (one shot, no edits).
// The word itself never leaves the developer's browser except in this
// single socket call — it is never logged, never shown in any other panel.
// ─────────────────────────────────────────────────────────────────────────────

const SecretWordPanel = ({ confirmedWord, hint, onSetWord }) => {
  const [word, setWord]   = useState('');
  const [hintText, setHintText] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  const alreadySet = !!confirmedWord;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const trimmed = word.trim();
    if (trimmed.length < 2 || trimmed.length > 20) {
      setError('Word must be 2–20 characters');
      return;
    }
    if (!/^[a-zA-Z0-9]+$/.test(trimmed)) {
      setError('Letters and numbers only');
      return;
    }
    setPending(true);
    const result = await onSetWord(trimmed, hintText.trim());
    setPending(false);
    if (!result.ok) setError(result.message || 'Failed to set word');
  };

  if (alreadySet) {
    return (
      <div>
        <p style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'var(--font-display)', letterSpacing: '0.08em', marginBottom: '8px' }}>
          SECRET WORD — LOCKED
        </p>
        <div style={{
          display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px',
        }}>
          {confirmedWord.split('').map((ch, i) => (
            <span key={i} style={{
              width: '26px', height: '32px', display: 'flex', alignItems: 'center',
              justifyContent: 'center', border: '1px solid var(--green-mid)',
              borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-mono)',
              fontSize: '14px', color: 'var(--green-bright)', background: 'var(--green-ghost)',
            }}>
              {ch}
            </span>
          ))}
        </div>
        {hint && (
          <p style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
            Hint shown to hackers: <em>"{hint}"</em>
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <p style={{ fontSize: '10px', color: 'var(--amber)', fontFamily: 'var(--font-display)', letterSpacing: '0.08em', marginBottom: '10px' }}>
        ⚠ SET SECRET WORD (ONE-TIME)
      </p>
      {error && <TerminalAlert type="error" message={error} onClose={() => setError('')} />}
      <TerminalInput
        label="Secret word"
        value={word}
        onChange={(e) => setWord(e.target.value)}
        placeholder="e.g. FIREWALL"
        maxLength={20}
        prefix={null}
        style={{ textTransform: 'uppercase' }}
      />
      <TerminalInput
        label="Hint (shown to hackers)"
        value={hintText}
        onChange={(e) => setHintText(e.target.value)}
        placeholder="A network defense term"
        maxLength={40}
        prefix={null}
      />
      <TerminalButton type="submit" variant="primary" size="sm" loading={pending} fullWidth>
        Lock in word
      </TerminalButton>
      <p style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '6px' }}>
        Cannot be changed once set. Hackers only see the hint and length.
      </p>
    </form>
  );
};

export default SecretWordPanel;
