const User = require('../models/User');
const Donor = require('../models/Donor');
const { generateAccessToken, generateRefreshToken } = require('../utils/tokenUtils');
const { logAudit } = require('../middleware/auditMiddleware');

// @route   POST /api/auth/register
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, phone, role, hospitalId, preferredLanguage } = req.body;

    if (!name || !email || !password || !phone) {
      return res.status(400).json({ error: 'Please provide all required fields: name, email, password, phone' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    const userRole = role || 'patient';
    const user = await User.create({
      name,
      email,
      password,
      phone,
      role: userRole,
      hospitalId: hospitalId || undefined,
      preferredLanguage: preferredLanguage || 'en'
    });

    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshToken = refreshToken;
    await user.save();

    await logAudit({
      userId: user._id,
      userName: user.name,
      userRole: user.role,
      action: 'USER_REGISTERED',
      resourceType: 'User',
      resourceId: user._id,
      details: { role: user.role, email: user.email }
    });

    res.status(201).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        hospitalId: user.hospitalId,
        preferredLanguage: user.preferredLanguage,
        accessibility: user.accessibility,
        familyMembers: user.familyMembers
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide email and password' });
    }

    const user = await User.findOne({ email }).populate('hospitalId');
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshToken = refreshToken;
    await user.save();

    // Check if user has an active donor profile
    const donorProfile = await Donor.findOne({ userId: user._id });

    await logAudit({
      userId: user._id,
      userName: user.name,
      userRole: user.role,
      action: 'USER_LOGIN',
      resourceType: 'User',
      resourceId: user._id
    });

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        hospitalId: user.hospitalId,
        preferredLanguage: user.preferredLanguage,
        accessibility: user.accessibility,
        familyMembers: user.familyMembers,
        donorProfile: donorProfile ? {
          id: donorProfile._id,
          bloodGroup: donorProfile.bloodGroup,
          totalDonations: donorProfile.totalDonations,
          status: donorProfile.status,
          nextEligibleDate: donorProfile.nextEligibleDate
        } : null
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/auth/me
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('hospitalId');
    const donorProfile = await Donor.findOne({ userId: user._id });

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        hospitalId: user.hospitalId,
        preferredLanguage: user.preferredLanguage,
        accessibility: user.accessibility,
        familyMembers: user.familyMembers,
        donorProfile: donorProfile ? {
          id: donorProfile._id,
          bloodGroup: donorProfile.bloodGroup,
          totalDonations: donorProfile.totalDonations,
          status: donorProfile.status,
          nextEligibleDate: donorProfile.nextEligibleDate
        } : null
      }
    });
  } catch (error) {
    next(error);
  }
};

// @route   PUT /api/auth/profile
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, phone, preferredLanguage, accessibility, familyMembers, address } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (preferredLanguage) user.preferredLanguage = preferredLanguage;
    if (accessibility) user.accessibility = { ...user.accessibility, ...accessibility };
    if (familyMembers) user.familyMembers = familyMembers;
    if (address) user.address = { ...user.address, ...address };

    await user.save();

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        preferredLanguage: user.preferredLanguage,
        accessibility: user.accessibility,
        familyMembers: user.familyMembers,
        address: user.address
      }
    });
  } catch (error) {
    next(error);
  }
};
