const axios = require('axios');
const { toolDefinitions, executeTool, checkRedFlags } = require('./aiToolService');

/**
 * Clean PII Redactor
 */
function redactPII(text = '') {
  if (typeof text !== 'string') return text;
  return text
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]')
    .replace(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, '[REDACTED_PHONE]');
}

/**
 * Build System Prompt based on user role and privacy settings
 */
function buildSystemPrompt(role = 'visitor', user = null, language = 'en') {
  const allowHealthData = user && user.privacySettings?.useHealthDataInAssistant !== false;

  let roleContext = '';
  if (role === 'patient' && allowHealthData) {
    roleContext = `
USER STATUS: Logged-in Patient (${user.name || 'Patient'}).
You have secure access to their profile and health timeline tools. You can view their age, allergies, chronic conditions, and medicines using get_patient_context when medical questions or symptoms arise.`;
  } else if (role === 'patient' && !allowHealthData) {
    roleContext = `
USER STATUS: Logged-in Patient with Health Data Sharing DISABLED in Settings.
Do not invoke personal health tools or timeline tools. Guide them using general hospital services and doctor search only.`;
  } else if (role === 'doctor') {
    roleContext = `
USER STATUS: Hospital Doctor / Healthcare Provider.
Provide clinical schedule, queue statuses, and department overview.`;
  } else if (role === 'blood_bank_officer') {
    roleContext = `
USER STATUS: Blood Bank Officer.
Focus on blood shortage alerts, donor eligibility, and inventory status.`;
  } else {
    roleContext = `
USER STATUS: Visitor (Logged out).
Welcome the user warmly and answer ANY questions they have (health concepts, biology, wellness, hospital departments, finding doctors, emergency numbers, and blood donation FAQs). Never nag or interrupt them to sign in unless they explicitly ask for private personal health records.`;
  }

  return `
You are "HealthMS AI", the official intelligent AI guide and clinical concierge for HealthMS Hospital System.

${roleContext}

CORE PRINCIPLES & GUIDELINES:
1. IDENTITY & TONE:
   - Warm, empathetic, professional, and clear.
   - Speak directly to the user in short, digestible paragraphs with bullet points for readability.

2. SCOPE & GENERAL QUESTIONS:
   - You MUST answer ANY general question directly, accurately, and naturally!
   - This includes:
     * General health and medical concepts (e.g. "what is diabetes?", "how does hypertension happen?", "explain cholesterol", "what is asthma?")
     * Everyday sciences and wellness (e.g. nutrition, sleep hygiene, hydration, exercise)
     * Hospital procedures and FAQs (e.g. OPD registration, appointment process, blood bank rules)
     * Conversational and casual prompts (e.g. "tell me a joke", "how are you?", "who are you?")
   - NEVER refuse harmless general questions. Answer the question fully first; if health-related, you can gently mention relevant HealthMS hospital facilities.

3. CLINICAL SAFETY RULES:
   - NEVER make a definitive medical diagnosis.
   - NEVER prescribe medications, specific dosages, or tell a patient to stop taking prescribed medicines.
   - If RED-FLAG symptoms are described (chest pain, severe shortness of breath, stroke symptoms, loss of consciousness, severe bleeding, or suicidal thoughts):
     * Immediately call start_emergency_flow or provide emergency response.
     * Tell the user to call National Emergency 112 or Ambulance 108 right now.
     * Do NOT continue normal diagnostic conversation.
   - On clinical advice or symptom queries, include a concise, gentle reminder: "This is general health guidance, not a medical diagnosis. Please consult a qualified doctor."

4. SYMPTOMS & SPECIALIST RECOMMENDATION:
   - When a user describes symptoms, assess them carefully. Ask at most 2-3 focused follow-up questions (duration, severity) before recommending a specialty.
   - Always consider patient age from get_patient_context (if available): children (≤14 years) MUST be routed to Pediatrics, not adult medicine.
   - Use search_doctors to find and present up to 3 verified specialists.
   - Explain why that specialty was suggested in plain language.

5. HEALTH TIMELINE & NEXT STEPS (For Logged-in Patients):
   - When asked "what should I do now?" or "my health summary", check get_patient_context and get_health_timeline to prioritize safe navigation steps (e.g., overdue checkups, reviewing active prescriptions, pending follow-ups, or donor eligibility).
   - Only cite data that actually exists in their profile. If information is missing (like blood group or allergies), politely mention how to add it.

6. WRITE ACTIONS & BOOKING CONFIRMATION:
   - Any write action (like booking an appointment) MUST use prepare_booking.
   - NEVER execute an appointment booking silently. The prepare_booking tool creates an explicit confirmation card for the patient to approve in the UI.

7. LANGUAGE CAPABILITY:
   - Automatically match the user's language: English, Hindi (हिन्दी), or Hinglish.
   - If user asks in Hindi or Hinglish, answer fluently in that language with warm healthcare terminology.
`.trim();
}

/**
 * Format tools into Gemini Function Declarations schema
 */
function getGeminiToolsForRole(role = 'visitor', allowHealthData = true) {
  const allowed = toolDefinitions.filter(t => {
    if (!t.roles.includes(role) && !t.roles.includes('all')) return false;
    if (!allowHealthData && ['get_patient_context', 'get_health_timeline', 'list_my_medicines', 'list_my_reports', 'explain_my_report', 'check_my_donor_eligibility'].includes(t.name)) {
      return false;
    }
    return true;
  });

  return [{
    functionDeclarations: allowed.map(t => ({
      name: t.name,
      description: t.description,
      parameters: {
        type: t.parameters.type,
        properties: t.parameters.properties,
        required: t.parameters.required || []
      }
    }))
  }];
}

/**
 * Candidate models to try in order
 */
const GEMINI_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-flash-latest'
];

/**
 * Run Gemini Agent Loop
 */
async function runAgentTurn({
  message,
  history = [],
  user = null,
  role = 'visitor',
  language = 'en',
  sessionContext = {},
  onStreamChunk = null
}) {
  const allowHealthData = user && user.privacySettings?.useHealthDataInAssistant !== false;
  const systemPrompt = buildSystemPrompt(role, user, language);
  const geminiTools = getGeminiToolsForRole(role, allowHealthData);

  // Format multi-turn conversation history for Gemini v1beta
  const contents = [];

  // Recent turns (last 8 messages)
  const recentHistory = history.slice(-8);
  for (const h of recentHistory) {
    if (h.sender === 'user') {
      contents.push({
        role: 'user',
        parts: [{ text: redactPII(h.text) }]
      });
    } else if (h.sender === 'assistant' && h.text) {
      contents.push({
        role: 'model',
        parts: [{ text: h.text }]
      });
    }
  }

  // Add the current user turn
  contents.push({
    role: 'user',
    parts: [{ text: redactPII(message) }]
  });

  const executedTools = [];
  const actionCards = [];
  let finalReply = '';
  let isEmergency = checkRedFlags(message).isRedFlag;

  // Max 5 step agent loop
  const MAX_STEPS = 5;

  if (process.env.GEMINI_API_KEY) {
    for (const modelName of GEMINI_MODELS) {
      try {
        let step = 0;
        let success = false;

        while (step < MAX_STEPS) {
          step++;

          const payload = {
            contents,
            systemInstruction: {
              parts: [{ text: systemPrompt }]
            },
            tools: geminiTools,
            generationConfig: {
              temperature: 0.4,
              maxOutputTokens: 1024
            }
          };

          const res = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${process.env.GEMINI_API_KEY}`,
            payload,
            {
              headers: { 'Content-Type': 'application/json' },
              timeout: 15000
            }
          );

          const candidate = res.data?.candidates?.[0];
          const content = candidate?.content;
          const parts = content?.parts || [];

          // Check for function calls
          const functionCalls = parts.filter(p => p.functionCall);

          if (functionCalls.length > 0) {
            // Model decided to call tools
            contents.push(content);

            const functionResponseParts = [];

            for (const callPart of functionCalls) {
              const toolName = callPart.functionCall.name;
              const toolArgs = callPart.functionCall.args || {};

              if (onStreamChunk) {
                onStreamChunk({ type: 'status', message: `Executing ${toolName.replace(/_/g, ' ')}...` });
              }

              const toolResult = await executeTool(toolName, toolArgs, sessionContext);
              executedTools.push({ toolName, args: toolArgs, result: toolResult });

              if (toolResult.isEmergency) {
                isEmergency = true;
              }
              if (toolResult.confirmationRequired) {
                actionCards.push({ type: 'booking_confirmation', data: toolResult });
              }
              if (toolResult.doctors && toolResult.doctors.length > 0) {
                actionCards.push({ type: 'doctors', doctors: toolResult.doctors });
              }

              functionResponseParts.push({
                functionResponse: {
                  name: toolName,
                  response: { output: toolResult }
                }
              });
            }

            contents.push({
              role: 'function',
              parts: functionResponseParts
            });

            continue;
          }

          // Final text generated
          const textParts = parts.filter(p => p.text).map(p => p.text);
          finalReply = textParts.join('\n');
          success = true;
          break;
        }

        if (success && finalReply) {
          break; // Model successfully answered, exit loop
        }
      } catch (err) {
        console.warn(`[Gemini Agent (${modelName})]:`, err.response?.data?.error?.message || err.message);
        // Continue to try next candidate model
      }
    }
  }

  // Robust Intelligent Deterministic Fallback if offline or network unavailable
  if (!finalReply) {
    finalReply = await generateDeterministicReply({
      message,
      user,
      role,
      language,
      executedTools,
      actionCards,
      sessionContext
    });
  }

  // Quick chips generation
  const quickChips = generateQuickChips(message, executedTools, role, isEmergency);

  return {
    reply: finalReply,
    isEmergency,
    toolCalls: executedTools,
    cards: actionCards,
    quickChips
  };
}

/**
 * Intelligent Deterministic Fallback Router
 */
async function generateDeterministicReply({ message, user, role, language, executedTools, actionCards, sessionContext }) {
  const lower = (message || '').toLowerCase();
  const redFlag = checkRedFlags(lower);

  // 1. Emergency Red Flag Check
  if (redFlag.isRedFlag) {
    const emFlow = await executeTool('start_emergency_flow', {}, sessionContext);
    executedTools.push({ toolName: 'start_emergency_flow', result: emFlow });
    actionCards.push({ type: 'emergency_card', data: emFlow });

    if (language === 'hi') {
      return `🚨 **आपातकालीन चेतावनी (Red Alert)**: आपके बताए लक्षण "${redFlag.matchedFlag}" गंभीर आपात स्थिति का संकेत देते हैं।\n\n• कृपया तत्काल **112** या एम्बुलेंस **108** पर कॉल करें।\n• बिना किसी देरी के नजदीकी 24x7 आपातकालीन कक्ष (ER) जाएं।\n\n*HealthMS 24x7 ट्रॉमा सेंटर आपके स्वागत और तत्काल उपचार के लिए तैयार है।*`;
    }
    return `🚨 **CLINICAL EMERGENCY RED ALERT**: Your reported symptoms indicate a critical medical emergency requiring immediate attention.\n\n• Please call National Emergency **112** or Ambulance **108** immediately.\n• Proceed directly to the nearest 24x7 Emergency Room without delay.\n\n*HealthMS 24x7 Emergency Trauma Unit is on standby for immediate resuscitation and care.*`;
  }

  // 2. Doctor Search or Symptoms
  if (lower.includes('doctor') || lower.includes('headache') || lower.includes('fever') || lower.includes('pain') || lower.includes('cough') || lower.includes('symptom')) {
    const triage = await executeTool('triage_symptoms', { symptoms: message }, sessionContext);
    executedTools.push({ toolName: 'triage_symptoms', result: triage });

    const docSearch = await executeTool('search_doctors', { specialty: triage.suggestedSpecialty }, sessionContext);
    executedTools.push({ toolName: 'search_doctors', result: docSearch });
    if (docSearch.doctors && docSearch.doctors.length > 0) {
      actionCards.push({ type: 'doctors', doctors: docSearch.doctors });
    }

    const docListText = docSearch.doctors?.map(d => `• **${d.name}** (${d.specialty}) — OPD Room ${d.roomNumber}, Fee: ₹${d.consultationFee}`).join('\n') || '';

    return `Based on your described symptoms, our clinical triage suggests consulting a **${triage.suggestedSpecialty}** specialist.\n\n**Rationale**: ${triage.rationale}\n\n**Available Specialists**:\n${docListText || 'Specialists are available in our OPD directory.'}\n\n*Notice: This is general guidance, not a medical diagnosis. Please consult a qualified doctor.*`;
  }

  // 3. General Health Concepts (Answers general questions directly!)
  if (lower.includes('diabetes') || lower.includes('sugar')) {
    return `**Diabetes** is a chronic metabolic condition where the body either cannot produce enough insulin (Type 1) or cannot effectively use the insulin it produces (Type 2), leading to elevated blood glucose (blood sugar) levels.\n\n• **Common Symptoms**: Increased thirst, frequent urination, unexplained fatigue, and blurred vision.\n• **Management**: Balanced diet, physical exercise, blood sugar monitoring, and doctor-prescribed medications.\n\n*Would you like to consult an Endocrinologist or General Physician at HealthMS?*`;
  }

  if (lower.includes('hypertension') || lower.includes('blood pressure') || lower.includes(' bp ')) {
    return `**Hypertension** (high blood pressure) occurs when the force of blood against your artery walls is consistently too high (typically 130/80 mmHg or higher).\n\n• **Lifestyle Tips**: Reduce sodium/salt intake, stay physically active, manage stress, and avoid tobacco.\n• **Monitoring**: Regular blood pressure checks are essential since hypertension often has no early symptoms ("the silent condition").\n\n*Our Cardiology and Internal Medicine departments at HealthMS can help monitor your heart health.*`;
  }

  if (lower.includes('asthma') || lower.includes('wheez')) {
    return `**Asthma** is a chronic condition affecting the airways in your lungs. Airways can become inflamed, narrow, and produce excess mucus, causing wheezing, shortness of breath, and coughing.\n\n• **Triggers**: Dust, pollen, cold air, smoke, or viral infections.\n• **Care**: Keep a prescribed rescue inhaler accessible and avoid known environmental allergens.`;
  }

  // 4. Next Steps / Health Summary
  if (lower.includes('what should i do') || lower.includes('next step') || lower.includes('health summary') || lower.includes('my summary')) {
    if (user) {
      const pContext = await executeTool('get_patient_context', {}, sessionContext);
      executedTools.push({ toolName: 'get_patient_context', result: pContext });

      const steps = [];
      if (pContext.activeMedicines?.length) {
        steps.push(`• **Review Active Medicines**: You have ${pContext.activeMedicines.length} currently recorded medications (${pContext.activeMedicines.join(', ')}). Consider having your physician review long-standing prescriptions.`);
      }
      if (!pContext.bloodGroup || pContext.bloodGroup === 'Not recorded') {
        steps.push(`• **Update Profile**: Blood group is not recorded. Please update your profile for urgent matching safety.`);
      }
      if (pContext.recentTimelineSummary?.length) {
        steps.push(`• **Timeline Check**: Recent record: "${pContext.recentTimelineSummary[0].title}" on ${pContext.recentTimelineSummary[0].date}.`);
      }
      steps.push(`• **Routine Health Checkup**: It is recommended to schedule an annual routine checkup with a primary physician.`);

      return `Here are your personalized care navigation next steps:\n\n${steps.join('\n\n')}\n\n*Would you like me to help you schedule a consultation with an attending physician?*`;
    }
    return `As a visitor, you can explore our doctor directory, check OPD timings, or view blood availability. You can also sign in to unlock your personalized health timeline and prescription reviews.`;
  }

  // 5. Appointments or Queue Check
  if (lower.includes('appointment') || lower.includes('booking')) {
    if (user) {
      const appts = await executeTool('get_upcoming_appointments', {}, sessionContext);
      executedTools.push({ toolName: 'get_upcoming_appointments', result: appts });
      if (appts.appointments && appts.appointments.length > 0) {
        const first = appts.appointments[0];
        return `You have an upcoming appointment with **${first.doctorName}** (${first.specialty}) on **${first.date}** at **${first.timeSlot}** (Token #${first.tokenNumber}, Code: **${first.tokenCode}**). Status: **${first.status}**.`;
      }
      return `You do not have any upcoming appointments right now. Would you like me to find an available doctor for you?`;
    }
    return `You can search our available specialists and view consultation fees directly here. To book a verified slot and receive a live queue token, please sign in.`;
  }

  // 6. Blood Bank / Donation
  if (lower.includes('blood') || lower.includes('donor')) {
    const alerts = await executeTool('get_active_blood_alerts', {}, sessionContext);
    executedTools.push({ toolName: 'get_active_blood_alerts', result: alerts });
    const count = alerts.count || 0;
    return `HealthMS LifeShare operates a 100% voluntary, unpaid blood donor network under NBTC guidelines. Currently there are **${count} active shortage alerts** in our network hospitals. Donors aged 18–65 weighing ≥45 kg are warmly encouraged to donate.`;
  }

  // 7. General Conversational / Greetings / Jokes
  if (lower.includes('joke')) {
    return `Why did the doctor carry a red pen? In case they needed to draw blood! 😄\n\nHow can I help you with your health or hospital services today?`;
  }

  if (lower.includes('hello') || lower.includes('hi') || lower.includes('namaste')) {
    const greetingName = user?.name ? ` ${user.name}` : '';
    if (language === 'hi') {
      return `नमस्ते${greetingName}! मैं **HealthMS AI** हूँ। आप मुझसे कोई भी सामान्य स्वास्थ्य प्रश्न पूछ सकते हैं, डॉक्टरों की खोज कर सकते हैं, या अपॉइंटमेंट के बारे में जान सकते हैं। आज मैं आपकी क्या सहायता कर सकता हूँ?`;
    }
    return `Hello${greetingName}! I am **HealthMS AI**.\n\nI can answer general healthcare questions, guide you through your symptoms, find specialists, or help manage your appointments and health timeline.\n\nHow can I assist you today?`;
  }

  // 8. General Helpful Knowledge Assistant Answer
  return `I am **HealthMS AI**, your dedicated healthcare and hospital guide. You can ask me any general health questions (such as understanding conditions, symptoms, wellness tips, or medicines), search for available doctors by specialty, check OPD hours, or locate emergency care. Feel free to describe any symptoms or ask a question!`;
}

/**
 * Generate context-aware quick chips
 */
function generateQuickChips(message = '', toolCalls = [], role = 'visitor', isEmergency = false) {
  if (isEmergency) {
    return ['Call 108 Ambulance', 'Call 112 National Emergency', 'Find Nearest Emergency Room'];
  }

  const chips = [];
  const toolNames = toolCalls.map(t => t.toolName);

  if (toolNames.includes('search_doctors') || toolNames.includes('triage_symptoms')) {
    chips.push('Book an Appointment', 'Check Doctor Availability', 'Hospital OPD Timings');
  } else if (toolNames.includes('get_patient_context')) {
    chips.push('What should I do now?', 'Check my upcoming appointments', 'Review my medicines');
  } else {
    chips.push('Check my symptoms', 'Find a doctor', 'What should I do now?', 'Nearest hospital emergency', 'Blood availability');
  }

  return chips.slice(0, 4);
}

module.exports = {
  buildSystemPrompt,
  getGeminiToolsForRole,
  runAgentTurn,
  redactPII
};
