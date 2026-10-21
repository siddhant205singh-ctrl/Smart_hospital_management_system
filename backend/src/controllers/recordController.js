const HealthRecord = require('../models/HealthRecord');
const Consent = require('../models/Consent');
const Doctor = require('../models/Doctor');
const { logAudit } = require('../middleware/auditMiddleware');

// @route   GET /api/records/patient/:patientId
exports.getPatientTimeline = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const { type } = req.query; // filter by type

    // Access control check:
    // If patient requesting their own records -> Allowed
    // If doctor requesting -> check active Consent grant
    if (req.user.role === 'doctor') {
      const doctor = await Doctor.findOne({ userId: req.user._id });
      if (!doctor) return res.status(403).json({ error: 'Doctor record not found' });

      const activeConsent = await Consent.findOne({
        patientId,
        granteeId: doctor._id,
        status: 'active',
        validUntil: { $gte: new Date() }
      });

      if (!activeConsent) {
        await logAudit({
          userId: req.user._id,
          userName: req.user.name,
          userRole: req.user.role,
          action: 'ACCESS_DENIED_NO_CONSENT',
          resourceType: 'HealthRecord',
          patientId,
          details: { reason: 'No active consent granted by patient' }
        });

        return res.status(403).json({
          error: 'Access Denied: Patient has not granted consent to view medical records. Please ask patient to approve consent in their SmartCare portal.'
        });
      }
    }

    let filter = { patientId };
    if (type && type !== 'all') {
      filter.type = type;
    }

    const records = await HealthRecord.find(filter)
      .populate('hospitalId', 'name city')
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name avatar' }
      })
      .sort({ date: -1 });

    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'VIEW_HEALTH_TIMELINE',
      resourceType: 'HealthRecord',
      patientId,
      details: { recordCount: records.length, filteredType: type || 'all' }
    });

    res.json({ success: true, count: records.length, records });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/records
exports.createRecord = async (req, res, next) => {
  try {
    const {
      patientId,
      type,
      title,
      fileUrl,
      fileSize,
      fileType,
      aiSummary,
      metadata
    } = req.body;

    const record = await HealthRecord.create({
      patientId: patientId || req.user._id,
      type,
      title,
      fileUrl: fileUrl || '',
      fileSize: fileSize || 0,
      fileType: fileType || 'application/pdf',
      aiSummary: aiSummary || '',
      metadata: metadata || {}
    });

    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'CREATE_HEALTH_RECORD',
      resourceType: 'HealthRecord',
      resourceId: record._id,
      patientId: record.patientId,
      details: { title, type }
    });

    res.status(201).json({ success: true, record });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/records/:id/summary
exports.getRecordSummary = async (req, res, next) => {
  try {
    const record = await HealthRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ error: 'Record not found' });

    // Fallback or plain language explanation
    const summary = record.aiSummary || `This medical record (${record.title}) was documented on ${new Date(record.date).toLocaleDateString()}. All vital parameters and observations are stored securely in your SmartCare health timeline.`;

    res.json({ success: true, summary });
  } catch (error) {
    next(error);
  }
};
