// config/errors/index.js

// Error codes - follow Apollo Server conventions
export const APOLLO_ERROR_CODES = {
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  BAD_USER_INPUT: 'BAD_USER_INPUT',
  AUTHENTICATION_ERROR: 'UNAUTHENTICATED',
  FORBIDDEN_ERROR: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  CONFLICT_ERROR: 'CONFLICT',
};

/**
 * Create a base error with code and extensions
 */
export function createError(
  message,
  code = APOLLO_ERROR_CODES.INTERNAL_SERVER_ERROR,
  extensions = {}
) {
  const error = new Error(message);
  error.extensions = {
    code,
    ...extensions,
  };
  return error;
}

/**
 * Create an authentication error (user not logged in)
 */
export function createAuthenticationError(message, extensions = {}) {
  return createError(
    message || 'Authentication required',
    APOLLO_ERROR_CODES.AUTHENTICATION_ERROR,
    extensions
  );
}

/**
 * Create a forbidden error (user doesn't have permission)
 */
export function createForbiddenError(message, extensions = {}) {
  return createError(
    message || 'Forbidden: Insufficient permissions',
    APOLLO_ERROR_CODES.FORBIDDEN_ERROR,
    extensions
  );
}

/**
 * Create a user input error (validation failed)
 */
export function createUserInputError(message, extensions = {}) {
  return createError(message || 'Invalid input', APOLLO_ERROR_CODES.BAD_USER_INPUT, extensions);
}

/**
 * Create a not found error
 */
export function createNotFoundError(message, extensions = {}) {
  return createError(message || 'Resource not found', APOLLO_ERROR_CODES.NOT_FOUND, extensions);
}

/**
 * Create a conflict error (e.g., duplicate entry)
 */
export function createConflictError(message, extensions = {}) {
  return createError(message || 'Resource conflict', APOLLO_ERROR_CODES.CONFLICT_ERROR, extensions);
}

export default {
  APOLLO_ERROR_CODES,
  createError,
  createAuthenticationError,
  createForbiddenError,
  createUserInputError,
  createNotFoundError,
  createConflictError,
};
