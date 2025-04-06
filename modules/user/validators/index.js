/**
 * User Module Validators (Legacy exports)
 * 
 * This file provides compatibility wrappers for older validation formats.
 * It converts the Zod validation results to the legacy format.
 */

import {
  RegisterInputSchema,
  validateRegisterInput as zodRegisterValidator,
  LoginInputSchema,
  validateLoginInput as zodLoginValidator,
  validateRegistrationInputAsync as zodRegistrationAsyncValidator
} from '../lib/validators.js';

// Re-export schemas
export {
  RegisterInputSchema,
  LoginInputSchema
};

/**
 * Validates user registration input data (legacy format)
 * @param {object} data - The input data to validate
 * @returns {object} - Result in legacy format with isValid, errors, and value
 */
export const validateRegistrationInput = (input) => {
  const zodResult = zodRegisterValidator(input);
  
  // Convert Zod format to legacy format
  if (!zodResult.success) {
    const errors = Object.entries(zodResult.error.flatten().fieldErrors)
      .flatMap(([field, messages]) => messages.map(msg => `${field}: ${msg}`));
    
    return {
      isValid: false,
      errors: errors,
      value: input
    };
  }
  
  return {
    isValid: true,
    errors: [],
    value: zodResult.data
  };
};

/**
 * Validates user login input data (legacy format)
 * @param {object} data - The input data to validate
 * @returns {object} - Result in legacy format with isValid, errors, and value
 */
export const validateLoginInput = (input) => {
  const zodResult = zodLoginValidator(input);
  
  // Convert Zod format to legacy format
  if (!zodResult.success) {
    const errors = Object.entries(zodResult.error.flatten().fieldErrors)
      .flatMap(([field, messages]) => messages.map(msg => `${field}: ${msg}`));
    
    return {
      isValid: false,
      errors: errors,
      value: input
    };
  }
  
  return {
    isValid: true,
    errors: [],
    value: zodResult.data
  };
};

/**
 * Validates registration input with async checks (legacy format)
 * @param {object} input - Registration input data
 * @param {object} options - Context objects needed for validation
 * @returns {Promise<object>} - Validation result in legacy format
 */
export const validateRegistrationInputAsync = (input, options) => {
  return zodRegistrationAsyncValidator(input, options)
    .then(result => {
      // Already in legacy format from the original function
      return result;
    });
};
