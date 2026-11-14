const Notification = require('../models/Notification');
const { sendMail } = require('./emailService');

/**
 * Standardize and format phone number to E.164 (e.g. +919876543210)
 * Safely strips and preserves whatsapp: channel prefixes where needed.
 */
function normalizePhoneNumber(rawPhone) {
  if (!rawPhone) return '';
  let str = rawPhone.toString().trim();
  const isWhatsApp = str.startsWith('whatsapp:');
  if (isWhatsApp) {
    str = str.replace(/^whatsapp:/, '').trim();
  }

  const digits = str.replace(/\D/g, '');
  if (!digits || digits.length < 7) {
    return '';
  }

  let formatted = '';
  // If explicitly has '+' prefix with country code
  if (str.startsWith('+')) {
    formatted = `+${digits}`;
  } else if (digits.length === 10) {
    // Standard Indian 10-digit mobile number
    formatted = `+91${digits}`;
  } else if (digits.length === 11 && digits.startsWith('0')) {
    // 11 digits starting with 0 (e.g. 09810123456)
    formatted = `+91${digits.slice(1)}`;
  } else if (digits.length === 12 && digits.startsWith('91')) {
    // 12 digits starting with 91 (e.g. 919810123456)
    formatted = `+${digits}`;
  } else {
    // Generic international E.164
    formatted = `+${digits}`;
  }

  return isWhatsApp ? `whatsapp:${formatted}` : formatted;
}

/**
 * Dispatch real WhatsApp message via Twilio WhatsApp Sandbox
 * Default trial sandbox number: whatsapp:+14155238886
 */
async function dispatchTwilioWhatsApp({ to, body }) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    return null;
  }

  const normalized = normalizePhoneNumber(to);
  if (!normalized) {
    throw new Error(`Invalid recipient phone number: "${to}"`);
  }

  const cleanNumber = normalized.replace(/^whatsapp:/, '');
  const whatsappTo = `whatsapp:${cleanNumber}`;
  const senderNumber = (process.env.TWILIO_WHATSAPP_NUMBER || '+14155238886').replace(/^whatsapp:/, '');
  const whatsappFrom = `whatsapp:${senderNumber}`;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  const params = new URLSearchParams();
  params.append('To', whatsappTo);
  params.append('From', whatsappFrom);
  params.append('Body', body);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || `Twilio WhatsApp error ${response.status}: ${JSON.stringify(data)}`);
  }

  return {
    provider: 'twilio_whatsapp',
    sid: data.sid,
    to: whatsappTo,
    from: whatsappFrom,
    status: data.status,
    dateSent: data.date_created || new Date().toISOString()
  };
}

/**
 * Dispatch real SMS via Twilio Messages API using native HTTPS fetch
 */
async function dispatchTwilioSms({ to, from, body }) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const senderPhone = from || process.env.TWILIO_PHONE_NUMBER;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

  if (!accountSid || !authToken || (!senderPhone && !messagingServiceSid)) {
    return null; // Not configured yet
  }

  const normalized = normalizePhoneNumber(to);
  if (!normalized) {
    throw new Error(`Invalid recipient phone number: "${to}"`);
  }
  const formattedTo = normalized.replace(/^whatsapp:/, '');

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  const params = new URLSearchParams();
  params.append('To', formattedTo);
  if (messagingServiceSid) {
    params.append('MessagingServiceSid', messagingServiceSid);
  } else {
    params.append('From', senderPhone);
  }
  params.append('Body', body);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || `Twilio error status ${response.status}: ${JSON.stringify(data)}`);
  }

  return {
    provider: 'twilio_sms',
    sid: data.sid,
    to: formattedTo,
    from: senderPhone || messagingServiceSid,
    status: data.status,
    dateSent: data.date_created || new Date().toISOString()
  };
}

/**
 * Unified Mobile Message dispatcher: Twilio WhatsApp / Twilio SMS -> Simulated Console Fallback
 */
async function sendSmsDirect({ to, from, body }) {
  if (!to) return null;
  const formattedTo = normalizePhoneNumber(to);

  let twilioError = null;

  // 1. Live Twilio integration
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    // 1a. If WhatsApp is enabled or if no SMS phone number is set, use Twilio WhatsApp Sandbox
    if (process.env.TWILIO_WHATSAPP_ENABLED === 'true' || !process.env.TWILIO_PHONE_NUMBER) {
      try {
        const waResult = await dispatchTwilioWhatsApp({ to: formattedTo, body });
        if (waResult) {
          console.log(`[NotificationService] Real WhatsApp message sent to ${waResult.to} (SID: ${waResult.sid})`);
          return waResult;
        }
      } catch (waErr) {
        twilioError = waErr.message;
        console.error('[NotificationService] Twilio WhatsApp dispatch error:', waErr.message);
      }
    }

    // 1b. If an SMS sender phone is configured, attempt cellular SMS
    if (process.env.TWILIO_PHONE_NUMBER) {
      try {
        const result = await dispatchTwilioSms({ to: formattedTo, from, body });
        if (result) {
          console.log(`[NotificationService] Real Twilio SMS sent to ${result.to} (SID: ${result.sid})`);
          return result;
        }
      } catch (twilioErr) {
        twilioError = twilioErr.message;
        console.error('[NotificationService] Twilio SMS dispatch error:', twilioErr.message);
      }
    }

    // If Twilio was configured but failed (e.g. unverified phone number)
    if (twilioError) {
      return {
        provider: 'twilio',
        status: 'failed',
        to: formattedTo,
        error: twilioError,
        help: 'On Twilio trial accounts: 1) Recipient phone number must be added to Verified Caller IDs in Twilio Console (https://console.twilio.com/us1/develop/phone-numbers/manage/verified) and 2) If using WhatsApp, send the join keyword from WhatsApp to +1 415 523 8886.'
      };
    }
  }

  // 2. Simulated Mobile Message logging for development/demo (Twilio disabled)
  const simPayload = {
    provider: 'simulated',
    sid: `SM_SIM_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    to: formattedTo,
    from: from || 'HealthMS-Alert',
    body,
    status: 'delivered',
    dateSent: new Date().toISOString()
  };

  console.log(`\n================== [MOBILE NOTIFICATION DISPATCH] ==================`);
  console.log(`📱 TO: ${formattedTo}`);
  console.log(`📩 BODY: ${body}`);
  console.log(`ℹ️ STATUS: Delivered (Simulated Mode). Email sent via Gmail SMTP.`);
  console.log(`====================================================================\n`);

  return simPayload;
}

// Client interface compatible with twilio SDK callers
const twilioClient = {
  messages: {
    create: async ({ body, to, from }) => {
      return await sendSmsDirect({ to, from, body });
    }
  }
};

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

  // 2. Mobile dispatch (WhatsApp / SMS)
  if ((channel === 'sms' || channel === 'all') && userPhone) {
    try {
      results.sms = await sendSmsDirect({
        to: userPhone,
        body: `[HealthMS] ${title}: ${message}`
      });
    } catch (err) {
      console.error('[NotificationService] Mobile message dispatch error:', err.message);
    }
  }

  // 3. Email dispatch via unified email service
  if ((channel === 'email' || channel === 'all') && userEmail) {
    try {
      await sendMail({
        to: userEmail,
        subject: title,
        text: message,
        html: `<div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
          <h2 style="color: #0d9488;">HealthMS Alert</h2>
          <p style="font-size: 16px;">${message}</p>
          <p style="color: #64748b; font-size: 12px; margin-top: 24px;">This is an automated healthcare notification from HealthMS.</p>
        </div>`
      });
      results.email = true;
    } catch (err) {
      console.error('[NotificationService] Email error:', err.message);
    }
  }

  return results;
};

module.exports = {
  sendNotification,
  sendSmsDirect,
  twilioClient,
  normalizePhoneNumber
};
