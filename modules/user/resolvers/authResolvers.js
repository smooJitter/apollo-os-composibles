import { schemaComposer } from 'graphql-compose';

// Export a function that creates the resolvers
export const createAuthResolvers = (UserTC) => {
  const authMutations = {};

  // Expose register mutation
  if (UserTC.hasResolver('register')) {
    authMutations.register = UserTC.getResolver('register');
  }

  // Expose login mutation
  if (UserTC.hasResolver('login')) {
    authMutations.login = UserTC.getResolver('login');
  }

  // Expose testMock mutation for testing
  if (UserTC.hasResolver('testMock')) {
    authMutations.testMock = UserTC.getResolver('testMock');
  }

  return authMutations;
};

// Optional: Add to global schema composer directly if needed, although module system should handle this
// schemaComposer.Mutation.addFields(authMutations);
