// core/context/createContext.js
import path from 'path';
import { fileURLToPath } from 'url';
import * as R from 'ramda';
import S from 'sanctuary';

import * as Roles from '../../config/enums/roles.js';
import * as FP from '../../config/fp-core/index.js';
import * as Accessors from '../../config/fx/safeAccessors.js';
import * as Injectors from '../../config/fx/injectors.js';

import * as graphqlConfig from '../../config/graphql/index.js';
import * as sharedMongoose from '../../config/shared-mongoose/index.js';

import createConfigContext from '../../config/configContext.js';
// We will import App later when it's fully defined
// import { App } from '../App.js';

/**
 * Constructs the ApolloOS `ctx` object used by all modules, loaders, and systems.
 */
export async function createBaseContext() {
  const ctx = {};

  // Meta for internal traceability (e.g., __dirname)
  const __filename = fileURLToPath(import.meta.url);
  ctx.meta = {
    rootDir: path.resolve(path.dirname(__filename), '../../'),
    bootTime: Date.now(),
  };

  // Enums (roles, statuses, etc.)
  ctx.enums = {
    roles: Roles,
  };

  // Functional utilities
  ctx.fp = {
    ...FP,
    R,
    S,
  };

  // Utility accessors/injectors
  ctx.fx = {
    accessors: Accessors,
    injectors: Injectors,
  };

  // Shared Mongoose plugins, schemas, etc.
  ctx.sharedMongoose = sharedMongoose;

  // GraphQL config registry (typeMappers, scalars, relations)
  ctx.graphqlConfig = graphqlConfig;

  // Placeholder lifecycle registry (optional)
  ctx.lifecycleHooks = {
    init: [],
    ready: [],
    destroy: [],
  };

  return ctx;
}

// Store the app instance in a module-level variable
let globalAppInstance = null;

/**
 * Sets the global app instance to be used in contexts
 */
export function setGlobalAppInstance(appInstance) {
  globalAppInstance = appInstance;
}

/**
 * Assembles the final ApolloOS runtime context (ctx).
 * It combines the configuration context with runtime instances like the App.
 */
export async function createContext({ req } = {}) {
  // 1. Create the base configuration context
  const ctx = createConfigContext({ req });

  // 2. Add the app instance if available
  if (globalAppInstance) {
    ctx.app = globalAppInstance;
  }

  // 3. Add any other runtime-specific properties
  // For example, initializing a database connection pool if needed
  // await connectToDatabase(ctx.mongoose, ctx.config.db); // Example

  ctx.logger.info('[Core] Runtime context created.');

  return ctx;
}

export default createContext;
