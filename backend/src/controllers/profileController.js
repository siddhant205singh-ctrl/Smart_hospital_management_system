const User = require('../models/User');
const Doctor = require('../models/Doctor');

/**
 * Calculate profile completeness score and missing field prompts.
 * @param {Object} user - The user document
 * @returns {{ score: number, prompts: string[] }}
 */
function calculateCompleteness(user) {
  let score = 0;
  const prompts = [];
  // Name, email, phone are required so always present: 20 points
  score += 20;
  if (user.avatar) score += 5; else prompts.push('Upload a profile photo');
  if (user.gender) score += 5; else prompts.push('Add your gender');
  if (user.dateOfBirth) score += 5; else prompts.push('Add your date of birth');
  if (user.emergencyContact?.phone) score += 10; else prompts.push('Add an emergency contact for faster care');
  if (user.cityArea) score += 5; else prompts.push('Add your city/area for location-based services');

  if (user.role === 'patient') {
    if (user.patientHealth?.bloodGroup) score += 15; else prompts.push('Add your blood group to receive matched blood shortage alerts');
    if (user.patientHealth?.allergies?.length > 0) score += 5; else prompts.push('List your allergies for emergency safety');
    if (user.patientHealth?.existingConditions?.length > 0) score += 5; else prompts.push('Add existing conditions to help doctors during emergencies');
    if (user.patientHealth?.currentMedicines?.length > 0) score += 5; else prompts.push('Add current medicines for prescription safety checks');
    if (user.familyMembers?.length > 0) score += 5;
    if (user.donorSettings?.willingToDonate) score += 5;
    // Max for patient: 20+5+5+5+10+5+15+5+5+5+5+5 = 95, plus notif prefs = 100
    if (user.notificationPreferences) score += 5;
  } else {
    // Non-patient roles get proportionally higher base
    score += 50;
  }

  return { score: Math.min(score, 100), prompts };
}

/**
 * @desc    Get current user's full profile
 * @route   GET /api/profile/me
 * @access  Private
 */
exports.getMyProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password -refreshToken');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const result = user.toObject();

    // If doctor, populate the Doctor record
    if (user.role === 'doctor') {
      const doctorRecord = await Doctor.findOne({ userId: user._id });
      if (doctorRecord) {
        result.doctorProfile = doctorRecord.toObject();
      }
    }

    // Calculate and include profile completeness
    const { score, prompts } = calculateCompleteness(user);
    result.profileCompletenessScore = score;
    result.completenessPrompts = prompts;

    // Persist score if changed
    if (user.profileCompletenessScore !== score) {
      await User.findByIdAndUpdate(user._id, { profileCompletenessScore: score });
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update current user's profile
 * @route   PUT /api/profile/me
 * @access  Private
 */
exports.updateMyProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Common personal fields allowed for all roles
    const personalFields = [
      'name', 'phone', 'avatar', 'gender', 'dateOfBirth',
      'cityArea', 'locationCoordinates', 'address', 'preferredLanguage', 'accessibility'
    ];

    // Role-specific allowed fields
    let allowedFields = [...personalFields, 'emergencyContact', 'notificationPreferences'];

    if (user.role === 'patient') {
      allowedFields.push(
        'patientHealth', 'donorSettings', 'familyMembers', 'privacySettings'
      );
    } else if (user.role === 'doctor') {
      allowedFields.push('privacySettings');
      // Doctors cannot update qualifications or council reg through this endpoint
    }
    // admin, receptionist, blood_bank_officer: personalFields + emergencyContact + notificationPreferences only

    // Apply allowed updates
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        user[field] = req.body[field];
      }
    }

    await user.save();

    // Recalculate profile completeness and save
    const { score } = calculateCompleteness(user);
    user.profileCompletenessScore = score;
    await user.save();

    const result = user.toObject();
    delete result.password;
    delete result.refreshToken;

    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get profile completeness score and prompts
 * @route   GET /api/profile/completeness
 * @access  Private
 */
exports.getProfileCompleteness = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { score, prompts } = calculateCompleteness(user);

    res.json({ score, prompts });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Change password
 * @route   PUT /api/profile/change-password
 * @access  Private
 */
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Please provide currentPassword and newPassword' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save(); // pre-save hook will hash the password

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Export full profile data as JSON
 * @route   GET /api/profile/export
 * @access  Private
 */
exports.exportProfileData = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password -refreshToken');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const result = user.toObject();

    // Include doctor profile if applicable
    if (user.role === 'doctor') {
      const doctorRecord = await Doctor.findOne({ userId: user._id });
      if (doctorRecord) {
        result.doctorProfile = doctorRecord.toObject();
      }
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
};
