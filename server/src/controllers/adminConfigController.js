import MaintenanceConfig from '../models/MaintenanceConfig.js';
import User from '../models/User.js';
import GameSession from '../models/GameSession.js';
import Purchase from '../models/Purchase.js';
import { bustMaintenanceCache } from '../middleware/maintenance.js';
import { timerManager } from '../utils/timerManager.js';
import { sendMaintenanceAlert } from '../utils/emailService.js';
import {
  ok, badRequest, serverError,
} from '../utils/apiResponse.js';

// ── getConfig ─────────────────────────────────────────────────────────────────

export const getConfig = async (req, res) => {
  try {
    const config = await MaintenanceConfig.get();
    return ok(res, { config });
  } catch (err) {
    console.error('[getConfig]', err);
    return serverError(res);
  }
};

// ── updateConfig ──────────────────────────────────────────────────────────────

export const updateConfig = async (req, res) => {
  try {
    const updates = { ...req.body };

    // Attach who enabled/disabled maintenance
    if (updates.maintenanceMode !== undefined) {
      updates['maintenanceMode.updatedAt'] = new Date();
      updates['maintenanceMode.updatedBy'] = req.user._id;
    }

    const config = await MaintenanceConfig.patch(updates);

    // Bust the in-memory cache so middleware picks up the change immediately
    bustMaintenanceCache();

    // If maintenance was just enabled, notify active Socket.io clients
    const io = req.app.get('io');
    if (io && updates.maintenanceMode?.enabled) {
      io.emit('server:maintenance', {
        message: config.maintenanceMode.message,
      });
    }

    // If announcement changed, push it to all connected clients
    if (updates.announcement !== undefined) {
      io?.emit('server:announcement', {
        enabled: config.announcement.enabled,
        message: config.announcement.message,
        type:    config.announcement.type,
      });
    }

    console.log(`[Admin] Config updated by ${req.user.username}:`, Object.keys(updates));
    return ok(res, { config }, 'Config updated');
  } catch (err) {
    console.error('[updateConfig]', err);
    return serverError(res);
  }
};

// ── getPublicConfig ───────────────────────────────────────────────────────────
// Stripped version for client bootstrap — no sensitive data

export const getPublicConfig = async (req, res) => {
  try {
    const config = await MaintenanceConfig.get();
    return ok(res, {
      maintenance:      config.maintenanceMode?.enabled ?? false,
      maintenanceMsg:   config.maintenanceMode?.message ?? '',
      registrationOpen: config.registrationOpen,
      matchmakingOpen:  config.matchmakingOpen,
      shopOpen:         config.shopOpen,
      announcement:     config.announcement,
      season:           config.season,
    });
  } catch (err) {
    console.error('[getPublicConfig]', err);
    return serverError(res);
  }
};

// ── getFullDashboard ──────────────────────────────────────────────────────────
// All admin dashboard stats in one call

export const getFullDashboard = async (req, res) => {
  try {
    const now        = new Date();
    const last24h    = new Date(now - 24  * 60 * 60 * 1000);
    const last7days  = new Date(now - 7   * 24 * 60 * 60 * 1000);
    const last30days = new Date(now - 30  * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      bannedUsers,
      newToday,
      newThisWeek,
      newThisMonth,
      activeToday,
      tierBreakdown,
      totalGames,
      activeGames,
      totalRevenueCents,
      revenueToday,
      revenueThisMonth,
      topPlayers,
      recentSignups,
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
      ]),
      GameSession.countDocuments(),
      GameSession.countDocuments({ status: 'in_progress' }),
      Purchase.aggregate([
        { $match: { paymentMethod: 'stripe', status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amountUsdCents' } } },
      ]),
      Purchase.aggregate([
        { $match: { paymentMethod: 'stripe', status: 'completed', createdAt: { $gte: last24h } } },
        { $group: { _id: null, total: { $sum: '$amountUsdCents' } } },
      ]),
      Purchase.aggregate([
        { $match: { paymentMethod: 'stripe', status: 'completed', createdAt: { $gte: last30days } } },
        { $group: { _id: null, total: { $sum: '$amountUsdCents' } } },
      ]),
      User.find({ role: 'player', isActive: true })
        .select('username displayName rank avatarUrl')
        .sort({ 'rank.points': -1 })
        .limit(5)
        .lean(),
      User.find()
        .select('username email createdAt authProvider')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
    ]);

    return ok(res, {
      users: {
        total:        totalUsers,
        banned:       bannedUsers,
        newToday,
        newThisWeek,
        newThisMonth,
        activeToday,
        connected:    req.app.get('io')?.engine?.clientsCount ?? 0,
      },
      tiers: tierBreakdown.reduce((acc, t) => { acc[t._id] = t.count; return acc; }, {}),
      games: {
        total:  totalGames,
        active: activeGames,
        timerCount: timerManager.activeCount,
      },
      revenue: {
        totalUsd:    ((totalRevenueCents[0]?.total ?? 0) / 100).toFixed(2),
        todayUsd:    ((revenueToday[0]?.total ?? 0) / 100).toFixed(2),
        thisMonthUsd:((revenueThisMonth[0]?.total ?? 0) / 100).toFixed(2),
      },
      topPlayers,
      recentSignups,
    });
  } catch (err) {
    console.error('[getFullDashboard]', err);
    return serverError(res);
  }
};
