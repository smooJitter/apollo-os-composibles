import { schemaComposer } from 'graphql-compose';
// Import resolver wrappers if needed for securing resolvers here
// import { requireUser, requireRole } from '@apolloos/resolver-utils';

// Export a function that creates the resolvers
export const createUserResolvers = (UserTC) => {
  if (!UserTC) {
    console.error(
      '[userResolvers] Cannot define user queries/mutations because UserTC was not found.'
    );
    return { userQueries: {}, userMutations: {} };
  }

  const userQueries = {};
  const userMutations = {};

  // --- Export Queries ---
  // Expose the 'me' resolver added in userTC.js
  if (UserTC.hasResolver('me')) {
    userQueries.me = UserTC.getResolver('me');
  }
  
  // Use testMe in mock mode if available
  if (process.env.USE_MOCK_DB === 'true' && UserTC.hasResolver('testMe')) {
    userQueries.me = UserTC.getResolver('testMe');
  }

  // Expose standard findById
  if (UserTC.hasResolver('findById')) {
    userQueries.userById = UserTC.getResolver('findById');
  }

  // Expose findMany
  if (UserTC.hasResolver('findMany')) {
    userQueries.users = UserTC.getResolver('findMany');
  }
  
  // Expose searchUsers
  if (UserTC.hasResolver('searchUsers')) {
    userQueries.searchUsers = UserTC.getResolver('searchUsers');
  }

  // --- Export Mutations ---
  // Expose register mutation
  if (UserTC.hasResolver('register')) {
    userMutations.register = UserTC.getResolver('register');
  }

  // Expose login mutation
  if (UserTC.hasResolver('login')) {
    userMutations.login = UserTC.getResolver('login');
  }
  
  // Expose updateProfile mutation
  if (UserTC.hasResolver('updateProfile')) {
    userMutations.updateProfile = UserTC.getResolver('updateProfile');
  }
  
  // Expose changePassword mutation
  if (UserTC.hasResolver('changePassword')) {
    userMutations.changePassword = UserTC.getResolver('changePassword');
  }

  return { userQueries, userMutations };
}; 