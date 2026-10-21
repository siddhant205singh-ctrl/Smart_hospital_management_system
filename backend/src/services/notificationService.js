const Notification = require('../models/Notification');
const nodemailer = require('nodemailer');

// Mock Twilio Client interface (plug-and-play with real Twilio account credentials)
class TwilioMockService {
  constructor(accountSid, authToken) {
    this.accountSid = accountSid || 'AC_MOCK_SMARTCARE_SID';
    this.authToken = authToken || 'AUTH_MOCK_SECRET';
    this.messages = {
      create: async ({ body, to, from = '+19876543210' }) => {
        const messagePayload = {
          sid: `SM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          to,
          from,
          body,
          status: 'delivered',
          dateSent: new Date().toISOString()
        };
        console.log(`\n================== [SMS DISPATCH VIA TWILIO INTERFACE] ==================`);
        console.log(`📱 TO: ${to}`);
        console.log(`📩 BODY: ${body}`);
        console.log(`STATUS: Sent (SID: ${messagePayload.sid})`);
        console.log(`========================================================================\n`);
        return messagePayload;
      }
    };
  }
}

const twilioClient = new TwilioMockService(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Email transporter (fallback test account or console logger)
let transporter = null;
try {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: process.env.SMTP_PORT || 587,
    auth: {
      user: process.env.SMTP_USER || 'smartcare.test@ethereal.email',
      pass: process.env.SMTP_PASS || 'mockpassword'
    }
  });
} catch (e) {
  console.log('[NotificationService] Using console email transporter fallback');
}

/**
 * Dispatch unified multi-channel notification
 */
const sendNotification = async ({
  userId,
  userPhone,
  userEmail,
  type,
  title,
  message,
  channel = 'in_app', // 'in_app' | 'sms' | 'email' | 'all'
  meta = {}
}) => {
  const results = { inApp: null, sms: null, email: null };

  // 1. In-app notification record in MongoDB
  try {
    results.inApp = await Notification.create({
      userId,
      type,
      title,
      message,
      channel: channel === 'all' ? 'in_app' : channel,
      meta
    });
  } catch (err) {
    console.error('[NotificationService] In-app notification error:', err.message);
  }

  // 2. SMS dispatch via Twilio interface (especially for queue updates & leave now)
  if ((channel === 'sms' || channel === 'all') && userPhone) {
    try {
      results.sms = await twilioClient.messages.create({
        to: userPhone,
        body: `[SmartCare] ${title}: ${message}`
      });
    } catch (err) {
      console.error('[NotificationService] Twilio SMS error:', err.message);
    }
  }

  // 3. Email dispatch via Nodemailer
  if ((channel === 'email' || channel === 'all') && userEmail) {
    try {
      if (transporter && process.env.SMTP_USER) {
        await transporter.sendMail({
          from: '"SmartCare Health System" <no-reply@smartcare.health>',
          to: userEmail,
          subject: title,
          text: message,
          html: `<div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
            <h2 style="color: #0d9488;">SmartCare Alert</h2>
            <p style="font-size: 16px;">${message}</p>
            <p style="color: #64748b; font-size: 12px; margin-top: 24px;">This is an automated healthcare notification from SmartCare.</p>
          </div>`
        });
      } else {
        console.log(`[Email Mock Sent] TO: ${userEmail} | SUBJECT: ${title} | MESSAGE: ${message}`);
      }
      results.email = true;
    } catch (err) {
      console.error('[NotificationService] Nodemailer error:', err.message);
    }
  }

  return results;
};

module.exports = {
  sendNotification,
  twilioClient
};
