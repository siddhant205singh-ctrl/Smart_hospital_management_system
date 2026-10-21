const Notification = require('../models/Notification');
const { twilioClient } = require('../services/notificationService');

// @route   GET /api/notifications
exports.getMyNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(30);

    const unreadCount = await Notification.countDocuments({ userId: req.user._id, isRead: false });

    res.json({ success: true, count: notifications.length, unreadCount, notifications });
  } catch (error) {
    next(error);
  }
};

// @route   PUT /api/notifications/:id/read
exports.markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { isRead: true },
      { new: true }
    );
    res.json({ success: true, notification });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/notifications/test-sms
// Sends an SMS queue update to any phone number (mocked Twilio interface)
exports.sendTestSms = async (req, res, next) => {
  try {
    const { phone, tokenNumber, patientsAhead, estWaitMinutes } = req.body;
    const body = `SmartCare Queue Alert: Your token is #${tokenNumber || 12}. ${patientsAhead || 3} patients ahead. Est. waiting time is ${estWaitMinutes || 25} minutes.`;

    const smsResult = await twilioClient.messages.create({
      to: phone || '+919876543210',
      body
    });

    res.json({
      success: true,
      message: 'SMS dispatched successfully via Twilio interface',
      smsResult
    });
  } catch (error) {
    next(error);
  }
};
