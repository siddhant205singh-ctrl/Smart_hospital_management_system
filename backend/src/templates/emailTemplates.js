/**
 * HealthMS Branded HTML Email Templates
 * Responsive, security-conscious, professional medical styling
 */

const baseEmailLayout = ({ title, preheader, content }) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin:0; padding:0; background-color:#f1f5f9; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#1e293b; }
    .container { max-width:560px; margin:24px auto; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 10px 25px -5px rgba(0,0,0,0.05); border:1px solid #e2e8f0; }
    .header { background:linear-gradient(135deg, #0d9488 0%, #0f766e 100%); padding:28px 32px; text-align:center; color:#ffffff; }
    .logo-text { font-size:24px; font-weight:800; letter-spacing:-0.5px; margin:0; }
    .logo-sub { font-size:11px; text-transform:uppercase; letter-spacing:1.5px; opacity:0.85; margin-top:4px; font-weight:600; }
    .body { padding:36px 32px; line-height:1.6; }
    .otp-box { margin:24px 0; padding:20px; background:#f0fdfa; border:2px dashed #14b8a6; border-radius:12px; text-align:center; }
    .otp-code { font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size:36px; font-weight:800; letter-spacing:8px; color:#0f766e; margin:6px 0; }
    .notice { margin-top:28px; padding:16px; background:#f8fafc; border-radius:8px; border-left:4px solid #0d9488; font-size:12px; color:#64748b; line-height:1.5; }
    .footer { padding:20px 32px; background:#f8fafc; border-top:1px solid #e2e8f0; text-align:center; font-size:11px; color:#94a3b8; line-height:1.5; }
    .badge { display:inline-block; padding:4px 10px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; border-radius:6px; margin-bottom:12px; }
    .badge-approved { background:#dcfce7; color:#15803d; }
    .badge-pending { background:#fef3c7; color:#b45309; }
    .badge-rejected { background:#fee2e2; color:#b91c1c; }
  </style>
</head>
<body>
  <div style="display:none;font-size:1px;color:#333333;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${preheader || title}
  </div>
  <div class="container">
    <div class="header">
      <div class="logo-text">HealthMS</div>
      <div class="logo-sub">Healthcare Operating System</div>
    </div>
    <div class="body">
      ${content}
      <div class="notice">
        <strong>Security Notice:</strong> HealthMS staff will never ask for your verification code or password. If you did not request this communication, please disregard this email or report suspicious activity to <a href="mailto:security@healthms.hospital" style="color:#0d9488;text-decoration:none;">security@healthms.hospital</a>.
      </div>
    </div>
    <div class="footer">
      <p style="margin:0 0 4px 0;">National Digital Health Mission (ABDM) & NBTC Blood Transfusion Compliant</p>
      <p style="margin:0;">&copy; ${new Date().getFullYear()} HealthMS Health Systems. All rights reserved.</p>
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
      <p style="margin:0 0 16px 0;font-size:14px;color:#334155;">Thank you for registering on HealthMS. Please use the 6-digit verification code below to verify your email address and activate your account access:</p>
      
      <div class="otp-box">
        <div style="font-size:12px;text-transform:uppercase;color:#0d9488;font-weight:700;margin-bottom:6px;">Your 6-Digit Verification Code</div>
        <div class="otp-code">${otp}</div>
        <div style="font-size:11px;color:#64748b;margin-top:8px;">Valid for <strong>${expiryMinutes} minutes</strong> • Single use only</div>
      </div>

      <p style="margin:0;font-size:13px;color:#475569;">Enter this code on the verification screen to proceed.</p>
    `;
    return baseEmailLayout({
      title: 'HealthMS Email Verification Code',
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
      <h2 style="margin:0 0 12px 0;font-size:20px;color:#0f172a;text-align:center;">Welcome to HealthMS, ${name}!</h2>
      <p style="font-size:14px;color:#334155;text-align:center;">Your email address has been successfully verified and your HealthMS Patient Account is now active.</p>
      
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
      title: 'Welcome to HealthMS Health System',
      preheader: 'Your HealthMS Patient account is verified and ready.',
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
      <p style="font-size:14px;color:#334155;">Your email address has been verified. Your application to join HealthMS as a <strong>${roleTitle}</strong> has been securely submitted and is now queued for credential review.</p>
      
      <div style="margin:20px 0;padding:16px;background:#fffbeb;border-radius:12px;border:1px solid #fde68a;font-size:13px;color:#92400e;">
        <strong>Current Status: PENDING_APPROVAL</strong><br>
        Your licensing and credential documents are being reviewed by <strong>${reviewer}</strong>. Institutional safety and Medical Council regulations require verified documentation before clinical and administrative access is granted.
      </div>

      <p style="font-size:13px;color:#475569;">You will receive an automated notification as soon as the review is complete (typically within 24–48 business hours). You can check your application status anytime on the login portal.</p>
    `;
    return baseEmailLayout({
      title: 'HealthMS Professional Registration Under Review',
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
      <p style="font-size:14px;color:#334155;">Your credentials and licensing documentation have been formally reviewed and <strong>APPROVED</strong> for <strong>${hospitalName || 'HealthMS Health Systems'}</strong>.</p>
      
      <div style="margin:20px 0;padding:16px;background:#f0fdf4;border-radius:12px;border:1px solid #bbf7d0;font-size:13px;color:#166534;">
        <strong>Role Activated: ${roleTitle}</strong><br>
        Your account status is now <strong>ACTIVE</strong> with the official platform Verified Specialist badge enabled. You now have full access to your clinical and operations consoles.
      </div>

      <p style="font-size:13px;color:#475569;text-align:center;margin-top:20px;">You may now sign in using your registered email and password.</p>
    `;
    return baseEmailLayout({
      title: 'HealthMS Credentials Approved - Account Active',
      preheader: 'Your HealthMS credentials have been approved. You may now sign in.',
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
      <p style="font-size:14px;color:#334155;">Thank you for your interest in HealthMS. Following administrative and institutional review, we regret to inform you that your application could not be approved at this time.</p>
      
      <div style="margin:20px 0;padding:16px;background:#fef2f2;border-radius:12px;border:1px solid #fecaca;font-size:13px;color:#991b1b;">
        <strong>Official Reason for Rejection:</strong><br>
        <span style="display:inline-block;margin-top:6px;font-style:italic;">"${rejectionReason || 'Documentation could not be verified against institutional or medical council registries.'}"</span>
      </div>

      <p style="font-size:13px;color:#475569;">If you believe this was an error or you have updated documentation, you may sign in to your HealthMS account to correct your submission and re-upload supporting credentials.</p>
    `;
    return baseEmailLayout({
      title: 'HealthMS Application Review Outcome',
      preheader: 'Important update regarding your HealthMS credential verification.',
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

      <p style="font-size:13px;color:#475569;">Please sign in to the HealthMS portal to update your submission and upload the requested information.</p>
    `;
    return baseEmailLayout({
      title: 'Action Required: Additional Information for HealthMS Verification',
      preheader: 'Please provide the requested documentation to complete your verification.',
      content
    });
  },

  // 7. Password Reset OTP
  passwordResetOtp: ({ name, otp, expiryMinutes = 10 }) => {
    const content = `
      <h2 style="margin:0 0 12px 0;font-size:20px;color:#0f172a;">Password Reset Request</h2>
      <p style="margin:0 0 16px 0;font-size:14px;color:#334155;">Hello <strong>${name || 'User'}</strong>,</p>
      <p style="margin:0 0 16px 0;font-size:14px;color:#334155;">A password reset was requested for your HealthMS account. Use the 6-digit code below to verify your identity and choose a new password:</p>
      
      <div class="otp-box" style="border-color:#f59e0b;background:#fffbeb;">
        <div style="font-size:12px;text-transform:uppercase;color:#d97706;font-weight:700;margin-bottom:6px;">Password Reset Code</div>
        <div class="otp-code" style="color:#b45309;">${otp}</div>
        <div style="font-size:11px;color:#64748b;margin-top:8px;">Valid for <strong>${expiryMinutes} minutes</strong> • Single use only</div>
      </div>

      <p style="margin:0;font-size:13px;color:#475569;">If you did not request a password reset, your account is secure and you may safely ignore this email.</p>
    `;
    return baseEmailLayout({
      title: 'HealthMS Password Reset Verification Code',
      preheader: `Your password reset code is ${otp}. Valid for ${expiryMinutes} minutes.`,
      content
    });
  },

  // 8. Login 2FA OTP
  login2faOtp: ({ name, otp, expiryMinutes = 5, ipAddress, deviceInfo }) => {
    const content = `
      <h2 style="margin:0 0 12px 0;font-size:20px;color:#0f172a;">Two-Factor Authentication Code</h2>
      <p style="margin:0 0 16px 0;font-size:14px;color:#334155;">Hello <strong>${name || 'Staff Member'}</strong>,</p>
      <p style="margin:0 0 16px 0;font-size:14px;color:#334155;">Please enter the 6-digit security code below to complete your sign-in to HealthMS:</p>
      
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
      title: 'HealthMS Two-Factor Authentication Login Code',
      preheader: `Your 2FA code is ${otp}. Valid for ${expiryMinutes} minutes.`,
      content
    });
  }
};
