const BloodAlert = require('../models/BloodAlert');
const BloodAlertResponse = require('../models/BloodAlertResponse');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { logAudit } = require('../middleware/auditMiddleware');

// Standard Transfusion Red Blood Cell Compatibility
// (Recipient blood group -> List of medically compatible donor blood groups)
const COMPATIBLE_DONORS_MAP = {
  'A+': ['A+', 'A-', 'O+', 'O-'],
  'A-': ['A-', 'O-'],
  'B+': ['B+', 'B-', 'O+', 'O-'],
  'B-': ['B-', 'O-'],
  'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
  'AB-': ['A-', 'B-', 'AB-', 'O-'],
  'O+': ['O+', 'O-'],
  'O-': ['O-']
};

// @route   POST /api/blood-alerts
// Raise an emergency blood shortage alert (Blood Bank Officer or Emergency Doctor)
exports.raiseBloodAlert = async (req, res, next) => {
  try {
    const {
      hospitalId,
      bloodGroup,
      component = 'Packed Red Blood Cells (PRBC)',
      unitsNeeded,
      urgency = 'High',
      matchingMode = 'exact_match',
      contactDesk,
      contactPhone,
      radiusKm = 20,
      validHours = 12
    } = req.body;

    if (!bloodGroup || !unitsNeeded) {
      return res.status(400).json({ error: 'Please provide bloodGroup and unitsNeeded' });
    }

    const expiresAt = new Date(Date.now() + validHours * 3600 * 1000);

    // 1. Determine target donor blood groups
    const targetBloodGroups = matchingMode === 'include_compatible'
      ? (COMPATIBLE_DONORS_MAP[bloodGroup] || [bloodGroup])
      : [bloodGroup];

    // 2. Find eligible matched donors
    // - Blood group matches target
    // - Willing to donate
    // - Opted-in to bloodAlerts
    const matchedUsers = await User.find({
      'patientHealth.bloodGroup': { $in: targetBloodGroups },
      'donorSettings.willingToDonate': { $ne: false },
      'notificationPreferences.types.bloodAlerts': { $ne: false }
    }).select('_id name phone preferredLanguage patientHealth cityArea');

    const matchedUsersCount = matchedUsers.length;

    // 3. Create BloodAlert record
    const alert = await BloodAlert.create({
      hospitalId: hospitalId || req.user.hospitalId,
      raisedBy: req.user._id,
      bloodGroup,
      component,
      unitsNeeded: Number(unitsNeeded),
      urgency,
      matchingMode,
      contactDesk: contactDesk || 'Hospital Blood Bank Counter (Room 004)',
      contactPhone: contactPhone || req.user.phone || '+91-11-26925858',
      radiusKm: Number(radiusKm),
      expiresAt,
      matchedUsersCount,
      status: 'active'
    });

    await alert.populate('hospitalId', 'name city address emergencyContact');

    // 4. Dispatch in-app notifications to matched users
    const hospitalName = alert.hospitalId?.name || 'Network Hospital';
    const notificationPromises = matchedUsers.map(user => {
      const isHindi = user.preferredLanguage === 'hi';
      const notifTitle = isHindi
        ? `🚨 तत्काल रक्त की आवश्यकता: ${bloodGroup}`
        : `🚨 URGENT Blood Needed: ${bloodGroup} (${urgency} Urgency)`;
      const notifMsg = isHindi
        ? `${hospitalName} को ${unitsNeeded} यूनिट ${bloodGroup} ${component} की तत्काल आवश्यकता है। स्वैच्छिक एवं अवैतनिक रक्तदान। संपर्क: ${alert.contactDesk}.`
        : `${hospitalName} requires ${unitsNeeded} units of ${bloodGroup} ${component}. Voluntary & unpaid donation. Contact: ${alert.contactDesk} (${alert.contactPhone}).`;

      return Notification.create({
        userId: user._id,
        type: 'blood_shortage_alert',
        title: notifTitle,
        message: notifMsg,
        channel: 'in_app',
        meta: {
          alertId: alert._id,
          bloodGroup,
          urgency,
          hospitalName,
          contactPhone: alert.contactPhone
        }
      });
    });

    await Promise.allSettled(notificationPromises);

    // 5. Broadcast real-time Socket.IO event
    const io = req.app.get('io');
    if (io) {
      io.emit('blood_alert:broadcast', {
        alertId: alert._id,
        bloodGroup,
        component,
        urgency,
        unitsNeeded,
        targetBloodGroups,
        hospitalName,
        expiresAt
      });
    }

    await logAudit(req, 'BloodAlertRaised', 'BloodAlert', alert._id, null, {
      bloodGroup,
      urgency,
      matchedUsersCount
    });

    res.status(201).json({
      success: true,
      message: `Emergency shortage alert dispatched to ${matchedUsersCount} eligible ${matchingMode === 'include_compatible' ? 'exact & compatible' : 'matching'} donors.`,
      alert
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/blood-alerts/active
// Get active blood shortage alerts (Public board or hospital filter)
exports.getActiveAlerts = async (req, res, next) => {
  try {
    const { hospitalId, bloodGroup } = req.query;
    let query = {
      status: 'active',
      expiresAt: { $gt: new Date() }
    };

    if (hospitalId) query.hospitalId = hospitalId;
    if (bloodGroup) query.bloodGroup = bloodGroup;

    const alerts = await BloodAlert.find(query)
      .populate('hospitalId', 'name city address emergencyContact')
      .populate('raisedBy', 'name role')
      .sort({ urgency: -1, createdAt: -1 });

    res.json({
      success: true,
      count: alerts.length,
      alerts
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/blood-alerts/:id/stats
// Officer statistics view of matched and confirmed donor counts (data minimization compliant)
exports.getAlertStats = async (req, res, next) => {
  try {
    const alert = await BloodAlert.findById(req.params.id)
      .populate('hospitalId', 'name city');

    if (!alert) return res.status(404).json({ error: 'Alert not found' });

    const responses = await BloodAlertResponse.find({ alertId: alert._id })
      .select('status suggestedTimeSlot respondedAt')
      .sort({ respondedAt: -1 });

    res.json({
      success: true,
      alert,
      responsesCount: responses.length,
      confirmedDonorsCount: responses.filter(r => r.status === 'can_donate').length,
      unavailableCount: responses.filter(r => r.status === 'not_available').length,
      responses
    });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/blood-alerts/:id/respond
// Donor responds to blood shortage alert ("can_donate" / "not_available")
exports.respondToAlert = async (req, res, next) => {
  try {
    const { status, suggestedTimeSlot } = req.body; // status: 'can_donate' or 'not_available'
    const alert = await BloodAlert.findById(req.params.id)
      .populate('hospitalId', 'name address city emergencyContact');

    if (!alert) return res.status(404).json({ error: 'Blood alert not found or expired' });

    if (!['can_donate', 'not_available'].includes(status)) {
      return res.status(400).json({ error: 'Status must be can_donate or not_available' });
    }

    const response = await BloodAlertResponse.findOneAndUpdate(
      { alertId: alert._id, donorId: req.user._id },
      {
        status,
        suggestedTimeSlot: suggestedTimeSlot || 'Within 2 hours',
        directionsSent: status === 'can_donate',
        respondedAt: new Date()
      },
      { upsert: true, new: true }
    );

    // Update aggregate counters on alert
    const canDonateCount = await BloodAlertResponse.countDocuments({
      alertId: alert._id,
      status: 'can_donate'
    });
    const unavailableCount = await BloodAlertResponse.countDocuments({
      alertId: alert._id,
      status: 'not_available'
    });

    alert.responseStats = { canDonateCount, unavailableCount };
    await alert.save();

    // Push real-time response update to hospital officer
    const io = req.app.get('io');
    if (io) {
      io.emit('blood_alert:response_update', {
        alertId: alert._id,
        canDonateCount,
        unavailableCount
      });
    }

    res.json({
      success: true,
      message: status === 'can_donate'
        ? 'Thank you for stepping forward! Direction details and blood bank desk instructions sent.'
        : 'Thank you for your response. Your availability status has been noted.',
      directions: status === 'can_donate' ? {
        hospitalName: alert.hospitalId?.name,
        address: alert.hospitalId?.address,
        desk: alert.contactDesk,
        phone: alert.contactPhone
      } : null,
      response
    });
  } catch (error) {
    next(error);
  }
};

// @route   PUT /api/blood-alerts/:id/fulfill
// Mark blood shortage alert fulfilled
exports.fulfillAlert = async (req, res, next) => {
  try {
    const alert = await BloodAlert.findById(req.params.id);
    if (!alert) return res.status(404).json({ error: 'Alert not found' });

    alert.status = 'fulfilled';
    alert.unitsFulfilled = alert.unitsNeeded;
    await alert.save();

    // Thank responders
    const io = req.app.get('io');
    if (io) {
      io.emit('blood_alert:fulfilled', {
        alertId: alert._id,
        bloodGroup: alert.bloodGroup
      });
    }

    res.json({ success: true, message: 'Alert marked fulfilled. Units secured.', alert });
  } catch (error) {
    next(error);
  }
};
