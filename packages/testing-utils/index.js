// index.js placeholder
import { schemaComposer } from 'graphql-compose';
import * as errorUtils from '@apolloos/error-utils';

// Basic mock logger
const mockLogger = {
  info: (...args) => console.log('[Test Logger INFO]:', ...args),
  warn: (...args) => console.warn('[Test Logger WARN]:', ...args),
  error: (...args) => console.error('[Test Logger ERROR]:', ...args),
  debug: (...args) => console.log('[Test Logger DEBUG]:', ...args),
};

/**
 * Creates a mock ApolloOS context object for testing.
 * @param {object} [overrides={}] - Properties to override in the default mock context.
 * @param {object} [appOverrides={}] - Properties/methods to override on the mock app instance.
 * @returns {object} A mock context object.
 */
export const createMockContext = (overrides = {}, appOverrides = {}) => {
  // Mock the App instance methods used during module loading/interaction
  const mockApp = {
    registry: {},
    modules: [],
    load: function (moduleFn) {
      const mod = moduleFn(this.ctx); // Pass the context being created
      if (!mod || !mod.id) throw new Error('Mock App: Module missing ID');
      mod.onLoad?.(); // Simulate calling onLoad
      this.modules.push(mod);
      this.registry[mod.id] = { ...(this.registry[mod.id] || {}), ...mod }; // Simple registration
      return this;
    },
    register: function (modAssets) {
      const { id, ...rest } = modAssets;
      if (!id) throw new Error('Mock App: Cannot register without ID');
      const existing = this.registry[id] ?? { id };
      // Simplified merge for testing
      for (const key in rest) {
        if (typeof rest[key] === 'object' && rest[key] !== null && !Array.isArray(rest[key])) {
          existing[key] = { ...(existing[key] || {}), ...rest[key] };
        } else {
          existing[key] = rest[key];
        }
      }
      this.registry[id] = existing;
    },
    postLoad: async function () {
      // Simulate postLoad sequence
      for (const mod of this.modules) {
        await mod.relations?.(this.ctx, this.modules);
        await mod.hooks?.(this.ctx, this.modules);
        await mod.init?.(this.ctx, this.modules);
      }
    },
    getModule: function (id) {
      return this.registry[id];
    },
    getModules: function () {
      return this.modules;
    }, // Return module definitions
    getAllRegisteredAssets: function () {
      return Object.values(this.registry);
    }, // Return registered assets
    getModels: function () {
      return this.getAllRegisteredAssets().reduce((acc, mod) => {
        if (mod.models) acc[mod.id] = mod.models;
        return acc;
      }, {});
    },
    getTypeComposers: function () {
      return this.getAllRegisteredAssets().reduce((acc, mod) => {
        if (mod.typeComposers) acc[mod.id] = mod.typeComposers;
        return acc;
      }, {});
    },
    // Add other getters (getServices, getActions etc.) as needed, mirroring App.js
    ...appOverrides, // Allow overriding mock app methods/props
  };

  const mockCtx = {
    // Mimic structure from core/context/createContext.js & config/configContext.js
    mongoose: {}, // Provide a mock mongoose object if needed
    enums: {
      roles: {
        // Example roles, adjust as needed
        ROLES: { USER: 'user', ADMIN: 'admin' },
        ROLE_VALUES: ['user', 'admin'],
      },
    },
    fp: {
      // Mock essential FP utils if modules use them directly
      R: {},
      S: { Just: (v) => ({ value: v, _tag: 'Just' }), Nothing: { _tag: 'Nothing' } }, // Basic Maybe mock
      validate: {},
    },
    fx: {
      accessors: { getModel$: (id, name) => mockApp.getModule(id)?.models?.[name] }, // Example mock accessor
      injectors: { withModels: () => (ctx) => ctx }, // Mock injectors if necessary
    },
    sharedMongoose: { plugins: {} },
    graphqlConfig: { composeWithMongoose: () => schemaComposer.createObjectTC('MockTC') }, // Mock GCM
    graphqlRegistry: { typeComposers: {}, resolvers: {} },
    req: {}, // Mock request object if needed
    user: null, // Default to no authenticated user
    app: mockApp,
    logger: mockLogger,
    errors: errorUtils, // Include real error utils
    ...overrides, // Apply overrides provided by the test
  };

  // Ensure the mock app has a reference to the context it belongs to
  mockApp.ctx = mockCtx;

  return mockCtx;
};

/**
 * Creates a basic mock module object for testing purposes.
 * @param {string} id - The module ID.
 * @param {object} [assets={}] - Mock assets (models, TCs, resolvers, etc.) to include.
 * @param {object} [lifecycle={}] - Mock lifecycle functions (onLoad, init, etc.).
 * @returns {Function} A function that returns the mock module object (headless style).
 */
export const createMockModule = (id, assets = {}, lifecycle = {}) => {
  return (ctx) => ({
    id: id,
    meta: { description: `Mock module ${id}` },
    models: assets.models || {},
    typeComposers: assets.typeComposers || {},
    resolvers: assets.resolvers || {},
    services: assets.services || {},
    actions: assets.actions || {},
    validators: assets.validators || {},

    onLoad:
      lifecycle.onLoad ||
      function () {
        // Default mock onLoad registers assets if they exist
        ctx.app.register({ id: this.id, ...assets });
        ctx.logger?.debug(`[MockModule ${id}] onLoad executed.`);
      },
    init:
      lifecycle.init ||
      function () {
        ctx.logger?.debug(`[MockModule ${id}] init executed.`);
      },
    relations:
      lifecycle.relations ||
      function () {
        ctx.logger?.debug(`[MockModule ${id}] relations executed.`);
      },
    hooks:
      lifecycle.hooks ||
      function () {
        ctx.logger?.debug(`[MockModule ${id}] hooks executed.`);
      },

    // Allow adding other custom properties needed for testing
    ...assets.customProps,
  });
};

// Add other testing utilities, like mock resolvers, mock models, etc.
