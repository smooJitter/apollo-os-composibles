// modules/user/resolvers/userResolvers.js
import { schemaComposer } from 'graphql-compose';
// Import resolver wrappers if needed for securing resolvers here
// import { requireUser, requireRole } from '@packages/resolver-utils'; 

// Initialize objects to export, even if UserTC isn't found yet
export const userQueries = {};
export const userMutations = {};

// Get the UserTC from the global schema composer
// It should have been registered when the UserTC factory was called during module loading.
// Use try-catch or check existence for safety.
let UserTC;
try {
    UserTC = schemaComposer.getOTC('User'); 
} catch (e) {
    console.warn('[userResolvers] User TypeComposer (UserTC) not found in schemaComposer during initial load. Resolvers requiring it may fail if TC is not registered later.');
    // Proceeding allows the file to load, but resolvers depending on UserTC might be missing
}

if (UserTC) {
    // --- Export Queries ---
    // Expose the 'me' resolver added in userTC.js
    if (UserTC.hasResolver('me')) {
        userQueries.me = UserTC.getResolver('me');
    } else {
        console.warn(`[userResolvers] Expected resolver 'me' not found on UserTC.`);
    }

    // Example: Expose standard findById if needed (could be secured)
    if (UserTC.hasResolver('findById')) {
        // userQueries.userById = requireUser(UserTC.getResolver('findById')); // Example security
        userQueries.userById = UserTC.getResolver('findById'); 
    }
    
    // Example: Expose findMany, perhaps secured
    if (UserTC.hasResolver('findMany')) {
        // userQueries.users = requireRole('admin', UserTC.getResolver('findMany')); // Example security
    }

    // --- Export Mutations ---
    // Example: Add a secure way for users to update their own profile (subset of fields)
    // This usually involves creating a custom InputTypeComposer (e.g., UserUpdateSelfInput)
    // userMutations.userUpdateSelf = requireUser(UserTC.getResolver('updateById').wrapResolve(next => rp => {
    //    if (rp.context.user.id !== rp.args._id) throw new Error('Forbidden');
    //    // Add logic to only allow certain fields to be updated
    //    rp.args.record = filterAllowedUpdateFields(rp.args.record); 
    //    return next(rp);
    // }));

} else {
    console.error('[userResolvers] Cannot define user queries/mutations because UserTC was not found.');
}

// Note: We are exporting the resolver maps. The module definition (index.js)
// should be responsible for merging these into the final module export.
