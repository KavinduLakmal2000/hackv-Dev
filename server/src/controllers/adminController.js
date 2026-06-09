import User from '../models/User.js';
import {
  ok,
  badRequest,
  notFound,
  conflict,
  serverError,
} from '../utils/apiResponse.js';
import { applyRankDelta, getTierForPoints } from '../utils/rank.js';

// ── listUsers ─────────────────────────────────────────────────────────────────
// Paginated, searchable, filterable user list for admin

export const listUsers = async (req, res) => {
  try {
    const { page, limit, search, role, banned, sortBy, order } = req.query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (role    !== undefined) filter.role     = role;
    if (banned  !== undefined) filter.isBanned = banned;
    if (search) {
      filter.$or = [
        { username:    { $regex: search, $options: 'i' } },
        { email:       { $regex: search, $options: 'i' } },
        { displayName: { $regex: search, $options: 'i' } },
      ];
    }

    const sortOrder = order === 'asc' ? 1 : -1;

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('username email displayName role isActive isBanned banReason rank stats createdAt lastLoginAt authProvider')
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    return ok(res, {
      users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('[listUsers]', err);
    return serverError(res);
  }
};

// ── getUserById ───────────────────────────────────────────────────────────────
// Full user detail for admin (more fields than public profile)

export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-passwordHash -googleId -refreshTokenVersion -emailVerifyToken -passwordResetToken');

    if (!user) return notFound(res, 'User not found');

    return ok(res, { user });
  } catch (err) {
    console.error('[getUserById]', err);
    return serverError(res);
  }
};

// ── updateUser ────────────────────────────────────────────────────────────────
// Admin can change role, active status, ban, adjust credits

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent admin demoting themselves
    if (id === req.user._id.toString() && req.body.role && req.body.role !== 'admin') {
      return badRequest(res, 'You cannot change your own admin role');
    }

    const user = await User.findById(id);
    if (!user) return notFound(res, 'User not found');

    const { role, isActive, isBanned, banReason, credits, premiumCurrency } = req.body;

    if (role             !== undefined) user.role            = role;
    if (isActive         !== undefined) user.isActive        = isActive;
    if (credits          !== undefined) user.credits         = credits;
    if (premiumCurrency  !== undefined) user.premiumCurrency = premiumCurrency;

    // Banning logic
    if (isBanned !== undefined) {
      user.isBanned = isBanned;
      if (isBanned) {
        user.banReason = banReason || 'Policy violation';
        // Increment token version to kill all active sessions immediately
        user.refreshTokenVersion = (user.refreshTokenVersion || 0) + 1;
      } else {
        user.banReason = null; // lifting ban clears reason
      }
    }

    await user.save();

    return ok(res, { user: user.toSafeObject() }, 'User updated');
  } catch (err) {
    console.error('[updateUser]', err);
    return serverError(res);
  }
};

// ── banUser / unbanUser ───────────────────────────────────────────────────────
// Dedicated endpoints for clarity (also callable from updateUser above)

export const banUser = async (req, res) => {
  try {
    const { reason } = req.body;
    const { id }     = req.params;

    if (id === req.user._id.toString()) {
      return badRequest(res, 'You cannot ban yourself');
    }

    const user = await User.findById(id).select('+refreshTokenVersion');
    if (!user) return notFound(res, 'User not found');
    if (user.isBanned) return conflict(res, 'User is already banned');

    user.isBanned             = true;
    user.banReason            = reason || 'Policy violation';
    user.refreshTokenVersion += 1; // kill sessions instantly

    await user.save();

    return ok(res, null, `User ${user.username} has been banned`);
  } catch (err) {
    console.error('[banUser]', err);
    return serverError(res);
  }
};

export const unbanUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return notFound(res, 'User not found');
    if (!user.isBanned) return conflict(res, 'User is not banned');

    user.isBanned  = false;
    user.banReason = null;
    await user.save();

    return ok(res, null, `User ${user.username} has been unbanned`);
  } catch (err) {
    console.error('[unbanUser]', err);
    return serverError(res);
  }
};

// ── adjustRank ────────────────────────────────────────────────────────────────
// Admin manually adjust rank points (e.g. tournament rewards, corrections)

export const adjustRank = async (req, res) => {
  try {
    const { points, reason } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return notFound(res, 'User not found');

    const before  = { ...user.rank.toObject() };
    user.rank     = applyRankDelta(user.rank, points);

    await user.save();

    console.log(
      `[adminAdjustRank] Admin ${req.user.username} adjusted rank for ${user.username}:`,
      `${before.points} → ${user.rank.points} (${points > 0 ? '+' : ''}${points}) | Reason: ${reason}`
    );

    return ok(res, {
      before,
      after: user.rank.toObject(),
      delta: points,
    }, 'Rank adjusted');
  } catch (err) {
    console.error('[adjustRank]', err);
    return serverError(res);
  }
};

// ── getDashboardStats ─────────────────────────────────────────────────────────
// High-level numbers for the admin dashboard

export const getDashboardStats = async (req, res) => {
  try {
    const now        = new Date();
    const last24h    = new Date(now - 24 * 60 * 60 * 1000);
    const last7days  = new Date(now - 7  * 24 * 60 * 60 * 1000);
    const last30days = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      bannedUsers,
      newToday,
      newThisWeek,
      newThisMonth,
      activeToday,
      tierBreakdown,
    ] = await Promise.all([
      User.countDocuments({ role: 'player' }),
      User.countDocuments({ isBanned: true }),
      User.countDocuments({ createdAt: { $gte: last24h } }),
      User.countDocuments({ createdAt: { $gte: last7days } }),
      User.countDocuments({ createdAt: { $gte: last30days } }),
      User.countDocuments({ lastLoginAt: { $gte: last24h } }),
      User.aggregate([
        { $match: { role: 'player', isActive: true } },
        { $group: { _id: '$rank.tier', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    return ok(res, {
      users: {
        total:        totalUsers,
        banned:       bannedUsers,
        newToday,
        newThisWeek,
        newThisMonth,
        activeToday,
      },
      tiers: tierBreakdown.reduce((acc, t) => {
        acc[t._id] = t.count;
        return acc;
      }, {}),
    });
  } catch (err) {
    console.error('[getDashboardStats]', err);
    return serverError(res);
  }
};

// ── deleteUser ────────────────────────────────────────────────────────────────
// Hard delete — use sparingly. Prefer ban.

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.user._id.toString()) {
      return badRequest(res, 'You cannot delete your own account');
    }

    const user = await User.findByIdAndDelete(id);
    if (!user) return notFound(res, 'User not found');

    return ok(res, null, `User ${user.username} permanently deleted`);
  } catch (err) {
    console.error('[deleteUser]', err);
    return serverError(res);
  }
};
