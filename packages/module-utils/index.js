// packages/module-utils/index.js
import { createError, APOLLO_ERROR_CODES } from '@apolloos/error-utils';

/**
 * Validates the basic structure of an ApolloOS module object after it has been
 * returned by the module's default export function.
 * Checks for required properties like 'id' and correct types for lifecycle methods.
 * 
 * @param {object} mod - The module object to validate.
 * @param {object} [options={}] - Validation options.
 * @param {boolean} [options.requireOnLoad=true] - Whether the onLoad function is strictly required.
 * @param {object} [options.logger=console] - Logger for warnings.
 * @returns {boolean} True if the module structure is valid according to basic checks.
 * @throws {ApolloosError} Throws an error if validation fails critically (e.g., missing ID).
 */
export function validateModuleStructure(mod, options = {}) {
  const { requireOnLoad = true, logger = console } = options;

  if (!mod || typeof mod !== 'object') {
    throw createError('Invalid module definition: Export did not return an object.', APOLLO_ERROR_CODES.INTERNAL_SERVER_ERROR, { received: mod });
  }

  if (!mod.id || typeof mod.id !== 'string' || mod.id.length === 0) {
    throw createError('Invalid module definition: Module object must have a non-empty string 'id'.', APOLLO_ERROR_CODES.INTERNAL_SERVER_ERROR, { receivedId: mod.id });
  }

  // Check required lifecycle methods
  if (requireOnLoad && typeof mod.onLoad !== 'function') {
      // Changed from throw to warn based on previous discussion allowing optional onLoad
      logger.warn(`[Module Validation] Module '${mod.id}': onLoad function is missing. Assets might need explicit registration.`);
      // throw createError(`Invalid module definition: Module '${mod.id}' must have an onLoad function.`, APOLLO_ERROR_CODES.INTERNAL_SERVER_ERROR);
  }

  // Check optional lifecycle methods type if they exist
  const lifecycleMethods = ['init', 'relations', 'hooks'];
  lifecycleMethods.forEach(methodName => {
    if (mod[methodName] !== undefined && typeof mod[methodName] !== 'function') {
      logger.warn(`[Module Validation] Module '${mod.id}': Optional lifecycle method '${methodName}' exists but is not a function.`);
      // Depending on strictness, you might throw an error here instead
      // throw createError(`Invalid module definition: Optional lifecycle method '${methodName}' in module '${mod.id}' must be a function if defined.`, APOLLO_ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  });

  // Check asset properties (expecting objects if they exist)
  const assetKeys = ['models', 'typeComposers', 'resolvers', 'services', 'actions', 'validators'];
  assetKeys.forEach(key => {
      if (mod[key] !== undefined && (typeof mod[key] !== 'object' || mod[key] === null || Array.isArray(mod[key]))) {
           logger.warn(`[Module Validation] Module '${mod.id}': Asset property '${key}' exists but is not a plain object.`);
           // throw createError(`Invalid module definition: Asset property '${key}' in module '${mod.id}' must be an object if defined.`, APOLLO_ERROR_CODES.INTERNAL_SERVER_ERROR);
      }
  });
  
  // Check meta if it exists
  if (mod.meta !== undefined && (typeof mod.meta !== 'object' || mod.meta === null)) {
       logger.warn(`[Module Validation] Module '${mod.id}': Optional property 'meta' exists but is not an object.`);
       // throw createError(`Invalid module definition: Optional property 'meta' in module '${mod.id}' must be an object if defined.`, APOLLO_ERROR_CODES.INTERNAL_SERVER_ERROR);
  }

  logger.debug(`[Module Validation] Module structure validated for: ${mod.id}`);
  return true; // Indicates basic structure is valid
}

/**
 * Creates a basic boilerplate object for an ApolloOS module.
 * Useful for scaffolding or as a starting point.
 * 
 * @param {string} id - The module ID.
 * @param {object} [initialAssets={}] - Initial assets (models, TCs, etc.).
 * @param {object} [initialMeta={}] - Initial meta information.
 * @param {object} [lifecycleOverrides={}] - Functions to override default lifecycle stubs.
 * @returns {Function} A headless function that returns the boilerplate module object.
 */
export const createModuleBoilerplate = (
    id,
    initialAssets = {},
    initialMeta = {},
    lifecycleOverrides = {}
) => {
  if (!id || typeof id !== 'string') {
    throw new Error('[createModuleBoilerplate] A valid string 'id' is required.');
  }

  return (ctx) => {
    // Default empty lifecycle functions
    const defaultLifecycle = {
        onLoad: function() {
            // Default onLoad registers any assets passed in initialAssets
            ctx.app.register({ id: this.id, ...initialAssets });
            ctx.logger?.debug(`[Module Boilerplate ${id}] Default onLoad executed.`);
        },
        init: function() { ctx.logger?.debug(`[Module Boilerplate ${id}] Default init executed.`); },
        relations: function() { ctx.logger?.debug(`[Module Boilerplate ${id}] Default relations executed.`); },
        hooks: function() { ctx.logger?.debug(`[Module Boilerplate ${id}] Default hooks executed.`); },
    };

    return {
      id: id,
      meta: {
        description: `Boilerplate module: ${id}`,
        version: '0.1.0',
        ...initialMeta,
      },
      // Spread initial assets
      ...initialAssets,
      // Spread lifecycle functions, allowing overrides
      ...defaultLifecycle,
      ...lifecycleOverrides,
    };
  };
};

// Add more module-specific utilities here if needed
