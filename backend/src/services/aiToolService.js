const mongoose = require('mongoose');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const HealthRecord = require('../models/HealthRecord');
const MedicalReport = require('../models/MedicalReport');
const MedicineRecord = require('../models/MedicineRecord');
const Hospital = require('../models/Hospital');
const BloodAlert = require('../models/BloodAlert');
const BloodUnit = require('../models/BloodUnit');
const Donor = require('../models/Donor');
const QRCode = require('qrcode');
const { getDoctorRollingAverage } = require('../services/waitEngine');
const { sendNotification } = require('../services/notificationService');
const { logAudit } = require('../middleware/auditMiddleware');

// Haversine distance formula in kilometers
function getHaversineDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// Red-flag emergency symptoms check
const RED_FLAG_SYMPTOMS = [
  'chest pain', 'heart attack', 'severe bleeding', 'unconscious', 'fainting',
  'stroke', 'cannot breathe', 'difficulty breathing', 'severe shortness of breath',
  'head injury', 'severe burn', 'seizure', 'choking', 'anaphylaxis', 'poisoning',
  'suicidal', 'self harm', 'loss of consciousness', 'severe allergic reaction',
  'pregnancy bleeding', 'infant high fever'
];

function checkRedFlags(text = '') {
  const lower = text.toLowerCase();
  for (const flag of RED_FLAG_SYMPTOMS) {
    if (lower.includes(flag)) {
      return { isRedFlag: true, matchedFlag: flag };
    }
  }
  return { isRedFlag: false, matchedFlag: null };
}

// Age calculator helper
function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (isNaN(dob.getTime())) return null;
  const diffMs = Date.now() - dob.getTime();
  const ageDate = new Date(diffMs);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
}

/**
 * Tool Registry Implementation
 * Always executes using the verified session context (user, role, ipAddress)
 */
const toolDefinitions = [
  {
    name: 'get_patient_context',
    description: 'Returns the authenticated patient\'s age, gender, blood group, allergies, existing chronic conditions, active medicines, and recent health timeline summary.',
    parameters: {
      type: 'OBJECT',
      properties: {},
      required: []
    },
    roles: ['patient']
  },
  {
    name: 'get_health_timeline',
    description: 'Fetches recent records from the patient\'s Health Timeline including prescriptions, reports, checkups, and follow-ups.',
    parameters: {
      type: 'OBJECT',
      properties: {
        range: { type: 'STRING', description: 'Filter range: e.g. "recent", "1month", "6months", "all"' },
        type: { type: 'STRING', description: 'Record type: "all", "prescription", "lab_report", "discharge_summary", "doctor_note"' }
      },
      required: []
    },
    roles: ['patient']
  },
  {
    name: 'get_upcoming_appointments',
    description: 'Retrieves upcoming scheduled appointments for the logged-in patient with token number and status.',
    parameters: {
      type: 'OBJECT',
      properties: {},
      required: []
    },
    roles: ['patient']
  },
  {
    name: 'get_queue_status',
    description: 'Checks the real-time live queue position and estimated waiting time for an appointment.',
    parameters: {
      type: 'OBJECT',
      properties: {
        appointmentId: { type: 'STRING', description: 'Optional specific appointment ID. If omitted, checks the next upcoming appointment.' }
      },
      required: []
    },
    roles: ['patient']
  },
  {
    name: 'search_doctors',
    description: 'Search available hospital doctors by medical specialty, hospital, language, or availability.',
    parameters: {
      type: 'OBJECT',
      properties: {
        specialty: { type: 'STRING', description: 'e.g. "Cardiology", "Pediatrics", "Dermatology", "General Medicine", "Orthopedics", "Neurology"' },
        hospital: { type: 'STRING', description: 'Hospital name or city' },
        language: { type: 'STRING', description: 'Preferred consultation language, e.g. "Hindi", "English"' },
        availability: { type: 'STRING', description: 'e.g. "today", "tomorrow", "this_week"' },
        date: { type: 'STRING', description: 'Target date in YYYY-MM-DD' }
      },
      required: []
    },
    roles: ['patient', 'visitor', 'doctor', 'blood_bank_officer', 'hospital_admin', 'admin']
  },
  {
    name: 'get_doctor_profile',
    description: 'Returns qualifications, experience, languages, fee, and schedule for a specific doctor.',
    parameters: {
      type: 'OBJECT',
      properties: {
        doctorId: { type: 'STRING', description: 'Doctor ID' }
      },
      required: ['doctorId']
    },
    roles: ['patient', 'visitor', 'doctor', 'blood_bank_officer', 'hospital_admin', 'admin']
  },
  {
    name: 'check_availability',
    description: 'Checks available appointment time slots for a given doctor on a specific date.',
    parameters: {
      type: 'OBJECT',
      properties: {
        doctorId: { type: 'STRING', description: 'Doctor ID' },
        date: { type: 'STRING', description: 'Date in YYYY-MM-DD format' }
      },
      required: ['doctorId']
    },
    roles: ['patient', 'visitor']
  },
  {
    name: 'get_nearby_hospitals',
    description: 'Finds the nearest hospitals with 24x7 emergency facilities and ER wait times based on coordinates or city.',
    parameters: {
      type: 'OBJECT',
      properties: {
        lat: { type: 'NUMBER', description: 'User latitude' },
        lng: { type: 'NUMBER', description: 'User longitude' },
        specialty: { type: 'STRING', description: 'Optional specialty required' }
      },
      required: []
    },
    roles: ['patient', 'visitor', 'doctor', 'blood_bank_officer', 'hospital_admin', 'admin']
  },
  {
    name: 'prepare_booking',
    description: 'Prepares an appointment booking request. This is a WRITE action that will NEVER execute silently; it returns a confirmation payload for explicit user approval in the UI.',
    parameters: {
      type: 'OBJECT',
      properties: {
        doctorId: { type: 'STRING', description: 'Doctor ID to book with' },
        date: { type: 'STRING', description: 'Date in YYYY-MM-DD format' },
        timeSlot: { type: 'STRING', description: 'Slot time, e.g. "10:00 - 10:15"' },
        bookedForFamilyMember: { type: 'STRING', description: 'Optional name of linked family member' },
        symptoms: { type: 'STRING', description: 'Brief symptom reason for visit' }
      },
      required: ['doctorId', 'date']
    },
    roles: ['patient']
  },
  {
    name: 'list_my_medicines',
    description: 'Returns the patient\'s saved medicines list from their profile (currently taking, as-needed, and stopped).',
    parameters: {
      type: 'OBJECT',
      properties: {},
      required: []
    },
    roles: ['patient']
  },
  {
    name: 'list_my_reports',
    description: 'Lists the patient\'s uploaded medical reports (lab tests, scans, discharge summaries).',
    parameters: {
      type: 'OBJECT',
      properties: {},
      required: []
    },
    roles: ['patient']
  },
  {
    name: 'explain_my_report',
    description: 'Provides a plain-language explanation of one of the patient\'s own medical reports, with mandatory physician discussion advice.',
    parameters: {
      type: 'OBJECT',
      properties: {
        reportId: { type: 'STRING', description: 'The ID of the report to explain' }
      },
      required: ['reportId']
    },
    roles: ['patient']
  },
  {
    name: 'get_active_blood_alerts',
    description: 'Lists live urgent blood shortage alerts across the SmartCare hospital network.',
    parameters: {
      type: 'OBJECT',
      properties: {},
      required: []
    },
    roles: ['patient', 'visitor', 'doctor', 'blood_bank_officer', 'hospital_admin', 'admin']
  },
  {
    name: 'check_my_donor_eligibility',
    description: 'Checks voluntary unpaid blood donation eligibility, last donation date, and countdown to next eligible donation.',
    parameters: {
      type: 'OBJECT',
      properties: {},
      required: []
    },
    roles: ['patient']
  },
  {
    name: 'triage_symptoms',
    description: 'Assesses patient symptoms, checks clinical red-flag emergencies, and maps symptoms to suitable medical specialties considering age and medical background.',
    parameters: {
      type: 'OBJECT',
      properties: {
        symptoms: { type: 'STRING', description: 'Description of symptoms' },
        durationDays: { type: 'NUMBER', description: 'How many days the symptoms have lasted' },
        severity: { type: 'STRING', description: 'mild, moderate, or severe' }
      },
      required: ['symptoms']
    },
    roles: ['patient', 'visitor']
  },
  {
    name: 'start_emergency_flow',
    description: 'Triggers the emergency response flow, displaying emergency numbers (108/112), nearest emergency hospitals, and rapid intake.',
    parameters: {
      type: 'OBJECT',
      properties: {
        reason: { type: 'STRING', description: 'Emergency condition or symptom reason' }
      },
      required: []
    },
    roles: ['patient', 'visitor', 'doctor', 'blood_bank_officer', 'hospital_admin', 'admin']
  },
  {
    name: 'get_hospital_info',
    description: 'Provides information about SmartCare hospital facilities, departments, visiting hours, and contact desks.',
    parameters: {
      type: 'OBJECT',
      properties: {
        hospitalIdOrName: { type: 'STRING', description: 'Hospital name or ID' }
      },
      required: []
    },
    roles: ['patient', 'visitor', 'doctor', 'blood_bank_officer', 'hospital_admin', 'admin']
  },
  {
    name: 'faq_search',
    description: 'Searches hospital FAQs regarding appointments, OPD registration, insurance, blood donation, and visiting rules.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING', description: 'The FAQ topic or question' }
      },
      required: ['query']
    },
    roles: ['patient', 'visitor']
  }
];

/**
 * Tool Executor Implementation
 */
async function executeTool(name, args = {}, sessionContext = {}) {
  const { user, role = 'visitor', ipAddress = '127.0.0.1' } = sessionContext;

  // Log tool call in audit trail (redacted, no raw PHI)
  try {
    await logAudit({
      userId: user?._id || null,
      userName: user?.name || 'Visitor',
      userRole: role,
      action: `AI_TOOL_CALL:${name}`,
      resourceType: 'AIToolCall',
      details: { toolName: name, args: Object.keys(args) },
      ipAddress
    });
  } catch (err) {
    // Audit log error shouldn't crash tool execution
  }

  // 1. get_patient_context
  if (name === 'get_patient_context') {
    if (!user) return { error: 'Please sign in to access personalized health records.' };
    
    // Check privacy consent toggle
    if (user.privacySettings?.useHealthDataInAssistant === false) {
      return {
        notice: 'Personal health data is disabled by user setting.',
        healthDataDisabled: true,
        patient: { name: user.name, role: user.role }
      };
    }

    let dbUser = user;
    let recentRecords = [];
    let recentReports = [];
    let medicinesCount = user.patientHealth?.currentMedicines?.length || 0;

    if (mongoose.connection.readyState === 1) {
      try {
        const fetched = await User.findById(user._id).select('name gender dateOfBirth patientHealth');
        if (fetched) dbUser = fetched;

        [recentRecords, recentReports, medicinesCount] = await Promise.all([
          HealthRecord.find({ patientId: user._id })
            .sort({ date: -1 })
            .limit(3)
            .select('title type date metadata.diagnosis'),
          MedicalReport.find({ patientId: user._id })
            .sort({ reportDate: -1 })
            .limit(3)
            .select('title reportType reportDate issuingFacility'),
          MedicineRecord.countDocuments({ patientId: user._id, status: 'currently_taking' })
        ]);
      } catch (err) {
        // Fallback to passed user object
      }
    }

    const age = calculateAge(dbUser?.dateOfBirth);

    return {
      age,
      gender: dbUser?.gender || 'Unspecified',
      bloodGroup: dbUser?.patientHealth?.bloodGroup || 'Not recorded',
      allergies: dbUser?.patientHealth?.allergies || [],
      existingConditions: dbUser?.patientHealth?.existingConditions || [],
      currentMedicinesCount: medicinesCount || dbUser?.patientHealth?.currentMedicines?.length || 0,
      activeMedicines: (dbUser?.patientHealth?.currentMedicines || []).map(m => m.name),
      recentTimelineSummary: recentRecords.map(r => ({
        title: r.title,
        type: r.type,
        date: r.date?.toISOString().split('T')[0]
      })),
      recentReports: recentReports.map(rep => ({
        title: rep.title,
        type: rep.reportType,
        facility: rep.issuingFacility,
        date: rep.reportDate?.toISOString().split('T')[0]
      }))
    };
  }

  // 2. get_health_timeline
  if (name === 'get_health_timeline') {
    if (!user) return { error: 'Authentication required' };
    if (user.privacySettings?.useHealthDataInAssistant === false) {
      return { notice: 'Health timeline access is disabled in your privacy settings.' };
    }

    let filter = { patientId: user._id };
    if (args.type && args.type !== 'all') {
      filter.type = args.type;
    }

    const records = await HealthRecord.find(filter)
      .sort({ date: -1 })
      .limit(6)
      .select('title type date metadata.diagnosis aiSummary');

    return {
      count: records.length,
      records: records.map(r => ({
        id: r._id,
        title: r.title,
        type: r.type,
        date: r.date?.toISOString().split('T')[0],
        diagnosis: r.metadata?.diagnosis || '',
        summary: r.aiSummary || ''
      }))
    };
  }

  // 3. get_upcoming_appointments
  if (name === 'get_upcoming_appointments') {
    if (!user) return { error: 'Please sign in to view your appointments.' };

    const appointments = await Appointment.find({
      patientId: user._id,
      status: { $in: ['scheduled', 'checked_in', 'called'] }
    })
      .populate('hospitalId', 'name city')
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name' }
      })
      .sort({ date: 1, timeSlot: 1 })
      .limit(3);

    return {
      count: appointments.length,
      appointments: appointments.map(a => ({
        id: a._id,
        doctorName: a.doctorId?.userId?.name ? `Dr. ${a.doctorId.userId.name}` : 'Specialist',
        specialty: a.doctorId?.specialty || 'General',
        hospital: a.hospitalId?.name || 'SmartCare Hospital',
        date: a.date,
        timeSlot: a.timeSlot,
        tokenCode: a.tokenCode,
        tokenNumber: a.tokenNumber,
        status: a.status
      }))
    };
  }

  // 4. get_queue_status
  if (name === 'get_queue_status') {
    if (!user) return { error: 'Please sign in to check queue status.' };

    let appt = null;
    if (args.appointmentId) {
      appt = await Appointment.findOne({ _id: args.appointmentId, patientId: user._id })
        .populate('hospitalId', 'name')
        .populate({ path: 'doctorId', populate: { path: 'userId', select: 'name' } });
    } else {
      const todayStr = new Date().toISOString().split('T')[0];
      appt = await Appointment.findOne({
        patientId: user._id,
        date: todayStr,
        status: { $in: ['scheduled', 'checked_in', 'called'] }
      })
        .populate('hospitalId', 'name')
        .populate({ path: 'doctorId', populate: { path: 'userId', select: 'name' } });
    }

    if (!appt) {
      return { message: 'No active queue token found for today. Would you like to schedule an appointment?' };
    }

    const doctorId = appt.doctorId?._id;
    const todayStr = appt.date;
    const currentQueue = await Appointment.find({
      doctorId,
      date: todayStr,
      status: { $in: ['checked_in', 'called', 'in_consultation'] }
    }).sort({ tokenNumber: 1 });

    const inConsultation = currentQueue.find(a => a.status === 'in_consultation');
    const waitingBefore = currentQueue.filter(a => a.tokenNumber < appt.tokenNumber && a.status !== 'completed');
    const avgMins = await getDoctorRollingAverage(doctorId, 10) || 12;

    return {
      appointmentId: appt._id,
      doctorName: appt.doctorId?.userId?.name ? `Dr. ${appt.doctorId.userId.name}` : 'Doctor',
      roomNumber: appt.doctorId?.roomNumber || 'OPD-101',
      hospitalName: appt.hospitalId?.name || 'SmartCare Hospital',
      yourToken: appt.tokenNumber,
      tokenCode: appt.tokenCode,
      currentServingToken: inConsultation ? inConsultation.tokenNumber : (currentQueue[0]?.tokenNumber || 'Queue opening soon'),
      patientsAhead: waitingBefore.length,
      estimatedWaitMinutes: waitingBefore.length * avgMins,
      status: appt.status
    };
  }

  // 5. search_doctors
  if (name === 'search_doctors') {
    let doctors = [];
    if (mongoose.connection.readyState === 1) {
      try {
        let query = {};
        if (args.specialty) {
          query.specialty = new RegExp(args.specialty.trim(), 'i');
        }
        if (args.language) {
          query.languages = { $in: [new RegExp(args.language.trim(), 'i')] };
        }

        doctors = await Doctor.find(query)
          .populate('userId', 'name')
          .populate('hospitalId', 'name city emergencyContact')
          .limit(3);

        if (doctors.length === 0 && args.specialty) {
          doctors = await Doctor.find({ specialty: /General/i })
            .populate('userId', 'name')
            .populate('hospitalId', 'name city')
            .limit(2);
        }
      } catch (err) {}
    }

    return {
      count: doctors.length,
      doctors: doctors.map(d => ({
        id: d._id,
        name: d.userId?.name ? `Dr. ${d.userId.name}` : 'Specialist',
        specialty: d.specialty,
        qualifications: d.qualifications?.map(q => q.degree).join(', ') || 'MBBS',
        experienceYears: d.experienceYears || 5,
        hospitalName: d.hospitalId?.name || 'SmartCare Hospital',
        roomNumber: d.roomNumber || 'OPD-1',
        consultationFee: d.consultationFee || 500,
        rating: d.rating || 4.8,
        languages: d.languages || ['English', 'Hindi'],
        liveStatus: d.liveStatus || 'available'
      }))
    };
  }

  // 6. get_doctor_profile
  if (name === 'get_doctor_profile') {
    const doc = await Doctor.findById(args.doctorId)
      .populate('userId', 'name')
      .populate('hospitalId', 'name city');
    if (!doc) return { error: 'Doctor not found' };

    return {
      id: doc._id,
      name: doc.userId?.name ? `Dr. ${doc.userId.name}` : 'Specialist',
      specialty: doc.specialty,
      bio: doc.bio || 'Experienced specialist serving at SmartCare Hospital.',
      qualifications: doc.qualifications || [],
      experienceYears: doc.experienceYears,
      languages: doc.languages,
      consultationFee: doc.consultationFee,
      roomNumber: doc.roomNumber,
      hospitalName: doc.hospitalId?.name,
      rating: doc.rating,
      reviewCount: doc.reviewCount
    };
  }

  // 7. check_availability
  if (name === 'check_availability') {
    const dateStr = args.date || new Date().toISOString().split('T')[0];
    const doc = await Doctor.findById(args.doctorId);
    if (!doc) return { error: 'Doctor not found' };

    // Standard OPD slots
    const standardSlots = [
      '09:00 - 09:15', '09:15 - 09:30', '09:30 - 09:45', '10:00 - 10:15',
      '10:30 - 10:45', '11:00 - 11:15', '11:30 - 11:45', '14:00 - 14:15',
      '14:30 - 14:45', '15:00 - 15:15', '15:30 - 15:45', '16:00 - 16:15'
    ];

    const booked = await Appointment.find({
      doctorId: args.doctorId,
      date: dateStr,
      status: { $nin: ['cancelled'] }
    }).select('timeSlot');

    const bookedSlots = booked.map(b => b.timeSlot);
    const availableSlots = standardSlots.filter(s => !bookedSlots.includes(s));

    return {
      doctorId: doc._id,
      date: dateStr,
      availableSlotsCount: availableSlots.length,
      slots: availableSlots.slice(0, 6)
    };
  }

  // 8. get_nearby_hospitals
  if (name === 'get_nearby_hospitals') {
    let hospitals = [];
    if (mongoose.connection.readyState === 1) {
      try {
        hospitals = await Hospital.find({ isActive: true, hasEmergencyDept: true })
          .select('name address city phone emergencyContact currentErWaitMinutes bedsCount');
      } catch (err) {}
    }

    let results = hospitals.map(h => {
      let distanceKm = null;
      if (args.lat && args.lng && h.address?.lat && h.address?.lng) {
        distanceKm = getHaversineDistance(args.lat, args.lng, h.address.lat, h.address.lng);
      }
      return {
        id: h._id,
        name: h.name,
        city: h.city || h.address?.city || 'Delhi',
        address: h.address?.street ? `${h.address.street}, ${h.address.city}` : (h.city || 'Delhi'),
        emergencyPhone: h.emergencyContact || '108',
        generalPhone: h.phone,
        erWaitMinutes: h.currentErWaitMinutes || 15,
        distanceKm: distanceKm !== null ? `${distanceKm} km` : 'Near City Center'
      };
    });

    if (args.lat && args.lng) {
      results.sort((a, b) => parseFloat(a.distanceKm) - parseFloat(b.distanceKm));
    }

    return {
      count: results.length,
      hospitals: results.slice(0, 4)
    };
  }

  // 9. prepare_booking (Write Action Gate - NEVER executes silently)
  if (name === 'prepare_booking') {
    if (!user) return { error: 'Please sign in to book an appointment.' };

    const doc = await Doctor.findById(args.doctorId).populate('userId', 'name').populate('hospitalId', 'name');
    if (!doc) return { error: 'Doctor not found' };

    const targetDate = args.date || new Date().toISOString().split('T')[0];
    const targetSlot = args.timeSlot || '10:00 - 10:15';

    // Verify slot is not already booked
    const existing = await Appointment.findOne({
      doctorId: doc._id,
      date: targetDate,
      timeSlot: targetSlot,
      status: { $nin: ['cancelled'] }
    });

    if (existing) {
      return {
        error: `Slot ${targetSlot} on ${targetDate} is already taken. Please choose another slot.`,
        slotTaken: true
      };
    }

    return {
      confirmationRequired: true,
      actionType: 'book_appointment',
      promptConfirmation: `Confirm booking with Dr. ${doc.userId?.name} on ${targetDate} at ${targetSlot}?`,
      details: {
        doctorId: doc._id,
        doctorName: doc.userId?.name ? `Dr. ${doc.userId.name}` : 'Specialist',
        specialty: doc.specialty,
        hospitalName: doc.hospitalId?.name || 'SmartCare Hospital',
        date: targetDate,
        timeSlot: targetSlot,
        fee: doc.consultationFee || 500,
        roomNumber: doc.roomNumber || 'OPD-101',
        bookedForFamilyMember: args.bookedForFamilyMember || ''
      }
    };
  }

  // 10. list_my_medicines
  if (name === 'list_my_medicines') {
    if (!user) return { error: 'Please sign in to view your medicines.' };
    if (user.privacySettings?.useHealthDataInAssistant === false) {
      return { notice: 'Health data access is disabled in your privacy settings.' };
    }

    const meds = await MedicineRecord.find({ patientId: user._id }).sort({ status: 1 });
    return {
      count: meds.length,
      medicines: meds.map(m => ({
        id: m._id,
        name: m.name,
        dosage: m.dosage || '1 unit',
        frequency: m.frequency || 'Daily',
        status: m.status,
        reason: m.reason || '',
        startDate: m.startDate ? m.startDate.toISOString().split('T')[0] : null
      }))
    };
  }

  // 11. list_my_reports
  if (name === 'list_my_reports') {
    if (!user) return { error: 'Please sign in to view your reports.' };
    if (user.privacySettings?.useHealthDataInAssistant === false) {
      return { notice: 'Health data access is disabled in your privacy settings.' };
    }

    const reports = await MedicalReport.find({ patientId: user._id })
      .sort({ reportDate: -1 })
      .limit(6)
      .select('title reportType reportDate issuingFacility notes');

    return {
      count: reports.length,
      reports: reports.map(r => ({
        id: r._id,
        title: r.title,
        type: r.reportType,
        facility: r.issuingFacility,
        date: r.reportDate?.toISOString().split('T')[0],
        notes: r.notes || ''
      }))
    };
  }

  // 12. explain_my_report
  if (name === 'explain_my_report') {
    if (!user) return { error: 'Please sign in to explain your report.' };
    if (user.privacySettings?.useHealthDataInAssistant === false) {
      return { notice: 'Health data access is disabled in your privacy settings.' };
    }

    const report = await MedicalReport.findOne({ _id: args.reportId, patientId: user._id });
    if (!report) return { error: 'Report not found in your health records.' };

    return {
      reportId: report._id,
      title: report.title,
      type: report.reportType,
      facility: report.issuingFacility,
      notes: report.notes || '',
      explanation: `This is a ${report.reportType.replace('_', ' ')} from ${report.issuingFacility} titled "${report.title}". It records your clinical observations and laboratory parameters. Please review these results directly with your attending physician for formal interpretation and medical planning.`,
      disclaimer: 'This is an informational explanation for personal records, not a medical diagnosis. Please consult your physician.'
    };
  }

  // 13. get_active_blood_alerts
  if (name === 'get_active_blood_alerts') {
    let alerts = [];
    if (mongoose.connection.readyState === 1) {
      try {
        alerts = await BloodAlert.find({ status: 'active', expiresAt: { $gt: new Date() } })
          .populate('hospitalId', 'name city')
          .sort({ urgency: -1 })
          .limit(5);
      } catch (err) {}
    }

    return {
      count: alerts.length,
      alerts: alerts.map(a => ({
        id: a._id,
        bloodGroup: a.bloodGroup,
        component: a.component,
        urgency: a.urgency,
        unitsNeeded: a.unitsNeeded - (a.unitsFulfilled || 0),
        hospital: a.hospitalId?.name || 'SmartCare Hospital',
        contactPhone: a.contactPhone
      }))
    };
  }

  // 14. check_my_donor_eligibility
  if (name === 'check_my_donor_eligibility') {
    if (!user) return { error: 'Please sign in to check donor eligibility.' };

    const donor = await Donor.findOne({ userId: user._id });
    if (!donor) {
      return {
        isRegisteredDonor: false,
        message: 'You have not registered as a voluntary blood donor yet. You can register under LifeShare Blood Program to earn voluntary donor recognition badges and protect your community!'
      };
    }

    const now = new Date();
    const nextEligible = new Date(donor.nextEligibleDate);
    const isEligible = now >= nextEligible && donor.status === 'active';
    const daysRemaining = Math.max(0, Math.ceil((nextEligible - now) / (1000 * 60 * 60 * 24)));

    return {
      isRegisteredDonor: true,
      bloodGroup: donor.bloodGroup,
      status: donor.status,
      isEligible,
      daysRemaining,
      nextEligibleDate: donor.nextEligibleDate?.toISOString().split('T')[0],
      totalDonations: donor.totalDonations || 0,
      livesImpacted: donor.livesImpacted || 0
    };
  }

  // 15. triage_symptoms (Red flag rules check + age-aware specialty mapping)
  if (name === 'triage_symptoms') {
    const rawSymptoms = (args.symptoms || '').trim();
    const redFlagCheck = checkRedFlags(rawSymptoms);

    if (redFlagCheck.isRedFlag) {
      return {
        isEmergency: true,
        redFlagAlert: `🚨 Red Flag Emergency Detected: "${redFlagCheck.matchedFlag}". Immediate medical intervention is required.`,
        instructions: [
          'Call National Emergency 112 or Ambulance 108 immediately.',
          'Go to the nearest 24x7 hospital Emergency Room without delay.'
        ],
        emergencyFlowTriggered: true
      };
    }

    // Determine age from user profile if authenticated
    let patientAge = null;
    let existingConditions = [];
    if (user) {
      let dbUser = user;
      if (mongoose.connection.readyState === 1) {
        try {
          const fetched = await User.findById(user._id).select('dateOfBirth patientHealth');
          if (fetched) dbUser = fetched;
        } catch (e) {}
      }
      patientAge = calculateAge(dbUser?.dateOfBirth);
      existingConditions = dbUser?.patientHealth?.existingConditions || [];
    }

    const lower = rawSymptoms.toLowerCase();
    const condStr = existingConditions.join(' ').toLowerCase();

    // Age-aware routing: pediatric check first
    if ((patientAge !== null && patientAge <= 14) || lower.includes('baby') || lower.includes('infant') || lower.includes('toddler')) {
      return {
        isEmergency: false,
        suggestedSpecialty: 'Pediatrics',
        rationale: `Pediatric consultation recommended for young patients (patient age: ${patientAge !== null ? patientAge : 'child'}).`,
        followUpQuestions: ['Has there been a fever, and if so, for how many hours?', 'Is the child able to drink fluids normally?']
      };
    }

    // Geriatric or adult check
    if (lower.includes('chest') || lower.includes('heart') || lower.includes('palpitat') || condStr.includes('hypertension') || condStr.includes('cardiac')) {
      return {
        isEmergency: false,
        suggestedSpecialty: 'Cardiology',
        rationale: 'Cardiovascular assessment suggested based on symptoms and cardiovascular risk factors.',
        followUpQuestions: ['Does the discomfort radiate to your arm, shoulder, or jaw?', 'Do you have shortness of breath when walking?']
      };
    }

    if (lower.includes('joint') || lower.includes('knee') || lower.includes('bone') || lower.includes('back pain') || lower.includes('sprain')) {
      return {
        isEmergency: false,
        suggestedSpecialty: 'Orthopedics',
        rationale: 'Musculoskeletal evaluation recommended for bone and joint symptoms.',
        followUpQuestions: ['Was there a fall or physical injury?', 'Are you able to bear weight on the affected area?']
      };
    }

    if (lower.includes('skin') || lower.includes('rash') || lower.includes('itch') || lower.includes('acne') || lower.includes('allergy')) {
      return {
        isEmergency: false,
        suggestedSpecialty: 'Dermatology',
        rationale: 'Dermatological review recommended for skin reaction or rash.',
        followUpQuestions: ['How long has the rash been present?', 'Are there any associated swellings or pain?']
      };
    }

    if (lower.includes('headache') || lower.includes('migraine') || lower.includes('dizziness') || lower.includes('numbness')) {
      return {
        isEmergency: false,
        suggestedSpecialty: 'Neurology',
        rationale: 'Neurological evaluation suggested for persistent headache or neurological signs.',
        followUpQuestions: ['Is the headache sudden or gradual?', 'Are there changes in your vision or sensitivity to light?']
      };
    }

    if (lower.includes('stomach') || lower.includes('vomit') || lower.includes('acid') || lower.includes('digestion') || lower.includes('abdomen')) {
      return {
        isEmergency: false,
        suggestedSpecialty: 'Gastroenterology',
        rationale: 'Gastrointestinal evaluation suggested for digestive tract symptoms.',
        followUpQuestions: ['Are symptoms related to eating certain foods?', 'Is there any nausea or bowel change?']
      };
    }

    return {
      isEmergency: false,
      suggestedSpecialty: 'General Medicine',
      rationale: 'Comprehensive primary care checkup recommended for initial clinical assessment.',
      followUpQuestions: ['How many days have you experienced these symptoms?', 'Are you currently taking any fever or pain medicines?']
    };
  }

  // 16. start_emergency_flow
  if (name === 'start_emergency_flow') {
    let nearby = [];
    if (mongoose.connection.readyState === 1) {
      try {
        nearby = await Hospital.find({ hasEmergencyDept: true }).limit(3).select('name phone emergencyContact city address');
      } catch (err) {}
    }
    return {
      isEmergency: true,
      emergencyTriggered: true,
      action: 'OPEN_EMERGENCY_MODAL',
      helplines: {
        ambulance: '108',
        nationalEmergency: '112',
        hospitalEmergencyDesk: nearby[0]?.emergencyContact || '+91-11-20000000'
      },
      nearestFacilities: nearby.map(h => ({
        name: h.name,
        city: h.city || h.address?.city,
        phone: h.emergencyContact || h.phone
      }))
    };
  }

  // 17. get_hospital_info
  if (name === 'get_hospital_info') {
    return {
      hospitalName: 'SmartCare Multispecialty Hospital System',
      visitingHours: 'OPD: 08:00 AM – 08:00 PM; Inpatient Visiting: 04:00 PM – 07:00 PM',
      emergency: '24x7 Emergency Trauma & Resuscitation Center Active',
      keyDepartments: ['Cardiology', 'Neurology', 'Pediatrics', 'Orthopedics', 'General Medicine', 'Dermatology', 'Gastroenterology'],
      helpline: '108 / +91-11-20000000'
    };
  }

  // 18. faq_search
  if (name === 'faq_search') {
    const q = (args.query || '').toLowerCase();
    if (q.includes('visit') || q.includes('time') || q.includes('hour')) {
      return { answer: 'OPD consultations operate Monday through Saturday 8:00 AM to 8:00 PM. Inpatient visiting hours are 4:00 PM to 7:00 PM daily.' };
    }
    if (q.includes('book') || q.includes('appointment')) {
      return { answer: 'You can book appointments online directly through SmartCare Assistant, via the Doctors page, or at our hospital reception kiosks.' };
    }
    if (q.includes('blood') || q.includes('donate')) {
      return { answer: 'All blood units at SmartCare LifeShare are voluntary and unpaid under NBTC guidelines. Donors aged 18-65 weighing at least 45kg are welcome.' };
    }
    return { answer: 'SmartCare Hospital provides 24x7 patient care, online OPD queue tracking with traffic-aware arrival alerts, and integrated electronic medical records.' };
  }

  return { error: `Tool ${name} not recognized` };
}

module.exports = {
  toolDefinitions,
  executeTool,
  checkRedFlags,
  calculateAge
};
