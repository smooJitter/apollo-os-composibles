/**
 * TypeComposer Transformation Utilities
 * 
 * Advanced transformation functions for TypeComposers following functional
 * programming patterns.
 */
import { curry } from './helpers.js';

/**
 * Add pagination to a TypeComposer's resolver
 * 
 * @param {Object} options - Pagination options
 * @param {string} resolverName - Name of the resolver to add pagination to
 * @param {Object} tc - TypeComposer to transform
 * @returns {Object} - The modified TypeComposer
 */
export const withPagination = curry((options, resolverName, tc) => {
  if (!tc.hasResolver(resolverName)) {
    throw new Error(`Resolver '${resolverName}' not found on TypeComposer '${tc.getTypeName()}'`);
  }
  
  const resolver = tc.getResolver(resolverName);
  resolver.setArgs({
    ...resolver.getArgs(),
    page: {
      type: 'Int',
      defaultValue: 1,
      description: 'Page number to return, starting from 1',
    },
    perPage: {
      type: 'Int', 
      defaultValue: options.defaultPerPage || 10,
      description: 'Number of items per page',
    },
  });
  
  const origResolve = resolver.resolve;
  resolver.setResolve(async (resolveParams) => {
    const { args } = resolveParams;
    const { page, perPage, ...restArgs } = args;
    
    // Add pagination constraints
    resolveParams.args = {
      ...restArgs,
      skip: (page - 1) * perPage,
      limit: perPage,
    };
    
    return origResolve(resolveParams);
  });
  
  return tc;
});

/**
 * Add caching to a TypeComposer's resolver
 * 
 * @param {Object} options - Caching options
 * @param {string} resolverName - Name of the resolver to add caching to
 * @param {Object} tc - TypeComposer to transform
 * @returns {Object} - The modified TypeComposer
 */
export const withCache = curry((options, resolverName, tc) => {
  if (!tc.hasResolver(resolverName)) {
    throw new Error(`Resolver '${resolverName}' not found on TypeComposer '${tc.getTypeName()}'`);
  }
  
  const resolver = tc.getResolver(resolverName);
  const origResolve = resolver.resolve;
  
  // Simple in-memory cache
  const cache = new Map();
  const ttl = options.ttl || 60000; // Default 1 minute TTL
  
  resolver.setResolve(async (resolveParams) => {
    const { args, context } = resolveParams;
    
    // Skip cache in certain conditions if specified
    if (options.skipCache && options.skipCache(context)) {
      return origResolve(resolveParams);
    }
    
    // Create a cache key from args
    const cacheKey = JSON.stringify(args);
    
    if (cache.has(cacheKey)) {
      const { timestamp, data } = cache.get(cacheKey);
      
      // Check if the cache entry is still valid
      if (Date.now() - timestamp < ttl) {
        return data;
      }
    }
    
    // Not in cache or expired, make the actual call
    const result = await origResolve(resolveParams);
    
    // Store in cache
    cache.set(cacheKey, {
      timestamp: Date.now(),
      data: result,
    });
    
    return result;
  });
  
  return tc;
});

/**
 * Add logging to a TypeComposer's resolver
 * 
 * @param {Object} options - Logging options
 * @param {string} resolverName - Name of the resolver to add logging to
 * @param {Object} tc - TypeComposer to transform
 * @returns {Object} - The modified TypeComposer
 */
export const withLogging = curry((options, resolverName, tc) => {
  if (!tc.hasResolver(resolverName)) {
    throw new Error(`Resolver '${resolverName}' not found on TypeComposer '${tc.getTypeName()}'`);
  }
  
  const resolver = tc.getResolver(resolverName);
  const origResolve = resolver.resolve;
  
  resolver.setResolve(async (resolveParams) => {
    const { args, context } = resolveParams;
    const logger = context.logger || console;
    const start = Date.now();
    
    try {
      // Log the resolver call
      if (options.logInput) {
        logger.info(`[${tc.getTypeName()}.${resolverName}] Called with:`, args);
      } else {
        logger.info(`[${tc.getTypeName()}.${resolverName}] Called`);
      }
      
      // Execute the original resolver
      const result = await origResolve(resolveParams);
      
      // Log the execution time
      const duration = Date.now() - start;
      logger.info(`[${tc.getTypeName()}.${resolverName}] Completed in ${duration}ms`);
      
      // Optionally log the result
      if (options.logResult) {
        logger.info(`[${tc.getTypeName()}.${resolverName}] Result:`, result);
      }
      
      return result;
    } catch (error) {
      // Log errors
      logger.error(`[${tc.getTypeName()}.${resolverName}] Error:`, error);
      throw error;
    }
  });
  
  return tc;
});

/**
 * Add validation to a TypeComposer's resolver using a schema validator like Joi
 * 
 * @param {Object} schema - Validation schema (e.g., Joi schema)
 * @param {string} resolverName - Name of the resolver to add validation to
 * @param {Object} tc - TypeComposer to transform
 * @returns {Object} - The modified TypeComposer
 */
export const withValidation = curry((schema, resolverName, tc) => {
  if (!tc.hasResolver(resolverName)) {
    throw new Error(`Resolver '${resolverName}' not found on TypeComposer '${tc.getTypeName()}'`);
  }
  
  const resolver = tc.getResolver(resolverName);
  const origResolve = resolver.resolve;
  
  resolver.setResolve(async (resolveParams) => {
    const { args } = resolveParams;
    
    // Validate the arguments
    try {
      // This assumes a Joi-like validate method
      // Adjust based on your actual validator
      const { error, value } = schema.validate(args);
      
      if (error) {
        throw new Error(`Validation error: ${error.message}`);
      }
      
      // Update args with validated values
      resolveParams.args = value;
    } catch (error) {
      if (!error.message.includes('Validation error')) {
        error.message = `Validation error: ${error.message}`;
      }
      throw error;
    }
    
    return origResolve(resolveParams);
  });
  
  return tc;
}); 