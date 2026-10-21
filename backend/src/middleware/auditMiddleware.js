const AuditLog = require('../models/AuditLog');

const logAudit = async ({
  userId,
  userName = 'System',
  userRole = 'system',
  action,
  resourceType,
  resourceId,
  patientId,
  details = {},
  ipAddress = '127.0.0.1',
  userAgent = ''
}) => {
  try {
    await AuditLog.create({
      userId,
      userName,
      userRole,
      action,
      resourceType,
      resourceId,
      patientId,
      details,
      ipAddress,
      userAgent
    });
  } catch (error) {
    console.error('[AuditLog] Failed to record audit log:', error.message);
  }
};

module.exports = { logAudit };
