import { schemaComposer } from 'graphql-compose';
import { getHabitTC } from '../registry.js';

/**
 * Habit module relations
 * @param {Object} ctx - The application context
 */
export const habitRelations = (ctx) => {
  const { logger, models, typeComposers } = ctx;
  
  try {
    // Initialize type composers if not already done
    const HabitTC = getHabitTC();
    
    // Try different methods to get the User type composer
    let UserTC;
    
    // Method 1: Try to get User type from context typeComposers
    if (typeComposers && typeComposers.UserTC) {
      UserTC = typeComposers.UserTC;
      logger?.debug('[Habit Relations] Found User type in context typeComposers');
    } 
    // Method 2: Try to get from modules
    else if (ctx.app && ctx.app.modules) {
      const userModule = ctx.app.modules.find(m => m.id === 'user');
      if (userModule && userModule.typeComposers && userModule.typeComposers.UserTC) {
        UserTC = userModule.typeComposers.UserTC;
        logger?.debug('[Habit Relations] Found User type in user module');
      }
    }
    // Method 3: Try schemaComposer as last resort
    if (!UserTC) {
      try {
        UserTC = schemaComposer.getOTC('User');
        logger?.debug('[Habit Relations] Found User type in schemaComposer');
      } catch (e) {
        logger?.warn(`[Habit Relations] Could not find User type: ${e.message}`);
      }
    }
    
    if (!HabitTC) {
      logger?.warn('[Habit Relations] Habit type not found in registry');
      return;
    }
    
    logger?.debug(`[Habit Relations] Found types: Habit (${!!HabitTC}), User (${!!UserTC})`);
    
    // Add User field to Habit type if User type is available
    if (UserTC) {
      HabitTC.addFields({
        user: {
          type: UserTC,
          description: 'The user who created this habit',
          resolve: async (habit, args, context) => {
            try {
              if (!habit || !habit.userId) return null;
              // Use models from context if available, otherwise from function argument
              const modelContext = context.models || models;
              return await modelContext.User.findById(habit.userId);
            } catch (error) {
              logger?.error(`[Error] Resolving habit user relation: ${error.message}`);
              return null;
            }
          }
        }
      });
      
      // Add habits field to User type
      UserTC.addFields({
        habits: {
          type: [HabitTC],
          args: {
            limit: { type: 'Int', defaultValue: 10 },
            active: { type: 'Boolean' },
            category: { type: 'String' },
            frequency: { type: 'String' }
          },
          description: 'Habits created by this user',
          resolve: async (user, args, context) => {
            try {
              if (!user || !user._id) return [];
              
              // Use models from context if available, otherwise from function argument
              const modelContext = context.models || models;
              const { limit, active, category, frequency } = args;
              
              // Build query
              const query = { userId: user._id };
              
              // Add optional filters
              if (typeof active === 'boolean') {
                query['status.active'] = active;
              }
              
              if (category) {
                query['metadata.category'] = category;
              }
              
              if (frequency) {
                query.frequency = frequency;
              }
              
              // Find habits
              return await modelContext.Habit.find(query)
                .sort({ 'metadata.priority': -1, createdAt: -1 })
                .limit(limit);
            } catch (error) {
              logger?.error(`[Error] Resolving user habits relation: ${error.message}`);
              return [];
            }
          }
        },
        
        habitCount: {
          type: 'Int',
          description: 'Number of habits created by this user',
          resolve: async (user, args, context) => {
            try {
              if (!user || !user._id) return 0;
              
              // Use models from context if available, otherwise from function argument
              const modelContext = context.models || models;
              
              // Count habits
              return await modelContext.Habit.countDocuments({ userId: user._id });
            } catch (error) {
              logger?.error(`[Error] Resolving user habit count: ${error.message}`);
              return 0;
            }
          }
        },
        
        habitsForToday: {
          type: [HabitTC],
          description: 'Habits scheduled for today',
          resolve: async (user, args, context) => {
            try {
              if (!user || !user._id) return [];
              
              // Use models from context if available, otherwise from function argument
              const modelContext = context.models || models;
              
              // Get current day of week (0 = Sunday, 6 = Saturday)
              const today = new Date();
              const dayOfWeek = today.getDay();
              
              // Find habits scheduled for today
              return await modelContext.Habit.find({
                userId: user._id,
                'status.active': true,
                daysOfWeek: dayOfWeek
              }).sort({ 'metadata.priority': -1 });
            } catch (error) {
              logger?.error(`[Error] Resolving user habits for today: ${error.message}`);
              return [];
            }
          }
        }
      });
      
      logger?.debug('[Habit Relations] Added Habit <-> User relations');
    }
    
    logger?.debug('[Habit Relations] Successfully applied relations');
  } catch (error) {
    logger?.error(`[Habit Relations] Error applying relations: ${error.message}`);
  }
};

export default habitRelations; 