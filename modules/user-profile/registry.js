/**
 * Functional TypeComposer Registry for the UserProfile module
 */
import { schemaComposer } from 'graphql-compose';
import * as R from 'ramda';
import { GraphQLJSON } from 'graphql-compose';

// Initialize registry state
let initialized = false;
const typeComposers = {
  UserProfileTC: null,
  SocialLinkTC: null,
  UserProfileInputTC: null,
  SocialLinkInputTC: null
};

// Pure functions for registry operations
export const register = R.curry((name, tc) => {
  // Also register with schemaComposer to ensure global visibility
  if (!schemaComposer.has(tc.getTypeName())) {
    schemaComposer.add(tc);
  }
  
  return R.tap(
    () => { typeComposers[name] = tc; }, 
    tc
  );
});

export const get = R.propOr(null, R.__, typeComposers);

export const getAll = () => typeComposers;

export const setInitialized = R.tap(value => { initialized = value; });

export const isInitialized = () => initialized;

/**
 * Initialize TypeComposers for the UserProfile module
 */
export const initializeTypeComposers = () => {
  if (initialized) {
    console.log('[UserProfile TypeComposers] Already initialized');
    return;
  }

  console.log('[UserProfile TypeComposers] Initializing user profile module type composers');
  
  // Add JSON scalar if not defined
  if (!schemaComposer.has('JSON')) {
    schemaComposer.add(GraphQLJSON, 'JSON');
  }
  
  // Define SocialLink TypeComposer
  const SocialLinkTC = schemaComposer.createObjectTC({
    name: 'SocialLink',
    fields: {
      platform: 'String!',
      url: 'String!'
    }
  });
  
  // Define SocialLinkInput TypeComposer - Make sure it's available
  const SocialLinkInputTC = schemaComposer.createInputTC({
    name: 'SocialLinkInput',
    fields: {
      platform: 'String!',
      url: 'String!'
    }
  });
  
  // Define UserProfileInput TypeComposer - Make sure it's available
  const UserProfileInputTC = schemaComposer.createInputTC({
    name: 'UserProfileInput',
    fields: {
      bio: 'String',
      avatarUrl: 'String',
      socialLinks: [SocialLinkInputTC],
      preferences: 'JSON'
    }
  });
  
  // Define UserProfile TypeComposer
  const UserProfileTC = schemaComposer.createObjectTC({
    name: 'UserProfile',
    fields: {
      id: 'ID!',
      userId: 'ID!',
      bio: 'String',
      avatarUrl: 'String',
      socialLinks: [SocialLinkTC],
      preferences: 'JSON',
      createdAt: 'Date',
      updatedAt: 'Date'
    }
  });
  
  // Store in registry
  typeComposers.UserProfileTC = UserProfileTC;
  typeComposers.SocialLinkTC = SocialLinkTC;
  typeComposers.UserProfileInputTC = UserProfileInputTC;
  typeComposers.SocialLinkInputTC = SocialLinkInputTC;
  
  // Make sure they're available in the schema composer
  schemaComposer.add(UserProfileTC);
  schemaComposer.add(SocialLinkTC);
  schemaComposer.add(UserProfileInputTC);
  schemaComposer.add(SocialLinkInputTC);
  
  initialized = true;
  console.log('[UserProfile TypeComposers] Initialization complete');
};

/**
 * Get UserProfileTC from registry
 * @returns {Object} UserProfileTC
 */
export const getUserProfileTC = () => {
  if (!initialized) initializeTypeComposers();
  return typeComposers.UserProfileTC;
};

/**
 * Get SocialLinkTC from registry
 * @returns {Object} SocialLinkTC
 */
export const getSocialLinkTC = () => {
  if (!initialized) initializeTypeComposers();
  return typeComposers.SocialLinkTC;
};

/**
 * Get UserProfileInputTC from registry
 * @returns {Object} UserProfileInputTC
 */
export const getUserProfileInputTC = () => {
  if (!initialized) initializeTypeComposers();
  return typeComposers.UserProfileInputTC;
};

/**
 * Get SocialLinkInputTC from registry
 * @returns {Object} SocialLinkInputTC
 */
export const getSocialLinkInputTC = () => {
  if (!initialized) initializeTypeComposers();
  return typeComposers.SocialLinkInputTC;
};

// Log registration results
const logRegistration = R.tap(() => {
  console.log('[ProfileTypeComposer Registry] Successfully registered type composers');
  console.log('[ProfileTypeComposer Registry] Schema types:',
    Array.from(schemaComposer.types.keys())
      .filter(type => typeof type === 'string')
      .join(', ')
  );
});

// Initialize TypeComposers for UserProfile models
export const initializeTypeComposersForUserProfileModels = R.once(() => {
  if (isInitialized()) {
    console.log('[ProfileTypeComposer Registry] Already initialized');
    return getAll();
  }
  
  console.log('[ProfileTypeComposer Registry] Initializing...');
  
  try {
    R.pipe(
      initializeTypeComposers,
      logRegistration,
      () => setInitialized(true)
    )();
    
    return getAll();
  } catch (error) {
    console.error('[ProfileTypeComposer Registry] Error initializing TypeComposers:', error);
    throw error;
  }
});

// Export all registry functions as a unified API
export const TCRegistry = {
  register,
  get,
  getAll,
  setInitialized,
  isInitialized
}; 