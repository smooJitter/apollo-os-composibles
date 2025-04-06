/**
 * Registry Utilities
 * 
 * Helper functions for working with the registry pattern in a functional way.
 * This file avoids importing TCRegistry directly to prevent circular dependencies.
 */

// We'll use function injection to avoid circular dependencies
// Functions will take the TCRegistry as a parameter

/**
 * Apply multiple transformations to a TypeComposer in the registry
 * 
 * @param {Object} registry - The TypeComposer registry instance
 * @param {string} tcName - The name of the TypeComposer in the registry
 * @param {...Function} transforms - The transformation functions to apply
 * @returns {Object} - The modified TypeComposer
 */
export const applyTransformsWithRegistry = (registry, tcName, ...transforms) => {
  try {
    console.log(`[Registry] Applying transforms to ${tcName}, transforms count: ${transforms.length}`);
    
    if (!registry.isInitialized()) {
      console.warn(`Registry not initialized when applying transforms to ${tcName}`);
      return null;
    }
    
    // Get the TypeComposer from the registry
    const tc = registry.get(tcName);
    
    // Apply each transform in sequence
    let transformed = tc;
    transforms.forEach((transform, index) => {
      try {
        console.log(`[Registry] Applying transform #${index + 1} to ${tcName}`);
        transformed = transform(transformed);
      } catch (transformError) {
        console.error(`Error applying transform #${index + 1} to ${tcName}:`, transformError);
      }
    });
    
    // Update the TypeComposer in the registry
    registry.register(tcName, transformed);
    console.log(`[Registry] Successfully applied all transforms to ${tcName}`);
    return transformed;
  } catch (error) {
    console.error(`Error in applyTransforms for ${tcName}:`, error);
    return null;
  }
};

/**
 * Batch register multiple TypeComposers at once
 * 
 * @param {Object} registry - The TypeComposer registry instance
 * @param {Object} typeComposers - Object with TypeComposer name as key and instance as value
 * @returns {Object} - The registry object for chaining
 */
export const registerManyWithRegistry = (registry, typeComposers) => {
  try {
    Object.entries(typeComposers).forEach(([name, tc]) => {
      registry.register(name, tc);
    });
    return registry;
  } catch (error) {
    console.error('Error registering multiple TypeComposers:', error);
    return registry;
  }
};

/**
 * Get a TypeComposer from the registry safely
 * 
 * @param {Object} registry - The TypeComposer registry instance
 * @param {string} tcName - The name of the TypeComposer to retrieve
 * @param {Function} defaultCreator - Optional function to create the TC if it doesn't exist
 * @returns {Object|null} - The TypeComposer or null if not found
 */
export const safeGetTCWithRegistry = (registry, tcName, defaultCreator = null) => {
  try {
    // Try to get the TypeComposer from the registry
    return registry.get(tcName);
  } catch (error) {
    // If we have a creator function, use it to create the TC
    if (defaultCreator && typeof defaultCreator === 'function') {
      try {
        const tc = defaultCreator();
        registry.register(tcName, tc);
        return tc;
      } catch (creatorError) {
        console.error(`Error creating default TypeComposer ${tcName}:`, creatorError);
      }
    }
    console.error(`TypeComposer ${tcName} not found in registry:`, error.message);
    return null;
  }
};

/**
 * Check if a TypeComposer exists in the registry
 * 
 * @param {Object} registry - The TypeComposer registry instance
 * @param {string} tcName - The name of the TypeComposer to check
 * @returns {boolean} - True if the TypeComposer exists
 */
export const hasTCWithRegistry = (registry, tcName) => {
  try {
    registry.get(tcName);
    return true;
  } catch (error) {
    return false;
  }
};

// Compatibility functions that get the registry from the module exports
// Use these only when you're sure there won't be circular dependencies

/**
 * Apply multiple transformations to a TypeComposer in the registry
 * @deprecated Use applyTransformsWithRegistry instead
 */
export const applyTransforms = (tcName, ...transforms) => {
  try {
    // Dynamic import to avoid circular dependency
    const { TCRegistry } = require('../registry.js');
    return applyTransformsWithRegistry(TCRegistry, tcName, ...transforms);
  } catch (error) {
    console.error(`Failed to apply transforms: ${error.message}`);
    return null;
  }
};

/**
 * Apply a transform to multiple TypeComposers at once
 * 
 * @param {Function} transform - The transform function to apply
 * @param {Array<string>} typeNames - Names of TypeComposers to transform
 * @returns {Object} - The TCRegistry object for chaining
 */
export const batchTransform = (transform, typeNames) => {
  typeNames.forEach(name => {
    try {
      TCRegistry.transform(name, transform);
    } catch (error) {
      console.error(`Failed to transform ${name}:`, error.message);
    }
  });
  
  return TCRegistry;
};

/**
 * Create a conditional transform that only applies if a condition is met
 * 
 * @param {Function} condition - Function that returns true if transform should be applied
 * @param {Function} transform - The transform function to apply conditionally
 * @returns {Function} - Conditional transform function
 */
export const whenCondition = (condition, transform) => (tc) => {
  if (condition(tc)) {
    return transform(tc);
  }
  return tc;
}; 