// modules/journal/index.js
import {
  withModels,
  withTypeComposers,
  withResolvers,
  withHooks,
  withRelations,
  withInit
} from '../../config/module/composers.js';

import models, { applyContextPlugins } from './schemas.js';
import { initTypeComposers } from './registry.js';
import { initResolvers } from './resolvers.js';
import journalHooks from './hooks/journalHooks.js';
import journalRelations from './relations/journalRelations.js';
import { pipe } from 'ramda';

/**
 * Journal module
 * Provides functionality for user journals
 * 
 * @module journal
 */

/**
 * Journal module initialization function
 * @param {Object} ctx - Context object
 */
const journalInit = (ctx) => {
  ctx.logger?.debug(`[Journal Module] Initialization complete`);
};

/**
 * Creates the journal module following functional composition pattern
 * @param {Object} ctx - Context object
 * @returns {Object} - Journal module
 */
export default function (ctx) {
  const moduleId = 'journal';
  
  // Apply context plugins first
  const contextModels = applyContextPlugins(ctx);
  
  // Apply functional composition pattern
  const composed = pipe(
    withModels(() => ({ ...models, ...contextModels })),
    withTypeComposers(() => initTypeComposers()),
    withResolvers(() => initResolvers()),
    withHooks(journalHooks),
    withRelations(journalRelations),
    withInit(journalInit)
  )(ctx);

  return {
    id: moduleId,
    meta: {
      description: 'Handles user journals',
      version: '1.0.0',
      dependsOn: ['user'], 
    },
    // Assets from functional composition
    typeComposers: composed.typeComposers,
    resolvers: composed.resolvers,
    models: composed.models,
    
    // Lifecycle functions (delegates to composers)
    onLoad: () => composed,
    hooks: journalHooks,
    relations: journalRelations,
    init: journalInit
  };
} 