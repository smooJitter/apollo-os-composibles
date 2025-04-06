// modules/user/actions/index.js
import { loginUser } from './login.js';
import bcrypt from 'bcryptjs';
import Promise from 'bluebird';
import * as R from 'ramda';

/**
 * Register a new user using functional programming with Ramda
 */
export const registerUser = ({ models }) => input => {
  const { User } = models;
  const { username, email, password, firstName, lastName, role } = input;
  
  // Helper functions
  const findExistingUser = () => 
    User.findOne({ $or: [{ username }, { email }] });
  
  const validateUserDoesNotExist = existingUser => {
    if (existingUser) {
      if (existingUser.username === username) {
        throw new Error('Username already exists');
      }
      if (existingUser.email === email) {
        throw new Error('Email already exists');
      }
    }
    return null; // Continue if no existing user
  };
  
  const hashPassword = async () => {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  };
  
  const createUser = hashedPassword => 
    new User({
      username,
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: role || 'user',
      isActive: true
    });
  
  const saveUser = user => user.save();
  
  const sanitizeUser = user => {
    const userObj = user.toObject();
    return R.omit(['password'], userObj);
  };
  
  // Main execution flow with async/await
  return Promise.try(async () => {
    const existingUser = await findExistingUser();
    validateUserDoesNotExist(existingUser);
    
    const hashedPassword = await hashPassword();
    const newUser = createUser(hashedPassword);
    const savedUser = await saveUser(newUser);
    
    return sanitizeUser(savedUser);
  })
  .timeout(5000, 'Registration request timed out')
  .catch(error => {
    console.error('[User Register] Error during registration:', error);
    throw error;
  });
};

// Use a more functional approach for exporting actions
export const userActions = {
  loginUser,
  registerUser
};

// Export actions for use within the module or potentially by other modules
// export { registerUser, loginUser };

// Optionally create a default export object for easier access if preferred
// export default {
//     registerUser,
//     loginUser
// };
