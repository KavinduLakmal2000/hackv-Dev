import { sanitizeText } from '../src/middleware/sanitize.js';
import { updateProfileSchema } from '../src/validators/user.js';
import { createLobbySchema } from '../src/validators/lobby.js';

test('sanitizeText strips HTML tags and preserves safe text', () => {
  expect(sanitizeText('<script>alert(1)</script>hello')).toBe('hello');
  expect(sanitizeText('Hello <b>world</b>')).toBe('Hello world');
  expect(sanitizeText('plain text')).toBe('plain text');
});

test('updateProfileSchema allows an empty displayName so profile updates do not 400', () => {
  const result = updateProfileSchema.safeParse({ displayName: '' });
  expect(result.success).toBe(true);
});

test('createLobbySchema accepts an empty password for public lobbies', () => {
  const result = createLobbySchema.safeParse({ mode: '1v1', isPrivate: false, password: '', settings: {} });
  expect(result.success).toBe(true);
});
