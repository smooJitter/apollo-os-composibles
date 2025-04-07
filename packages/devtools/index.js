// index.js placeholder
import { printSchema } from 'graphql';

/**
 * Extracts metadata from all loaded modules.
 * Requires the App instance to be available on the context.
 * @param {object} ctx - The ApolloOS application context.
 * @returns {Array<object>} An array of module metadata.
 */
export function inspectModules(ctx) {
  if (!ctx.app?.getModules) {
    console.warn(
      '[devtools] Cannot inspect modules: App instance not found or invalid on context.'
    );
    return [];
  }
  const modules = ctx.app.getModules(); // Gets the module definition objects
  return modules.map((mod) => ({
    id: mod.id,
    meta: mod.meta || {},
    hasOnLoad: typeof mod.onLoad === 'function',
    hasInit: typeof mod.init === 'function',
    hasRelations: typeof mod.relations === 'function',
    hasHooks: typeof mod.hooks === 'function',
    // Check for registered assets (may require access to registry or assumes mod holds them)
    hasModels: !!mod.models || !!ctx.app.getModule(mod.id)?.models,
    hasTypeComposers: !!mod.typeComposers || !!ctx.app.getModule(mod.id)?.typeComposers,
    hasResolvers: !!mod.resolvers || !!ctx.app.getModule(mod.id)?.resolvers,
    hasServices: !!mod.services || !!ctx.app.getModule(mod.id)?.services,
    hasActions: !!mod.actions || !!ctx.app.getModule(mod.id)?.actions,
    hasValidators: !!mod.validators || !!ctx.app.getModule(mod.id)?.validators,
  }));
}

/**
 * Generates a map of all registered TypeComposers and their fields/resolvers.
 * Requires the GraphQL registry to be populated on the context (usually by ModuleComposer).
 * @param {object} ctx - The ApolloOS application context.
 * @returns {object} An object mapping TC names to their details.
 */
export function inspectTypeComposers(ctx) {
  if (!ctx.graphqlRegistry?.typeComposers) {
    console.warn(
      '[devtools] Cannot inspect TypeComposers: ctx.graphqlRegistry.typeComposers not found.'
    );
    return {};
  }
  const registry = ctx.graphqlRegistry.typeComposers;
  return Object.entries(registry).reduce((acc, [name, tc]) => {
    try {
      acc[name] = {
        typeName: tc.getTypeName(),
        fields: tc.getFieldNames(),
        resolvers: tc.getResolvers ? Array.from(tc.getResolvers().keys()) : [], // getResolvers returns a Map
        // Add more details as needed (e.g., relations, interfaces)
      };
    } catch (err) {
      console.error(`[devtools] Error inspecting TypeComposer '${name}':`, err);
      acc[name] = { error: 'Failed to inspect' };
    }
    return acc;
  }, {});
}

/**
 * Prints the composed GraphQL schema to the console or returns it as a string.
 * Requires the composed schema to be available (e.g., after ModuleComposer runs).
 * @param {GraphQLSchema} schema - The composed GraphQL schema object.
 * @param {boolean} [logToConsole=true] - Whether to print the schema to the console.
 * @returns {string} The schema definition language (SDL) string.
 */
export function printComposedSchema(schema, logToConsole = true) {
  if (!schema) {
    console.error('[devtools] Cannot print schema: Schema object is missing.');
    return '';
  }
  try {
    const sdl = printSchema(schema);
    if (logToConsole) {
      console.log('\n----- Composed GraphQL Schema -----\n');
      console.log(sdl);
      console.log('\n-----------------------------------\n');
    }
    return sdl;
  } catch (err) {
    console.error('[devtools] Error printing schema:', err);
    return '';
  }
}

/**
 * Simple utility to display the structure of the context object.
 * @param {object} ctx - The ApolloOS context.
 */
export function inspectContext(ctx) {
  console.log('\n----- ApolloOS Context Inspection -----');
  const inspectObj = {};
  for (const key in ctx) {
    if (Object.hasOwnProperty.call(ctx, key)) {
      const value = ctx[key];
      if (typeof value === 'function') {
        inspectObj[key] = `[Function: ${value.name || 'anonymous'}]`;
      } else if (typeof value === 'object' && value !== null) {
        // Avoid logging potentially large objects like the app or mongoose instance deeply
        if (key === 'app' || key === 'mongoose' || key === 'req') {
          inspectObj[key] =
            `[Object: ${value.constructor?.name || 'Object'}] (Keys: ${Object.keys(value).slice(0, 5).join(', ')}...)`;
        } else {
          inspectObj[key] =
            `[Object: ${value.constructor?.name || 'Object'}] (Keys: ${Object.keys(value).join(', ')})`;
        }
      } else {
        inspectObj[key] = value;
      }
    }
  }
  console.log(inspectObj);
  console.log('-------------------------------------\n');
}

// Add more devtools as needed, e.g., performance timers, dependency graph visualizer
