import {
  withModels,
  withTypeComposers,
  withResolvers,
  withHooks,
  withRelations,
  withInit
} from '../../config/module/composers.js';

import { userProfileSchemas } from './schemas.js';
import { userProfileResolvers } from './resolvers.js';
import { userProfileHooks } from './hooks/userProfileHooks.js';
import { userProfileRelations } from './relations/userProfileRelations.js';
import * as actions from './actions/index.js';
import * as validators from './validators/index.js';
import { initializeTypeComposersForUserProfileModels } from './registry.js';

import { pipe } from 'ramda';

/**
 * UserProfile module initialization function
 * @param {Object} ctx - Context object
 */
const userProfileInit = ctx => {
  // Initialize TypeComposers if not already done
  initializeTypeComposersForUserProfileModels();
  
  ctx.logger?.debug(`[UserProfile Module] Initialization complete`);
};

/**
 * Creates the user-profile module following functional composition pattern
 * @param {Object} ctx - Context object
 * @returns {Object} - UserProfile module
 */
export default ctx => {
  const moduleId = 'user-profile';
  
  // Initialize TypeComposers first
  initializeTypeComposersForUserProfileModels();
  
  // Apply functional composition pattern with arrow functions
  const composed = pipe(
    withModels(userProfileSchemas),
    withTypeComposers(),
    withResolvers(userProfileResolvers),
    withHooks(userProfileHooks),  // Pass the function directly
    withRelations(userProfileRelations), // Pass the function directly
    withInit(userProfileInit)
  )(ctx);
  
  return {
    id: moduleId,
    meta: {
      description: 'Handles user profile management and customization.',
      version: '1.0.0',
      dependsOn: ['user'],
    },
    // Assets from functional composition
    typeComposers: composed.typeComposers,
    resolvers: composed.resolvers,
    models: composed.models,
    
    // Additional assets
    actions,
    validators,
    
    // Lifecycle functions (delegates to composers)
    onLoad: () => composed,
    hooks: userProfileHooks,
    relations: userProfileRelations,
    init: userProfileInit
  };
}; 