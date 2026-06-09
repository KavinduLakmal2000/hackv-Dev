import { z } from 'zod';
import { DEVELOPER_TOOLS, HACKER_TOOLS } from '../config/tools.js';
import { validate } from './auth.js';

const ALL_TOOL_IDS = [
  ...Object.keys(DEVELOPER_TOOLS),
  ...Object.keys(HACKER_TOOLS),
];

// ── Tool actions ──────────────────────────────────────────────────────────────

export const deployToolSchema = z.object({
  toolId: z.enum(ALL_TOOL_IDS, {
    errorMap: () => ({ message: 'Invalid tool ID' }),
  }),
});

export const launchAttackSchema = z.object({
  toolId: z.enum(ALL_TOOL_IDS, {
    errorMap: () => ({ message: 'Invalid tool ID' }),
  }),
});

// ── Secret word ───────────────────────────────────────────────────────────────

export const setSecretWordSchema = z.object({
  word: z
    .string()
    .trim()
    .min(2, 'Word must be at least 2 characters')
    .max(20, 'Word must be 20 characters or less')
    .regex(/^[a-zA-Z0-9]+$/, 'Word must be alphanumeric only'),
  hint: z
    .string()
    .trim()
    .max(40, 'Hint must be 40 characters or less')
    .optional(),
});

export const submitGuessSchema = z.object({
  guess: z
    .string()
    .trim()
    .min(1, 'Guess cannot be empty')
    .max(20, 'Guess too long'),
});

export { validate };
