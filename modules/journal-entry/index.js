// modules/journal-entry/index.js
import models from './schemas.js';
import { initTypeComposers } from './registry.js';
import { initResolvers } from './resolvers.js';
import journalEntryHooks from './hooks/journalEntryHooks.js';
import journalEntryRelations from './relations/journalEntryRelations.js';

/**
 * JournalEntry module
 * Provides functionality for entries in user journals
 * 
 * @module journal-entry
 */
export default {
  id: 'journal-entry',
  dirname: import.meta.url,
  
  models,
  
  /**
   * Export for the module composer pipeline
   */
  composer: [
    // Initialize models
    (module) => ({
      ...module,
      typeComposers: initTypeComposers()
    }),
    
    // Register resolvers
    (module) => {
      const { queries, mutations } = initResolvers();
      return {
        ...module,
        resolvers: {
          Query: { ...queries },
          Mutation: { ...mutations }
        }
      };
    },
    
    // Add hooks
    (ctx) => {
      journalEntryHooks(ctx);
      return ctx;
    },
    
    // Add relations
    (ctx) => {
      journalEntryRelations(ctx);
      return ctx;
    }
  ]
}; 