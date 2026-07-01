import { sanitizeText } from '../src/middleware/sanitize.js';

test('sanitizeText strips HTML tags and preserves safe text', () => {
  expect(sanitizeText('<script>alert(1)</script>hello')).toBe('hello');
  expect(sanitizeText('Hello <b>world</b>')).toBe('Hello world');
  expect(sanitizeText('plain text')).toBe('plain text');
});
