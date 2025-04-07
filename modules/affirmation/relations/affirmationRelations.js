import { schemaComposer } from 'graphql-compose';
import { getAffirmationTC } from '../registry.js';

/**
 * Affirmation module relations
 * @param {Object} ctx - The application context
 */
export const affirmationRelations = (ctx) => {
  const { logger, models, typeComposers } = ctx;
  
  try {
    // Initialize type composers if not already done
    const AffirmationTC = getAffirmationTC();
    
    // Try different methods to get the User type composer
    let UserTC;
    
    // Method 1: Try to get User type from context typeComposers
    if (typeComposers && typeComposers.UserTC) {
      UserTC = typeComposers.UserTC;
      logger?.debug('[Affirmation Relations] Found User type in context typeComposers');
    } 
    // Method 2: Try to get from modules
    else if (ctx.app && ctx.app.modules) {
      const userModule = ctx.app.modules.find(m => m.id === 'user');
      if (userModule && userModule.typeComposers && userModule.typeComposers.UserTC) {
        UserTC = userModule.typeComposers.UserTC;
        logger?.debug('[Affirmation Relations] Found User type in user module');
      }
    }
    // Method 3: Try schemaComposer as last resort
    if (!UserTC) {
      try {
        UserTC = schemaComposer.getOTC('User');
        logger?.debug('[Affirmation Relations] Found User type in schemaComposer');
      } catch (e) {
        logger?.warn(`[Affirmation Relations] Could not find User type: ${e.message}`);
      }
    }
    
    if (!AffirmationTC) {
      logger?.warn('[Affirmation Relations] Affirmation type not found in registry');
      return;
    }
    
    logger?.debug(`[Affirmation Relations] Found types: Affirmation (${!!AffirmationTC}), User (${!!UserTC})`);
    
    // Add User field to Affirmation type if User type is available
    if (UserTC) {
      AffirmationTC.addFields({
        user: {
          type: UserTC,
          description: 'The user who created this affirmation',
          resolve: async (affirmation, args, context) => {
            try {
              if (!affirmation || !affirmation.userId) return null;
              // Use models from context if available, otherwise from function argument
              const modelContext = context.models || models;
              return await modelContext.User.findById(affirmation.userId);
            } catch (error) {
              logger?.error(`[Error] Resolving affirmation user relation: ${error.message}`);
              return null;
            }
          }
        }
      });
      
      // Add affirmations field to User type
      UserTC.addFields({
        affirmations: {
          type: [AffirmationTC],
          args: {
            limit: { type: 'Int', defaultValue: 10 },
            isActive: { type: 'Boolean' },
            category: { type: 'String' }
          },
          description: 'Affirmations created by this user',
          resolve: async (user, args, context) => {
            try {
              if (!user || !user._id) return [];
              
              // Use models from context if available, otherwise from function argument
              const modelContext = context.models || models;
              const { limit, isActive, category } = args;
              
              // Build query
              const query = { userId: user._id };
              
              // Add optional filters
              if (typeof isActive === 'boolean') {
                query.isActive = isActive;
              }
              
              if (category) {
                query.category = category;
              }
              
              // Find affirmations
              return await modelContext.Affirmation.find(query)
                .sort({ createdAt: -1 })
                .limit(limit);
            } catch (error) {
              logger?.error(`[Error] Resolving user affirmations relation: ${error.message}`);
              return [];
            }
          }
        },
        
        affirmationCount: {
          type: 'Int',
          args: {
            isActive: { type: 'Boolean' }
          },
          description: 'Number of affirmations created by this user',
          resolve: async (user, args, context) => {
            try {
              if (!user || !user._id) return 0;
              
              // Use models from context if available, otherwise from function argument
              const modelContext = context.models || models;
              const { isActive } = args;
              
              // Build query
              const query = { userId: user._id };
              
              // Add optional filters
              if (typeof isActive === 'boolean') {
                query.isActive = isActive;
              }
              
              // Count affirmations
              return await modelContext.Affirmation.countDocuments(query);
            } catch (error) {
              logger?.error(`[Error] Resolving user affirmation count: ${error.message}`);
              return 0;
            }
          }
        },
        
        todaysAffirmations: {
          type: [AffirmationTC],
          description: 'Affirmations scheduled for today',
          resolve: async (user, args, context) => {
            try {
              if (!user || !user._id) return [];
              
              // Use models from context if available, otherwise from function argument
              const modelContext = context.models || models;
              
              // Get current day info
              const now = new Date();
              const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
              const dayOfMonth = now.getDate();
              
              // Find active affirmations for the user with appropriate frequency
              return await modelContext.Affirmation.find({
                userId: user._id,
                isActive: true,
                $or: [
                  { reminderFrequency: 'daily' },
                  { reminderFrequency: 'weekdays', $expr: { $not: isWeekend } },
                  { reminderFrequency: 'weekends', $expr: isWeekend },
                  { reminderFrequency: 'weekly', $expr: { $eq: [dayOfWeek, 1] } }, // Mondays
                  { reminderFrequency: 'monthly', $expr: { $eq: [dayOfMonth, 1] } } // 1st of month
                ]
              });
            } catch (error) {
              logger?.error(`[Error] Resolving user today's affirmations: ${error.message}`);
              return [];
            }
          }
        }
      });
      
      logger?.debug('[Affirmation Relations] Added Affirmation <-> User relations');
    }
    
    logger?.debug('[Affirmation Relations] Successfully applied relations');
  } catch (error) {
    logger?.error(`[Affirmation Relations] Error applying relations: ${error.message}`);
  }
};

export default affirmationRelations; 