// ─────────────────────────────────────────────────────────────────────────────
// Input sanitizer
// The server runs mongoSanitize + its own Zod validators, but we add a
// client-side pass here too — belt-and-suspenders. This is intentionally
// simple: strip all HTML tags and trim whitespace. No third-party library
// needed for this narrow use-case (we never render user content as HTML).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Strip HTML tags and trim whitespace from a string.
 * Safe to use on any user-entered text field before sending to the API.
 *
 * @param {string} value
 * @returns {string}
 */
export const sanitizeText = (value) => {
  if (typeof value !== 'string') return '';
  return value
    .replace(/<[^>]*>/g, '')         // strip HTML tags
    .replace(/&lt;/g, '<')            // decode common HTML entities
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .trim();
};

/**
 * Sanitize an object's string values recursively.
 * Use this on form data before dispatch: sanitizeForm({ username, bio, ... })
 *
 * @param {object} obj
 * @returns {object}
 */
export const sanitizeForm = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [
      k,
      typeof v === 'string' ? sanitizeText(v)
        : typeof v === 'object' && v !== null ? sanitizeForm(v)
        : v,
    ])
  );
};

/**
 * Validate that a string contains no suspicious injection patterns.
 * Returns true if clean, false if potentially malicious.
 * Used as an extra frontend check (server validates authoritatively).
 *
 * @param {string} value
 * @returns {boolean}
 */
export const isSafeInput = (value) => {
  if (typeof value !== 'string') return true;
  const patterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,      // onclick=, onmouseover=, etc.
    /\$\{.*\}/,        // template literal injection
    /\$where/i,        // MongoDB injection attempt
    /\$ne|\$gt|\$lt|\$in|\$or|\$and/i, // MongoDB operator injection
  ];
  return !patterns.some((re) => re.test(value));
};
