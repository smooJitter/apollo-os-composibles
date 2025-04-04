// core/ModuleLoader.js
import * as R from 'ramda';
import S from 'sanctuary';

/**
 * Normalize a module export (function or object) into a consistent object format.
 * If it's a function, it's called with ctx to get the module object.
 * @param {Function|Object} moduleExport - The exported module.
 * @param {Object} ctx - The application context.
 * @returns {Object} The normalized module object.
 */
const normalizeModule = (moduleExport, ctx) => {
  // Check if it's a function using Sanctuary for type safety
  return S.is(Function)(moduleExport)
    ? moduleExport(ctx) // If function, call it with context
    : moduleExport;    // Otherwise, assume it's already the module object
};

/**
 * Validate the structure of a normalized module object.
 * Ensures it has a valid string `id`.
 * @param {Object} mod - The normalized module object.
 * @returns {Boolean} True if the module structure is valid.
 */
const isValidModule = (mod) =>
  S.is(Object)(mod) &&                 // Must be an object
  typeof mod.id === 'string' &&        // Must have an id property that is a string
  mod.id.length > 0;                 // The id string must not be empty

/**
 * ApolloOS Module Loader: Normalizes, validates, and registers a single module.
 * Handles both headless function exports and direct object exports.
 * Ensures the module is registered with the App instance in the context.
 * @param {Object} ctx - The application context (must contain ctx.app).
 * @param {Function|Object} moduleExport - The module export to load.
 * @returns {Object} The loaded and validated module object.
 * @throws {Error} If ctx.app is missing, module export is invalid, or module validation fails.
 */
export function loadModule(ctx, moduleExport) {
  if (!ctx.app) {
    throw new Error('[loadModule] Context object (ctx) must contain an initialized App instance (ctx.app).');
  }
  if (!moduleExport) {
      throw new Error('[loadModule] Invalid module export provided (null or undefined).');
  }

  let mod;
  try {
      mod = normalizeModule(moduleExport, ctx);
  } catch (err) {
      ctx.logger?.error(`[loadModule] Error normalizing module export:`, err);
      throw new Error(`[loadModule] Failed to normalize module export. Original error: ${err.message}`);
  }

  if (!isValidModule(mod)) {
    // Attempt to get a name for better error logging
    const exportName = typeof moduleExport === 'function' ? (moduleExport.name || '(anonymous function)') : '(object export)';
    ctx.logger?.error(`[loadModule] Invalid module structure for export: ${exportName}. Received:`, mod);
    throw new Error(`[ApolloOS] Invalid module structure: Module must return an object with a valid string 'id'. Received: ${JSON.stringify(mod)}`);
  }

  // Use the App's load method which handles the actual registration and onLoad call
  try {
      ctx.app.load(() => mod); // Pass a function that returns the already-normalized module
      ctx.logger?.debug(`[loadModule] Module successfully loaded and passed to app: ${mod.id}`);
  } catch(err) {
      ctx.logger?.error(`[loadModule] Error during app.load for module ${mod.id}:`, err);
      throw err; // Re-throw error from app.load
  }

  return mod;
}

/**
 * Batch loads multiple modules using the loadModule function.
 * @param {Object} ctx - The application context.
 * @param {Array<Function|Object>} modulesToLoad - An array of module exports.
 * @returns {Array<Object>} An array of the loaded and validated module objects.
 */
export function composeModules(ctx, modulesToLoad = []) {
   ctx.logger?.info(`[composeModules] Starting batch load for ${modulesToLoad.length} modules.`);
   const loadedModules = modulesToLoad.map((moduleExport, index) => {
       try {
           return loadModule(ctx, moduleExport);
       } catch (err) {
           ctx.logger?.error(`[composeModules] Failed to load module at index ${index}:`, err);
           // Decide whether to stop all loading or just skip the failed module
           // Option 1: Stop all loading
           throw new Error(`Failed to load module at index ${index}. Aborting batch load. Error: ${err.message}`);
           // Option 2: Skip and continue (return null or filter later)
           // return null; 
       }
   });
   // Option 2 continued: Filter out failed modules if skipping
   // const successfulModules = loadedModules.filter(mod => mod !== null);
   // ctx.logger?.info(`[composeModules] Successfully loaded ${successfulModules.length} out of ${modulesToLoad.length} modules.`);
   // return successfulModules;
   
   ctx.logger?.info(`[composeModules] Successfully loaded all ${loadedModules.length} modules.`);
   return loadedModules; // Return all if Option 1 (throw on error) is chosen
}


// *
// Example usage: 
import { App } from './core/App.js';
import { composeModules } from './core/ModuleLoader.js';
import { createContext } from './core/context/createContext.js';

const ctx = await createContext();
const app = new App(ctx);
ctx.app = app;

composeModules(ctx, [
  () => import('./modules/user/index.js').then(mod => mod.default),
  () => import('./modules/profile/index.js').then(mod => mod.default)
]);