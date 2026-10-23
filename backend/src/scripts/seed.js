require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const QRCode = require('qrcode');
const crypto = require('crypto');

// Models
const User = require('../models/User');
const Hospital = require('../models/Hospital');
const Department = require('../models/Department');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const ConsultationMetric = require('../models/ConsultationMetric');
const HealthRecord = require('../models/HealthRecord');
const Consent = require('../models/Consent');
const Notification = require('../models/Notification');
const Donor = require('../models/Donor');
const Donation = require('../models/Donation');
const BloodUnit = require('../models/BloodUnit');
const BloodRequest = require('../models/BloodRequest');
const FamilyLink = require('../models/FamilyLink');
const CommunityCard = require('../models/CommunityCard');
const DiscountRule = require('../models/DiscountRule');
const DiscountApplication = require('../models/DiscountApplication');
const BloodAlert = require('../models/BloodAlert');
const BloodAlertResponse = require('../models/BloodAlertResponse');
const EmergencyCase = require('../models/EmergencyCase');
const BreakGlassAccessLog = require('../models/BreakGlassAccessLog');

const seedData = async (shouldExit = true) => {
  try {
    console.log('[Seed] Connecting to MongoDB...');
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smartcare');
    }
    console.log('[Seed] Clearing existing collections...');

    await Promise.all([
      User.deleteMany({}),
      Hospital.deleteMany({}),
      Department.deleteMany({}),
      Doctor.deleteMany({}),
      Appointment.deleteMany({}),
      ConsultationMetric.deleteMany({}),
      HealthRecord.deleteMany({}),
      Consent.deleteMany({}),
      Notification.deleteMany({}),
      Donor.deleteMany({}),
      Donation.deleteMany({}),
      BloodUnit.deleteMany({}),
      BloodRequest.deleteMany({}),
      FamilyLink.deleteMany({}),
      CommunityCard.deleteMany({}),
      DiscountRule.deleteMany({}),
      DiscountApplication.deleteMany({}),
      BloodAlert.deleteMany({}),
      BloodAlertResponse.deleteMany({}),
      EmergencyCase.deleteMany({}),
      BreakGlassAccessLog.deleteMany({})
    ]);

    console.log('[Seed] Seeding 3 Connected Hospitals...');
    const hospitals = await Hospital.create([
      {
        name: 'Apollo Indraprastha Medical Center',
        code: 'APOLLO-DEL',
        city: 'New Delhi',
        address: { street: 'Sarita Vihar, Mathura Road', city: 'New Delhi', state: 'Delhi', zip: '110076', lat: 28.5355, lng: 77.2910 },
        phone: '+91-11-26925858',
        emergencyContact: '1066',
        bloodBankOperational: true,
        image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80'
      },
      {
        name: 'Fortis Memorial Research Institute',
        code: 'FORTIS-GUR',
        city: 'Gurugram',
        address: { street: 'Sector 44, Opposite HUDA City Centre', city: 'Gurugram', state: 'Haryana', zip: '122002', lat: 28.4595, lng: 77.0725 },
        phone: '+91-124-4962200',
        emergencyContact: '105010',
        bloodBankOperational: true,
        image: 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=800&q=80'
      },
      {
        name: 'Max Super Speciality Hospital',
        code: 'MAX-SAKET',
        city: 'New Delhi',
        address: { street: '1, 2, Press Enclave Marg, Saket', city: 'New Delhi', state: 'Delhi', zip: '110017', lat: 28.5284, lng: 77.2140 },
        phone: '+91-11-26515050',
        emergencyContact: '011-40554055',
        bloodBankOperational: true,
        image: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=800&q=80'
      }
    ]);

    console.log('[Seed] Seeding Departments...');
    const deptNames = [
      { name: 'Cardiology', code: 'CARD', floor: '2nd Floor, Wing A', icon: 'Heart' },
      { name: 'Pediatrics', code: 'PED', floor: '1st Floor, Wing B', icon: 'Baby' },
      { name: 'Orthopedics', code: 'ORTH', floor: '3rd Floor, Wing C', icon: 'Bone' },
      { name: 'General Medicine', code: 'GEN', floor: 'Ground Floor, Wing A', icon: 'Stethoscope' },
      { name: 'Neurology', code: 'NEUR', floor: '4th Floor, Wing B', icon: 'Brain' },
      { name: 'Dermatology', code: 'DERM', floor: '1st Floor, Wing A', icon: 'Sparkles' }
    ];

    const departments = [];
    for (const h of hospitals) {
      for (const d of deptNames) {
        const createdDept = await Department.create({
          hospitalId: h._id,
          name: d.name,
          code: `${h.code.split('-')[0]}-${d.code}`,
          floor: d.floor,
          icon: d.icon
        });
        departments.push(createdDept);
        h.departments.push(createdDept._id);
      }
      await h.save();
    }

    console.log('[Seed] Seeding Users for all Roles...');
    const commonPassword = 'Password123!';

    // 1. Admin
    const adminUser = await User.create({
      name: 'Dr. Vikram Malhotra (Admin)',
      email: 'admin@smartcare.hospital',
      password: commonPassword,
      phone: '+91-9811001122',
      role: 'admin',
      hospitalId: hospitals[0]._id,
      avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=200&q=80'
    });

    // 2. Receptionist
    const receptionistUser = await User.create({
      name: 'Sunita Mehra (Reception)',
      email: 'reception@smartcare.hospital',
      password: commonPassword,
      phone: '+91-9877665544',
      role: 'receptionist',
      hospitalId: hospitals[0]._id,
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80'
    });

    // 3. Blood Bank Officer
    const bloodOfficerUser = await User.create({
      name: 'Rajesh Kulkarni (Blood Bank Officer)',
      email: 'bloodofficer@smartcare.hospital',
      password: commonPassword,
      phone: '+91-9822334455',
      role: 'blood_bank_officer',
      hospitalId: hospitals[0]._id,
      avatar: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=200&q=80'
    });

    // 4. Patient: Rahul Sharma (Primary Demo Patient & Gold Tier Donor)
    const patientUser = await User.create({
      name: 'Rahul Sharma',
      email: 'patient@smartcare.hospital',
      password: commonPassword,
      phone: '+91-9810123456',
      role: 'patient',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      gender: 'male',
      dateOfBirth: new Date('1992-05-14'),
      cityArea: 'South Delhi, New Delhi',
      emergencyContact: {
        name: 'Priya Sharma',
        relationship: 'spouse',
        phone: '+91-9810112233'
      },
      notificationPreferences: {
        channels: { inApp: true, email: true, sms: true },
        types: { appointments: true, queue: true, reminders: true, bloodAlerts: true, emergency: true }
      },
      privacySettings: {
        shareWithConsultingDoctors: true,
        showInDonorDirectory: true,
        allowEmergencyBreakGlass: true
      },
      patientHealth: {
        bloodGroup: 'B+',
        bloodGroupSource: 'verified',
        heightCm: 178,
        weightKg: 74,
        allergies: ['Penicillin'],
        existingConditions: ['Mild Asthma'],
        currentMedicines: [{ name: 'Levocetirizine', dosage: '5mg', frequency: 'PRN' }],
        pastSurgeries: []
      },
      donorSettings: {
        willingToDonate: true,
        lastDonationDate: new Date(Date.now() - 105 * 24 * 3600 * 1000)
      },
      profileCompletenessScore: 95,
      familyMembers: [
        { name: 'Priya Sharma', relation: 'spouse', age: 32, gender: 'female', bloodGroup: 'B+', allergies: ['Penicillin'] },
        { name: 'Aarav Sharma', relation: 'child', age: 7, gender: 'male', bloodGroup: 'O+', allergies: [] },
        { name: 'Ramesh Sharma', relation: 'parent', age: 64, gender: 'male', bloodGroup: 'O+', allergies: ['Sulfa drugs'] }
      ],
      address: { street: 'B-42, Defence Colony', city: 'New Delhi', state: 'Delhi', zip: '110024', lat: 28.5729, lng: 77.2315 },
      preferredLanguage: 'en',
      accessibility: { largeFont: false, highContrast: false }
    });

    // 5. Additional Patient: Ananya Roy (Needing emergency surgery blood)
    const patientRoy = await User.create({
      name: 'Ananya Roy',
      email: 'ananya@smartcare.hospital',
      password: commonPassword,
      phone: '+91-9810987654',
      role: 'patient',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
      address: { street: 'Flat 304, Green Glen Layout', city: 'Gurugram', state: 'Haryana', zip: '122001', lat: 28.45, lng: 77.02 }
    });

    console.log('[Seed] Seeding 16 Doctors across 3 Hospitals...');
    const doctorProfiles = [
      // Apollo Doctors
      { name: 'Dr. Anita Desai', specialty: 'Cardiology', hospitalIdx: 0, deptCode: 'CARD', fee: 1000, room: 'OPD-101', languages: ['English', 'Hindi'], avg: 14, exp: 16, avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=200&q=80' },
      { name: 'Dr. Rajesh Verma', specialty: 'Orthopedics', hospitalIdx: 0, deptCode: 'ORTH', fee: 800, room: 'OPD-102', languages: ['English', 'Hindi', 'Punjabi'], avg: 12, exp: 12, avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=200&q=80' },
      { name: 'Dr. Meera Nambiar', specialty: 'Pediatrics', hospitalIdx: 0, deptCode: 'PED', fee: 700, room: 'OPD-103', languages: ['English', 'Hindi', 'Malayalam'], avg: 15, exp: 9, avatar: 'https://images.unsplash.com/photo-1594824813515-8968f6c4ff5d?auto=format&fit=crop&w=200&q=80' },
      { name: 'Dr. Kabir Sen', specialty: 'General Medicine', hospitalIdx: 0, deptCode: 'GEN', fee: 500, room: 'OPD-104', languages: ['English', 'Hindi', 'Bengali'], avg: 10, exp: 14, avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=200&q=80' },
      { name: 'Dr. Shalini Gupta', specialty: 'Dermatology', hospitalIdx: 0, deptCode: 'DERM', fee: 900, room: 'OPD-105', languages: ['English', 'Hindi'], avg: 13, exp: 11, avatar: 'https://images.unsplash.com/photo-1527613426441-4da17471b66d?auto=format&fit=crop&w=200&q=80' },
      { name: 'Dr. Farooq Ahmed', specialty: 'Neurology', hospitalIdx: 0, deptCode: 'NEUR', fee: 1200, room: 'OPD-106', languages: ['English', 'Hindi', 'Urdu'], avg: 18, exp: 20, avatar: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=200&q=80' },

      // Fortis Doctors
      { name: 'Dr. Rohan Batra', specialty: 'Cardiology', hospitalIdx: 1, deptCode: 'CARD', fee: 1100, room: 'OPD-201', languages: ['English', 'Hindi'], avg: 16, exp: 15, avatar: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=200&q=80' },
      { name: 'Dr. Kavita Joshi', specialty: 'Pediatrics', hospitalIdx: 1, deptCode: 'PED', fee: 750, room: 'OPD-202', languages: ['English', 'Hindi'], avg: 14, exp: 8, avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=200&q=80' },
      { name: 'Dr. Sanjay Kapoor', specialty: 'Orthopedics', hospitalIdx: 1, deptCode: 'ORTH', fee: 850, room: 'OPD-203', languages: ['English', 'Hindi', 'Punjabi'], avg: 11, exp: 13, avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=200&q=80' },
      { name: 'Dr. Priya Singhania', specialty: 'General Medicine', hospitalIdx: 1, deptCode: 'GEN', fee: 600, room: 'OPD-204', languages: ['English', 'Hindi'], avg: 12, exp: 10, avatar: 'https://images.unsplash.com/photo-1594824813515-8968f6c4ff5d?auto=format&fit=crop&w=200&q=80' },
      { name: 'Dr. Alok Nath Mukherjee', specialty: 'Neurology', hospitalIdx: 1, deptCode: 'NEUR', fee: 1300, room: 'OPD-205', languages: ['English', 'Hindi', 'Bengali'], avg: 17, exp: 22, avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=200&q=80' },

      // Max Doctors
      { name: 'Dr. Deepa Pillai', specialty: 'Cardiology', hospitalIdx: 2, deptCode: 'CARD', fee: 1050, room: 'OPD-301', languages: ['English', 'Hindi', 'Tamil'], avg: 15, exp: 17, avatar: 'https://images.unsplash.com/photo-1527613426441-4da17471b66d?auto=format&fit=crop&w=200&q=80' },
      { name: 'Dr. Harsh Vardhan', specialty: 'General Medicine', hospitalIdx: 2, deptCode: 'GEN', fee: 550, room: 'OPD-302', languages: ['English', 'Hindi'], avg: 11, exp: 12, avatar: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=200&q=80' },
      { name: 'Dr. Tanvi Parekh', specialty: 'Dermatology', hospitalIdx: 2, deptCode: 'DERM', fee: 950, room: 'OPD-303', languages: ['English', 'Hindi', 'Gujarati'], avg: 14, exp: 9, avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=200&q=80' },
      { name: 'Dr. Arvind Swaminathan', specialty: 'Orthopedics', hospitalIdx: 2, deptCode: 'ORTH', fee: 900, room: 'OPD-304', languages: ['English', 'Hindi', 'Tamil'], avg: 13, exp: 18, avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=200&q=80' },
      { name: 'Dr. Sunita Rao', specialty: 'Pediatrics', hospitalIdx: 2, deptCode: 'PED', fee: 800, room: 'OPD-305', languages: ['English', 'Hindi', 'Kannada'], avg: 15, exp: 11, avatar: 'https://images.unsplash.com/photo-1594824813515-8968f6c4ff5d?auto=format&fit=crop&w=200&q=80' }
    ];

    const seededDoctors = [];
    for (let i = 0; i < doctorProfiles.length; i++) {
      const p = doctorProfiles[i];
      const email = `doctor${i + 1}@smartcare.hospital`;
      const docUser = await User.create({
        name: p.name,
        email,
        password: commonPassword,
        phone: `+91-98000000${(i + 10).toString().slice(-2)}`,
        role: 'doctor',
        hospitalId: hospitals[p.hospitalIdx]._id,
        avatar: p.avatar
      });

      const dept = departments.find(d => 
        d.hospitalId.toString() === hospitals[p.hospitalIdx]._id.toString() &&
        d.name.toLowerCase() === p.specialty.toLowerCase()
      ) || departments[0];

      const doctorDoc = await Doctor.create({
        userId: docUser._id,
        hospitalId: hospitals[p.hospitalIdx]._id,
        departmentId: dept._id,
        specialty: p.specialty,
        qualifications: [
          { degree: 'MBBS', institution: 'AIIMS New Delhi', year: 2010 },
          { degree: 'MD', institution: 'Maulana Azad Medical College', year: 2014 },
          { degree: 'DNB', institution: 'National Board of Examinations', year: 2016 }
        ],
        subSpecialties: [p.specialty + ' Care', 'Interventional Therapeutics'],
        medicalCouncilRegNumber: `MCI-${10000 + i * 237}`,
        isVerified: i < 14,
        verifiedByAdminId: i < 14 ? adminUser._id : undefined,
        verifiedAt: i < 14 ? new Date(Date.now() - 30 * 86400000) : undefined,
        bio: `Experienced specialist in ${p.specialty} with ${p.exp} years of distinguished clinical practice.`,
        languages: p.languages,
        experienceYears: p.exp,
        consultationFee: p.fee,
        avgConsultationTime: p.avg,
        roomNumber: p.room,
        liveStatus: i === 0 ? 'in_consultation' : (i % 3 === 0 ? 'available' : 'available'),
        weeklySchedule: [0, 1, 2, 3, 4, 5, 6].map(d => ({
          dayOfWeek: d,
          startTime: '09:00',
          endTime: '17:00',
          slotDuration: 15,
          maxPatients: 30
        }))
      });
      seededDoctors.push(doctorDoc);
    }

    console.log('[Seed] Seeding Consultation Metrics for Dynamic Rolling Averages...');
    const primaryDoctor = seededDoctors[0]; // Dr. Anita Desai (Cardiology)
    const metricDurations = [14, 16, 12, 15, 13, 17, 14, 15, 12, 14];
    for (const d of metricDurations) {
      await ConsultationMetric.create({
        doctorId: primaryDoctor._id,
        appointmentId: new mongoose.Types.ObjectId(),
        durationMinutes: d,
        date: new Date(Date.now() - Math.random() * 86400000 * 3)
      });
    }

    console.log('[Seed] Seeding Today\'s Live Queue with Dynamic Tokens...');
    const todayStr = new Date().toISOString().split('T')[0];
    const qrDemo = await QRCode.toDataURL(JSON.stringify({ token: 'APOLLO-CARD-003', doctor: 'Dr. Anita Desai' }));

    // Patient currently inside consultation (Token 1)
    const appt1 = await Appointment.create({
      hospitalId: hospitals[0]._id,
      departmentId: primaryDoctor.departmentId,
      doctorId: primaryDoctor._id,
      patientId: patientRoy._id,
      date: todayStr,
      timeSlot: '09:00 - 09:15',
      tokenNumber: 1,
      tokenCode: 'CARD-001',
      qrCode: qrDemo,
      status: 'in_consultation',
      consultationStartTime: new Date(Date.now() - 8 * 60000), // 8 mins in
      symptoms: 'Mild chest heaviness and breathlessness on stairs'
    });
    primaryDoctor.currentAppointmentId = appt1._id;
    await primaryDoctor.save();

    // Patient called next (Token 2)
    await Appointment.create({
      hospitalId: hospitals[0]._id,
      departmentId: primaryDoctor.departmentId,
      doctorId: primaryDoctor._id,
      patientId: (await User.create({ name: 'Vikram Joshi', email: 'vj@example.com', password: commonPassword, phone: '+91-9877777777', role: 'patient' }))._id,
      date: todayStr,
      timeSlot: '09:15 - 09:30',
      tokenNumber: 2,
      tokenCode: 'CARD-002',
      qrCode: qrDemo,
      status: 'called',
      checkInTime: new Date(Date.now() - 20 * 60000),
      symptoms: 'High blood pressure follow-up'
    });

    // Primary Demo User: Rahul Sharma (Token 3, checked-in, waiting)
    const qrRahul = await QRCode.toDataURL(JSON.stringify({ token: 'CARD-003', patient: 'Rahul Sharma', doctor: 'Dr. Anita Desai' }));
    const rahulAppt = await Appointment.create({
      hospitalId: hospitals[0]._id,
      departmentId: primaryDoctor.departmentId,
      doctorId: primaryDoctor._id,
      patientId: patientUser._id,
      date: todayStr,
      timeSlot: '09:30 - 09:45',
      tokenNumber: 3,
      tokenCode: 'CARD-003',
      qrCode: qrRahul,
      status: 'checked_in',
      checkInTime: new Date(Date.now() - 10 * 60000),
      symptoms: 'Routine ECG and cholesterol review',
      userTravelTimeMinutes: 25,
      checkInBufferMinutes: 15,
      estimatedTurnTime: new Date(Date.now() + 18 * 60000)
    });

    // Patients 4 & 5 (scheduled, waiting at home / traveling)
    await Appointment.create({
      hospitalId: hospitals[0]._id,
      departmentId: primaryDoctor.departmentId,
      doctorId: primaryDoctor._id,
      patientId: (await User.create({ name: 'Suresh Raina', email: 'sr@example.com', password: commonPassword, phone: '+91-9866666666', role: 'patient' }))._id,
      date: todayStr,
      timeSlot: '09:45 - 10:00',
      tokenNumber: 4,
      tokenCode: 'CARD-004',
      qrCode: qrDemo,
      status: 'scheduled',
      userTravelTimeMinutes: 30,
      checkInBufferMinutes: 15,
      estimatedTurnTime: new Date(Date.now() + 32 * 60000)
    });

    await Appointment.create({
      hospitalId: hospitals[0]._id,
      departmentId: primaryDoctor.departmentId,
      doctorId: primaryDoctor._id,
      patientId: (await User.create({ name: 'Harpreet Kaur', email: 'hk@example.com', password: commonPassword, phone: '+91-9855555555', role: 'patient' }))._id,
      date: todayStr,
      timeSlot: '10:00 - 10:15',
      tokenNumber: 5,
      tokenCode: 'CARD-005',
      qrCode: qrDemo,
      status: 'scheduled',
      userTravelTimeMinutes: 20,
      checkInBufferMinutes: 15,
      estimatedTurnTime: new Date(Date.now() + 46 * 60000)
    });

    console.log('[Seed] Seeding Health Timeline Records & Consent...');
    await HealthRecord.create([
      {
        patientId: patientUser._id,
        doctorId: primaryDoctor._id,
        hospitalId: hospitals[0]._id,
        type: 'prescription',
        title: 'Cardiology Follow-Up Prescription',
        date: new Date(Date.now() - 30 * 86400000),
        aiSummary: 'Maintenance prescription for mild hypertension: Tab Telmisartan 40mg once daily in morning. Advised 30 mins brisk walking.',
        metadata: {
          diagnosis: 'Essential Hypertension (Stage 1)',
          medicines: [
            { name: 'Telmisartan', dosage: '40mg', frequency: '1-0-0', duration: '30 days', instructions: 'After breakfast' },
            { name: 'Atorvastatin', dosage: '10mg', frequency: '0-0-1', duration: '30 days', instructions: 'After dinner' }
          ]
        }
      },
      {
        patientId: patientUser._id,
        hospitalId: hospitals[0]._id,
        type: 'lab_report',
        title: 'Comprehensive Lipid Profile',
        date: new Date(Date.now() - 28 * 86400000),
        aiSummary: 'Total Cholesterol: 192 mg/dL (Normal <200), HDL: 48 mg/dL (Good), LDL: 118 mg/dL (Optimal <100), Triglycerides: 130 mg/dL (Normal). Cardiac risk profile is low to moderate.',
        metadata: {
          labValues: new Map([
            ['Total Cholesterol', '192 mg/dL'],
            ['HDL', '48 mg/dL'],
            ['LDL', '118 mg/dL'],
            ['Triglycerides', '130 mg/dL']
          ])
        }
      }
    ]);

    // Active consent for Dr. Anita Desai
    await Consent.create({
      patientId: patientUser._id,
      granteeType: 'doctor',
      granteeId: primaryDoctor._id,
      granteeName: 'Dr. Anita Desai',
      scope: 'full_history',
      status: 'active',
      validUntil: new Date(Date.now() + 90 * 86400000)
    });

    console.log('[Seed] Seeding LifeShare Module (Voluntary Donor, Gold Card, Inventory, Priority Blood Request)...');
    // Seed Rahul Sharma as a proud Voluntary Blood Donor with 11 Verified Lifetime Donations (Gold Tier)
    const rahulDonor = await Donor.create({
      userId: patientUser._id,
      bloodGroup: 'O+',
      gender: 'male',
      dateOfBirth: new Date('1990-05-14'),
      weightKg: 72,
      lastDonationDate: new Date(Date.now() - 105 * 86400000), // 105 days ago (eligible again!)
      nextEligibleDate: new Date(Date.now() - 15 * 86400000),  // 0 days countdown (eligible now)
      totalDonations: 11,
      livesImpacted: 33,
      voluntaryDeclarationAccepted: true,
      preferredCity: 'New Delhi',
      badges: [
        { name: 'First Blood Gift', icon: 'Award', awardedAt: new Date(Date.now() - 400 * 86400000) },
        { name: 'LifeSaver Bronze', icon: 'Shield', awardedAt: new Date(Date.now() - 280 * 86400000) },
        { name: 'Hero Silver', icon: 'Medal', awardedAt: new Date(Date.now() - 150 * 86400000) },
        { name: 'Champion Gold', icon: 'Crown', awardedAt: new Date(Date.now() - 105 * 86400000) }
      ]
    });
    patientUser.donorProfileId = rahulDonor._id;
    await patientUser.save();

    // Verified donation event logged into continuous Health Timeline
    const donationTimeline = await HealthRecord.create({
      patientId: patientUser._id,
      hospitalId: hospitals[0]._id,
      type: 'blood_donation',
      title: 'Voluntary Blood Donation (PRBC)',
      date: new Date(Date.now() - 105 * 86400000),
      aiSummary: 'Verified voluntary, unpaid donation of 450ml PRBC at Apollo Indraprastha Blood Bank. Screening: Passed. Unit #AP-O-2026-991.',
      metadata: {
        bloodDonation: {
          donationId: 'DON-2026-00088',
          unitNumber: 'AP-O-2026-991',
          component: 'Packed Red Blood Cells (PRBC)',
          volumeMl: 450,
          screeningStatus: 'passed'
        }
      }
    });

    await Donation.create({
      donationId: 'DON-2026-00088',
      donorId: rahulDonor._id,
      hospitalId: hospitals[0]._id,
      officerId: bloodOfficerUser._id,
      date: new Date(Date.now() - 105 * 86400000),
      unitNumber: 'AP-O-2026-991',
      bloodGroup: 'O+',
      component: 'Packed Red Blood Cells (PRBC)',
      volumeMl: 450,
      hemoglobinGdl: 14.2,
      bloodPressure: '120/80',
      screeningStatus: 'passed',
      voluntaryUnpaidDeclaration: true,
      officerNotes: 'Excellent physical screening, 11th lifetime voluntary donation.',
      healthRecordId: donationTimeline._id
    });

    // Seed Community Health Card (Gold Tier: 30% discount on OPD, diagnostics, pharmacy)
    const cardSecret = crypto.randomBytes(16).toString('hex');
    const qrCard = await QRCode.toDataURL(JSON.stringify({
      cardNumber: 'SC-GOLD-84920',
      donorName: 'Rahul Sharma',
      tier: 'Gold',
      discount: 30,
      validUntil: '2028-10-21'
    }));

    await CommunityCard.create({
      cardNumber: 'SC-GOLD-84920',
      donorId: rahulDonor._id,
      userId: patientUser._id,
      tier: 'Gold',
      discountPercentage: 30,
      totalLifetimeDonationsAtIssue: 11,
      validUntil: new Date(Date.now() + 2 * 365 * 86400000),
      rotatingQrSecret: cardSecret,
      qrCodeUrl: qrCard,
      status: 'active'
    });

    // Seed Verified Family Link for spouse (Priya Sharma)
    await FamilyLink.create({
      donorId: rahulDonor._id,
      familyMemberName: 'Priya Sharma',
      relationship: 'spouse',
      dateOfBirth: new Date('1992-08-20'),
      bloodGroup: 'B+',
      verificationDocumentUrl: 'https://images.unsplash.com/photo-1584432810601-6c7f27d3388c?auto=format&fit=crop&w=500&q=80',
      verificationStatus: 'verified',
      verifiedBy: bloodOfficerUser._id,
      verifiedAt: new Date(Date.now() - 40 * 86400000)
    });

    // Seed Blood Inventory across all blood groups & components
    const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    const components = ['Packed Red Blood Cells (PRBC)', 'Fresh Frozen Plasma (FFP)', 'Platelets'];

    for (const h of hospitals) {
      for (const bg of bloodGroups) {
        for (const comp of components) {
          const count = bg === 'O+' || bg === 'B+' ? 6 : 3;
          for (let u = 1; u <= count; u++) {
            const expiryDays = comp === 'Platelets' ? 4 : (comp === 'Fresh Frozen Plasma (FFP)' ? 300 : 35);
            await BloodUnit.create({
              unitNumber: `${h.code.split('-')[0]}-${bg.replace('+', 'P').replace('-', 'N')}-${comp.slice(0, 3).toUpperCase()}-${u}`,
              hospitalId: h._id,
              bloodGroup: bg,
              component: comp,
              collectionDate: new Date(Date.now() - 5 * 86400000),
              expiryDate: new Date(Date.now() + expiryDays * 86400000),
              status: 'available',
              storageLocation: { refrigeratorId: 'FRIDGE-B2', shelfNumber: 'SHELF-04' }
            });
          }
        }
      }
    }

    // Seed a Priority Blood Request for Priya Sharma (Linked Verified Family Member) for Judges Walkthrough!
    await BloodRequest.create({
      requestId: 'REQ-BLD-0104',
      hospitalId: hospitals[0]._id,
      patientId: patientUser._id,
      requestingDoctorId: primaryDoctor._id,
      bloodGroup: 'B+',
      component: 'Packed Red Blood Cells (PRBC)',
      unitsRequested: 2,
      unitsAllocated: 0,
      clinicalUrgency: 'urgent_surgery',
      isPriorityDonorFamily: true,
      priorityJustification: {
        matchedDonorId: rahulDonor._id,
        donorTier: 'Gold'
      },
      processingFeeWaived: true,
      processingFeeAmount: 0,
      replacementDonorDemanded: false,
      status: 'pending',
      clinicalDiagnosis: 'Elective laparoscopic cholecystectomy - pre-op cross match'
    });

    // Seed Discount Rules for Hospital
    const categories = ['outpatient_consultation', 'diagnostics_lab', 'radiology_scans', 'pharmacy_opd', 'health_checkup_packages'];
    for (const cat of categories) {
      await DiscountRule.create({
        hospitalId: hospitals[0]._id,
        category: cat,
        tierDiscounts: { Bronze: 10, Silver: 20, Gold: 30, Platinum: 50 },
        maxDiscountCapRupees: 5000,
        isActive: true
      });
    }

    // Seed Active Blood Shortage Alert (B+ Packed Red Blood Cells at Apollo)
    console.log('[Seed] Seeding Active Blood Shortage Alert...');
    const activeBloodAlert = await BloodAlert.create({
      hospitalId: hospitals[0]._id,
      raisedBy: bloodOfficerUser._id,
      bloodGroup: 'B+',
      component: 'Packed Red Blood Cells (PRBC)',
      unitsNeeded: 4,
      unitsFulfilled: 1,
      urgency: 'Critical',
      matchingMode: 'exact_match',
      contactDesk: 'Emergency Blood Bank Desk, Ground Floor (Desk 3)',
      contactPhone: '+91-11-26925858 Ext 104',
      radiusKm: 25,
      expiresAt: new Date(Date.now() + 48 * 3600 * 1000),
      status: 'active',
      matchedUsersCount: 1,
      responseStats: {
        canDonateCount: 0,
        unavailableCount: 0
      },
      autoTriggerSuggested: false
    });

    // Seed Active Emergency Cases for Doctor ER Desk
    console.log('[Seed] Seeding Emergency Cases & Break-Glass Protocol Records...');
    const emergencyCase1 = await EmergencyCase.create({
      caseNumber: 'EM-2026-9042',
      patientId: patientUser._id,
      submittedBy: {
        userId: patientUser._id,
        name: 'Rahul Sharma',
        relationship: 'self',
        isBystander: false
      },
      hospitalId: hospitals[0]._id,
      assignedDoctorId: primaryDoctor._id,
      chiefComplaint: 'chest_pain',
      complaintDescription: 'Acute retrosternal crushing pain radiating to left arm with diaphoresis and mild nausea.',
      severityScore: 9,
      symptomOnset: 'within_1_hour',
      triagePriority: 'P1_CRITICAL_RESUSCITATION',
      prefilledHealthSnapshot: {
        bloodGroup: 'B+',
        allergies: ['Penicillin'],
        existingConditions: ['Mild Asthma'],
        currentMedicines: ['Levocetirizine 5mg']
      },
      status: 'waiting',
      breakGlassUsed: true
    });

    const emergencyCase2 = await EmergencyCase.create({
      caseNumber: 'EM-2026-9043',
      patientId: patientRoy._id,
      submittedBy: {
        userId: patientRoy._id,
        name: 'Pooja Roy (Sister)',
        relationship: 'sibling',
        isBystander: true
      },
      hospitalId: hospitals[0]._id,
      assignedDoctorId: primaryDoctor._id,
      chiefComplaint: 'breathing_difficulty',
      complaintDescription: 'Sudden onset severe dyspnea, wheezing, unable to speak in full sentences.',
      severityScore: 7,
      symptomOnset: '1_to_3_hours',
      triagePriority: 'P2_EMERGENT',
      prefilledHealthSnapshot: {
        bloodGroup: 'O+',
        allergies: [],
        existingConditions: ['Asthma'],
        currentMedicines: ['Salbutamol Inhaler']
      },
      status: 'under_treatment',
      breakGlassUsed: false
    });

    // Seed Break-Glass Access Log for Case 1
    await BreakGlassAccessLog.create({
      emergencyCaseId: emergencyCase1._id,
      doctorId: seededDoctors[0].userId,
      doctorName: 'Dr. Anita Desai',
      patientId: patientUser._id,
      reason: 'acute_cardiac_arrest',
      clinicalJustification: 'Critical chest pain suggestive of STEMI. Immediate read-only record inspection required to prevent drug interactions (Penicillin allergy verified).',
      accessedAt: new Date(Date.now() - 20 * 60 * 1000),
      expiresAt: new Date(Date.now() + 23.6 * 3600 * 1000),
      recordsViewed: ['Patient Full Profile', 'Medication History', 'Allergy Registry', 'Past Timeline Notes'],
      patientNotified: true,
      flaggedByAdmin: false
    });

    console.log('\n======================================================');
    console.log('✅ SmartCare + LifeShare Database Seeded Successfully!');
    console.log('======================================================');
    console.log('DEMO LOGINS (Password for all: Password123!):');
    console.log('1. Patient (Gold Donor): patient@smartcare.hospital');
    console.log('2. Doctor (Cardiology):  doctor1@smartcare.hospital');
    console.log('3. Hospital Admin:       admin@smartcare.hospital');
    console.log('4. Receptionist:         reception@smartcare.hospital');
    console.log('5. Blood Bank Officer:   bloodofficer@smartcare.hospital');
    console.log('======================================================\n');

    if (shouldExit) {
      process.exit(0);
    }
    return { success: true };
  } catch (error) {
    console.error('[Seed Error]:', error);
    if (shouldExit) {
      process.exit(1);
    }
    throw error;
  }
};

module.exports = seedData;

if (require.main === module) {
  seedData(true);
}
