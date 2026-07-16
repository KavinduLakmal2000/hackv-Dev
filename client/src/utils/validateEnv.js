// ─────────────────────────────────────────────────────────────────────────────
// Environment validator — call this once at app boot.
// Vite replaces `import.meta.env.*` at build time; if a variable is missing
// the entire app will silently malfunction (API calls fail, socket won't
// connect, etc.). Better to crash loudly on startup with a clear message.
// ─────────────────────────────────────────────────────────────────────────────

const REQUIRED_VARS = [
  'VITE_API_URL',
];

const FALLBACK_API_URL = 'http://localhost:5000/api';

export const validateEnv = () => {
  const missing = REQUIRED_VARS.filter(
    (key) => !import.meta.env[key]
  );

  if (missing.length > 0) {
    const msg = `Missing required environment variables: ${missing.join(', ')}\n\nCreate a .env file with these values (see .env.example).`;

    if (import.meta.env.PROD) {
      document.body.innerHTML = `
        <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#050505;font-family:monospace;padding:24px">
          <div style="max-width:480px;color:#ff3333;border:1px solid #661111;padding:24px;border-radius:4px">
            <p style="font-size:10px;letter-spacing:.1em;margin-bottom:8px">SYS://CONFIG ERROR</p>
            <p style="font-size:14px;margin-bottom:12px">Deployment configuration missing</p>
            <p style="font-size:11px;color:#441111">${missing.join('<br>')}</p>
          </div>
        </div>
      `;
      throw new Error(msg);
    } else {
      console.info('[BREACH] Using fallback API URL:', FALLBACK_API_URL);
    }
  }
};

export const getApiUrl = () =>
  import.meta.env.VITE_API_URL || FALLBACK_API_URL;
