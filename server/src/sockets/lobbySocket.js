// ─────────────────────────────────────────────────────────────────────────────
// BREACH — Lobby Socket Handler
// Handles all real-time events for the lobby waiting room.
// Each socket joins a lobby room: lobby:{code}
// ─────────────────────────────────────────────────────────────────────────────

import Lobby from '../models/Lobby.js';

// ── In-memory presence tracker ────────────────────────────────────────────────
// lobbyCode → Set of socket IDs (supplemental to socket rooms)
const lobbyPresence = new Map();

const addPresence = (code, socketId) => {
  if (!lobbyPresence.has(code)) lobbyPresence.set(code, new Set());
  lobbyPresence.get(code).add(socketId);
};

const removePresence = (code, socketId) => {
  lobbyPresence.get(code)?.delete(socketId);
  if (lobbyPresence.get(code)?.size === 0) lobbyPresence.delete(code);
};

// ─────────────────────────────────────────────────────────────────────────────

export const registerLobbyHandlers = (io, socket) => {
  const { user } = socket;

  // ── lobby:join ─────────────────────────────────────────────────────────────
  // Client joins a lobby room to receive real-time updates
  socket.on('lobby:join', async ({ code }, ack) => {
    try {
      if (!code) return ack?.({ ok: false, error: 'code required' });

      const lobby = await Lobby.findOne({ code: code.toUpperCase() });
      if (!lobby) return ack?.({ ok: false, error: 'Lobby not found' });

      // Must be in the lobby players list (they joined via REST first)
      const isPlayer = lobby.players.some(p => p.userId.toString() === user.id);
      if (!isPlayer) return ack?.({ ok: false, error: 'You are not in this lobby' });

      const room = `lobby:${code.toUpperCase()}`;
      await socket.join(room);
      addPresence(code.toUpperCase(), socket.id);

      // Tag socket for cleanup on disconnect
      socket.data.lobbyCode = code.toUpperCase();

      // Tell everyone else this player is online
      socket.to(room).emit('lobby:presence', {
        userId:   user.id,
        username: user.username,
        online:   true,
      });

      console.log(`[Lobby] ${user.username} joined room ${room}`);
      ack?.({ ok: true, lobby: lobby.toJSON() });
    } catch (err) {
      console.error('[lobby:join]', err);
      ack?.({ ok: false, error: 'Server error' });
    }
  });

  // ── lobby:leave ────────────────────────────────────────────────────────────
  socket.on('lobby:leave', async ({ code }, ack) => {
    try {
      const room = `lobby:${code?.toUpperCase()}`;
      await socket.leave(room);
      removePresence(code?.toUpperCase(), socket.id);

      socket.to(room).emit('lobby:presence', {
        userId:   user.id,
        username: user.username,
        online:   false,
      });

      ack?.({ ok: true });
    } catch (err) {
      console.error('[lobby:leave]', err);
      ack?.({ ok: false, error: 'Server error' });
    }
  });

  // ── lobby:chat ─────────────────────────────────────────────────────────────
  // Simple lobby pre-game chat (not persisted)
  socket.on('lobby:chat', async ({ code, message }, ack) => {
    try {
      if (!code || !message) return ack?.({ ok: false, error: 'code and message required' });

      const text = String(message).trim().slice(0, 200); // hard cap 200 chars
      if (!text) return ack?.({ ok: false, error: 'Empty message' });

      // Verify sender is in lobby
      const lobby = await Lobby.findOne({ code: code.toUpperCase() });
      if (!lobby) return ack?.({ ok: false, error: 'Lobby not found' });

      const isPlayer = lobby.players.some(p => p.userId.toString() === user.id);
      if (!isPlayer) return ack?.({ ok: false, error: 'Not in lobby' });

      const room = `lobby:${code.toUpperCase()}`;
      const payload = {
        userId:      user.id,
        username:    user.username,
        displayName: user.displayName,
        message:     text,
        timestamp:   new Date().toISOString(),
      };

      // Broadcast to everyone in the room including sender
      io.to(room).emit('lobby:chat', payload);
      ack?.({ ok: true });
    } catch (err) {
      console.error('[lobby:chat]', err);
      ack?.({ ok: false, error: 'Server error' });
    }
  });

  // ── lobby:ping ─────────────────────────────────────────────────────────────
  // Heartbeat — client sends every 30s to confirm connection
  socket.on('lobby:ping', (_, ack) => {
    ack?.({ ok: true, ts: Date.now() });
  });

  // ── Cleanup on disconnect ──────────────────────────────────────────────────
  socket.on('disconnect', () => {
    const code = socket.data.lobbyCode;
    if (code) {
      removePresence(code, socket.id);
      io.to(`lobby:${code}`).emit('lobby:presence', {
        userId:   user.id,
        username: user.username,
        online:   false,
      });
    }
  });
};
