/**
 * Library Exports for User Module
 * 
 * This file exports all utilities from the lib folder,
 * making them easily importable in other parts of the module.
 */

// Functional programming utilities
export * from './helpers.js';

// Promise utilities with Bluebird
export * from './promiseUtils.js';

// Authentication utilities
export * from './auth.js';

// Logging utilities
export * from './logger.js';

// Registry utilities
export * from './registry.js';

// TypeComposer transformation utilities
export * from './tcTransforms.js';

// Validation utilities
export * from './validators.js';

// Grouped exports for easier imports
import * as helpers from './helpers.js';
import * as promiseUtils from './promiseUtils.js';
import * as auth from './auth.js';
import * as logger from './logger.js';
import * as registry from './registry.js';
import * as tcTransforms from './tcTransforms.js';
import * as validators from './validators.js';

export const lib = {
  helpers,
  promiseUtils,
  auth,
  logger,
  registry,
  tcTransforms,
  validators
}; 