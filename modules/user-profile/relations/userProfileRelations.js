import { schemaComposer } from 'graphql-compose';
import { getUserProfileTC } from '../registry.js';

/**
 * UserProfile module relations
 * @param {Object} ctx - The application context
 */
export const userProfileRelations = (ctx) => {
  const { logger, models, typeComposers } = ctx;
  
  try {
    // Initialize type composers if not already done
    const UserProfileTC = getUserProfileTC();
    
    // Instead of using schemaComposer directly, try to get User type from context first
    let UserTC;
    
    // Method 1: Try to get from context typeComposers
    if (typeComposers && typeComposers.UserTC) {
      UserTC = typeComposers.UserTC;
      logger?.debug('[UserProfile Relations] Found User type in context typeComposers');
    } 
    // Method 2: Try to get from modules
    else if (ctx.app && ctx.app.modules) {
      const userModule = ctx.app.modules.find(m => m.id === 'user');
      if (userModule && userModule.typeComposers && userModule.typeComposers.UserTC) {
        UserTC = userModule.typeComposers.UserTC;
        logger?.debug('[UserProfile Relations] Found User type in user module');
      }
    }
    // Method 3: Try schemaComposer as last resort
    if (!UserTC) {
      try {
        UserTC = schemaComposer.getOTC('User');
        logger?.debug('[UserProfile Relations] Found User type in schemaComposer');
      } catch (e) {
        logger?.warn(`[UserProfile Relations] Could not find User type: ${e.message}`);
      }
    }
    
    if (!UserTC) {
      logger?.warn('[UserProfile Relations] User type not found in any source');
      return;
    }
    
    if (!UserProfileTC) {
      logger?.warn('[UserProfile Relations] UserProfile type not found in registry');
      return;
    }
    
    logger?.debug(`[UserProfile Relations] Found types: User (${!!UserTC}), UserProfile (${!!UserProfileTC})`);
    
    // Add UserProfile field to User type
    UserTC.addFields({
      profile: {
        type: UserProfileTC,
        description: 'The user\'s profile information',
        resolve: async (user, args, context) => {
          try {
            if (!user || !user._id) return null;
            // Use models from context if available, otherwise from function argument
            const modelContext = context.models || models;
            return await modelContext.UserProfile.findOne({ userId: user._id });
          } catch (error) {
            logger?.error(`[Error] Resolving user profile relation: ${error.message}`);
            return null;
          }
        }
      }
    });
    
    // Add User field to UserProfile type
    UserProfileTC.addFields({
      user: {
        type: UserTC,
        description: 'The user this profile belongs to',
        resolve: async (profile, args, context) => {
          try {
            if (!profile || !profile.userId) return null;
            // Use models from context if available, otherwise from function argument
            const modelContext = context.models || models;
            return await modelContext.User.findById(profile.userId);
          } catch (error) {
            logger?.error(`[Error] Resolving profile user relation: ${error.message}`);
            return null;
          }
        }
      }
    });
    
    logger?.debug('[UserProfile Relations] Successfully applied relations between User and UserProfile');
  } catch (error) {
    logger?.error(`[UserProfile Relations] Error applying relations: ${error.message}`);
  }
};

export default userProfileRelations; 