/**
 * SmartCare Password Strength & Policy Engine
 * Enforces: 8+ chars (min 10 recommended), Upper, Lower, Number, Symbol, Common Blocklist
 */

const COMMON_BLOCKLIST = [
  'password', 'password123', 'password123!', '12345678', '123456789',
  'qwerty123', 'smartcare123', 'smartcare2026', 'admin123', 'admin@123',
  'hospital123', 'doctor123', 'welcome123', 'letmein123', 'iloveyou'
];

const validatePasswordPolicy = (password) => {
  const errors = [];
  let score = 0;

  if (!password || typeof password !== 'string') {
    return { valid: false, score: 0, errors: ['Password is required.'] };
  }

  // Length check
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long.');
  } else if (password.length >= 10) {
    score += 1;
  }

  // Uppercase
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter (A-Z).');
  } else {
    score += 1;
  }

  // Lowercase
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter (a-z).');
  } else {
    score += 1;
  }

  // Numeric
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number (0-9).');
  } else {
    score += 1;
  }

  // Special symbol
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special symbol (!@#$%^&* etc.).');
  } else {
    score += 1;
  }

  // Blocklist check
  const lower = password.toLowerCase();
  if (COMMON_BLOCKLIST.some(common => lower.includes(common))) {
    errors.push('Password is too common or easily guessable. Please choose a unique phrase.');
  }

  return {
    valid: errors.length === 0,
    score, // 0 to 5
    errors
  };
};

module.exports = {
  validatePasswordPolicy
};
