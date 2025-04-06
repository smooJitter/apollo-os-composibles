import { createUserTC } from './typeComposer/userTC.js';
import { createAuthResolvers, createUserResolvers, createAdminResolvers } from './resolvers/index.js';

export const userResolvers = (ctx) => {
  // Get the UserTC from the typeComposers
  const UserTC = ctx.typeComposers?.UserTC;
  
  if (!UserTC) {
    ctx.logger?.error('[userResolvers] UserTC not found. Cannot create resolvers.');
    return { Query: {}, Mutation: {} };
  }
  
  // Create GraphQL resolvers
  const authMutations = createAuthResolvers(UserTC);
  const { userQueries, userMutations } = createUserResolvers(UserTC);
  const { adminQueries, adminMutations } = createAdminResolvers(UserTC);
  
  // Return all resolvers combined
  return {
    Query: {
      ...userQueries,
      ...adminQueries,
    },
    Mutation: {
      ...authMutations,
      ...userMutations,
      ...adminMutations,
    }
  };
}; 