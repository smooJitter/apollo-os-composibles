// packages/error-utils/index.js
import { GraphQLError } from 'graphql';

// Define standard Apollo-compatible error codes
export const APOLLO_ERROR_CODES = {
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  // Add more specific codes as needed
};

/**
 * Base class for ApolloOS errors, ensuring compatibility with Apollo Server 4.
 * Automatically includes an error code in the extensions.
 */
export class ApolloosError extends GraphQLError {
  constructor(message, code = APOLLO_ERROR_CODES.INTERNAL_SERVER_ERROR, extensions = {}) {
    super(message, {
      extensions: {
        ...extensions,
        code: code, // Apollo Server 4 uses extensions.code
        timestamp: new Date().toISOString(),
      },
    });
    // Ensure the name property is set correctly
    this.name = this.constructor.name;
  }
}

// --- Common Error Types ---

export class AuthenticationError extends ApolloosError {
  constructor(message = 'Authentication required.', extensions = {}) {
    super(message, APOLLO_ERROR_CODES.UNAUTHENTICATED, extensions);
  }
}

export class ForbiddenError extends ApolloosError {
  constructor(message = 'Forbidden.', extensions = {}) {
    super(message, APOLLO_ERROR_CODES.FORBIDDEN, extensions);
  }
}

export class UserInputError extends ApolloosError {
  constructor(message = 'Invalid user input.', extensions = {}) {
    super(message, APOLLO_ERROR_CODES.BAD_REQUEST, extensions);
  }
}

export class NotFoundError extends ApolloosError {
  constructor(message = 'Resource not found.', extensions = {}) {
    super(message, APOLLO_ERROR_CODES.NOT_FOUND, extensions);
  }
}

export class ValidationError extends ApolloosError {
  constructor(message = 'Validation failed.', invalidArgs = {}, extensions = {}) {
    super(message, APOLLO_ERROR_CODES.VALIDATION_FAILED, {
      ...extensions,
      invalidArgs, // Include details about validation failures
    });
  }
}

// --- Factory Functions (Optional but convenient) ---

export const createError = (message, code, extensions) => {
  return new ApolloosError(message, code, extensions);
};

export const createAuthenticationError = (message, extensions) => {
  return new AuthenticationError(message, extensions);
};

export const createForbiddenError = (message, extensions) => {
  return new ForbiddenError(message, extensions);
};

export const createUserInputError = (message, extensions) => {
  return new UserInputError(message, extensions);
};

export const createNotFoundError = (message, extensions) => {
  return new NotFoundError(message, extensions);
};

export const createValidationError = (message, invalidArgs, extensions) => {
  return new ValidationError(message, invalidArgs, extensions);
};

// You might also add helpers here to format Mongoose validation errors
// into UserInputError or ValidationError instances.
