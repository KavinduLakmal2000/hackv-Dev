import { create } from 'zustand';
import { gameApi } from '../api/game.js';
import { getSocket, emitAsync } from '../socket/socketClient.js';

// ─────────────────────────────────────────────────────────────────────────────
// Game Store
// This store ONLY ever holds what the SERVER sent. There is no client-side
// calculation of damage, breach progress, or win conditions anywhere here.
// Every field is a direct mirror of a server payload — if the server hasn't
// told us something, we don't know it, and we don't guess.
// ─────────────────────────────────────────────────────────────────────────────

const initialRoundState = {
  roundNumber:      null,
  status:           'pending',   // pending | active | finished
  endsAt:           null,
  dbHealth:         100,
  breachProgress:   null,        // only ever populated for the hacker
  secretWordHint:        null,
  secretWordLength:      null,
  secretWordConfirmed:   null,   // developer-only: the word they set, echoed back
};

const useGameStore = create((set, get) => ({
  // ── State ──────────────────────────────────────────────────────────────────
  sessionId:      null,
  myTeam:         null,           // 'developer' | 'hacker'
  score:          { developer: 0, hacker: 0 },
  round:          { ...initialRoundState },
  myPlayers:      [],             // my team's player states (full detail)
  enemyPlayers:   [],             // opponent team (redacted detail)
  timeRemaining:  null,           // server-driven countdown, ticks every 1s
  events:         [],             // rolling event feed for EventFeed.jsx
  chatMessages:   [],             // team-only chat
  roundResult:    null,           // last finished round summary (for modal)
  gameResult:     null,           // final game-over summary
  switchingSides: false,
  isLoading:      false,
  error:          null,
  lastGuessWrong: false,

  // ── Bootstrap ──────────────────────────────────────────────────────────────

  initGame: async (lobbyCode) => {
    set({ isLoading: true, error: null });
    try {
      const res = await gameApi.initGame(lobbyCode);
      const sessionId = res.data.session.id || res.data.session._id;
      set({ sessionId, isLoading: false });
      return { ok: true, sessionId };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to initialize game';
      set({ isLoading: false, error: message });
      return { ok: false, message };
    }
  },

  joinGameSocket: async (sessionId) => {
    try {
      const ack = await emitAsync('game:join', { sessionId });
      set({
        sessionId,
        myTeam: ack.team,
        round: { ...initialRoundState, ...mapStateToRound(ack.state) },
        score: ack.state?.score ?? { developer: 0, hacker: 0 },
      });
      return { ok: true };
    } catch (err) {
      set({ error: err.message });
      return { ok: false, message: err.message };
    }
  },

  requestStateSync: async () => {
    const { sessionId } = get();
    if (!sessionId) return;
    try {
      const ack = await emitAsync('game:request_state', { sessionId });
      set({
        myTeam: ack.team,
        round: { ...get().round, ...mapStateToRound(ack.state) },
        score: ack.state?.score ?? get().score,
      });
    } catch (err) {
      console.warn('[gameStore] state sync failed:', err.message);
    }
  },

  // ── Actions (developer) ───────────────────────────────────────────────────

  deployTool: async (toolId) => {
    const { sessionId } = get();
    try {
      const ack = await emitAsync('game:deploy', { sessionId, toolId });
      return { ok: true, creditsRemaining: ack.creditsRemaining };
    } catch (err) {
      set({ error: err.message });
      return { ok: false, message: err.message };
    }
  },

  setSecretWord: async (word, hint) => {
    const { sessionId } = get();
    try {
      await emitAsync('game:set_secret_word', { sessionId, word, hint });
      return { ok: true };
    } catch (err) {
      set({ error: err.message });
      return { ok: false, message: err.message };
    }
  },

  // ── Actions (hacker) ───────────────────────────────────────────────────────

  launchAttack: async (toolId) => {
    const { sessionId } = get();
    try {
      const ack = await emitAsync('game:attack', { sessionId, toolId });
      return { ok: true, effects: ack.effects, wasBlocked: ack.wasBlocked };
    } catch (err) {
      set({ error: err.message });
      return { ok: false, message: err.message };
    }
  },

  submitGuess: async (guess) => {
    const { sessionId } = get();
    try {
      const ack = await emitAsync('game:guess', { sessionId, guess });
      set({ lastGuessWrong: !ack.correct });
      return { ok: true, correct: ack.correct };
    } catch (err) {
      set({ error: err.message });
      return { ok: false, message: err.message };
    }
  },

  startRound: async () => {
    const { sessionId } = get();
    try {
      await emitAsync('game:start_round', { sessionId });
      return { ok: true };
    } catch (err) {
      set({ error: err.message });
      return { ok: false, message: err.message };
    }
  },

  sendChat: (message) => {
    const { sessionId } = get();
    getSocket().emit('game:chat', { sessionId, message }, (ack) => {
      if (!ack?.ok) console.warn('[gameStore] chat failed:', ack?.error);
    });
  },

  // ── Socket listener wiring ────────────────────────────────────────────────
  // Called once from GamePage. Returns a cleanup function.

  attachSocketListeners: () => {
    const socket = getSocket();
    const pushEvent = (label, tone = 'info') =>
      set((s) => ({ events: [...s.events, { label, tone, ts: Date.now() }].slice(-50) }));

    const onRoundStarted = (payload) => {
      set({
        round: { ...initialRoundState, ...mapStateToRound(payload) },
        myPlayers:    payload.myTeam ?? [],
        enemyPlayers: payload.enemyTeam ?? [],
        roundResult:  null,
        switchingSides: false,
      });
      pushEvent(`Round ${payload.roundNumber} started`, 'success');
    };

    const onToolDeployed = (payload) => {
      pushEvent(`${payload.toolName} deployed on ${payload.layer}`, 'dev');
    };

    const onDefenseAdded = (payload) => {
      pushEvent(`Unknown defense added to ${payload.layer}`, 'warn');
    };

    const onAttackIncoming = (payload) => {
      set({ round: { ...get().round, dbHealth: payload.dbHealth } });
      pushEvent(
        payload.wasBlocked ? 'Attack blocked!' : 'Attack landed — DB damaged',
        payload.wasBlocked ? 'success' : 'danger'
      );
    };

    const onAttackResult = (payload) => {
      set({
        round: {
          ...get().round,
          breachProgress: payload.breachProgress,
          dbHealth:       payload.dbHealth,
        },
      });
      pushEvent(
        payload.wasBlocked ? 'Your attack was blocked' : `Hit! +${payload.breachProgress}% breach`,
        payload.wasBlocked ? 'warn' : 'success'
      );
    };

    const onSecretWordSet = (payload) => {
      set({ round: { ...get().round, secretWordHint: payload.hint, secretWordLength: payload.length } });
      pushEvent('Developer set the secret word', 'info');
    };

    const onSecretWordConfirmed = (payload) => {
      set({ round: { ...get().round, secretWordConfirmed: payload.word, secretWordHint: payload.hint } });
    };

    const onLettersRevealed = (payload) => {
      set({ round: { ...get().round, revealedMask: payload.masked } });
      pushEvent(`Letters revealed: ${payload.masked}`, 'danger');
    };

    const onRoundFinished = (payload) => {
      set({
        score:       payload.score,
        roundResult: payload,
        round:       { ...get().round, status: 'finished' },
      });
      pushEvent(`Round ${payload.roundNumber} won by ${payload.winner} (${payload.condition})`,
        payload.winner === get().myTeam ? 'success' : 'danger');
    };

    const onSwitchingSides = (payload) => {
      set({ switchingSides: true, score: payload.score });
      pushEvent('Switching sides!', 'warn');
    };

    const onGameFinished = (payload) => {
      set({ gameResult: payload, score: payload.score });
      pushEvent(`Game over — ${payload.winner} wins`, 'info');
    };

    const onTick = (payload) => set({ timeRemaining: payload.remaining });

    const onTimerWarning = (payload) => {
      pushEvent(`${payload.remaining}s remaining`, payload.remaining <= 10 ? 'danger' : 'warn');
    };

    const onChat = (payload) => {
      set((s) => ({ chatMessages: [...s.chatMessages, payload].slice(-100) }));
    };

    const onPlayerDisconnected = (payload) => {
      pushEvent(`${payload.username} disconnected`, 'warn');
    };

    socket.on('game:round_started',          onRoundStarted);
    socket.on('game:tool_deployed',           onToolDeployed);
    socket.on('game:defense_added',           onDefenseAdded);
    socket.on('game:attack_incoming',         onAttackIncoming);
    socket.on('game:attack_result',           onAttackResult);
    socket.on('game:secret_word_set',         onSecretWordSet);
    socket.on('game:secret_word_confirmed',   onSecretWordConfirmed);
    socket.on('game:letters_revealed',        onLettersRevealed);
    socket.on('game:round_finished',          onRoundFinished);
    socket.on('game:switching_sides',         onSwitchingSides);
    socket.on('game:finished',                onGameFinished);
    socket.on('game:tick',                    onTick);
    socket.on('game:timer_warning',           onTimerWarning);
    socket.on('game:chat',                    onChat);
    socket.on('game:player_disconnected',     onPlayerDisconnected);

    return () => {
      socket.off('game:round_started',        onRoundStarted);
      socket.off('game:tool_deployed',         onToolDeployed);
      socket.off('game:defense_added',         onDefenseAdded);
      socket.off('game:attack_incoming',       onAttackIncoming);
      socket.off('game:attack_result',         onAttackResult);
      socket.off('game:secret_word_set',       onSecretWordSet);
      socket.off('game:secret_word_confirmed', onSecretWordConfirmed);
      socket.off('game:letters_revealed',      onLettersRevealed);
      socket.off('game:round_finished',        onRoundFinished);
      socket.off('game:switching_sides',       onSwitchingSides);
      socket.off('game:finished',              onGameFinished);
      socket.off('game:tick',                  onTick);
      socket.off('game:timer_warning',         onTimerWarning);
      socket.off('game:chat',                  onChat);
      socket.off('game:player_disconnected',   onPlayerDisconnected);
    };
  },

  clearError:  () => set({ error: null }),
  clearReset:  () => set({
    sessionId: null, myTeam: null, score: { developer: 0, hacker: 0 },
    round: { ...initialRoundState }, myPlayers: [], enemyPlayers: [],
    timeRemaining: null, events: [], chatMessages: [], roundResult: null,
    gameResult: null, switchingSides: false, error: null,
  }),
}));

// ── Helper: normalize the varying state shapes the server sends ─────────────
// game:join ack and game:round_started carry slightly different shapes;
// this keeps the store's round object consistent regardless of source.
const mapStateToRound = (state) => {
  if (!state) return {};
  return {
    roundNumber:        state.roundNumber ?? null,
    status:              state.status ?? 'pending',
    endsAt:              state.endsAt ?? null,
    dbHealth:            state.dbHealth ?? 100,
    breachProgress:      state.breachProgress ?? null,
    secretWordHint:      state.secretWordHint ?? null,
    secretWordLength:    state.secretWordLength ?? null,
    secretWordConfirmed: state.secretWord ?? null,
  };
};

export default useGameStore;
