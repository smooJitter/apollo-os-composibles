import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Promise from 'bluebird';
import * as R from 'ramda';

/**
 * Login a user with username/email and password using functional programming
 * 
 * @param {Object} models - Database models
 * @param {Object} input - Login credentials
 * @param {string} input.username - Username or email
 * @param {string} input.password - User password
 * @returns {Promise<{user: Object, token: string}>} - User and JWT token
 */
export const loginUser = ({ models }) => input => {
  const { User } = models;
  const { username, password } = input;

  // Helper functions
  const validateInput = () => {
    if (!username || !password) {
      throw new Error('Username and password are required');
    }
    return input;
  };

  const findUser = () => User.findOne({
    $or: [
      { username },
      { email: username.includes('@') ? username : null }
    ]
  });

  const validateUserExists = user => {
    if (!user) {
      throw new Error('Invalid credentials');
    }
    return user;
  };

  const checkUserIsActive = user => {
    if (!user.isActive) {
      throw new Error('Account is disabled');
    }
    return user;
  };

  const verifyPassword = async user => {
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error('Invalid credentials');
    }
    return user;
  };

  const generateToken = user => {
    const tokenPayload = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };
    
    const secret = process.env.JWT_SECRET || 'default-jwt-secret';
    const expiresIn = '24h';
    
    return {
      user,
      token: jwt.sign(tokenPayload, secret, { expiresIn })
    };
  };

  const sanitizeUserData = authPayload => ({
    user: R.omit(['password'], authPayload.user.toObject()),
    token: authPayload.token
  });

  const logSuccessfulLogin = authPayload => {
    console.log(`[User Login] User logged in: ${authPayload.user.username}`);
    return authPayload;
  };

  // Main execution flow - more sequential to avoid pipeP
  return Promise.try(async () => {
    validateInput();
    
    const user = await findUser();
    validateUserExists(user);
    checkUserIsActive(user);
    await verifyPassword(user);
    
    const authPayload = generateToken(user);
    const sanitizedData = sanitizeUserData(authPayload);
    
    return logSuccessfulLogin(sanitizedData);
  })
  .timeout(5000, 'Login request timed out')
  .catch(error => {
    console.error('[User Login] Error during login:', error);
    throw error;
  });
};
