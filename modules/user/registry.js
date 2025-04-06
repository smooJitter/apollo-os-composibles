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
  store.typeComposers[name] = tc;
  // Also register with schemaComposer to ensure global visibility
  if (!schemaComposer.has(tc.getTypeName())) {
    schemaComposer.add(tc);
  }
  return tc;
});

export const get = R.prop(R.__, store.typeComposers);

export const getAll = () => store.typeComposers;

export const setInitialized = (value = true) => {
  store.initialized = value;
  return store;
};

export const isInitialized = () => store.initialized;

// Initialize TypeComposers for User models
export const initializeTypeComposers = R.once(() => {
  if (isInitialized()) {
    console.log('[TypeComposer Registry] Already initialized');
    return getAll();
  }
  
  console.log('[TypeComposer Registry] Initializing...');
  
  try {
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
    
    // Register the TypeComposers using function composition
    const registerTypeComposers = R.pipe(
      () => register('UserTC', UserTC),
      () => register('AuthPayloadTC', AuthPayloadTC)
    );
    
    registerTypeComposers();
    
    // Ensure query and mutation root types are available
    if (!schemaComposer.has('Query')) {
      schemaComposer.createObjectTC({
        name: 'Query', 
        fields: {}
      });
    }
    
    if (!schemaComposer.has('Mutation')) {
      schemaComposer.createObjectTC({
        name: 'Mutation', 
        fields: {}
      });
    }
    
    console.log('[TypeComposer Registry] Successfully registered UserTC and AuthPayloadTC');
    console.log('[TypeComposer Registry] Schema has types:', schemaComposer.types.keys());
    
    setInitialized(true);
    
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