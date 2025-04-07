// modules/journal-entry/index.js
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
import journalEntryHooks from './hooks/journalEntryHooks.js';
import journalEntryRelations from './relations/journalEntryRelations.js';
import { pipe } from 'ramda';

/**
 * JournalEntry module
 * Provides functionality for entries in user journals
 * 
 * @module journal-entry
 */

/**
 * JournalEntry module initialization function
 * @param {Object} ctx - Context object
 */
const journalEntryInit = (ctx) => {
  ctx.logger?.debug(`[JournalEntry Module] Initialization complete`);
};

/**
 * Creates the journal-entry module following functional composition pattern
 * @param {Object} ctx - Context object
 * @returns {Object} - JournalEntry module
 */
export default function (ctx) {
  const moduleId = 'journal-entry';
  
  // Apply context plugins first
  const contextModels = applyContextPlugins(ctx);
  
  // Apply functional composition pattern
  const composed = pipe(
    withModels(() => ({ ...models, ...contextModels })),
    withTypeComposers(() => initTypeComposers()),
    withResolvers(() => initResolvers()),
    withHooks(journalEntryHooks),
    withRelations(journalEntryRelations),
    withInit(journalEntryInit)
  )(ctx);

  return {
    id: moduleId,
    meta: {
      description: 'Handles journal entries',
      version: '1.0.0',
      dependsOn: ['user', 'journal'], 
    },
    // Assets from functional composition
    typeComposers: composed.typeComposers,
    resolvers: composed.resolvers,
    models: composed.models,
    
    // Lifecycle functions (delegates to composers)
    onLoad: () => composed,
    hooks: journalEntryHooks,
    relations: journalEntryRelations,
    init: journalEntryInit
  };
} 