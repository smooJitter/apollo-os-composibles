/**
 * Functional TypeComposer Registry for the User module
 */
import { schemaComposer } from 'graphql-compose';
import { composeMongoose } from 'graphql-compose-mongoose';
import * as R from 'ramda';
import { userSchemas } from './schemas.js';
import { GraphQLJSON } from 'graphql-compose';

// Initialize registry state
let initialized = false;
const typeComposers = {
  UserTC: null,
  AuthTokenTC: null,
  AuthPayloadTC: null,
  UserHealthStatusTC: null
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

/**
 * Initialize TypeComposers for the User module
 */
export const initializeTypeComposers = () => {
  if (initialized) {
    console.log('[User TypeComposers] Already initialized');
    return;
  }

  console.log('[User TypeComposers] Initializing user module type composers');
  
  // Add JSON scalar if not defined
  if (!schemaComposer.has('JSON')) {
    schemaComposer.add(GraphQLJSON, 'JSON');
  }
  
  // Define User TypeComposer
  const UserTC = schemaComposer.createObjectTC({
    name: 'User',
    fields: {
      id: 'ID!',
      username: 'String!',
      email: 'String!',
      firstName: 'String',
      lastName: 'String',
      fullName: {
        type: 'String',
        resolve: source => `${source.firstName || ''} ${source.lastName || ''}`.trim() || null
      },
      role: 'String!',
      isActive: 'Boolean!',
      createdAt: 'Date!',
      updatedAt: 'Date'
    }
  });
  
  // Define AuthToken TypeComposer  
  const AuthTokenTC = schemaComposer.createObjectTC({
    name: 'AuthToken',
    fields: {
      token: 'String!',
      expiresAt: 'Date'
    }
  });
  
  // Define AuthPayload TypeComposer  
  const AuthPayloadTC = schemaComposer.createObjectTC({
    name: 'AuthPayload',
    fields: {
      user: UserTC,
      token: AuthTokenTC
    }
  });
  
  // Define UserHealthStatus TypeComposer
  const UserHealthStatusTC = schemaComposer.createObjectTC({
    name: 'UserHealthStatus',
    fields: {
      status: 'String!',
      message: 'String!',
      timestamp: 'String!'
    }
  });
  
  // Store in registry
  typeComposers.UserTC = UserTC;
  typeComposers.AuthTokenTC = AuthTokenTC;
  typeComposers.AuthPayloadTC = AuthPayloadTC;
  typeComposers.UserHealthStatusTC = UserHealthStatusTC;
  
  initialized = true;
  console.log('[User TypeComposers] Initialization complete');
};

/**
 * Get UserTC from registry
 * @returns {Object} UserTC
 */
export const getUserTC = () => {
  if (!initialized) initializeTypeComposers();
  return typeComposers.UserTC;
};

/**
 * Get AuthTokenTC from registry
 * @returns {Object} AuthTokenTC
 */
export const getAuthTokenTC = () => {
  if (!initialized) initializeTypeComposers();
  return typeComposers.AuthTokenTC;
};

/**
 * Get AuthPayloadTC from registry
 * @returns {Object} AuthPayloadTC
 */
export const getAuthPayloadTC = () => {
  if (!initialized) initializeTypeComposers();
  return typeComposers.AuthPayloadTC;
};

/**
 * Get UserHealthStatusTC from registry
 * @returns {Object} UserHealthStatusTC
 */
export const getUserHealthStatusTC = () => {
  if (!initialized) initializeTypeComposers();
  return typeComposers.UserHealthStatusTC;
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
export const initializeTypeComposersForUserModels = R.once(() => {
  if (isInitialized()) {
    console.log('[TypeComposer Registry] Already initialized');
    return getAll();
  }
  
  console.log('[TypeComposer Registry] Initializing...');
  
  try {
    R.pipe(
      ensureRootTypes,
      initializeTypeComposers,
      logRegistration,
      () => setInitialized(true)
    )();
    
    return getAll();
  } catch (error) {
    console.error('[TypeComposer Registry] Error initializing TypeComposers:', error);
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