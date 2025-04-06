/**
 * User Module Configuration
 * 
 * This file exports all configuration settings specific to the user module.
 * It serves as a central place to manage module-specific configuration parameters.
 */

import { ROLES } from './roles.js';
import passwordPolicy from './passwordPolicy.js';
import authConfig from './auth.js';
import validationRules from './validation.js';
import { resolverDefaults } from './resolvers.js';
import registryConfig from './registry.js';
import transformConfig from './transforms.js';
import composableConfig from './composables.js';

// Module metadata
export const moduleInfo = {
  name: 'user',
  version: '1.2.0',
  description: 'Handles user accounts, authentication, and authorization.',
  dependencies: []
};

// Default pagination settings
export const pagination = {
  defaultLimit: 10,
  maxLimit: 100
};

// Caching configuration
export const caching = {
  ttl: {
    userProfile: 60 * 5, // 5 minutes
    userSearch: 60 * 2,  // 2 minutes
    publicData: 60 * 60  // 1 hour
  }
};

// Batch processing limits
export const batchLimits = {
  createUsers: 100,
  updateUsers: 100,
  deleteUsers: 50
};

// Export everything
export {
  ROLES,
  passwordPolicy,
  authConfig,
  validationRules,
  resolverDefaults,
  registryConfig,
  transformConfig,
  composableConfig,
  composableConfig as composables
};

// Default config export
export default {
  moduleInfo,
  pagination,
  caching,
  batchLimits,
  ROLES,
  passwordPolicy,
  authConfig,
  validationRules,
  resolverDefaults,
  registry: registryConfig,
  transforms: transformConfig,
  composables: composableConfig
}; 