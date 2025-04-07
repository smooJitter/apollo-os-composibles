import { UnifiedRecsAndNotifs } from './schemas.js';
import { initTypeComposers } from './registry.js';
import { initResolvers } from './resolvers.js';
import { initHooks } from './hooks/index.js';
import { initActions } from './actions/index.js';
import { initRelations } from './relations/index.js';
import { 
  ENTRY_TYPES, 
  STATUS_TYPES, 
  CONTENT_TYPES,
  RECOMMENDATION_REASONS,
  NOTIFICATION_REASONS,
  UNIFIED_EVENTS,
  PRIORITY_LEVELS
} from './constants.js';

export const init = async (ctx = {}) => {
  const logger = ctx?.logger?.child({ module: 'unified-recommendations' }) || console;
  
  try {
    logger.info('Initializing Unified Recommendations and Notifications module');
    
    // Register the model
    ctx.models = ctx.models || {};
    ctx.models.UnifiedRecsAndNotifs = UnifiedRecsAndNotifs;
    
    // Initialize type composers for GraphQL
    const typeComposers = initTypeComposers();
    ctx.typeComposers = {
      ...(ctx.typeComposers || {}),
      ...typeComposers
    };
    
    // Initialize GraphQL resolvers
    const resolvers = initResolvers(ctx);
    ctx.resolvers = {
      ...(ctx.resolvers || {}),
      unifiedRecommendations: resolvers
    };
    
    // Register helper method to get the type composer
    ctx.getUnifiedRecsAndNotifsTC = () => typeComposers.UnifiedRecsAndNotifsTC;
    
    // Initialize business logic actions
    const actions = initActions(ctx);
    ctx.actions = {
      ...(ctx.actions || {}),
      unifiedRecommendations: actions
    };
    
    // Initialize hooks for event handling
    await initHooks(ctx);
    
    // Initialize relations with other modules
    await initRelations(ctx);
    
    logger.info('Unified Recommendations and Notifications module initialized successfully');
    
    return ctx;
  } catch (error) {
    logger.error('Failed to initialize Unified Recommendations and Notifications module:', error);
    throw error;
  }
};

export const constants = {
  ENTRY_TYPES,
  STATUS_TYPES,
  CONTENT_TYPES,
  RECOMMENDATION_REASONS,
  NOTIFICATION_REASONS,
  UNIFIED_EVENTS,
  PRIORITY_LEVELS
};

export const models = {
  UnifiedRecsAndNotifs
};

export default {
  init,
  constants,
  models
}; 