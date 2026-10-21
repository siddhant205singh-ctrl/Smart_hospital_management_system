const Consent = require('../models/Consent');
const AuditLog = require('../models/AuditLog');
const { logAudit } = require('../middleware/auditMiddleware');

// @route   GET /api/consent/my-grants
exports.getMyGrants = async (req, res, next) => {
  try {
    const grants = await Consent.find({ patientId: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, grants });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/consent/grant
exports.grantConsent = async (req, res, next) => {
  try {
    const { granteeType, granteeId, granteeName, scope, validDays } = req.body;

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + (Number(validDays) || 30));

    const consent = await Consent.create({
      patientId: req.user._id,
      granteeType,
      granteeId,
      granteeName,
      scope: scope || 'full_history',
      validUntil,
      status: 'active'
    });

    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'GRANT_CONSENT',
      resourceType: 'Consent',
      resourceId: consent._id,
      patientId: req.user._id,
      details: { granteeName, scope, validDays }
    });

    res.status(201).json({ success: true, consent });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/consent/:id/revoke
exports.revokeConsent = async (req, res, next) => {
  try {
    const consent = await Consent.findOne({ _id: req.params.id, patientId: req.user._id });
    if (!consent) return res.status(404).json({ error: 'Consent record not found' });

    consent.status = 'revoked';
    consent.revokedAt = new Date();
    await consent.save();

    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'REVOKE_CONSENT',
      resourceType: 'Consent',
      resourceId: consent._id,
      patientId: req.user._id,
      details: { granteeName: consent.granteeName }
    });

    res.json({ success: true, message: 'Consent revoked successfully', consent });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/consent/audit-log
// Access log: who viewed which record and when
exports.getAuditLog = async (req, res, next) => {
  try {
    const logs = await AuditLog.find({ patientId: req.user._id }).sort({ timestamp: -1 }).limit(50);
    res.json({ success: true, logs });
  } catch (error) {
    next(error);
  }
};
