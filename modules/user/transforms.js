/**
 * Transformation functions for TypeComposers
 * 
 * These functions follow functional programming principles:
 * - They are curried
 * - They are pure (don't modify inputs)
 * - They are composable
 */

import { TCRegistry } from './registry.js';
import { curry } from './lib/helpers.js';
import { requireAuth, requireRole } from './lib/auth.js';
import { createComponentLogger } from './lib/logger.js';
import { withCache, withPagination, withValidation } from './lib/tcTransforms.js';

/**
 * Higher-order function to add a resolver to a TypeComposer
 * @param {string} name - Name of the resolver
 * @param {Object} resolverConfig - Configuration for the resolver
 * @returns {Function} - Function that adds the resolver to a TypeComposer
 */
export const addResolver = (name, resolverConfig) => (tc) => {
  tc.addResolver(resolverConfig);
  return tc;
};

/**
 * Higher-order function to add a field to a TypeComposer
 * @param {string} fieldName - Name of the field
 * @param {Object|string} fieldConfig - Configuration for the field
 * @returns {Function} - Function that adds the field to a TypeComposer
 */
export const addField = (fieldName, fieldConfig) => (tc) => {
  tc.addFields({ [fieldName]: fieldConfig });
  return tc;
};

/**
 * Higher-order function to add relation to a TypeComposer
 * @param {string} fieldName - Name of the relation field
 * @param {Object} relationConfig - Configuration for the relation
 * @returns {Function} - Function that adds the relation to a TypeComposer
 */
export const addRelation = (fieldName, relationConfig) => (tc) => {
  tc.addRelation(fieldName, relationConfig);
  return tc;
};

/**
 * Apply all transformations to the UserTC
 * @param {Object} ctx - The context object
 * @param {Object} config - The transforms configuration
 * @returns {void}
 */
export const applyUserTransforms = (ctx, config = {}) => {
  try {
    // Create logger for transformations
    const logger = ctx?.logger 
      ? createComponentLogger(ctx.logger, 'transform')
      : console;
    
    // Get transform settings from config if available
    const transformOptions = config?.transformOptions || {};
    const resolverTransforms = config?.resolverTransforms || {};
    
    // Log configuration being used
    logger.debug('Applying transforms with config:', 
      JSON.stringify({
        cache: transformOptions?.cache || { ttl: 30000 },
        pagination: transformOptions?.pagination || { defaultPerPage: 10 }
      })
    );
    
    // Direct function to apply transformations without using the lib version
    const applyTransformsToTC = (tcName, ...transforms) => {
      try {
        logger.debug(`Applying transforms to ${tcName}`);
        
        if (!TCRegistry.isInitialized()) {
          logger.warn(`Registry not initialized when applying transforms to ${tcName}`);
          return; // Early return if registry not initialized
        }
        
        // Get the TypeComposer from the registry
        const tc = TCRegistry.get(tcName);
        
        // Apply each transform in sequence
        let transformed = tc;
        transforms.forEach((transform, index) => {
          try {
            logger.debug(`Applying transform #${index + 1} to ${tcName}`);
            transformed = transform(transformed);
          } catch (transformError) {
            logger.error(`Error applying transform #${index + 1} to ${tcName}:`, transformError);
          }
        });
        
        // Update the TypeComposer in the registry
        TCRegistry.register(tcName, transformed);
        logger.debug(`Successfully applied transforms to ${tcName}`);
      } catch (error) {
        logger.error(`Error in applyTransforms for ${tcName}:`, error);
      }
    };
    
    // Skip transforms if registry not initialized
    if (!TCRegistry.isInitialized()) {
      logger.warn('Skipping transforms because registry is not initialized');
      return;
    }
    
    // Apply transformations to UserTC
    applyTransformsToTC('UserTC',
      // Add 'me' resolver
      addResolver('me', {
        name: 'me',
        type: () => TCRegistry.get('UserTC'),
        resolve: requireAuth(async (source, args, context) => {
          return context.user;
        }),
      }),
      
      // Add 'search' resolver with pagination
      addResolver('search', {
        name: 'search',
        type: [TCRegistry.get('UserTC')],
        args: {
          query: 'String!',
        },
        resolve: requireAuth(async (source, args, context) => {
          const { User } = context.models;
          return User.find({
            $or: [
              { name: { $regex: args.query, $options: 'i' } },
              { email: { $regex: args.query, $options: 'i' } },
            ],
          });
        }),
      }),
      
      // Add pagination to search resolver using config if available
      withPagination(
        transformOptions?.pagination || { defaultPerPage: 10 }, 
        'search'
      ),
      
      // Add caching to search resolver using config if available
      withCache(
        transformOptions?.cache || { ttl: 30000 }, 
        'search'
      ),
      
      // Add admin-only resolver for finding users by ID
      addResolver('findById', {
        name: 'findById',
        type: TCRegistry.get('UserTC'),
        args: {
          id: 'ID!',
        },
        resolve: requireRole('ADMIN')(async (source, args, context) => {
          const { User } = context.models;
          return User.findById(args.id);
        }),
      })
    );
    
    logger.info('Applied transformations to UserTC successfully');
  } catch (error) {
    const logger = ctx?.logger || console;
    logger.error('Error applying transforms to UserTC:', error);
    // Don't throw to allow initialization to continue
  }
}; 