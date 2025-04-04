// core/ModuleComposer.js
import { schemaComposer } from 'graphql-compose';
// We might not need Ramda here unless doing complex functional composition on the results
// import * as R from 'ramda';

/**
 * Compose all module typeComposers and relations into a single GraphQL schema.
 * Also builds ctx.graphqlRegistry for devtools and module access.
 */
export function composeSchema(ctx) {
  if (!ctx.app || typeof ctx.app.getModules !== 'function') {
    throw new Error('[ModuleComposer] App instance with getModules() not found in context.');
  }

  const modules = ctx.app.getModules();

  // GraphQL Registry for introspection / devtools
  const graphqlRegistry = {
    typeComposers: {},
    resolvers: {},
    // Add other categories like inputs, interfaces if needed
  };
  ctx.graphqlRegistry = graphqlRegistry;

  // Reset schemaComposer for fresh composition (important if called multiple times)
  schemaComposer.clear();

  // Add custom scalars from config
  if (ctx.graphqlConfig?.customScalars) {
    Object.entries(ctx.graphqlConfig.customScalars).forEach(([name, scalar]) => {
      schemaComposer.addScalar(scalar);
    });
  }

  // Register all module typeComposers
  for (const mod of modules) {
    if (mod.typeComposers) {
      for (const [name, TC] of Object.entries(mod.typeComposers)) {
        if (!schemaComposer.has(name)) { // Avoid overwriting if names clash, first one wins
           schemaComposer.set(name, TC);
           graphqlRegistry.typeComposers[name] = TC;
           ctx.logger?.debug(`[ModuleComposer] Registered TC: ${name} from module ${mod.id}`);
        } else {
           ctx.logger?.warn(`[ModuleComposer] TypeComposer name clash: ${name} already registered. Skipping from module ${mod.id}.`);
        }
      }
    }
    // Register module resolvers into the registry (they aren't directly added to schemaComposer here)
    if (mod.resolvers) {
      graphqlRegistry.resolvers[mod.id] = mod.resolvers;
    }
  }

  // Register module-level relations
  for (const mod of modules) {
    if (typeof mod.relations === 'function') {
      try {
        mod.relations(ctx, modules); // Pass modules for cross-module lookups
        ctx.logger?.debug(`[ModuleComposer] Executed relations for module ${mod.id}`);
      } catch (err) { 
        ctx.logger?.error(`[ModuleComposer] Error executing relations for module ${mod.id}:`, err);
      }
    }
  }

  // Register any global relations or extensions from config
  if (ctx.graphqlConfig?.registerGlobalRelations) {
    try {
      ctx.graphqlConfig.registerGlobalRelations({ schemaComposer, ctx });
      ctx.logger?.debug(`[ModuleComposer] Executed global relations.`);
    } catch (err) {
      ctx.logger?.error(`[ModuleComposer] Error executing global relations:`, err);
    }
  }
  
  // Apply global type wrappers (like adding timestamps)
  if (ctx.graphqlConfig?.withTimestamps) { // Example check
     schemaComposer.forEach((tc) => {
        if (tc instanceof schemaComposer.getOTC().constructor) { // Check if it's an ObjectTypeComposer
            ctx.graphqlConfig.withTimestamps(tc); 
        }
     });
  }

  ctx.logger?.info(`[ModuleComposer] Schema composition complete. Found ${schemaComposer.size()} types.`);

  // Build and return the final schema
  try {
    return schemaComposer.buildSchema();
  } catch (err) {
    ctx.logger?.error('[ModuleComposer] Error building final schema:', err);
    throw err; // Re-throw critical error
  }
}

// *
// Example usage: 
import { composeSchema } from './core/ModuleComposer.js';
import { createContext } from './core/context/createContext.js';

const ctx = await createContext();
