// modules/affirmation/index.js
import { pipe } from 'ramda';
import { Affirmation, applyContextPlugins } from './schemas.js';
import { initTypeComposers } from './registry.js';
import { initResolvers } from './resolvers.js';
import { affirmationHooks } from './hooks/affirmationHooks.js';
import affirmationRelations from './relations/affirmationRelations.js';
import { affirmationInit } from './init.js';

// Import functional composers
import {
  withModels,
  withTypeComposers,
  withResolvers,
  withHooks,
  withRelations,
  withInit
} from '../../config/module/composers.js';

// Static models (no context required)
const models = {
  Affirmation
};

/**
 * Creates the affirmation module following functional composition pattern
 * @param {Object} ctx - Context object
 * @returns {Object} - Affirmation module
 */
export default function (ctx) {
  const moduleId = 'affirmation';
  
  // Apply context plugins first
  const contextModels = applyContextPlugins(ctx);
  
  // Register models in context immediately
  if (!ctx.models) ctx.models = {};
  ctx.models.Affirmation = Affirmation;
  
  // Apply functional composition pattern
  const composed = pipe(
    withModels(() => ({ ...models, ...contextModels })),
    withTypeComposers(() => initTypeComposers()),
    withResolvers(() => initResolvers()),
    withHooks(affirmationHooks),
    withRelations(affirmationRelations),
    withInit(affirmationInit)
  )(ctx);

  return {
    id: moduleId,
    meta: {
      description: 'Handles user affirmations for daily motivation',
      version: '1.0.0',
      dependsOn: ['user'] 
    },
    // Assets from functional composition
    typeComposers: composed.typeComposers,
    resolvers: composed.resolvers,
    models: composed.models,
    
    // Lifecycle functions (delegates to composers)
    onLoad: () => composed,
    hooks: affirmationHooks,
    relations: affirmationRelations,
    init: affirmationInit
  };
} 