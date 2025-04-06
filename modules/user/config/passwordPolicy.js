/**
 * User Module Password Policy Configuration
 * 
 * Defines password requirements and validation rules for the user module.
 */

// Password strength requirements
export const requirements = {
  minLength: 8,
  maxLength: 100,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  specialChars: '!@#$%^&*()_+-={}[]|:;"\'<>,.?/~`'
};

// Password hashing configuration
export const hashing = {
  algorithm: 'bcrypt',
  saltRounds: 12
};

// Password rules for validation messages
export const validationRules = [
  {
    test: (password) => password.length >= requirements.minLength,
    message: `Password must be at least ${requirements.minLength} characters long`
  },
  {
    test: (password) => password.length <= requirements.maxLength,
    message: `Password must not exceed ${requirements.maxLength} characters`
  },
  {
    test: (password) => requirements.requireUppercase ? /[A-Z]/.test(password) : true,
    message: 'Password must contain at least one uppercase letter'
  },
  {
    test: (password) => requirements.requireLowercase ? /[a-z]/.test(password) : true,
    message: 'Password must contain at least one lowercase letter'
  },
  {
    test: (password) => requirements.requireNumbers ? /[0-9]/.test(password) : true,
    message: 'Password must contain at least one number'
  },
  {
    test: (password) => {
      if (!requirements.requireSpecialChars) return true;
      const specialCharsRegex = new RegExp(`[${requirements.specialChars.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}]`);
      return specialCharsRegex.test(password);
    },
    message: 'Password must contain at least one special character'
  }
];

// Password expiration and reset policies
export const expirationPolicy = {
  enforceExpiration: false,
  expirationDays: 90,
  preventReuseCount: 3,
  lockoutAttempts: 5,
  lockoutTimeMinutes: 15
};

export default {
  requirements,
  hashing,
  validationRules,
  expirationPolicy
}; 