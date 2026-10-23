const ChatHistory = require('../models/ChatHistory');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const BloodUnit = require('../models/BloodUnit');
const axios = require('axios');

// Emergency keywords detection
const EMERGENCY_KEYWORDS = [
  'chest pain', 'heart attack', 'severe bleeding', 'unconscious', 'fainting',
  'stroke', 'cannot breathe', 'difficulty breathing', 'head injury',
  'severe burn', 'seizure', 'choking', 'anaphylaxis', 'poisoning', 'suicidal'
];

const checkIsEmergency = (text) => {
  const lower = text.toLowerCase();
  return EMERGENCY_KEYWORDS.some(kw => lower.includes(kw));
};

// Specialist recommendation from symptoms
const recommendSpecialist = (symptomsText) => {
  const text = symptomsText.toLowerCase();
  if (text.includes('heart') || text.includes('palpitations') || text.includes('hypertension') || text.includes('blood pressure')) {
    return { specialty: 'Cardiology', reason: 'Symptoms indicate cardiovascular review' };
  }
  if (text.includes('bone') || text.includes('fracture') || text.includes('joint') || text.includes('knee') || text.includes('back pain')) {
    return { specialty: 'Orthopedics', reason: 'Symptoms relate to musculoskeletal or joint concerns' };
  }
  if (text.includes('child') || text.includes('baby') || text.includes('infant') || text.includes('toddler')) {
    return { specialty: 'Pediatrics', reason: 'Specialized pediatric consultation recommended' };
  }
  if (text.includes('headache') || text.includes('dizziness') || text.includes('numbness') || text.includes('nerve')) {
    return { specialty: 'Neurology', reason: 'Neurological evaluation suggested' };
  }
  if (text.includes('stomach') || text.includes('acid') || text.includes('digestion') || text.includes('vomit') || text.includes('gastric')) {
    return { specialty: 'Gastroenterology', reason: 'Digestive tract examination recommended' };
  }
  if (text.includes('skin') || text.includes('rash') || text.includes('itching') || text.includes('acne')) {
    return { specialty: 'Dermatology', reason: 'Dermatological review suggested' };
  }
  return { specialty: 'General Medicine', reason: 'Comprehensive primary care checkup' };
};

// @route   POST /api/ai/chat
exports.chatWithAssistant = async (req, res, next) => {
  try {
    const { message, language = 'en' } = req.body;
    const userId = req.user ? req.user._id : null;

    if (!message) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }

    // 1. Safety Check: Emergency detection
    if (checkIsEmergency(message)) {
      const emergencyResponse = language === 'hi' 
        ? "🚨 **आपातकालीन चेतावनी**: आपके द्वारा बताए गए लक्षण आपातकालीन चिकित्सा स्थिति का संकेत दे सकते हैं। कृपया तुरंत नजदीकी अस्पताल के आपातकालीन कक्ष (ER) में जाएं या 108 / 112 पर कॉल करें।"
        : "🚨 **EMERGENCY MEDICAL ALERT**: Your message indicates potentially life-threatening emergency symptoms. Please immediately proceed to the nearest Hospital Emergency Room (ER) or call Ambulance Emergency 108 / 112.";

      return res.json({
        success: true,
        isEmergency: true,
        reply: emergencyResponse,
        quickChips: ['Call 108 Emergency', 'Find Nearest Emergency Room', 'Speak to Receptionist']
      });
    }

    let reply = '';
    let toolResult = null;
    const lower = message.toLowerCase();

    // 2. Intelligent Tool Executions:
    if (lower.includes('my next appointment') || lower.includes('upcoming appointment') || lower.includes('booking status')) {
      if (userId) {
        const nextAppt = await Appointment.findOne({
          patientId: userId,
          status: { $in: ['scheduled', 'checked_in', 'called'] }
        }).populate('doctorId').populate('hospitalId');

        if (nextAppt) {
          reply = `You have an upcoming appointment on **${nextAppt.date}** at **${nextAppt.timeSlot}** with Token **#${nextAppt.tokenNumber}** (${nextAppt.tokenCode}) at ${nextAppt.hospitalId?.name || 'SmartCare Hospital'}. Current status: **${nextAppt.status}**.`;
          toolResult = { type: 'appointment', data: nextAppt };
        } else {
          reply = "You don't have any upcoming appointments right now. Would you like me to help you find a doctor and book a slot?";
        }
      } else {
        reply = "Please log in to view your upcoming appointments and live token tracking.";
      }
    } else if (lower.includes('queue') || lower.includes('waiting time') || lower.includes('token position')) {
      reply = "In SmartCare, your queue position is updated in real time. We calculate your estimated turn using a rolling average of actual doctor consultation times, plus travel time alerts so you only leave when necessary!";
      toolResult = { type: 'queue_info' };
    } else if (lower.includes('blood') && (lower.includes('available') || lower.includes('stock') || lower.includes('inventory'))) {
      const available = await BloodUnit.aggregate([
        { $match: { status: 'available' } },
        { $group: { _id: '$bloodGroup', count: { $sum: 1 } } }
      ]);
      const summaryList = available.map(a => `${a._id}: ${a.count} units`).join(', ');
      reply = `Here is the current live blood availability across SmartCare Network Blood Banks:\n\n${summaryList || 'Units are being updated.'}\n\nAll units are voluntary, unpaid donations screened under NBTC guidelines.`;
      toolResult = { type: 'blood_stock', data: available };
    } else if (lower.includes('eligible') && lower.includes('donate')) {
      reply = "To donate voluntary blood: You must be 18–65 years old, weigh at least 45 kg, and maintain a gap of **90 days for men** or **120 days for women** since your last donation. Voluntary donors earn milestone recognition badges, downloadable certificates, and qualify their families for Donor Family Fast-Track blood access!";
      toolResult = { type: 'donor_eligibility' };
    } else if (lower.includes('fast-track') || lower.includes('fast track') || lower.includes('recognition') || lower.includes('badge')) {
      reply = "Under **SmartCare LifeShare Donor Family Fast-Track**, active voluntary donors and their verified linked family members receive waived blood bank processing fees (₹0), exemption from replacement-donor requirements, and pre-verified paperwork during crisis. All blood allocation strictly follows clinical urgency.";
    } else if (lower.includes('symptom') || lower.includes('pain') || lower.includes('doctor for') || lower.includes('specialist')) {
      const rec = recommendSpecialist(message);
      const doctors = await Doctor.find({ specialty: rec.specialty }).populate('userId', 'name').limit(2);
      const doctorNames = doctors.map(d => `Dr. ${d.userId?.name}`).join(', ');
      reply = `Based on your description, I suggest consulting a specialist in **${rec.specialty}** (${rec.reason}). Top available specialists at SmartCare: ${doctorNames || 'General Physician'}. Would you like to book an appointment?`;
      toolResult = { type: 'specialist_recommendation', specialty: rec.specialty };
    } else {
      // 3. Optional Gemini API Proxy if Key is provided
      if (process.env.GEMINI_API_KEY) {
        try {
          const geminiPrompt = `You are "SmartCare Assistant", an empathetic, professional AI clinical concierge for SmartCare Hospital System.
System Scope:
- Answer patient inquiries about doctor specialties, hospital appointments, live queue tokens, and the LifeShare Voluntary Blood Donor program.
- ALWAYS include a brief disclaimer that you provide healthcare guidance, NOT a definitive medical diagnosis.
- Language: Reply in ${language === 'hi' ? 'Hindi' : 'English'}.
User Message: "${message}"`;

          const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
              contents: [{ parts: [{ text: geminiPrompt }] }]
            },
            { headers: { 'Content-Type': 'application/json' }, timeout: 8000 }
          );

          reply = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        } catch (geminiErr) {
          console.warn('[Gemini Proxy Fallback]:', geminiErr.message);
        }
      }

      if (!reply) {
        reply = language === 'hi'
          ? "नमस्ते! मैं स्मार्टकेयर सहायक हूँ। मैं आपको डॉक्टर खोजने, अप्वाइंटमेंट बुक करने, लाइव टोकन देखने और लाइफशेयर रक्तदान में मदद कर सकता हूँ।\n\n*सूचना: मैं चिकित्सीय सलाह नहीं देता, आपात स्थिति में तुरंत डॉक्टर से संपर्क करें।* "
          : "Hello! I am your SmartCare Assistant. I can help guide you to the right specialist, check your live queue token, explain report parameters, or help you participate in the LifeShare Voluntary Blood Donor program.\n\n*Disclaimer: I provide clinical navigation and guidance, not a medical diagnosis. Please consult our doctors for clinical treatment.*";
      }
    }

    // Store in ChatHistory if logged in
    if (userId) {
      await ChatHistory.findOneAndUpdate(
        { userId },
        {
          $push: {
            messages: [
              { sender: 'user', text: message, isEmergency: false },
              { sender: 'assistant', text: reply, isEmergency: false, toolCalls: toolResult ? [toolResult] : [] }
            ]
          }
        },
        { upsert: true, new: true }
      );
    }

    const quickChips = [
      'My Next Appointment',
      'Check Live Queue Status',
      'Blood Availability',
      'Am I Eligible to Donate?',
      'Community Card Perks'
    ];

    res.json({
      success: true,
      reply,
      isEmergency: false,
      toolResult,
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
