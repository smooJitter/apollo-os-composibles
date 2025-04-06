/**
 * JournalEntry module hooks
 * @param {Object} ctx - The application context
 */
export const journalEntryHooks = (ctx) => {
  const { logger } = ctx;
  
  // Try different sources for hook registry
  const hookRegistry = ctx.hookRegistry || 
                     (ctx.app && ctx.app.hookRegistry) || 
                     (ctx.hooks && ctx.hooks.registry);
  
  if (!hookRegistry) {
    logger?.warn('[JournalEntry Hooks] Hook registry not available in context');
    return;
  }
  
  try {
    // Register hooks for entry operations
    hookRegistry.register('journal-entry:beforeEntryCreate', []);
    
    // After entry creation - could update journal metadata or stats
    hookRegistry.register('journal-entry:afterEntryCreate', async ({ entry, models, context }) => {
      try {
        // Use models from event or context
        const modelContext = models || context?.models || ctx.models;
        if (!modelContext || !modelContext.Journal) {
          logger?.warn('[JournalEntry Hooks] Journal model not available');
          return;
        }
        
        const { Journal } = modelContext;
        
        // Update journal metadata with entry count
        const entryCount = await modelContext.JournalEntry.countDocuments({ 
          journalId: entry.journalId 
        });
        
        // Update the journal with the latest entry info
        await Journal.findByIdAndUpdate(entry.journalId, {
          $set: {
            'metadata.entryCount': entryCount,
            'metadata.lastEntryDate': entry.entryDate || new Date(),
            updatedAt: new Date()
          }
        });
        
        logger?.debug(`[JournalEntry] Updated journal metadata for journal ${entry.journalId}`);
      } catch (error) {
        logger?.error(`[Error] Updating journal metadata: ${error.message}`);
      }
    });
    
    hookRegistry.register('journal-entry:beforeEntryUpdate', []);
    hookRegistry.register('journal-entry:afterEntryUpdate', []);
    hookRegistry.register('journal-entry:beforeEntryDelete', []);
    
    // After entry deletion - update journal metadata
    hookRegistry.register('journal-entry:afterEntryDelete', async ({ entry, models, context }) => {
      try {
        // Use models from event or context
        const modelContext = models || context?.models || ctx.models;
        if (!modelContext || !modelContext.Journal) {
          logger?.warn('[JournalEntry Hooks] Journal model not available');
          return;
        }
        
        const { Journal, JournalEntry } = modelContext;
        
        // Update journal metadata with new entry count
        const entryCount = await JournalEntry.countDocuments({ 
          journalId: entry.journalId 
        });
        
        // Find the latest entry date
        const latestEntry = await JournalEntry.findOne({ 
          journalId: entry.journalId 
        }).sort({ entryDate: -1 });
        
        // Update the journal with updated metadata
        await Journal.findByIdAndUpdate(entry.journalId, {
          $set: {
            'metadata.entryCount': entryCount,
            'metadata.lastEntryDate': latestEntry ? latestEntry.entryDate : null,
            updatedAt: new Date()
          }
        });
        
        logger?.debug(`[JournalEntry] Updated journal metadata after entry deletion for journal ${entry.journalId}`);
      } catch (error) {
        logger?.error(`[Error] Updating journal metadata after deletion: ${error.message}`);
      }
    });
    
    logger?.debug('[JournalEntry Hooks] Applied hooks to context');
  } catch (error) {
    logger?.error(`[JournalEntry Hooks] Error applying hooks: ${error.message}`);
  }
};

export default journalEntryHooks; 