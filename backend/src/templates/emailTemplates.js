/**
 * SmartCare Branded HTML Email Templates
 * Responsive, dark/light compatible, inline CSS, NBTC compliant
 */

const baseEmailLayout = ({ title, preheader, content }) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; }
    .container { max-width: 580px; margin: 30px auto; background: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #0d9488 0%, #0891b2 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
    .logo-text { font-size: 24px; font-weight: 800; letter-spacing: -0.5px; margin: 0; }
    .logo-sub { font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #ccfbf1; margin-top: 4px; font-weight: 600; }
    .body { padding: 32px 28px; line-height: 1.6; }
    .otp-box { text-align: center; margin: 28px 0; padding: 20px; background: #f0fdfa; border: 2px dashed #0d9488; border-radius: 16px; }
    .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #0f766e; }
    .notice { font-size: 12px; color: #64748b; line-height: 1.5; margin-top: 24px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
    .badge { display: inline-block; padding: 4px 10px; font-size: 11px; font-weight: 700; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px; }
    .badge-approved { background: #dcfce7; color: #15803d; }
    .badge-pending { background: #fef3c7; color: #b45309; }
    .badge-rejected { background: #fee2e2; color: #b91c1c; }
    .footer { background: #f8fafc; padding: 20px 24px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div style="display:none;font-size:1px;color:#333333;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${preheader || title}
  </div>
  <div class="container">
    <div class="header">
      <div class="logo-text">SmartCare</div>
      <div class="logo-sub">Healthcare Operating System</div>
    </div>
    <div class="body">
      ${content}
      <div class="notice">
        <strong>Security Notice:</strong> SmartCare staff will never ask for your verification code or password. If you did not request this communication, please disregard this email or report suspicious activity to <a href="mailto:security@smartcare.hospital" style="color:#0d9488;text-decoration:none;">security@smartcare.hospital</a>.
      </div>
    </div>
    <div class="footer">
      <p style="margin:0 0 4px 0;">National Digital Health Mission (ABDM) & NBTC Blood Transfusion Compliant</p>
      <p style="margin:0;">&copy; ${new Date().getFullYear()} SmartCare Health Systems. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

module.exports = {
  // 1. Email Verification OTP
  otpVerification: ({ name, otp, expiryMinutes = 10 }) => {
    const content = `
      <h2 style="margin:0 0 12px 0;font-size:20px;color:#0f172a;">Verify Your Email Address</h2>
      <p style="margin:0 0 16px 0;font-size:14px;color:#334155;">Hello <strong>${name || 'Valued User'}</strong>,</p>
      <p style="margin:0 0 16px 0;font-size:14px;color:#334155;">Thank you for registering on SmartCare. Please use the 6-digit verification code below to verify your email address and activate your account access:</p>
      
      <div class="otp-box">
        <div style="font-size:12px;text-transform:uppercase;color:#0d9488;font-weight:700;margin-bottom:6px;">Your 6-Digit Verification Code</div>
        <div class="otp-code">${otp}</div>
        <div style="font-size:11px;color:#64748b;margin-top:8px;">Valid for <strong>${expiryMinutes} minutes</strong> • Single use only</div>
      </div>

      <p style="margin:0;font-size:13px;color:#475569;">Enter this code on the verification screen to proceed.</p>
    `;
    return baseEmailLayout({
      title: 'SmartCare Email Verification Code',
      preheader: `Your verification code is ${otp}. Valid for ${expiryMinutes} minutes.`,
      content
    });
  },

  // 2. Welcome Patient (Active immediately)
  welcomePatient: ({ name }) => {
    const content = `
      <div style="text-align:center;margin-bottom:20px;">
        <span class="badge badge-approved">✓ Account Activated</span>
      </div>
      <h2 style="margin:0 0 12px 0;font-size:20px;color:#0f172a;text-align:center;">Welcome to SmartCare, ${name}!</h2>
      <p style="font-size:14px;color:#334155;text-align:center;">Your email address has been successfully verified and your SmartCare Patient Account is now active.</p>
      
      <div style="margin:24px 0;padding:16px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;font-size:13px;color:#334155;">
        <strong style="color:#0f172a;display:block;margin-bottom:8px;">What you can do right now:</strong>
        <ul style="margin:0;padding-left:20px;">
          <li style="margin-bottom:6px;">Search doctors, check real-time queue lengths, and book OPD slots.</li>
          <li style="margin-bottom:6px;">Track your live token position and travel alerts so you never wait in hospital lounges.</li>
          <li style="margin-bottom:6px;">Participate in the <strong>LifeShare Voluntary Blood Donor Program</strong> and protect your family with Fast-Track crisis benefits.</li>
          <li>Store and organize your medical lab reports and clinical timeline.</li>
        </ul>
      </div>

      <p style="font-size:13px;color:#475569;text-align:center;margin:0;">Sign in to your account anytime at your hospital portal.</p>
    `;
    return baseEmailLayout({
      title: 'Welcome to SmartCare Health System',
      preheader: 'Your SmartCare Patient account is verified and ready.',
      content
    });
  },

  // 3. Application Submitted for Professional Roles (Pending Approval)
  applicationSubmitted: ({ name, role, hospitalName }) => {
    const roleTitle = role === 'doctor' ? 'Doctor / Specialist' : (role === 'hospital_admin' ? 'Hospital Administrator' : 'Blood Bank Officer');
    const reviewer = role === 'hospital_admin' ? 'Platform Super Administration' : `the Credentialing Desk at ${hospitalName || 'your affiliated hospital'}`;
    const content = `
      <div style="text-align:center;margin-bottom:20px;">
        <span class="badge badge-pending">⏳ Verification Under Review</span>
      </div>
      <h2 style="margin:0 0 12px 0;font-size:20px;color:#0f172a;text-align:center;">Application Received</h2>
      <p style="font-size:14px;color:#334155;">Hello <strong>${name}</strong>,</p>
      <p style="font-size:14px;color:#334155;">Your email address has been verified. Your application to join SmartCare as a <strong>${roleTitle}</strong> has been securely submitted and is now queued for credential review.</p>
      
      <div style="margin:20px 0;padding:16px;background:#fffbeb;border-radius:12px;border:1px solid #fde68a;font-size:13px;color:#92400e;">
        <strong>Current Status: PENDING_APPROVAL</strong><br>
        Your licensing and credential documents are being reviewed by <strong>${reviewer}</strong>. Institutional safety and Medical Council regulations require verified documentation before clinical and administrative access is granted.
      </div>

      <p style="font-size:13px;color:#475569;">You will receive an automated notification as soon as the review is complete (typically within 24–48 business hours). You can check your application status anytime on the login portal.</p>
    `;
    return baseEmailLayout({
      title: 'SmartCare Professional Registration Under Review',
      preheader: 'Your credentials have been submitted for institutional review.',
      content
    });
  },

  // 4. Application Approved
  applicationApproved: ({ name, role, hospitalName }) => {
    const roleTitle = role === 'doctor' ? 'Verified Specialist Doctor' : (role === 'hospital_admin' ? 'Hospital Administrator' : 'Blood Bank Officer');
    const content = `
      <div style="text-align:center;margin-bottom:20px;">
        <span class="badge badge-approved">✓ Credential Approved</span>
      </div>
      <h2 style="margin:0 0 12px 0;font-size:20px;color:#0f172a;text-align:center;">Congratulations, ${name}!</h2>
      <p style="font-size:14px;color:#334155;">Your credentials and licensing documentation have been formally reviewed and <strong>APPROVED</strong> for <strong>${hospitalName || 'SmartCare Health Systems'}</strong>.</p>
      
      <div style="margin:20px 0;padding:16px;background:#f0fdf4;border-radius:12px;border:1px solid #bbf7d0;font-size:13px;color:#166534;">
        <strong>Role Activated: ${roleTitle}</strong><br>
        Your account status is now <strong>ACTIVE</strong> with the official platform Verified Specialist badge enabled. You now have full access to your clinical and operations consoles.
      </div>

      <p style="font-size:13px;color:#475569;text-align:center;margin-top:20px;">You may now sign in using your registered email and password.</p>
    `;
    return baseEmailLayout({
      title: 'SmartCare Credentials Approved - Account Active',
      preheader: 'Your SmartCare credentials have been approved. You may now sign in.',
      content
    });
  },

  // 5. Application Rejected
  applicationRejected: ({ name, role, rejectionReason }) => {
    const content = `
      <div style="text-align:center;margin-bottom:20px;">
        <span class="badge badge-rejected">✕ Application Rejected</span>
      </div>
      <h2 style="margin:0 0 12px 0;font-size:20px;color:#0f172a;text-align:center;">Credential Verification Update</h2>
      <p style="font-size:14px;color:#334155;">Hello <strong>${name}</strong>,</p>
      <p style="font-size:14px;color:#334155;">Thank you for your interest in SmartCare. Following administrative and institutional review, we regret to inform you that your application could not be approved at this time.</p>
      
      <div style="margin:20px 0;padding:16px;background:#fef2f2;border-radius:12px;border:1px solid #fecaca;font-size:13px;color:#991b1b;">
        <strong>Official Reason for Rejection:</strong><br>
        <span style="display:inline-block;margin-top:6px;font-style:italic;">"${rejectionReason || 'Documentation could not be verified against institutional or medical council registries.'}"</span>
      </div>

      <p style="font-size:13px;color:#475569;">If you believe this was an error or you have updated documentation, you may sign in to your SmartCare account to correct your submission and re-upload supporting credentials.</p>
    `;
    return baseEmailLayout({
      title: 'SmartCare Application Review Outcome',
      preheader: 'Important update regarding your SmartCare credential verification.',
      content
    });
  },

  // 6. Application Info Requested (Clarification Needed)
  applicationInfoRequested: ({ name, comments }) => {
    const content = `
      <div style="text-align:center;margin-bottom:20px;">
        <span class="badge badge-pending">⚠️ Clarification Requested</span>
      </div>
      <h2 style="margin:0 0 12px 0;font-size:20px;color:#0f172a;text-align:center;">Additional Information Required</h2>
      <p style="font-size:14px;color:#334155;">Hello <strong>${name}</strong>,</p>
      <p style="font-size:14px;color:#334155;">The credentialing review desk has reviewed your application and requires additional documentation or clarification before processing can complete.</p>
      
      <div style="margin:20px 0;padding:16px;background:#fffbeb;border-radius:12px;border:1px solid #fde68a;font-size:13px;color:#92400e;">
        <strong>Reviewer Remarks:</strong><br>
        <span style="display:inline-block;margin-top:6px;font-style:italic;">"${comments || 'Please provide clear, legible copies of your registration certificate and degree.'}"</span>
      </div>

      <p style="font-size:13px;color:#475569;">Please sign in to the SmartCare portal to update your submission and upload the requested information.</p>
    `;
    return baseEmailLayout({
      title: 'Action Required: Additional Information for SmartCare Verification',
      preheader: 'Please provide the requested documentation to complete your verification.',
      content
    });
  },

  // 7. Password Reset OTP
  passwordResetOtp: ({ name, otp, expiryMinutes = 10 }) => {
    const content = `
      <h2 style="margin:0 0 12px 0;font-size:20px;color:#0f172a;">Password Reset Request</h2>
      <p style="margin:0 0 16px 0;font-size:14px;color:#334155;">Hello <strong>${name || 'User'}</strong>,</p>
      <p style="margin:0 0 16px 0;font-size:14px;color:#334155;">A password reset was requested for your SmartCare account. Use the 6-digit code below to verify your identity and choose a new password:</p>
      
      <div class="otp-box" style="border-color:#f59e0b;background:#fffbeb;">
        <div style="font-size:12px;text-transform:uppercase;color:#d97706;font-weight:700;margin-bottom:6px;">Password Reset Code</div>
        <div class="otp-code" style="color:#b45309;">${otp}</div>
        <div style="font-size:11px;color:#64748b;margin-top:8px;">Valid for <strong>${expiryMinutes} minutes</strong> • Single use only</div>
      </div>

      <p style="margin:0;font-size:13px;color:#475569;">If you did not request a password reset, your account is secure and you may safely ignore this email.</p>
    `;
    return baseEmailLayout({
      title: 'SmartCare Password Reset Verification Code',
      preheader: `Your password reset code is ${otp}. Valid for ${expiryMinutes} minutes.`,
      content
    });
  },

  // 8. Login 2FA OTP
  login2faOtp: ({ name, otp, expiryMinutes = 5, ipAddress, deviceInfo }) => {
    const content = `
      <h2 style="margin:0 0 12px 0;font-size:20px;color:#0f172a;">Two-Factor Authentication Code</h2>
      <p style="margin:0 0 16px 0;font-size:14px;color:#334155;">Hello <strong>${name || 'Staff Member'}</strong>,</p>
      <p style="margin:0 0 16px 0;font-size:14px;color:#334155;">Please enter the 6-digit security code below to complete your sign-in to SmartCare:</p>
      
      <div class="otp-box">
        <div style="font-size:12px;text-transform:uppercase;color:#0d9488;font-weight:700;margin-bottom:6px;">Your 2FA Login Code</div>
        <div class="otp-code">${otp}</div>
        <div style="font-size:11px;color:#64748b;margin-top:8px;">Valid for <strong>${expiryMinutes} minutes</strong></div>
      </div>

      ${ipAddress || deviceInfo ? `
      <div style="font-size:11px;color:#64748b;background:#f8fafc;padding:10px 14px;border-radius:8px;border:1px solid #e2e8f0;">
        <strong>Sign-in Context:</strong> Device: ${deviceInfo || 'Web Browser'} ${ipAddress ? `• IP: ${ipAddress}` : ''}
      </div>` : ''}
    `;
    return baseEmailLayout({
      title: 'SmartCare Two-Factor Authentication Login Code',
      preheader: `Your 2FA code is ${otp}. Valid for ${expiryMinutes} minutes.`,
      content
    });
  }
};
