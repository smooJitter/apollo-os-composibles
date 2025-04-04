import jwt from 'jsonwebtoken';
import { createUserInputError } from '@packages/error-utils';

/**
 * Handles user registration.
 * @param {object} input - Input data (name, email, password, role?)
 * @param {object} ctx - The ApolloOS context.
 * @returns {Promise<{user: object, token: string}>} - The newly created user and a JWT.
 * @throws {UserInputError} If email already exists or input is invalid.
 */
export async function registerUser(input, ctx) {
  const { name, email, password, role } = input;
  const { User } = ctx.app.getModule('user')?.models || {};
  const { createError, APOLLO_ERROR_CODES } = ctx.errors;
  const logger = ctx.logger;

  if (!User) {
    throw createError('User model not found in registry.', APOLLO_ERROR_CODES.INTERNAL_SERVER_ERROR);
  }

  // Basic validation (more can be added via validators package)
  if (!email || !password || password.length < 8) {
      throw createUserInputError('Email and a password (min 8 characters) are required.', { input: { email: !!email, password: password?.length } });
  }

  logger?.debug(`[Action: registerUser] Attempting registration for email: ${email}`);

  // Check if user already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw createUserInputError('An account with this email already exists.', { email });
  }

  // Create new user (password will be hashed by Mongoose pre-save hook)
  try {
    const newUser = new User({
      name,
      email: email.toLowerCase(),
      password, // Pass plain password, hook will hash it
      role: role || ctx.enums.roles.ROLES.USER, // Default to USER role if not provided
      active: true,
    });

    await newUser.save();
    logger?.info(`[Action: registerUser] User created successfully: ${newUser.email} (ID: ${newUser._id})`);

    // Generate JWT
    // Ensure JWT_SECRET and JWT_EXPIRES_IN are in your environment/.env file
    const jwtSecret = process.env.JWT_SECRET;
    const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '1d';

    if (!jwtSecret) {
        logger?.error('[Action: registerUser] JWT_SECRET environment variable is not set!');
        // Decide how to handle this - maybe don't issue token, or throw internal error
        throw createError('Token generation failed due to server configuration.', APOLLO_ERROR_CODES.INTERNAL_SERVER_ERROR);
    }

    const tokenPayload = {
      id: newUser._id,
      email: newUser.email,
      role: newUser.role,
      // Add any other relevant non-sensitive info
    };

    const token = jwt.sign(tokenPayload, jwtSecret, { expiresIn: jwtExpiresIn });

    // Return the user (password excluded by default) and token
    // Need to re-fetch or manually exclude password if necessary for the return value
    const userForPayload = await User.findById(newUser._id); // Re-fetch to ensure password isn't included

    return {
      user: userForPayload,
      token,
    };

  } catch (error) {
    // Handle Mongoose validation errors specifically
    if (error.name === 'ValidationError') {
      logger?.warn(`[Action: registerUser] Validation failed for ${email}:`, error.errors);
      // Extract validation messages
      const validationErrors = Object.values(error.errors).map(e => ({ field: e.path, message: e.message }));
      throw createUserInputError('Registration validation failed.', { validationErrors });
    }
    logger?.error(`[Action: registerUser] Error during registration for ${email}:`, error);
    throw createError('Registration failed.', APOLLO_ERROR_CODES.INTERNAL_SERVER_ERROR, { originalError: error.message });
  }
} 