// core/ModuleComposer.js
import { schemaComposer } from 'graphql-compose';
import { GraphQLScalarType } from 'graphql';
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
    try {
      Object.entries(ctx.graphqlConfig.customScalars).forEach(([name, scalar]) => {
        // Check if scalar is a GraphQLScalarType
        if (scalar instanceof GraphQLScalarType) {
          ctx.logger?.debug(`[ModuleComposer] Adding scalar: ${name}`);
          schemaComposer.createScalarTC(scalar);
        } else {
          ctx.logger?.warn(`[ModuleComposer] Invalid scalar ${name} - not a GraphQLScalarType`);
        }
      });
    } catch (err) {
      ctx.logger?.warn(`[ModuleComposer] Error adding custom scalars: ${err.message}. Continuing without custom scalars.`);
    }
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

  // Process resolvers from all modules and add them to the schema
  ctx.logger?.debug('[ModuleComposer] Processing module resolvers...');
  const rootQueries = {};
  const rootMutations = {};

  // Collect and merge all module resolvers
  for (const mod of modules) {
    const moduleResolvers = graphqlRegistry.resolvers[mod.id];
    if (!moduleResolvers) {
      console.log(`[ModuleComposer] No resolvers found for module ${mod.id}. Has resolvers: ${!!mod.resolvers}`);
      if (mod.resolvers) {
        console.log(`[ModuleComposer] Module ${mod.id} resolver keys:`, Object.keys(mod.resolvers));
      }
      continue;
    }

    // Add module queries to the root Query type
    if (moduleResolvers.Query) {
      console.log(`[ModuleComposer] Found queries in module ${mod.id}:`, Object.keys(moduleResolvers.Query));
      Object.assign(rootQueries, moduleResolvers.Query);
    } else {
      console.log(`[ModuleComposer] No queries found in module ${mod.id}`);
    }

    // Add module mutations to the root Mutation type
    if (moduleResolvers.Mutation) {
      console.log(`[ModuleComposer] Found mutations in module ${mod.id}:`, Object.keys(moduleResolvers.Mutation));
      Object.assign(rootMutations, moduleResolvers.Mutation);
    } else {
      console.log(`[ModuleComposer] No mutations found in module ${mod.id}`);
    }
  }

  // Add all collected queries to the schema
  if (Object.keys(rootQueries).length > 0) {
    ctx.logger?.debug(`[ModuleComposer] Adding ${Object.keys(rootQueries).length} queries to schema`);
    schemaComposer.Query.addFields(rootQueries);
  }

  // Add all collected mutations to the schema
  if (Object.keys(rootMutations).length > 0) {
    ctx.logger?.debug(`[ModuleComposer] Adding ${Object.keys(rootMutations).length} mutations to schema`);
    if (!schemaComposer.Mutation) {
      schemaComposer.createObjectTC({
        name: 'Mutation',
        fields: rootMutations
      });
    } else {
      schemaComposer.Mutation.addFields(rootMutations);
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
     try {
       // Instead of using instanceof with getOTC, which requires a type name,
       // check if the type has the setField method which is common to ObjectTypeComposers
       schemaComposer.forEach((tc, typeName) => {
          if (tc && typeof tc.setField === 'function') {
            ctx.logger?.debug(`[ModuleComposer] Applying timestamps to type: ${typeName}`);
            ctx.graphqlConfig.withTimestamps(tc);
          }
       });
     } catch (err) {
       ctx.logger?.warn(`[ModuleComposer] Error applying timestamps to types: ${err.message}. Continuing without timestamps.`);
     }
  }

  // Get the size as either a property or method
  const schemaSize = typeof schemaComposer.size === 'function' 
    ? schemaComposer.size() 
    : (typeof schemaComposer.size === 'number' ? schemaComposer.size : 'unknown');

  ctx.logger?.info(`[ModuleComposer] Schema composition complete. Found ${schemaSize} types.`);

  // Ensure at least a minimal Query type exists
  if (!schemaComposer.Query) {
    ctx.logger?.warn('[ModuleComposer] No Query type found in schema. Adding a minimal Query type for development.');
    // Create the Query type first
    schemaComposer.createObjectTC({
      name: 'Query',
      fields: {
        _devHello: {
          type: 'String',
          resolve: () => 'Hello from ApolloOS in development mode!'
        }
      }
    });
  } else if (Object.keys(schemaComposer.Query.getFields()).length === 0) {
    ctx.logger?.warn('[ModuleComposer] Query type has no fields. Adding a minimal field for development.');
    schemaComposer.Query.addFields({
      _devHello: {
        type: 'String',
        resolve: () => 'Hello from ApolloOS in development mode!'
      }
    });
  }

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
/*
import { composeSchema } from './core/ModuleComposer.js';
import { createContext } from './core/context/createContext.js';

const ctx = await createContext();
*/
