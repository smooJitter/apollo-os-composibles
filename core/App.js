// core/App.js
import * as R from 'ramda';
import S from 'sanctuary';

export class App {
  constructor(ctx = {}) {
    this.ctx = ctx;
    this.modules = []; // Holds the module objects returned by the module functions
    this.registry = {}; // Holds the registered assets (models, TCs, services, etc.) keyed by module ID
    ctx.app = this; // Inject app instance into context for modules to use
  }

  /**
   * Loads a module defined by a headless function.
   * Executes the module function, validates the result, and stores it.
   * Calls the module's onLoad method if present.
   * @param {Function} moduleFn - The headless function defining the module.
   */
  load(moduleFn) {
    if (typeof moduleFn !== 'function') {
      throw new Error(
        `[App] Attempted to load a non-function module. Ensure modules export a default function.`
      );
    }

    const mod = moduleFn(this.ctx);

    // Basic validation of the returned module object
    if (!mod?.id || typeof mod.id !== 'string') {
      throw new Error(
        `[App] Module loaded from function ${moduleFn.name || '(anonymous)'} must return an object with a valid string 'id'. Received: ${JSON.stringify(mod)}`
      );
    }
    if (typeof mod.onLoad !== 'function') {
      this.ctx.logger?.warn(
        `[App] Module '${mod.id}' does not have an onLoad function. Assets should be registered here.`
      );
      // Proceeding, but assets might not be registered correctly if module expects implicit registration
    }

    // Call onLoad if it exists - this is where modules register their assets
    try {
      mod.onLoad?.();
      this.ctx.logger?.debug(`[App] Executed onLoad for module: ${mod.id}`);
    } catch (err) {
      this.ctx.logger?.error(`[App] Error during onLoad for module ${mod.id}:`, err);
      throw err; // Re-throw error during loading
    }

    // Store the module definition object (contains id, meta, lifecycle methods, etc.)
    this.modules.push(mod);
    // The registry is populated via mod.onLoad() calling this.register()

    this.ctx.logger?.info(`[App] Module loaded: ${mod.id}`);
    return this; // Allow chaining
  }

  /**
   * Executes post-load lifecycle methods (relations, hooks, init) for all loaded modules.
   * Should be called after all modules have been loaded.
   */
  async postLoad() {
    this.ctx.logger?.info(`[App] Starting postLoad phase for ${this.modules.length} modules.`);
    for (const mod of this.modules) {
      try {
        // Execute relations() if defined
        if (typeof mod.relations === 'function') {
          this.ctx.logger?.debug(`[App] Executing relations for module: ${mod.id}`);
          await mod.relations(this.ctx, this.modules);
        }
        // Execute hooks() if defined
        if (typeof mod.hooks === 'function') {
          this.ctx.logger?.debug(`[App] Executing hooks for module: ${mod.id}`);
          await mod.hooks(this.ctx, this.modules);
        }
        // Execute init() if defined
        if (typeof mod.init === 'function') {
          this.ctx.logger?.debug(`[App] Executing init for module: ${mod.id}`);
          await mod.init(this.ctx, this.modules);
        }
      } catch (err) {
        this.ctx.logger?.error(`[App] Error during postLoad phase for module ${mod.id}:`, err);
        // Decide if you want to stop the app or just log the error
        // throw err; // Option: Stop app on postLoad error
      }
    }
    this.ctx.logger?.info(`[App] postLoad phase completed.`);
  }

  /**
   * Registers module assets (models, TCs, services, etc.) into the central registry.
   * Typically called by a module during its onLoad phase.
   * @param {object} modAssets - An object containing assets to register, MUST include 'id'.
   */
  register(modAssets) {
    const { id, ...rest } = modAssets;
    if (!id || typeof id !== 'string') {
      throw new Error(
        `[App] Cannot register module assets without a valid string 'id'. Received: ${JSON.stringify(modAssets)}`
      );
    }

    const existing = this.registry[id] ?? { id }; // Initialize if not exists

    // Deep merge assets: models, typeComposers, resolvers, services, actions, validators
    for (const key in rest) {
      if (typeof rest[key] === 'object' && rest[key] !== null && !Array.isArray(rest[key])) {
        existing[key] = { ...(existing[key] || {}), ...rest[key] };
      } else {
        existing[key] = rest[key]; // Overwrite non-object properties or arrays
      }
    }

    this.registry[id] = existing;
    this.ctx.logger?.debug(
      `[App] Registered assets for module: ${id}. Keys: ${Object.keys(rest).join(', ')}`
    );
  }

  /**
   * Retrieves all loaded module definition objects (containing id, meta, lifecycle methods).
   * @returns {Array<object>} Array of module definition objects.
   */
  getModules = () => this.modules;

  /**
   * Retrieves the registered assets for a specific module by its ID.
   * @param {string} id - The module ID.
   * @returns {object | undefined} The registered assets or undefined if not found.
   */
  getModule = (id) => this.registry[id];

  /**
   * Retrieves all registered assets from all modules.
   * @returns {Array<object>} Array of registered module assets.
   */
  getAllRegisteredAssets = () => Object.values(this.registry);

  /**
   * Checks if a module with the given ID has been registered.
   * @param {string} id - The module ID.
   * @returns {boolean}
   */
  hasModule = (id) => !!this.registry[id];

  /**
   * Retrieves all registered Mongoose models from all modules.
   * @returns {object} An object mapping moduleID -> { modelName: Model }
   */
  getModels = () =>
    this.getAllRegisteredAssets().reduce((acc, mod) => {
      if (mod.models) acc[mod.id] = mod.models;
      return acc;
    }, {});

  /**
   * Retrieves all registered TypeComposers from all modules.
   * @returns {object} An object mapping moduleID -> { tcName: TypeComposer }
   */
  getTypeComposers = () =>
    this.getAllRegisteredAssets().reduce((acc, mod) => {
      if (mod.typeComposers) acc[mod.id] = mod.typeComposers;
      return acc;
    }, {});

  /**
   * Retrieves all registered services from all modules.
   * @returns {object} An object mapping moduleID -> { serviceName: Service }
   */
  getServices = () =>
    this.getAllRegisteredAssets().reduce((acc, mod) => {
      if (mod.services) acc[mod.id] = mod.services;
      return acc;
    }, {});

  /**
   * Retrieves all registered actions from all modules.
   * @returns {object} An object mapping moduleID -> { actionName: Action }
   */
  getActions = () =>
    this.getAllRegisteredAssets().reduce((acc, mod) => {
      if (mod.actions) acc[mod.id] = mod.actions;
      return acc;
    }, {});

  /**
   * Retrieves all registered validators from all modules.
   * @returns {object} An object mapping moduleID -> { validatorName: Validator }
   */
  getValidators = () =>
    this.getAllRegisteredAssets().reduce((acc, mod) => {
      if (mod.validators) acc[mod.id] = mod.validators;
      return acc;
    }, {});
}
