/**
 * User Module Validators
 * 
 * Functional validation utilities for the user module.
 * These validators can be composed and reused across the module.
 */
import Promise from 'bluebird';
import { pipe, compose } from './helpers.js';
import { z } from 'zod';

/**
 * Result object for validators
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid - Whether the validation passed
 * @property {Array<string>} errors - Array of error messages if validation failed
 * @property {*} value - The validated and potentially transformed value
 */

/**
 * Create a successful validation result
 * 
 * @param {*} value - The validated value
 * @returns {ValidationResult} - Successful validation result
 */
export const valid = (value) => ({
  isValid: true,
  errors: [],
  value
});

/**
 * Create a failed validation result
 * 
 * @param {string|Array<string>} errors - Error message(s)
 * @param {*} value - The original value
 * @returns {ValidationResult} - Failed validation result
 */
export const invalid = (errors, value) => ({
  isValid: false,
  errors: Array.isArray(errors) ? errors : [errors],
  value
});

/**
 * Compose multiple validators into a single validator
 * Stops at first failure
 * 
 * @param {...Function} validators - Validator functions to compose
 * @returns {Function} - Composed validator function
 */
export const composeValidators = (...validators) => (value) => {
  for (const validator of validators) {
    const result = validator(value);
    if (!result.isValid) {
      return result;
    }
  }
  return valid(value);
};

/**
 * Run all validators regardless of failures and combine results
 * 
 * @param {...Function} validators - Validator functions to run
 * @returns {Function} - Combined validator function
 */
export const validateAll = (...validators) => (value) => {
  const results = validators.map(validator => validator(value));
  const allErrors = results.flatMap(result => result.errors);
  
  if (allErrors.length > 0) {
    return invalid(allErrors, value);
  }
  
  // Use the value from the last validator in case of transformations
  return valid(results[results.length - 1].value);
};

/**
 * Asynchronous validation using Bluebird promises
 * Runs all validators in parallel and combines results
 * 
 * @param {...Function} validators - Validator functions to run (can be async)
 * @returns {Function} - Async validator function that returns a Promise
 */
export const validateAsync = (...validators) => (value) => {
  // Use Bluebird's Promise.map to run all validators in parallel
  return Promise.map(validators, validator => 
    // Handle sync or async validators
    Promise.try(() => validator(value))
  )
  .then(results => {
    const allErrors = results.flatMap(result => result.errors);
    
    if (allErrors.length > 0) {
      return invalid(allErrors, value);
    }
    
    // Use the value from the last validator in case of transformations
    return valid(results[results.length - 1].value);
  });
};

/**
 * Create a validator that checks if a value is not empty
 * 
 * @param {string} fieldName - Name of the field for the error message
 * @returns {Function} - Validator function
 */
export const required = (fieldName) => (value) => {
  if (value === undefined || value === null || value === '') {
    return invalid(`${fieldName} is required`, value);
  }
  return valid(value);
};

/**
 * Create a validator that checks minimum string length
 * 
 * @param {string} fieldName - Name of the field for the error message
 * @param {number} minLength - Minimum length required
 * @returns {Function} - Validator function
 */
export const minLength = (fieldName, minLength) => (value) => {
  if (typeof value !== 'string' || value.length < minLength) {
    return invalid(`${fieldName} must be at least ${minLength} characters`, value);
  }
  return valid(value);
};

/**
 * Create a validator that checks maximum string length
 * 
 * @param {string} fieldName - Name of the field for the error message
 * @param {number} maxLength - Maximum length allowed
 * @returns {Function} - Validator function
 */
export const maxLength = (fieldName, maxLength) => (value) => {
  if (typeof value === 'string' && value.length > maxLength) {
    return invalid(`${fieldName} must be at most ${maxLength} characters`, value);
  }
  return valid(value);
};

/**
 * Create a validator that checks if a value matches a regex pattern
 * 
 * @param {string} fieldName - Name of the field for the error message
 * @param {RegExp} pattern - Regex pattern to match
 * @param {string} message - Custom error message
 * @returns {Function} - Validator function
 */
export const matches = (fieldName, pattern, message) => (value) => {
  if (typeof value !== 'string' || !pattern.test(value)) {
    return invalid(message || `${fieldName} has an invalid format`, value);
  }
  return valid(value);
};

/**
 * Create a validator that checks if a value is a valid email
 * 
 * @param {string} fieldName - Name of the field for the error message
 * @returns {Function} - Validator function
 */
export const isEmail = (fieldName = 'Email') => 
  matches(
    fieldName, 
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    `${fieldName} must be a valid email address`
  );

/**
 * Create a validator that checks if a password meets security requirements
 * 
 * @param {string} fieldName - Name of the field for the error message
 * @returns {Function} - Validator function
 */
export const isStrongPassword = (fieldName = 'Password') => (value) => {
  const checks = [
    { passed: value.length >= 8, message: 'must be at least 8 characters' },
    { passed: /[A-Z]/.test(value), message: 'must contain an uppercase letter' },
    { passed: /[a-z]/.test(value), message: 'must contain a lowercase letter' },
    { passed: /[0-9]/.test(value), message: 'must contain a number' },
    { passed: /[^A-Za-z0-9]/.test(value), message: 'must contain a special character' }
  ];
  
  const failures = checks.filter(check => !check.passed);
  
  if (failures.length > 0) {
    return invalid(
      `${fieldName} ${failures.map(f => f.message).join(', ')}`,
      value
    );
  }
  
  return valid(value);
};

/**
 * Async validator that checks if a value exists in the database
 * 
 * @param {string} fieldName - Name of the field for the error message
 * @param {Function} checkFunction - Function that checks for existence (returns Promise<boolean>)
 * @param {boolean} shouldExist - Whether the value should exist or not
 * @returns {Function} - Async validator function
 */
export const isUnique = (fieldName, checkFunction, shouldExist = false) => (value) => {
  return Promise.try(() => checkFunction(value))
    .then(exists => {
      if (exists === shouldExist) {
        return invalid(
          shouldExist 
            ? `${fieldName} does not exist` 
            : `${fieldName} already exists`,
          value
        );
      }
      return valid(value);
    });
};

/**
 * RegisterInput Schema using Zod
 */
export const RegisterInputSchema = z.object({
  name: z.string().trim().min(1, { message: 'Name is required' }).optional(),
  email: z
    .string({
      required_error: 'Email is required',
      invalid_type_error: 'Email must be a string',
    })
    .trim()
    .email({ message: 'Invalid email address format' })
    .toLowerCase(),
  password: z
    .string({
      required_error: 'Password is required',
    })
    .min(8, { message: 'Password must be at least 8 characters long' })
    .max(100, { message: 'Password must be 100 characters or less' }),
  // Optional role field can be added as needed
});

/**
 * LoginInput Schema using Zod
 */
export const LoginInputSchema = z.object({
  email: z
    .string({
      required_error: 'Email is required',
    })
    .trim()
    .email({ message: 'Invalid email address format' })
    .toLowerCase(),
  password: z
    .string({
      required_error: 'Password is required',
    })
    .min(1, { message: 'Password is required' }),
});

/**
 * Validates user registration input data against the schema.
 * @param {object} data - The input data to validate.
 * @returns {{success: boolean, data?: object, error?: ZodError}} - Zod parse result.
 */
export const validateRegisterInput = (data) => {
  return RegisterInputSchema.safeParse(data);
};

// Alias for backward compatibility
export const validateRegistrationInput = validateRegisterInput;

/**
 * Validates user login input data against the schema.
 * @param {object} data - The input data to validate.
 * @returns {{success: boolean, data?: object, error?: ZodError}} - Zod parse result.
 */
export const validateLoginInput = (data) => {
  return LoginInputSchema.safeParse(data);
};

/**
 * Validates registration input with both sync and async validators
 * @param {object} input - Registration input data
 * @param {object} options - Context objects needed for validation
 * @returns {Promise<ValidationResult>} - Validation result
 */
export const validateRegistrationInputAsync = (input, options) => {
  const { User, ctx } = options;
  
  // First run synchronous schema validation
  const schemaResult = validateRegisterInput(input);
  
  if (!schemaResult.success) {
    // Convert Zod errors to our format
    const errors = Object.entries(schemaResult.error.flatten().fieldErrors)
      .flatMap(([field, messages]) => messages.map(msg => `${field}: ${msg}`));
    
    return Promise.resolve(invalid(errors, input));
  }
  
  // Then run async validations like checking if email is already used
  return validateAsync(
    // Check if email is unique
    isUnique('Email', async (email) => {
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      return !!existingUser;
    }, false)
  )(schemaResult.data);
}; 