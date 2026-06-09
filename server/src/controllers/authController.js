import User from '../models/User.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  setRefreshCookie,
  clearRefreshCookie,
  getRefreshCookie,
  generateSecureToken,
} from '../utils/jwt.js';
import {
  created,
  ok,
  noContent,
  badRequest,
  unauthorized,
  conflict,
  serverError,
} from '../utils/apiResponse.js';
import crypto from 'crypto';

// ── Helper ────────────────────────────────────────────────────────────────────

const issueTokens = (res, user) => {
  const accessToken  = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  setRefreshCookie(res, refreshToken);
  return accessToken;
};

// ── register ──────────────────────────────────────────────────────────────────

export const register = async (req, res) => {
  try {
    const { username, email, password, displayName } = req.body;

    // Check uniqueness
    const [emailTaken, usernameTaken] = await Promise.all([
      User.exists({ email }),
      User.exists({ username }),
    ]);

    if (emailTaken)    return conflict(res, 'Email already in use');
    if (usernameTaken) return conflict(res, 'Username already taken');

    // Create user — passwordHash field triggers the pre-save bcrypt hook
    const user = new User({
      username,
      email,
      displayName: displayName || username,
      passwordHash: password, // raw; hashed by pre-save hook
      authProvider: 'local',
    });

    await user.save();

    // Re-fetch with refreshTokenVersion (excluded by default)
    const savedUser = await User.findById(user._id).select('+refreshTokenVersion');

    const accessToken = issueTokens(res, savedUser);

    return created(res, {
      accessToken,
      user: savedUser.toSafeObject(),
    }, 'Account created successfully');
  } catch (err) {
    console.error('[register]', err);
    return serverError(res, 'Registration failed');
  }
};

// ── login ─────────────────────────────────────────────────────────────────────

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Select passwordHash explicitly (excluded by default)
    const user = await User.findByEmail(email).select('+passwordHash +refreshTokenVersion');

    // Generic error — never reveal whether email exists
    const GENERIC_ERR = 'Invalid email or password';

    if (!user) return unauthorized(res, GENERIC_ERR);
    if (user.authProvider !== 'local') {
      return unauthorized(res, 'This account uses Google Sign-In. Please log in with Google.');
    }
    if (!user.isActive || user.isBanned) {
      return unauthorized(res, user.isBanned ? `Account banned: ${user.banReason}` : 'Account inactive');
    }

    const valid = await user.comparePassword(password);
    if (!valid) return unauthorized(res, GENERIC_ERR);

    // Update last login metadata
    user.lastLoginAt = new Date();
    user.lastLoginIp = req.ip;
    await user.save();

    const accessToken = issueTokens(res, user);

    return ok(res, { accessToken, user: user.toSafeObject() }, 'Logged in successfully');
  } catch (err) {
    console.error('[login]', err);
    return serverError(res, 'Login failed');
  }
};

// ── googleCallback ────────────────────────────────────────────────────────────
// Called by passport after successful Google OAuth.
// Passport puts the user on req.user.

export const googleCallback = async (req, res) => {
  try {
    if (!req.user) {
      return res.redirect(`${process.env.CLIENT_URL}/auth/error?reason=google_failed`);
    }

    // Re-fetch with refreshTokenVersion
    const user = await User.findById(req.user._id).select('+refreshTokenVersion');
    const accessToken = issueTokens(res, user);

    // Redirect to client with token in URL fragment (never in query string)
    // Client reads it once, stores in memory, clears the URL
    return res.redirect(
      `${process.env.CLIENT_URL}/auth/callback#token=${accessToken}`
    );
  } catch (err) {
    console.error('[googleCallback]', err);
    return res.redirect(`${process.env.CLIENT_URL}/auth/error?reason=server_error`);
  }
};

// ── refresh ───────────────────────────────────────────────────────────────────

export const refresh = async (req, res) => {
  try {
    const token = getRefreshCookie(req);
    if (!token) return unauthorized(res, 'No refresh token');

    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch (err) {
      clearRefreshCookie(res);
      return unauthorized(res, 'Refresh token expired or invalid');
    }

    const user = await User.findById(decoded.sub).select('+refreshTokenVersion');
    if (!user) {
      clearRefreshCookie(res);
      return unauthorized(res, 'User not found');
    }

    if (decoded.ver !== user.refreshTokenVersion) {
      // Token reuse detected — invalidate ALL sessions
      user.refreshTokenVersion += 1;
      await user.save();
      clearRefreshCookie(res);
      return unauthorized(res, 'Token reuse detected. All sessions invalidated.');
    }

    if (!user.isActive || user.isBanned) {
      clearRefreshCookie(res);
      return unauthorized(res, 'Account suspended');
    }

    const accessToken = issueTokens(res, user);
    return ok(res, { accessToken }, 'Token refreshed');
  } catch (err) {
    console.error('[refresh]', err);
    return serverError(res, 'Token refresh failed');
  }
};

// ── logout ────────────────────────────────────────────────────────────────────

export const logout = async (req, res) => {
  try {
    if (req.user) {
      // Increment version → invalidates ALL refresh tokens for this user
      await User.findByIdAndUpdate(req.user._id, {
        $inc: { refreshTokenVersion: 1 },
      });
    }
    clearRefreshCookie(res);
    return noContent(res);
  } catch (err) {
    console.error('[logout]', err);
    return serverError(res, 'Logout failed');
  }
};

// ── me ────────────────────────────────────────────────────────────────────────

export const me = async (req, res) => {
  try {
    return ok(res, { user: req.user.toSafeObject() });
  } catch (err) {
    console.error('[me]', err);
    return serverError(res);
  }
};

// ── forgotPassword ────────────────────────────────────────────────────────────

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findByEmail(email);

    // Always respond with success to prevent email enumeration
    const SAFE_MSG = 'If that email exists, a reset link has been sent.';

    if (!user || user.authProvider !== 'local') {
      return ok(res, null, SAFE_MSG);
    }

    const token   = generateSecureToken();
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    user.passwordResetToken   = crypto.createHash('sha256').update(token).digest('hex');
    user.passwordResetExpires = expires;
    await user.save();

    // TODO (Slice 7): trigger email service with reset link
    // emailService.sendPasswordReset(user.email, token);
    console.log(`[forgotPassword] Reset token for ${email}: ${token}`); // dev only

    return ok(res, null, SAFE_MSG);
  } catch (err) {
    console.error('[forgotPassword]', err);
    return serverError(res, 'Password reset request failed');
  }
};

// ── resetPassword ─────────────────────────────────────────────────────────────

export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      passwordResetToken:   hashedToken,
      passwordResetExpires: { $gt: new Date() },
    }).select('+passwordResetToken +passwordResetExpires +refreshTokenVersion');

    if (!user) return badRequest(res, 'Reset token is invalid or has expired');

    user.passwordHash          = newPassword; // hashed by pre-save hook
    user.passwordResetToken    = undefined;
    user.passwordResetExpires  = undefined;
    user.refreshTokenVersion  += 1; // invalidate all existing sessions

    await user.save();

    return ok(res, null, 'Password reset successfully. Please log in.');
  } catch (err) {
    console.error('[resetPassword]', err);
    return serverError(res, 'Password reset failed');
  }
};

// ── changePassword ────────────────────────────────────────────────────────────

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+passwordHash +refreshTokenVersion');

    if (user.authProvider !== 'local') {
      return badRequest(res, 'Google accounts cannot set a password here');
    }

    const valid = await user.comparePassword(currentPassword);
    if (!valid) return unauthorized(res, 'Current password is incorrect');

    user.passwordHash         = newPassword;
    user.refreshTokenVersion += 1; // force re-login on all devices

    await user.save();

    clearRefreshCookie(res);
    return ok(res, null, 'Password changed. Please log in again.');
  } catch (err) {
    console.error('[changePassword]', err);
    return serverError(res, 'Password change failed');
  }
};
