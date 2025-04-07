// modules/user/index.js
import {
  withModels,
  withTypeComposers,
  withResolvers,
  withHooks,
  withRelations,
  withInit
} from '../../config/module/composers.js';

import { userSchemas } from './schemas.js';
import { createUserTC, getUserTC } from './typeComposer/userTC.js';
import { createUserResolvers } from './resolvers.js';
import { userHooks } from './hooks/userHooks.js';
import { userRelations } from './relations/userRelations.js';
import * as actions from './actions/index.js';
import * as validators from './validators/index.js';

import { pipe } from 'ramda';

/**
 * User module initialization function
 * @param {Object} ctx - Context object
 */
const userInit = ctx => {
  // Initialize TypeComposers explicitly
  createUserTC();
  
  ctx.logger?.debug(`[User Module] Initialization complete`);
};

/**
 * Creates the user module following functional composition pattern
 * @param {Object} ctx - Context object
 * @returns {Object} - User module
 */
export default ctx => {
  const moduleId = 'user';

  // Initialize TypeComposers first 
  createUserTC();
  
  // Apply functional composition pattern
  const composed = pipe(
    withModels(userSchemas),
    withTypeComposers(() => ({ UserTC: getUserTC() })),
    withResolvers(() => createUserResolvers({ hasModels: !!ctx.models, modelKeys: Object.keys(ctx.models || {}), actionKeys: Object.keys(actions) })),
    withHooks(userHooks),
    withRelations(userRelations),
    withInit(userInit)
  )(ctx);

  return {
    id: moduleId,
    meta: {
      description: 'Handles user authentication and management',
      version: '1.0.0',
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
    hooks: userHooks,
    relations: userRelations,
    init: userInit
  };
};







