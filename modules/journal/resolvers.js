import { getJournalTC, getJournalInputTC } from './registry.js';
import mongoose from 'mongoose';

export const initResolvers = () => {
  const JournalTC = getJournalTC();
  
  // Define queries
  const queries = {
    journalById: JournalTC.mongooseResolvers.findById(),
    journalByIds: JournalTC.mongooseResolvers.findByIds(),
    journalOne: JournalTC.mongooseResolvers.findOne(),
    journalMany: JournalTC.mongooseResolvers.findMany(),
    journalDataLoader: JournalTC.mongooseResolvers.dataLoader(),
    journalDataLoaderMany: JournalTC.mongooseResolvers.dataLoaderMany(),
    journalCount: JournalTC.mongooseResolvers.count(),
    journalConnection: JournalTC.mongooseResolvers.connection(),
    journalPagination: JournalTC.mongooseResolvers.pagination(),
    
    // Custom query to get journals by user ID
    userJournals: {
      type: [JournalTC],
      args: {
        userId: 'MongoID!',
        limit: 'Int',
        sortBy: 'String',
        sortOrder: 'String',
      },
      resolve: async (source, args, context) => {
        const { userId, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = args;
        const { models, logger } = context;
        
        try {
          // Convert string ID to ObjectId
          const userObjectId = mongoose.Types.ObjectId.isValid(userId) 
            ? new mongoose.Types.ObjectId(userId)
            : null;
            
          if (!userObjectId) {
            throw new Error(`Invalid user ID: ${userId}`);
          }
          
          // Set up sort criteria
          const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
          
          // Find journals belonging to the user
          const journals = await models.Journal.find({ userId: userObjectId })
            .sort(sort)
            .limit(limit);
            
          return journals;
        } catch (error) {
          logger?.error(`[Journal Resolver] Error fetching user journals: ${error.message}`);
          throw error;
        }
      }
    }
  };
  
  // Define mutations
  const mutations = {
    // Create journal
    journalCreate: {
      type: JournalTC,
      args: {
        userId: 'MongoID!',
        input: getJournalInputTC()
      },
      resolve: async (source, args, context) => {
        const { userId, input } = args;
        const { models, logger } = context;
        
        try {
          // Convert string ID to ObjectId
          const userObjectId = mongoose.Types.ObjectId.isValid(userId) 
            ? new mongoose.Types.ObjectId(userId)
            : null;
            
          if (!userObjectId) {
            throw new Error(`Invalid user ID: ${userId}`);
          }
          
          // Create new journal
          const journal = new models.Journal({
            ...input,
            userId: userObjectId
          });
          
          await journal.save();
          logger?.debug(`[Journal] Created journal "${journal.title}" for user ${userId}`);
          
          return journal;
        } catch (error) {
          logger?.error(`[Journal Resolver] Error creating journal: ${error.message}`);
          throw error;
        }
      }
    },
    
    // Update journal
    journalUpdate: {
      type: JournalTC,
      args: {
        id: 'MongoID!',
        input: getJournalInputTC()
      },
      resolve: async (source, args, context) => {
        const { id, input } = args;
        const { models, logger, currentUser } = context;
        
        try {
          // Convert string ID to ObjectId
          const journalId = mongoose.Types.ObjectId.isValid(id) 
            ? new mongoose.Types.ObjectId(id)
            : null;
            
          if (!journalId) {
            throw new Error(`Invalid journal ID: ${id}`);
          }
          
          // Find the journal
          const journal = await models.Journal.findById(journalId);
          
          if (!journal) {
            throw new Error(`Journal not found: ${id}`);
          }
          
          // Check ownership if currentUser is available
          if (currentUser && journal.userId.toString() !== currentUser.id.toString()) {
            throw new Error('Not authorized to update this journal');
          }
          
          // Update the journal
          Object.keys(input).forEach(key => {
            journal[key] = input[key];
          });
          
          await journal.save();
          logger?.debug(`[Journal] Updated journal "${journal.title}" (${id})`);
          
          return journal;
        } catch (error) {
          logger?.error(`[Journal Resolver] Error updating journal: ${error.message}`);
          throw error;
        }
      }
    },
    
    // Delete journal
    journalDelete: {
      type: JournalTC,
      args: {
        id: 'MongoID!'
      },
      resolve: async (source, args, context) => {
        const { id } = args;
        const { models, logger, currentUser } = context;
        
        try {
          // Convert string ID to ObjectId
          const journalId = mongoose.Types.ObjectId.isValid(id) 
            ? new mongoose.Types.ObjectId(id)
            : null;
            
          if (!journalId) {
            throw new Error(`Invalid journal ID: ${id}`);
          }
          
          // Find the journal
          const journal = await models.Journal.findById(journalId);
          
          if (!journal) {
            throw new Error(`Journal not found: ${id}`);
          }
          
          // Check ownership if currentUser is available
          if (currentUser && journal.userId.toString() !== currentUser.id.toString()) {
            throw new Error('Not authorized to delete this journal');
          }
          
          // Delete the journal
          await models.Journal.findByIdAndDelete(journalId);
          logger?.debug(`[Journal] Deleted journal "${journal.title}" (${id})`);
          
          return journal;
        } catch (error) {
          logger?.error(`[Journal Resolver] Error deleting journal: ${error.message}`);
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