const prisma = require("../db/prisma");

const logAudit = async ({ userId, action, entity, entityId, meta }, db = prisma) => {
  try {
    await db.auditLog.create({ data: { userId, action, entity, entityId, meta } });
  } catch (err) {
    console.error("Audit log failed:", err.message);
  }
};

module.exports = logAudit;