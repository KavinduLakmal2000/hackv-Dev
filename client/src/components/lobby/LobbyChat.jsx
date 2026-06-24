import React, { useEffect, useRef, useState } from 'react';
import { getSocket } from '../../socket/socketClient.js';
import useAuthStore from '../../store/authStore.js';

// ─────────────────────────────────────────────────────────────────────────────
// LobbyChat — real-time pre-game chat, scoped to one lobby room.
// Server caps messages at 200 chars and rate-limits 5 msgs / 3s per socket.
// ─────────────────────────────────────────────────────────────────────────────

const MAX_LEN = 200;

const LobbyChat = ({ code }) => {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    const socket = getSocket();

    const handleChat = (payload) => {
      setMessages((m) => [...m, payload].slice(-100));
    };
    const handlePresence = (payload) => {
      setMessages((m) => [...m, {
        system: true,
        message: `${payload.username} ${payload.online ? 'connected' : 'disconnected'}`,
        timestamp: new Date().toISOString(),
      }].slice(-100));
    };

    socket.on('lobby:chat', handleChat);
    socket.on('lobby:presence', handlePresence);

    return () => {
      socket.off('lobby:chat', handleChat);
      socket.off('lobby:presence', handlePresence);
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    const text = draft.trim().slice(0, MAX_LEN);
    if (!text || !code) return;

    getSocket().emit('lobby:chat', { code, message: text }, (ack) => {
      if (!ack?.ok) console.warn('[LobbyChat] send failed:', ack?.error);
    });
    setDraft('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '280px' }}>
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '4px 4px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        {messages.length === 0 && (
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '20px' }}>
            No messages yet. Say hi.
          </p>
        )}
        {messages.map((m, i) =>
          m.system ? (
            <p key={i} style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center', fontStyle: 'italic' }}>
              {m.message}
            </p>
          ) : (
            <div key={i} style={{ fontSize: '12px' }}>
              <span style={{
                color: m.userId === user?.id ? 'var(--green-bright)' : 'var(--text-secondary)',
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                marginRight: '6px',
              }}>
                {m.username}:
              </span>
              <span style={{ color: 'var(--text-primary)', wordBreak: 'break-word' }}>
                {m.message}
              </span>
            </div>
          )
        )}
      </div>

      <form onSubmit={handleSend} style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={MAX_LEN}
          placeholder="> type a message..."
          style={{
            flex: 1,
            background: 'var(--bg-input)',
            border: '1px solid var(--border-primary)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            padding: '8px 10px',
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          style={{
            padding: '8px 14px',
            background: draft.trim() ? 'var(--green-bright)' : 'var(--bg-input)',
            color: draft.trim() ? 'var(--text-inverse)' : 'var(--text-muted)',
            border: '1px solid var(--border-primary)',
            borderRadius: 'var(--radius-md)',
            fontFamily: 'var(--font-display)',
            fontSize: '11px',
            cursor: draft.trim() ? 'pointer' : 'not-allowed',
          }}
        >
          SEND
        </button>
      </form>
    </div>
  );
};

export default LobbyChat;
