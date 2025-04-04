// packages/graphql-config-utils/index.js

// This package provides shared utilities and configurations for GraphQL schema building within ApolloOS.
// It complements the base configurations found in /config/graphql.

// Example: Maybe a function to apply standard configurations to a TypeComposer
export const applyStandardTCConfig = (tc) => {
  if (!tc) return;

  // Example: Remove standard Mongoose fields if they exist
  if (tc.hasField('__v')) {
      tc.removeField('__v');
  }
  // Add more standard configurations here if needed
  // e.g., tc.setResolverPriority(...);
  console.debug(`[graphql-config-utils] Applied standard config to TC: ${tc.getTypeName()}`);
};

// Example: Exporting shared options for composeWithMongoose
export const standardComposeOptions = {
  // Example: Default fields to remove from all composed types
  removeFields: ['__v'], 
  // Add other standard options here
};

// Re-exporting or defining other shared GraphQL utilities could go here.
// For example, shared directive definitions or interface configurations.

console.log('[graphql-config-utils] Loaded.'); // Basic log to confirm loading