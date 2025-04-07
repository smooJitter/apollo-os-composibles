import { getAffirmationTC, getAffirmationInputTC } from './registry.js';
import mongoose from 'mongoose';
import { Affirmation } from './schemas.js';

/**
 * Initialize the resolvers for the Affirmation module
 * @returns {Object} Object containing GraphQL resolvers
 */
export const initResolvers = () => {
  // Get the type composers
  const AffirmationTC = getAffirmationTC();
  
  // Ensure AffirmationTC has mongoose methods
  if (!AffirmationTC.mongooseResolvers) {
    console.log('[Affirmation] Initializing mongoose resolvers on AffirmationTC');
    // If mongooseResolvers not available, manually set up basic resolvers
    AffirmationTC.mongooseResolvers = {
      findById: () => ({
        type: AffirmationTC,
        args: { _id: 'MongoID!' },
        resolve: async (source, args) => {
          return await Affirmation.findById(args._id);
        }
      }),
      findOne: () => ({
        type: AffirmationTC,
        args: { filter: 'JSON' },
        resolve: async (source, args) => {
          return await Affirmation.findOne(args.filter || {});
        }
      }),
      findMany: () => ({
        type: [AffirmationTC],
        args: { 
          filter: 'JSON',
          limit: 'Int',
          skip: 'Int',
          sort: 'JSON'
        },
        resolve: async (source, args) => {
          let query = Affirmation.find(args.filter || {});
          if (args.limit) query = query.limit(args.limit);
          if (args.skip) query = query.skip(args.skip);
          if (args.sort) query = query.sort(args.sort);
          return await query;
        }
      }),
      count: () => ({
        type: 'Int',
        args: { filter: 'JSON' },
        resolve: async (source, args) => {
          return await Affirmation.countDocuments(args.filter || {});
        }
      })
    };
  }
  
  // Define queries
  const queries = {
    // Get a single affirmation by ID
    affirmationById: AffirmationTC.mongooseResolvers.findById(),
    
    // Find one affirmation based on criteria
    affirmationOne: AffirmationTC.mongooseResolvers.findOne(),
    
    // Get multiple affirmations with filtering and pagination
    affirmationMany: AffirmationTC.mongooseResolvers.findMany(),
    
    // Count affirmations
    affirmationCount: AffirmationTC.mongooseResolvers.count(),
    
    // Get all affirmations for a specific user
    userAffirmations: {
      type: [AffirmationTC],
      args: {
        userId: 'MongoID!',
        isActive: 'Boolean',
        category: 'String'
      },
      resolve: async (source, args, context) => {
        const { userId, isActive, category } = args;
        const { models, logger } = context;
        
        try {
          // Convert string ID to ObjectId
          const userObjectId = mongoose.Types.ObjectId.isValid(userId) 
            ? new mongoose.Types.ObjectId(userId)
            : null;
            
          if (!userObjectId) {
            throw new Error(`Invalid user ID: ${userId}`);
          }
          
          // Use the Affirmation model from context or import directly
          const AffirmationModel = models?.Affirmation || mongoose.model('Affirmation');
          
          // Build query
          const query = { userId: userObjectId };
          
          // Add optional filters
          if (typeof isActive === 'boolean') {
            query.isActive = isActive;
          }
          
          if (category) {
            query.category = category;
          }
          
          // Fetch affirmations
          const affirmations = await AffirmationModel.find(query).sort({ createdAt: -1 });
          logger?.debug(`[Affirmation] Found ${affirmations.length} affirmations for user ${userId}`);
          
          return affirmations;
        } catch (error) {
          logger?.error(`[Affirmation Resolver] Error fetching user affirmations: ${error.message}`);
          throw error;
        }
      }
    },
    
    // Get daily affirmations for a user (those scheduled for today)
    todaysAffirmations: {
      type: [AffirmationTC],
      args: {
        userId: 'MongoID!'
      },
      resolve: async (source, args, context) => {
        const { userId } = args;
        const { models, logger } = context;
        
        try {
          // Convert string ID to ObjectId
          const userObjectId = mongoose.Types.ObjectId.isValid(userId) 
            ? new mongoose.Types.ObjectId(userId)
            : null;
            
          if (!userObjectId) {
            throw new Error(`Invalid user ID: ${userId}`);
          }
          
          // Use the Affirmation model from context or import directly
          const AffirmationModel = models?.Affirmation || mongoose.model('Affirmation');
          
          // Get current day info
          const now = new Date();
          const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          const dayOfMonth = now.getDate();
          
          // Find active affirmations for the user with appropriate frequency
          const affirmations = await AffirmationModel.find({
            userId: userObjectId,
            isActive: true,
            $or: [
              { reminderFrequency: 'daily' },
              { reminderFrequency: 'weekdays', $expr: { $not: isWeekend } },
              { reminderFrequency: 'weekends', $expr: isWeekend },
              { reminderFrequency: 'weekly', $expr: { $eq: [dayOfWeek, 1] } }, // Mondays
              { reminderFrequency: 'monthly', $expr: { $eq: [dayOfMonth, 1] } } // 1st of month
            ]
          });
          
          logger?.debug(`[Affirmation] Found ${affirmations.length} affirmations for today for user ${userId}`);
          return affirmations;
        } catch (error) {
          logger?.error(`[Affirmation Resolver] Error fetching today's affirmations: ${error.message}`);
          throw error;
        }
      }
    }
  };
  
  // Define mutations
  const mutations = {
    // Create a new affirmation
    affirmationCreate: {
      type: AffirmationTC,
      args: {
        userId: 'MongoID!',
        input: getAffirmationInputTC()
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
          
          // Use the Affirmation model from context or import directly
          const AffirmationModel = models?.Affirmation || mongoose.model('Affirmation');
          
          // Create affirmation
          const affirmation = new AffirmationModel({
            ...input,
            userId: userObjectId
          });
          
          await affirmation.save();
          logger?.debug(`[Affirmation] Created affirmation for user ${userId}: "${input.text.substring(0, 20)}..."`);
          
          return affirmation;
        } catch (error) {
          logger?.error(`[Affirmation Resolver] Error creating affirmation: ${error.message}`);
          throw error;
        }
      }
    },
    
    // Update an existing affirmation
    affirmationUpdate: {
      type: AffirmationTC,
      args: {
        id: 'MongoID!',
        input: getAffirmationInputTC()
      },
      resolve: async (source, args, context) => {
        const { id, input } = args;
        const { models, logger, currentUser } = context;
        
        try {
          // Use the Affirmation model from context or import directly
          const AffirmationModel = models?.Affirmation || mongoose.model('Affirmation');
          
          // Find affirmation
          const affirmation = await AffirmationModel.findById(id);
          
          if (!affirmation) {
            throw new Error(`Affirmation not found: ${id}`);
          }
          
          // Security check - only allow users to update their own affirmations
          if (currentUser && affirmation.userId.toString() !== currentUser.id.toString()) {
            throw new Error('Not authorized to update this affirmation');
          }
          
          // Update fields
          Object.keys(input).forEach(key => {
            affirmation[key] = input[key];
          });
          
          // Save changes
          await affirmation.save();
          logger?.debug(`[Affirmation] Updated affirmation ${id}`);
          
          return affirmation;
        } catch (error) {
          logger?.error(`[Affirmation Resolver] Error updating affirmation: ${error.message}`);
          throw error;
        }
      }
    },
    
    // Delete an affirmation
    affirmationDelete: {
      type: AffirmationTC,
      args: {
        id: 'MongoID!'
      },
      resolve: async (source, args, context) => {
        const { id } = args;
        const { models, logger, currentUser } = context;
        
        try {
          // Use the Affirmation model from context or import directly
          const AffirmationModel = models?.Affirmation || mongoose.model('Affirmation');
          
          // Find affirmation
          const affirmation = await AffirmationModel.findById(id);
          
          if (!affirmation) {
            throw new Error(`Affirmation not found: ${id}`);
          }
          
          // Security check - only allow users to delete their own affirmations
          if (currentUser && affirmation.userId.toString() !== currentUser.id.toString()) {
            throw new Error('Not authorized to delete this affirmation');
          }
          
          // Delete affirmation
          await AffirmationModel.deleteOne({ _id: id });
          logger?.debug(`[Affirmation] Deleted affirmation ${id}`);
          
          return affirmation;
        } catch (error) {
          logger?.error(`[Affirmation Resolver] Error deleting affirmation: ${error.message}`);
          throw error;
        }
      }
    },
    
    // Toggle the active status of an affirmation
    affirmationToggleActive: {
      type: AffirmationTC,
      args: {
        id: 'MongoID!'
      },
      resolve: async (source, args, context) => {
        const { id } = args;
        const { models, logger, currentUser } = context;
        
        try {
          // Use the Affirmation model from context or import directly
          const AffirmationModel = models?.Affirmation || mongoose.model('Affirmation');
          
          // Find affirmation
          const affirmation = await AffirmationModel.findById(id);
          
          if (!affirmation) {
            throw new Error(`Affirmation not found: ${id}`);
          }
          
          // Security check - only allow users to toggle their own affirmations
          if (currentUser && affirmation.userId.toString() !== currentUser.id.toString()) {
            throw new Error('Not authorized to modify this affirmation');
          }
          
          // Toggle active status
          affirmation.isActive = !affirmation.isActive;
          
          // Save changes
          await affirmation.save();
          logger?.debug(`[Affirmation] Toggled active status for affirmation ${id} to ${affirmation.isActive}`);
          
          return affirmation;
        } catch (error) {
          logger?.error(`[Affirmation Resolver] Error toggling affirmation status: ${error.message}`);
          throw error;
        }
      }
    }
  };
  
  // Return resolvers in standard format
  return {
    Query: queries,
    Mutation: mutations
  };
};

export default {
  initResolvers
}; 