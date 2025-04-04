import jwt from 'jsonwebtoken';
import { createAuthenticationError } from '@packages/error-utils';

/**
 * Handles user login.
 * @param {object} input - Input data (email, password).
 * @param {object} ctx - The ApolloOS context.
 * @returns {Promise<{user: object, token: string}>} - The logged-in user and a JWT.
 * @throws {AuthenticationError} If login fails (wrong email/password, inactive user).
 */
export async function loginUser(input, ctx) {
  const { email, password } = input;
  const { User } = ctx.app.getModule('user')?.models || {};
  const { createError, APOLLO_ERROR_CODES } = ctx.errors;
  const logger = ctx.logger;

  if (!User) {
    throw createError('User model not found in registry.', APOLLO_ERROR_CODES.INTERNAL_SERVER_ERROR);
  }

  if (!email || !password) {
      throw createAuthenticationError('Email and password are required.');
  }

  logger?.debug(`[Action: loginUser] Attempting login for email: ${email}`);

  // Find user by email - explicitly select password as it's excluded by default
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

  // Check if user exists and if password is correct
  if (!user || !(await user.comparePassword(password))) {
      logger?.warn(`[Action: loginUser] Failed login attempt for email: ${email} (Invalid credentials)`);
      throw createAuthenticationError('Invalid email or password.');
  }

  // Check if user account is active
  if (!user.active) {
      logger?.warn(`[Action: loginUser] Failed login attempt for email: ${email} (Account inactive)`);
      throw createAuthenticationError('Your account is inactive. Please contact support.');
  }

  // Generate JWT
  const jwtSecret = process.env.JWT_SECRET;
  const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '1d';

  if (!jwtSecret) {
      logger?.error('[Action: loginUser] JWT_SECRET environment variable is not set!');
      throw createError('Login failed due to server configuration.', APOLLO_ERROR_CODES.INTERNAL_SERVER_ERROR);
  }

  const tokenPayload = {
    id: user._id,
    email: user.email,
    role: user.role,
    // Add any other relevant non-sensitive info
  };

  const token = jwt.sign(tokenPayload, jwtSecret, { expiresIn: jwtExpiresIn });

  logger?.info(`[Action: loginUser] User logged in successfully: ${user.email} (ID: ${user._id})`);

  // Return the user (password excluded by default select behavior) and token
  // We fetched with +password, so re-fetch or manually omit if needed for response
  const userForPayload = await User.findById(user._id); // Re-fetch without password

  return {
    user: userForPayload,
    token,
  };
} 