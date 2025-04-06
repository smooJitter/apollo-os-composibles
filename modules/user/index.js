// modules/user/index.js
import { createUserTC } from './typeComposer/userTC.js';
import { createAuthResolvers, createUserResolvers, createAdminResolvers } from './resolvers/index.js';
import * as actions from './actions/index.js';
import * as validators from './validators/index.js';
import userHooks from './hooks/userHooks.js';
import userRelations from './relations/userRelations.js';
import { schemaComposer } from 'graphql-compose';
// Optional init function
// import userInit from './init.js';

console.log('User module loaded');

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
    typeComposers: {
      UserTC: null, // Will be created in onLoad
    },
    resolvers: null, // Will be created in onLoad
    actions: actions, // Exported actions map
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
      
      try {
        // Create the TypeComposer with context
        const { UserTC } = createUserTC(ctx);
        
        // Register the TypeComposer in the module's typeComposers
        this.typeComposers.UserTC = UserTC;
        
        // Register the TypeComposer in the registry if available
        if (ctx.graphqlRegistry && ctx.graphqlRegistry.typeComposers) {
          ctx.graphqlRegistry.typeComposers.UserTC = UserTC;
          ctx.logger?.debug(`[Module: ${id}] Registered UserTC in graphql registry`);
        }
        
        // Register the TypeComposer in the global schema composer
        if (!schemaComposer.has('User')) {
          schemaComposer.add(UserTC);
          ctx.logger?.debug(`[Module: ${id}] Added User TypeComposer to schema`);
        } else {
          ctx.logger?.debug(`[Module: ${id}] User TypeComposer already exists in schema`);
        }

        // Create the resolvers with the TypeComposer
        const authMutations = createAuthResolvers(UserTC);
        const { userQueries, userMutations } = createUserResolvers(UserTC);
        const { adminQueries, adminMutations } = createAdminResolvers(UserTC);
        
        // Register the resolvers in the module
        this.resolvers = {
          Query: {
            ...userQueries,
            ...adminQueries,
          },
          Mutation: {
            ...authMutations,
            ...userMutations,
            ...adminMutations,
          },
        };
        
        ctx.logger?.debug(`[Module: ${id}] TypeComposers and resolvers registered successfully`);
      } catch (error) {
        ctx.logger?.error(`[Module: ${id}] Error during onLoad: ${error.message}`);
        throw error;
      }
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
    },
  };
}







