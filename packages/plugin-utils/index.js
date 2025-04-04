// index.js placeholder
import { ApolloServerPlugin } from '@apollo/server'; // Base type
import { createForbiddenError } from '@apolloos/error-utils';

/**
 * Example Apollo Server 4 Plugin Factory: Logs basic request lifecycle events.
 * Demonstrates accessing the ApolloOS context (ctx) within a plugin.
 * @param {object} [options={}] - Optional configuration for the plugin.
 * @param {object} options.logger - A logger instance (defaults to console).
 * @returns {ApolloServerPlugin}
 */
export const createBasicLoggerPlugin = (options = {}) => {
  const logger = options.logger || console;

  return {
    // Fires whenever a GraphQL request is received from a client.
    async requestDidStart(requestContext) {
      const startTime = Date.now();
      // Access ApolloOS context if passed during server setup
      const apolloosContext = requestContext.contextValue;
      const operationName = requestContext.request.operationName || 'anonymous';
      
      logger.info(`[Plugin:Logger] Request started! Operation: ${operationName}`, {
        query: requestContext.request.query?.substring(0, 100) + '...', // Log truncated query
        variables: requestContext.request.variables,
        userId: apolloosContext?.user?.id, // Example: Log user ID from context
      });

      return {
        // Fires whenever Apollo Server will parse a GraphQL
        // request to create its associated document AST.
        async parsingDidStart(requestContext) {
          logger.debug(`[Plugin:Logger] Parsing started! Operation: ${operationName}`);
        },

        // Fires whenever Apollo Server will validate a request's
        // document AST against your GraphQL schema.
        async validationDidStart(requestContext) {
          logger.debug(`[Plugin:Logger] Validation started! Operation: ${operationName}`);
        },
        
        // Fires before Apollo Server executes the GraphQL query.
        // Useful for adding context or performing checks.
        async didResolveSource(requestContext) {
             logger.debug(`[Plugin:Logger] Source resolved. Operation: ${operationName}`);
        },
        
        // Fires before field resolvers run
        async executionDidStart(requestContext) {
             logger.debug(`[Plugin:Logger] Execution started. Operation: ${operationName}`);
        },

        // Fires when the execution process encounters errors.
        async didEncounterErrors(requestContext) {
            logger.error(`[Plugin:Logger] Error during request! Operation: ${operationName}`, {
                errors: requestContext.errors.map(e => ({ message: e.message, code: e.extensions?.code })),
            });
        },

        // Fires whenever Apollo Server is about to send a response for a GraphQL operation.
        async willSendResponse(requestContext) {
          const duration = Date.now() - startTime;
          logger.info(`[Plugin:Logger] Request finished. Operation: ${operationName}. Duration: ${duration}ms`);
        },
      };
    },
  };
};

/**
 * Example Plugin: Enforces a simple IP-based block.
 * Demonstrates modifying context or throwing errors early in the request lifecycle.
 * @param {object} [options={}] 
 * @param {string[]} options.blockedIPs - Array of IP addresses to block.
 * @returns {ApolloServerPlugin}
 */
export const createIPBlockerPlugin = (options = {}) => {
    const blockedIPs = options.blockedIPs || [];
    
    return {
        async requestDidStart(requestContext) {
            const clientIP = requestContext.contextValue?.req?.ip; // Assuming Express context
            if (clientIP && blockedIPs.includes(clientIP)) {
                console.warn(`[Plugin:IPBlocker] Blocked request from IP: ${clientIP}`);
                // Throw an Apollo-compatible error
                throw createForbiddenError('Access denied from your IP address.');
            }
        },
    };
};


// --- Add more plugin utilities or factories below ---
// E.g., tracing plugins, metrics collectors, custom auth plugins