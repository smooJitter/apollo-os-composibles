import { schemaComposer } from 'graphql-compose';
import { getVisionBoardTC } from '../registry.js';

/**
 * Vision Board module relations
 * @param {Object} ctx - The application context
 */
export const visionBoardRelations = (ctx) => {
  const { logger, models, typeComposers } = ctx;
  
  try {
    // Initialize type composers if not already done
    const VisionBoardTC = getVisionBoardTC();
    
    // Try different methods to get the User type composer
    let UserTC;
    
    // Method 1: Try to get User type from context typeComposers
    if (typeComposers && typeComposers.UserTC) {
      UserTC = typeComposers.UserTC;
      logger?.debug('[Vision Board Relations] Found User type in context typeComposers');
    } 
    // Method 2: Try to get from modules
    else if (ctx.app && ctx.app.modules) {
      const userModule = ctx.app.modules.find(m => m.id === 'user');
      if (userModule && userModule.typeComposers && userModule.typeComposers.UserTC) {
        UserTC = userModule.typeComposers.UserTC;
        logger?.debug('[Vision Board Relations] Found User type in user module');
      }
    }
    // Method 3: Try schemaComposer as last resort
    if (!UserTC) {
      try {
        UserTC = schemaComposer.getOTC('User');
        logger?.debug('[Vision Board Relations] Found User type in schemaComposer');
      } catch (e) {
        logger?.warn(`[Vision Board Relations] Could not find User type: ${e.message}`);
      }
    }
    
    if (!VisionBoardTC) {
      logger?.warn('[Vision Board Relations] Vision Board type not found in registry');
      return;
    }
    
    logger?.debug(`[Vision Board Relations] Found types: VisionBoard (${!!VisionBoardTC}), User (${!!UserTC})`);
    
    // Add User field to VisionBoard type if User type is available
    if (UserTC) {
      VisionBoardTC.addFields({
        user: {
          type: UserTC,
          description: 'The user who created this vision board',
          resolve: async (visionBoard, args, context) => {
            try {
              if (!visionBoard || !visionBoard.userId) return null;
              // Use models from context if available, otherwise from function argument
              const modelContext = context.models || models;
              return await modelContext.User.findById(visionBoard.userId);
            } catch (error) {
              logger?.error(`[Error] Resolving vision board user relation: ${error.message}`);
              return null;
            }
          }
        }
      });
      
      // Add visionBoards field to User type
      UserTC.addFields({
        visionBoards: {
          type: [VisionBoardTC],
          args: {
            limit: { type: 'Int', defaultValue: 10 },
            isArchived: { type: 'Boolean' },
            category: { type: 'String' }
          },
          description: 'Vision boards created by this user',
          resolve: async (user, args, context) => {
            try {
              if (!user || !user._id) return [];
              
              // Use models from context if available, otherwise from function argument
              const modelContext = context.models || models;
              const { limit, isArchived, category } = args;
              
              // Build query
              const query = { userId: user._id };
              
              // Add optional filters
              if (typeof isArchived === 'boolean') {
                query.isArchived = isArchived;
              }
              
              if (category) {
                query['metadata.category'] = category;
              }
              
              // Find vision boards
              return await modelContext.VisionBoard.find(query)
                .sort({ createdAt: -1 })
                .limit(limit);
            } catch (error) {
              logger?.error(`[Error] Resolving user vision boards relation: ${error.message}`);
              return [];
            }
          }
        },
        
        visionBoardCount: {
          type: 'Int',
          description: 'Number of vision boards created by this user',
          resolve: async (user, args, context) => {
            try {
              if (!user || !user._id) return 0;
              
              // Use models from context if available, otherwise from function argument
              const modelContext = context.models || models;
              
              // Count vision boards
              return await modelContext.VisionBoard.countDocuments({ userId: user._id });
            } catch (error) {
              logger?.error(`[Error] Resolving user vision board count: ${error.message}`);
              return 0;
            }
          }
        }
      });
      
      logger?.debug('[Vision Board Relations] Added VisionBoard <-> User relations');
    }
    
    logger?.debug('[Vision Board Relations] Successfully applied relations');
  } catch (error) {
    logger?.error(`[Vision Board Relations] Error applying relations: ${error.message}`);
  }
};

export default visionBoardRelations; 