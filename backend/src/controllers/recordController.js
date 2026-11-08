const HealthRecord = require('../models/HealthRecord');
const MedicalReport = require('../models/MedicalReport');
const Hospital = require('../models/Hospital');
const Consent = require('../models/Consent');
const AppointmentConsent = require('../models/AppointmentConsent');
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const { logAudit } = require('../middleware/auditMiddleware');

// @route   GET /api/records/patient/:patientId
exports.getPatientTimeline = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const { type } = req.query; // filter by type

    // Access control check:
    // If patient requesting their own records -> Allowed
    // If doctor requesting -> check active Consent grant OR active appointment with patient
    if (req.user.role === 'doctor') {
      const doctor = await Doctor.findOne({ userId: req.user._id });
      if (!doctor) return res.status(403).json({ error: 'Doctor record not found' });

      const activeConsent = await Consent.findOne({
        patientId,
        granteeId: doctor._id,
        status: 'active',
        validUntil: { $gte: new Date() }
      });

      const activeAppt = await Appointment.findOne({
        patientId,
        doctorId: doctor._id,
        status: { $in: ['scheduled', 'checked_in', 'called', 'in_consultation', 'completed'] }
      });

      const apptConsent = await AppointmentConsent.findOne({
        patientId,
        doctorId: doctor._id,
        status: 'active',
        validUntil: { $gte: new Date() }
      });

      if (!activeConsent && !activeAppt && !apptConsent) {
        await logAudit({
          userId: req.user._id,
          userName: req.user.name,
          userRole: req.user.role,
          action: 'ACCESS_DENIED_NO_CONSENT',
          resourceType: 'HealthRecord',
          patientId,
          details: { reason: 'No active consent or consultation appointment' }
        });

        return res.status(403).json({
          error: 'Access Denied: Patient has not granted consent to view medical records. Please ask patient to approve consent in their HealthMS portal.'
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

    // Also include MedicalReports that might not be in HealthRecord
    const existingFileUrls = new Set(records.map(r => r.fileUrl).filter(Boolean));
    const reports = await MedicalReport.find({
      patientId,
      visibility: { $ne: 'private' }
    }).sort({ reportDate: -1, createdAt: -1 });

    for (const rep of reports) {
      if (rep.fileUrl && !existingFileUrls.has(rep.fileUrl)) {
        records.push({
          _id: rep._id,
          type: rep.reportType || 'lab_report',
          title: rep.title,
          date: rep.reportDate || rep.createdAt,
          fileUrl: rep.fileUrl,
          fileSize: rep.fileSizeBytes || 0,
          fileType: rep.fileMimeType || 'application/pdf',
          aiSummary: rep.notes ? `[${rep.issuingFacility || 'Report'}]: ${rep.notes}` : `Uploaded ${rep.reportType} from ${rep.issuingFacility || 'patient'}`,
          metadata: {
            facility: rep.issuingFacility,
            doctorName: rep.doctorName
          }
        });
      }
    }

    // Sort descending by date
    records.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

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
    const summary = record.aiSummary || `This medical record (${record.title}) was documented on ${new Date(record.date).toLocaleDateString()}. All vital parameters and observations are stored securely in your HealthMS health timeline.`;

    res.json({ success: true, summary });
  } catch (error) {
    next(error);
  }
};
