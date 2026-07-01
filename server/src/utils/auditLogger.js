import AuditLog from '../models/AuditLog.js';

export const writeAuditLog = async ({ adminId, action, targetId = null, before = null, after = null, ip = null, meta = {} }) => {
  try {
    await AuditLog.create({
      adminId,
      action,
      targetId,
      before,
      after,
      ip,
      meta,
    });
  } catch (err) {
    console.error('[auditLog]', err);
  }
};
