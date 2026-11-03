const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Hospital = require('../models/Hospital');
const Donor = require('../models/Donor');
const ApprovalRequest = require('../models/ApprovalRequest');
const VerificationDocument = require('../models/VerificationDocument');
const OtpToken = require('../models/OtpToken');
const { 
  generateAccessToken, 
  createAndStoreRefreshToken, 
  rotateRefreshToken, 
  revokeRefreshToken, 
  revokeAllUserSessions 
} = require('../utils/tokenUtils');
const { generateAndDispatchOtp, verifyOtpCode } = require('../utils/otpUtils');
const { validatePasswordPolicy } = require('../utils/passwordPolicy');
const { recordFailedLogin, resetFailedLogins } = require('../middleware/lockoutMiddleware');
const { logAudit } = require('../middleware/auditMiddleware');
const { sendWelcomeEmail, sendApplicationSubmittedEmail } = require('../services/emailService');

// Free/public email domain list for organization check
const FREE_EMAIL_DOMAINS = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com', 'mail.com'];

/**
 * Helper to build clean user response payload
 */
const buildUserPayload = async (user) => {
  const donorProfile = await Donor.findOne({ userId: user._id });
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    hospitalId: user.hospitalId,
    avatar: user.avatar,
    preferredLanguage: user.preferredLanguage,
    accessibility: user.accessibility,
    familyMembers: user.familyMembers,
    twoFactorEnabled: user.twoFactorEnabled,
    donorProfile: donorProfile ? {
      id: donorProfile._id,
      bloodGroup: donorProfile.bloodGroup,
      totalDonations: donorProfile.totalDonations,
      status: donorProfile.status,
      nextEligibleDate: donorProfile.nextEligibleDate
    } : null
  };
};

// ==========================================
// 1. REGISTRATION CONTROLLERS
// ==========================================

/**
 * @route   POST /api/auth/register/patient
 * @desc    Patient self-registration -> PENDING_EMAIL_VERIFICATION -> Dispatches OTP
 */
exports.registerPatient = async (req, res, next) => {
  try {
    const { name, email, phone, dateOfBirth, gender, password, confirmPassword, consent } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ error: 'Please provide full name, email, phone, and password.' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    const policyCheck = validatePasswordPolicy(password);
    if (!policyCheck.valid) {
      return res.status(400).json({ error: policyCheck.errors[0], allErrors: policyCheck.errors });
    }

    const normalizedEmail = email.toLowerCase().trim();
    let existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      // If user already active or pending approval, return generic message to prevent email enumeration
      if (existingUser.status === 'active' || existingUser.status === 'pending_approval') {
        return res.status(200).json({
          success: true,
          message: 'If your account is eligible, a 6-digit verification code has been dispatched to your email.',
          email: normalizedEmail
        });
      }

      // If pending email verification, update details and re-dispatch OTP
      existingUser.name = name.trim();
      existingUser.phone = phone.trim();
      existingUser.password = password; // Hashed by pre-save
      if (gender) existingUser.gender = gender;
      if (dateOfBirth) existingUser.dateOfBirth = new Date(dateOfBirth);
      await existingUser.save();
    } else {
      existingUser = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        phone: phone.trim(),
        password,
        role: 'patient',
        status: 'pending_email_verification',
        gender: gender || undefined,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined
      });
    }

    // Dispatch OTP
    const otpResult = await generateAndDispatchOtp({
      email: normalizedEmail,
      userId: existingUser._id,
      purpose: 'verify_email',
      name: existingUser.name,
      ipAddress: req.ip
    });

    if (!otpResult.success && otpResult.cooldown) {
      return res.status(429).json({ error: otpResult.error, waitSeconds: otpResult.waitSeconds });
    }

    await logAudit({
      userId: existingUser._id,
      userName: existingUser.name,
      userRole: 'patient',
      action: 'PATIENT_SIGNUP_INITIATED',
      resourceType: 'User',
      resourceId: existingUser._id,
      details: { email: normalizedEmail }
    });

    res.status(201).json({
      success: true,
      message: 'Registration initiated. A 6-digit verification code has been dispatched to your email.',
      email: normalizedEmail,
      role: 'patient',
      devOtpCode: otpResult.devOtpCode // assist local testing
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/auth/register/doctor
 * @desc    Doctor registration with credential documents -> PENDING_EMAIL_VERIFICATION
 */
exports.registerDoctor = async (req, res, next) => {
  try {
    const {
      name,
      email,
      phone,
      medicalCouncilRegNumber,
      councilState,
      qualifications,
      specialization,
      experienceYears,
      hospitalId,
      password,
      confirmPassword
    } = req.body;

    if (!name || !email || !phone || !password || !medicalCouncilRegNumber || !specialization || !hospitalId) {
      return res.status(400).json({
        error: 'Please provide all required fields: name, email, phone, medical council registration number, specialization, hospital affiliation, and password.'
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    const policyCheck = validatePasswordPolicy(password);
    if (!policyCheck.valid) {
      return res.status(400).json({ error: policyCheck.errors[0], allErrors: policyCheck.errors });
    }

    // Verify uniqueness of medical council registration
    const existingDoctorReg = await Doctor.findOne({ 
      medicalCouncilRegNumber: medicalCouncilRegNumber.trim(),
      approvalStatus: { $in: ['pending', 'approved'] }
    });
    if (existingDoctorReg) {
      return res.status(400).json({
        error: 'A doctor account with this Medical Council Registration Number already exists or is under verification.'
      });
    }

    const files = req.files || {};
    if (!files.gov_photo_id || !files.medical_degree || !files.council_registration_cert) {
      return res.status(400).json({
        error: 'Please upload all 3 required documents: Government Photo ID, Medical Degree Certificate, and Council Registration Certificate.'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    let user = await User.findOne({ email: normalizedEmail });

    if (user && user.status === 'active') {
      return res.status(400).json({ error: 'An active account with this email address already exists.' });
    }

    if (user && user.status === 'pending_email_verification') {
      user.name = name.trim();
      user.phone = phone.trim();
      user.password = password;
      user.role = 'doctor';
      user.hospitalId = hospitalId;
      await user.save();
    } else {
      user = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        phone: phone.trim(),
        password,
        role: 'doctor',
        status: 'pending_email_verification',
        hospitalId
      });
    }

    // Create VerificationDocument entries
    const docKeys = ['gov_photo_id', 'medical_degree', 'council_registration_cert'];
    const documentIds = [];

    for (const key of docKeys) {
      const file = files[key][0];
      const doc = await VerificationDocument.create({
        userId: user._id,
        role: 'doctor',
        documentType: key,
        fileName: file.originalname,
        filePath: file.path,
        fileMimeType: file.mimetype,
        fileSizeBytes: file.size,
        status: 'pending'
      });
      documentIds.push(doc._id);
    }

    // Parse qualifications if provided as JSON string or text
    let parsedQuals = [];
    if (typeof qualifications === 'string') {
      try {
        parsedQuals = JSON.parse(qualifications);
      } catch (e) {
        parsedQuals = [{ degree: qualifications, institution: 'Medical University', year: new Date().getFullYear() }];
      }
    } else if (Array.isArray(qualifications)) {
      parsedQuals = qualifications;
    }

    // Create ApprovalRequest
    const approvalRequest = await ApprovalRequest.create({
      applicantId: user._id,
      applicantRole: 'doctor',
      hospitalId,
      professionalDetails: {
        medicalCouncilRegNumber: medicalCouncilRegNumber.trim(),
        councilState: councilState || 'National',
        specialization: specialization.trim(),
        experienceYears: Number(experienceYears) || 1,
        qualifications: parsedQuals
      },
      documentIds,
      status: 'pending'
    });

    user.currentApprovalRequestId = approvalRequest._id;
    await user.save();

    // Create or update doctor record
    await Doctor.findOneAndUpdate(
      { userId: user._id },
      {
        userId: user._id,
        name: user.name,
        specialization: specialization.trim(),
        hospitalId,
        experienceYears: Number(experienceYears) || 1,
        medicalCouncilRegNumber: medicalCouncilRegNumber.trim(),
        councilState: councilState || 'National',
        approvalStatus: 'pending',
        isVerified: false,
        verificationDocuments: documentIds
      },
      { upsert: true, new: true }
    );

    // Send email verification OTP
    const otpResult = await generateAndDispatchOtp({
      email: normalizedEmail,
      userId: user._id,
      purpose: 'verify_email',
      name: user.name,
      ipAddress: req.ip
    });

    res.status(201).json({
      success: true,
      message: 'Doctor application registered. A verification code has been dispatched to your email.',
      email: normalizedEmail,
      role: 'doctor',
      devOtpCode: otpResult.devOtpCode
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/auth/register/hospital-admin
 * @desc    Hospital Admin registration -> Super Admin verification
 */
exports.registerHospitalAdmin = async (req, res, next) => {
  try {
    const {
      name,
      email,
      phone,
      designation,
      hospitalName,
      street,
      city,
      state,
      zip,
      licenseNumber,
      bedsCount,
      hasEmergencyDept,
      password,
      confirmPassword
    } = req.body;

    if (!name || !email || !phone || !hospitalName || !licenseNumber || !password) {
      return res.status(400).json({
        error: 'Please provide all required fields: name, official email, phone, hospital name, license number, and password.'
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    const policyCheck = validatePasswordPolicy(password);
    if (!policyCheck.valid) {
      return res.status(400).json({ error: policyCheck.errors[0], allErrors: policyCheck.errors });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const domain = normalizedEmail.split('@')[1];
    const isFreeProvider = FREE_EMAIL_DOMAINS.includes(domain);

    const files = req.files || {};
    if (!files.hospital_license || !files.authorization_letter) {
      return res.status(400).json({
        error: 'Please upload both required documents: Hospital Registration/License Document and Authorization Letter.'
      });
    }

    let user = await User.findOne({ email: normalizedEmail });
    if (user && user.status === 'active') {
      return res.status(400).json({ error: 'An active account with this email address already exists.' });
    }

    // Create pending Hospital record
    const hospital = await Hospital.create({
      name: hospitalName.trim(),
      city: city || 'New Delhi',
      phone: phone.trim(),
      emergencyContact: '108',
      address: {
        street: street || 'Main Road',
        city: city || 'New Delhi',
        state: state || 'Delhi',
        zip: zip || '110001'
      },
      licenseNumber: licenseNumber.trim(),
      bedsCount: Number(bedsCount) || 50,
      emergencyAvailable: String(hasEmergencyDept) === 'true',
      approvalStatus: 'pending',
      isVerified: false
    });

    if (user && user.status === 'pending_email_verification') {
      user.name = name.trim();
      user.phone = phone.trim();
      user.password = password;
      user.role = 'hospital_admin';
      user.hospitalId = hospital._id;
      await user.save();
    } else {
      user = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        phone: phone.trim(),
        password,
        role: 'hospital_admin',
        status: 'pending_email_verification',
        hospitalId: hospital._id
      });
    }

    hospital.adminUserIds = [user._id];
    await hospital.save();

    // Create VerificationDocuments
    const docKeys = ['hospital_license', 'authorization_letter'];
    const documentIds = [];
    for (const key of docKeys) {
      const file = files[key][0];
      const doc = await VerificationDocument.create({
        userId: user._id,
        role: 'hospital_admin',
        documentType: key,
        fileName: file.originalname,
        filePath: file.path,
        fileMimeType: file.mimetype,
        fileSizeBytes: file.size,
        status: 'pending'
      });
      documentIds.push(doc._id);
    }

    // Create ApprovalRequest for Super Admin
    const approvalRequest = await ApprovalRequest.create({
      applicantId: user._id,
      applicantRole: 'hospital_admin',
      hospitalId: hospital._id,
      hospitalDetails: {
        name: hospitalName.trim(),
        city: city || '',
        state: state || '',
        street: street || '',
        zip: zip || '',
        licenseNumber: licenseNumber.trim(),
        bedsCount: Number(bedsCount) || 50,
        hasEmergencyDept: String(hasEmergencyDept) === 'true'
      },
      documentIds,
      status: 'pending'
    });

    user.currentApprovalRequestId = approvalRequest._id;
    await user.save();

    // Dispatch verification OTP
    const otpResult = await generateAndDispatchOtp({
      email: normalizedEmail,
      userId: user._id,
      purpose: 'verify_email',
      name: user.name,
      ipAddress: req.ip
    });

    res.status(201).json({
      success: true,
      message: 'Hospital Admin application registered. A verification code has been dispatched to your work email.',
      email: normalizedEmail,
      role: 'hospital_admin',
      isFreeProviderWarning: isFreeProvider ? 'Notice: You used a public email domain. Official hospital institutional emails are preferred for faster verification.' : null,
      devOtpCode: otpResult.devOtpCode
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/auth/register/blood-bank-officer
 * @desc    Blood Bank Officer registration -> Hospital Admin verification
 */
exports.registerBloodBankOfficer = async (req, res, next) => {
  try {
    const {
      name,
      email,
      phone,
      bloodBankLicenseNumber,
      designation,
      hospitalId,
      qualification,
      password,
      confirmPassword
    } = req.body;

    if (!name || !email || !phone || !bloodBankLicenseNumber || !hospitalId || !password) {
      return res.status(400).json({
        error: 'Please provide all required fields: name, email, phone, blood bank license number, hospital affiliation, and password.'
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    const policyCheck = validatePasswordPolicy(password);
    if (!policyCheck.valid) {
      return res.status(400).json({ error: policyCheck.errors[0], allErrors: policyCheck.errors });
    }

    const files = req.files || {};
    if (!files.gov_photo_id || !files.authorization_letter) {
      return res.status(400).json({
        error: 'Please upload Government Photo ID and Appointment/Authorization Letter.'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    let user = await User.findOne({ email: normalizedEmail });

    if (user && user.status === 'active') {
      return res.status(400).json({ error: 'An active account with this email address already exists.' });
    }

    if (user && user.status === 'pending_email_verification') {
      user.name = name.trim();
      user.phone = phone.trim();
      user.password = password;
      user.role = 'blood_bank_officer';
      user.hospitalId = hospitalId;
      await user.save();
    } else {
      user = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        phone: phone.trim(),
        password,
        role: 'blood_bank_officer',
        status: 'pending_email_verification',
        hospitalId
      });
    }

    // Save documents
    const docKeys = ['gov_photo_id', 'authorization_letter', 'qualification_proof'];
    const documentIds = [];
    for (const key of docKeys) {
      if (files[key] && files[key][0]) {
        const file = files[key][0];
        const doc = await VerificationDocument.create({
          userId: user._id,
          role: 'blood_bank_officer',
          documentType: key,
          fileName: file.originalname,
          filePath: file.path,
          fileMimeType: file.mimetype,
          fileSizeBytes: file.size,
          status: 'pending'
        });
        documentIds.push(doc._id);
      }
    }

    // Create ApprovalRequest
    const approvalRequest = await ApprovalRequest.create({
      applicantId: user._id,
      applicantRole: 'blood_bank_officer',
      hospitalId,
      professionalDetails: {
        bloodBankLicenseNumber: bloodBankLicenseNumber.trim(),
        designation: designation || 'Blood Bank Officer',
        qualifications: [{ degree: qualification || 'Medical Lab Technology', institution: 'Council', year: new Date().getFullYear() }]
      },
      documentIds,
      status: 'pending'
    });

    user.currentApprovalRequestId = approvalRequest._id;
    await user.save();

    // Dispatch verification OTP
    const otpResult = await generateAndDispatchOtp({
      email: normalizedEmail,
      userId: user._id,
      purpose: 'verify_email',
      name: user.name,
      ipAddress: req.ip
    });

    res.status(201).json({
      success: true,
      message: 'Blood Bank Officer application registered. A verification code has been dispatched to your email.',
      email: normalizedEmail,
      role: 'blood_bank_officer',
      devOtpCode: otpResult.devOtpCode
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Legacy @route POST /api/auth/register (backward compatibility for patient registration)
 */
exports.register = async (req, res, next) => {
  return exports.registerPatient(req, res, next);
};

// ==========================================
// 2. EMAIL OTP VERIFICATION & RESEND
// ==========================================

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify 6-digit email OTP. If Patient -> ACTIVE. If Professional -> PENDING_APPROVAL.
 */
exports.verifyEmail = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Please provide your email address and 6-digit verification code.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. If user is already verified and active, log them in or report status directly
    const user = await User.findOne({ email: normalizedEmail }).populate('hospitalId');
    if (!user) {
      return res.status(404).json({ error: 'User account not found' });
    }

    if (user.emailVerifiedAt) {
      if (user.role === 'patient') {
        const accessToken = generateAccessToken(user._id, user.role);
        const refreshToken = await createAndStoreRefreshToken({
          userId: user._id,
          deviceInfo: req.headers['user-agent'] || 'Web Browser',
          ipAddress: req.ip
        });
        const userPayload = await buildUserPayload(user);
        return res.json({
          success: true,
          status: 'active',
          message: 'Email is already verified! Welcome to SmartCare.',
          user: userPayload,
          accessToken,
          refreshToken
        });
      } else {
        return res.json({
          success: true,
          status: user.status || 'pending_approval',
          message: 'Email is already verified! Your credential application is currently under administrative verification.',
          user: {
            id: user._id,
            email: user.email,
            name: user.name,
            role: user.role,
            status: user.status || 'pending_approval'
          }
        });
      }
    }

    // 2. Verify OTP
    const verification = await verifyOtpCode({
      email: normalizedEmail,
      otp,
      purpose: 'verify_email'
    });

    if (!verification.success) {
      return res.status(400).json({
        error: verification.error,
        attemptsRemaining: verification.attemptsRemaining,
        expired: verification.expired,
        locked: verification.locked
      });
    }

    user.emailVerifiedAt = new Date();

    // Patient: Immediate activation
    if (user.role === 'patient') {
      user.status = 'active';
      await user.save();

      // Issue access and rotating refresh token
      const accessToken = generateAccessToken(user._id, user.role);
      const refreshToken = await createAndStoreRefreshToken({
        userId: user._id,
        deviceInfo: req.headers['user-agent'] || 'Web Browser',
        ipAddress: req.ip
      });

      // Send Welcome Email (safely guarded)
      try {
        await sendWelcomeEmail({
          to: user.email,
          name: user.name,
          loginUrl: `${process.env.CLIENT_URL || 'http://localhost:5173'}/login`
        });
      } catch (mailErr) {
        console.warn('[AuthController] Welcome email warning:', mailErr.message);
      }

      await logAudit({
        userId: user._id,
        userName: user.name,
        userRole: user.role,
        action: 'EMAIL_VERIFIED_PATIENT_ACTIVATED',
        resourceType: 'User',
        resourceId: user._id
      });

      const userPayload = await buildUserPayload(user);

      return res.json({
        success: true,
        status: 'active',
        message: 'Email verified successfully! Welcome to SmartCare.',
        user: userPayload,
        accessToken,
        refreshToken
      });
    }

    // Professional roles (doctor, hospital_admin, blood_bank_officer) -> Transition to PENDING_APPROVAL
    user.status = 'pending_approval';
    await user.save();

    try {
      await sendApplicationSubmittedEmail({
        to: user.email,
        name: user.name,
        role: user.role
      });
    } catch (mailErr) {
      console.warn('[AuthController] Application submitted email warning:', mailErr.message);
    }

    await logAudit({
      userId: user._id,
      userName: user.name,
      userRole: user.role,
      action: 'EMAIL_VERIFIED_PENDING_APPROVAL',
      resourceType: 'User',
      resourceId: user._id
    });

    res.json({
      success: true,
      status: 'pending_approval',
      message: 'Email verified! Your credential application has been submitted for administrative verification.',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: 'pending_approval'
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/auth/resend-otp
 * @desc    Resend OTP with 60-second cooldown & generic response
 */
exports.resendOtp = async (req, res, next) => {
  try {
    const { email, purpose = 'verify_email' } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    // Always send generic message to avoid email enumeration
    if (!user) {
      return res.json({
        success: true,
        message: 'If an account exists for this email, a new verification code has been dispatched.'
      });
    }

    const otpResult = await generateAndDispatchOtp({
      email: normalizedEmail,
      userId: user._id,
      purpose,
      name: user.name,
      ipAddress: req.ip
    });

    if (!otpResult.success && otpResult.cooldown) {
      return res.status(429).json({
        error: otpResult.error,
        cooldown: true,
        waitSeconds: otpResult.waitSeconds
      });
    }

    res.json({
      success: true,
      message: 'If an account exists for this email, a new verification code has been dispatched.',
      cooldownSeconds: 60,
      devOtpCode: otpResult.devOtpCode
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/auth/latest-otp
 * @desc    Fetch active OTP for development testing and on-screen verification assistant
 */
exports.getLatestOtp = async (req, res, next) => {
  try {
    const email = (req.query.email || '').toLowerCase().trim();
    const purpose = req.query.purpose || 'verify_email';

    if (!email) {
      return res.status(400).json({ error: 'Email parameter is required.' });
    }

    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Dev assistant endpoint is disabled in production.' });
    }

    const tokenDoc = await OtpToken.findOne({
      email,
      purpose,
      isUsed: false,
      expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 });

    if (!tokenDoc || !tokenDoc.devPlainOtp) {
      return res.json({ success: false, message: 'No active verification code found for this email.' });
    }

    res.json({
      success: true,
      otp: tokenDoc.devPlainOtp,
      expiresAt: tokenDoc.expiresAt
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 3. LOGIN & 2FA CONTROLLERS
// ==========================================

/**
 * @route   POST /api/auth/login
 * @desc    Authenticates credentials, checks account status lifecycle, enforces 2FA if enabled
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const ipAddress = req.ip || req.connection?.remoteAddress || '127.0.0.1';

    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide email and password' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail }).populate('hospitalId');

    if (!user) {
      const lockoutStatus = await recordFailedLogin(normalizedEmail, ipAddress);
      return res.status(401).json({
        error: 'Invalid email or password.',
        attemptsRemaining: lockoutStatus.attemptsRemaining
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      const lockoutStatus = await recordFailedLogin(normalizedEmail, ipAddress);
      return res.status(401).json({
        error: 'Invalid email or password.',
        attemptsRemaining: lockoutStatus.attemptsRemaining
      });
    }

    // Credentials match -> Reset failed attempts
    await resetFailedLogins(normalizedEmail, ipAddress);

    // ==========================================
    // Check Account Status Lifecycle
    // ==========================================
    if (user.status === 'pending_email_verification') {
      return res.status(403).json({
        error: 'Please verify your email address to log in. A 6-digit verification code has been sent to your email.',
        status: 'pending_email_verification',
        email: user.email,
        role: user.role
      });
    }

    if (user.status === 'pending_approval') {
      return res.status(403).json({
        error: 'Your application is currently under administrative credential review. You will receive an email once approved.',
        status: 'pending_approval',
        email: user.email,
        role: user.role
      });
    }

    if (user.status === 'rejected') {
      return res.status(403).json({
        error: 'Your credential application was not approved.',
        status: 'rejected',
        email: user.email,
        role: user.role,
        rejectionReason: user.rejectionReason || 'Document verification could not be completed.',
        canResubmit: true
      });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({
        error: 'This account has been suspended by system administration. Please contact support.',
        status: 'suspended',
        email: user.email
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        error: `Account is not active (Status: ${user.status}).`,
        status: user.status
      });
    }

    // ==========================================
    // Check Two-Factor Authentication (2FA)
    // ==========================================
    if (user.twoFactorEnabled) {
      const otpResult = await generateAndDispatchOtp({
        email: user.email,
        userId: user._id,
        purpose: 'login_2fa',
        name: user.name,
        ipAddress
      });

      return res.json({
        success: true,
        requires2FA: true,
        email: user.email,
        message: 'Two-Factor Authentication is enabled. A 6-digit code has been dispatched to your email.',
        devOtpCode: otpResult.devOtpCode
      });
    }

    // Standard Login: Issue tokens
    user.lastLoginAt = new Date();
    user.lastLoginIp = ipAddress;
    await user.save();

    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = await createAndStoreRefreshToken({
      userId: user._id,
      deviceInfo: req.headers['user-agent'] || 'Web Browser',
      ipAddress
    });

    await logAudit({
      userId: user._id,
      userName: user.name,
      userRole: user.role,
      action: 'USER_LOGIN_SUCCESS',
      resourceType: 'User',
      resourceId: user._id
    });

    const userPayload = await buildUserPayload(user);

    res.json({
      success: true,
      user: userPayload,
      accessToken,
      refreshToken
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/auth/login/verify-2fa
 * @desc    Verify 2FA OTP and complete login
 */
exports.verify2faLogin = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const ipAddress = req.ip || req.connection?.remoteAddress || '127.0.0.1';

    if (!email || !otp) {
      return res.status(400).json({ error: 'Please provide email and 2FA verification code' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const verification = await verifyOtpCode({
      email: normalizedEmail,
      otp,
      purpose: 'login_2fa'
    });

    if (!verification.success) {
      return res.status(400).json({
        error: verification.error,
        attemptsRemaining: verification.attemptsRemaining
      });
    }

    const user = await User.findOne({ email: normalizedEmail }).populate('hospitalId');
    if (!user || user.status !== 'active') {
      return res.status(403).json({ error: 'Account is not active' });
    }

    user.lastLoginAt = new Date();
    user.lastLoginIp = ipAddress;
    await user.save();

    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = await createAndStoreRefreshToken({
      userId: user._id,
      deviceInfo: req.headers['user-agent'] || 'Web Browser',
      ipAddress
    });

    const userPayload = await buildUserPayload(user);

    res.json({
      success: true,
      user: userPayload,
      accessToken,
      refreshToken
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/auth/refresh
 * @desc    Rotate Refresh Token & issue fresh Access Token
 */
exports.refreshToken = async (req, res, next) => {
  try {
    let token = req.body.refreshToken;
    if (!token && req.headers.cookie) {
      const match = req.headers.cookie.match(/refreshToken=([^;]+)/);
      if (match) token = match[1];
    }

    if (!token) {
      return res.status(401).json({ error: 'Refresh token is missing' });
    }

    const result = await rotateRefreshToken({
      oldPlainToken: token,
      deviceInfo: req.headers['user-agent'] || 'Web Browser',
      ipAddress: req.ip
    });

    const userPayload = await buildUserPayload(result.user);

    res.json({
      success: true,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: userPayload
    });
  } catch (error) {
    return res.status(401).json({ error: error.message || 'Token refresh failed' });
  }
};

/**
 * @route   POST /api/auth/logout
 * @desc    Revoke current refresh token session
 */
exports.logout = async (req, res, next) => {
  try {
    let token = req.body.refreshToken;
    if (!token && req.headers.cookie) {
      const match = req.headers.cookie.match(/refreshToken=([^;]+)/);
      if (match) token = match[1];
    }

    if (token) {
      await revokeRefreshToken(token);
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/auth/revoke-all-sessions
 * @desc    Revoke all active sessions for currently logged in user
 */
exports.revokeAllSessions = async (req, res, next) => {
  try {
    await revokeAllUserSessions(req.user._id);
    res.json({
      success: true,
      message: 'All active sessions have been revoked. Please log in again.'
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 4. FORGOT & RESET PASSWORD
// ==========================================

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Dispatches password reset OTP (HMAC-SHA256, 10 min TTL)
 */
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    // Prevent user enumeration
    if (!user) {
      return res.json({
        success: true,
        message: 'If an account exists with this email, a 6-digit password reset code has been dispatched.'
      });
    }

    const otpResult = await generateAndDispatchOtp({
      email: normalizedEmail,
      userId: user._id,
      purpose: 'forgot_password',
      name: user.name,
      ipAddress: req.ip
    });

    if (!otpResult.success && otpResult.cooldown) {
      return res.status(429).json({ error: otpResult.error, waitSeconds: otpResult.waitSeconds });
    }

    res.json({
      success: true,
      message: 'If an account exists with this email, a 6-digit password reset code has been dispatched.',
      cooldownSeconds: 60,
      devOtpCode: otpResult.devOtpCode
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password via verified OTP
 */
exports.resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword, confirmPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: 'Email, verification code, and new password are required.' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    const policyCheck = validatePasswordPolicy(newPassword);
    if (!policyCheck.valid) {
      return res.status(400).json({ error: policyCheck.errors[0], allErrors: policyCheck.errors });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const verification = await verifyOtpCode({
      email: normalizedEmail,
      otp,
      purpose: 'forgot_password'
    });

    if (!verification.success) {
      return res.status(400).json({
        error: verification.error,
        attemptsRemaining: verification.attemptsRemaining
      });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ error: 'User account not found' });
    }

    user.password = newPassword; // Hashed by pre-save
    await user.save();

    // Revoke all existing sessions for security
    await revokeAllUserSessions(user._id);

    await logAudit({
      userId: user._id,
      userName: user.name,
      userRole: user.role,
      action: 'PASSWORD_RESET_SUCCESS',
      resourceType: 'User',
      resourceId: user._id
    });

    res.json({
      success: true,
      message: 'Password reset successful! All active sessions revoked. Please log in with your new password.'
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 5. ACCOUNT STATUS & PROFILE
// ==========================================

/**
 * @route   GET /api/auth/account-status
 * @desc    Allows applicant or user to check account approval status and reviewer feedback
 */
exports.getAccountStatus = async (req, res, next) => {
  try {
    const email = (req.query.email || req.user?.email || '').toLowerCase().trim();

    if (!email) {
      return res.status(400).json({ error: 'Email is required to inspect account status.' });
    }

    const user = await User.findOne({ email }).populate('hospitalId', 'name city state');
    if (!user) {
      return res.status(404).json({ error: 'No account found for this email address.' });
    }

    const approvalRequest = await ApprovalRequest.findOne({ applicantId: user._id })
      .populate('documentIds')
      .populate('hospitalId', 'name city state')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      hospital: user.hospitalId,
      rejectionReason: user.rejectionReason,
      approvalRequest: approvalRequest ? {
        id: approvalRequest._id,
        status: approvalRequest.status,
        rejectionReason: approvalRequest.rejectionReason,
        requestedInfoComments: approvalRequest.requestedInfoComments,
        resubmissionCount: approvalRequest.resubmissionCount,
        maxResubmissions: approvalRequest.maxResubmissions,
        createdAt: approvalRequest.createdAt,
        reviewedAt: approvalRequest.reviewedAt,
        documents: approvalRequest.documentIds
      } : null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/auth/toggle-2fa
 * @desc    Toggle 2FA for logged in user
 */
exports.toggle2FA = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.twoFactorEnabled = !user.twoFactorEnabled;
    await user.save();

    res.json({
      success: true,
      twoFactorEnabled: user.twoFactorEnabled,
      message: `Two-Factor Authentication has been ${user.twoFactorEnabled ? 'enabled' : 'disabled'}.`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/auth/me
 * @desc    Get currently logged in user
 */
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('hospitalId');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const userPayload = await buildUserPayload(user);
    res.json({
      success: true,
      user: userPayload
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, phone, preferredLanguage, accessibility, familyMembers, address } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (name) user.name = name.trim();
    if (phone) user.phone = phone.trim();
    if (preferredLanguage) user.preferredLanguage = preferredLanguage;
    if (accessibility) user.accessibility = { ...user.accessibility, ...accessibility };
    if (familyMembers) user.familyMembers = familyMembers;
    if (address) user.address = { ...user.address, ...address };

    await user.save();
    const userPayload = await buildUserPayload(user);

    res.json({
      success: true,
      user: userPayload
    });
  } catch (error) {
    next(error);
  }
};
