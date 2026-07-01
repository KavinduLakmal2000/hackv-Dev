import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell.jsx';
import { TerminalBox, TerminalButton, Spinner, TerminalAlert } from '../../components/ui/Terminal.jsx';
import DeveloperView from '../../components/game/DeveloperView.jsx';
import HackerView from '../../components/game/HackerView.jsx';
import EventFeed from '../../components/game/EventFeed.jsx';
import useGameStore from '../../store/gameStore.js';

// ─────────────────────────────────────────────────────────────────────────────
// GamePage — orchestrates the whole live match.
// Flow: init session (REST) → join socket room → render role view →
// react to round_finished / switching_sides / finished broadcasts.
// ─────────────────────────────────────────────────────────────────────────────

const GamePage = () => {
  const { code }  = useParams(); // lobby code, used to init/locate the session
  const navigate  = useNavigate();

  const {
    sessionId, myTeam, score, round, myPlayers, enemyPlayers,
    timeRemaining, events, roundResult, gameResult, switchingSides,
    error, isLoading,
    initGame, joinGameSocket, attachSocketListeners, startRound,
    deployTool, setSecretWord, launchAttack, submitGuess,
    lastGuessWrong, clearError, clearReset,
  } = useGameStore();

  const [bootError, setBootError] = useState('');

  // ── Bootstrap: init session then join socket room ──────────────────────────
  useEffect(() => {
    let cleanup;
    (async () => {
      const initRes = await initGame(code);
      if (!initRes.ok) { setBootError(initRes.message); return; }

      const joinRes = await joinGameSocket(initRes.sessionId);
      if (!joinRes.ok) { setBootError(joinRes.message); return; }

      cleanup = attachSocketListeners();
    })();

    return () => {
      cleanup?.();
      clearReset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  // ── Navigate away on full game finish (after showing summary briefly) ──────
  useEffect(() => {
    if (gameResult) {
      const timer = setTimeout(() => navigate('/lobby'), 6000);
      return () => clearTimeout(timer);
    }
  }, [gameResult, navigate]);

  if (bootError) {
    return (
      <AppShell>
        <TerminalBox>
          <TerminalAlert type="error" message={bootError} />
          <TerminalButton variant="secondary" onClick={() => navigate('/lobby')}>
            ← Back to lobby
          </TerminalButton>
        </TerminalBox>
      </AppShell>
    );
  }

  if (isLoading || !sessionId || !myTeam) {
    return (
      <AppShell>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '100px 0' }}>
          <Spinner size={32} />
          <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Establishing secure connection<span className="cursor" /></p>
        </div>
      </AppShell>
    );
  }

  const accent = myTeam === 'developer' ? 'green' : 'red';

  return (
    <AppShell>
      {error && <TerminalAlert type="error" message={error} onClose={clearError} />}

      {/* ── Header: scoreboard + role badge ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <p style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'var(--font-display)', letterSpacing: '0.1em', marginBottom: '4px' }}>
            SYS://GAME/ROUND-{round.roundNumber ?? '?'}
          </p>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            color: myTeam === 'developer' ? 'var(--green-bright)' : 'var(--red-bright)',
            fontSize: '1.4rem', textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            {myTeam === 'developer' ? 'Defending the database' : 'Breaching the target'}
          </h1>
        </div>

        <Scoreboard score={score} myTeam={myTeam} />
      </div>

      {/* ── Pending round: host/anyone can start ── */}
      {round.status === 'pending' && !switchingSides && (
        <TerminalBox accent={accent} style={{ textAlign: 'center', marginBottom: '20px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '14px' }}>
            Round {round.roundNumber ?? 1} is ready to begin.
          </p>
          <TerminalButton variant="primary" onClick={startRound}>
            Start round
          </TerminalButton>
        </TerminalBox>
      )}

      {switchingSides && (
        <TerminalBox accent="green" style={{ textAlign: 'center', marginBottom: '20px', borderColor: 'var(--amber)' }}>
          <p style={{ fontSize: '14px', color: 'var(--amber)', fontFamily: 'var(--font-display)' }}>
            ⇄ SWITCHING SIDES — you are now {myTeam === 'developer' ? 'the Developer' : 'the Hacker'}
          </p>
        </TerminalBox>
      )}

      {/* ── Round result modal-ish banner ── */}
      {roundResult && round.status === 'finished' && (
        <RoundResultBanner result={roundResult} myTeam={myTeam} />
      )}

      {/* ── Game over banner ── */}
      {gameResult && (
        <GameOverBanner result={gameResult} myTeam={myTeam} />
      )}

      {/* ── Main role view ── */}
      {myTeam === 'developer' ? (
        <DeveloperView
          round={round}
          myPlayers={myPlayers}
          enemyPlayers={enemyPlayers}
          timeRemaining={timeRemaining}
          onDeploy={deployTool}
          onSetWord={setSecretWord}
        />
      ) : (
        <HackerView
          round={round}
          myPlayers={myPlayers}
          enemyPlayers={enemyPlayers}
          timeRemaining={timeRemaining}
          onAttack={launchAttack}
          onGuess={submitGuess}
          lastGuessWrong={lastGuessWrong}
        />
      )}

      {/* ── Event feed ── */}
      <TerminalBox title="System log" accent={accent} style={{ marginTop: '20px' }}>
        <EventFeed events={events} />
      </TerminalBox>
    </AppShell>
  );
};

const Scoreboard = ({ score, myTeam }) => (
  <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
    <ScoreBox label="Developers" value={score.developer} color="var(--green-bright)" highlight={myTeam === 'developer'} />
    <span style={{ fontFamily: 'var(--font-display)', color: 'var(--text-muted)' }}>VS</span>
    <ScoreBox label="Hackers" value={score.hacker} color="var(--red-bright)" highlight={myTeam === 'hacker'} />
  </div>
);

const ScoreBox = ({ label, value, color, highlight }) => (
  <div style={{ textAlign: 'center', opacity: highlight ? 1 : 0.6 }}>
    <p style={{ fontSize: '1.6rem', fontFamily: 'var(--font-display)', color, fontWeight: 900 }}>{value}</p>
    <p style={{ fontSize: '9px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
  </div>
);

const RoundResultBanner = ({ result, myTeam }) => {
  const won = result.winner === myTeam;
  return (
    <TerminalBox
      accent={won ? (myTeam === 'developer' ? 'green' : 'red') : 'red'}
      style={{ textAlign: 'center', marginBottom: '20px' }}
    >
      <p style={{
        fontFamily: 'var(--font-display)', fontSize: '1.1rem',
        color: won ? 'var(--green-bright)' : 'var(--red-bright)', marginBottom: '6px',
      }}>
        {won ? 'ROUND WON' : 'ROUND LOST'} — {result.winner} ({result.condition?.replace('_', ' ')})
      </p>
      {result.secretWord && (
        <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
          Secret word was: <strong style={{ color: 'var(--text-primary)' }}>{result.secretWord}</strong>
        </p>
      )}
    </TerminalBox>
  );
};

const GameOverBanner = ({ result, myTeam }) => {
  const won = result.winner === myTeam;
  const draw = result.winner === 'draw';
  return (
    <TerminalBox
      accent={won ? 'green' : 'red'}
      style={{ textAlign: 'center', marginBottom: '20px', padding: '8px' }}
    >
      <h2 style={{
        fontFamily: 'var(--font-display)', fontSize: '1.8rem',
        color: draw ? 'var(--amber)' : won ? 'var(--green-bright)' : 'var(--red-bright)',
      }}>
        {draw ? 'DRAW' : won ? 'VICTORY' : 'DEFEAT'}
      </h2>
      <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '6px' }}>
        Final score — Developers {result.score.developer} : {result.score.hacker} Hackers
      </p>
      <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '10px' }}>
        Returning to lobby shortly...
      </p>
    </TerminalBox>
  );
};

export default GamePage;
