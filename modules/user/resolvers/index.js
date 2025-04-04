import { authMutations } from './authResolvers.js';
import { userQueries, userMutations } from './userResolvers.js';

// Combine all resolvers from this module
// The module definition will decide how to merge these (e.g., into Query/Mutation types)
export const resolvers = {
    Query: {
        ...userQueries,
        // Add other top-level queries from this module if needed
    },
    Mutation: {
        ...authMutations,
        ...userMutations,
        // Add other top-level mutations from this module if needed
    }
    // We could also export resolvers specific to Types here if needed, 
    // e.g., User: { profile: (user, _, ctx) => ... }
};

// Also exporting individually might be useful for some scenarios
export {
    authMutations,
    userQueries,
    userMutations
}; 