/**
 * Promise Utilities Usage Examples
 * 
 * This file demonstrates how to effectively use the promise utilities
 * with Bluebird for various async operations in the user module.
 */
import Promise from 'bluebird';
import { 
  composeAsync, 
  pipeAsync, 
  curryAsync, 
  memoizeAsync 
} from '../lib/helpers.js';

import { 
  promisePipe, 
  mapConcurrent, 
  withRetry,
  enhancedPromise,
  apiResponse,
  createPromiseCache
} from '../lib/promiseUtils.js';

/**
 * Example 1: Using promisePipe for processing user data
 */
const processUserProfile = (userData) => {
  // Define individual processing steps
  const validateUser = user => {
    console.log('Validating user data...');
    if (!user.email) throw new Error('Email is required');
    return user;
  };
  
  const normalizeEmail = user => {
    console.log('Normalizing email...');
    return { ...user, email: user.email.toLowerCase() };
  };
  
  const enrichUserData = user => {
    console.log('Enriching user data...');
    return Promise.delay(100).then(() => ({
      ...user,
      displayName: user.name || user.email.split('@')[0],
      createdAt: new Date()
    }));
  };
  
  const calculateSettings = user => {
    console.log('Calculating default settings...');
    return Promise.delay(50).then(() => ({
      ...user,
      settings: {
        theme: 'light',
        notifications: true,
        language: 'en'
      }
    }));
  };
  
  // Create a pipeline of operations
  return promisePipe(
    validateUser,
    normalizeEmail,
    enrichUserData,
    calculateSettings
  )(userData);
};

/**
 * Example 2: Using mapConcurrent for batch operations
 */
const processBatchOfUsers = (users) => {
  const processUser = user => {
    console.log(`Processing user: ${user.email}`);
    return Promise.delay(Math.random() * 1000).then(() => ({
      ...user,
      processed: true,
      timestamp: Date.now()
    }));
  };
  
  return mapConcurrent(users, processUser, {
    concurrency: 3,
    timeout: 5000
  });
};

/**
 * Example 3: Using withRetry for database operations
 */
const saveUserWithRetry = (userData, db) => {
  const saveToDatabase = () => {
    console.log('Attempting to save user to database...');
    
    // Simulate random failure
    if (Math.random() < 0.5) {
      throw new Error('Database connection error');
    }
    
    return Promise.delay(300).then(() => ({
      ...userData,
      id: 'usr_' + Math.random().toString(36).substring(2),
      saved: true
    }));
  };
  
  return withRetry(saveToDatabase, {
    maxRetries: 5,
    initialDelay: 200,
    factor: 2,
    shouldRetry: err => err.message.includes('connection')
  });
};

/**
 * Example 4: Using curryAsync for flexible authentication checks
 */
const createAuthChecker = () => {
  // Define a curried function for checking permissions
  const checkPermissionAsync = curryAsync((resource, action, user) => {
    console.log(`Checking if ${user.email} can ${action} on ${resource}`);
    
    return Promise.delay(100).then(() => {
      // In a real implementation, this would check against a permissions system
      return user.role === 'admin' || 
             (user.permissions && user.permissions[resource]?.[action]);
    });
  });
  
  // Create specialized checkers by partially applying the function
  const checkUserPermission = checkPermissionAsync('users');
  const checkPostPermission = checkPermissionAsync('posts');
  
  return {
    checkUserPermission,
    checkPostPermission,
    checkPermissionAsync
  };
};

/**
 * Example 5: Using enhancedPromise for user profile fetching
 */
const createUserProfileService = () => {
  const db = {
    // Mock database
    getProfile: (userId) => {
      console.log(`Fetching profile for user ${userId} from database`);
      
      // Simulate random failure or delay
      const rand = Math.random();
      if (rand < 0.3) throw new Error('Database error');
      
      return Promise.delay(rand * 500).then(() => ({
        id: userId,
        name: `User ${userId}`,
        email: `user${userId}@example.com`,
        lastSeen: new Date()
      }));
    }
  };
  
  // Create an enhanced function with timeout, retry and caching
  const fetchUserProfile = enhancedPromise(db.getProfile, {
    timeout: 2000,
    retry: true,
    retryOptions: {
      maxRetries: 3,
      initialDelay: 300
    },
    cacheResults: true,
    cacheTime: 60000 // 1 minute
  });
  
  return {
    fetchUserProfile
  };
};

/**
 * Example 6: Using apiResponse for standardized API responses
 */
const createUserAPI = () => {
  const getUserData = apiResponse((userId) => {
    if (!userId) throw new Error('User ID is required');
    
    // Simulate successful API response
    return Promise.delay(300).then(() => ({
      userId,
      name: `User ${userId}`,
      email: `user${userId}@example.com`
    }));
  });
  
  const updateUserPreferences = apiResponse((userId, preferences) => {
    if (!userId) throw new Error('User ID is required');
    if (!preferences) throw new Error('Preferences object is required');
    
    // Simulate random failure
    if (Math.random() < 0.3) {
      throw new Error('Failed to update preferences');
    }
    
    return Promise.delay(200).then(() => ({
      userId,
      preferences,
      updated: true
    }));
  });
  
  return {
    getUserData,
    updateUserPreferences
  };
};

/**
 * Example 7: Using composeAsync and pipeAsync for async workflows
 */
const createUserWorkflows = () => {
  // Define individual async operations
  const fetchUserData = id => {
    console.log(`Fetching user data for ID: ${id}`);
    return Promise.delay(100).then(() => ({
      id,
      name: `User ${id}`,
      email: `user${id}@example.com`
    }));
  };
  
  const validateUserData = userData => {
    console.log('Validating user data...');
    return Promise.delay(50).then(() => {
      if (!userData.email) throw new Error('Email is required');
      return { ...userData, valid: true };
    });
  };
  
  const enrichWithMetadata = userData => {
    console.log('Adding metadata...');
    return Promise.delay(50).then(() => ({
      ...userData,
      metadata: {
        lastChecked: new Date(),
        source: 'system'
      }
    }));
  };
  
  // Create composed workflows using different composition styles
  const processUserRight = composeAsync(
    enrichWithMetadata,
    validateUserData,
    fetchUserData
  );
  
  const processUserLeft = pipeAsync(
    fetchUserData,
    validateUserData,
    enrichWithMetadata
  );
  
  return {
    processUserRight,
    processUserLeft
  };
};

/**
 * Example 8: Using createPromiseCache for expensive operations
 */
const createUserCache = () => {
  const promiseCache = createPromiseCache();
  
  const expensiveOperation = (userId) => {
    console.log(`Running expensive operation for user ${userId}`);
    return Promise.delay(1000).then(() => ({
      id: userId,
      result: 'Expensive calculation result',
      timestamp: Date.now()
    }));
  };
  
  const cachedOperation = (userId) => {
    return promiseCache.execute(
      `user-operation-${userId}`,
      () => expensiveOperation(userId),
      30000 // 30 seconds TTL
    );
  };
  
  return {
    cachedOperation,
    invalidateCache: (userId) => {
      promiseCache.invalidate(`user-operation-${userId}`);
    },
    clearAllCache: () => {
      promiseCache.clear();
    }
  };
};

// Export examples for use in tests or demonstrations
export {
  processUserProfile,
  processBatchOfUsers,
  saveUserWithRetry,
  createAuthChecker,
  createUserProfileService,
  createUserAPI,
  createUserWorkflows,
  createUserCache
}; 