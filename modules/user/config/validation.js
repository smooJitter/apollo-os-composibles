/**
 * User Module Validation Configuration
 * 
 * Defines validation rules and settings for user-related data.
 */

// User data validation rules
export const userSchema = {
  name: {
    required: false,
    minLength: 2,
    maxLength: 50,
    pattern: /^[a-zA-Z0-9\s\-_.]+$/,
    errorMessages: {
      minLength: 'Name must be at least 2 characters',
      maxLength: 'Name cannot exceed 50 characters',
      pattern: 'Name contains invalid characters'
    }
  },
  
  email: {
    required: true,
    minLength: 5,
    maxLength: 100,
    pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    errorMessages: {
      required: 'Email is required',
      minLength: 'Email must be at least 5 characters',
      maxLength: 'Email cannot exceed 100 characters',
      pattern: 'Invalid email format'
    }
  },
  
  password: {
    required: true,
    // Password requirements are defined in passwordPolicy.js
    errorMessages: {
      required: 'Password is required'
    }
  },
  
  role: {
    required: false,
    // Valid roles are defined in roles.js
    errorMessages: {
      invalidRole: 'Invalid user role'
    }
  }
};

// Login input validation
export const loginSchema = {
  email: {
    required: true,
    errorMessages: {
      required: 'Email is required'
    }
  },
  
  password: {
    required: true,
    errorMessages: {
      required: 'Password is required'
    }
  }
};

// Registration input validation
export const registrationSchema = {
  // Uses the userSchema, but may have additional requirements
  additionalFields: {
    confirmPassword: {
      required: true,
      errorMessages: {
        required: 'Please confirm your password',
        mismatch: 'Passwords do not match'
      }
    },
    
    acceptTerms: {
      required: true,
      errorMessages: {
        required: 'You must accept the terms and conditions'
      }
    }
  }
};

// Profile update validation
export const profileUpdateSchema = {
  // Which fields can be updated by the user
  allowedFields: ['name', 'email', 'password'],
  
  // Additional validation for profile updates
  additionalFields: {
    currentPassword: {
      required: true,
      errorMessages: {
        required: 'Current password is required to update profile',
        invalid: 'Current password is incorrect'
      }
    }
  }
};

// Default validation settings
export const validationDefaults = {
  // Whether to trim string inputs
  trimStrings: true,
  
  // Whether to convert string values to lowercase
  lowercaseEmail: true,
  
  // Sanitization options
  sanitize: {
    enabled: true,
    htmlEscape: true,
    stripTags: true
  }
};

export default {
  userSchema,
  loginSchema,
  registrationSchema,
  profileUpdateSchema,
  validationDefaults
}; 