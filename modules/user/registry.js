/**
 * Functional TypeComposer Registry for the User module
 */
import { schemaComposer } from 'graphql-compose';
import { composeMongoose } from 'graphql-compose-mongoose';
import * as R from 'ramda';
import { userSchemas } from './schemas.js';

// Create a private store for type composers
const store = {
  typeComposers: {},
  initialized: false
};

// Pure functions for registry operations
export const register = R.curry((name, tc) => {
  // Also register with schemaComposer to ensure global visibility
  if (!schemaComposer.has(tc.getTypeName())) {
    schemaComposer.add(tc);
  }
  
  return R.tap(
    () => { store.typeComposers[name] = tc; }, 
    tc
  );
});

export const get = R.propOr(null, R.__, store.typeComposers);

export const getAll = () => store.typeComposers;

export const setInitialized = R.tap(value => { store.initialized = value; });

export const isInitialized = () => store.initialized;

// Ensure root types exist in schema
const ensureRootTypes = R.tap(() => {
  ['Query', 'Mutation'].forEach(typeName => {
    if (!schemaComposer.has(typeName)) {
      schemaComposer.createObjectTC({
        name: typeName, 
        fields: {}
      });
    }
  });
});

// Create and register type composers
const createAndRegisterTypes = () => {
  // Create TypeComposer for User model
  const UserTC = composeMongoose(userSchemas.User, {
    removeFields: ['password'], // Don't expose password in GraphQL
    inputType: {
      removeFields: ['createdAt', 'updatedAt']
    }
  });
  
  // Create AuthPayload TypeComposer
  const AuthPayloadTC = schemaComposer.createObjectTC({
    name: 'AuthPayload',
    fields: {
      user: UserTC,
      token: 'String!'
    }
  });
  
  // Register type composers
  register('UserTC', UserTC);
  register('AuthPayloadTC', AuthPayloadTC);
  
  return { UserTC, AuthPayloadTC };
};

// Log registration results
const logRegistration = R.tap(() => {
  console.log('[TypeComposer Registry] Successfully registered type composers');
  console.log('[TypeComposer Registry] Schema types:',
    Array.from(schemaComposer.types.keys())
      .filter(type => typeof type === 'string')
      .join(', ')
  );
});

// Initialize TypeComposers for User models
export const initializeTypeComposers = R.once(() => {
  if (isInitialized()) {
    console.log('[TypeComposer Registry] Already initialized');
    return getAll();
  }
  
  console.log('[TypeComposer Registry] Initializing...');
  
  try {
    R.pipe(
      ensureRootTypes,
      createAndRegisterTypes,
      logRegistration,
      () => setInitialized(true)
    )();
    
    return getAll();
  } catch (error) {
    console.error('[TypeComposer Registry] Error initializing TypeComposers:', error);
    throw error;
  }
});

// Convenience exports for common type composers
export const getUserTC = () => get('UserTC');
export const getAuthPayloadTC = () => get('AuthPayloadTC');

// Export all registry functions as a unified API
export const TCRegistry = {
  register,
  get,
  getAll,
  setInitialized,
  isInitialized
}; 