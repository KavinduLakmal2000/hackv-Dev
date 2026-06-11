import nodemailer from 'nodemailer';

// ─────────────────────────────────────────────────────────────────────────────
// BREACH — Email Service
// Transactional emails: password reset, email verify, ban notice, etc.
// Uses Nodemailer — swap the transport config for any SMTP (Resend, SendGrid, etc.)
// ─────────────────────────────────────────────────────────────────────────────

// ── Transport setup ───────────────────────────────────────────────────────────

let _transporter = null;

const getTransporter = () => {
  if (_transporter) return _transporter;

  if (process.env.NODE_ENV !== 'production') {
    // Dev: log to console instead of sending real mail
    _transporter = nodemailer.createTransport({
      streamTransport: true,
      newline: 'unix',
      buffer: true,
    });
    console.log('[Email] Dev mode: emails logged to console only');
    return _transporter;
  }

  // Production: real SMTP (Resend, SendGrid, Mailgun etc.)
  _transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   parseInt(process.env.SMTP_PORT ?? '465'),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return _transporter;
};

// ── Base HTML wrapper ─────────────────────────────────────────────────────────

const baseTemplate = (content) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>BREACH</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #0a0a0a;
      color: #00ff41;
      font-family: 'Courier New', Courier, monospace;
      padding: 40px 20px;
    }
    .container {
      max-width: 560px;
      margin: 0 auto;
      border: 1px solid #00ff41;
      padding: 32px;
    }
    .logo {
      font-size: 28px;
      font-weight: 700;
      letter-spacing: 8px;
      color: #00ff41;
      margin-bottom: 24px;
    }
    .divider {
      border: none;
      border-top: 1px solid #1a1a1a;
      margin: 24px 0;
    }
    .btn {
      display: inline-block;
      background: #00ff41;
      color: #0a0a0a;
      font-family: 'Courier New', Courier, monospace;
      font-weight: 700;
      font-size: 14px;
      letter-spacing: 2px;
      text-decoration: none;
      padding: 12px 28px;
      margin: 16px 0;
    }
    .footer {
      margin-top: 32px;
      font-size: 11px;
      color: #444;
    }
    p { margin-bottom: 12px; line-height: 1.6; }
    .mono { font-family: 'Courier New', monospace; background: #111; padding: 4px 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">BREACH</div>
    <hr class="divider" />
    ${content}
    <hr class="divider" />
    <div class="footer">
      &copy; ${new Date().getFullYear()} BREACH — breach.gg<br />
      This email was sent automatically. Do not reply.
    </div>
  </div>
</body>
</html>
`;

// ── Core send function ────────────────────────────────────────────────────────

const sendMail = async ({ to, subject, html }) => {
  const transporter = getTransporter();
  const from        = process.env.EMAIL_FROM ?? 'noreply@breach.gg';

  try {
    const info = await transporter.sendMail({ from, to, subject, html });

    if (process.env.NODE_ENV !== 'production') {
      // In dev, print the mail to console
      console.log(`\n[Email → ${to}] ${subject}`);
      console.log('─'.repeat(60));
    }

    return { ok: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[Email] Failed to send to ${to}:`, err.message);
    return { ok: false, error: err.message };
  }
};

// ── Templates ─────────────────────────────────────────────────────────────────

export const sendPasswordReset = async (email, username, token) => {
  const resetUrl = `${process.env.CLIENT_URL}/auth/reset-password?token=${token}`;
  return sendMail({
    to:      email,
    subject: 'BREACH — Password Reset',
    html:    baseTemplate(`
      <p>Operative <strong>${username}</strong>,</p>
      <p>A password reset was requested for your account.</p>
      <p>Click the link below to reset your password. This link expires in <strong>1 hour</strong>.</p>
      <a href="${resetUrl}" class="btn">&gt; RESET PASSWORD</a>
      <p>If you didn't request this, you can ignore this email. Your password won't change.</p>
    `),
  });
};

export const sendEmailVerification = async (email, username, token) => {
  const verifyUrl = `${process.env.CLIENT_URL}/auth/verify-email?token=${token}`;
  return sendMail({
    to:      email,
    subject: 'BREACH — Verify Your Email',
    html:    baseTemplate(`
      <p>Welcome to BREACH, <strong>${username}</strong>.</p>
      <p>Verify your email address to activate your account.</p>
      <a href="${verifyUrl}" class="btn">&gt; VERIFY EMAIL</a>
      <p>This link expires in <strong>24 hours</strong>.</p>
    `),
  });
};

export const sendBanNotice = async (email, username, reason) => {
  return sendMail({
    to:      email,
    subject: 'BREACH — Account Suspended',
    html:    baseTemplate(`
      <p>Operative <strong>${username}</strong>,</p>
      <p>Your BREACH account has been suspended.</p>
      <p><strong>Reason:</strong> <span class="mono">${reason ?? 'Policy violation'}</span></p>
      <p>If you believe this is a mistake, contact support at
         <a href="mailto:support@breach.gg" style="color:#00ff41">support@breach.gg</a>.
      </p>
    `),
  });
};

export const sendAdminBroadcast = async (email, username, subject, body) => {
  return sendMail({
    to:      email,
    subject: `BREACH — ${subject}`,
    html:    baseTemplate(`
      <p>Operative <strong>${username}</strong>,</p>
      ${body
        .split('\n')
        .map(line => `<p>${line}</p>`)
        .join('')}
    `),
  });
};

export const sendPurchaseConfirmation = async (email, username, itemName, premiumSpent) => {
  return sendMail({
    to:      email,
    subject: 'BREACH — Purchase Confirmed',
    html:    baseTemplate(`
      <p>Operative <strong>${username}</strong>,</p>
      <p>Your purchase of <strong>${itemName}</strong> has been confirmed.</p>
      <p>Tokens spent: <span class="mono">${premiumSpent}</span></p>
      <p>Head back to the terminal to equip your new item.</p>
    `),
  });
};

export const sendMaintenanceAlert = async (email, username, message, endsAt) => {
  return sendMail({
    to:      email,
    subject: 'BREACH — Scheduled Maintenance',
    html:    baseTemplate(`
      <p>Operative <strong>${username}</strong>,</p>
      <p>BREACH will be undergoing scheduled maintenance.</p>
      <p class="mono">${message}</p>
      ${endsAt ? `<p>Expected to be back online: <strong>${new Date(endsAt).toUTCString()}</strong></p>` : ''}
    `),
  });
};

// Export the raw sendMail for any ad-hoc use
export { sendMail };
