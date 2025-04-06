import { schemaComposer } from 'graphql-compose';
import { getJournalTC } from '../registry.js';

/**
 * Journal module relations
 * @param {Object} ctx - The application context
 */
export const journalRelations = (ctx) => {
  const { logger, models, typeComposers } = ctx;
  
  try {
    // Initialize type composers if not already done
    const JournalTC = getJournalTC();
    
    // Method 1: Try to get from context typeComposers
    let UserTC;
    if (typeComposers && typeComposers.UserTC) {
      UserTC = typeComposers.UserTC;
      logger?.debug('[Journal Relations] Found User type in context typeComposers');
    } 
    // Method 2: Try to get from modules
    else if (ctx.app && ctx.app.modules) {
      const userModule = ctx.app.modules.find(m => m.id === 'user');
      if (userModule && userModule.typeComposers && userModule.typeComposers.UserTC) {
        UserTC = userModule.typeComposers.UserTC;
        logger?.debug('[Journal Relations] Found User type in user module');
      }
    }
    // Method 3: Try schemaComposer as last resort
    if (!UserTC) {
      try {
        UserTC = schemaComposer.getOTC('User');
        logger?.debug('[Journal Relations] Found User type in schemaComposer');
      } catch (e) {
        logger?.warn(`[Journal Relations] Could not find User type: ${e.message}`);
      }
    }
    
    // Method 1: Try to get from context typeComposers
    let JournalEntryTC;
    if (typeComposers && typeComposers.JournalEntryTC) {
      JournalEntryTC = typeComposers.JournalEntryTC;
      logger?.debug('[Journal Relations] Found JournalEntry type in context typeComposers');
    } 
    // Method 2: Try to get from modules
    else if (ctx.app && ctx.app.modules) {
      const journalEntryModule = ctx.app.modules.find(m => m.id === 'journal-entry');
      if (journalEntryModule && journalEntryModule.typeComposers && journalEntryModule.typeComposers.JournalEntryTC) {
        JournalEntryTC = journalEntryModule.typeComposers.JournalEntryTC;
        logger?.debug('[Journal Relations] Found JournalEntry type in journal-entry module');
      }
    }
    // Method 3: Try schemaComposer as last resort
    if (!JournalEntryTC) {
      try {
        JournalEntryTC = schemaComposer.getOTC('JournalEntry');
        logger?.debug('[Journal Relations] Found JournalEntry type in schemaComposer');
      } catch (e) {
        logger?.warn(`[Journal Relations] Could not find JournalEntry type: ${e.message}`);
      }
    }
    
    if (!JournalTC) {
      logger?.warn('[Journal Relations] Journal type not found in registry');
      return;
    }
    
    logger?.debug(`[Journal Relations] Found types: Journal (${!!JournalTC}), User (${!!UserTC}), JournalEntry (${!!JournalEntryTC})`);
    
    // Add User field to Journal type if User type is available
    if (UserTC) {
      JournalTC.addFields({
        user: {
          type: UserTC,
          description: 'The user who owns this journal',
          resolve: async (journal, args, context) => {
            try {
              if (!journal || !journal.userId) return null;
              // Use models from context if available, otherwise from function argument
              const modelContext = context.models || models;
              return await modelContext.User.findById(journal.userId);
            } catch (error) {
              logger?.error(`[Error] Resolving journal user relation: ${error.message}`);
              return null;
            }
          }
        }
      });
      
      // Add journals field to User type
      UserTC.addFields({
        journals: {
          type: [JournalTC],
          args: {
            limit: { type: 'Int', defaultValue: 10 },
            sortBy: { type: 'String', defaultValue: 'createdAt' },
            sortOrder: { type: 'String', defaultValue: 'desc' }
          },
          description: 'Journals owned by this user',
          resolve: async (user, args, context) => {
            try {
              if (!user || !user._id) return [];
              
              // Use models from context if available, otherwise from function argument
              const modelContext = context.models || models;
              const { limit, sortBy, sortOrder } = args;
              
              // Define sort criteria
              const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
              
              return await modelContext.Journal.find({ userId: user._id })
                .sort(sort)
                .limit(limit);
            } catch (error) {
              logger?.error(`[Error] Resolving user journals relation: ${error.message}`);
              return [];
            }
          }
        }
      });
      
      logger?.debug('[Journal Relations] Added Journal <-> User relations');
    }
    
    // Add entries field to Journal type if JournalEntry type is available
    if (JournalEntryTC) {
      JournalTC.addFields({
        entries: {
          type: [JournalEntryTC],
          args: {
            limit: { type: 'Int', defaultValue: 10 },
            skip: { type: 'Int', defaultValue: 0 },
            sortBy: { type: 'String', defaultValue: 'entryDate' },
            sortOrder: { type: 'String', defaultValue: 'desc' }
          },
          description: 'Entries in this journal',
          resolve: async (journal, args, context) => {
            try {
              if (!journal || !journal._id) return [];
              
              // Use models from context if available, otherwise from function argument
              const modelContext = context.models || models;
              const { limit, skip, sortBy, sortOrder } = args;
              
              // Define sort criteria
              const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
              
              return await modelContext.JournalEntry.find({ journalId: journal._id })
                .sort(sort)
                .skip(skip)
                .limit(limit);
            } catch (error) {
              logger?.error(`[Error] Resolving journal entries relation: ${error.message}`);
              return [];
            }
          }
        },
        entryCount: {
          type: 'Int',
          description: 'Number of entries in this journal',
          resolve: async (journal, args, context) => {
            try {
              if (!journal || !journal._id) return 0;
              
              // Use models from context if available, otherwise from function argument
              const modelContext = context.models || models;
              
              // Check if count is already in metadata
              if (journal.metadata && journal.metadata.entryCount !== undefined) {
                return journal.metadata.entryCount;
              }
              
              // Otherwise, count from database
              return await modelContext.JournalEntry.countDocuments({ journalId: journal._id });
            } catch (error) {
              logger?.error(`[Error] Resolving journal entry count: ${error.message}`);
              return 0;
            }
          }
        }
      });
      
      logger?.debug('[Journal Relations] Added Journal <-> JournalEntry relations');
    }
    
    logger?.debug('[Journal Relations] Successfully applied relations');
  } catch (error) {
    logger?.error(`[Journal Relations] Error applying relations: ${error.message}`);
  }
};

export default journalRelations; 