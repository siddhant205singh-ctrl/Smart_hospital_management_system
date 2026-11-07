const mongoose = require('mongoose');
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
    if (mongoose.connection.readyState !== 1) return;
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
