const Donor = require('../models/Donor');
const Donation = require('../models/Donation');
const BloodUnit = require('../models/BloodUnit');
const BloodRequest = require('../models/BloodRequest');
const FamilyLink = require('../models/FamilyLink');
const HealthRecord = require('../models/HealthRecord');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { logAudit } = require('../middleware/auditMiddleware');

// Configurable Fast-Track Settings (In-Memory with Admin Override)
let fastTrackSettings = {
  minDonationsForFastTrack: 1,
  activeDonationMaxMonths: 12,
  waiveProcessingFee: true,
  waiveReplacementDonor: true,
  preVerifyPaperwork: true,
  annualCapPerFamily: 4
};

// Recognition Badge Milestones (Non-Monetary)
const BADGE_DEFINITIONS = [
  { minDonations: 1, name: 'First Blood Gift', icon: 'Award', description: 'Awarded for your 1st verified voluntary blood donation.' },
  { minDonations: 3, name: 'Dedicated Life Saver', icon: 'Heart', description: 'Awarded for 3 verified voluntary donations saving up to 9 lives.' },
  { minDonations: 5, name: 'Bronze Shield Donor', icon: 'Shield', description: 'Awarded for 5 verified donations.' },
  { minDonations: 7, name: 'Silver Pillar Donor', icon: 'Medal', description: 'Awarded for 7 verified donations.' },
  { minDonations: 10, name: 'Gold Star Donor', icon: 'Star', description: 'Awarded for 10 verified donations.' },
  { minDonations: 15, name: 'Champion of Humanity', icon: 'Crown', description: 'Awarded for 15+ verified donations.' }
];

// Helper to award milestone badges to donor
function evaluateBadges(donor) {
  const existingNames = new Set(donor.badges.map(b => b.name));
  let awardedNew = false;

  BADGE_DEFINITIONS.forEach(def => {
    if (donor.totalDonations >= def.minDonations && !existingNames.has(def.name)) {
      donor.badges.push({
        name: def.name,
        icon: def.icon,
        description: def.description,
        awardedAt: new Date()
      });
      awardedNew = true;
    }
  });

  return awardedNew;
}

// ==========================================
// 1. DONOR REGISTRY & ELIGIBILITY
// ==========================================

// @route   POST /api/donors/register
exports.registerDonor = async (req, res, next) => {
  try {
    const {
      bloodGroup,
      gender,
      dateOfBirth,
      weightKg,
      preferredCity,
      optInUrgentAlerts,
      voluntaryDeclarationAccepted
    } = req.body;

    if (!voluntaryDeclarationAccepted) {
      return res.status(400).json({ error: 'You must affirm that your blood donation is 100% voluntary and unpaid under NBTC guidelines.' });
    }

    const existingDonor = await Donor.findOne({ userId: req.user._id });
    if (existingDonor) {
      return res.status(400).json({ error: 'Donor profile already exists for this account.' });
    }

    const nextEligibleDate = new Date();

    const donor = await Donor.create({
      userId: req.user._id,
      bloodGroup,
      gender,
      dateOfBirth: new Date(dateOfBirth),
      weightKg: Number(weightKg),
      preferredCity: preferredCity || 'New Delhi',
      optInUrgentAlerts: optInUrgentAlerts !== false,
      voluntaryDeclarationAccepted: true,
      nextEligibleDate,
      badges: []
    });

    req.user.donorProfileId = donor._id;
    if (req.user.patientHealth) {
      req.user.patientHealth.bloodGroup = bloodGroup;
      req.user.patientHealth.bloodGroupSource = 'verified';
    }
    if (req.user.donorSettings) {
      req.user.donorSettings.willingToDonate = true;
    }
    await req.user.save();

    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'REGISTER_BLOOD_DONOR',
      resourceType: 'Donor',
      resourceId: donor._id,
      details: { bloodGroup, voluntaryDeclaration: true }
    });

    res.status(201).json({ success: true, donor });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/donors/me
exports.getMyDonorProfile = async (req, res, next) => {
  try {
    const donor = await Donor.findOne({ userId: req.user._id }).populate('userId', 'name email phone avatar');
    if (!donor) return res.status(404).json({ error: 'No donor profile found. Register as a LifeShare donor!' });

    const familyLinks = await FamilyLink.find({ donorId: donor._id });

    // Calculate days remaining until next eligible donation
    const now = new Date();
    const nextDate = new Date(donor.nextEligibleDate);
    const msRemaining = nextDate - now;
    const daysUntilEligible = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));

    // Fast-Track status check
    const isWithinActiveWindow = donor.lastDonationDate
      ? (now - new Date(donor.lastDonationDate)) <= fastTrackSettings.activeDonationMaxMonths * 30.5 * 24 * 60 * 60 * 1000
      : false;

    const qualifiesForFastTrack = donor.totalDonations >= fastTrackSettings.minDonationsForFastTrack && isWithinActiveWindow;

    res.json({
      success: true,
      donor,
      daysUntilEligible,
      isCurrentlyEligible: daysUntilEligible === 0,
      familyLinks,
      fastTrackStatus: {
        qualified: qualifiesForFastTrack,
        minDonationsRequired: fastTrackSettings.minDonationsForFastTrack,
        activeWindowMonths: fastTrackSettings.activeDonationMaxMonths,
        totalVerifiedDonations: donor.totalDonations,
        benefits: [
          'Blood Bank Processing Fee Waived (₹0)',
          'No Replacement Donor Mandated',
          'Pre-Verified Paperwork Status',
          'Officer Real-Time Fast-Track Alert'
        ]
      }
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/donors/certificate
// @desc    Downloadable official recognition certificate payload
exports.getDonorCertificate = async (req, res, next) => {
  try {
    const donor = await Donor.findOne({ userId: req.user._id }).populate('userId', 'name email phone');
    if (!donor) return res.status(404).json({ error: 'No donor record found.' });

    const certificate = {
      certificateNumber: `SC-CERT-${donor._id.toString().slice(-6).toUpperCase()}`,
      donorName: donor.userId?.name,
      bloodGroup: donor.bloodGroup,
      totalDonations: donor.totalDonations,
      livesImpacted: donor.livesImpacted,
      issuedDate: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
      accreditationBody: 'SmartCare National Voluntary Blood Donation Network',
      complianceNotice: 'Issued in recognition of voluntary, unpaid blood donations under the National Blood Transfusion Council (NBTC) charter. Non-monetary commendation.'
    };

    res.json({ success: true, certificate });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 2. VERIFIED DONATIONS TRACKING (OFFICER)
// ==========================================

// @route   POST /api/donations
exports.recordVerifiedDonation = async (req, res, next) => {
  try {
    const {
      donorId,
      component = 'Packed Red Blood Cells (PRBC)',
      volumeMl = 450,
      hemoglobinGdl = 13.5,
      bloodPressure = '120/80',
      temperatureC = 36.8,
      pulseBpm = 72,
      screeningStatus = 'passed',
      testingLabNotes = '',
      hospitalId
    } = req.body;

    const donor = await Donor.findById(donorId).populate('userId');
    if (!donor) return res.status(404).json({ error: 'Donor not found' });

    // 1. Generate unique Donation and Unit Numbers
    const count = await Donation.countDocuments();
    const donationId = `DON-${(count + 1).toString().padStart(6, '0')}`;
    const unitNumber = `UNT-${donor.bloodGroup.replace('+', 'POS').replace('-', 'NEG')}-${Date.now().toString().slice(-5)}`;

    // Shelf life: PRBC = 42 days, Platelets = 5 days, FFP = 365 days
    let shelfLifeDays = 42;
    if (component === 'Platelets') shelfLifeDays = 5;
    if (component === 'Fresh Frozen Plasma (FFP)') shelfLifeDays = 365;

    const collectionDate = new Date();
    const expiryDate = new Date(Date.now() + shelfLifeDays * 24 * 60 * 60 * 1000);

    // 2. Create Donation Record
    const donation = await Donation.create({
      donationId,
      donorId: donor._id,
      hospitalId: hospitalId || req.user.hospitalId,
      officerId: req.user._id,
      bloodGroup: donor.bloodGroup,
      component,
      volumeMl,
      hemoglobinGdl,
      bloodPressure,
      temperatureC,
      pulseBpm,
      screeningStatus,
      testingLabNotes,
      unitNumber,
      collectionDate,
      expiryDate,
      voluntaryDeclarationAffirmed: true
    });

    // 3. Create Blood Unit into Active Inventory
    await BloodUnit.create({
      unitNumber,
      donationId: donation._id,
      hospitalId: hospitalId || req.user.hospitalId,
      bloodGroup: donor.bloodGroup,
      component,
      volumeMl,
      collectionDate,
      expiryDate,
      status: 'available',
      locationFridge: 'Main Blood Bank Fridge-A'
    });

    // 4. Update Donor stats & award non-monetary badges
    donor.totalDonations += 1;
    donor.livesImpacted = donor.totalDonations * 3;
    donor.lastDonationDate = collectionDate;
    donor.nextEligibleDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days gap
    evaluateBadges(donor);
    await donor.save();

    // 5. Sync to Continuous Health Timeline
    const timelineRecord = await HealthRecord.create({
      patientId: donor.userId._id,
      hospitalId: hospitalId || req.user.hospitalId,
      type: 'blood_donation',
      title: `Voluntary Blood Donation (${donation.component})`,
      date: new Date(),
      aiSummary: `Verified voluntary blood donation of ${donation.volumeMl}ml ${donation.component} at SmartCare Blood Bank. Unit #${unitNumber}. Up to 3 lives saved!`,
      metadata: {
        bloodDonation: {
          donationId,
          unitNumber,
          component: donation.component,
          volumeMl: donation.volumeMl,
          screeningStatus: donation.screeningStatus
        }
      }
    });

    donation.healthRecordId = timelineRecord._id;
    await donation.save();

    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'RECORD_VERIFIED_DONATION',
      resourceType: 'Donation',
      resourceId: donation._id,
      patientId: donor.userId._id,
      details: {
        unitNumber,
        bloodGroup: donor.bloodGroup,
        totalDonations: donor.totalDonations,
        livesImpacted: donor.livesImpacted
      }
    });

    res.status(201).json({
      success: true,
      message: 'Verified voluntary donation recorded. Donor badges & health timeline updated.',
      donation,
      donor: {
        totalDonations: donor.totalDonations,
        livesImpacted: donor.livesImpacted,
        badges: donor.badges
      }
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 3. PUBLIC & HOSPITAL INVENTORY
// ==========================================

// @route   GET /api/blood-inventory/public
exports.getPublicBloodAvailability = async (req, res, next) => {
  try {
    const filter = { status: 'available' };
    if (req.query.hospitalId) {
      filter.hospitalId = req.query.hospitalId;
    }

    const units = await BloodUnit.find(filter)
      .populate('hospitalId', 'name city phone address');

    const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    const standardComponents = [
      'Packed Red Blood Cells (PRBC)',
      'Fresh Frozen Plasma (FFP)',
      'Platelets',
      'Whole Blood'
    ];

    const summary = {};
    bloodGroups.forEach(bg => {
      summary[bg] = {
        totalUnits: 0,
        components: {
          'Whole Blood': 0,
          'Packed Red Blood Cells (PRBC)': 0,
          'Platelets': 0,
          'Fresh Frozen Plasma (FFP)': 0
        }
      };
    });

    const inventoryMap = {};
    bloodGroups.forEach(bg => {
      standardComponents.forEach(comp => {
        inventoryMap[`${bg}__${comp}`] = {
          bloodGroup: bg,
          component: comp,
          unitsAvailable: 0,
          hospitals: []
        };
      });
    });

    units.forEach(u => {
      if (summary[u.bloodGroup]) {
        summary[u.bloodGroup].totalUnits += 1;
        if (summary[u.bloodGroup].components[u.component] !== undefined) {
          summary[u.bloodGroup].components[u.component] += 1;
        }
      }

      const key = `${u.bloodGroup}__${u.component}`;
      if (!inventoryMap[key]) {
        inventoryMap[key] = {
          bloodGroup: u.bloodGroup,
          component: u.component,
          unitsAvailable: 0,
          hospitals: []
        };
      }
      inventoryMap[key].unitsAvailable += 1;

      if (u.hospitalId) {
        const hospId = u.hospitalId._id?.toString() || '';
        const hospName = u.hospitalId.name || 'Network Hospital';
        const existing = inventoryMap[key].hospitals.find(h => h.hospitalId === hospId);
        if (existing) {
          existing.units += 1;
        } else {
          inventoryMap[key].hospitals.push({
            hospitalId: hospId,
            name: hospName,
            city: u.hospitalId.city || '',
            phone: u.hospitalId.phone || '',
            units: 1
          });
        }
      }
    });

    const inventory = Object.values(inventoryMap);

    res.json({
      success: true,
      totalAvailableUnits: units.length,
      inventory,
      bloodGroups: summary
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/blood-inventory/hospital/:hospitalId
exports.getHospitalInventory = async (req, res, next) => {
  try {
    const { hospitalId } = req.params;
    const units = await BloodUnit.find({ hospitalId }).sort({ expiryDate: 1 });

    const expiringSoon = units.filter(u => {
      const daysLeft = (new Date(u.expiryDate) - new Date()) / (1000 * 60 * 60 * 24);
      return daysLeft <= 3 && u.status === 'available';
    });

    res.json({
      success: true,
      totalUnits: units.length,
      expiringSoonCount: expiringSoon.length,
      units
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 4. BLOOD REQUESTS & DONOR FAMILY FAST-TRACK
// ==========================================

// @route   POST /api/blood-requests
exports.createBloodRequest = async (req, res, next) => {
  try {
    const {
      patientId,
      bloodGroup,
      component,
      unitsRequested,
      clinicalUrgency,
      clinicalDiagnosis
    } = req.body;

    const requestCount = await BloodRequest.countDocuments();
    const requestId = `REQ-BLD-${(requestCount + 1).toString().padStart(4, '0')}`;

    // Auto-check donor registry for Donor Family Fast-Track eligibility:
    let isFastTrack = false;
    let fastTrackDetails = null;

    const activeThresholdMs = fastTrackSettings.activeDonationMaxMonths * 30.5 * 24 * 60 * 60 * 1000;
    const now = new Date();

    // 1. Direct Donor Check
    const directDonor = await Donor.findOne({
      userId: patientId,
      totalDonations: { $gte: fastTrackSettings.minDonationsForFastTrack }
    }).populate('userId', 'name');

    if (directDonor && directDonor.lastDonationDate && (now - new Date(directDonor.lastDonationDate)) <= activeThresholdMs) {
      isFastTrack = true;
      fastTrackDetails = {
        donorId: directDonor._id,
        donorName: directDonor.userId?.name || 'Self Donor',
        totalDonations: directDonor.totalDonations,
        lastDonationDate: directDonor.lastDonationDate,
        relationship: 'self'
      };
    } else {
      // 2. Pre-Verified Family Link Check
      const patientUser = await User.findById(patientId);
      const verifiedLink = await FamilyLink.findOne({
        familyMemberName: new RegExp(patientUser?.name, 'i'),
        verificationStatus: 'verified'
      }).populate({
        path: 'donorId',
        populate: { path: 'userId', select: 'name' }
      });

      if (
        verifiedLink &&
        verifiedLink.donorId &&
        verifiedLink.donorId.totalDonations >= fastTrackSettings.minDonationsForFastTrack &&
        verifiedLink.donorId.lastDonationDate &&
        (now - new Date(verifiedLink.donorId.lastDonationDate)) <= activeThresholdMs
      ) {
        isFastTrack = true;
        fastTrackDetails = {
          donorId: verifiedLink.donorId._id,
          donorName: verifiedLink.donorId.userId?.name || 'Family Donor',
          totalDonations: verifiedLink.donorId.totalDonations,
          lastDonationDate: verifiedLink.donorId.lastDonationDate,
          relationship: verifiedLink.relationship,
          familyLinkId: verifiedLink._id
        };
      }
    }

    const unitsNum = Number(unitsRequested) || 1;
    const standardFeePerUnit = 1200;
    const originalFee = standardFeePerUnit * unitsNum;
    const feeWaived = isFastTrack && fastTrackSettings.waiveProcessingFee;
    const finalFee = feeWaived ? 0 : originalFee;

    const bloodRequest = await BloodRequest.create({
      requestId,
      hospitalId: req.user.hospitalId || req.body.hospitalId,
      patientId,
      requestingDoctorId: req.user._id,
      bloodGroup,
      component: component || 'Packed Red Blood Cells (PRBC)',
      unitsRequested: unitsNum,
      clinicalUrgency: clinicalUrgency || 'urgent_surgery',
      clinicalDiagnosis,
      fastTrackApplied: isFastTrack,
      fastTrackDetails: isFastTrack ? fastTrackDetails : undefined,
      fastTrackBenefits: isFastTrack ? {
        feeWaived,
        originalProcessingFeeRupees: originalFee,
        finalProcessingFeeRupees: finalFee,
        replacementDonorWaived: fastTrackSettings.waiveReplacementDonor,
        paperworkPreVerified: fastTrackSettings.preVerifyPaperwork
      } : undefined,
      processingFeeWaived: feeWaived,
      processingFeeAmount: finalFee,
      replacementDonorDemanded: false,
      status: 'pending'
    });

    if (isFastTrack) {
      await logAudit({
        userId: req.user._id,
        userName: req.user.name,
        userRole: req.user.role,
        action: 'APPLY_DONOR_FAST_TRACK',
        resourceType: 'BloodRequest',
        resourceId: bloodRequest._id,
        patientId,
        details: {
          requestId,
          fastTrackDetails,
          originalFee,
          finalFee
        }
      });

      // Socket.IO real-time alert to Blood Bank
      const io = req.app.get('io');
      if (io) {
        io.emit('blood:fast_track_request', {
          requestId: bloodRequest.requestId,
          patientName: req.body.patientName || 'Emergency Patient',
          donorName: fastTrackDetails.donorName,
          bloodGroup: bloodRequest.bloodGroup,
          unitsRequested: bloodRequest.unitsRequested,
          clinicalUrgency: bloodRequest.clinicalUrgency
        });
      }
    }

    res.status(201).json({ success: true, bloodRequest });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/blood-requests
exports.getBloodRequests = async (req, res, next) => {
  try {
    // Allocation Order Rule:
    // 1st: Clinical Urgency ('critical_emergency' > 'urgent_surgery' > 'routine_opd')
    // 2nd: FIFO timestamp (createdAt: 1)
    // Fast-Track status is shown as a badge but DOES NOT bypass more urgent clinical cases
    const requests = await BloodRequest.find()
      .populate('patientId', 'name phone email avatar')
      .populate('hospitalId', 'name city')
      .sort({
        clinicalUrgency: 1,
        createdAt: 1
      });

    res.json({ success: true, count: requests.length, requests });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/blood-requests/:id/allocate
// @desc    Strict clinical urgency allocation rule: urgency first, stock shelf-life next
exports.allocateBloodUnits = async (req, res, next) => {
  try {
    const { unitNumbers } = req.body;
    const request = await BloodRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Blood request not found' });

    const allocatedUnits = await BloodUnit.find({
      unitNumber: { $in: unitNumbers },
      status: 'available'
    });

    if (allocatedUnits.length === 0) {
      return res.status(400).json({ error: 'None of the selected blood units are available in inventory.' });
    }

    // Mark units as reserved / cross-matching
    const unitIds = [];
    for (const u of allocatedUnits) {
      u.status = 'reserved';
      await u.save();
      unitIds.push(u._id);
    }

    request.unitsAllocated = allocatedUnits.length;
    request.allocatedUnitIds = unitIds;
    request.status = 'cross_matching';
    await request.save();

    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'ALLOCATE_BLOOD_UNITS',
      resourceType: 'BloodRequest',
      resourceId: request._id,
      patientId: request.patientId,
      details: {
        allocatedCount: allocatedUnits.length,
        unitNumbers,
        clinicalUrgency: request.clinicalUrgency,
        fastTrackApplied: request.fastTrackApplied
      }
    });

    res.json({
      success: true,
      message: `Units allocated successfully under ${request.clinicalUrgency.replace('_', ' ')} clinical priority. Status: Cross-Matching.`,
      request
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 5. FAMILY MEMBERS REGISTRY
// ==========================================

// @route   POST /api/family-links
exports.linkFamilyMember = async (req, res, next) => {
  try {
    const { familyMemberName, relationship, aadharOrGovIdNumber } = req.body;
    const donor = await Donor.findOne({ userId: req.user._id });
    if (!donor) return res.status(404).json({ error: 'Only registered donors can link family members for Fast-Track.' });

    const existing = await FamilyLink.findOne({ donorId: donor._id, familyMemberName });
    if (existing) return res.status(400).json({ error: 'This family member is already registered under your profile.' });

    const link = await FamilyLink.create({
      donorId: donor._id,
      familyMemberName,
      relationship,
      aadharOrGovIdNumber,
      verificationStatus: 'unverified'
    });

    res.status(201).json({
      success: true,
      message: 'Family link created. Pending Blood Bank Officer verification.',
      familyLink: link
    });
  } catch (error) {
    next(error);
  }
};

// @route   PUT /api/family-links/:id/verify
exports.verifyFamilyLink = async (req, res, next) => {
  try {
    const link = await FamilyLink.findById(req.params.id);
    if (!link) return res.status(404).json({ error: 'Family link record not found.' });

    link.verificationStatus = 'verified';
    link.verifiedByOfficerId = req.user._id;
    link.verifiedAt = new Date();
    await link.save();

    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'VERIFY_FAMILY_LINK',
      resourceType: 'FamilyLink',
      resourceId: link._id,
      details: {
        familyMemberName: link.familyMemberName,
        relationship: link.relationship,
        officer: req.user.name
      }
    });

    res.json({ success: true, familyLink: link });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 6. FAST-TRACK SETTINGS & GOVERNANCE
// ==========================================

// @route   GET /api/fast-track/settings
exports.getFastTrackSettings = async (req, res, next) => {
  try {
    res.json({ success: true, settings: fastTrackSettings });
  } catch (error) {
    next(error);
  }
};

// @route   PUT /api/fast-track/settings
exports.updateFastTrackSettings = async (req, res, next) => {
  try {
    const {
      minDonationsForFastTrack,
      activeDonationMaxMonths,
      waiveProcessingFee,
      waiveReplacementDonor,
      preVerifyPaperwork,
      annualCapPerFamily
    } = req.body;

    if (minDonationsForFastTrack !== undefined) fastTrackSettings.minDonationsForFastTrack = Number(minDonationsForFastTrack);
    if (activeDonationMaxMonths !== undefined) fastTrackSettings.activeDonationMaxMonths = Number(activeDonationMaxMonths);
    if (waiveProcessingFee !== undefined) fastTrackSettings.waiveProcessingFee = Boolean(waiveProcessingFee);
    if (waiveReplacementDonor !== undefined) fastTrackSettings.waiveReplacementDonor = Boolean(waiveReplacementDonor);
    if (preVerifyPaperwork !== undefined) fastTrackSettings.preVerifyPaperwork = Boolean(preVerifyPaperwork);
    if (annualCapPerFamily !== undefined) fastTrackSettings.annualCapPerFamily = Number(annualCapPerFamily);

    res.json({ success: true, message: 'Fast-Track policy settings updated.', settings: fastTrackSettings });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/fast-track/audit-logs
exports.getFastTrackAuditLogs = async (req, res, next) => {
  try {
    const logs = await AuditLog.find({ action: 'APPLY_DONOR_FAST_TRACK' })
      .populate('userId', 'name email role')
      .populate('patientId', 'name phone email')
      .sort({ timestamp: -1 })
      .limit(50);

    res.json({ success: true, count: logs.length, logs });
  } catch (error) {
    next(error);
  }
};
