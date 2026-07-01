import React from 'react';
import DBHealthBar from './DBHealthBar.jsx';
import RoundTimer from './RoundTimer.jsx';
import ToolCard from './ToolCard.jsx';
import SecretWordPanel from './SecretWordPanel.jsx';
import { DEVELOPER_TOOLS } from '../../theme/toolCatalog.js';
import { TerminalBox } from '../ui/Terminal.jsx';

// ─────────────────────────────────────────────────────────────────────────────
// DeveloperView — everything a developer sees. No hacker tool details ever
// render here; the server never sends them. enemyPlayers only carries a
// redacted activeToolCount for the opposing team.
// ─────────────────────────────────────────────────────────────────────────────

const DeveloperView = ({ round, myPlayers, enemyPlayers, timeRemaining, onDeploy, onSetWord }) => {
  const me      = myPlayers[0] ?? null; // 1v1: just me. 5v5: render per-player in Slice (kept simple here)
  const credits = me?.credits ?? 0;
  const deployedIds = new Set(me?.activeTools?.map((t) => t.toolId) ?? []);

  const enemyToolCount = enemyPlayers.reduce((sum, p) => sum + (p.activeToolCount ?? 0), 0);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '20px' }}>

      {/* ── Main column: status + tools ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        <div style={{ display: 'flex', gap: '16px' }}>
          <TerminalBox accent="green" style={{ flex: 1 }}>
            <DBHealthBar health={round.dbHealth} />
          </TerminalBox>
          <TerminalBox accent="green" style={{ minWidth: '140px' }}>
            <RoundTimer remaining={timeRemaining} accent="green" />
          </TerminalBox>
          <TerminalBox accent="green" style={{ minWidth: '120px' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'var(--font-display)', letterSpacing: '0.08em', marginBottom: '4px' }}>
                CREDITS
              </p>
              <p style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', color: 'var(--green-bright)', fontWeight: 700 }}>
                {credits}
              </p>
            </div>
          </TerminalBox>
        </div>

        {enemyToolCount > 0 && (
          <p style={{ fontSize: '11px', color: 'var(--red-dim)', textAlign: 'center' }}>
            ⚠ {enemyToolCount} hacker tool{enemyToolCount > 1 ? 's' : ''} active against you
          </p>
        )}

        <TerminalBox title="Defense arsenal" accent="green">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {DEVELOPER_TOOLS.map((tool) => (
              <ToolCard
                key={tool.id}
                tool={tool}
                credits={credits}
                accent="green"
                deployed={deployedIds.has(tool.id)}
                disabled={round.status !== 'active'}
                onUse={onDeploy}
              />
            ))}
          </div>
        </TerminalBox>
      </div>

      {/* ── Side column: secret word ── */}
      <div>
        <TerminalBox title="Database secret" accent="green">
          <SecretWordPanel
            confirmedWord={round.secretWordConfirmed}
            hint={round.secretWordHint}
            onSetWord={onSetWord}
          />
        </TerminalBox>
      </div>
    </div>
  );
};

export default DeveloperView;
