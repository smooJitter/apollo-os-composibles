import { getJournalEntryTC, getJournalEntryInputTC, getAttachmentInputTC, getEntryTypeEnumTC } from './registry.js';
import mongoose from 'mongoose';

export const initResolvers = () => {
  const JournalEntryTC = getJournalEntryTC();
  const EntryTypeEnumTC = getEntryTypeEnumTC();
  
  // Define queries
  const queries = {
    journalEntryById: JournalEntryTC.mongooseResolvers.findById(),
    journalEntryByIds: JournalEntryTC.mongooseResolvers.findByIds(),
    journalEntryOne: JournalEntryTC.mongooseResolvers.findOne(),
    journalEntryMany: JournalEntryTC.mongooseResolvers.findMany(),
    journalEntryCount: JournalEntryTC.mongooseResolvers.count(),
    journalEntryConnection: JournalEntryTC.mongooseResolvers.connection(),
    journalEntryPagination: JournalEntryTC.mongooseResolvers.pagination(),
    
    // Custom query to get entries for a specific journal
    journalEntries: {
      type: [JournalEntryTC],
      args: {
        journalId: 'MongoID!',
        limit: 'Int',
        skip: 'Int',
        sortBy: 'String',
        sortOrder: 'String',
      },
      resolve: async (source, args, context) => {
        const { journalId, limit = 20, skip = 0, sortBy = 'entryDate', sortOrder = 'desc' } = args;
        const { models, logger, currentUser } = context;
        
        try {
          // Convert string ID to ObjectId
          const journalObjectId = mongoose.Types.ObjectId.isValid(journalId) 
            ? new mongoose.Types.ObjectId(journalId)
            : null;
            
          if (!journalObjectId) {
            throw new Error(`Invalid journal ID: ${journalId}`);
          }
          
          // Check journal ownership if currentUser is available
          if (currentUser) {
            const journal = await models.Journal.findById(journalObjectId);
            if (!journal) {
              throw new Error(`Journal not found: ${journalId}`);
            }
            
            if (journal.userId.toString() !== currentUser.id.toString()) {
              throw new Error('Not authorized to view entries for this journal');
            }
          }
          
          // Set up sort criteria
          const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
          
          // Find entries belonging to the journal
          const entries = await models.JournalEntry.find({ journalId: journalObjectId })
            .sort(sort)
            .skip(skip)
            .limit(limit);
            
          return entries;
        } catch (error) {
          logger?.error(`[JournalEntry Resolver] Error fetching journal entries: ${error.message}`);
          throw error;
        }
      }
    },
    
    // Query to get entries by type
    entriesByType: {
      type: [JournalEntryTC],
      args: {
        userId: 'MongoID!',
        entryType: EntryTypeEnumTC,
        limit: 'Int',
        skip: 'Int',
        sortBy: 'String',
        sortOrder: 'String',
      },
      resolve: async (source, args, context) => {
        const { userId, entryType, limit = 20, skip = 0, sortBy = 'entryDate', sortOrder = 'desc' } = args;
        const { models, logger, currentUser } = context;
        
        try {
          // Convert string ID to ObjectId
          const userObjectId = mongoose.Types.ObjectId.isValid(userId) 
            ? new mongoose.Types.ObjectId(userId)
            : null;
            
          if (!userObjectId) {
            throw new Error(`Invalid user ID: ${userId}`);
          }
          
          // Check authorization if currentUser is available
          if (currentUser && currentUser.id.toString() !== userId) {
            throw new Error('Not authorized to view entries for this user');
          }
          
          // Set up sort criteria
          const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
          
          // Build query
          const query = { userId: userObjectId };
          if (entryType) {
            query.entryType = entryType;
          }
          
          // Find entries by type
          const entries = await models.JournalEntry.find(query)
            .sort(sort)
            .skip(skip)
            .limit(limit);
            
          return entries;
        } catch (error) {
          logger?.error(`[JournalEntry Resolver] Error fetching entries by type: ${error.message}`);
          throw error;
        }
      }
    },
    
    // Query to get recent entries across all user journals
    recentUserEntries: {
      type: [JournalEntryTC],
      args: {
        userId: 'MongoID!',
        limit: 'Int',
        skip: 'Int',
      },
      resolve: async (source, args, context) => {
        const { userId, limit = 10, skip = 0 } = args;
        const { models, logger } = context;
        
        try {
          // Convert string ID to ObjectId
          const userObjectId = mongoose.Types.ObjectId.isValid(userId) 
            ? new mongoose.Types.ObjectId(userId)
            : null;
            
          if (!userObjectId) {
            throw new Error(`Invalid user ID: ${userId}`);
          }
          
          // Find recent entries for the user across all journals
          const entries = await models.JournalEntry.find({ userId: userObjectId })
            .sort({ entryDate: -1 })
            .skip(skip)
            .limit(limit);
            
          return entries;
        } catch (error) {
          logger?.error(`[JournalEntry Resolver] Error fetching recent user entries: ${error.message}`);
          throw error;
        }
      }
    }
  };
  
  // Define mutations
  const mutations = {
    // Create journal entry
    journalEntryCreate: {
      type: JournalEntryTC,
      args: {
        journalId: 'MongoID!',
        userId: 'MongoID!',
        input: getJournalEntryInputTC()
      },
      resolve: async (source, args, context) => {
        const { journalId, userId, input } = args;
        const { models, logger, currentUser } = context;
        
        try {
          // Convert string IDs to ObjectIds
          const userObjectId = mongoose.Types.ObjectId.isValid(userId) 
            ? new mongoose.Types.ObjectId(userId)
            : null;
          
          const journalObjectId = mongoose.Types.ObjectId.isValid(journalId) 
            ? new mongoose.Types.ObjectId(journalId)
            : null;
            
          if (!userObjectId) {
            throw new Error(`Invalid user ID: ${userId}`);
          }
          
          if (!journalObjectId) {
            throw new Error(`Invalid journal ID: ${journalId}`);
          }
          
          // Check if journal exists and belongs to the user
          const journal = await models.Journal.findById(journalObjectId);
          
          if (!journal) {
            throw new Error(`Journal not found: ${journalId}`);
          }
          
          if (journal.userId.toString() !== userObjectId.toString()) {
            throw new Error('Not authorized to add entries to this journal');
          }
          
          // Create new journal entry
          const journalEntry = new models.JournalEntry({
            ...input,
            journalId: journalObjectId,
            userId: userObjectId,
            entryDate: input.entryDate || new Date()
          });
          
          await journalEntry.save();
          logger?.debug(`[JournalEntry] Created entry for journal ${journalId}`);
          
          return journalEntry;
        } catch (error) {
          logger?.error(`[JournalEntry Resolver] Error creating journal entry: ${error.message}`);
          throw error;
        }
      }
    },
    
    // Update journal entry
    journalEntryUpdate: {
      type: JournalEntryTC,
      args: {
        id: 'MongoID!',
        input: getJournalEntryInputTC()
      },
      resolve: async (source, args, context) => {
        const { id, input } = args;
        const { models, logger, currentUser } = context;
        
        try {
          // Convert string ID to ObjectId
          const entryId = mongoose.Types.ObjectId.isValid(id) 
            ? new mongoose.Types.ObjectId(id)
            : null;
            
          if (!entryId) {
            throw new Error(`Invalid journal entry ID: ${id}`);
          }
          
          // Find the journal entry
          const entry = await models.JournalEntry.findById(entryId);
          
          if (!entry) {
            throw new Error(`Journal entry not found: ${id}`);
          }
          
          // Check ownership if currentUser is available
          if (currentUser && entry.userId.toString() !== currentUser.id.toString()) {
            throw new Error('Not authorized to update this entry');
          }
          
          // Update the entry
          Object.keys(input).forEach(key => {
            entry[key] = input[key];
          });
          
          await entry.save();
          logger?.debug(`[JournalEntry] Updated entry ${id}`);
          
          return entry;
        } catch (error) {
          logger?.error(`[JournalEntry Resolver] Error updating journal entry: ${error.message}`);
          throw error;
        }
      }
    },
    
    // Delete journal entry
    journalEntryDelete: {
      type: JournalEntryTC,
      args: {
        id: 'MongoID!'
      },
      resolve: async (source, args, context) => {
        const { id } = args;
        const { models, logger, currentUser } = context;
        
        try {
          // Convert string ID to ObjectId
          const entryId = mongoose.Types.ObjectId.isValid(id) 
            ? new mongoose.Types.ObjectId(id)
            : null;
            
          if (!entryId) {
            throw new Error(`Invalid journal entry ID: ${id}`);
          }
          
          // Find the journal entry
          const entry = await models.JournalEntry.findById(entryId);
          
          if (!entry) {
            throw new Error(`Journal entry not found: ${id}`);
          }
          
          // Check ownership if currentUser is available
          if (currentUser && entry.userId.toString() !== currentUser.id.toString()) {
            throw new Error('Not authorized to delete this entry');
          }
          
          // Delete the entry
          await models.JournalEntry.findByIdAndDelete(entryId);
          logger?.debug(`[JournalEntry] Deleted entry ${id}`);
          
          return entry;
        } catch (error) {
          logger?.error(`[JournalEntry Resolver] Error deleting journal entry: ${error.message}`);
          throw error;
        }
      }
    },
    
    // Add attachment to journal entry
    journalEntryAddAttachment: {
      type: JournalEntryTC,
      args: {
        id: 'MongoID!',
        attachment: getAttachmentInputTC()
      },
      resolve: async (source, args, context) => {
        const { id, attachment } = args;
        const { models, logger, currentUser } = context;
        
        try {
          // Convert string ID to ObjectId
          const entryId = mongoose.Types.ObjectId.isValid(id) 
            ? new mongoose.Types.ObjectId(id)
            : null;
            
          if (!entryId) {
            throw new Error(`Invalid journal entry ID: ${id}`);
          }
          
          // Find the journal entry
          const entry = await models.JournalEntry.findById(entryId);
          
          if (!entry) {
            throw new Error(`Journal entry not found: ${id}`);
          }
          
          // Check ownership if currentUser is available
          if (currentUser && entry.userId.toString() !== currentUser.id.toString()) {
            throw new Error('Not authorized to update this entry');
          }
          
          // Add the attachment
          entry.attachments.push(attachment);
          await entry.save();
          logger?.debug(`[JournalEntry] Added attachment to entry ${id}`);
          
          return entry;
        } catch (error) {
          logger?.error(`[JournalEntry Resolver] Error adding attachment: ${error.message}`);
          throw error;
        }
      }
    }
  };
  
  return {
    queries,
    mutations
  };
};

export default {
  initResolvers
}; 