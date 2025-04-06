/**
 * UserProfile module hooks
 * @param {Object} ctx - The application context
 */
export const userProfileHooks = (ctx) => {
  const { logger } = ctx;
  
  // Try different sources for hook registry
  const hookRegistry = ctx.hookRegistry || 
                     (ctx.app && ctx.app.hookRegistry) || 
                     (ctx.hooks && ctx.hooks.registry);
  
  if (!hookRegistry) {
    logger?.warn('[UserProfile Hooks] Hook registry not available in context');
    return;
  }
  
  try {
    // Register hooks for user creation and deletion
    hookRegistry.register('user:afterUserCreate', async ({ user, models, context }) => {
      try {
        // Use models from event or context
        const modelContext = models || context?.models || ctx.models;
        if (!modelContext || !modelContext.UserProfile) {
          logger?.warn('[UserProfile Hooks] UserProfile model not available');
          return;
        }
        
        // Create a default profile when a user is created
        const { UserProfile } = modelContext;
        const exists = await UserProfile.findOne({ userId: user.id });
        
        if (!exists) {
          const newProfile = new UserProfile({
            userId: user.id,
            bio: '',
            avatarUrl: ''
          });
          
          await newProfile.save();
          logger?.debug(`[UserProfile] Created default profile for user ${user.id}`);
        }
      } catch (error) {
        logger?.error(`[Error] Creating default user profile: ${error.message}`);
      }
    });
    
    hookRegistry.register('user:afterUserDelete', async ({ user, models, context }) => {
      try {
        // Use models from event or context
        const modelContext = models || context?.models || ctx.models;
        if (!modelContext || !modelContext.UserProfile) {
          logger?.warn('[UserProfile Hooks] UserProfile model not available');
          return;
        }
        
        // Delete profile when user is deleted
        const { UserProfile } = modelContext;
        await UserProfile.deleteOne({ userId: user.id });
        logger?.debug(`[UserProfile] Deleted profile for user ${user.id}`);
      } catch (error) {
        logger?.error(`[Error] Deleting user profile: ${error.message}`);
      }
    });
    
    // Register hooks for profile updates
    hookRegistry.register('user-profile:beforeProfileUpdate', []);
    hookRegistry.register('user-profile:afterProfileUpdate', []);
    
    logger?.debug('[UserProfile Hooks] Applied hooks to context');
  } catch (error) {
    logger?.error(`[UserProfile Hooks] Error applying hooks: ${error.message}`);
  }
};

export default userProfileHooks; 