const ChatHistory = require('../models/ChatHistory');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const BloodUnit = require('../models/BloodUnit');
const HealthRecord = require('../models/HealthRecord');
const MedicalReport = require('../models/MedicalReport');
const User = require('../models/User');
const axios = require('axios');

// Emergency keywords detection
const EMERGENCY_KEYWORDS = [
  'chest pain', 'heart attack', 'severe bleeding', 'unconscious', 'fainting',
  'stroke', 'cannot breathe', 'difficulty breathing', 'severe shortness of breath',
  'head injury', 'severe burn', 'seizure', 'choking', 'anaphylaxis', 'poisoning', 'suicidal'
];

const checkIsEmergency = (text) => {
  const lower = (text || '').toLowerCase();
  return EMERGENCY_KEYWORDS.some(kw => lower.includes(kw));
};

// Specialist recommendation from symptoms
const recommendSpecialist = (symptomsText, existingConditions = []) => {
  const text = (symptomsText || '').toLowerCase();
  const condStr = existingConditions.join(' ').toLowerCase();

  if (text.includes('heart') || text.includes('palpitations') || text.includes('hypertension') || text.includes('blood pressure') || condStr.includes('hypertension')) {
    return { specialty: 'Cardiology', reason: 'Cardiovascular assessment suggested based on symptoms and cardiovascular history' };
  }
  if (text.includes('breath') || text.includes('wheez') || text.includes('cough') || text.includes('asthma') || condStr.includes('asthma')) {
    return { specialty: 'General Medicine', subSpecialty: 'Pulmonology', reason: 'Respiratory evaluation recommended for airway and lung symptoms' };
  }
  if (text.includes('bone') || text.includes('fracture') || text.includes('joint') || text.includes('knee') || text.includes('back pain') || text.includes('sprain')) {
    return { specialty: 'Orthopedics', reason: 'Musculoskeletal and joint examination suggested' };
  }
  if (text.includes('child') || text.includes('baby') || text.includes('infant') || text.includes('toddler')) {
    return { specialty: 'Pediatrics', reason: 'Specialized pediatric consultation recommended' };
  }
  if (text.includes('headache') || text.includes('dizziness') || text.includes('numbness') || text.includes('nerve') || text.includes('migraine')) {
    return { specialty: 'Neurology', reason: 'Neurological evaluation suggested' };
  }
  if (text.includes('stomach') || text.includes('acid') || text.includes('digestion') || text.includes('vomit') || text.includes('gastric') || text.includes('abdomen')) {
    return { specialty: 'Gastroenterology', reason: 'Digestive tract examination recommended' };
  }
  if (text.includes('skin') || text.includes('rash') || text.includes('itching') || text.includes('acne') || text.includes('allergy')) {
    return { specialty: 'Dermatology', reason: 'Dermatological and allergic skin review suggested' };
  }
  return { specialty: 'General Medicine', reason: 'Comprehensive primary care checkup' };
};

// @route   GET /api/ai/patient-context
// @desc    Retrieve patient health profile, allergies, chronic conditions, and active meds for the customized chatbot
exports.getPatientContext = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('name gender dateOfBirth patientHealth');
    if (!user) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const birthYear = user.dateOfBirth ? new Date(user.dateOfBirth).getFullYear() : null;
    const age = birthYear ? new Date().getFullYear() - birthYear : null;

    const [recentRecords, recentReports] = await Promise.all([
      HealthRecord.find({ patientId: user._id })
        .sort({ date: -1 })
        .limit(3)
        .select('title type date metadata.diagnosis metadata.medicines'),
      MedicalReport.find({ patientId: user._id })
        .sort({ reportDate: -1 })
        .limit(3)
        .select('title reportType reportDate issuingFacility notes aiSummaryCache')
    ]);

    const suggestedSymptomChips = [
      'Shortness of breath / Wheezing',
      'Persistent dry cough',
      'High Blood Pressure check',
      'Headache & Dizziness',
      'Chest tightness / Discomfort',
      'Joint or back pain',
      'Skin rash or itching',
      'Check active medication safety'
    ];

    res.json({
      success: true,
      patient: {
        id: user._id,
        name: user.name,
        gender: user.gender,
        age,
        bloodGroup: user.patientHealth?.bloodGroup || 'Not recorded',
        allergies: user.patientHealth?.allergies || [],
        conditions: user.patientHealth?.existingConditions || [],
        currentMedicines: user.patientHealth?.currentMedicines || [],
        pastSurgeries: user.patientHealth?.pastSurgeries || []
      },
      recentRecords,
      recentReports,
      suggestedSymptomChips
    });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/ai/chat
// @desc    Customized patient chatbot that evaluates past records + current symptoms
exports.chatWithAssistant = async (req, res, next) => {
  try {
    const { message, currentSymptoms, language = 'en' } = req.body;
    const user = req.user || null;
    const userId = user ? user._id : null;

    if (!message && (!currentSymptoms || currentSymptoms.length === 0)) {
      return res.status(400).json({ error: 'Please enter a message or select current symptoms' });
    }

    const combinedInput = `${message || ''} ${Array.isArray(currentSymptoms) ? currentSymptoms.join(', ') : (currentSymptoms || '')}`.trim();

    // 1. Safety Check: Emergency detection
    if (checkIsEmergency(combinedInput)) {
      const emergencyResponse = language === 'hi'
        ? "🚨 **आपातकालीन चेतावनी (Red Alert)**: आपके द्वारा बताए गए लक्षण आपातकालीन चिकित्सा स्थिति का संकेत दे सकते हैं।\n\n- कृपया तुरंत नजदीकी अस्पताल के आपातकालीन कक्ष (ER) में जाएं।\n- तत्काल एम्बुलेंस के लिए **108** या राष्ट्रीय आपातकालीन नंबर **112** पर कॉल करें।\n- किसी भी देरी के बिना आपातकालीन चिकित्सक से मिलें।"
        : "🚨 **EMERGENCY MEDICAL ALERT (Red Alert)**: Your reported symptoms indicate a potentially life-threatening medical emergency.\n\n- Please proceed immediately to the nearest Hospital Emergency Room (ER).\n- Call Ambulance Emergency at **108** or National Emergency at **112** immediately.\n- Do not wait or delay in seeking immediate medical intervention.";

      return res.json({
        success: true,
        isEmergency: true,
        reply: emergencyResponse,
        quickChips: ['Call 108 Ambulance', 'Find Nearest Emergency Room', 'Hospital ER Triage Desk']
      });
    }

    // 2. Load Patient's Longitudinal Medical Dossier (if authenticated)
    let patientDossier = null;
    let recentRecords = [];
    let recentReports = [];

    if (user) {
      const dbUser = await User.findById(user._id);
      const birthYear = dbUser.dateOfBirth ? new Date(dbUser.dateOfBirth).getFullYear() : null;
      const age = birthYear ? new Date().getFullYear() - birthYear : null;

      [recentRecords, recentReports] = await Promise.all([
        HealthRecord.find({ patientId: user._id })
          .sort({ date: -1 })
          .limit(4)
          .select('title type date metadata.diagnosis metadata.medicines metadata.labValues'),
        MedicalReport.find({ patientId: user._id })
          .sort({ reportDate: -1 })
          .limit(4)
          .select('title reportType reportDate issuingFacility notes aiSummaryCache')
      ]);

      patientDossier = {
        name: dbUser.name,
        gender: dbUser.gender || 'Not specified',
        age: age ? `${age} years old` : 'Age not provided',
        bloodGroup: dbUser.patientHealth?.bloodGroup || 'Not specified',
        allergies: dbUser.patientHealth?.allergies || [],
        existingConditions: dbUser.patientHealth?.existingConditions || [],
        currentMedicines: dbUser.patientHealth?.currentMedicines || [],
        pastSurgeries: dbUser.patientHealth?.pastSurgeries || [],
        recentDiagnoses: recentRecords.map(r => r.metadata?.diagnosis || r.title).filter(Boolean),
        recentReports: recentReports.map(rep => `${rep.title} (${rep.reportType})`).filter(Boolean)
      };
    }

    let reply = '';
    let toolResult = null;
    let allergyAlerts = [];
    let conditionInsights = [];
    const lower = combinedInput.toLowerCase();

    // 3. Check for specific built-in tools (Appointment, Queue, Blood Stock)
    if (lower.includes('my next appointment') || lower.includes('upcoming appointment') || lower.includes('booking status')) {
      if (userId) {
        const nextAppt = await Appointment.findOne({
          patientId: userId,
          status: { $in: ['scheduled', 'checked_in', 'called'] }
        }).populate('doctorId').populate('hospitalId');

        if (nextAppt) {
          reply = `You have an upcoming appointment on **${nextAppt.date}** at **${nextAppt.timeSlot}** with Token **#${nextAppt.tokenNumber}** (${nextAppt.tokenCode}) at **${nextAppt.hospitalId?.name || 'HealthMS Hospital'}**. Current status: **${nextAppt.status}**.`;
          toolResult = { type: 'appointment', data: nextAppt };
        } else {
          reply = "You don't have any upcoming appointments scheduled right now. Would you like me to help you find an available doctor?";
        }
      } else {
        reply = "Please sign in to view your upcoming appointments and live queue token tracking.";
      }
    } else if (lower.includes('queue') || lower.includes('waiting time') || lower.includes('token position')) {
      reply = "In HealthMS, your queue position is updated in real time using actual doctor consultation completion times (Tavg rolling calculation) and traffic-aware leave-now arrival alerts.";
      toolResult = { type: 'queue_info' };
    } else if (lower.includes('blood') && (lower.includes('available') || lower.includes('stock') || lower.includes('inventory'))) {
      const available = await BloodUnit.aggregate([
        { $match: { status: 'available' } },
        { $group: { _id: '$bloodGroup', count: { $sum: 1 } } }
      ]);
      const summaryList = available.map(a => `${a._id}: ${a.count} units`).join(', ');
      reply = `Here is the current live blood availability across HealthMS Network Blood Banks:\n\n${summaryList || 'Units are being updated.'}\n\nAll units are voluntary, unpaid donations screened under NBTC guidelines.`;
      toolResult = { type: 'blood_stock', data: available };
    } else if (lower.includes('eligible') && lower.includes('donate')) {
      reply = "To donate voluntary blood: You must be 18–65 years old, weigh at least 45 kg, and maintain a gap of **90 days for men** or **120 days for women** since your last donation. Voluntary donors earn milestone recognition badges, downloadable certificates, and qualify their families for Donor Family Fast-Track blood access!";
      toolResult = { type: 'donor_eligibility' };
    }

    // 4. Clinical Cross-Reference: Correlate Past Record + Current Symptoms
    if (!reply && patientDossier) {
      // (a) Allergy Warnings Check
      if (patientDossier.allergies && patientDossier.allergies.length > 0) {
        patientDossier.allergies.forEach(allergy => {
          const allgLower = allergy.toLowerCase();
          if (lower.includes('antibiotic') || lower.includes('infection') || lower.includes('penicillin') || lower.includes('medicine') || lower.includes('amoxicillin')) {
            if (allgLower.includes('penicillin')) {
              allergyAlerts.push(`⚠️ Critical Allergy Alert: You have a documented allergy to Penicillin. Do NOT take Penicillin, Amoxicillin, or related beta-lactam antibiotics.`);
            } else {
              allergyAlerts.push(`⚠️ Documented Allergy Alert: You are allergic to ${allergy}. Always verify cross-reactivity before starting any new medication.`);
            }
          }
        });
      }

      // (b) Chronic Condition Correlation Check
      const conditions = patientDossier.existingConditions || [];
      conditions.forEach(cond => {
        const cLower = cond.toLowerCase();
        if (cLower.includes('asthma') && (lower.includes('breath') || lower.includes('cough') || lower.includes('wheez') || lower.includes('chest') || lower.includes('cold'))) {
          conditionInsights.push(`🫁 Asthma Correlation: With your documented history of ${cond}, respiratory symptoms like cough or wheezing require vigilant monitoring. Keep your prescribed rescue inhaler on hand and avoid cold/pollutants.`);
        }
        if (cLower.includes('hypertension') && (lower.includes('headache') || lower.includes('dizz') || lower.includes('pressure') || lower.includes('heart') || lower.includes('palpitat'))) {
          conditionInsights.push(`🩺 Hypertension Correlation: Given your documented history of ${cond}, headaches or dizziness can signal blood pressure variability. We recommend checking your BP today.`);
        }
        if (cLower.includes('diabet') && (lower.includes('thirst') || lower.includes('fatigue') || lower.includes('sugar') || lower.includes('urin'))) {
          conditionInsights.push(`🩸 Diabetes Correlation: With your history of ${cond}, excessive thirst or sudden fatigue may indicate glycemic fluctuations.`);
        }
      });
    }

    // 5. Specialist Recommendation & Doctor Search
    const rec = recommendSpecialist(combinedInput, patientDossier?.existingConditions || []);
    let recommendedDoctors = [];
    try {
      const docs = await Doctor.find({ specialty: rec.specialty })
        .populate('userId', 'name')
        .populate('hospitalId', 'name')
        .limit(2);

      recommendedDoctors = docs.map(d => ({
        id: d._id,
        name: d.userId?.name ? `Dr. ${d.userId.name}` : 'Specialist Doctor',
        specialty: d.specialty,
        roomNumber: d.roomNumber,
        consultationFee: d.consultationFee,
        hospitalName: d.hospitalId?.name || 'HealthMS Hospital',
        isAvailableToday: d.isAvailableToday
      }));
    } catch (e) {
      console.warn('Doctor fetch warning:', e.message);
    }

    // 6. Gemini Clinical AI Generation (with Complete Patient History & Symptoms Prompt)
    if (!reply && process.env.GEMINI_API_KEY) {
      try {
        let promptContext = `You are "HealthMS Clinical Concierge AI", an empathetic, highly knowledgeable medical assistant for HealthMS Hospital System.
Your job is to provide personalized healthcare guidance to the patient by strictly taking into account their PAST MEDICAL RECORDS and CURRENT SYMPTOMS.

Patient Profile Dossier:
- Name: ${patientDossier?.name || 'Valued Patient'}
- Age & Gender: ${patientDossier?.age || 'Unspecified'}, ${patientDossier?.gender || 'Unspecified'}
- Blood Group: ${patientDossier?.bloodGroup || 'Unspecified'}
- Documented Allergies: ${patientDossier?.allergies?.length ? patientDossier.allergies.join(', ') : 'None documented'}
- Documented Chronic Conditions: ${patientDossier?.existingConditions?.length ? patientDossier.existingConditions.join(', ') : 'None documented'}
- Active Medications: ${patientDossier?.currentMedicines?.length ? patientDossier.currentMedicines.map(m => `${m.name} (${m.dosage || ''} ${m.frequency || ''})`).join(', ') : 'None documented'}
- Past Diagnoses & Health Records: ${patientDossier?.recentDiagnoses?.length ? patientDossier.recentDiagnoses.join('; ') : 'No prior records'}
- Recent Lab & Medical Reports: ${patientDossier?.recentReports?.length ? patientDossier.recentReports.join('; ') : 'No prior uploaded reports'}

Current Patient Message / Symptoms:
"${combinedInput}"

Clinical Response Instructions:
1. Address the patient personally and empathetically by name.
2. Direct Correlation: Specifically explain how their current symptoms relate to their past medical records (e.g., chronic conditions like ${patientDossier?.existingConditions?.join(', ') || 'their medical background'}, past lab reports, or current medications).
3. Drug & Allergy Safeguards: Explicitly warn if any suggested care or common treatments conflict with their documented allergies (${patientDossier?.allergies?.join(', ') || 'none'}).
4. Current Medication Check: Comment on their current medicines (${patientDossier?.currentMedicines?.map(m => m.name).join(', ') || 'none'}) and advise on adherence or interactions.
5. Recommend Specialist: Suggest a consultation in ${rec.specialty} (${rec.reason}).
6. Mandatory Disclaimer: Always note that this is personalized clinical navigation and AI triage, NOT a definitive diagnosis.
7. Language: ${language === 'hi' ? 'Respond in fluent, clear Hindi (हिन्दी)' : (language === 'bn' ? 'Respond in fluent Bengali (বাংলা)' : 'Respond in professional, caring English')}.`;

        const response = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
          {
            contents: [{ parts: [{ text: promptContext }] }]
          },
          { headers: { 'Content-Type': 'application/json' }, timeout: 8000 }
        );

        reply = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      } catch (geminiErr) {
        console.warn('[Gemini Clinical Proxy Fallback]:', geminiErr.message);
      }
    }

    // 7. Deterministic Personalized Fallback if Gemini offline or unconfigured
    if (!reply) {
      const patientName = patientDossier?.name ? `${patientDossier.name}` : 'Patient';
      const allergyText = allergyAlerts.length > 0 ? `\n\n${allergyAlerts.join('\n')}` : '';
      const conditionText = conditionInsights.length > 0 ? `\n\n${conditionInsights.join('\n')}` : '';
      const medsList = patientDossier?.currentMedicines?.map(m => `${m.name} ${m.dosage || ''}`).join(', ');
      const medsText = medsList ? `\n\n💊 **Active Medications**: You are currently prescribed ${medsList}. Please do not alter dosages without your doctor's confirmation.` : '';
      const docRecommendation = recommendedDoctors.length > 0
        ? `\n\n🩺 **Recommended Specialist**: Based on your symptoms and history, we suggest consulting **${rec.specialty}** (${rec.reason}). Available specialists: ${recommendedDoctors.map(d => `${d.name} (${d.hospitalName}, Room ${d.roomNumber})`).join(' and ')}.`
        : `\n\n🩺 **Recommended Specialist**: We recommend a checkup with a **${rec.specialty}** specialist (${rec.reason}).`;

      if (language === 'hi') {
        reply = `नमस्ते **${patientName}**! आपके पिछले स्वास्थ्य रिकॉर्ड और वर्तमान लक्षणों के आधार पर:\n\n` +
          (conditionInsights.length > 0 ? conditionInsights.join('\n') + '\n\n' : '') +
          (allergyAlerts.length > 0 ? allergyAlerts.join('\n') + '\n\n' : '') +
          `आपके बताए गए लक्षणों के लिए **${rec.specialty}** विशेषज्ञ से परामर्श की सलाह दी जाती है।` +
          `\n\n*सूचना: यह व्यक्तिगत स्वास्थ्य मार्गदर्शन है, अंतिम चिकित्सीय निदान नहीं। कृपया उपचार हेतु चिकित्सक से मिलें।*`;
      } else {
        reply = `Hello **${patientName}**, I have analyzed your query against your documented health profile:\n` +
          conditionText +
          allergyText +
          medsText +
          docRecommendation +
          `\n\n*Clinical Disclaimer: This response is personalized healthcare navigation based on your records, not a definitive diagnosis. Please consult our attending physician for formal treatment.*`;
      }
    }

    // 8. Save Conversation to ChatHistory
    if (userId) {
      await ChatHistory.findOneAndUpdate(
        { userId },
        {
          $push: {
            messages: [
              { sender: 'user', text: combinedInput, isEmergency: false },
              {
                sender: 'assistant',
                text: reply,
                isEmergency: false,
                toolCalls: toolResult ? [toolResult] : (recommendedDoctors.length ? [{ type: 'doctor_recommendation', doctors: recommendedDoctors }] : [])
              }
            ]
          }
        },
        { upsert: true, new: true }
      );
    }

    // Context summary for frontend badges
    const patientContextSummary = patientDossier ? {
      name: patientDossier.name,
      bloodGroup: patientDossier.bloodGroup,
      allergies: patientDossier.allergies,
      conditions: patientDossier.existingConditions,
      medicinesCount: patientDossier.currentMedicines?.length || 0
    } : null;

    const quickChips = [
      recommendedDoctors[0] ? `Book ${recommendedDoctors[0].name}` : 'Book Doctor Appointment',
      'My Next Appointment',
      'Check Live Queue Status',
      'Blood Availability',
      'Review Active Medications'
    ];

    res.json({
      success: true,
      reply,
      isEmergency: false,
      patientContextSummary,
      allergyAlerts,
      conditionInsights,
      recommendedSpecialty: rec.specialty,
      recommendedDoctors,
      toolResult: toolResult || (recommendedDoctors.length ? { type: 'specialist_recommendation', doctors: recommendedDoctors } : null),
      quickChips
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/ai/history
exports.getChatHistory = async (req, res, next) => {
  try {
    const history = await ChatHistory.findOne({ userId: req.user._id });
    res.json({ success: true, messages: history?.messages || [] });
  } catch (error) {
    next(error);
  }
};
