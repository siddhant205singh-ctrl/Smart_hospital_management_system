const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const CANDIDATE_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-flash-latest'
];

/**
 * Clean and extract JSON string from raw text
 */
function extractJsonString(rawText) {
  if (!rawText || typeof rawText !== 'string') return '';
  let cleaned = rawText.trim();

  // Strip markdown code fences if present
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  // If already starts with { or [, return it
  if ((cleaned.startsWith('{') && cleaned.endsWith('}')) || (cleaned.startsWith('[') && cleaned.endsWith(']'))) {
    return cleaned;
  }

  // Find first { and matching last }
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return cleaned.substring(firstBrace, lastBrace + 1);
  }

  // Find first [ and last ]
  const firstBracket = cleaned.indexOf('[');
  const lastBracket = cleaned.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    return cleaned.substring(firstBracket, lastBracket + 1);
  }

  return cleaned;
}

/**
 * Execute a Gemini call with model cascade, exponential backoff, and structured logging
 */
async function callGeminiApi({
  parts,
  generationConfig = {},
  timeoutMs = 15000,
  maxRetries = 2
}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const err = new Error('Gemini API key is not configured in server environment.');
    err.code = 'API_KEY_MISSING';
    throw err;
  }

  let lastError = null;

  for (const model of CANDIDATE_MODELS) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const startTime = Date.now();
      try {
        console.log(`[aiService] Calling model ${model} (attempt ${attempt + 1}/${maxRetries + 1})...`);

        const payload = {
          contents: [{ parts }]
        };

        if (Object.keys(generationConfig).length > 0) {
          payload.generationConfig = generationConfig;
        }

        const res = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          payload,
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: timeoutMs
          }
        );

        const latencyMs = Date.now() - startTime;
        const candidate = res.data?.candidates?.[0];
        const finishReason = candidate?.finishReason;
        const text = candidate?.content?.parts?.[0]?.text || '';

        console.log(`[aiService] Success: model=${model}, latency=${latencyMs}ms, finishReason=${finishReason}, length=${text.length}`);

        if (!text && finishReason === 'SAFETY') {
          const safetyErr = new Error('Response blocked by Gemini safety guidelines.');
          safetyErr.code = 'SAFETY_BLOCKED';
          throw safetyErr;
        }

        return {
          text,
          model,
          latencyMs,
          rawCandidate: candidate
        };
      } catch (err) {
        const latencyMs = Date.now() - startTime;
        const status = err.response?.status;
        const errorMsg = err.response?.data?.error?.message || err.message;
        console.warn(`[aiService] Failure: model=${model}, attempt=${attempt + 1}, status=${status}, latency=${latencyMs}ms, error=${errorMsg}`);

        lastError = err;

        // If rate limit (429) or transient server error (500/503), retry with exponential backoff
        if ((status === 429 || (status >= 500 && status < 600)) && attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000 + Math.floor(Math.random() * 500);
          console.log(`[aiService] Waiting ${delay}ms before retrying ${model}...`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }

        // If client error (400, 404, etc.) or retries exhausted, break out to try next candidate model
        break;
      }
    }
  }

  // If all models failed, formulate a clean descriptive error
  const finalErr = new Error(
    lastError?.response?.status === 429
      ? 'AI service rate limit / quota exceeded. Please retry in a few moments.'
      : lastError?.response?.status >= 500
      ? 'AI service is temporarily unavailable. Please try again shortly.'
      : lastError?.message || 'Failed to generate response from Gemini AI.'
  );
  finalErr.originalError = lastError;
  finalErr.statusCode = lastError?.response?.status || 500;
  throw finalErr;
}

/**
 * Generate plain text response
 */
async function generateText(prompt, options = {}) {
  const parts = [{ text: prompt }];
  const result = await callGeminiApi({
    parts,
    timeoutMs: options.timeoutMs || 15000
  });
  return result.text;
}

/**
 * Generate structured JSON validated with schema
 */
async function generateStructuredJson({ prompt, parts = [], schema = null, correctionPrompt = null, options = {} }) {
  const combinedParts = parts.length > 0 ? parts : [];
  if (prompt) {
    combinedParts.unshift({ text: prompt });
  }

  const generationConfig = {
    responseMimeType: 'application/json'
  };

  try {
    const result = await callGeminiApi({
      parts: combinedParts,
      generationConfig,
      timeoutMs: options.timeoutMs || 18000
    });

    const jsonStr = extractJsonString(result.text);
    let parsedData = JSON.parse(jsonStr);

    if (schema) {
      parsedData = schema.parse(parsedData);
    }

    return {
      success: true,
      data: parsedData,
      model: result.model,
      latencyMs: result.latencyMs
    };
  } catch (firstErr) {
    console.warn('[aiService] First attempt at structured JSON failed:', firstErr.message);

    // One-time self-correction retry
    if (correctionPrompt) {
      console.log('[aiService] Running correction retry for structured JSON...');
      try {
        const retryParts = [
          ...combinedParts,
          { text: `Previous attempt failed with error: "${firstErr.message}". ${correctionPrompt} Return ONLY strictly valid JSON matching the exact schema.` }
        ];

        const retryResult = await callGeminiApi({
          parts: retryParts,
          generationConfig,
          timeoutMs: options.timeoutMs || 18000
        });

        const retryJsonStr = extractJsonString(retryResult.text);
        let retryData = JSON.parse(retryJsonStr);
        if (schema) {
          retryData = schema.parse(retryData);
        }

        return {
          success: true,
          data: retryData,
          model: retryResult.model,
          latencyMs: retryResult.latencyMs,
          corrected: true
        };
      } catch (retryErr) {
        console.error('[aiService] Correction retry also failed:', retryErr.message);
        throw retryErr;
      }
    }

    throw firstErr;
  }
}

/**
 * Send image to Gemini (Buffer + mimeType)
 */
async function sendImageToGemini({ buffer, mimeType, prompt, schema = null, options = {} }) {
  if (!buffer || buffer.length === 0) {
    throw new Error('Image buffer is empty or missing.');
  }

  const base64Data = buffer.toString('base64');
  const imagePart = {
    inlineData: {
      mimeType: mimeType || 'image/jpeg',
      data: base64Data
    }
  };

  const parts = [
    { text: prompt },
    imagePart
  ];

  if (schema) {
    return await generateStructuredJson({
      prompt: null,
      parts,
      schema,
      correctionPrompt: 'Return valid JSON matching the requested schema for the medicine packaging.',
      options
    });
  }

  const result = await callGeminiApi({ parts, timeoutMs: options.timeoutMs || 18000 });
  return result.text;
}

/**
 * Send document (PDF/Image) to Gemini
 */
async function sendDocumentToGemini({ buffer, mimeType, prompt, schema = null, options = {} }) {
  if (!buffer || buffer.length === 0) {
    throw new Error('Document buffer is empty or missing.');
  }

  const base64Data = buffer.toString('base64');
  const docPart = {
    inlineData: {
      mimeType: mimeType || 'application/pdf',
      data: base64Data
    }
  };

  const parts = [
    { text: prompt },
    docPart
  ];

  if (schema) {
    return await generateStructuredJson({
      prompt: null,
      parts,
      schema,
      correctionPrompt: 'Return valid JSON matching the clinical report schema.',
      options
    });
  }

  const result = await callGeminiApi({ parts, timeoutMs: options.timeoutMs || 20000 });
  return result.text;
}

/**
 * Health Check helper for Admin Desk
 */
async function checkAiHealth() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      status: 'unhealthy',
      error: 'GEMINI_API_KEY is missing from environment.',
      models: []
    };
  }

  const t0 = Date.now();
  try {
    const listRes = await axios.get(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      { timeout: 8000 }
    );
    const available = (listRes.data?.models || []).map(m => m.name.replace('models/', ''));
    const flashModels = available.filter(m => m.includes('flash'));

    // Perform a tiny test call
    const testRes = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
      { contents: [{ parts: [{ text: 'Health Check: Reply with "OK"' }] }] },
      { headers: { 'Content-Type': 'application/json' }, timeout: 8000 }
    );

    const reply = testRes.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'OK';
    const latencyMs = Date.now() - t0;

    return {
      status: 'healthy',
      apiKeyConfigured: true,
      apiKeyPrefix: apiKey.substring(0, 8) + '...',
      primaryModel: 'gemini-3.5-flash',
      candidateCascade: CANDIDATE_MODELS,
      availableFlashModels: flashModels,
      testCallReply: reply,
      testCallLatencyMs: latencyMs,
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    return {
      status: 'degraded',
      apiKeyConfigured: true,
      error: err.response?.data?.error?.message || err.message,
      statusCode: err.response?.status,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = {
  CANDIDATE_MODELS,
  callGeminiApi,
  generateText,
  generateStructuredJson,
  sendImageToGemini,
  sendDocumentToGemini,
  checkAiHealth,
  extractJsonString
};
