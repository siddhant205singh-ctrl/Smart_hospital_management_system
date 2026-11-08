const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const Tesseract = require('tesseract.js');
const pdfParse = require('pdf-parse');
const { z } = require('zod');
const aiService = require('./aiService');

/**
 * Validate file type by magic bytes / content
 */
function detectFileType(buffer) {
  if (!buffer || buffer.length < 4) return 'unknown';

  // PDF: %PDF (25 50 44 46)
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return { ext: 'pdf', mime: 'application/pdf', isPdf: true, isImage: false };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return { ext: 'png', mime: 'image/png', isPdf: false, isImage: true };
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return { ext: 'jpg', mime: 'image/jpeg', isPdf: false, isImage: true };
  }

  // WEBP: RIFF....WEBP
  if (buffer.length >= 12 &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP') {
    return { ext: 'webp', mime: 'image/webp', isPdf: false, isImage: true };
  }

  // HEIC / ftyp
  if (buffer.length >= 12 && buffer.toString('ascii', 4, 8) === 'ftyp') {
    return { ext: 'heic', mime: 'image/heic', isPdf: false, isImage: true };
  }

  return { ext: 'unknown', mime: 'application/octet-stream', isPdf: false, isImage: false };
}

/**
 * Preprocess image with sharp:
 * - auto-rotate EXIF
 * - resize to max 2000px
 * - enhance contrast and grayscale for OCR
 */
async function preprocessImage(buffer) {
  try {
    // 1. Normalized color image for Gemini Vision
    const normalizedBuffer = await sharp(buffer)
      .rotate() // auto-orient based on EXIF
      .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 90 })
      .toBuffer();

    // 2. High-contrast grayscale image for local Tesseract OCR
    const ocrOptimizedBuffer = await sharp(buffer)
      .rotate()
      .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
      .grayscale()
      .normalize()
      .sharpen()
      .png()
      .toBuffer();

    return {
      normalizedBuffer,
      ocrOptimizedBuffer,
      mime: 'image/jpeg'
    };
  } catch (err) {
    console.warn('[docIntelligence] Sharp preprocessing fallback:', err.message);
    return {
      normalizedBuffer: buffer,
      ocrOptimizedBuffer: buffer,
      mime: 'image/jpeg'
    };
  }
}

/**
 * Extract text from PDF document
 */
async function extractPdfText(buffer) {
  try {
    const data = await pdfParse(buffer);
    const text = (data.text || '').trim();
    return {
      success: true,
      text,
      pages: data.numpages || 1,
      hasTextLayer: text.length >= 40
    };
  } catch (err) {
    console.warn('[docIntelligence] PDF parse failed:', err.message);
    return {
      success: false,
      text: '',
      pages: 1,
      hasTextLayer: false,
      error: err.message
    };
  }
}

/**
 * Run OCR with Tesseract.js (English + Hindi)
 */
async function runOcr(imageBuffer) {
  try {
    console.log('[docIntelligence] Running Tesseract OCR on image...');
    const result = await Tesseract.recognize(
      imageBuffer,
      'eng',
      {
        logger: () => {}
      }
    );

    const text = (result.data?.text || '').trim();
    const confidence = result.data?.confidence || 0;
    console.log(`[docIntelligence] OCR complete. Confidence: ${confidence}%, Text length: ${text.length}`);

    return {
      success: true,
      text,
      confidence: Math.round(confidence),
      lines: (result.data?.lines || []).map(l => l.text.trim()).filter(Boolean)
    };
  } catch (err) {
    console.warn('[docIntelligence] Tesseract OCR failed, proceeding with vision-only:', err.message);
    return {
      success: false,
      text: '',
      confidence: 0,
      lines: []
    };
  }
}

/**
 * Medicine Item Zod Schema
 */
const MedicineItemZodSchema = z.object({
  brandName: z.string().nullable().optional().transform(v => v ? v.trim() : ''),
  genericName: z.string().nullable().optional().transform(v => v ? v.trim() : ''),
  strength: z.string().nullable().optional().transform(v => v ? v.trim() : ''),
  dosageForm: z.string().nullable().optional().transform(v => {
    const form = (v || '').toLowerCase();
    if (['tablet', 'capsule', 'syrup', 'injection', 'ointment', 'drops', 'inhaler'].includes(form)) {
      return form;
    }
    return 'tablet';
  }),
  manufacturer: z.string().nullable().optional().transform(v => v ? v.trim() : ''),
  batchNumber: z.string().nullable().optional().transform(v => v ? v.trim() : ''),
  expiryDate: z.string().nullable().optional().transform(v => v ? v.trim() : ''),
  confidence: z.any().optional().transform(v => {
    if (typeof v === 'number') return { overall: v, fields: {} };
    if (v && typeof v === 'object') {
      const overall = typeof v.overall === 'number' ? v.overall : 0.85;
      const fields = typeof v.fields === 'object' && v.fields ? v.fields : {};
      return { overall, fields };
    }
    return { overall: 0.85, fields: {} };
  })
});

const MedicineScanResponseZodSchema = z.object({
  items: z.array(MedicineItemZodSchema).min(1, 'At least one medicine item must be extracted')
});

/**
 * Cross-validate Gemini-extracted medicine fields against OCR text
 */
function crossValidateMedicine(item, ocrText) {
  const ocrLower = (ocrText || '').toLowerCase();
  const fields = {};
  let matchingScore = 0;
  let totalEvaluated = 0;

  const checkField = (fieldVal, fieldKey) => {
    if (!fieldVal || fieldVal.length < 2) return;
    totalEvaluated++;
    const valLower = fieldVal.toLowerCase();

    // Check exact or partial inclusion in OCR text
    if (ocrLower.includes(valLower)) {
      fields[fieldKey] = { confidence: 'high', source: 'both', verifiedByOcr: true };
      matchingScore += 1.0;
    } else {
      // Split into words (e.g. "Calpol 500" -> "calpol")
      const words = valLower.split(/\s+/).filter(w => w.length > 2);
      const matchedWords = words.filter(w => ocrLower.includes(w));
      if (matchedWords.length > 0) {
        fields[fieldKey] = { confidence: 'medium', source: 'both_partial', verifiedByOcr: true };
        matchingScore += 0.7;
      } else {
        fields[fieldKey] = { confidence: 'medium', source: 'vision_only', verifiedByOcr: false };
        matchingScore += 0.4;
      }
    }
  };

  checkField(item.brandName, 'brandName');
  checkField(item.genericName, 'genericName');
  checkField(item.strength, 'strength');
  checkField(item.manufacturer, 'manufacturer');
  checkField(item.batchNumber, 'batchNumber');

  const calculatedOverall = totalEvaluated > 0
    ? Math.min(0.99, Math.max(0.60, Number((matchingScore / totalEvaluated).toFixed(2))))
    : 0.80;

  return {
    ...item,
    confidence: {
      overall: calculatedOverall,
      fields
    },
    ocrCrossChecked: Boolean(ocrText && ocrText.length > 10)
  };
}

/**
 * Hybrid Medicine Scanner Pipeline
 */
async function scanMedicinePackaging({ buffer, mimeType, filename }) {
  if (!buffer || buffer.length === 0) {
    throw new Error('No medicine photo buffer provided.');
  }

  const fileInfo = detectFileType(buffer);
  if (!fileInfo.isImage && fileInfo.ext !== 'heic') {
    throw new Error('Unsupported image format. Please upload JPG, PNG, WEBP, or HEIC.');
  }

  // Stage 1: Preprocess Image
  const { normalizedBuffer, ocrOptimizedBuffer, mime } = await preprocessImage(buffer);

  // Stage 2: OCR with Tesseract
  const ocrResult = await runOcr(ocrOptimizedBuffer);

  // Stage 3: Multimodal AI with Gemini
  const prompt = `You are a clinical pharmacovigilance OCR and medicine packaging reader.
Examine this medicine image carefully. 
Here is the text extracted by local OCR from the packaging (note: OCR text may contain typos or missing characters):
--- OCR TEXT BEGIN ---
${ocrResult.text || 'No clear OCR text layer.'}
--- OCR TEXT END ---

INSTRUCTIONS:
1. Use the image as the ultimate source of truth.
2. Use the OCR text above to cross-reference and verify exact character spelling, dosage numbers, and strengths.
3. Extract ALL medicines visible on the strip, bottle, or packaging.
4. Extract brand name, generic/salt name, strength, dosage form (tablet/capsule/syrup/injection/ointment/drops/inhaler), manufacturer, batch number, and expiry date.
5. If a field is not visible, return empty string "". NEVER invent or guess data.
6. Return valid JSON only matching this exact schema:
{
  "items": [
    {
      "brandName": "Calpol 500",
      "genericName": "Paracetamol",
      "strength": "500 mg",
      "dosageForm": "tablet",
      "manufacturer": "GlaxoSmithKline",
      "batchNumber": "AB1234",
      "expiryDate": "12/2027",
      "confidence": { "overall": 0.95 }
    }
  ]
}`;

  console.log('[docIntelligence] Calling Gemini Vision for medicine packaging extraction...');
  const geminiResponse = await aiService.sendImageToGemini({
    buffer: normalizedBuffer,
    mimeType: mime,
    prompt,
    schema: MedicineScanResponseZodSchema,
    options: { timeoutMs: 18000 }
  });

  const extractedItems = geminiResponse.data?.items || [];
  if (extractedItems.length === 0) {
    throw new Error('No medicine names or details could be identified on the packaging. Please retake photo with clear lighting and focus on the text label.');
  }

  // Stage 4: Cross-validate with OCR
  const validatedItems = extractedItems.map(item => crossValidateMedicine(item, ocrResult.text));

  return {
    success: true,
    extractedItems: validatedItems,
    ocrSummary: {
      performed: ocrResult.success,
      confidence: ocrResult.confidence,
      detectedCharacters: ocrResult.text.length
    },
    modelUsed: geminiResponse.model,
    latencyMs: geminiResponse.latencyMs
  };
}

/**
 * Report Summary Zod Schema
 */
const ReportSummaryZodSchema = z.object({
  title: z.string().default('Clinical Report Summary'),
  category: z.string().default('Diagnostic Report'),
  overallSummary: z.string().default(''),
  keyFindings: z.array(z.string()).default([]),
  abnormalFlags: z.array(z.string()).default([]),
  suggestedFollowUp: z.string().default('Discuss results with your consulting physician.'),
  confidence: z.number().default(0.9)
});

/**
 * Hybrid Report Summarization Pipeline
 */
async function summarizeMedicalReport({ buffer, mimeType, filename, reportType = 'lab_report', title = '', notes = '' }) {
  if (!buffer || buffer.length === 0) {
    throw new Error('No report document buffer provided for summarization.');
  }

  const fileInfo = detectFileType(buffer);
  let extractedText = '';
  let ocrConfidence = 0;
  let sendBuffer = buffer;
  let sendMime = mimeType || fileInfo.mime;

  if (fileInfo.isPdf) {
    // Stage 1: Extract PDF text
    console.log('[docIntelligence] Extracting text layer from PDF report...');
    const pdfResult = await extractPdfText(buffer);
    if (pdfResult.hasTextLayer) {
      extractedText = pdfResult.text;
      console.log(`[docIntelligence] PDF text layer extracted: ${extractedText.length} characters.`);
    } else {
      console.log('[docIntelligence] PDF appears to be a scanned document without text layer.');
    }
  } else if (fileInfo.isImage) {
    // Stage 1 & 2: Preprocess and OCR for image reports
    const { normalizedBuffer, ocrOptimizedBuffer, mime } = await preprocessImage(buffer);
    sendBuffer = normalizedBuffer;
    sendMime = mime;
    const ocrResult = await runOcr(ocrOptimizedBuffer);
    extractedText = ocrResult.text;
    ocrConfidence = ocrResult.confidence;
  }

  const prompt = `You are an expert clinical medical documentation summarizer.
Analyze this medical report document (Report Title: "${title || filename || 'Diagnostic Report'}", Category: "${reportType}").
${notes ? `User notes: "${notes}"` : ''}

${extractedText ? `Document extracted text layer / OCR content:\n--- DOCUMENT TEXT BEGIN ---\n${extractedText.substring(0, 4000)}\n--- DOCUMENT TEXT END ---` : ''}

CLINICAL CRITERIA:
1. Provide an objective, clear, plain-language clinical summary suitable for both the patient and doctor.
2. List 3 to 5 key findings or test values (including test name, measured value, units, and normal reference ranges if shown).
3. Identify any abnormal or out-of-range indicators clearly.
4. Provide practical next-step guidance ("Discuss with physician").
5. Return strictly valid JSON with this structure:
{
  "title": "${title || 'Diagnostic Summary'}",
  "category": "${reportType}",
  "overallSummary": "Concise 2-sentence summary of the report results.",
  "keyFindings": [
    "Hemoglobin: 14.2 g/dL (Normal range: 13.0 - 17.0 g/dL)",
    "Total Cholesterol: 185 mg/dL (Normal: < 200 mg/dL)"
  ],
  "abnormalFlags": [
    "Borderline elevated LDL cholesterol (135 mg/dL)"
  ],
  "suggestedFollowUp": "Review findings with your doctor at your next OPD consultation.",
  "confidence": 0.95
}`;

  console.log('[docIntelligence] Generating clinical report summary with Gemini...');
  let geminiResponse;

  if (fileInfo.isPdf && extractedText.length > 100) {
    // If text layer is comprehensive, text prompt with PDF context is fast and accurate
    const structured = await aiService.generateStructuredJson({
      prompt,
      schema: ReportSummaryZodSchema,
      correctionPrompt: 'Return valid JSON matching the report summary schema.',
      options: { timeoutMs: 18000 }
    });
    geminiResponse = structured;
  } else if (fileInfo.isPdf) {
    // Scanned PDF binary
    const docSummary = await aiService.sendDocumentToGemini({
      buffer: sendBuffer,
      mimeType: 'application/pdf',
      prompt,
      schema: ReportSummaryZodSchema,
      options: { timeoutMs: 20000 }
    });
    geminiResponse = docSummary;
  } else {
    // Image report
    const imgSummary = await aiService.sendImageToGemini({
      buffer: sendBuffer,
      mimeType: sendMime,
      prompt,
      schema: ReportSummaryZodSchema,
      options: { timeoutMs: 18000 }
    });
    geminiResponse = imgSummary;
  }

  const data = geminiResponse.data;

  // Format concise markdown summary string for persistence into HealthRecord.aiSummary
  const formattedSummaryText = `• ${data.overallSummary}\n` +
    (data.keyFindings?.length ? data.keyFindings.map(f => `• ${f}`).join('\n') + '\n' : '') +
    (data.abnormalFlags?.length ? `• ⚠️ Notable: ${data.abnormalFlags.join(', ')}\n` : '') +
    `• Next Step: ${data.suggestedFollowUp}`;

  return {
    success: true,
    structured: data,
    summaryText: formattedSummaryText,
    modelUsed: geminiResponse.model,
    latencyMs: geminiResponse.latencyMs,
    ocrConfidence
  };
}

module.exports = {
  detectFileType,
  preprocessImage,
  extractPdfText,
  runOcr,
  scanMedicinePackaging,
  summarizeMedicalReport
};
