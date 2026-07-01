import React from 'react';
import BreachProgressBar from './BreachProgressBar.jsx';
import RoundTimer from './RoundTimer.jsx';
import ToolCard from './ToolCard.jsx';
import GuessPanel from './GuessPanel.jsx';
import { HACKER_TOOLS } from '../../theme/toolCatalog.js';
import { TerminalBox } from '../ui/Terminal.jsx';

// ─────────────────────────────────────────────────────────────────────────────
// HackerView — everything a hacker sees. The secret word itself never
// reaches this component — only hint, length, and any revealed letter mask.
// Developer's specific defense tools never reach this component either —
// only an aggregate enemy tool count.
// ─────────────────────────────────────────────────────────────────────────────

const HackerView = ({ round, myPlayers, enemyPlayers, timeRemaining, onAttack, onGuess, lastGuessWrong }) => {
  const me      = myPlayers[0] ?? null;
  const credits = me?.credits ?? 0;

  const enemyDefenseCount = enemyPlayers.reduce((sum, p) => sum + (p.activeToolCount ?? 0), 0);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '20px' }}>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        <div style={{ display: 'flex', gap: '16px' }}>
          <TerminalBox accent="red" style={{ flex: 1 }}>
            <BreachProgressBar progress={round.breachProgress ?? 0} />
          </TerminalBox>
          <TerminalBox accent="red" style={{ minWidth: '140px' }}>
            <RoundTimer remaining={timeRemaining} accent="red" />
          </TerminalBox>
          <TerminalBox accent="red" style={{ minWidth: '120px' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'var(--font-display)', letterSpacing: '0.08em', marginBottom: '4px' }}>
                CREDITS
              </p>
              <p style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', color: 'var(--red-bright)', fontWeight: 700 }}>
                {credits}
              </p>
            </div>
          </TerminalBox>
        </div>

        {enemyDefenseCount > 0 && (
          <p style={{ fontSize: '11px', color: 'var(--green-dim)', textAlign: 'center' }}>
            Defense tools guarding the target: {enemyDefenseCount}
          </p>
        )}

        <TerminalBox title="Attack arsenal" accent="red">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {HACKER_TOOLS.map((tool) => (
              <ToolCard
                key={tool.id}
                tool={tool}
                credits={credits}
                accent="red"
                disabled={round.status !== 'active'}
                onUse={onAttack}
              />
            ))}
          </div>
        </TerminalBox>
      </div>

      <div>
        <TerminalBox title="Target intel" accent="red">
          <GuessPanel
            hint={round.secretWordHint}
            length={round.secretWordLength}
            revealedMask={round.revealedMask}
            onGuess={onGuess}
            lastWrong={lastGuessWrong}
          />
        </TerminalBox>
      </div>
    </div>
  );
};

export default HackerView;
