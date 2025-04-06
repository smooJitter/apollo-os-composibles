/**
 * Journal module hooks
 * @param {Object} ctx - The application context
 */
export const journalHooks = (ctx) => {
  const { logger } = ctx;
  
  // Try different sources for hook registry
  const hookRegistry = ctx.hookRegistry || 
                     (ctx.app && ctx.app.hookRegistry) || 
                     (ctx.hooks && ctx.hooks.registry);
  
  if (!hookRegistry) {
    logger?.warn('[Journal Hooks] Hook registry not available in context');
    return;
  }
  
  try {
    // Register hooks for user deletion
    hookRegistry.register('user:afterUserDelete', async ({ user, models, context }) => {
      try {
        // Use models from event or context
        const modelContext = models || context?.models || ctx.models;
        if (!modelContext || !modelContext.Journal) {
          logger?.warn('[Journal Hooks] Journal model not available');
          return;
        }
        
        // Delete all journals when user is deleted
        const { Journal } = modelContext;
        const result = await Journal.deleteMany({ userId: user.id });
        logger?.debug(`[Journal] Deleted ${result.deletedCount} journals for user ${user.id}`);
        
        // Also delete all journal entries
        if (modelContext.JournalEntry) {
          const entryResult = await modelContext.JournalEntry.deleteMany({ userId: user.id });
          logger?.debug(`[Journal] Deleted ${entryResult.deletedCount} journal entries for user ${user.id}`);
        }
      } catch (error) {
        logger?.error(`[Error] Deleting user journals: ${error.message}`);
      }
    });
    
    // Register hooks for journal operations
    hookRegistry.register('journal:beforeJournalCreate', []);
    hookRegistry.register('journal:afterJournalCreate', []);
    hookRegistry.register('journal:beforeJournalUpdate', []);
    hookRegistry.register('journal:afterJournalUpdate', []);
    hookRegistry.register('journal:beforeJournalDelete', []);
    
    // Hook for after journal deletion to clean up entries
    hookRegistry.register('journal:afterJournalDelete', async ({ journal, models, context }) => {
      try {
        // Use models from event or context
        const modelContext = models || context?.models || ctx.models;
        if (!modelContext || !modelContext.JournalEntry) {
          logger?.warn('[Journal Hooks] JournalEntry model not available');
          return;
        }
        
        // Delete all entries when journal is deleted
        const { JournalEntry } = modelContext;
        const result = await JournalEntry.deleteMany({ journalId: journal.id });
        logger?.debug(`[Journal] Deleted ${result.deletedCount} entries for journal ${journal.id}`);
      } catch (error) {
        logger?.error(`[Error] Deleting journal entries: ${error.message}`);
      }
    });
    
    logger?.debug('[Journal Hooks] Applied hooks to context');
  } catch (error) {
    logger?.error(`[Journal Hooks] Error applying hooks: ${error.message}`);
  }
};

export default journalHooks; 