import { schemaComposer } from 'graphql-compose';

// Export a function that creates the admin resolvers
export const createAdminResolvers = (UserTC) => {
  if (!UserTC) {
    console.error(
      '[adminResolvers] Cannot define admin resolvers because UserTC was not found.'
    );
    return { adminQueries: {}, adminMutations: {} };
  }

  const adminQueries = {};
  const adminMutations = {};

  // --- Export Admin Mutations ---
  
  // Expose toggleUserActive mutation (admin only)
  if (UserTC.hasResolver('toggleUserActive')) {
    adminMutations.toggleUserActive = UserTC.getResolver('toggleUserActive');
  }
  
  // Expose deleteUser mutation (admin only)
  if (UserTC.hasResolver('deleteUser')) {
    adminMutations.deleteUser = UserTC.getResolver('deleteUser');
  }
  
  // Expose setUserRole mutation (admin only)
  if (UserTC.hasResolver('setUserRole')) {
    adminMutations.setUserRole = UserTC.getResolver('setUserRole');
  }

  return { adminQueries, adminMutations };
}; 