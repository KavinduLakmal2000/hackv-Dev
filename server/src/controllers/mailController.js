import Mail from '../models/Mail.js';
import User from '../models/User.js';
import Purchase from '../models/Purchase.js';
import { getShopItem } from '../config/shopCatalog.js';
import { sendAdminBroadcast } from '../utils/emailService.js';
import {
  ok, created, badRequest, forbidden,
  notFound, conflict, serverError,
} from '../utils/apiResponse.js';
import { writeAuditLog } from '../utils/auditLogger.js';

// ── sendBroadcast ─────────────────────────────────────────────────────────────
// Admin sends a message to ALL players (or a filtered tier subset)
// Optionally also fires a real transactional email to each recipient

export const sendBroadcast = async (req, res) => {
  try {
    const { subject, body, priority, reward, targetTier, sendAt } = req.body;
    const admin = req.user;

    // Build in-game mail document (single broadcast doc, not per-user)
    const mail = await Mail.create({
      recipientId: null,           // null = everyone
      senderId:    admin._id,
      senderName:  admin.displayName || admin.username,
      subject,
      body,
      priority,
      reward: reward ?? {},
      type:   'broadcast',
      sendAt: sendAt ?? null,
    });

    // If reward is attached or priority is critical, also send transactional email
    const hasReward = (reward?.credits > 0 || reward?.premiumCurrency > 0 || reward?.itemId);
    if (hasReward || priority === 'critical') {
      // Queue async — don't block the response
      _sendBroadcastEmails(subject, body, targetTier).catch(err =>
        console.error('[sendBroadcast] Email delivery error:', err)
      );
    }

    await writeAuditLog({
      adminId: admin._id,
      action: 'send_broadcast',
      before: null,
      after: { subject, targetTier: targetTier ?? null },
      ip: req.ip,
      meta: { priority, reward: reward ?? {} },
    });

    return created(res, { mail }, `Broadcast "${subject}" queued`);
  } catch (err) {
    console.error('[sendBroadcast]', err);
    return serverError(res);
  }
};

// Fire-and-forget email dispatch to all matching players
const _sendBroadcastEmails = async (subject, body, targetTier) => {
  const filter = { role: 'player', isActive: true, isBanned: false, emailVerified: true };
  if (targetTier) filter['rank.tier'] = targetTier;

  const users = await User.find(filter).select('email username').lean();
  console.log(`[sendBroadcast] Sending emails to ${users.length} players`);

  // Send in batches of 50 to avoid overwhelming SMTP
  const BATCH = 50;
  for (let i = 0; i < users.length; i += BATCH) {
    const batch = users.slice(i, i + BATCH);
    await Promise.allSettled(
      batch.map(u => sendAdminBroadcast(u.email, u.username, subject, body))
    );
  }
};

// ── sendPersonalMail ──────────────────────────────────────────────────────────

export const sendPersonalMail = async (req, res) => {
  try {
    const { recipientId, subject, body, priority, reward } = req.body;
    const admin = req.user;

    const recipient = await User.findById(recipientId);
    if (!recipient) return notFound(res, 'Recipient not found');

    const mail = await Mail.create({
      recipientId,
      senderId:   admin._id,
      senderName: admin.displayName || admin.username,
      subject,
      body,
      priority,
      reward: reward ?? {},
      type:   'personal',
    });

    // Send transactional email if critical or has reward
    const hasReward = (reward?.credits > 0 || reward?.premiumCurrency > 0 || reward?.itemId);
    if (hasReward || priority === 'critical') {
      sendAdminBroadcast(recipient.email, recipient.username, subject, body)
        .catch(err => console.error('[sendPersonalMail] Email error:', err));
    }

    // Notify via socket if online
    // (socket.io attached to app in Slice 5)
    const io = req._io;
    if (io) {
      io.to(`user:${recipientId}`).emit('mail:new', {
        mailId:   mail._id,
        subject,
        priority,
        hasReward: !!hasReward,
      });
    }

    await writeAuditLog({
      adminId: admin._id,
      action: 'send_mail',
      targetId: recipient._id,
      before: null,
      after: { subject, recipientId },
      ip: req.ip,
      meta: { priority, reward: reward ?? {} },
    });

    return created(res, { mail }, `Mail sent to ${recipient.username}`);
  } catch (err) {
    console.error('[sendPersonalMail]', err);
    return serverError(res);
  }
};

// ── getInbox ──────────────────────────────────────────────────────────────────
// Player's inbox: personal mail + broadcasts (not already deleted)

export const getInbox = async (req, res) => {
  try {
    const { page, limit, unread } = req.query;
    const skip   = (page - 1) * limit;
    const userId = req.user._id;
    const now    = new Date();

    // Find mail addressed to this user OR broadcast (recipientId: null)
    // that hasn't expired and is due to be sent
    const filter = {
      $or: [
        { recipientId: userId },
        { recipientId: null, type: 'broadcast' },
      ],
      $or: [{ sendAt: null }, { sendAt: { $lte: now } }],
      expiresAt: { $gt: now },
    };

    if (unread === true) filter.isRead = false;

    const [mails, total, unreadCount] = await Promise.all([
      Mail.find(filter)
        .sort({ priority: -1, createdAt: -1 })  // critical first, then newest
        .skip(skip)
        .limit(limit)
        .lean(),
      Mail.countDocuments(filter),
      Mail.countDocuments({ ...filter, isRead: false }),
    ]);

    return ok(res, {
      mails,
      meta:        { total, page, limit, totalPages: Math.ceil(total / limit) },
      unreadCount,
    });
  } catch (err) {
    console.error('[getInbox]', err);
    return serverError(res);
  }
};

// ── readMail ──────────────────────────────────────────────────────────────────

export const readMail = async (req, res) => {
  try {
    const { mailId } = req.params;
    const userId     = req.user._id;

    const mail = await Mail.findById(mailId);
    if (!mail) return notFound(res, 'Mail not found');

    // Verify access
    const canRead = !mail.recipientId || mail.recipientId.toString() === userId.toString();
    if (!canRead) return forbidden(res, 'Not your mail');

    if (!mail.isRead) {
      mail.isRead = true;
      mail.readAt = new Date();
      await mail.save();
    }

    return ok(res, { mail });
  } catch (err) {
    console.error('[readMail]', err);
    return serverError(res);
  }
};

// ── claimReward ───────────────────────────────────────────────────────────────
// Player claims credits/tokens/item attached to a mail

export const claimReward = async (req, res) => {
  try {
    const { mailId } = req.params;
    const userId     = req.user._id;

    const mail = await Mail.findById(mailId);
    if (!mail) return notFound(res, 'Mail not found');

    const canClaim = !mail.recipientId || mail.recipientId.toString() === userId.toString();
    if (!canClaim) return forbidden(res, 'Not your mail');

    if (mail.rewardClaimed) return conflict(res, 'Reward already claimed');

    const { credits = 0, premiumCurrency = 0, itemId = null } = mail.reward ?? {};
    const hasReward = credits > 0 || premiumCurrency > 0 || itemId;
    if (!hasReward) return badRequest(res, 'This mail has no reward');

    // Atomically add currencies + item
    const updateOps = {
      $inc: { credits, premiumCurrency },
    };
    if (itemId) {
      const item = getShopItem(itemId);
      if (!item) return badRequest(res, 'Reward item not found in catalog');
      updateOps.$push = {
        ownedItems: { itemId, purchasedAt: new Date(), quantity: 1 },
      };
    }

    const user = await User.findByIdAndUpdate(userId, updateOps, { new: true });

    // Mark claimed
    mail.rewardClaimed   = true;
    mail.rewardClaimedAt = new Date();
    mail.isRead          = true;
    mail.readAt          = mail.readAt ?? new Date();
    await mail.save();

    // Log to purchase history
    if (credits > 0 || premiumCurrency > 0 || itemId) {
      await Purchase.create({
        userId,
        itemId:        itemId ?? 'MAIL_REWARD',
        itemType:      'mail_reward',
        itemName:      mail.subject,
        paymentMethod: 'admin_grant',
        creditsGained: credits,
        premiumGained: premiumCurrency,
        status:        'completed',
        metadata:      { mailId: mail._id.toString() },
        balanceSnapshot: {
          credits:         user.credits,
          premiumCurrency: user.premiumCurrency,
        },
      });
    }

    return ok(res, {
      claimed: { credits, premiumCurrency, itemId },
      wallet:  { credits: user.credits, premiumCurrency: user.premiumCurrency },
    }, 'Reward claimed');
  } catch (err) {
    console.error('[claimReward]', err);
    return serverError(res);
  }
};

// ── deleteMail ────────────────────────────────────────────────────────────────
// Player deletes a personal mail from their view

export const deleteMail = async (req, res) => {
  try {
    const { mailId } = req.params;
    const userId     = req.user._id;

    const mail = await Mail.findById(mailId);
    if (!mail) return notFound(res, 'Mail not found');

    // Only personal mail can be deleted by player; broadcasts are read-only
    if (mail.type === 'broadcast') return badRequest(res, 'Cannot delete broadcast messages');
    if (mail.recipientId?.toString() !== userId.toString()) return forbidden(res, 'Not your mail');
    if (!mail.rewardClaimed && (mail.reward?.credits > 0 || mail.reward?.premiumCurrency > 0)) {
      return badRequest(res, 'Claim your reward before deleting this mail');
    }

    await mail.deleteOne();
    return ok(res, null, 'Mail deleted');
  } catch (err) {
    console.error('[deleteMail]', err);
    return serverError(res);
  }
};

// ── Admin: list all sent mail ─────────────────────────────────────────────────

export const adminListMail = async (req, res) => {
  try {
    const { page, limit, type } = req.query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (type) filter.type = type;

    const [mails, total] = await Promise.all([
      Mail.find(filter)
        .populate('senderId', 'username')
        .populate('recipientId', 'username email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Mail.countDocuments(filter),
    ]);

    return ok(res, {
      mails,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('[adminListMail]', err);
    return serverError(res);
  }
};

// ── Admin: delete a mail ──────────────────────────────────────────────────────

export const adminDeleteMail = async (req, res) => {
  try {
    const mail = await Mail.findByIdAndDelete(req.params.mailId);
    if (!mail) return notFound(res, 'Mail not found');
    return ok(res, null, 'Mail deleted');
  } catch (err) {
    console.error('[adminDeleteMail]', err);
    return serverError(res);
  }
};
