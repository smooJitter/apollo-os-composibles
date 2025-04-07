// modules/subscription/index.js
import {
  withModels,
  withTypeComposers,
  withResolvers,
  withHooks,
  withRelations,
  withInit
} from '../../config/module/composers.js';

import models from './schemas.js';
import { initResolvers } from './resolvers.js';
import subscriptionHooks from './hooks/subscriptionHooks.js';
import subscriptionRelations from './relations/subscriptionRelations.js';
import * as actions from './actions/index.js';
import { initTypeComposers } from './registry.js';

import { pipe } from 'ramda';

/**
 * Subscription module initialization function
 * @param {Object} ctx - Context object
 */
const subscriptionInit = (ctx) => {
  // Initialize default plans if needed
  if (ctx.models && ctx.models.Plan) {
    ctx.models.Plan.initializeDefaultPlans()
      .then((plans) => {
        ctx.logger?.info(`[Subscription Module] Initialized ${plans.length} default plans`);
      })
      .catch((err) => {
        ctx.logger?.error(`[Subscription Module] Error initializing default plans: ${err.message}`);
      });
  } else {
    ctx.logger?.warn('[Subscription Module] Plan model not available in context');
  }
  
  // Initialize TypeComposers if not already done
  initTypeComposers();
  
  ctx.logger?.debug(`[Subscription Module] Initialization complete`);
};

/**
 * Creates the subscription module following functional composition pattern
 * @param {Object} ctx - Context object
 * @returns {Object} - Subscription module
 */
export default ctx => {
  const moduleId = 'subscription';
  
  // Set current module ID in context for tracing
  ctx.currentModuleId = moduleId;
  
  // Initialize TypeComposers first to make sure they're available
  const typeComposers = initTypeComposers();
  
  // Initialize resolvers
  const resolvers = initResolvers();
  
  // Apply functional composition pattern
  const composed = pipe(
    withModels(() => models),
    withTypeComposers(() => typeComposers),
    withResolvers(() => resolvers),
    withHooks(subscriptionHooks),
    withRelations(subscriptionRelations),
    withInit(subscriptionInit)
  )(ctx);

  // Add module models to ctx.models
  if (!ctx.models) ctx.models = {};
  Object.keys(models).forEach(modelName => {
    ctx.models[modelName] = models[modelName];
  });

  // Add module explicitly to graphqlRegistry if available
  if (ctx.graphqlRegistry && ctx.graphqlRegistry.resolvers) {
    ctx.graphqlRegistry.resolvers[moduleId] = resolvers;
    console.log(`[Subscription Module] Explicitly registered resolvers in graphql registry`);
  }

  return {
    id: moduleId,
    meta: {
      description: 'Handles subscription plans and user subscriptions',
      version: '1.0.0',
      dependsOn: ['user'], 
    },
    // Assets from functional composition
    typeComposers: composed.typeComposers,
    resolvers, // Use direct resolvers to ensure they're registered correctly
    models: composed.models,
    
    // Additional assets
    actions,
    
    // Lifecycle functions (delegates to composers)
    onLoad: () => composed,
    hooks: subscriptionHooks,
    relations: subscriptionRelations,
    init: subscriptionInit
  };
};
