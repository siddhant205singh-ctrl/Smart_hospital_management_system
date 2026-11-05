const axios = require('axios');
const nodemailer = require('nodemailer');
const emailTemplates = require('../templates/emailTemplates');

let transporter = null;

// Lazily obtain transporter synchronously whenever needed
const getTransporter = () => {
  if (transporter) return transporter;

  const gmailUser = process.env.SMTP_USER || process.env.GMAIL_USER;
  const gmailPass = process.env.SMTP_PASS || process.env.GMAIL_PASS;

  if (process.env.SMTP_SERVICE === 'gmail' || (gmailUser && gmailPass)) {
    if (gmailUser && gmailPass) {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: gmailUser, pass: gmailPass },
        connectionTimeout: 6000,
        greetingTimeout: 6000,
        socketTimeout: 8000
      });
      console.log(`[EmailService] ✅ Gmail SMTP initialized for ${gmailUser}`);
      return transporter;
    }
  } else if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      connectionTimeout: 6000,
      greetingTimeout: 6000,
      socketTimeout: 8000
    });
    console.log('[EmailService] ✅ Custom SMTP initialized');
    return transporter;
  }

  return null;
};

// Verify transporter on load if configured
setTimeout(async () => {
  const t = getTransporter();
  if (t) {
    try {
      await t.verify();
      console.log('[EmailService] ✅ SMTP connection verified with mail server');
    } catch (err) {
      console.warn('[EmailService] ⚠️ SMTP verify warning:', err.message);
    }
  } else {
    console.log('[EmailService] ℹ️ No SMTP credentials configured. Using development console email logger.');
  }
}, 500);

/**
 * Generic email dispatcher with multi-provider fallback (HTTP REST for Render + SMTP + Console)
 */
const sendMail = async ({ to, subject, html, text }) => {
  const fromEmail = process.env.SMTP_USER || 'healthmscare@gmail.com';
  const fromName = 'HealthMS';

  // 1. Try Brevo HTTP REST API (Recommended for Render Free Tier - Uses Port 443 HTTPS, immune to port blocking)
  if (process.env.BREVO_API_KEY) {
    try {
      const resp = await axios.post(
        'https://api.brevo.com/v3/smtp/email',
        {
          sender: { name: fromName, email: fromEmail },
          to: [{ email: to }],
          subject,
          htmlContent: html,
          textContent: text || subject
        },
        {
          headers: {
            'api-key': process.env.BREVO_API_KEY,
            'Content-Type': 'application/json'
          },
          timeout: 6000
        }
      );
      console.log(`[EmailService] ✉️  Email successfully dispatched via Brevo HTTPS API to ${to} (MessageId: ${resp.data?.messageId})`);
      return { messageId: resp.data?.messageId, provider: 'brevo' };
    } catch (apiErr) {
      console.error(`[EmailService] ❌ Brevo HTTPS API Error to ${to}:`, apiErr.response?.data?.message || apiErr.message);
    }
  }

  // 2. Try Resend HTTP REST API (Uses Port 443 HTTPS)
  if (process.env.RESEND_API_KEY) {
    try {
      const resp = await axios.post(
        'https://api.resend.com/emails',
        {
          from: process.env.RESEND_FROM || `${fromName} <onboarding@resend.dev>`,
          to: [to],
          subject,
          html,
          text: text || subject
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 6000
        }
      );
      console.log(`[EmailService] ✉️  Email successfully dispatched via Resend HTTPS API to ${to} (MessageId: ${resp.data?.id})`);
      return { messageId: resp.data?.id, provider: 'resend' };
    } catch (apiErr) {
      console.error(`[EmailService] ❌ Resend HTTPS API Error to ${to}:`, apiErr.response?.data?.message || apiErr.message);
    }
  }

  // 3. Fallback to Nodemailer SMTP Transporter
  const currentTransporter = getTransporter();

  // When using Gmail, the FROM must match the authenticated Gmail address
  let from;
  if (process.env.EMAIL_FROM) {
    from = process.env.EMAIL_FROM;
  } else if (process.env.SMTP_USER) {
    from = `"HealthMS" <${process.env.SMTP_USER}>`;
  } else {
    from = '"HealthMS Health System" <no-reply@healthms.hospital>';
  }

  if (!currentTransporter) {
    const otpMatch = text?.match(/\b(\d{6})\b/);
    console.log('\n==============================================================');
    console.log('📧 [HEALTHMS EMAIL DISPATCH - CONSOLE LOGGER]');
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    if (otpMatch) {
      console.log(`🔑 6-DIGIT VERIFICATION CODE: 👉👉  ${otpMatch[1]}  👈👈`);
    }
    if (text) console.log(`Summary: ${text}`);
    console.log('==============================================================\n');
    return { messageId: `console-${Date.now()}`, simulated: true };
  }

  try {
    const info = await currentTransporter.sendMail({
      from,
      to,
      subject,
      text: text || subject,
      html
    });

    console.log(`[EmailService] ✉️  Email successfully sent to ${to} (MessageId: ${info.messageId})`);
    return info;
  } catch (error) {
    console.error(`[EmailService] ❌ SendMail Error to ${to}:`, error.message);
    const otpMatch = text?.match(/\b(\d{6})\b/);
    console.log('\n==============================================================');
    console.log('📧 [FALLBACK CONSOLE EMAIL DISPATCH]');
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    if (otpMatch) {
      console.log(`🔑 6-DIGIT VERIFICATION CODE: 👉👉  ${otpMatch[1]}  👈👈`);
    }
    console.log('==============================================================\n');
    return { messageId: `fallback-${Date.now()}`, error: error.message };
  }
};

/**
 * High-level OTP sender matching purpose
 */
const sendOtpEmail = async ({ to, name, otp, purpose, expiryMinutes = 10, ipAddress, deviceInfo }) => {
  let subject = 'HealthMS Verification Code';
  let html = '';

  switch (purpose) {
    case 'verify_email':
      subject = 'HealthMS Email Verification Code';
      html = emailTemplates.otpVerification({ name, otp, expiryMinutes });
      break;
    case 'forgot_password':
      subject = 'HealthMS Password Reset Verification Code';
      html = emailTemplates.passwordResetOtp({ name, otp, expiryMinutes });
      break;
    case 'login_2fa':
      subject = 'HealthMS Two-Factor Authentication Login Code';
      html = emailTemplates.login2faOtp({ name, otp, expiryMinutes, ipAddress, deviceInfo });
      break;
    case 'change_email':
      subject = 'HealthMS Email Change Verification Code';
      html = emailTemplates.otpVerification({ name, otp, expiryMinutes });
      break;
    default:
      subject = 'HealthMS Verification Code';
      html = emailTemplates.otpVerification({ name, otp, expiryMinutes });
  }

  const textSummary = `Your HealthMS verification code is: ${otp}. It will expire in ${expiryMinutes} minutes.`;
  return await sendMail({ to, subject, html, text: textSummary });
};

/**
 * Status change email notifications
 */
const sendWelcomePatientEmail = async ({ to, name, loginUrl }) => {
  return await sendMail({
    to,
    subject: 'Welcome to HealthMS - Account Activated',
    html: emailTemplates.welcomePatient({ name, loginUrl }),
    text: `Welcome ${name}! Your HealthMS patient account is verified and active.`
  });
};

const sendApplicationSubmittedEmail = async ({ to, name, role, hospitalName }) => {
  return await sendMail({
    to,
    subject: 'HealthMS Professional Registration Under Review',
    html: emailTemplates.applicationSubmitted({ name, role, hospitalName }),
    text: `Hello ${name}, your application for ${role} has been received and is currently under institutional review.`
  });
};

const sendApplicationApprovedEmail = async ({ to, name, role, hospitalName }) => {
  return await sendMail({
    to,
    subject: 'Congratulations! Your HealthMS Credentials Have Been Approved',
    html: emailTemplates.applicationApproved({ name, role, hospitalName }),
    text: `Congratulations ${name}! Your credentials have been approved and your account is active.`
  });
};

const sendApplicationRejectedEmail = async ({ to, name, role, rejectionReason }) => {
  return await sendMail({
    to,
    subject: 'HealthMS Credential Verification Update',
    html: emailTemplates.applicationRejected({ name, role, rejectionReason }),
    text: `Hello ${name}, your credential application could not be approved at this time. Reason: ${rejectionReason}`
  });
};

const sendApplicationInfoRequestedEmail = async ({ to, name, comments }) => {
  return await sendMail({
    to,
    subject: 'Action Required: Additional Information for HealthMS Verification',
    html: emailTemplates.applicationInfoRequested({ name, comments }),
    text: `Hello ${name}, the review desk requested additional documentation: ${comments}`
  });
};

module.exports = {
  sendMail,
  sendOtpEmail,
  sendWelcomePatientEmail,
  sendWelcomeEmail: sendWelcomePatientEmail,
  sendApplicationSubmittedEmail,
  sendApplicationApprovedEmail,
  sendApplicationRejectedEmail,
  sendApplicationInfoRequestedEmail
};
