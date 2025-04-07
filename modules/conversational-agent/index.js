import { ConversationalAgent } from './schemas.js';
import { initTypeComposers } from './registry.js';
import { initResolvers } from './resolvers.js';
import { initActions } from './actions/index.js';
import { initHooks, AGENT_EVENTS } from './hooks/index.js';
import { initRelations } from './relations/index.js';
import {
  AGENT_TYPES,
  AGENT_CAPABILITIES,
  AGENT_ACTION_TYPES,
  AGENT_STATUSES,
  ACTION_STATUSES,
  AGENT_PERMISSIONS,
  PERSONALITY_TRAITS,
  AGENT_TYPE_ENUMS,
  AGENT_STATUS_ENUMS,
  ACTION_STATUS_ENUMS,
  AGENT_ACTION_TYPE_ENUMS,
  AGENT_PERMISSION_ENUMS,
  AGENT_CAPABILITY_ENUMS,
  PERSONALITY_TRAIT_ENUMS
} from './constants.js';

/**
 * Initialize the Conversational Agent module
 * @param {Object} context - The context object with shared utilities and services
 * @returns {Object} - The initialized module functionality
 */
export const initModule = (context = {}) => {
  const { logger = console } = context;
  
  try {
    logger.info('[Conversational Agent] Initializing module...');
    
    // Initialize GraphQL type composers
    const typeComposers = initTypeComposers();
    
    // Initialize GraphQL resolvers
    initResolvers(context);
    
    // Initialize business logic actions
    const actions = initActions(context);
    
    // Initialize event hooks
    initHooks(context);
    
    // Initialize entity relations
    const relations = initRelations(context);
    
    logger.info('[Conversational Agent] Module initialized successfully');
    
    return {
      name: 'conversational-agent',
      models: {
        ConversationalAgent
      },
      typeComposers,
      constants: {
        AGENT_TYPES,
        AGENT_CAPABILITIES,
        AGENT_ACTION_TYPES,
        AGENT_STATUSES,
        ACTION_STATUSES,
        AGENT_PERMISSIONS,
        PERSONALITY_TRAITS,
        AGENT_EVENTS
      },
      enums: {
        AGENT_TYPE_ENUMS,
        AGENT_STATUS_ENUMS,
        ACTION_STATUS_ENUMS,
        AGENT_ACTION_TYPE_ENUMS,
        AGENT_PERMISSION_ENUMS,
        AGENT_CAPABILITY_ENUMS,
        PERSONALITY_TRAIT_ENUMS
      },
      actions,
      relations
    };
  } catch (error) {
    logger.error('[Conversational Agent] Error initializing module:', error);
    throw error;
  }
};

export default {
  initModule
}; 