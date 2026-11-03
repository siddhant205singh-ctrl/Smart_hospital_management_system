const path = require('path');
const fs = require('fs');

// Try multiple candidate locations for .env
const envCandidates = [
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../.env'),
  path.resolve(process.cwd(), 'backend/.env'),
  path.resolve(process.cwd(), '.env')
];

for (const envPath of envCandidates) {
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
    break;
  }
}
require('dotenv').config();

const nodemailer = require('nodemailer');

async function testGmail() {
  console.log('==================================================');
  console.log('📧 SMARTCARE GMAIL SMTP CONNECTION VERIFICATION');
  console.log('==================================================');
  console.log('Email User: ', process.env.SMTP_USER || '(Not found in .env)');
  console.log('Service:    ', process.env.SMTP_SERVICE || 'gmail');
  console.log('Pass Length:', process.env.SMTP_PASS ? `${process.env.SMTP_PASS.trim().length} characters` : 'None');

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error('\n❌ ERROR: SMTP_USER or SMTP_PASS is missing in backend/.env');
    console.log('Please ensure backend/.env contains:');
    console.log('SMTP_SERVICE=gmail');
    console.log('SMTP_USER=healthmscare@gmail.com');
    console.log('SMTP_PASS=your_16_digit_app_password');
    return;
  }

  const cleanPass = process.env.SMTP_PASS.replace(/\s+/g, '').trim();

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER.trim(),
      pass: cleanPass
    }
  });

  try {
    console.log('\nContacting Google SMTP server (smtp.gmail.com)...');
    await transporter.verify();
    console.log('\n✅ SUCCESS! Google SMTP credentials are authenticated and valid.');
    console.log('SmartCare can now dispatch real emails to any address from', process.env.SMTP_USER);
  } catch (error) {
    console.error('\n❌ SMTP Verification Error:', error.message);
    if (error.responseCode === 535 || error.message.includes('535') || error.message.includes('BadCredentials')) {
      console.log('\n⚠️ REASON FOR ERROR:');
      console.log('Google rejected the password because you used a normal Google login password.');
      console.log('Google requires a 16-character "App Password".');
      console.log('1. Go to: https://myaccount.google.com/apppasswords');
      console.log('2. Create an app password for "SmartCare".');
      console.log('3. Copy the 16 letters and paste into SMTP_PASS in backend/.env');
    }
  }
  console.log('==================================================\n');
}

testGmail();
