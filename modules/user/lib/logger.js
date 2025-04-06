/**
 * User Module Logging Utilities
 * 
 * This module provides logging helpers specific to the user module.
 */

// Namespace for all user module logs
const USER_MODULE = 'user';

/**
 * Create a logger for a specific component within the user module
 * 
 * @param {Object} appLogger - The main application logger from context
 * @param {string} component - The component name (e.g., 'auth', 'model', 'resolver')
 * @returns {Object} - Component-specific logger
 */
export const createComponentLogger = (appLogger, component) => {
  // If no logger is provided, fall back to console
  const logger = appLogger || console;
  const prefix = `[${USER_MODULE}:${component}]`;
  
  return {
    info: (message, ...args) => logger.info(`${prefix} ${message}`, ...args),
    error: (message, ...args) => logger.error(`${prefix} ${message}`, ...args),
    warn: (message, ...args) => logger.warn(`${prefix} ${message}`, ...args),
    debug: (message, ...args) => logger.debug ? logger.debug(`${prefix} ${message}`, ...args) : logger.info(`${prefix} DEBUG: ${message}`, ...args),
    // Method to time an operation
    time: async (label, operation) => {
      const start = Date.now();
      try {
        const result = await operation();
        const duration = Date.now() - start;
        logger.info(`${prefix} ${label} completed in ${duration}ms`);
        return result;
      } catch (error) {
        const duration = Date.now() - start;
        logger.error(`${prefix} ${label} failed after ${duration}ms: ${error.message}`);
        throw error;
      }
    }
  };
};

/**
 * Create loggers for all common components in the user module
 * 
 * @param {Object} appLogger - The main application logger from context
 * @returns {Object} - Object containing loggers for various components
 */
export const createUserLoggers = (appLogger) => {
  return {
    auth: createComponentLogger(appLogger, 'auth'),
    model: createComponentLogger(appLogger, 'model'),
    resolver: createComponentLogger(appLogger, 'resolver'),
    typeComposer: createComponentLogger(appLogger, 'typeComposer'),
    registry: createComponentLogger(appLogger, 'registry'),
    action: createComponentLogger(appLogger, 'action'),
    validation: createComponentLogger(appLogger, 'validation'),
  };
};

/**
 * Create a higher-order function that adds logging to any function
 * 
 * @param {Object} logger - Logger to use
 * @param {string} operationName - Name of the operation for logging
 * @param {Object} options - Options for logging
 * @returns {Function} - Function that wraps another function with logging
 */
export const withLogging = (logger, operationName, options = {}) => {
  return (fn) => {
    return async (...args) => {
      const start = Date.now();
      
      try {
        // Log the operation start
        if (options.logArgs) {
          logger.debug(`Starting ${operationName}`, args);
        } else {
          logger.debug(`Starting ${operationName}`);
        }
        
        // Execute the function
        const result = await fn(...args);
        
        // Log the operation completion
        const duration = Date.now() - start;
        logger.info(`Completed ${operationName} in ${duration}ms`);
        
        // Optionally log the result
        if (options.logResult) {
          logger.debug(`${operationName} result:`, result);
        }
        
        return result;
      } catch (error) {
        // Log the error
        const duration = Date.now() - start;
        logger.error(`Error in ${operationName} after ${duration}ms: ${error.message}`);
        
        // Rethrow or handle based on options
        if (options.swallowErrors) {
          return options.defaultValue;
        }
        throw error;
      }
    };
  };
}; 