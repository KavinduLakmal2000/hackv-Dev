import crypto from 'crypto';
import Lobby from '../models/Lobby.js';

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I confusion

/**
 * Generate a random 6-character lobby code.
 * Retries until unique (collision rate is negligible but handled).
 */
export const generateLobbyCode = async () => {
  const MAX_ATTEMPTS = 10;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const bytes = crypto.randomBytes(6);
    const code  = Array.from(bytes)
      .map(b => CHARS[b % CHARS.length])
      .join('');

    const exists = await Lobby.exists({ code, status: { $in: ['waiting', 'ready', 'in_progress'] } });
    if (!exists) return code;
  }

  throw new Error('Failed to generate unique lobby code after max attempts');
};

/**
 * Validate lobby code format (6 chars, allowed charset).
 */
export const isValidLobbyCode = (code) => {
  if (typeof code !== 'string') return false;
  return /^[A-Z2-9]{6}$/.test(code.toUpperCase());
};
