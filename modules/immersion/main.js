import { Immersion } from './schemas.js';
import { initTypeComposers } from './registry.js';
import { initRelations } from './relations/index.js';
import { initHooks } from './hooks/index.js';
import { initActions } from './actions/index.js';

/**
 * Initialize the Immersion module
 * @param {Object} ctx - Application context
 * @returns {Object} - Updated context with Immersion module
 */
export const init = async (ctx) => {
  const { logger } = ctx;
  const moduleLogger = logger.child({ module: 'immersion' });
  
  try {
    moduleLogger.info('Initializing Immersion module');
    
    // Register the Immersion model
    if (!ctx.models) {
      ctx.models = {};
    }
    
    ctx.models.Immersion = Immersion;
    moduleLogger.debug('Registered Immersion model');
    
    // Initialize GraphQL type composers
    initTypeComposers();
    moduleLogger.debug('Initialized GraphQL type composers');
    
    // Initialize relations with other modules
    initRelations(ctx);
    moduleLogger.debug('Initialized relations');
    
    // Initialize hooks and event listeners
    initHooks(ctx);
    moduleLogger.debug('Initialized hooks and event listeners');
    
    // Initialize actions (business logic)
    const immersionActions = initActions(ctx);
    
    // Register module actions
    if (!ctx.actions) {
      ctx.actions = {};
    }
    
    ctx.actions.immersion = immersionActions;
    moduleLogger.debug('Registered Immersion actions');
    
    // Register module info
    if (!ctx.modules) {
      ctx.modules = [];
    }
    
    ctx.modules.push({
      name: 'immersion',
      version: '1.0.0',
      description: 'AI-led immersive experiences for personal growth and manifestation'
    });
    
    moduleLogger.info('Immersion module initialized successfully');
    return ctx;
  } catch (error) {
    moduleLogger.error(`Failed to initialize Immersion module: ${error.message}`, { error });
    throw error;
  }
};

export default { init }; 