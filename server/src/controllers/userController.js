import User from '../models/User.js';
import { ok, badRequest, notFound, serverError } from '../utils/apiResponse.js';

// ── getMyProfile ──────────────────────────────────────────────────────────────
// Returns the full private profile for the authenticated user

export const getMyProfile = async (req, res) => {
  try {
    return ok(res, { user: req.user.toSafeObject() });
  } catch (err) {
    console.error('[getMyProfile]', err);
    return serverError(res);
  }
};

// ── updateMyProfile ───────────────────────────────────────────────────────────
// Player can update displayName, bio, preferredRole

export const updateMyProfile = async (req, res) => {
  try {
    const { displayName, bio, preferredRole } = req.body;

    const updates = {};
    if (displayName   !== undefined) updates.displayName   = displayName;
    if (bio           !== undefined) updates.bio           = bio;
    if (preferredRole !== undefined) updates.preferredRole = preferredRole;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    return ok(res, { user: user.toSafeObject() }, 'Profile updated');
  } catch (err) {
    console.error('[updateMyProfile]', err);
    return serverError(res);
  }
};

// ── updateAvatar ──────────────────────────────────────────────────────────────
// Accepts a URL string (client handles upload to Cloudinary/S3 and sends back URL)
// Server validates the URL format and domain whitelist

const ALLOWED_AVATAR_DOMAINS = [
  'res.cloudinary.com',
  'lh3.googleusercontent.com', // Google profile pictures
  'avatars.githubusercontent.com',
];

export const updateAvatar = async (req, res) => {
  try {
    const { avatarUrl } = req.body;

    if (!avatarUrl) return badRequest(res, 'avatarUrl is required');

    let parsed;
    try {
      parsed = new URL(avatarUrl);
    } catch {
      return badRequest(res, 'Invalid avatar URL');
    }

    if (!ALLOWED_AVATAR_DOMAINS.some(d => parsed.hostname.endsWith(d))) {
      return badRequest(res, 'Avatar must be hosted on an approved domain');
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { avatarUrl } },
      { new: true }
    );

    return ok(res, { avatarUrl: user.avatarUrl }, 'Avatar updated');
  } catch (err) {
    console.error('[updateAvatar]', err);
    return serverError(res);
  }
};

// ── getPublicProfile ──────────────────────────────────────────────────────────
// Anyone can view a player's public profile (by username)

export const getPublicProfile = async (req, res) => {
  try {
    const { username } = req.params;

    const user = await User.findOne({ username })
      .select('username displayName avatarUrl bio preferredRole rank stats createdAt');

    if (!user) return notFound(res, 'Player not found');
    if (user.isBanned || !user.isActive) return notFound(res, 'Player not found');

    return ok(res, { profile: user });
  } catch (err) {
    console.error('[getPublicProfile]', err);
    return serverError(res);
  }
};

// ── getLeaderboard ────────────────────────────────────────────────────────────
// Paginated top players sorted by rank points

export const getLeaderboard = async (req, res) => {
  try {
    const { page, limit, tier } = req.query;
    const skip = (page - 1) * limit;

    const filter = {
      isActive: true,
      isBanned: false,
      role:     'player',
    };
    if (tier) filter['rank.tier'] = tier;

    const [players, total] = await Promise.all([
      User.find(filter)
        .select('username displayName avatarUrl rank stats')
        .sort({ 'rank.points': -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    // Add position number to each entry
    const ranked = players.map((p, i) => ({
      ...p,
      position: skip + i + 1,
    }));

    return ok(res, {
      leaderboard: ranked,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('[getLeaderboard]', err);
    return serverError(res);
  }
};

// ── getMyStats ────────────────────────────────────────────────────────────────

export const getMyStats = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('username rank stats createdAt');

    const { wins, losses, draws } = user.stats;
    const totalGames = wins + losses + draws;
    const winRate    = totalGames === 0 ? 0 : Math.round((wins / totalGames) * 100);

    return ok(res, {
      stats: {
        ...user.stats.toObject(),
        totalGames,
        winRate,
      },
      rank: user.rank,
    });
  } catch (err) {
    console.error('[getMyStats]', err);
    return serverError(res);
  }
};
