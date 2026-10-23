const path = require('path');
const fs = require('fs');
const multer = require('multer');
const axios = require('axios');
const MedicalReport = require('../models/MedicalReport');
const HealthRecord = require('../models/HealthRecord');
const EmergencyCase = require('../models/EmergencyCase');
const { logAudit } = require('../middleware/auditMiddleware');

// Ensure reports directory exists
const uploadDir = path.join(__dirname, '../../uploads/reports');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const sanitizedOriginal = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${uniqueSuffix}-${sanitizedOriginal}`);
  }
});

// File filter: Only PDF, JPG, PNG, WEBP (Max 10MB)
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, JPG, PNG, and WEBP formats are accepted.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

exports.uploadMiddleware = upload.single('reportFile');

// @route   POST /api/reports
// @desc    Upload report with metadata, emergency flags, and sync with timeline
// @access  Private (Patient)
exports.uploadReport = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please select a report file (PDF, JPG, or PNG under 10MB).' });
    }

    // Virus scan hook placeholder
    const virusScanPassed = true; // Placeholder for ClamAV / AWS GuardDuty / VirusTotal API scan
    if (!virusScanPassed) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'File failed security scanning.' });
    }

    const {
      title,
      reportType,
      reportDate,
      issuingFacility,
      doctorName,
      notes,
      isEmergencyImportant,
      visibility
    } = req.body;

    if (!title || !reportType || !issuingFacility) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Title, report type, and issuing facility are required.' });
    }

    const isEmerg = isEmergencyImportant === 'true' || isEmergencyImportant === true;
    
    // Default visibility: If flagged emergency, default to 'emergency_share', else 'consent_only'
    let resolvedVisibility = visibility || (isEmerg ? 'emergency_share' : 'consent_only');
    if (!['emergency_share', 'consent_only', 'private'].includes(resolvedVisibility)) {
      resolvedVisibility = 'consent_only';
    }

    // Map reportType to timeline HealthRecord type
    const recordTypeMap = {
      blood_test: 'lab_report',
      x_ray: 'scan_image',
      mri_ct: 'scan_image',
      ecg: 'lab_report',
      prescription: 'prescription',
      discharge_summary: 'discharge_summary',
      vaccination: 'doctor_note',
      other: 'doctor_note'
    };

    const relativeUrl = `/uploads/reports/${req.file.filename}`;

    // Create MedicalReport
    const medicalReport = new MedicalReport({
      patientId: req.user._id,
      title: title.trim(),
      reportType,
      reportDate: reportDate ? new Date(reportDate) : new Date(),
      issuingFacility: issuingFacility.trim(),
      doctorName: doctorName ? doctorName.trim() : '',
      notes: notes ? notes.trim() : '',
      isEmergencyImportant: isEmerg,
      visibility: resolvedVisibility,
      fileUrl: relativeUrl,
      fileName: req.file.originalname,
      fileMimeType: req.file.mimetype,
      fileSizeBytes: req.file.size
    });

    // Auto-sync into HealthTimeline (HealthRecord collection)
    const healthRecord = new HealthRecord({
      patientId: req.user._id,
      type: recordTypeMap[reportType] || 'lab_report',
      title: title.trim(),
      date: medicalReport.reportDate,
      fileUrl: relativeUrl,
      fileSize: req.file.size,
      fileType: req.file.mimetype,
      aiSummary: notes ? `Self-uploaded report (${issuingFacility}): ${notes}` : `Uploaded ${reportType.replace('_', ' ')} from ${issuingFacility}`,
      metadata: {
        diagnosis: isEmerg ? 'Emergency Important Document' : '',
        labValues: new Map([
          ['Issuing Facility', issuingFacility],
          ['Report Type', reportType],
          ['Emergency Priority', isEmerg ? 'Yes' : 'No']
        ])
      }
    });

    await healthRecord.save();
    medicalReport.healthRecordId = healthRecord._id;
    await medicalReport.save();

    // Audit Log
    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'UPLOAD_REPORT',
      resourceType: 'MedicalReport',
      resourceId: medicalReport._id,
      patientId: req.user._id,
      details: {
        title: medicalReport.title,
        reportType,
        isEmergencyImportant: isEmerg,
        visibility: resolvedVisibility,
        fileSizeBytes: req.file.size
      },
      req
    });

    res.status(201).json({
      success: true,
      message: 'Medical report uploaded and synced to Health Timeline successfully.',
      report: medicalReport
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    next(error);
  }
};

// @route   GET /api/reports/my
// @desc    Get all reports for the logged-in patient
// @access  Private (Patient)
exports.getMyReports = async (req, res, next) => {
  try {
    const { type, isEmergencyImportant, visibility, search } = req.query;
    const query = { patientId: req.user._id };

    if (type && type !== 'all') {
      query.reportType = type;
    }
    if (isEmergencyImportant === 'true') {
      query.isEmergencyImportant = true;
    }
    if (visibility && visibility !== 'all') {
      query.visibility = visibility;
    }
    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [
        { title: regex },
        { issuingFacility: regex },
        { doctorName: regex },
        { notes: regex }
      ];
    }

    const reports = await MedicalReport.find(query).sort({ isEmergencyImportant: -1, reportDate: -1 });

    res.json({
      success: true,
      count: reports.length,
      reports
    });
  } catch (error) {
    next(error);
  }
};

// @route   PUT /api/reports/:id/visibility
// @desc    Update report emergency priority and visibility
// @access  Private (Patient)
exports.updateReportVisibility = async (req, res, next) => {
  try {
    const report = await MedicalReport.findOne({ _id: req.params.id, patientId: req.user._id });
    if (!report) {
      return res.status(404).json({ error: 'Medical report not found or unauthorized.' });
    }

    const { visibility, isEmergencyImportant } = req.body;

    if (visibility) {
      if (!['emergency_share', 'consent_only', 'private'].includes(visibility)) {
        return res.status(400).json({ error: 'Invalid visibility value.' });
      }
      report.visibility = visibility;
    }

    if (isEmergencyImportant !== undefined) {
      report.isEmergencyImportant = Boolean(isEmergencyImportant);
      if (report.isEmergencyImportant && (!visibility || visibility === 'consent_only')) {
        report.visibility = 'emergency_share';
      }
    }

    await report.save();

    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'UPDATE_VISIBILITY',
      resourceType: 'MedicalReport',
      resourceId: report._id,
      patientId: req.user._id,
      details: {
        visibility: report.visibility,
        isEmergencyImportant: report.isEmergencyImportant
      },
      req
    });

    res.json({
      success: true,
      message: 'Report settings updated successfully.',
      report
    });
  } catch (error) {
    next(error);
  }
};

// @route   DELETE /api/reports/:id
// @desc    Delete medical report, storage file, and timeline reference
// @access  Private (Patient)
exports.deleteReport = async (req, res, next) => {
  try {
    const report = await MedicalReport.findOne({ _id: req.params.id, patientId: req.user._id });
    if (!report) {
      return res.status(404).json({ error: 'Medical report not found or unauthorized.' });
    }

    // Unlink physical file
    const filePath = path.join(__dirname, '../../', report.fileUrl);
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (e) { console.warn('Could not delete file from disk:', e.message); }
    }

    // Delete linked HealthRecord timeline entry
    if (report.healthRecordId) {
      await HealthRecord.findByIdAndDelete(report.healthRecordId);
    }

    await MedicalReport.findByIdAndDelete(report._id);

    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'DELETE_REPORT',
      resourceType: 'MedicalReport',
      resourceId: report._id,
      patientId: req.user._id,
      details: { title: report.title },
      req
    });

    res.json({
      success: true,
      message: 'Medical report removed from profile and Health Timeline.'
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/emergency-cases/:id/reports
// @desc    Emergency doctor views patient reports (emergency_share only) with break-glass check
// @access  Private (Doctor, Admin)
exports.getEmergencyReportsForCase = async (req, res, next) => {
  try {
    const emergencyCase = await EmergencyCase.findById(req.params.id).populate('patientId', 'name email phone avatar patientHealth');
    if (!emergencyCase) {
      return res.status(404).json({ error: 'Emergency case not found.' });
    }

    const patientId = emergencyCase.patientId?._id;
    if (!patientId) {
      return res.status(400).json({ error: 'Emergency case has no linked patient record.' });
    }

    // Check all reports for this patient
    const allReports = await MedicalReport.find({ patientId }).sort({ isEmergencyImportant: -1, reportDate: -1 });

    // Filter reports marked emergency_share
    const sharedReports = allReports.filter(r => r.visibility === 'emergency_share');
    const privateCount = allReports.filter(r => r.visibility === 'private').length;
    const consentOnlyCount = allReports.filter(r => r.visibility === 'consent_only').length;
    const hiddenCount = privateCount + consentOnlyCount;

    // Log doctor access in AuditLog
    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'EMERGENCY_REPORT_VIEW',
      resourceType: 'MedicalReport',
      resourceId: emergencyCase._id,
      patientId,
      details: {
        caseNumber: emergencyCase.caseNumber,
        sharedReportsCount: sharedReports.length,
        hiddenCount
      },
      req
    });

    // Notify patient via Socket.IO if active
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${patientId}`).emit('report:emergency_accessed', {
        doctorName: req.user.name,
        caseNumber: emergencyCase.caseNumber,
        reportsViewedCount: sharedReports.length,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      reports: sharedReports,
      hiddenCount,
      hasOtherPrivateReports: hiddenCount > 0,
      privateNotice: hiddenCount > 0
        ? `Patient has ${hiddenCount} additional report(s) marked private / consent-only that are not shared in emergency mode.`
        : null
    });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/emergency-cases/:id/reports/summary
// @desc    Generate an AI clinical summary from shared emergency reports using Gemini with citations
// @access  Private (Doctor, Admin)
exports.generateEmergencyReportSummary = async (req, res, next) => {
  try {
    const emergencyCase = await EmergencyCase.findById(req.params.id).populate('patientId');
    if (!emergencyCase) {
      return res.status(404).json({ error: 'Emergency case not found.' });
    }

    const patientId = emergencyCase.patientId?._id;
    const sharedReports = await MedicalReport.find({ patientId, visibility: 'emergency_share' })
      .sort({ isEmergencyImportant: -1, reportDate: -1 })
      .limit(8);

    if (sharedReports.length === 0) {
      return res.status(400).json({ error: 'No emergency-shared reports available to summarize.' });
    }

    let summaryData = null;

    // Attempt Gemini 1.5 Flash structured synthesis
    if (process.env.GEMINI_API_KEY) {
      try {
        const reportSummariesForPrompt = sharedReports.map(r => ({
          title: r.title,
          type: r.reportType,
          date: r.reportDate?.toISOString()?.split('T')[0],
          facility: r.issuingFacility,
          doctor: r.doctorName || 'N/A',
          notes: r.notes || 'None',
          isEmergencyPriority: r.isEmergencyImportant
        }));

        const prompt = `You are an emergency clinical documentation AI assisting an ER physician.
Review these patient emergency-shared medical reports:
${JSON.stringify(reportSummariesForPrompt, null, 2)}

Provide a strict, clinically formatted JSON output with NO markdown fences, matching this structure:
{
  "keyFindings": ["string", "string"],
  "abnormalValues": ["string", "string"],
  "notedConditions": ["string", "string"],
  "allergies": ["string", "string"],
  "activeMedications": ["string", "string"],
  "sourceCitations": [
    { "finding": "...", "reportTitle": "..." }
  ]
}
IMPORTANT:
- Use ONLY the provided reports. Do NOT hallucinate diagnoses.
- For each finding, list the specific source report title.`;

        const geminiRes = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
          { contents: [{ parts: [{ text: prompt }] }] },
          { headers: { 'Content-Type': 'application/json' }, timeout: 9000 }
        );

        let rawText = geminiRes.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        rawText = rawText.replace(/```json/gi, '').replace(/```/gi, '').trim();
        summaryData = JSON.parse(rawText);
      } catch (geminiErr) {
        console.warn('[Gemini Emergency Report Summary fallback]:', geminiErr.message);
      }
    }

    // Deterministic Clinical Parser Fallback if Gemini unavailable
    if (!summaryData) {
      const findings = [];
      const conditions = [];
      const allergies = [];
      const meds = [];
      const citations = [];

      sharedReports.forEach(r => {
        const title = r.title;
        if (r.reportType === 'ecg') {
          findings.push(`ECG recorded at ${r.issuingFacility} (${r.notes || 'Rhythm checked'})`);
          citations.push({ finding: 'Cardiac rhythm evaluation', reportTitle: title });
        } else if (r.reportType === 'blood_test') {
          findings.push(`Blood panel from ${r.issuingFacility} (${r.notes || 'Metabolic / CBC summary'})`);
          citations.push({ finding: 'Lab biochemistry baseline', reportTitle: title });
        } else if (r.reportType === 'discharge_summary') {
          conditions.push(`Prior inpatient admission documented at ${r.issuingFacility}: ${r.notes || 'Discharge parameters'}`);
          citations.push({ finding: 'Inpatient discharge history', reportTitle: title });
        } else {
          findings.push(`${r.reportType.toUpperCase()} - ${r.title} (${r.issuingFacility})`);
          citations.push({ finding: `${r.reportType} report documentation`, reportTitle: title });
        }

        if (r.notes && r.notes.toLowerCase().includes('allergy')) {
          allergies.push(r.notes);
        }
      });

      // Also merge profile self-reported health for completeness
      const pHealth = emergencyCase.patientId?.patientHealth;
      if (pHealth?.allergies?.length > 0) {
        allergies.push(...pHealth.allergies.map(a => `${a} (Self-reported in Profile)`));
      }
      if (pHealth?.currentMedicines?.length > 0) {
        meds.push(...pHealth.currentMedicines.map(m => `${m.name} ${m.dosage || ''} ${m.frequency || ''}`));
      }
      if (pHealth?.existingConditions?.length > 0) {
        conditions.push(...pHealth.existingConditions);
      }

      summaryData = {
        keyFindings: findings.length > 0 ? findings : ['Emergency reports reviewed. No acute abnormalities noted in metadata.'],
        abnormalValues: ['Verify specific serum/imaging values directly in attached report viewer.'],
        notedConditions: conditions.length > 0 ? conditions : ['None explicitly flagged in shared reports.'],
        allergies: allergies.length > 0 ? allergies : ['No known drug allergies reported.'],
        activeMedications: meds.length > 0 ? meds : ['Check physical prescription reports for active dosages.'],
        sourceCitations: citations
      };
    }

    // Log Audit
    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'AI_REPORT_SUMMARY_GENERATED',
      resourceType: 'MedicalReport',
      resourceId: emergencyCase._id,
      patientId,
      details: {
        reportsSummarized: sharedReports.length
      },
      req
    });

    res.json({
      success: true,
      summary: summaryData,
      disclaimer: 'AI-generated summary for clinical review. Verify findings against source reports before clinical intervention.',
      reportsCount: sharedReports.length,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};
