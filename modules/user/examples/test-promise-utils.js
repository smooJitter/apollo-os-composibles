/**
 * Test Script for Promise Utilities
 * 
 * This script demonstrates how to use the Bluebird promise utilities
 * in a simple, runnable example.
 * 
 * Run with:
 * node modules/user/examples/test-promise-utils.js
 */
import Promise from 'bluebird';
import { 
  processUserProfile, 
  processBatchOfUsers, 
  saveUserWithRetry,
  createAuthChecker,
  createUserProfileService,
  createUserAPI,
  createUserWorkflows,
  createUserCache
} from './promise-examples.js';

// Set up colored console output for better readability
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = {
  title: (text) => console.log(`\n${colors.bright}${colors.cyan}=== ${text} ===${colors.reset}\n`),
  info: (text) => console.log(`${colors.blue}INFO:${colors.reset} ${text}`),
  success: (text) => console.log(`${colors.green}SUCCESS:${colors.reset} ${text}`),
  error: (text) => console.log(`${colors.red}ERROR:${colors.reset} ${text}`),
  result: (text) => console.log(`${colors.magenta}RESULT:${colors.reset} ${JSON.stringify(text, null, 2)}`)
};

// Test the promise utilities
async function runTests() {
  try {
    log.title('Promise Utilities Demonstration');
    
    // Example 1: Processing a User Profile
    log.title('Example 1: Processing a User Profile');
    log.info('Creating a user profile processing pipeline...');
    
    const userData = {
      name: 'Jane Doe',
      email: 'JANE.DOE@EXAMPLE.COM'
    };
    
    try {
      const processedUser = await processUserProfile(userData);
      log.success('User profile processed successfully');
      log.result(processedUser);
    } catch (error) {
      log.error(`User profile processing failed: ${error.message}`);
    }
    
    // Example 2: Batch Processing with Concurrency
    log.title('Example 2: Batch Processing with Concurrency');
    log.info('Processing a batch of users with limited concurrency...');
    
    const userBatch = [
      { id: 1, email: 'user1@example.com', name: 'User One' },
      { id: 2, email: 'user2@example.com', name: 'User Two' },
      { id: 3, email: 'user3@example.com', name: 'User Three' },
      { id: 4, email: 'user4@example.com', name: 'User Four' },
      { id: 5, email: 'user5@example.com', name: 'User Five' }
    ];
    
    try {
      const batchResults = await processBatchOfUsers(userBatch);
      log.success(`Processed ${batchResults.length} users`);
      
      // Show just the first two results to keep output manageable
      log.result(batchResults.slice(0, 2));
      log.info(`...and ${batchResults.length - 2} more results`);
    } catch (error) {
      log.error(`Batch processing failed: ${error.message}`);
    }
    
    // Example 3: Retrying Operations
    log.title('Example 3: Retry with Exponential Backoff');
    log.info('Saving user data with retry for connection errors...');
    
    const userToSave = {
      name: 'Retry User',
      email: 'retry@example.com'
    };
    
    try {
      const savedUser = await saveUserWithRetry(userToSave);
      log.success('User saved successfully after retries');
      log.result(savedUser);
    } catch (error) {
      log.error(`User save operation failed after retries: ${error.message}`);
    }
    
    // Example 4: Curried Async Functions
    log.title('Example 4: Curried Async Functions');
    log.info('Creating permission checkers with curried functions...');
    
    const authChecker = createAuthChecker();
    
    const adminUser = {
      id: 'admin1',
      email: 'admin@example.com',
      role: 'admin'
    };
    
    const regularUser = {
      id: 'user1',
      email: 'user@example.com',
      role: 'user',
      permissions: {
        posts: { read: true }
      }
    };
    
    try {
      // Check if admin can edit users
      const adminCanEditUsers = await authChecker.checkUserPermission('edit')(adminUser);
      log.result({ user: 'admin', action: 'edit users', allowed: adminCanEditUsers });
      
      // Check if regular user can read posts
      const userCanReadPosts = await authChecker.checkPostPermission('read')(regularUser);
      log.result({ user: 'regular', action: 'read posts', allowed: userCanReadPosts });
      
      // Check if regular user can edit posts
      const userCanEditPosts = await authChecker.checkPostPermission('edit')(regularUser);
      log.result({ user: 'regular', action: 'edit posts', allowed: userCanEditPosts });
    } catch (error) {
      log.error(`Permission check failed: ${error.message}`);
    }
    
    // Example 5: Enhanced Promises
    log.title('Example 5: Enhanced Promises');
    log.info('Using enhanced promise with retry, timeout and caching...');
    
    const profileService = createUserProfileService();
    
    try {
      log.info('First call - may hit database or fail and retry...');
      const profile1 = await profileService.fetchUserProfile('1234');
      log.success('Profile fetched successfully');
      log.result(profile1);
      
      log.info('Second call - should use cached result...');
      const profile2 = await profileService.fetchUserProfile('1234');
      log.success('Profile fetched from cache');
      log.result(profile2);
    } catch (error) {
      log.error(`Profile fetch failed: ${error.message}`);
    }
    
    // Example 6: API Response Standardization
    log.title('Example 6: Standardized API Responses');
    log.info('Using apiResponse wrapper for consistent API results...');
    
    const userAPI = createUserAPI();
    
    try {
      // Successful call
      log.info('Making successful API call...');
      const successResult = await userAPI.getUserData('123');
      log.result(successResult);
      
      // Failing call (randomly may succeed)
      log.info('Making potentially failing API call...');
      const updateResult = await userAPI.updateUserPreferences('123', { theme: 'dark' });
      log.result(updateResult);
    } catch (error) {
      // This shouldn't be reached due to apiResponse wrapper
      log.error(`Unexpected error: ${error.message}`);
    }
    
    // Example 7: Async Composition
    log.title('Example 7: Async Function Composition');
    log.info('Comparing right-to-left and left-to-right composition...');
    
    const userWorkflows = createUserWorkflows();
    
    try {
      log.info('Right-to-left composition with composeAsync...');
      const rightResult = await userWorkflows.processUserRight('789');
      log.success('Right-to-left workflow completed');
      log.result(rightResult);
      
      log.info('Left-to-right composition with pipeAsync...');
      const leftResult = await userWorkflows.processUserLeft('789');
      log.success('Left-to-right workflow completed');
      log.result(leftResult);
    } catch (error) {
      log.error(`Workflow failed: ${error.message}`);
    }
    
    // Example 8: Promise Caching
    log.title('Example 8: Promise Caching');
    log.info('Using promise cache for expensive operations...');
    
    const userCache = createUserCache();
    
    try {
      log.info('First call - will execute expensive operation...');
      const result1 = await userCache.cachedOperation('abc123');
      log.success('Operation completed');
      log.result(result1);
      
      log.info('Second call - should use cached promise...');
      const result2 = await userCache.cachedOperation('abc123');
      log.success('Returned cached result');
      log.result(result2);
      
      log.info('Invalidating cache...');
      userCache.invalidateCache('abc123');
      
      log.info('Third call after invalidation - will execute operation again...');
      const result3 = await userCache.cachedOperation('abc123');
      log.success('Operation completed after cache invalidation');
      log.result(result3);
    } catch (error) {
      log.error(`Cache operation failed: ${error.message}`);
    }
    
    log.title('All Tests Completed');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the tests
runTests(); 