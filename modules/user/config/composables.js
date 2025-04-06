/**
 * User Module Composable Utilities Configuration
 * 
 * Defines composable function settings and patterns for use in the module.
 */

// Functional composition utilities configuration
export const functionComposition = {
  // Whether to prefer pipe or compose for function composition
  preferPipe: true,
  
  // Default direction for data flow in compositions
  dataFlowDirection: 'left-to-right',
  
  // Whether to use point-free style where possible
  usePointFree: true,
  
  // Whether to use currying for multi-argument functions
  useCurrying: true
};

// Compose patterns for common operations
export const composePatterns = {
  // Pattern for validation composition
  validation: [
    'validateInput',
    'sanitizeData',
    'checkBusinessRules',
    'checkPermissions'
  ],
  
  // Pattern for data transformation
  dataTransform: [
    'fetchData',
    'filterData',
    'transformData',
    'formatOutput'
  ],
  
  // Pattern for process execution
  processExecution: [
    'validateContext',
    'prepareData',
    'executeOperation',
    'handleResults',
    'logCompletion'
  ]
};

// Higher-order function presets
export const higherOrderFunctions = {
  // Standard higher-order functions to use in the module
  standard: [
    'withLogging',
    'withErrorHandling',
    'withValidation',
    'withCache',
    'withTransaction',
    'withPerfTracking'
  ],
  
  // Authentication and authorization higher-order functions
  auth: [
    'withAuth',
    'withRole',
    'withPermission'
  ],
  
  // Data handling higher-order functions
  data: [
    'withPagination',
    'withSorting',
    'withFiltering',
    'withSearch'
  ]
};

// Module-specific composition chains
export const moduleCompositions = {
  // User creation process
  userCreation: [
    'validateInput',
    'checkEmailUniqueness',
    'hashPassword',
    'createUserRecord',
    'assignDefaultRole',
    'sendWelcomeEmail'
  ],
  
  // User authentication process
  userAuthentication: [
    'validateCredentials', 
    'checkUserExists',
    'verifyPassword',
    'checkAccountStatus',
    'generateAuthToken',
    'trackLoginActivity'
  ],
  
  // Profile update process
  profileUpdate: [
    'validateInput',
    'checkCurrentPassword',
    'sanitizeFields',
    'updateUserRecord',
    'handleEmailChange'
  ]
};

export default {
  functionComposition,
  composePatterns,
  higherOrderFunctions,
  moduleCompositions
}; 