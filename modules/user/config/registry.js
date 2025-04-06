/**
 * User Module Registry Configuration
 * 
 * Defines registry settings and initialization for TypeComposers in the user module.
 */

// TypeComposer names
export const typeComposerNames = {
  USER: 'UserTC',
  AUTH_TOKEN: 'AuthTokenTC',
  USER_INPUT: 'UserInputTC',
  LOGIN_INPUT: 'LoginInputTC',
  REGISTER_INPUT: 'RegisterInputTC'
};

// Registry settings
export const registryConfig = {
  // Whether to create models if they don't exist
  createMissingModels: true,
  
  // Whether to validate types on registration
  validateTypes: true,
  
  // TypeComposer defaults
  defaults: {
    // Fields that should be excluded from base TypeComposers
    excludeFields: ['password'],
    
    // Fields that should be added to all TypeComposers
    commonFields: {
      createdAt: {
        type: 'Date!',
        description: 'Date when the record was created'
      },
      updatedAt: {
        type: 'Date!',
        description: 'Date when the record was last updated'
      }
    }
  }
};

// Type definitions for TypeComposers
export const typeDefinitions = {
  User: {
    description: 'User account information',
    fields: {
      name: {
        type: 'String',
        description: 'User full name'
      },
      email: {
        type: 'String!',
        description: 'User email address'
      },
      password: {
        type: 'String!',
        description: 'User password (hashed)',
        // This tells the system to keep this field hidden in GraphQL
        hidden: true
      },
      role: {
        type: 'String!',
        description: 'User role'
      },
      active: {
        type: 'Boolean!',
        description: 'Whether the user account is active',
        default: true
      },
      lastLogin: {
        type: 'Date',
        description: 'Date of last successful login'
      }
    }
  },
  
  AuthToken: {
    description: 'Authentication token information',
    fields: {
      token: {
        type: 'String!',
        description: 'JWT token'
      },
      user: {
        type: 'User!',
        description: 'User associated with this token'
      }
    }
  }
};

export default {
  typeComposerNames,
  registryConfig,
  typeDefinitions
}; 