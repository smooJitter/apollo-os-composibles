/**
 * User Module Resolver Configuration
 * 
 * Defines configuration settings for GraphQL resolvers in the user module.
 */

// Default resolver options
export const resolverDefaults = {
  // Pagination defaults
  pagination: {
    defaultLimit: 10,
    maxLimit: 100
  },
  
  // Caching settings for resolvers
  caching: {
    enabled: true,
    ttl: {
      queries: 300, // 5 minutes
      me: 60,       // 1 minute
      user: 120     // 2 minutes
    }
  },
  
  // Error handling configuration
  errorHandling: {
    // Whether to mask internal errors
    maskErrors: true,
    
    // Whether to log errors
    logErrors: true,
    
    // Default error messages
    defaultMessages: {
      notFound: 'User not found',
      unauthorized: 'Not authorized to perform this action',
      invalidInput: 'Invalid input provided',
      internal: 'An internal error occurred'
    }
  },
  
  // Rate limiting settings
  rateLimiting: {
    enabled: true,
    
    // Limits by resolver type
    limits: {
      queries: {
        window: 60, // 1 minute
        max: 100    // 100 requests per minute
      },
      mutations: {
        window: 60, // 1 minute
        max: 20     // 20 requests per minute
      },
      login: {
        window: 300, // 5 minutes
        max: 10      // 10 login attempts per 5 minutes
      },
      register: {
        window: 3600, // 1 hour
        max: 5        // 5 registrations per hour
      }
    }
  }
};

// Configuration by resolver category
export const resolverCategories = {
  // Public resolvers (no auth required)
  public: {
    resolvers: ['login', 'register', 'forgotPassword', 'resetPassword', 'verifyEmail'],
    rateLimiting: {
      window: 60,
      max: 20
    }
  },
  
  // User resolvers (requires authenticated user)
  user: {
    resolvers: ['me', 'updateProfile', 'changePassword', 'deleteAccount'],
    rateLimiting: {
      window: 60,
      max: 50
    }
  },
  
  // Admin resolvers (requires admin role)
  admin: {
    resolvers: ['allUsers', 'createUser', 'updateUser', 'deleteUser', 'setUserRole'],
    rateLimiting: {
      window: 60,
      max: 100
    }
  }
};

// Field-level access control
export const fieldAccessControl = {
  // Which fields are visible to which roles
  User: {
    _id: ['USER', 'MODERATOR', 'ADMIN', 'DEVELOPER'],
    name: ['USER', 'MODERATOR', 'ADMIN', 'DEVELOPER'],
    email: ['USER', 'MODERATOR', 'ADMIN', 'DEVELOPER'],
    role: ['USER', 'MODERATOR', 'ADMIN', 'DEVELOPER'],
    createdAt: ['USER', 'MODERATOR', 'ADMIN', 'DEVELOPER'],
    updatedAt: ['USER', 'MODERATOR', 'ADMIN', 'DEVELOPER'],
    active: ['MODERATOR', 'ADMIN', 'DEVELOPER'],
    lastLogin: ['USER', 'MODERATOR', 'ADMIN', 'DEVELOPER'],
    // Password should never be exposed through GraphQL
    password: []
  }
};

export default {
  resolverDefaults,
  resolverCategories,
  fieldAccessControl
}; 