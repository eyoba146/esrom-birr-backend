import prisma from "../config/db.js";

export const writeAuditLog = async (
  {
    userId,
    action,
    entityType = null,
    entityId = null,
    description = null,
    ipAddress = null,
  },
  tx = prisma,
) => {
  return tx.audit_logs.create({
    data: {
      user_id: userId ?? null,
      action,
      entity_type: entityType,
      entity_id: entityId,
      description,
      ip_address: ipAddress,
    },
  });
};
