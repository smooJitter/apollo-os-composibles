import { createAuthResolvers } from './authResolvers.js';
import { createUserResolvers } from './userResolvers.js';
import { createAdminResolvers } from './adminResolvers.js';

// Export the resolver creation functions only
// The actual resolvers will be created in the module's onLoad function
export { createAuthResolvers, createUserResolvers, createAdminResolvers };
