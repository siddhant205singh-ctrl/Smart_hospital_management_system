const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const axios = require('axios');
const multer = require('multer');

const Appointment = require('../models/Appointment');
const AppointmentDocumentShare = require('../models/AppointmentDocumentShare');
const AppointmentConsent = require('../models/AppointmentConsent');
const DocumentSummary = require('../models/DocumentSummary');
const MedicalReport = require('../models/MedicalReport');
const MedicineRecord = require('../models/MedicineRecord');
const Doctor = require('../models/Doctor');
const EmergencyCase = require('../models/EmergencyCase');
const User = require('../models/User');
const { logAudit } = require('../middleware/auditMiddleware');

// Multer storage for pre-consultation document uploads
const uploadDir = path.join(__dirname, '../../uploads/reports');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `preconsult-${uniqueSuffix}-${sanitized}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid document format. Only PDF, JPG, PNG, and WEBP formats are accepted.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

exports.documentUploadMiddleware = upload.any();

// Generate short-lived signed URL token for document access
const SIGNED_URL_SECRET = process.env.JWT_SECRET || 'healthms_signed_url_token_secret_2026';
const generateSignedUrlToken = (documentId, appointmentId, doctorId, expiresInMinutes = 60) => {
  const expiresAt = Date.now() + expiresInMinutes * 60 * 1000;
  const payload = `${documentId}:${appointmentId}:${doctorId}:${expiresAt}`;
  const hmac = crypto.createHmac('sha256', SIGNED_URL_SECRET).update(payload).digest('hex');
  return Buffer.from(JSON.stringify({ payload, hmac })).toString('base64url');
};

// @route   GET /api/appointments/:id/documents
// @desc    List attached documents for an appointment
exports.getAppointmentDocuments = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('doctorId')
      .populate('patientId', 'name email');

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }

    const isPatient = req.user._id.toString() === appointment.patientId?._id?.toString();
    const isAssignedDoctor = appointment.doctorId?.userId?.toString() === req.user._id.toString();
    const isAdmin = ['super_admin', 'hospital_admin', 'admin'].includes(req.user.role);

    if (!isPatient && !isAssignedDoctor && !isAdmin) {
      return res.status(403).json({ error: 'Unauthorized to view documents for this appointment.' });
    }

    const shares = await AppointmentDocumentShare.find({ appointmentId: appointment._id }).sort({ createdAt: -1 });

    const consent = await AppointmentConsent.findOne({ appointmentId: appointment._id });

    res.json({
      success: true,
      appointmentId: appointment._id,
      reasonForVisit: appointment.reasonForVisit,
      symptoms: appointment.symptoms,
      documentsCount: shares.length,
      consentStatus: consent ? consent.status : 'none',
      validUntil: consent ? consent.validUntil : null,
      documents: shares
    });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/appointments/:id/documents/select
// @route   POST /api/appointments/:id/documents/select
// @desc    Patient attaches existing Medical Reports or Medicines to appointment
exports.attachExistingDocuments = async (req, res, next) => {
  try {
    const appointment = await Appointment.findOne({ _id: req.params.id, patientId: req.user._id });
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found or unauthorized.' });
    }

    if (['completed', 'cancelled'].includes(appointment.status)) {
      return res.status(400).json({ error: 'Cannot attach documents once consultation has concluded.' });
    }

    const {
      selectedReportIds = [],
      reportIds = [],
      selectedMedicineIds = [],
      medicineRecordIds = [],
      reasonForVisit
    } = req.body;

    const effectiveReportIds = (Array.isArray(selectedReportIds) && selectedReportIds.length > 0)
      ? selectedReportIds
      : (Array.isArray(reportIds) ? reportIds : []);

    const effectiveMedicineIds = (Array.isArray(selectedMedicineIds) && selectedMedicineIds.length > 0)
      ? selectedMedicineIds
      : (Array.isArray(medicineRecordIds) ? medicineRecordIds : []);

    if (reasonForVisit !== undefined) {
      appointment.reasonForVisit = reasonForVisit.trim();
    }

    const newShares = [];

    // Attach MedicalReports
    if (effectiveReportIds.length > 0) {
      const reports = await MedicalReport.find({ _id: { $in: effectiveReportIds }, patientId: req.user._id });
      for (const r of reports) {
        const existing = await AppointmentDocumentShare.findOne({
          appointmentId: appointment._id,
          documentId: r._id
        });
        if (!existing) {
          const share = await AppointmentDocumentShare.create({
            appointmentId: appointment._id,
            patientId: req.user._id,
            documentType: 'medical_report',
            documentId: r._id,
            title: r.title,
            reportType: r.reportType,
            fileUrl: r.fileUrl
          });
          newShares.push(share);
        }
      }
    }

    // Attach MedicineRecords
    if (effectiveMedicineIds.length > 0) {
      const medicines = await MedicineRecord.find({ _id: { $in: effectiveMedicineIds }, patientId: req.user._id });
      for (const m of medicines) {
        const existing = await AppointmentDocumentShare.findOne({
          appointmentId: appointment._id,
          documentId: m._id
        });
        if (!existing) {
          const share = await AppointmentDocumentShare.create({
            appointmentId: appointment._id,
            patientId: req.user._id,
            documentType: 'medicine_record',
            documentId: m._id,
            title: `${m.brandName || m.name} (${m.strength || m.dosageForm || 'Medicine'}) - ${m.dosage || '1 unit'}`,
            reportType: 'medicine',
            fileUrl: m.photoUrl || ''
          });
          newShares.push(share);
        }
      }
    }

    const totalCount = await AppointmentDocumentShare.countDocuments({ appointmentId: appointment._id });
    appointment.documentsCount = totalCount;
    await appointment.save();

    // Auto-create or ensure active consent for this appointment
    let consent = await AppointmentConsent.findOne({ appointmentId: appointment._id });
    if (!consent) {
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 3);
      await AppointmentConsent.create({
        appointmentId: appointment._id,
        patientId: req.user._id,
        doctorId: appointment.doctorId,
        status: 'active',
        validUntil,
        consentText: "I consent to share the selected documents with Dr. [Name] for this consultation. The doctor may use assistive software to help review them."
      });
    }

    // Emit Socket.IO notification to doctor
    const io = req.app.get('io');
    if (io) {
      io.to(`doctor_${appointment.doctorId}`).emit('documents:attached', {
        appointmentId: appointment._id,
        patientName: req.user.name,
        documentsCount: totalCount,
        reasonForVisit: appointment.reasonForVisit
      });
    }

    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'SHARED_DOCUMENTS_ATTACHED',
      resourceType: 'AppointmentDocumentShare',
      resourceId: appointment._id,
      patientId: req.user._id,
      details: { addedCount: newShares.length, totalCount },
      req
    });

    res.json({
      success: true,
      message: `${newShares.length} document(s) attached to appointment.`,
      documentsCount: totalCount
    });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/appointments/:id/documents/upload
// @desc    Upload new document at booking/appointment and attach
exports.uploadAppointmentDocument = async (req, res, next) => {
  try {
    const uploadedFiles = (req.files && req.files.length > 0)
      ? req.files
      : (req.file ? [req.file] : []);

    if (uploadedFiles.length === 0) {
      return res.status(400).json({ error: 'Please select at least one document file (PDF, JPG, or PNG under 10MB).' });
    }

    const appointment = await Appointment.findOne({ _id: req.params.id, patientId: req.user._id });
    if (!appointment) {
      uploadedFiles.forEach(f => {
        if (f.path && fs.existsSync(f.path)) fs.unlinkSync(f.path);
      });
      return res.status(404).json({ error: 'Appointment not found or unauthorized.' });
    }

    const { title, reportType = 'other', notes = '', reasonForVisit } = req.body;
    if (reasonForVisit) {
      appointment.reasonForVisit = reasonForVisit.trim();
    }

    const newShares = [];

    for (const file of uploadedFiles) {
      const relativeUrl = `/uploads/reports/${file.filename}`;

      // Create synchronized MedicalReport with source: 'booking'
      const medicalReport = await MedicalReport.create({
        patientId: req.user._id,
        title: (title || file.originalname).trim(),
        reportType,
        reportDate: new Date(),
        issuingFacility: 'Patient Upload for Consultation',
        doctorName: '',
        notes: notes ? notes.trim() : '',
        isEmergencyImportant: false,
        visibility: 'consent_only',
        fileUrl: relativeUrl,
        fileName: file.originalname,
        fileMimeType: file.mimetype,
        fileSizeBytes: file.size,
        source: 'booking'
      });

      // Create document share
      const share = await AppointmentDocumentShare.create({
        appointmentId: appointment._id,
        patientId: req.user._id,
        documentType: 'medical_report',
        documentId: medicalReport._id,
        title: medicalReport.title,
        reportType: medicalReport.reportType,
        fileUrl: relativeUrl
      });

      newShares.push(share);
    }

    const totalCount = await AppointmentDocumentShare.countDocuments({ appointmentId: appointment._id });
    appointment.documentsCount = totalCount;
    await appointment.save();

    // Auto-create or ensure active consent for this appointment
    let consent = await AppointmentConsent.findOne({ appointmentId: appointment._id });
    if (!consent) {
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 3);
      await AppointmentConsent.create({
        appointmentId: appointment._id,
        patientId: req.user._id,
        doctorId: appointment.doctorId,
        status: 'active',
        validUntil,
        consentText: "I consent to share the selected documents with Dr. [Name] for this consultation. The doctor may use assistive software to help review them."
      });
    }

    // Emit Socket.IO event to doctor
    const io = req.app.get('io');
    if (io) {
      io.to(`doctor_${appointment.doctorId}`).emit('documents:attached', {
        appointmentId: appointment._id,
        patientName: req.user.name,
        documentsCount: totalCount,
        reasonForVisit: appointment.reasonForVisit
      });
    }

    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'SHARED_DOCUMENTS_ATTACHED',
      resourceType: 'AppointmentDocumentShare',
      resourceId: appointment._id,
      patientId: req.user._id,
      details: { addedCount: newShares.length, totalCount },
      req
    });

    res.json({
      success: true,
      message: `${newShares.length} document(s) uploaded and shared with your doctor.`,
      documentsCount: totalCount,
      shares: newShares
    });
  } catch (error) {
    next(error);
  }
};

// @route   DELETE /api/appointments/:id/documents/:docId
// @desc    Patient removes document before consultation
exports.removeAppointmentDocument = async (req, res, next) => {
  try {
    const appointment = await Appointment.findOne({ _id: req.params.id, patientId: req.user._id });
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found or unauthorized.' });
    }

    if (['completed', 'in_consultation'].includes(appointment.status)) {
      return res.status(400).json({ error: 'Cannot remove documents during or after consultation.' });
    }

    const share = await AppointmentDocumentShare.findOneAndDelete({
      _id: req.params.docId,
      appointmentId: appointment._id
    });

    if (!share) {
      return res.status(404).json({ error: 'Document attachment not found.' });
    }

    const totalCount = await AppointmentDocumentShare.countDocuments({ appointmentId: appointment._id });
    appointment.documentsCount = totalCount;
    await appointment.save();

    // Invalidate cached AI summary if exists
    await DocumentSummary.findOneAndDelete({ appointmentId: appointment._id });

    const io = req.app.get('io');
    if (io) {
      io.to(`doctor_${appointment.doctorId}`).emit('documents:updated', {
        appointmentId: appointment._id,
        documentsCount: totalCount
      });
    }

    res.json({
      success: true,
      message: 'Document removed from appointment sharing.',
      documentsCount: totalCount
    });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/appointments/:id/consent
// @desc    Record patient's single final consent for document sharing
exports.createAppointmentConsent = async (req, res, next) => {
  try {
    const appointment = await Appointment.findOne({ _id: req.params.id, patientId: req.user._id })
      .populate('doctorId');

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }

    const { consentConfirmed } = req.body;
    if (!consentConfirmed) {
      return res.status(400).json({ error: 'Consent confirmation is required to share documents.' });
    }

    const shares = await AppointmentDocumentShare.find({ appointmentId: appointment._id });
    if (shares.length === 0) {
      return res.status(400).json({ error: 'No documents attached to consent to.' });
    }

    const doctorUser = appointment.doctorId?.userId;
    const docName = doctorUser ? `Dr. ${doctorUser.name || 'Specialist'}` : 'your consulting physician';

    // Validity: 3 days after appointment date or consultation
    const apptDate = new Date(appointment.date);
    const validUntil = new Date(apptDate.getTime() + 3 * 24 * 60 * 60 * 1000);

    const consentText = `I consent to share the selected documents with ${docName} for this consultation. The doctor may use assistive software to help review them.`;

    let consent = await AppointmentConsent.findOne({ appointmentId: appointment._id });
    if (consent) {
      consent.documentShareIds = shares.map(s => s._id);
      consent.consentText = consentText;
      consent.status = 'active';
      consent.grantedAt = new Date();
      consent.validUntil = validUntil;
      consent.revokedAt = null;
      await consent.save();
    } else {
      consent = await AppointmentConsent.create({
        appointmentId: appointment._id,
        patientId: req.user._id,
        doctorId: appointment.doctorId._id,
        documentShareIds: shares.map(s => s._id),
        consentText,
        status: 'active',
        grantedAt: new Date(),
        validUntil,
        ipAddress: req.ip || '',
        userAgent: req.headers['user-agent'] || ''
      });
    }

    appointment.consentStatus = 'active';
    await appointment.save();

    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'APPOINTMENT_CONSENT_GRANTED',
      resourceType: 'AppointmentConsent',
      resourceId: consent._id,
      patientId: req.user._id,
      details: { doctorId: appointment.doctorId._id, documentsCount: shares.length },
      req
    });

    res.status(201).json({
      success: true,
      message: 'Document sharing consent recorded successfully.',
      consent
    });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/appointments/:id/consent/revoke
// @desc    Patient revokes document sharing consent immediately
exports.revokeAppointmentConsent = async (req, res, next) => {
  try {
    const appointment = await Appointment.findOne({ _id: req.params.id, patientId: req.user._id });
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found or unauthorized.' });
    }

    const consent = await AppointmentConsent.findOne({ appointmentId: appointment._id });
    if (!consent) {
      return res.status(404).json({ error: 'No active consent found for this appointment.' });
    }

    consent.status = 'revoked';
    consent.revokedAt = new Date();
    await consent.save();

    appointment.consentStatus = 'revoked';
    await appointment.save();

    // Immediately purge any cached doctor AI summary
    await DocumentSummary.findOneAndDelete({ appointmentId: appointment._id });

    // Notify doctor in real time
    const io = req.app.get('io');
    if (io) {
      io.to(`doctor_${appointment.doctorId}`).emit('consent:revoked', {
        appointmentId: appointment._id,
        revokedAt: consent.revokedAt,
        message: 'Patient revoked document sharing consent.'
      });
    }

    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'APPOINTMENT_CONSENT_REVOKED',
      resourceType: 'AppointmentConsent',
      resourceId: consent._id,
      patientId: req.user._id,
      details: { appointmentId: appointment._id },
      req
    });

    res.json({
      success: true,
      message: 'Document sharing consent has been revoked. Doctor access terminated.'
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/consultations/:id/documents
// @desc    Doctor clicks "Load Patient Documents" in active consultation (Audit-logged)
exports.loadDoctorConsultationDocuments = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('doctorId')
      .populate('patientId', 'name email phone dateOfBirth gender');

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }

    // RBAC: Verify doctor is assigned doctor
    const doctorRecord = await Doctor.findOne({ userId: req.user._id });
    const isAssignedDoctor = doctorRecord && (
      doctorRecord._id.toString() === appointment.doctorId?._id?.toString() ||
      doctorRecord._id.toString() === appointment.doctorId?.toString()
    );
    const isAdmin = ['super_admin', 'hospital_admin', 'admin'].includes(req.user.role);

    if (!isAssignedDoctor && !isAdmin) {
      return res.status(403).json({ error: 'Access denied. Only the assigned physician can access pre-consultation documents.' });
    }

    // Verify or auto-initialize valid consultation consent
    let consent = await AppointmentConsent.findOne({ appointmentId: appointment._id });
    if (!consent) {
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 3);
      consent = await AppointmentConsent.create({
        appointmentId: appointment._id,
        patientId: appointment.patientId?._id || appointment.patientId,
        doctorId: appointment.doctorId?._id || appointment.doctorId,
        status: 'active',
        validUntil,
        consentText: `I consent to share the selected documents with Dr. ${req.user.name} for this consultation. The doctor may use assistive software to help review them.`
      });
    } else if (consent.status === 'revoked') {
      return res.status(403).json({
        error: 'Access denied. The patient has revoked document sharing consent for this consultation.',
        consentStatus: 'revoked'
      });
    } else if (new Date() > new Date(consent.validUntil)) {
      consent.status = 'expired';
      await consent.save();
      return res.status(403).json({ error: 'Document sharing consent for this consultation has expired.', consentStatus: 'expired' });
    }

    let shares = await AppointmentDocumentShare.find({ appointmentId: appointment._id }).sort({ createdAt: -1 });

    // Also auto-sync any reports uploaded by patient in their profile (with visibility not private)
    const patientId = appointment.patientId?._id || appointment.patientId;
    const existingShareDocIds = shares.map(s => s.documentId?.toString());
    const patientReports = await MedicalReport.find({
      patientId,
      visibility: { $ne: 'private' },
      _id: { $nin: existingShareDocIds }
    }).sort({ reportDate: -1, createdAt: -1 });

    for (const rep of patientReports) {
      const newShare = await AppointmentDocumentShare.create({
        appointmentId: appointment._id,
        patientId,
        documentType: 'medical_report',
        documentId: rep._id,
        title: rep.title,
        reportType: rep.reportType,
        fileUrl: rep.fileUrl
      });
      shares.push(newShare);
    }

    if (appointment.documentsCount !== shares.length) {
      appointment.documentsCount = shares.length;
      await appointment.save();
    }

    // Generate signed tokens for each document
    const documentsWithSignedTokens = shares.map(doc => {
      const signedToken = generateSignedUrlToken(doc._id, appointment._id, doctorRecord?._id || req.user._id);
      return {
        _id: doc._id,
        title: doc.title,
        documentType: doc.documentType,
        reportType: doc.reportType,
        fileUrl: doc.fileUrl,
        isReviewedByDoctor: doc.isReviewedByDoctor,
        signedViewUrl: `/api/consultations/${appointment._id}/documents/${doc._id}/view?token=${signedToken}`
      };
    });

    // Notify patient in real time that their documents were opened
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${appointment.patientId._id}`).emit('documents:viewed', {
        appointmentId: appointment._id,
        doctorName: req.user.name,
        documentsCount: shares.length,
        viewedAt: new Date()
      });
    }

    // Audit log doctor document load
    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'DOCTOR_DOCUMENTS_LOADED',
      resourceType: 'AppointmentDocumentShare',
      resourceId: appointment._id,
      patientId: appointment.patientId._id,
      details: {
        documentsLoadedCount: shares.length,
        appointmentId: appointment._id
      },
      req
    });

    res.json({
      success: true,
      appointmentId: appointment._id,
      patient: {
        id: appointment.patientId._id,
        name: appointment.patientId.name,
        gender: appointment.patientId.gender,
        dateOfBirth: appointment.patientId.dateOfBirth
      },
      reasonForVisit: appointment.reasonForVisit || 'None specified',
      symptoms: appointment.symptoms || 'None specified',
      documentsCount: shares.length,
      consentStatus: consent.status,
      validUntil: consent.validUntil,
      documents: documentsWithSignedTokens
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/consultations/:id/documents/:docId/view
// @desc    Serve document to doctor with signed token validation
exports.viewDocumentFile = async (req, res, next) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(401).json({ error: 'Signed document access token required.' });
    }

    let payload, hmac;
    try {
      const decoded = JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));
      payload = decoded.payload;
      hmac = decoded.hmac;
    } catch (e) {
      return res.status(401).json({ error: 'Invalid signed token format.' });
    }

    const expectedHmac = crypto.createHmac('sha256', SIGNED_URL_SECRET).update(payload).digest('hex');
    if (hmac !== expectedHmac) {
      return res.status(403).json({ error: 'Tampered or invalid document access token.' });
    }

    const [docId, apptId, doctorId, expiresAtStr] = payload.split(':');
    if (Date.now() > Number(expiresAtStr)) {
      return res.status(403).json({ error: 'Document access token has expired.' });
    }

    const docShare = await AppointmentDocumentShare.findOne({ _id: docId, appointmentId: apptId });
    if (!docShare || !docShare.fileUrl) {
      return res.status(404).json({ error: 'Document file not found.' });
    }

    // Verify consent still active
    const consent = await AppointmentConsent.findOne({ appointmentId: apptId });
    if (!consent || consent.status !== 'active') {
      return res.status(403).json({ error: 'Document sharing consent has been revoked by the patient.' });
    }

    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (docShare.fileUrl.startsWith('http://') || docShare.fileUrl.startsWith('https://')) {
      return res.redirect(docShare.fileUrl);
    }

    const cleanPath = docShare.fileUrl.replace(/^\/+/, '');
    const absolutePath = path.join(__dirname, '../../', cleanPath);
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ error: 'Physical file not found on server.' });
    }

    // Safe user info for audit log even if no req.user (e.g. native img/iframe request using signed token)
    let auditUserId = req.user ? req.user._id : doctorId;
    let auditUserName = req.user ? req.user.name : 'Consulting Doctor';
    let auditUserRole = req.user ? req.user.role : 'doctor';

    if (!req.user && doctorId) {
      try {
        const docUser = await User.findById(doctorId).select('name role');
        if (docUser) {
          auditUserName = docUser.name;
          auditUserRole = docUser.role;
        }
      } catch (err) {
        // Fallback to defaults
      }
    }

    // Audit log individual document inspection
    await logAudit({
      userId: auditUserId,
      userName: auditUserName,
      userRole: auditUserRole,
      action: 'DOCTOR_DOCUMENT_VIEWED',
      resourceType: 'AppointmentDocumentShare',
      resourceId: docShare._id,
      patientId: docShare.patientId,
      details: { title: docShare.title, appointmentId: apptId },
      req
    });

    res.sendFile(absolutePath);
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/consultations/:id/documents/:docId/review
// @desc    Doctor marks document as reviewed
exports.markDocumentReviewed = async (req, res, next) => {
  try {
    const docShare = await AppointmentDocumentShare.findOne({
      _id: req.params.docId,
      appointmentId: req.params.id
    });

    if (!docShare) {
      return res.status(404).json({ error: 'Document attachment not found.' });
    }

    docShare.isReviewedByDoctor = true;
    docShare.reviewedAt = new Date();
    await docShare.save();

    res.json({ success: true, message: 'Document marked as reviewed.', document: docShare });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/consultations/:id/documents/summary
// @desc    Doctor-only "Summarize with AI" clinical synthesis with citations
exports.generateDoctorSummary = async (req, res, next) => {
  try {
    const appointmentId = req.params.id;
    const { language = 'en', forceRegenerate = false } = req.body;

    const appointment = await Appointment.findById(appointmentId)
      .populate('doctorId')
      .populate('patientId', 'name gender dateOfBirth');

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }

    const doctorRecord = await Doctor.findOne({ userId: req.user._id });
    const isAssignedDoctor = doctorRecord && doctorRecord._id.toString() === appointment.doctorId?._id?.toString();
    const isAdmin = ['super_admin', 'hospital_admin'].includes(req.user.role);

    if (!isAssignedDoctor && !isAdmin) {
      return res.status(403).json({ error: 'Access denied. AI summaries are strictly doctor-only for the assigned physician.' });
    }

    const consent = await AppointmentConsent.findOne({ appointmentId });
    if (!consent || consent.status !== 'active') {
      return res.status(403).json({ error: 'Cannot summarize: Patient consent is inactive or has been revoked.' });
    }

    // Check existing cached summary
    if (!forceRegenerate) {
      const existingSummary = await DocumentSummary.findOne({ appointmentId, language });
      if (existingSummary) {
        return res.json({ success: true, cached: true, summary: existingSummary });
      }
    }

    const shares = await AppointmentDocumentShare.find({ appointmentId });
    if (shares.length === 0) {
      return res.status(400).json({ error: 'No documents attached to summarize.' });
    }

    // Compile clinical documents data for prompt (with direct identifiers redacted)
    const docSummariesForPrompt = [];
    for (const s of shares) {
      if (s.documentType === 'medical_report') {
        const report = await MedicalReport.findById(s.documentId);
        docSummariesForPrompt.push({
          shareId: s._id,
          title: s.title,
          type: s.reportType,
          date: report?.reportDate?.toISOString()?.split('T')[0] || 'Unknown',
          facility: report?.issuingFacility || 'Unknown',
          doctor: report?.doctorName || 'N/A',
          notes: report?.notes || 'None'
        });
      } else {
        const med = await MedicineRecord.findById(s.documentId);
        docSummariesForPrompt.push({
          shareId: s._id,
          title: s.title,
          type: 'medicine',
          date: med?.startDate?.toISOString()?.split('T')[0] || 'Current',
          facility: 'Patient Reported',
          medicationDetails: {
            name: med?.name,
            generic: med?.genericName,
            strength: med?.strength,
            dosage: med?.dosage,
            frequency: med?.frequency,
            reason: med?.reason,
            isPatientReported: true
          }
        });
      }
    }

    const langInstruction = language === 'hi' 
      ? 'Output the summary descriptions in professional, natural Hindi (हिन्दी) suited for an Indian physician.' 
      : 'Output in clear, precise clinical English.';

    const promptText = `You are an expert clinical documentation summarizer assisting an attending physician before a patient consultation.
Review the following patient-shared pre-consultation documents and patient-reported medications:
${JSON.stringify(docSummariesForPrompt, null, 2)}

Patient Reason for Visit / Symptoms:
"${appointment.reasonForVisit || appointment.symptoms || 'General Consultation'}"

${langInstruction}

STRICT CLINICAL RULES:
1. Synthesize strictly from the provided documents. NEVER invent values. If a parameter is not found, state "Not found".
2. NO treatment recommendations or definitive diagnoses.
3. Highlight flagged abnormal lab values with standard reference ranges when present.
4. For every key finding, explicitly specify the exact source document share ID ("sourceDocumentId") and title ("sourceDocumentTitle").
5. Clearly label patient-reported medicines as "isPatientReported: true".
6. Return strictly valid JSON with NO markdown code fences, conforming to this exact schema:
{
  "overallSummary": "3 to 5 lines of high-level clinical overview...",
  "keyFindings": [
    {
      "finding": "Specific clinical finding description",
      "flaggedAbnormal": true,
      "referenceRange": "e.g., 70-100 mg/dL",
      "sourceDocumentId": "${shares[0]._id}",
      "sourceDocumentTitle": "${shares[0].title}"
    }
  ],
  "diagnosesAndConditions": ["Condition 1", "Condition 2"],
  "allergies": ["Documented Allergy 1"],
  "medications": [
    {
      "name": "Augmentin 625mg",
      "dosage": "1 tablet twice daily",
      "isPatientReported": true,
      "sourceDocumentTitle": "${shares[0].title}"
    }
  ],
  "issuingEntities": [
    {
      "documentTitle": "${shares[0].title}",
      "facility": "Apollo Diagnostics",
      "date": "2026-11-01"
    }
  ],
  "possibleGaps": ["Any unreadable pages, missing test dates, or incomplete reports"]
}`;

    let summaryPayload = null;

    if (process.env.GEMINI_API_KEY) {
      try {
        const geminiRes = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
          { contents: [{ parts: [{ text: promptText }] }] },
          { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
        );

        let raw = geminiRes.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        raw = raw.replace(/```json/gi, '').replace(/```/gi, '').trim();
        summaryPayload = JSON.parse(raw);
      } catch (geminiErr) {
        console.warn('[Gemini Consultation Summary Fallback]:', geminiErr.message);
      }
    }

    // Deterministic Clinical Fallback Parser
    if (!summaryPayload) {
      const isHindi = language === 'hi';
      summaryPayload = {
        overallSummary: isHindi 
          ? `मरीज ने इस परामर्श के लिए ${shares.length} दस्तावेज़ साझा किए हैं। मुख्य कारण: ${appointment.reasonForVisit || appointment.symptoms || 'सामान्य परामर्श'}।`
          : `Patient shared ${shares.length} document(s) for this appointment. Reason for visit: ${appointment.reasonForVisit || appointment.symptoms || 'General Consultation'}.`,
        keyFindings: shares.map(s => ({
          finding: `Clinical record attached: ${s.title} (${s.reportType})`,
          flaggedAbnormal: s.reportType === 'blood_test' || s.reportType === 'ecg',
          referenceRange: 'Clinical verification recommended',
          sourceDocumentId: s._id,
          sourceDocumentTitle: s.title
        })),
        diagnosesAndConditions: [appointment.reasonForVisit || 'Under consultation review'],
        allergies: ['Verify with patient during intake'],
        medications: shares.filter(s => s.reportType === 'medicine').map(s => ({
          name: s.title,
          dosage: 'Per patient schedule',
          isPatientReported: true,
          sourceDocumentTitle: s.title
        })),
        issuingEntities: shares.map(s => ({
          documentTitle: s.title,
          facility: 'Uploaded by Patient',
          date: new Date().toISOString().split('T')[0]
        })),
        possibleGaps: ['AI synthesis unavailable, please review original documents directly in viewer.']
      };
    }

    // Upsert DocumentSummary cache
    const summaryDoc = await DocumentSummary.findOneAndUpdate(
      { appointmentId, language },
      {
        doctorId: doctorRecord?._id || req.user._id,
        patientId: appointment.patientId._id,
        overallSummary: summaryPayload.overallSummary,
        keyFindings: summaryPayload.keyFindings || [],
        diagnosesAndConditions: summaryPayload.diagnosesAndConditions || [],
        allergies: summaryPayload.allergies || [],
        medications: summaryPayload.medications || [],
        issuingEntities: summaryPayload.issuingEntities || [],
        possibleGaps: summaryPayload.possibleGaps || [],
        language,
        generatedAt: new Date()
      },
      { upsert: true, new: true }
    );

    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: forceRegenerate ? 'DOCTOR_AI_SUMMARY_REGENERATED' : 'DOCTOR_AI_SUMMARY_GENERATED',
      resourceType: 'DocumentSummary',
      resourceId: summaryDoc._id,
      patientId: appointment.patientId._id,
      details: { appointmentId, language, documentsCount: shares.length },
      req
    });

    res.json({
      success: true,
      cached: false,
      summary: summaryDoc
    });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/consultations/:id/notes/pin-summary
// @desc    Doctor appends edited summary to consultation notes
exports.pinSummaryToNotes = async (req, res, next) => {
  try {
    const { summaryText } = req.body;
    if (!summaryText || !summaryText.trim()) {
      return res.status(400).json({ error: 'Summary text is required.' });
    }

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }

    const formattedNote = `\n\n[Physician-Reviewed Pre-Consultation Summary]\n${summaryText.trim()}`;
    appointment.doctorNotes = (appointment.doctorNotes || '') + formattedNote;
    await appointment.save();

    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'DOCTOR_NOTES_SUMMARY_PINNED',
      resourceType: 'Appointment',
      resourceId: appointment._id,
      patientId: appointment.patientId,
      details: { noteLength: summaryText.length },
      req
    });

    res.json({
      success: true,
      message: 'Summary successfully appended to consultation notes.',
      doctorNotes: appointment.doctorNotes
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/emergency-cases/:id/medicines
// @desc    Doctor break-glass view: Fetch patient's active emergency-shared medicines
exports.getEmergencyMedicines = async (req, res, next) => {
  try {
    const emergencyCase = await EmergencyCase.findById(req.params.id).populate('patientId');
    if (!emergencyCase) {
      return res.status(404).json({ error: 'Emergency case not found.' });
    }

    const patientId = emergencyCase.patientId?._id;
    if (!patientId) {
      return res.status(400).json({ error: 'No patient record linked to this emergency case.' });
    }

    // Fetch active medicines with emergency_share visibility
    const medicines = await MedicineRecord.find({
      patientId,
      visibility: 'emergency_share',
      status: { $in: ['currently_taking', 'as_needed'] }
    }).sort({ status: 1, updatedAt: -1 });

    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'EMERGENCY_MEDICINES_VIEWED',
      resourceType: 'MedicineRecord',
      resourceId: emergencyCase._id,
      patientId,
      details: {
        caseNumber: emergencyCase.caseNumber,
        medicinesCount: medicines.length
      },
      req
    });

    res.json({
      success: true,
      caseNumber: emergencyCase.caseNumber,
      medicinesCount: medicines.length,
      medicines
    });
  } catch (error) {
    next(error);
  }
};
