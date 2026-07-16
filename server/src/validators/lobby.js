import { z } from 'zod';
import { GAME_MODES, TEAMS } from '../models/Lobby.js';
import { validate, validateQuery } from './user.js';

const optionalPassword = z.preprocess((value) => {
  if (typeof value === 'string' && value.trim() === '') return undefined;
  return value;
}, z.string().trim().min(1).max(20).optional());

// ── Create lobby ──────────────────────────────────────────────────────────────

export const createLobbySchema = z.object({
  mode: z.enum(GAME_MODES, {
    errorMap: () => ({ message: `mode must be one of: ${GAME_MODES.join(', ')}` }),
  }).default('1v1'),
  isPrivate: z.boolean().default(false),
  password: optionalPassword,
  settings: z.object({
    roundCount:    z.number().int().min(1).max(10).default(5),
    roundDuration: z.number().int().min(60).max(300).default(120),
    startCredits:  z.number().int().min(100).max(2000).default(500),
  }).default({}),
});

// ── Join lobby ────────────────────────────────────────────────────────────────

export const joinLobbySchema = z.object({
  password: optionalPassword,
});

// ── Choose team ───────────────────────────────────────────────────────────────

export const chooseTeamSchema = z.object({
  team: z.enum(TEAMS, {
    errorMap: () => ({ message: `team must be 'developer' or 'hacker'` }),
  }),
});

// ── Update lobby settings (host only) ────────────────────────────────────────

export const updateSettingsSchema = z.object({
  settings: z.object({
    roundCount:    z.number().int().min(1).max(10).optional(),
    roundDuration: z.number().int().min(60).max(300).optional(),
    startCredits:  z.number().int().min(100).max(2000).optional(),
  }).optional(),
  isPrivate: z.boolean().optional(),
  password: z.preprocess((value) => {
    if (typeof value === 'string' && value.trim() === '') return null;
    return value;
  }, z.string().trim().max(20).nullable().optional()),
}).strict();

// ── Public lobby list query ───────────────────────────────────────────────────

export const lobbyListQuerySchema = z.object({
  mode:  z.enum(GAME_MODES).optional(),
  page:  z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export { validate, validateQuery };
