const nodemailer = require('nodemailer');
const emailTemplates = require('../templates/emailTemplates');

let transporter = null;
let isDevSimulator = false;
let initPromise = null; // Ensures init runs exactly once and is awaitable

// Initialize Transporter (lazy singleton)
const initTransporter = () => {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    if (process.env.SMTP_SERVICE === 'gmail' || (process.env.GMAIL_USER && process.env.GMAIL_PASS)) {
      const gmailUser = process.env.SMTP_USER || process.env.GMAIL_USER;
      const gmailPass = process.env.SMTP_PASS || process.env.GMAIL_PASS;

      if (!gmailUser || !gmailPass) {
        console.error('[EmailService] ❌ SMTP_USER or SMTP_PASS missing in .env — falling back to console logger.');
        isDevSimulator = true;
        return;
      }

      const t = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: gmailUser, pass: gmailPass }
      });

      try {
        await t.verify();
        transporter = t;
        console.log(`[EmailService] ✅ Gmail SMTP ready — sending as ${gmailUser}`);
      } catch (verifyErr) {
        console.error(`[EmailService] ❌ Gmail SMTP verify failed: ${verifyErr.message}`);
        console.error('[EmailService] ⚠️  Check SMTP_USER / SMTP_PASS in .env — falling back to console logger.');
        isDevSimulator = true;
      }

    } else if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
      console.log('[EmailService] ✅ Custom SMTP Transporter initialized successfully');

    } else if (process.env.USE_ETHEREAL === 'true') {
      try {
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: { user: testAccount.user, pass: testAccount.pass }
        });
        console.log('[EmailService] ✅ Ethereal Test Transporter initialized for:', testAccount.user);
      } catch (err) {
        console.warn('[EmailService] Ethereal init failed, falling back to console logger:', err.message);
        isDevSimulator = true;
      }

    } else {
      isDevSimulator = true;
      console.log('[EmailService] ℹ️  No SMTP configured — using development console email logger.');
    }
  })();

  return initPromise;
};

// Kick off initialization immediately so it's ready by the time first email is sent
initTransporter().catch(err => {
  console.warn('[EmailService] Init warning:', err.message);
  isDevSimulator = true;
});

/**
 * Generic email dispatcher with graceful fallback
 */
const sendMail = async ({ to, subject, html, text }) => {
  // Always await init — safe to call multiple times (returns cached promise)
  await initTransporter();

  // When using Gmail, the FROM must exactly match the authenticated Gmail address
  let from;
  if (process.env.EMAIL_FROM) {
    from = process.env.EMAIL_FROM;
  } else if (process.env.SMTP_USER && (process.env.SMTP_SERVICE === 'gmail' || process.env.GMAIL_USER)) {
    from = `"HealthMS" <${process.env.SMTP_USER}>`;
  } else {
    from = '"HealthMS Health System" <no-reply@healthms.hospital>';
  }

  if (isDevSimulator || !transporter) {
    const otpMatch = text?.match(/\b(\d{6})\b/);
    console.log('\n==============================================================');
    console.log('📧 [HEALTHMS EMAIL DISPATCH - DEV SIMULATOR]');
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    if (otpMatch) {
      console.log(`🔑 6-DIGIT VERIFICATION CODE: 👉👉  ${otpMatch[1]}  👈👈`);
    }
    if (text) console.log(`Summary: ${text}`);
    console.log('==============================================================\n');
    return { messageId: `dev-sim-${Date.now()}`, simulated: true };
  }

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text: text || subject,
      html
    });

    if (process.env.USE_ETHEREAL === 'true') {
      console.log('[EmailService] Ethereal preview URL:', nodemailer.getTestMessageUrl(info));
    }

    return info;
  } catch (error) {
    console.error('[EmailService] SendMail Error:', error.message);
    // Fallback log to console so developers are never blocked during local testing
    console.log('\n==============================================================');
    console.log('📧 [FALLBACK CONSOLE EMAIL DISPATCH]');
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
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
