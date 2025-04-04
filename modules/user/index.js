// modules/user/index.js
import { createUserModel, createAuthTokenModel } from './model/index.js';
import { createUserTC, createAuthTokenTC } from './typeComposer/index.js';
import { resolvers } from './resolvers/index.js';
import * as actions from './actions/index.js';
import * as validators from './validators/index.js';
import userHooks from './hooks/userHooks.js';
import userRelations from './relations/userRelations.js';
// Optional init function
// import userInit from './init.js';

export default function (ctx) {
  const id = 'user'; // Module ID

  // --- Module Definition --- 
  return {
    id: id,

    // --- Metadata --- 
    meta: {
      description: 'Handles user accounts, authentication, and authorization.',
      version: '1.0.0',
      dependsOn: [], // Add dependencies like 'profile' if needed
    },

    // --- Assets --- 
    // Assets are defined here or created within onLoad
    // Defining them here makes them immediately available on the returned object
    models: {
        User: createUserModel(ctx),
        AuthToken: createAuthTokenModel(ctx),
    },
    typeComposers: {
        UserTC: null, // Placeholder, will be created in onLoad
        AuthTokenTC: null,
    },
    resolvers: resolvers, // Exported combined resolvers map
    actions: actions,       // Exported actions map
    validators: validators, // Exported validators map
    // services: { userService, authService }, // Add services if created

    // --- Lifecycle Functions --- 

    /**
     * onLoad: Called by App.load(). 
     * Responsible for registering assets (especially TCs that need models) 
     * into the central app registry.
     */
    onLoad() {
      ctx.logger?.debug(`[Module: ${id}] Executing onLoad...`);
      // Create TCs now that models are available
      const UserTC = createUserTC(this.models.User, ctx);
      const AuthTokenTC = createAuthTokenTC(this.models.AuthToken, ctx);
      
      // Update the module object itself (optional, but can be useful)
      this.typeComposers.UserTC = UserTC;
      this.typeComposers.AuthTokenTC = AuthTokenTC;

      // Register assets needed by other modules or the core system
      ctx.app.register({
        id: id,
        models: this.models,
        typeComposers: this.typeComposers, // Register the created TCs
        resolvers: this.resolvers,
        actions: this.actions,
        validators: this.validators,
        // services: this.services,
      });
      ctx.logger?.info(`[Module: ${id}] Assets registered.`);
    },

    /**
     * relations: Called by App.postLoad(). 
     * Defines relationships between this module's TCs and others.
     */
    relations: userRelations, // Pass the imported function

    /**
     * hooks: Called by App.postLoad().
     * Applies wrappers (like security) to resolvers.
     */
    hooks: userHooks, // Pass the imported function

    /**
     * init: Called by App.postLoad().
     * Optional function for post-load initialization (e.g., data seeding).
     */
    // init: userInit, // Uncomment and import if you create an init.js
    init: () => {
        ctx.logger?.info(`[Module: ${id}] Initialization complete.`);
    }
  };
} 