/**
 * User Module Transforms Configuration
 * 
 * Defines transform presets and settings for use with TypeComposers.
 */

// Default options for various transform types
export const transformOptions = {
  // Cache transform defaults
  cache: {
    enabled: true,
    defaultTtl: 60 * 5, // 5 minutes
    presets: {
      shortTerm: 60 * 1, // 1 minute
      mediumTerm: 60 * 15, // 15 minutes
      longTerm: 60 * 60 * 6 // 6 hours
    }
  },
  
  // Pagination transform defaults
  pagination: {
    defaultLimit: 10,
    maxLimit: 100,
    presets: {
      small: { defaultLimit: 5, maxLimit: 20 },
      medium: { defaultLimit: 15, maxLimit: 50 },
      large: { defaultLimit: 30, maxLimit: 100 }
    }
  },
  
  // Authentication transform defaults
  auth: {
    // Which resolvers require authentication by default
    requireAuthByDefault: false,
    
    // Admin-only resolvers
    adminOnlyResolvers: [
      'findAll',
      'updateUser',
      'deleteUser'
    ],
    
    // Moderator-only resolvers
    moderatorResolvers: [
      'findAll',
      'approveUser'
    ]
  },
  
  // Validation transform defaults
  validation: {
    // Whether to validate by default
    validateByDefault: true,
    
    // Map of resolvers to validation schemas
    validationSchemas: {
      login: 'loginSchema',
      register: 'registrationSchema',
      updateProfile: 'profileUpdateSchema'
    }
  }
};

// Predefined transform chains for common use cases
export const transformPresets = {
  // Standard query resolver transform chain
  standardQuery: [
    'withLogging',
    'withValidation',
    'withPagination',
    'withCache'
  ],
  
  // Admin query resolver transform chain
  adminQuery: [
    'withLogging',
    'withAdminAuth',
    'withValidation',
    'withPagination',
    'withCache'
  ],
  
  // Standard mutation resolver transform chain
  standardMutation: [
    'withLogging',
    'withAuth',
    'withValidation',
    'withPerfTracking'
  ],
  
  // Public mutation resolver transform chain (no auth required)
  publicMutation: [
    'withLogging',
    'withValidation',
    'withRateLimiting'
  ]
};

// Resolver-specific transform configurations
export const resolverTransforms = {
  'me': ['withLogging', 'withAuth', 'withCache'],
  'login': ['withLogging', 'withValidation', 'withRateLimiting'],
  'register': ['withLogging', 'withValidation', 'withRateLimiting'],
  'findById': ['withLogging', 'withAdminAuth', 'withCache']
};

export default {
  transformOptions,
  transformPresets,
  resolverTransforms
}; 