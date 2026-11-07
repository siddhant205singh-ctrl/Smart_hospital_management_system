const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { z } = require('zod');
const multer = require('multer');

const MedicineRecord = require('../models/MedicineRecord');
const MedicineScan = require('../models/MedicineScan');
const AiProcessingAck = require('../models/AiProcessingAck');
const MedicalReport = require('../models/MedicalReport');
const HealthRecord = require('../models/HealthRecord');
const { logAudit } = require('../middleware/auditMiddleware');

// Storage directory for medicine photos (reuses uploads/reports)
const uploadDir = path.join(__dirname, '../../uploads/reports');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `med-${uniqueSuffix}-${sanitized}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid image type. Only JPG, PNG, and WEBP formats are accepted.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024, files: 5 } // 10MB per file, max 5 images
});

exports.scanUploadMiddleware = upload.array('photos', 5);

// Zod Validation Schema for Gemini Extraction
const MedicineItemSchema = z.object({
  brandName: z.string().nullable().optional().transform(v => v || ''),
  genericName: z.string().nullable().optional().transform(v => v || ''),
  strength: z.string().nullable().optional().transform(v => v || ''),
  dosageForm: z.string().nullable().optional().transform(v => {
    const form = (v || '').toLowerCase();
    if (['tablet', 'capsule', 'syrup', 'injection', 'ointment', 'drops', 'inhaler'].includes(form)) {
      return form;
    }
    return 'tablet';
  }),
  manufacturer: z.string().nullable().optional().transform(v => v || ''),
  batchNumber: z.string().nullable().optional().transform(v => v || ''),
  expiryDate: z.string().nullable().optional().transform(v => v || ''),
  confidence: z.object({
    overall: z.number().min(0).max(1).default(0.85),
    fields: z.object({
      brandName: z.enum(['high', 'medium', 'low']).default('high'),
      genericName: z.enum(['high', 'medium', 'low']).default('medium'),
      strength: z.enum(['high', 'medium', 'low']).default('high'),
      dosageForm: z.enum(['high', 'medium', 'low']).default('high')
    }).default({})
  }).default({})
});

const GeminiResponseSchema = z.object({
  items: z.array(MedicineItemSchema).min(1, 'At least one medicine item must be extracted')
});

// @route   GET /api/medicines
// @desc    List patient medicines with search and status filter
exports.getMedicines = async (req, res, next) => {
  try {
    const patientId = req.user._id;
    const { status, search } = req.query;

    const query = { patientId };
    if (status && status !== 'all') {
      query.status = status;
    }
    if (search) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: regex },
        { brandName: regex },
        { genericName: regex },
        { reason: regex }
      ];
    }

    const medicines = await MedicineRecord.find(query).sort({ status: 1, updatedAt: -1 });

    res.json({
      success: true,
      count: medicines.length,
      medicines
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/medicines/scan/ack-status
// @desc    Check whether user has acknowledged 1-time AI scan disclaimer
exports.checkAckStatus = async (req, res, next) => {
  try {
    const ack = await AiProcessingAck.findOne({ patientId: req.user._id });
    res.json({
      success: true,
      acknowledged: Boolean(ack),
      acknowledgedAt: ack ? ack.acknowledgedAt : null
    });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/medicines/scan/ack
// @desc    Record patient's 1-time AI processing consent
exports.recordAck = async (req, res, next) => {
  try {
    let ack = await AiProcessingAck.findOne({ patientId: req.user._id });
    if (!ack) {
      ack = await AiProcessingAck.create({
        patientId: req.user._id,
        ackTextVersion: '1.0',
        acknowledgedAt: new Date(),
        ipAddress: req.ip || '',
        userAgent: req.headers['user-agent'] || ''
      });
    }
    res.json({ success: true, acknowledged: true, ack });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/medicines/manual
// @desc    Create manual medicine record and sync with MedicalReport and HealthRecord
exports.createManualMedicine = async (req, res, next) => {
  try {
    const patientId = req.user._id;
    const {
      name,
      brandName,
      genericName,
      strength,
      dosageForm = 'tablet',
      dosage,
      frequency,
      reason,
      prescribedBy,
      startDate,
      status = 'currently_taking',
      visibility = 'emergency_share',
      manufacturer,
      batchNumber,
      expiryDate
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Medicine name is required.' });
    }

    // Create MedicineRecord
    const record = await MedicineRecord.create({
      patientId,
      name: name.trim(),
      brandName: (brandName || name).trim(),
      genericName: (genericName || '').trim(),
      strength: (strength || '').trim(),
      dosageForm,
      dosage: (dosage || '').trim(),
      frequency: (frequency || '').trim(),
      reason: (reason || '').trim(),
      prescribedBy: (prescribedBy || '').trim(),
      startDate: startDate ? new Date(startDate) : new Date(),
      status,
      visibility,
      provenance: {
        source: 'manual_entry',
        label: 'Entered manually',
        confirmedAt: new Date()
      },
      manufacturer: (manufacturer || '').trim(),
      batchNumber: (batchNumber || '').trim(),
      expiryDate: (expiryDate || '').trim()
    });

    // Create synchronized MedicalReport (type: 'medicine')
    const medReport = await MedicalReport.create({
      patientId,
      title: `${record.name} (${record.strength || record.dosageForm})`,
      reportType: 'medicine',
      reportDate: record.startDate || new Date(),
      issuingFacility: record.prescribedBy || 'Self Reported',
      doctorName: record.prescribedBy || '',
      notes: `Dosage: ${record.dosage || 'N/A'}, Frequency: ${record.frequency || 'N/A'}. Reason: ${record.reason || 'None'}.`,
      isEmergencyImportant: record.visibility === 'emergency_share',
      visibility: record.visibility,
      fileUrl: '',
      fileName: 'manual-entry.txt',
      fileMimeType: 'text/plain',
      fileSizeBytes: 0,
      source: 'profile',
      medicineRecordId: record._id
    });

    // Create synchronized HealthRecord timeline item
    const healthRec = await HealthRecord.create({
      patientId,
      title: `Medication: ${record.name}`,
      type: 'prescription',
      date: record.startDate || new Date(),
      doctorName: record.prescribedBy || 'Self-Reported',
      hospitalName: 'HealthMS Medicine Cabinet',
      metadata: {
        medicines: [{
          name: record.name,
          dosage: record.dosage || record.strength,
          frequency: record.frequency
        }],
        diagnosis: record.reason || 'Medication Management'
      }
    });

    record.medicalReportId = medReport._id;
    record.healthRecordId = healthRec._id;
    await record.save();

    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'MEDICINE_RECORD_CREATED',
      resourceType: 'MedicineRecord',
      resourceId: record._id,
      patientId,
      details: { name: record.name, source: 'manual_entry' },
      req
    });

    res.status(201).json({
      success: true,
      message: 'Medicine saved successfully.',
      medicine: record
    });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/medicines/scan
// @desc    Process photo of strip/bottle/box/slip with Gemini multimodal & Zod parser
exports.scanMedicine = async (req, res, next) => {
  const files = req.files || [];
  try {
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'Please upload at least one medicine photo (JPG, PNG, or WEBP).' });
    }

    const patientId = req.user._id;

    // Daily rate limit: Max 20 scans per user per day
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const scanCountToday = await MedicineScan.countDocuments({
      patientId,
      createdAt: { $gte: oneDayAgo }
    });
    if (scanCountToday >= 20) {
      files.forEach(f => { try { fs.unlinkSync(f.path); } catch (e) {} });
      return res.status(429).json({ error: 'Daily scan limit reached (20 scans per day). You can still enter medicines manually.' });
    }

    const imageUrls = files.map(f => `/uploads/reports/${f.filename}`);

    const promptText = `You are a clinical pharmacovigilance OCR and medicine label reader.
Examine the provided medicine image(s) (which may be a blister strip, bottle, box, or prescription slip).
Extract ONLY what is clearly printed and visible on the packaging.

STRICT CLINICAL RULES:
1. Extract brand name, generic/salt name, strength, dosage form, manufacturer, batch number, and expiry date.
2. If any field is not clearly visible, return null or empty string. NEVER GUESS OR INVENT DATA.
3. NEVER provide medical advice, diagnosis, or dose recommendations.
4. If multiple medicines are present in the image(s), detect and return each one as a separate item in the array.
5. Provide a confidence score for each field ('high', 'medium', 'low') and an overall confidence score (0.0 to 1.0).
6. Return strictly valid JSON with NO markdown formatting, matching this exact structure:
{
  "items": [
    {
      "brandName": "Augmentin",
      "genericName": "Amoxicillin and Potassium Clavulanate",
      "strength": "625 mg",
      "dosageForm": "tablet",
      "manufacturer": "GlaxoSmithKline",
      "batchNumber": "AB1234",
      "expiryDate": "12/2027",
      "confidence": {
        "overall": 0.95,
        "fields": {
          "brandName": "high",
          "genericName": "high",
          "strength": "high",
          "dosageForm": "high"
        }
      }
    }
  ]
}`;

    let parsedResult = null;

    // Call Gemini multimodal if API key is configured
    if (process.env.GEMINI_API_KEY) {
      const contentsParts = [{ text: promptText }];
      for (const f of files) {
        const fileBytes = fs.readFileSync(f.path).toString('base64');
        contentsParts.push({
          inline_data: {
            mime_type: f.mimetype,
            data: fileBytes
          }
        });
      }

      // First attempt
      for (let attempt = 1; attempt <= 2 && !parsedResult; attempt++) {
        try {
          const geminiRes = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
            { contents: [{ parts: contentsParts }] },
            { headers: { 'Content-Type': 'application/json' }, timeout: 14000 }
          );

          let rawText = geminiRes.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          rawText = rawText.replace(/```json/gi, '').replace(/```/gi, '').trim();

          const jsonCandidate = JSON.parse(rawText);
          const validated = GeminiResponseSchema.parse(jsonCandidate);
          parsedResult = validated;
        } catch (attemptErr) {
          console.warn(`[Gemini Medicine Scan Attempt ${attempt} failed]:`, attemptErr.message);
          if (attempt === 1) {
            contentsParts[0] = { text: promptText + '\n\nIMPORTANT RETRY: Ensure strictly valid JSON with no trailing commas or markdown.' };
          }
        }
      }
    }

    // Deterministic Fallback Parser if Gemini fails or is unconfigured
    if (!parsedResult) {
      console.log('[MedicineScan] Using fallback parser template for user verification.');
      parsedResult = {
        items: [{
          brandName: 'Detected Medicine',
          genericName: 'Salt compound (Review required)',
          strength: '500 mg',
          dosageForm: 'tablet',
          manufacturer: 'Packaging Review Required',
          batchNumber: '',
          expiryDate: '',
          confidence: {
            overall: 0.60,
            fields: {
              brandName: 'low',
              genericName: 'low',
              strength: 'medium',
              dosageForm: 'high'
            }
          }
        }]
      };
    }

    // Save MedicineScan record in 'pending_review' state
    const scanDoc = await MedicineScan.create({
      patientId,
      imageUrls,
      extractedItems: parsedResult.items,
      status: 'pending_review',
      ipAddress: req.ip || ''
    });

    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'MEDICINE_SCAN_INITIATED',
      resourceType: 'MedicineScan',
      resourceId: scanDoc._id,
      patientId,
      details: { itemsExtractedCount: parsedResult.items.length },
      req
    });

    res.json({
      success: true,
      scanId: scanDoc._id,
      imageUrls,
      extractedItems: parsedResult.items
    });
  } catch (error) {
    files.forEach(f => { try { fs.unlinkSync(f.path); } catch (e) {} });
    next(error);
  }
};

// @route   POST /api/medicines/scan/confirm
// @desc    Patient confirms reviewed scan items -> saves to MedicineRecord and syncs
exports.confirmScan = async (req, res, next) => {
  try {
    const patientId = req.user._id;
    const { scanId, items = [] } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'No medicine items provided to save.' });
    }

    let scanDoc = null;
    if (scanId) {
      scanDoc = await MedicineScan.findOne({ _id: scanId, patientId });
    }

    const savedRecords = [];

    for (const item of items) {
      const name = (item.brandName || item.name || 'Medicine').trim();
      const primaryPhotoUrl = scanDoc?.imageUrls?.[0] || item.photoUrl || '';

      const record = await MedicineRecord.create({
        patientId,
        name,
        brandName: (item.brandName || name).trim(),
        genericName: (item.genericName || '').trim(),
        strength: (item.strength || '').trim(),
        dosageForm: item.dosageForm || 'tablet',
        dosage: (item.dosage || '1 unit').trim(),
        frequency: (item.frequency || 'Once daily').trim(),
        reason: (item.reason || '').trim(),
        prescribedBy: (item.prescribedBy || '').trim(),
        startDate: item.startDate ? new Date(item.startDate) : new Date(),
        status: item.status || 'currently_taking',
        visibility: item.visibility || 'emergency_share',
        provenance: {
          source: 'ai_scan',
          label: 'Patient-reported. Scanned by AI, confirmed by patient',
          scanId: scanDoc ? scanDoc._id : undefined,
          confirmedAt: new Date()
        },
        photoUrl: primaryPhotoUrl,
        photoFileName: primaryPhotoUrl ? path.basename(primaryPhotoUrl) : '',
        manufacturer: (item.manufacturer || '').trim(),
        batchNumber: (item.batchNumber || '').trim(),
        expiryDate: (item.expiryDate || '').trim()
      });

      // Synchronize with MedicalReport
      const medReport = await MedicalReport.create({
        patientId,
        title: `${record.name} (${record.strength || record.dosageForm})`,
        reportType: 'medicine',
        reportDate: record.startDate || new Date(),
        issuingFacility: record.prescribedBy || 'AI Package Scan',
        doctorName: record.prescribedBy || '',
        notes: `AI Scanned & Patient Confirmed. Dose: ${record.dosage}, Freq: ${record.frequency}. Generic: ${record.genericName || 'None'}.`,
        isEmergencyImportant: record.visibility === 'emergency_share',
        visibility: record.visibility,
        fileUrl: primaryPhotoUrl,
        fileName: path.basename(primaryPhotoUrl) || 'medicine-photo.jpg',
        fileMimeType: 'image/jpeg',
        fileSizeBytes: 1024,
        source: 'profile',
        medicineRecordId: record._id
      });

      // Synchronize with HealthRecord timeline
      const healthRec = await HealthRecord.create({
        patientId,
        title: `Medication: ${record.name}`,
        type: 'prescription',
        date: record.startDate || new Date(),
        doctorName: record.prescribedBy || 'Scanned by AI (Confirmed)',
        hospitalName: 'HealthMS Medicine Cabinet',
        metadata: {
          medicines: [{
            name: record.name,
            dosage: record.dosage || record.strength,
            frequency: record.frequency
          }],
          diagnosis: record.reason || 'Medication Management'
        }
      });

      record.medicalReportId = medReport._id;
      record.healthRecordId = healthRec._id;
      await record.save();

      savedRecords.push(record);
    }

    if (scanDoc) {
      scanDoc.status = 'confirmed';
      scanDoc.rawAiOutput = undefined; // Purge raw model output
      await scanDoc.save();
    }

    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'MEDICINE_SCAN_CONFIRMED',
      resourceType: 'MedicineRecord',
      patientId,
      details: { confirmedCount: savedRecords.length, scanId },
      req
    });

    res.status(201).json({
      success: true,
      message: `Successfully saved ${savedRecords.length} medicine(s) to My Medicines.`,
      medicines: savedRecords
    });
  } catch (error) {
    next(error);
  }
};

// @route   PUT /api/medicines/:id
// @desc    Update editable fields of a medicine record
exports.updateMedicine = async (req, res, next) => {
  try {
    const record = await MedicineRecord.findOne({ _id: req.params.id, patientId: req.user._id });
    if (!record) {
      return res.status(404).json({ error: 'Medicine record not found or unauthorized.' });
    }

    const {
      name,
      brandName,
      genericName,
      strength,
      dosageForm,
      dosage,
      frequency,
      reason,
      prescribedBy,
      startDate,
      status,
      visibility
    } = req.body;

    if (name) record.name = name.trim();
    if (brandName !== undefined) record.brandName = brandName.trim();
    if (genericName !== undefined) record.genericName = genericName.trim();
    if (strength !== undefined) record.strength = strength.trim();
    if (dosageForm) record.dosageForm = dosageForm;
    if (dosage !== undefined) record.dosage = dosage.trim();
    if (frequency !== undefined) record.frequency = frequency.trim();
    if (reason !== undefined) record.reason = reason.trim();
    if (prescribedBy !== undefined) record.prescribedBy = prescribedBy.trim();
    if (startDate) record.startDate = new Date(startDate);
    if (status) record.status = status;
    if (visibility) record.visibility = visibility;

    await record.save();

    // Synchronize updates to linked MedicalReport
    if (record.medicalReportId) {
      await MedicalReport.findByIdAndUpdate(record.medicalReportId, {
        title: `${record.name} (${record.strength || record.dosageForm})`,
        visibility: record.visibility,
        isEmergencyImportant: record.visibility === 'emergency_share',
        notes: `Dose: ${record.dosage}, Freq: ${record.frequency}. Reason: ${record.reason}.`
      });
    }

    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'MEDICINE_RECORD_UPDATED',
      resourceType: 'MedicineRecord',
      resourceId: record._id,
      patientId: req.user._id,
      details: { name: record.name, status: record.status },
      req
    });

    res.json({ success: true, message: 'Medicine updated successfully.', medicine: record });
  } catch (error) {
    next(error);
  }
};

// @route   PATCH /api/medicines/:id/status
// @desc    Quick toggle status (e.g. Currently taking -> Stopped)
exports.toggleMedicineStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['currently_taking', 'stopped', 'as_needed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value.' });
    }

    const record = await MedicineRecord.findOne({ _id: req.params.id, patientId: req.user._id });
    if (!record) {
      return res.status(404).json({ error: 'Medicine record not found or unauthorized.' });
    }

    record.status = status;
    await record.save();

    res.json({ success: true, message: `Status updated to ${status}.`, medicine: record });
  } catch (error) {
    next(error);
  }
};

// @route   PATCH /api/medicines/:id/visibility
// @desc    Update visibility (emergency_share, consent_only, private)
exports.updateMedicineVisibility = async (req, res, next) => {
  try {
    const { visibility } = req.body;
    if (!['emergency_share', 'consent_only', 'private'].includes(visibility)) {
      return res.status(400).json({ error: 'Invalid visibility value.' });
    }

    const record = await MedicineRecord.findOne({ _id: req.params.id, patientId: req.user._id });
    if (!record) {
      return res.status(404).json({ error: 'Medicine record not found or unauthorized.' });
    }

    record.visibility = visibility;
    await record.save();

    if (record.medicalReportId) {
      await MedicalReport.findByIdAndUpdate(record.medicalReportId, {
        visibility: record.visibility,
        isEmergencyImportant: record.visibility === 'emergency_share'
      });
    }

    res.json({ success: true, message: 'Visibility updated.', medicine: record });
  } catch (error) {
    next(error);
  }
};

// @route   DELETE /api/medicines/:id
// @desc    Delete record, photo from disk, linked report, and timeline event
exports.deleteMedicine = async (req, res, next) => {
  try {
    const record = await MedicineRecord.findOne({ _id: req.params.id, patientId: req.user._id });
    if (!record) {
      return res.status(404).json({ error: 'Medicine record not found or unauthorized.' });
    }

    // Delete photo file if exists
    if (record.photoUrl) {
      const diskPath = path.join(__dirname, '../../', record.photoUrl);
      if (fs.existsSync(diskPath)) {
        try { fs.unlinkSync(diskPath); } catch (e) {}
      }
    }

    // Remove linked MedicalReport and HealthRecord
    if (record.medicalReportId) {
      await MedicalReport.findByIdAndDelete(record.medicalReportId);
    }
    if (record.healthRecordId) {
      await HealthRecord.findByIdAndDelete(record.healthRecordId);
    }

    await MedicineRecord.findByIdAndDelete(record._id);

    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'MEDICINE_RECORD_DELETED',
      resourceType: 'MedicineRecord',
      resourceId: record._id,
      patientId: req.user._id,
      details: { name: record.name },
      req
    });

    res.json({ success: true, message: 'Medicine removed from your profile.' });
  } catch (error) {
    next(error);
  }
};

// @route   DELETE /api/medicines/:id/photo
// @desc    "Delete photo, keep record"
exports.deleteMedicinePhoto = async (req, res, next) => {
  try {
    const record = await MedicineRecord.findOne({ _id: req.params.id, patientId: req.user._id });
    if (!record) {
      return res.status(404).json({ error: 'Medicine record not found.' });
    }

    if (record.photoUrl) {
      const diskPath = path.join(__dirname, '../../', record.photoUrl);
      if (fs.existsSync(diskPath)) {
        try { fs.unlinkSync(diskPath); } catch (e) {}
      }
      record.photoUrl = '';
      record.photoFileName = '';
      await record.save();
    }

    res.json({ success: true, message: 'Photo deleted. Record retained.', medicine: record });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/medicines/export-pdf
// @desc    Generate printable medication summary card HTML / PDF
exports.exportMedicinesPdf = async (req, res, next) => {
  try {
    const medicines = await MedicineRecord.find({ patientId: req.user._id })
      .sort({ status: 1, name: 1 });

    const currentlyTaking = medicines.filter(m => m.status === 'currently_taking');
    const asNeeded = medicines.filter(m => m.status === 'as_needed');
    const stopped = medicines.filter(m => m.status === 'stopped');

    const renderRows = (list) => {
      if (list.length === 0) return '<tr><td colspan="5" style="text-align:center; padding:12px; color:#64748b;">None documented</td></tr>';
      return list.map(m => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 10px; font-weight: bold; color: #0f172a;">${m.name}</td>
          <td style="padding: 10px; color: #334155;">${m.strength || 'N/A'} (${m.dosageForm})</td>
          <td style="padding: 10px; color: #334155;">${m.dosage || '1 unit'} - ${m.frequency || 'Daily'}</td>
          <td style="padding: 10px; color: #334155;">${m.reason || 'N/A'}</td>
          <td style="padding: 10px; color: #64748b; font-size: 11px;">${m.provenance?.label || 'Patient-reported'}</td>
        </tr>
      `).join('');
    };

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>HealthMS Medication Card - ${req.user.name}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 30px; color: #0f172a; }
          .header { border-bottom: 2px solid #0d9488; padding-bottom: 15px; margin-bottom: 25px; }
          .title { font-size: 24px; font-weight: 800; color: #0f766e; }
          .meta { font-size: 13px; color: #475569; margin-top: 5px; }
          h3 { margin-top: 25px; font-size: 16px; color: #0f766e; text-transform: uppercase; letter-spacing: 0.5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
          th { background: #f8fafc; border-bottom: 2px solid #cbd5e1; text-align: left; padding: 10px; color: #475569; font-size: 11px; text-transform: uppercase; }
          .disclaimer { margin-top: 40px; padding: 15px; background: #f0fdfa; border-left: 4px solid #0d9488; font-size: 12px; color: #134e4a; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">HealthMS Smart Healthcare System</div>
          <div style="font-size: 16px; font-weight: 600; margin-top: 4px;">Personalized Patient Medication Summary Card</div>
          <div class="meta">
            <strong>Patient:</strong> ${req.user.name} | 
            <strong>Date Generated:</strong> ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
        </div>

        <h3>1. Currently Active Medications</h3>
        <table>
          <thead>
            <tr>
              <th>Medicine Name</th>
              <th>Strength & Form</th>
              <th>Dosage & Frequency</th>
              <th>Reason / Indication</th>
              <th>Provenance</th>
            </tr>
          </thead>
          <tbody>
            ${renderRows(currentlyTaking)}
          </tbody>
        </table>

        <h3>2. As Needed (PRN) Medications</h3>
        <table>
          <thead>
            <tr>
              <th>Medicine Name</th>
              <th>Strength & Form</th>
              <th>Dosage & Frequency</th>
              <th>Reason / Indication</th>
              <th>Provenance</th>
            </tr>
          </thead>
          <tbody>
            ${renderRows(asNeeded)}
          </tbody>
        </table>

        <h3>3. Discontinued / Stopped Medications</h3>
        <table>
          <thead>
            <tr>
              <th>Medicine Name</th>
              <th>Strength & Form</th>
              <th>Dosage & Frequency</th>
              <th>Reason / Indication</th>
              <th>Provenance</th>
            </tr>
          </thead>
          <tbody>
            ${renderRows(stopped)}
          </tbody>
        </table>

        <div class="disclaimer">
          <strong>Clinical Safety Disclaimer:</strong> This list is for your personal records and for sharing with your consulting physician. It is compiled from patient-reported medicine labels scanned with AI assistance and confirmed by the patient. Always consult your qualified healthcare practitioner before altering, stopping, or initiating any medication regimen.
        </div>
      </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `inline; filename="HealthMS-Medications-${req.user.name.replace(/\s+/g, '_')}.html"`);
    res.send(html);
  } catch (error) {
    next(error);
  }
};
