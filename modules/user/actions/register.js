import jwt from 'jsonwebtoken';
import Promise from 'bluebird';
import { createUserInputError } from '@apolloos/error-utils';
import { validateRegistrationInputAsync } from '../lib/validators.js';
import { promisePipe, apiResponse, withRetry } from '../lib/promiseUtils.js';

/**
 * Handles user registration.
 * @param {object} input - Input data (name, email, password, role?)
 * @param {object} ctx - The ApolloOS context.
 * @returns {Promise<{user: object, token: string}>} - The newly created user and a JWT.
 * @throws {UserInputError} If email already exists or input is invalid.
 */
export const registerUser = apiResponse((input, ctx) => {
  const { User } = ctx.app.getModule('user')?.models || {};
  const { createError, APOLLO_ERROR_CODES } = ctx.errors;
  const logger = ctx.logger;

  if (!User) {
    throw createError(
      'User model not found in registry.',
      APOLLO_ERROR_CODES.INTERNAL_SERVER_ERROR
    );
  }

  const jwtSecret = process.env.JWT_SECRET;
  const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '1d';

  if (!jwtSecret) {
    logger?.error('[Action: registerUser] JWT_SECRET environment variable is not set!');
    throw createError(
      'Token generation failed due to server configuration.',
      APOLLO_ERROR_CODES.INTERNAL_SERVER_ERROR
    );
  }

  logger?.debug(`[Action: registerUser] Attempting registration for email: ${input.email}`);

  return Promise.try(() => validateRegistrationInputAsync(input, { User, ctx }))
    .then(validationResult => {
      if (!validationResult.isValid) {
        throw createUserInputError('Registration validation failed.', { 
          validationErrors: validationResult.errors 
        });
      }
      
      return input;
    })
    .then(validInput => {
      // Create new user (password will be hashed by Mongoose pre-save hook)
      const newUser = new User({
        name: validInput.name,
        email: validInput.email.toLowerCase(),
        password: validInput.password, // Pass plain password, hook will hash it
        role: validInput.role || ctx.enums.roles.ROLES.USER, // Default to USER role if not provided
        active: true,
      });
      
      // Use withRetry to handle potential transient MongoDB connection issues
      return withRetry(() => newUser.save(), {
        maxRetries: 3, 
        initialDelay: 300,
        shouldRetry: err => !err.name || err.name !== 'ValidationError'
      });
    })
    .tap(newUser => {
      logger?.info(
        `[Action: registerUser] User created successfully: ${newUser.email} (ID: ${newUser._id})`
      );
    })
    .then(newUser => {
      // Generate JWT
      const tokenPayload = {
        id: newUser._id,
        email: newUser.email,
        role: newUser.role,
      };

      const token = jwt.sign(tokenPayload, jwtSecret, { expiresIn: jwtExpiresIn });
      
      // Return both user and token together
      return Promise.props({
        user: User.findById(newUser._id),
        token
      });
    })
    .timeout(10000) // Set a reasonable timeout
    .catch(Promise.TimeoutError, err => {
      logger?.error(`[Action: registerUser] Registration timed out for email: ${input.email}`);
      throw createError('Registration timed out.', APOLLO_ERROR_CODES.TIMEOUT_ERROR);
    })
    .catch(error => {
      // Handle Mongoose validation errors specifically
      if (error.name === 'ValidationError') {
        logger?.warn(`[Action: registerUser] Validation failed for ${input.email}:`, error.errors);
        const validationErrors = Object.values(error.errors).map((e) => ({
          field: e.path,
          message: e.message,
        }));
        throw createUserInputError('Registration validation failed.', { validationErrors });
      }
      
      // Re-throw UserInputError as is
      if (error.name === 'UserInputError') {
        throw error;
      }
      
      logger?.error(`[Action: registerUser] Error during registration for ${input.email}:`, error);
      throw createError('Registration failed.', APOLLO_ERROR_CODES.INTERNAL_SERVER_ERROR, {
        originalError: error.message,
      });
    });
});
