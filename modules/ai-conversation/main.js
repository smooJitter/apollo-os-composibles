import { AIConversation } from './schemas.js';
import { initTypeComposers } from './registry.js';
import { initResolvers } from './resolvers.js';
import { initHooks } from './hooks/index.js';
import { initActions } from './actions/index.js';
import { initRelations } from './relations/index.js';
import { 
  CONVERSATION_TYPES, 
  INTERACTION_CATEGORIES,
  AI_MODELS,
  SENTIMENT_TYPES,
  INTERACTION_STATUSES,
  CONVERSATION_EVENTS
} from './constants.js';

export const init = async (ctx = {}) => {
  const logger = ctx?.logger?.child({ module: 'ai-conversation' }) || console;
  
  try {
    logger.info('Initializing AI Conversation Collection module');
    
    // Register the model
    ctx.models = ctx.models || {};
    ctx.models.AIConversation = AIConversation;
    
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
      aiConversation: resolvers
    };
    
    // Register helper method to get the type composer
    ctx.getAIConversationTC = () => typeComposers.AIConversationTC;
    
    // Initialize business logic actions
    const actions = initActions(ctx);
    ctx.actions = {
      ...(ctx.actions || {}),
      aiConversation: actions
    };
    
    // Initialize hooks for event handling
    await initHooks(ctx);
    
    // Initialize relations with other modules
    await initRelations(ctx);
    
    logger.info('AI Conversation Collection module initialized successfully');
    
    return ctx;
  } catch (error) {
    logger.error('Failed to initialize AI Conversation Collection module:', error);
    throw error;
  }
};

export const constants = {
  CONVERSATION_TYPES,
  INTERACTION_CATEGORIES,
  AI_MODELS,
  SENTIMENT_TYPES,
  INTERACTION_STATUSES,
  CONVERSATION_EVENTS
};

export const models = {
  AIConversation
};

export default {
  init,
  constants,
  models
}; 