// modules/journal/index.js
import models from './schemas.js';
import { initTypeComposers } from './registry.js';
import { initResolvers } from './resolvers.js';
import journalHooks from './hooks/journalHooks.js';
import journalRelations from './relations/journalRelations.js';

/**
 * Journal module
 * Provides functionality for user journals
 * 
 * @module journal
 */
export default {
  id: 'journal',
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
      journalHooks(ctx);
      return ctx;
    },
    
    // Add relations
    (ctx) => {
      journalRelations(ctx);
      return ctx;
    }
  ]
}; 