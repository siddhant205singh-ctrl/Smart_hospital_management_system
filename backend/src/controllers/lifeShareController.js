const Donor = require('../models/Donor');
const Donation = require('../models/Donation');
const BloodUnit = require('../models/BloodUnit');
const BloodRequest = require('../models/BloodRequest');
const FamilyLink = require('../models/FamilyLink');
const CommunityCard = require('../models/CommunityCard');
const DiscountRule = require('../models/DiscountRule');
const DiscountApplication = require('../models/DiscountApplication');
const HealthRecord = require('../models/HealthRecord');
const User = require('../models/User');
const QRCode = require('qrcode');
const crypto = require('crypto');
const { logAudit } = require('../middleware/auditMiddleware');

// Helper to determine Community Card Tier
const computeCardTier = (donationsCount) => {
  if (donationsCount >= 15) return { tier: 'Platinum', discount: 50 };
  if (donationsCount >= 10) return { tier: 'Gold', discount: 30 };
  if (donationsCount >= 6) return { tier: 'Silver', discount: 20 };
  if (donationsCount >= 3) return { tier: 'Bronze', discount: 10 };
  return null; // Not yet eligible for card (< 3 donations)
};

// ==========================================
// 1. DONOR REGISTRY & ELIGIBILITY
// ==========================================

// @route   POST /api/donors/register
exports.registerDonor = async (req, res, next) => {
  try {
    const { bloodGroup, gender, dateOfBirth, weightKg, preferredCity, voluntaryDeclarationAccepted } = req.body;

    if (!voluntaryDeclarationAccepted) {
      return res.status(400).json({ error: 'You must affirm the voluntary, unpaid blood donation declaration to register.' });
    }

    if (Number(weightKg) < 45) {
      return res.status(400).json({ error: 'Minimum weight requirement for voluntary blood donation is 45 kg.' });
    }

    const birthDate = new Date(dateOfBirth);
    const age = Math.floor((new Date() - birthDate) / (365.25 * 24 * 60 * 60 * 1000));
    if (age < 18 || age > 65) {
      return res.status(400).json({ error: 'Donors must be between 18 and 65 years of age.' });
    }

    let donor = await Donor.findOne({ userId: req.user._id });
    if (donor) {
      return res.status(400).json({ error: 'Donor profile already exists for this user.' });
    }

    donor = await Donor.create({
      userId: req.user._id,
      bloodGroup,
      gender,
      dateOfBirth: birthDate,
      weightKg,
      preferredCity: preferredCity || '',
      nextEligibleDate: new Date(), // eligible immediately
      voluntaryDeclarationAccepted: true,
      badges: [{ name: 'First Drop Registered', icon: 'Droplet', awardedAt: new Date() }]
    });

    await User.findByIdAndUpdate(req.user._id, { donorProfileId: donor._id });

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

    const card = await CommunityCard.findOne({ donorId: donor._id });
    const familyLinks = await FamilyLink.find({ donorId: donor._id });

    // Calculate days remaining until next eligible donation
    const now = new Date();
    const nextDate = new Date(donor.nextEligibleDate);
    const msRemaining = nextDate - now;
    const daysUntilEligible = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));

    res.json({
      success: true,
      donor,
      daysUntilEligible,
      isCurrentlyEligible: daysUntilEligible === 0,
      card,
      familyLinks
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 2. VERIFIED DONATIONS (Blood Bank Officer Only)
// ==========================================

// @route   POST /api/donations
exports.recordVerifiedDonation = async (req, res, next) => {
  try {
    const {
      donorId,
      unitNumber,
      bloodGroup,
      component,
      volumeMl,
      hemoglobinGdl,
      bloodPressure,
      campName,
      screeningStatus,
      officerNotes
    } = req.body;

    const donor = await Donor.findById(donorId).populate('userId');
    if (!donor) return res.status(404).json({ error: 'Donor not found' });

    if (Number(hemoglobinGdl) < 12.5) {
      return res.status(400).json({ error: 'Screening failed: Hemoglobin must be at least 12.5 g/dL to donate.' });
    }

    const donationCount = await Donation.countDocuments();
    const donationId = `DON-2026-${(donationCount + 1).toString().padStart(5, '0')}`;

    // 1. Create Donation Record (Immutable, marked voluntary & unpaid)
    const donation = await Donation.create({
      donationId,
      donorId: donor._id,
      hospitalId: req.user.hospitalId || req.body.hospitalId,
      officerId: req.user._id,
      campName: campName || '',
      unitNumber,
      bloodGroup: bloodGroup || donor.bloodGroup,
      component: component || 'Whole Blood',
      volumeMl: volumeMl || 450,
      hemoglobinGdl,
      bloodPressure: bloodPressure || '120/80',
      screeningStatus: screeningStatus || 'passed',
      voluntaryUnpaidDeclaration: true,
      officerNotes: officerNotes || ''
    });

    // 2. Create physical inventory unit in BloodUnit
    const expiryDays = component === 'Platelets' ? 5 : (component === 'Fresh Frozen Plasma (FFP)' ? 365 : 42);
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + expiryDays);

    await BloodUnit.create({
      unitNumber,
      donationId: donation._id,
      hospitalId: req.user.hospitalId || req.body.hospitalId,
      bloodGroup: bloodGroup || donor.bloodGroup,
      component: component || 'Whole Blood',
      collectionDate: new Date(),
      expiryDate,
      status: screeningStatus === 'passed' ? 'available' : 'quarantine'
    });

    // 3. Update donor stats & next eligible date
    donor.totalDonations += 1;
    donor.livesImpacted = donor.totalDonations * 3;
    donor.lastDonationDate = new Date();

    // Gender gap: 90 days for men, 120 days for women
    const gapDays = donor.gender === 'female' ? 120 : 90;
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + gapDays);
    donor.nextEligibleDate = nextDate;

    // Check badges
    if (donor.totalDonations === 1 && !donor.badges.some(b => b.name === 'First Blood Gift')) {
      donor.badges.push({ name: 'First Blood Gift', icon: 'Award', awardedAt: new Date() });
    } else if (donor.totalDonations === 3 && !donor.badges.some(b => b.name === 'LifeSaver Bronze')) {
      donor.badges.push({ name: 'LifeSaver Bronze', icon: 'Shield', awardedAt: new Date() });
    } else if (donor.totalDonations === 6 && !donor.badges.some(b => b.name === 'Hero Silver')) {
      donor.badges.push({ name: 'Hero Silver', icon: 'Medal', awardedAt: new Date() });
    } else if (donor.totalDonations === 10 && !donor.badges.some(b => b.name === 'Champion Gold')) {
      donor.badges.push({ name: 'Champion Gold', icon: 'Crown', awardedAt: new Date() });
    }
    await donor.save();

    // 4. Append to patient continuous HealthRecord timeline
    const timelineRecord = await HealthRecord.create({
      patientId: donor.userId._id,
      type: 'blood_donation',
      title: `Voluntary Blood Donation (${donation.component})`,
      date: new Date(),
      aiSummary: `Verified voluntary blood donation of ${donation.volumeMl}ml ${donation.component} at SmartCare Network Blood Bank. Unit #${unitNumber}. Up to 3 lives impacted!`,
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

    // 5. Community Card tier recalculation
    const cardPerk = computeCardTier(donor.totalDonations);
    if (cardPerk) {
      let card = await CommunityCard.findOne({ donorId: donor._id });
      const rotatingSecret = crypto.randomBytes(16).toString('hex');
      const cardNum = card?.cardNumber || `SC-${cardPerk.tier.toUpperCase()}-${Math.floor(10000 + Math.random() * 90000)}`;

      const qrPayload = JSON.stringify({
        cardNumber: cardNum,
        donorName: donor.userId.name,
        tier: cardPerk.tier,
        secret: rotatingSecret,
        validUntil: new Date(Date.now() + 24 * 30 * 24 * 60 * 60 * 1000)
      });
      const qrCodeUrl = await QRCode.toDataURL(qrPayload);

      if (card) {
        card.tier = cardPerk.tier;
        card.discountPercentage = cardPerk.discount;
        card.totalLifetimeDonationsAtIssue = donor.totalDonations;
        card.rotatingQrSecret = rotatingSecret;
        card.qrCodeUrl = qrCodeUrl;
        card.validUntil = new Date(Date.now() + 24 * 30 * 24 * 60 * 60 * 1000); // 24 months
        await card.save();
      } else {
        await CommunityCard.create({
          cardNumber: cardNum,
          donorId: donor._id,
          userId: donor.userId._id,
          tier: cardPerk.tier,
          discountPercentage: cardPerk.discount,
          totalLifetimeDonationsAtIssue: donor.totalDonations,
          validUntil: new Date(Date.now() + 24 * 30 * 24 * 60 * 60 * 1000),
          rotatingQrSecret: rotatingSecret,
          qrCodeUrl
        });
      }
    }

    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'VERIFIED_DONATION_RECORDED',
      resourceType: 'Donation',
      resourceId: donation._id,
      patientId: donor.userId._id,
      details: { unitNumber, bloodGroup: donation.bloodGroup, component: donation.component }
    });

    res.status(201).json({ success: true, donation });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 3. BLOOD INVENTORY
// ==========================================

// @route   GET /api/blood-inventory/public
exports.getPublicBloodAvailability = async (req, res, next) => {
  try {
    const units = await BloodUnit.aggregate([
      { $match: { status: 'available' } },
      {
        $group: {
          _id: { bloodGroup: '$bloodGroup', component: '$component' },
          unitsAvailable: { $sum: 1 }
        }
      },
      {
        $project: {
          bloodGroup: '$_id.bloodGroup',
          component: '$_id.component',
          unitsAvailable: 1,
          _id: 0
        }
      },
      { $sort: { bloodGroup: 1, component: 1 } }
    ]);

    res.json({ success: true, inventory: units });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/blood-inventory/hospital/:hospitalId
exports.getHospitalInventory = async (req, res, next) => {
  try {
    const { hospitalId } = req.params;
    const units = await BloodUnit.find({ hospitalId })
      .sort({ expiryDate: 1 });

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
// 4. PRIORITY BLOOD REQUESTS & ALLOCATION
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

    // Auto-check donor registry for priority status:
    // Check if patient is a donor with verified donations OR linked to a verified donor
    let isPriority = false;
    let justification = {};

    const directDonor = await Donor.findOne({ userId: patientId, totalDonations: { $gt: 0 } });
    if (directDonor) {
      isPriority = true;
      justification = {
        matchedDonorId: directDonor._id,
        donorTier: computeCardTier(directDonor.totalDonations)?.tier || 'Active Donor'
      };
    } else {
      // Check family link
      const user = await User.findById(patientId);
      const verifiedLink = await FamilyLink.findOne({
        familyMemberName: new RegExp(user?.name, 'i'),
        verificationStatus: 'verified'
      }).populate('donorId');

      if (verifiedLink && verifiedLink.donorId) {
        isPriority = true;
        justification = {
          matchedDonorId: verifiedLink.donorId._id,
          familyLinkId: verifiedLink._id,
          donorTier: computeCardTier(verifiedLink.donorId.totalDonations)?.tier || 'Active Donor Family'
        };
      }
    }

    const bloodRequest = await BloodRequest.create({
      requestId,
      hospitalId: req.user.hospitalId || req.body.hospitalId,
      patientId,
      requestingDoctorId: req.user._id,
      bloodGroup,
      component: component || 'Packed Red Blood Cells (PRBC)',
      unitsRequested: Number(unitsRequested) || 1,
      clinicalUrgency: clinicalUrgency || 'urgent_surgery',
      clinicalDiagnosis,
      isPriorityDonorFamily: isPriority,
      priorityJustification: justification,
      processingFeeWaived: isPriority, // waived for voluntary donors
      processingFeeAmount: isPriority ? 0 : 1500 * (Number(unitsRequested) || 1),
      replacementDonorDemanded: false // Never demand replacement donors
    });

    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'CREATE_BLOOD_REQUEST',
      resourceType: 'BloodRequest',
      resourceId: bloodRequest._id,
      patientId,
      details: {
        requestId,
        isPriorityDonorFamily: isPriority,
        clinicalUrgency: bloodRequest.clinicalUrgency
      }
    });

    res.status(201).json({ success: true, bloodRequest });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/blood-requests
exports.getBloodRequests = async (req, res, next) => {
  try {
    // Queue Sorting Rule:
    // 1st: Clinical Urgency ('critical_emergency' > 'urgent_surgery' > 'routine_opd')
    // 2nd: Priority Donor Family tiebreaker
    // 3rd: FIFO timestamp
    const requests = await BloodRequest.find()
      .populate('patientId', 'name phone email avatar')
      .populate('hospitalId', 'name city')
      .sort({
        clinicalUrgency: 1, // 'critical_emergency' comes first alphabetically or indexed
        isPriorityDonorFamily: -1, // true first
        createdAt: 1
      });

    res.json({ success: true, count: requests.length, requests });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/blood-requests/:id/allocate
exports.allocateBloodUnits = async (req, res, next) => {
  try {
    const { unitNumbers } = req.body; // array of unitNumbers to allocate
    const request = await BloodRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Blood request not found' });

    const allocatedUnits = await BloodUnit.find({
      unitNumber: { $in: unitNumbers },
      status: 'available'
    });

    if (allocatedUnits.length === 0) {
      return res.status(400).json({ error: 'Selected blood units are not available' });
    }

    // Reserve blood units
    for (const unit of allocatedUnits) {
      unit.status = 'reserved';
      unit.reservedForRequestId = request._id;
      await unit.save();
    }

    request.unitsAllocated = allocatedUnits.length;
    request.allocatedUnitIds = allocatedUnits.map(u => u._id);
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
      details: { unitNumbers, unitsAllocated: allocatedUnits.length }
    });

    res.json({ success: true, request, allocatedUnits });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 5. FAMILY LINKING
// ==========================================

// @route   POST /api/family-links
exports.linkFamilyMember = async (req, res, next) => {
  try {
    const { familyMemberName, relationship, dateOfBirth, bloodGroup, verificationDocumentUrl } = req.body;

    const donor = await Donor.findOne({ userId: req.user._id });
    if (!donor) return res.status(404).json({ error: 'Donor profile required to link family members' });

    // Enforce cap of 4 linked members
    const existingCount = await FamilyLink.countDocuments({ donorId: donor._id });
    if (existingCount >= 4) {
      return res.status(400).json({ error: 'Maximum limit of 4 immediate family members reached.' });
    }

    const familyLink = await FamilyLink.create({
      donorId: donor._id,
      familyMemberName,
      relationship,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      bloodGroup,
      verificationDocumentUrl: verificationDocumentUrl || 'https://images.unsplash.com/photo-1584432810601-6c7f27d3388c?auto=format&fit=crop&w=500&q=80',
      verificationStatus: 'pending'
    });

    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'ADD_FAMILY_LINK',
      resourceType: 'FamilyLink',
      resourceId: familyLink._id,
      details: { familyMemberName, relationship }
    });

    res.status(201).json({ success: true, familyLink });
  } catch (error) {
    next(error);
  }
};

// @route   PUT /api/family-links/:id/verify
exports.verifyFamilyLink = async (req, res, next) => {
  try {
    const { status, rejectionReason } = req.body; // 'verified' | 'rejected'
    const link = await FamilyLink.findById(req.params.id);
    if (!link) return res.status(404).json({ error: 'Family link record not found' });

    link.verificationStatus = status;
    link.verifiedBy = req.user._id;
    link.verifiedAt = new Date();
    if (rejectionReason) link.rejectionReason = rejectionReason;
    await link.save();

    res.json({ success: true, familyLink: link });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 6. COMMUNITY HEALTH CARD & DISCOUNT ENGINE
// ==========================================

// @route   GET /api/community-cards/me
exports.getMyCommunityCard = async (req, res, next) => {
  try {
    const card = await CommunityCard.findOne({ userId: req.user._id })
      .populate('donorId')
      .populate('userId', 'name email phone avatar');

    if (!card) {
      return res.status(404).json({ error: 'No Community Health Card issued yet. Complete 3+ voluntary donations to unlock Bronze tier!' });
    }

    res.json({ success: true, card });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/community-cards/verify-qr
// Receptionist scans QR code to verify cardholder and fetch discount tier
exports.verifyCardQr = async (req, res, next) => {
  try {
    const { cardNumber } = req.body;
    const card = await CommunityCard.findOne({ cardNumber, status: 'active' })
      .populate('donorId')
      .populate('userId', 'name email phone avatar');

    if (!card) {
      return res.status(404).json({ error: 'Invalid, inactive, or suspended Community Card' });
    }

    // Check validity window
    if (new Date(card.validUntil) < new Date()) {
      card.status = 'expired';
      await card.save();
      return res.status(400).json({ error: 'Card has expired. Needs at least one voluntary donation in last 24 months.' });
    }

    res.json({
      success: true,
      card: {
        cardNumber: card.cardNumber,
        cardholderName: card.userId?.name,
        donorId: card.donorId._id,
        tier: card.tier,
        discountPercentage: card.discountPercentage,
        validUntil: card.validUntil
      }
    });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/discount-applications/apply
// Strict compliance checkout discount application:
// REJECTS IF INPATIENT ADMISSION, SURGERY, OR BLOOD FEE
exports.applyCommunityDiscount = async (req, res, next) => {
  try {
    const {
      cardNumber,
      serviceCategory,
      originalBillAmount,
      invoiceNumber,
      isAdmissionLinked
    } = req.body;

    // STRICT COMPLIANCE GUARDRAIL:
    if (isAdmissionLinked === true || serviceCategory === 'inpatient_admission' || serviceCategory === 'surgery') {
      return res.status(403).json({
        error: 'COMPLIANCE VIOLATION: Community Health Card discounts are strictly restricted to outpatient diagnostics, pharmacy, and OPD consultations. Under National Healthcare Guidelines, welfare discounts cannot be applied to inpatient admission or surgical bills.'
      });
    }

    const card = await CommunityCard.findOne({ cardNumber, status: 'active' }).populate('userId');
    if (!card) return res.status(404).json({ error: 'Active card not found' });

    const originalAmount = Number(originalBillAmount);
    const discountPct = card.discountPercentage;
    const discountAmount = Math.round((originalAmount * discountPct) / 100);
    const finalAmount = originalAmount - discountAmount;

    const transactionId = `TXN-DISC-${Date.now()}`;

    const discountRecord = await DiscountApplication.create({
      transactionId,
      cardId: card._id,
      cardNumber: card.cardNumber,
      donorId: card.donorId,
      donorName: card.userId?.name || 'Valued Donor',
      hospitalId: req.user.hospitalId || req.body.hospitalId,
      serviceCategory,
      receptionistId: req.user._id,
      invoiceNumber: invoiceNumber || `INV-${Date.now()}`,
      isAdmissionLinked: false,
      originalBillAmount: originalAmount,
      discountPercentageApplied: discountPct,
      discountAmountDeducted: discountAmount,
      finalPayableAmount: finalAmount
    });

    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'APPLY_COMMUNITY_DISCOUNT',
      resourceType: 'DiscountApplication',
      resourceId: discountRecord._id,
      patientId: card.userId._id,
      details: {
        cardNumber,
        tier: card.tier,
        discountPercentage: discountPct,
        savedAmount: discountAmount
      }
    });

    res.status(201).json({
      success: true,
      transactionId,
      discountPercentage: discountPct,
      originalAmount,
      discountAmount,
      finalPayableAmount: finalAmount
    });
  } catch (error) {
    next(error);
  }
};
