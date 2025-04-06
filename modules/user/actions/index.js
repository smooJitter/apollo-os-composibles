// modules/user/actions/index.js
import { loginUser } from './login.js';
import bcrypt from 'bcryptjs';
import Promise from 'bluebird';
import * as R from 'ramda';

// Error handler helper
const handleError = (context) => (error) => {
  console.error(`[User Register] ${context}:`, error);
  throw error.message ? error : new Error(`${context}: An unexpected error occurred`);
};

/**
 * Register a new user using functional programming approach
 * 
 * @param {Object} models - The database models
 * @returns {Function} - Registration function that accepts input
 */
export const registerUser = ({ models }) => input => {
  const { User } = models;
  const { username, email, password, firstName, lastName, role } = input;
  
  // Input validation
  const validateInput = () => {
    if (!username) throw new Error('Username is required');
    if (!email) throw new Error('Email is required');
    if (!password) throw new Error('Password is required');
    
    // Simple email validation
    if (email && !email.includes('@')) {
      throw new Error('Invalid email format');
    }
    
    return input;
  };
  
  // Check for existing user
  const checkExistingUser = async () => {
    const existingUser = await User.findOne({ 
      $or: [{ username }, { email }] 
    }).catch(handleError('Database error checking existing user'));
    
    if (existingUser) {
      if (existingUser.username === username) {
        throw new Error('Username already exists');
      }
      if (existingUser.email === email) {
        throw new Error('Email already exists');
      }
    }
    
    return input;
  };
  
  // Hash the password
  const hashPassword = async () => {
    try {
      const salt = await bcrypt.genSalt(10);
      return await bcrypt.hash(password, salt);
    } catch (error) {
      handleError('Error hashing password')(error);
    }
  };
  
  // Create user document
  const createUserDocument = hashedPassword => {
    return new User({
      username,
      email,
      password: hashedPassword,
      firstName: firstName || '',
      lastName: lastName || '',
      role: role || 'user',
      isActive: true
    });
  };
  
  // Save user to database
  const saveUser = async (user) => {
    try {
      return await user.save();
    } catch (error) {
      handleError('Error saving user')(error);
    }
  };
  
  // Remove sensitive information
  const sanitizeUser = R.pipe(
    user => user.toObject(),
    R.omit(['password'])
  );
  
  // Log successful registration
  const logSuccess = R.tap(user => {
    console.log(`[User Register] Successfully registered: ${user.username}`);
  });
  
  // Main execution flow
  return Promise.try(async () => {
    validateInput();
    await checkExistingUser();
    const hashedPassword = await hashPassword();
    const newUser = createUserDocument(hashedPassword);
    const savedUser = await saveUser(newUser);
    
    return R.pipe(
      sanitizeUser,
      logSuccess
    )(savedUser);
  })
  .timeout(5000, 'Registration request timed out')
  .catch(error => {
    console.error('[User Register] Registration failed:', error);
    throw new Error(error.message || 'Registration failed');
  });
};

// Export actions with a consistent interface
export const userActions = {
  loginUser,
  registerUser
};

// Use a more functional approach for exporting actions
// export { registerUser, loginUser };

// Optionally create a default export object for easier access if preferred
// export default {
//     registerUser,
//     loginUser
// };
