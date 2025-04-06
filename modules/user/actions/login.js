import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Promise from 'bluebird';
import * as R from 'ramda';

// Helper for handling errors in a functional way
const handleError = (message) => (error) => {
  console.error(`[User Login] ${message}:`, error);
  throw error.message ? error : new Error(message);
};

/**
 * Login a user with username/email and password using functional programming
 * 
 * @param {Object} models - Database models
 * @returns {Function} - Login function expecting input
 */
export const loginUser = ({ models }) => input => {
  const { User } = models;
  const { username, password } = input;

  // Helper functions with consistent error handling
  
  // 1. Validate input
  const validateInput = () => {
    if (!username || !password) {
      throw new Error('Username and password are required');
    }
    return input;
  };

  // 2. Find user by username or email
  const findUser = async () => {
    const user = await User.findOne({
      $or: [
        { username },
        { email: username.includes('@') ? username : null }
      ]
    }).catch(handleError('Database error while finding user'));
    
    if (!user) {
      throw new Error('Invalid credentials');
    }
    
    return user;
  };

  // 3. Validate user is active
  const validateUserIsActive = user => {
    if (!user.isActive) {
      throw new Error('Account is disabled');
    }
    return user;
  };

  // 4. Verify password
  const verifyPassword = async user => {
    const isMatch = await bcrypt.compare(password, user.password)
      .catch(handleError('Error comparing passwords'));
      
    if (!isMatch) {
      throw new Error('Invalid credentials');
    }
    
    return user;
  };

  // 5. Generate JWT
  const generateToken = user => {
    // Extract only the properties we need for the token
    const payload = R.pick(['id', 'username', 'email', 'role'], user);
    
    // Get JWT config with fallbacks
    const secret = process.env.JWT_SECRET || 'default-jwt-secret';
    const expiresIn = process.env.JWT_EXPIRES_IN || '24h';
    
    try {
      return {
        user,
        token: jwt.sign(payload, secret, { expiresIn })
      };
    } catch (error) {
      handleError('Error generating token')(error);
    }
  };

  // 6. Remove sensitive data
  const removeSensitiveData = authPayload => ({
    user: R.pipe(
      R.prop('user'),
      user => user.toObject(),
      R.omit(['password'])
    )(authPayload),
    token: authPayload.token
  });

  // 7. Log success
  const logSuccess = R.tap(result => {
    console.log(`[User Login] User logged in: ${result.user.username}`);
  });

  // Main execution flow with Promise.try for error handling
  return Promise.try(async () => {
    validateInput();
    const user = await findUser();
    validateUserIsActive(user);
    await verifyPassword(user);
    const authData = generateToken(user);
    return R.pipe(
      removeSensitiveData,
      logSuccess
    )(authData);
  })
  .timeout(5000, 'Login request timed out')
  .catch(error => {
    // Wrap all errors with contextual information
    console.error('[User Login] Error during login:', error);
    throw new Error(error.message || 'Authentication failed');
  });
};
