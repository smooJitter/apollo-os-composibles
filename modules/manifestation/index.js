import { pipe } from 'ramda';
import { Manifestation } from './schemas.js';
import { initTypeComposers } from './registry.js';
import { initResolvers } from './resolvers.js';
import { initRelations } from './relations/index.js';
import { STATE_ENUMS, TYPE_ENUMS, TIMEFRAME_ENUMS } from './constants.js';

// Define our module
const manifestationModule = (ctx) => {
  // Initialize logger for this module
  const logger = ctx.logger.child({ module: 'manifestation' });
  logger.info('Initializing manifestation module');

  // Apply context plugins if needed
  const contextWithPlugins = ctx;
  
  // Register models
  const models = { Manifestation };
  
  // Compose initialization functions
  const initializeModule = pipe(
    // Register type composers
    (context) => {
      logger.debug('Initializing type composers');
      return initTypeComposers(context);
    },
    
    // Initialize resolvers
    (context) => {
      logger.debug('Initializing resolvers');
      return initResolvers(context);
    },
    
    // Initialize relations with other models
    (context) => {
      logger.debug('Initializing relations');
      return initRelations(context);
    }
  );
  
  // Apply the initialization pipeline
  const enhancedContext = initializeModule(contextWithPlugins);
  
  // Return module metadata and lifecycle functions
  return {
    id: 'manifestation',
    name: 'Manifestation',
    description: 'Intention, vision, and manifestation management module',
    version: '1.0.0',
    
    // Module dependencies
    dependencies: ['core', 'habit', 'milestone', 'vision-board'],
    
    // Exposed models to other modules
    models,
    
    // Lifecycle methods
    initialize: async () => {
      logger.info('Manifestation module initialized');
      return true;
    },
    
    // Expose state management constants
    constants: {
      states: STATE_ENUMS,
      types: TYPE_ENUMS,
      timeframes: TIMEFRAME_ENUMS
    },
    
    // Module's context with type composers and other enhancements
    context: enhancedContext
  };
};

export default manifestationModule; 