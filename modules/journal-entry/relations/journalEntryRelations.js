import { schemaComposer } from 'graphql-compose';
import { getJournalEntryTC } from '../registry.js';

/**
 * JournalEntry module relations
 * @param {Object} ctx - The application context
 */
export const journalEntryRelations = (ctx) => {
  const { logger, models, typeComposers } = ctx;
  
  try {
    // Initialize type composers if not already done
    const JournalEntryTC = getJournalEntryTC();
    
    // Method 1: Try to get User type from context typeComposers
    let UserTC;
    if (typeComposers && typeComposers.UserTC) {
      UserTC = typeComposers.UserTC;
      logger?.debug('[JournalEntry Relations] Found User type in context typeComposers');
    } 
    // Method 2: Try to get from modules
    else if (ctx.app && ctx.app.modules) {
      const userModule = ctx.app.modules.find(m => m.id === 'user');
      if (userModule && userModule.typeComposers && userModule.typeComposers.UserTC) {
        UserTC = userModule.typeComposers.UserTC;
        logger?.debug('[JournalEntry Relations] Found User type in user module');
      }
    }
    // Method 3: Try schemaComposer as last resort
    if (!UserTC) {
      try {
        UserTC = schemaComposer.getOTC('User');
        logger?.debug('[JournalEntry Relations] Found User type in schemaComposer');
      } catch (e) {
        logger?.warn(`[JournalEntry Relations] Could not find User type: ${e.message}`);
      }
    }
    
    // Method 1: Try to get Journal type from context typeComposers
    let JournalTC;
    if (typeComposers && typeComposers.JournalTC) {
      JournalTC = typeComposers.JournalTC;
      logger?.debug('[JournalEntry Relations] Found Journal type in context typeComposers');
    } 
    // Method 2: Try to get from modules
    else if (ctx.app && ctx.app.modules) {
      const journalModule = ctx.app.modules.find(m => m.id === 'journal');
      if (journalModule && journalModule.typeComposers && journalModule.typeComposers.JournalTC) {
        JournalTC = journalModule.typeComposers.JournalTC;
        logger?.debug('[JournalEntry Relations] Found Journal type in journal module');
      }
    }
    // Method 3: Try schemaComposer as last resort
    if (!JournalTC) {
      try {
        JournalTC = schemaComposer.getOTC('Journal');
        logger?.debug('[JournalEntry Relations] Found Journal type in schemaComposer');
      } catch (e) {
        logger?.warn(`[JournalEntry Relations] Could not find Journal type: ${e.message}`);
      }
    }
    
    if (!JournalEntryTC) {
      logger?.warn('[JournalEntry Relations] JournalEntry type not found in registry');
      return;
    }
    
    logger?.debug(`[JournalEntry Relations] Found types: JournalEntry (${!!JournalEntryTC}), User (${!!UserTC}), Journal (${!!JournalTC})`);
    
    // Add User field to JournalEntry type if User type is available
    if (UserTC) {
      JournalEntryTC.addFields({
        user: {
          type: UserTC,
          description: 'The user who created this entry',
          resolve: async (entry, args, context) => {
            try {
              if (!entry || !entry.userId) return null;
              // Use models from context if available, otherwise from function argument
              const modelContext = context.models || models;
              return await modelContext.User.findById(entry.userId);
            } catch (error) {
              logger?.error(`[Error] Resolving journal entry user relation: ${error.message}`);
              return null;
            }
          }
        }
      });
      
      logger?.debug('[JournalEntry Relations] Added JournalEntry <-> User relation');
    }
    
    // Add Journal field to JournalEntry type if Journal type is available
    if (JournalTC) {
      JournalEntryTC.addFields({
        journal: {
          type: JournalTC,
          description: 'The journal this entry belongs to',
          resolve: async (entry, args, context) => {
            try {
              if (!entry || !entry.journalId) return null;
              // Use models from context if available, otherwise from function argument
              const modelContext = context.models || models;
              return await modelContext.Journal.findById(entry.journalId);
            } catch (error) {
              logger?.error(`[Error] Resolving journal entry journal relation: ${error.message}`);
              return null;
            }
          }
        }
      });
      
      logger?.debug('[JournalEntry Relations] Added JournalEntry <-> Journal relation');
    }
    
    // Add specific fields for attachment handling
    JournalEntryTC.addFields({
      attachmentCount: {
        type: 'Int',
        description: 'Number of attachments in this entry',
        resolve: (entry) => {
          try {
            return entry.attachments ? entry.attachments.length : 0;
          } catch (error) {
            logger?.error(`[Error] Resolving attachment count: ${error.message}`);
            return 0;
          }
        }
      }
    });
    
    logger?.debug('[JournalEntry Relations] Successfully applied relations');
  } catch (error) {
    logger?.error(`[JournalEntry Relations] Error applying relations: ${error.message}`);
  }
};

export default journalEntryRelations; 