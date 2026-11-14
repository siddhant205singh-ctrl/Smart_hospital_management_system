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
// Sends an SMS update or test message to any phone number
exports.sendTestSms = async (req, res, next) => {
  try {
    const { phone, message, tokenNumber, patientsAhead, estWaitMinutes } = req.body;
    if (!phone) {
      return res.status(400).json({ error: 'Mobile phone number is required.' });
    }
    const body = message || `HealthMS Queue Alert: Your token is #${tokenNumber || 12}. ${patientsAhead || 3} patients ahead. Est. waiting time is ${estWaitMinutes || 25} minutes.`;

    const smsResult = await twilioClient.messages.create({
      to: phone,
      body
    });

    const isSuccess = smsResult && smsResult.status !== 'failed';
    res.json({
      success: isSuccess,
      message: isSuccess
        ? `Message dispatched successfully via ${smsResult.provider || 'Twilio'} (${smsResult.status})`
        : `Dispatch failed: ${smsResult?.error || 'Twilio error'}`,
      smsResult
    });
  } catch (error) {
    next(error);
  }
};
