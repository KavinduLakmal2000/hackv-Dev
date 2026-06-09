import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';

const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  SERVER_URL,
} = process.env;

passport.use(
  new GoogleStrategy(
    {
      clientID:     GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL:  `${SERVER_URL}/api/auth/google/callback`,
      scope: ['profile', 'email'],
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email       = profile.emails?.[0]?.value?.toLowerCase();
        const googleId    = profile.id;
        const displayName = profile.displayName;
        const avatarUrl   = profile.photos?.[0]?.value ?? null;

        if (!email) {
          return done(null, false, { message: 'No email returned from Google' });
        }

        // 1. Check if user already exists with this Google ID
        let user = await User.findOne({ googleId }).select('+refreshTokenVersion');

        if (user) {
          // Update avatar in case it changed
          user.avatarUrl   = avatarUrl;
          user.lastLoginAt = new Date();
          await user.save();
          return done(null, user);
        }

        // 2. Check if a local account exists with the same email → link it
        user = await User.findByEmail(email).select('+refreshTokenVersion');

        if (user) {
          if (user.authProvider === 'local') {
            // Link Google to the existing local account
            user.googleId     = googleId;
            user.authProvider = 'google';
            user.avatarUrl    = user.avatarUrl || avatarUrl;
            user.emailVerified = true;
            user.lastLoginAt  = new Date();
            await user.save();
            return done(null, user);
          }
          return done(null, user);
        }

        // 3. New user — create an account
        // Generate a unique username from their display name
        const baseUsername = displayName
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '_')
          .slice(0, 15);

        let username = baseUsername;
        let attempt  = 0;

        // Ensure username uniqueness
        while (await User.exists({ username })) {
          attempt++;
          username = `${baseUsername}_${attempt}`;
        }

        user = new User({
          username,
          email,
          displayName,
          avatarUrl,
          googleId,
          authProvider: 'google',
          emailVerified: true,
        });

        await user.save();

        // Re-fetch with refreshTokenVersion for JWT signing
        user = await User.findById(user._id).select('+refreshTokenVersion');

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

// We don't use sessions (JWT only), but passport needs these defined
passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

export default passport;
