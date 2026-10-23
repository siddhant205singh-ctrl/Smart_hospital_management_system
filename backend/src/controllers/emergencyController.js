const EmergencyCase = require('../models/EmergencyCase');
const BreakGlassAccessLog = require('../models/BreakGlassAccessLog');
const HealthRecord = require('../models/HealthRecord');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { logAudit } = require('../middleware/auditMiddleware');

// Rules-based clinical triage engine
function determineTriagePriority(chiefComplaint, severityScore) {
  const RED_FLAG_COMPLAINTS = ['chest_pain', 'breathing_difficulty', 'stroke_signs', 'severe_bleeding'];

  if (Number(severityScore) >= 8 || RED_FLAG_COMPLAINTS.includes(chiefComplaint)) {
    return 'P1_CRITICAL_RESUSCITATION';
  }
  if (Number(severityScore) >= 5) {
    return 'P2_EMERGENT';
  }
  return 'P3_URGENT';
}

// @route   POST /api/emergency-cases
// Patient or Bystander submits rapid emergency intake
exports.createEmergencyCase = async (req, res, next) => {
  try {
    const {
      patientId,
      chiefComplaint,
      complaintDescription = '',
      severityScore,
      symptomOnset = 'within_1_hour',
      preferredHospitalId,
      submittedByName,
      relationship = 'self',
      isBystander = false,
      userLat,
      userLng,
      travelTimeMinutes,
      assignedDoctorId,
      bookingSource = 'intake_modal'
    } = req.body;

    let targetPatientId = patientId || (req.user ? req.user._id : null);
    if (!targetPatientId) {
      const fallbackPatient = await User.findOne({ role: 'patient' });
      targetPatientId = fallbackPatient ? fallbackPatient._id : null;
    }

    const patientUser = targetPatientId ? await User.findById(targetPatientId) : null;

    // Rules-based clinical triage
    const triagePriority = determineTriagePriority(chiefComplaint, severityScore);

    // Snapshot prefilled health data
    const prefilledHealthSnapshot = {
      bloodGroup: patientUser?.patientHealth?.bloodGroup || 'Not specified',
      allergies: patientUser?.patientHealth?.allergies || [],
      existingConditions: patientUser?.patientHealth?.existingConditions || [],
      currentMedicines: patientUser?.patientHealth?.currentMedicines?.map(m => `${m.name} (${m.dosage})`) || []
    };

    const caseNumber = `EM-${Date.now().toString().slice(-6)}`;
    const hospitalId = preferredHospitalId || patientUser?.hospitalId || '675d00000000000000000001';

    const emergencyCase = await EmergencyCase.create({
      caseNumber,
      patientId: targetPatientId,
      submittedBy: {
        userId: req.user?._id || targetPatientId,
        name: submittedByName || req.user?.name || 'Emergency Intake / Good Samaritan',
        relationship,
        isBystander: Boolean(isBystander || !req.user)
      },
      hospitalId,
      chiefComplaint,
      complaintDescription,
      severityScore: Number(severityScore),
      symptomOnset,
      triagePriority,
      prefilledHealthSnapshot,
      assignedDoctorId: assignedDoctorId || undefined,
      patientLocationSnapshot: (userLat && userLng) ? { lat: Number(userLat), lng: Number(userLng), city: '' } : undefined,
      estimatedTravelTimeMinutes: travelTimeMinutes ? Number(travelTimeMinutes) : 0,
      preArrivalNotified: true,
      preArrivalNotifiedAt: new Date(),
      bookingSource,
      status: 'waiting'
    });

    await emergencyCase.populate([
      { path: 'patientId', select: 'name email phone avatar emergencyContact' },
      { path: 'hospitalId', select: 'name address emergencyContact' }
    ]);

    // Broadcast high-priority real-time Socket.IO alert to Hospital Emergency Room
    const io = req.app.get('io');
    if (io) {
      const alertPayload = {
        caseId: emergencyCase._id,
        caseNumber: emergencyCase.caseNumber,
        patientName: emergencyCase.patientId?.name,
        chiefComplaint: emergencyCase.chiefComplaint,
        triagePriority: emergencyCase.triagePriority,
        severityScore: emergencyCase.severityScore,
        hospitalId: emergencyCase.hospitalId?._id,
        etaMinutes: emergencyCase.estimatedTravelTimeMinutes,
        bookingSource: emergencyCase.bookingSource,
        timestamp: new Date().toISOString()
      };

      io.emit('emergency:new_case', alertPayload);
      if (emergencyCase.hospitalId?._id) {
        io.to(`hospital_${emergencyCase.hospitalId._id}`).emit('emergency:pre_arrival_alert', alertPayload);
      }
    }

    // In-app alert for patient / emergency contact
    await Notification.create({
      userId: targetPatientId,
      type: 'emergency_case',
      title: `🚨 Emergency Intake Registered #${caseNumber}`,
      message: `Emergency response activated with ${triagePriority.replace('_', ' ')} priority at ${emergencyCase.hospitalId?.name}. Call 112 if condition worsens.`,
      channel: 'in_app',
      meta: { caseId: emergencyCase._id, caseNumber }
    });

    await logAudit(req, 'EmergencyCaseCreated', 'EmergencyCase', emergencyCase._id, targetPatientId, {
      triagePriority,
      chiefComplaint,
      severityScore
    });

    res.status(201).json({
      success: true,
      message: 'Emergency case registered and clinical response team alerted.',
      emergencyCase
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/emergency-cases/active
// Active emergency department queue sorted by triage priority
exports.getActiveEmergencyCases = async (req, res, next) => {
  try {
    const { hospitalId } = req.query;
    let query = {
      status: { $in: ['waiting', 'under_treatment', 'stabilized'] }
    };
    if (hospitalId) query.hospitalId = hospitalId;

    const cases = await EmergencyCase.find(query)
      .populate('patientId', 'name phone email avatar emergencyContact patientHealth')
      .populate('hospitalId', 'name address emergencyContact')
      .populate({
        path: 'assignedDoctorId',
        populate: { path: 'userId', select: 'name specialty' }
      })
      .sort({
        // P1 first, then P2, then P3
        triagePriority: 1,
        createdAt: -1
      });

    res.json({
      success: true,
      count: cases.length,
      cases
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/emergency-cases/:id
// Get detailed emergency case
exports.getEmergencyCaseById = async (req, res, next) => {
  try {
    const emergencyCase = await EmergencyCase.findById(req.params.id)
      .populate('patientId', 'name phone email avatar emergencyContact patientHealth donorSettings')
      .populate('hospitalId', 'name address emergencyContact')
      .populate({
        path: 'assignedDoctorId',
        populate: { path: 'userId', select: 'name' }
      });

    if (!emergencyCase) return res.status(404).json({ error: 'Emergency case not found' });

    res.json({ success: true, emergencyCase });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/emergency-cases/:id/break-glass
// Doctor confirms emergency Break-Glass protocol to unlock patient records
exports.activateBreakGlass = async (req, res, next) => {
  try {
    const { reason, clinicalJustification } = req.body;
    if (!reason || !clinicalJustification) {
      return res.status(400).json({ error: 'Break-Glass activation requires clinical reason and justification' });
    }

    const emergencyCase = await EmergencyCase.findById(req.params.id);
    if (!emergencyCase) return res.status(404).json({ error: 'Emergency case not found' });

    // Mark break glass used on case
    emergencyCase.breakGlassUsed = true;
    await emergencyCase.save();

    // 24-hour expiration
    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000);

    // Create immutable BreakGlassAccessLog
    const accessLog = await BreakGlassAccessLog.create({
      emergencyCaseId: emergencyCase._id,
      doctorId: req.user._id,
      doctorName: req.user.name,
      patientId: emergencyCase.patientId,
      reason,
      clinicalJustification,
      expiresAt,
      recordsViewed: ['Patient Allergies', 'Existing Conditions', 'Current Medications', 'Past Prescriptions', 'Diagnostic Reports'],
      patientNotified: true
    });

    // Fetch unlocked historical health records
    const healthRecords = await HealthRecord.find({ patientId: emergencyCase.patientId })
      .sort({ date: -1 })
      .limit(20);

    // Notify patient & primary emergency contact
    await Notification.create({
      userId: emergencyCase.patientId,
      type: 'break_glass_alert',
      title: '⚠️ Emergency Break-Glass Record Access',
      message: `Dr. ${req.user.name} accessed your healthcare timeline under Emergency Break-Glass Protocol (${reason.replace(/_/g, ' ')}). Access is cryptographically logged for 24h.`,
      channel: 'in_app',
      meta: {
        accessLogId: accessLog._id,
        doctorId: req.user._id,
        doctorName: req.user.name,
        expiresAt
      }
    });

    await logAudit(req, 'BreakGlassAccessActivated', 'EmergencyCase', emergencyCase._id, emergencyCase.patientId, {
      accessLogId: accessLog._id,
      reason,
      clinicalJustification
    });

    res.json({
      success: true,
      message: 'Emergency Break-Glass Protocol activated. 24-Hour read-only access granted.',
      accessLog,
      unlockedRecords: {
        healthRecords,
        prefilledSnapshot: emergencyCase.prefilledHealthSnapshot
      }
    });
  } catch (error) {
    next(error);
  }
};

// @route   PUT /api/emergency-cases/:id/status
// Doctor updates emergency treatment status and adds clinical summary
exports.updateEmergencyCaseStatus = async (req, res, next) => {
  try {
    const {
      status,
      clinicalDiagnosis,
      treatmentGiven,
      prescribedMedicines,
      aiClinicalSummary
    } = req.body;

    const emergencyCase = await EmergencyCase.findById(req.params.id);
    if (!emergencyCase) return res.status(404).json({ error: 'Emergency case not found' });

    if (status) emergencyCase.status = status;
    if (clinicalDiagnosis) emergencyCase.clinicalDiagnosis = clinicalDiagnosis;
    if (treatmentGiven) emergencyCase.treatmentGiven = treatmentGiven;
    if (prescribedMedicines) emergencyCase.prescribedMedicines = prescribedMedicines;
    if (aiClinicalSummary) emergencyCase.aiClinicalSummary = aiClinicalSummary;

    await emergencyCase.save();

    // If stabilized, admitted, or discharged, record in patient's continuous Health Timeline
    if (['stabilized', 'admitted', 'discharged'].includes(status)) {
      await HealthRecord.create({
        patientId: emergencyCase.patientId,
        doctorId: req.user._id,
        hospitalId: emergencyCase.hospitalId,
        type: 'discharge_summary',
        title: `Emergency Department Visit: ${emergencyCase.chiefComplaint.replace(/_/g, ' ').toUpperCase()}`,
        date: new Date(),
        aiSummary: clinicalDiagnosis || treatmentGiven ? `Diagnosis: ${clinicalDiagnosis || 'Stabilized'}. Treatment: ${treatmentGiven || 'Clinical care administered'}.` : 'Emergency resuscitation and stabilization completed.',
        metadata: {
          emergencyCaseNumber: emergencyCase.caseNumber,
          triagePriority: emergencyCase.triagePriority,
          medicines: prescribedMedicines || []
        }
      });
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('emergency:status_changed', {
        caseId: emergencyCase._id,
        caseNumber: emergencyCase.caseNumber,
        status: emergencyCase.status
      });
    }

    res.json({
      success: true,
      message: `Emergency case status updated to ${emergencyCase.status}.`,
      emergencyCase
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/emergency-cases/break-glass-logs (Admin Audit)
exports.getBreakGlassAuditLogs = async (req, res, next) => {
  try {
    const logs = await BreakGlassAccessLog.find()
      .populate('emergencyCaseId', 'caseNumber chiefComplaint triagePriority')
      .populate('doctorId', 'name email')
      .populate('patientId', 'name email phone')
      .sort({ accessedAt: -1 });

    res.json({ success: true, count: logs.length, logs });
  } catch (error) {
    next(error);
  }
};

// @route   PUT /api/emergency-cases/break-glass/:id/flag (Admin Flag Misuse)
exports.flagBreakGlassLog = async (req, res, next) => {
  try {
    const { adminReviewNotes } = req.body;
    const log = await BreakGlassAccessLog.findById(req.params.id);
    if (!log) return res.status(404).json({ error: 'Log not found' });

    log.flaggedByAdmin = true;
    log.adminReviewNotes = adminReviewNotes || 'Flagged for clinical audit review.';
    await log.save();

    res.json({ success: true, message: 'Break-Glass access flagged for clinical governance review.', log });
  } catch (error) {
    next(error);
  }
};
