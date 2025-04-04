// modules/user/typeComposer/userTC.js
// import { composeWithMongoose } from 'graphql-compose-mongoose'; // Can import directly or use from ctx

export default function createUserTC(UserModel, ctx) {
  // Use composeWithMongoose from the context for consistency
  const { composeWithMongoose, applyStandardTCConfig } = ctx.graphqlConfig;
  const { createAuthenticationError } = ctx.errors; // Use error utils from context

  const UserTC = composeWithMongoose(UserModel, {
    // Customize options here if needed
    // fields: { 
    //     // only specific fields
    //     only: ['_id', 'name', 'email', 'role', 'active', 'createdAt', 'updatedAt'],
    // },
    removeFields: ['password', '__v'], // Ensure password is never exposed
  });

  // Apply standard configurations (e.g., remove __v if not done above)
  applyStandardTCConfig?.(UserTC);

  // --- Field Customization (Example) ---
  // Make email explicitly non-nullable in GraphQL schema if desired
  // UserTC.extendField('email', { type: 'String!' });

  // --- Add Custom Resolvers or Modify Existing Ones ---
  
  // Example: Add a 'me' query resolver to get the current user
  UserTC.addResolver({
    name: 'me',
    kind: 'query',
    type: UserTC, // Returns the User type
    resolve: async ({ source, args, context, info }) => {
      if (!context.user) {
        // Use the error utility from context
        throw createAuthenticationError('You must be logged in to query 'me'.');
      }
      // Fetch the user based on the ID stored in the context
      // Ensure the password field is not selected
      const currentUser = await UserModel.findById(context.user.id);
      if (!currentUser) {
         throw createAuthenticationError('User associated with token not found.');
      }
      if (!currentUser.active) {
           throw createAuthenticationError('User account is inactive.');
      }
      return currentUser;
    },
  });
  
  // Example: Secure standard resolvers (we'll add more guards in hooks.js later)
  // UserTC.getResolver('findMany').wrapResolve( /* Add admin check */);
  // UserTC.getResolver('updateById').wrapResolve( /* Add ownership check */);
  
  // Ensure standard CRUD resolvers exist (findById, findOne, findMany, etc.)
  // composeWithMongoose adds them by default, but you can verify or customize
  // UserTC.getResolver('findById'); 
  // UserTC.getResolver('findMany');
  // UserTC.getResolver('createOne'); // Be careful exposing createOne directly without auth/validation

  // Rename the GraphQL Type if desired (e.g., from default 'User' based on model name)
  // UserTC.setTypeName('UserAccount');

  return UserTC;
}
