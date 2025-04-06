/**
 * Factory function to create User TypeComposer
 * This is designed to be used by the registry pattern, so it
 * doesn't require context and instead takes direct dependencies
 */
import { schemaComposer } from 'graphql-compose';
import { composeWithMongoose } from 'graphql-compose-mongoose';
import { ROLES, ROLE_VALUES } from '../../../config/enums/roles.js';
import { plugins as sharedMongoosePlugins } from '../../../config/shared-mongoose/index.js';
import { validateRegistrationInput, validateLoginInput } from '../validators/index.js';
import { createComponentLogger } from '../lib/logger.js';

// Helper to safely get jwt utility from context at runtime
const getJwtUtil = (context) => {
  const jwtUtil = context.jwt || (context.app && context.app.jwt);
  if (!jwtUtil) {
    throw new Error('JWT utility not available in context');
  }
  return jwtUtil;
};

/**
 * Create the User TypeComposer with its resolvers
 * @param {Object} UserModel - Mongoose model for User
 * @returns {Object} The User TypeComposer
 */
export const createUserTC = (UserModel) => {
  // Create logger
  const logger = createComponentLogger(null, 'typeComposer');
  
  // Create the TypeComposer
  const UserTC = composeWithMongoose(UserModel, {
    name: 'User',
    fields: {
      remove: ['password', '__v'],
    }
  });

  // Define input types for mutations
  const RegisterInputTC = schemaComposer.createInputTC({
    name: 'RegisterInput',
    fields: {
      name: 'String!',
      email: 'String!',
      password: 'String!',
    }
  });

  const LoginInputTC = schemaComposer.createInputTC({
    name: 'LoginInput',
    fields: {
      email: 'String!',
      password: 'String!',
    }
  });

  // Define AuthPayload type
  const AuthPayloadTC = schemaComposer.createObjectTC({
    name: 'AuthPayload',
    fields: {
      token: 'String!',
      user: UserTC,
    }
  });

  // Add context-dependent resolvers
  UserTC.addResolver({
    name: 'me',
    type: UserTC,
    resolve: async ({ context }) => {
      // If user is not authenticated, return null
      if (!context.user || !context.user.id) {
        return null;
      }
      
      const user = await UserModel.findById(context.user.id);
      if (!user || !user.active) return null;
      return user;
    }
  });

  UserTC.addResolver({
    name: 'register',
    type: AuthPayloadTC,
    args: {
      input: RegisterInputTC,
    },
    resolve: async ({ args, context }) => {
      const { input } = args;
      
      // Validate input using our functional validators
      const validationResult = validateRegistrationInput(input);
      if (!validationResult.isValid) {
        logger.error(`Registration validation failed: ${validationResult.errors.join(', ')}`);
        throw new Error(validationResult.errors[0]);
      }
      
      const { name, email, password } = validationResult.value;
      
      // Check if email already exists
      const existingUser = await UserModel.findOne({ email });
      if (existingUser) {
        throw new Error('Email already registered');
      }

      const user = new UserModel({
        name,
        email,
        password,
        role: 'user',
        active: true,
      });

      await user.save();

      const jwtUtil = getJwtUtil(context);
      const token = jwtUtil.sign(
        { id: user._id, email: user.email, role: user.role },
        process.env.JWT_SECRET || 'dev-secret-key',
        { expiresIn: '1d' }
      );

      return { token, user };
    }
  });

  UserTC.addResolver({
    name: 'login',
    type: AuthPayloadTC,
    args: {
      input: LoginInputTC,
    },
    resolve: async ({ args, context }) => {
      const { input } = args;
      
      // Validate input using our functional validators
      const validationResult = validateLoginInput(input);
      if (!validationResult.isValid) {
        logger.error(`Login validation failed: ${validationResult.errors.join(', ')}`);
        throw new Error(validationResult.errors[0]);
      }
      
      const { email, password } = validationResult.value;
      
      const user = await UserModel.findOne({ email });
      if (!user) {
        throw new Error('Invalid email or password');
      }

      const isValidPassword = await user.comparePassword(password);
      if (!isValidPassword) {
        throw new Error('Invalid email or password');
      }

      if (!user.active) {
        throw new Error('User account is inactive');
      }

      const jwtUtil = getJwtUtil(context);
      const token = jwtUtil.sign(
        { id: user._id, email: user.email, role: user.role },
        process.env.JWT_SECRET || 'dev-secret-key',
        { expiresIn: '1d' }
      );

      return { token, user };
    }
  });

  // Add testing resolvers
  if (process.env.NODE_ENV === 'development' || process.env.USE_MOCK_DB === 'true') {
    // Mock login for testing
    UserTC.addResolver({
      name: 'testMock',
      type: AuthPayloadTC,
      args: {
        input: LoginInputTC,
      },
      resolve: async ({ args, context }) => {
        // Simple static response for testing
        const user = {
          _id: 'test-id-123',
          name: 'Test User',
          email: 'test@example.com',
          role: 'user',
          active: true
        };
        
        const token = "test-token-123";
        
        return { token, user };
      }
    });

    // Mock me resolver for testing
    UserTC.addResolver({
      name: 'testMe',
      type: UserTC,
      resolve: async ({ context }) => {
        // If we have a test token in the auth header, return a mock user
        const authHeader = context.req?.headers?.authorization;
        if (authHeader && authHeader.includes('test-token')) {
          // Check if it's an admin test token
          if (authHeader.includes('admin-test-token')) {
            return {
              _id: 'admin-id-123',
              name: 'Admin User',
              email: 'admin@example.com',
              role: 'admin',
              active: true
            };
          }
          // Regular user token
          return {
            _id: 'test-id-123',
            name: 'Test User',
            email: 'test@example.com',
            role: 'user',
            active: true
          };
        }
        return null;
      }
    });
  }

  return UserTC;
}; 