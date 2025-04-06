import { schemaComposer } from 'graphql-compose';

/**
 * Creates and registers models for a module
 * @param {Object} schemaCreators - Functions that create models
 * @returns {Function} - Higher-order function that takes context and returns updated context
 */
export const withModels = (schemaCreators) => (ctx) => {
  const models = {};
  
  // Create all models in the schema map
  for (const [modelName, createSchema] of Object.entries(schemaCreators)) {
    models[modelName] = createSchema(ctx);
    ctx.logger?.debug(`[Module Composer] Created model: ${modelName}`);
  }
  
  return { ...ctx, models };
};

/**
 * Creates TypeComposers for all models in the context
 * @returns {Function} - Higher-order function that takes context and returns updated context
 */
export const withTypeComposers = () => (ctx) => {
  const { models, composeWithMongoose } = ctx;
  const typeComposers = {};
  
  if (!models) {
    ctx.logger?.warn('[Module Composer] No models found to create TypeComposers');
    return { ...ctx, typeComposers };
  }
  
  // Create a TypeComposer for each model
  for (const [modelName, model] of Object.entries(models)) {
    if (typeof composeWithMongoose !== 'function') {
      ctx.logger?.error('[Module Composer] composeWithMongoose is not available in context');
      continue;
    }
    
    const TC = composeWithMongoose(model);
    typeComposers[`${modelName}TC`] = TC;
    
    // Register in schema
    if (!schemaComposer.has(modelName)) {
      schemaComposer.add(TC);
      ctx.logger?.debug(`[Module Composer] Added ${modelName} TypeComposer to schema`);
    }
    
    // Register in registry if available
    if (ctx.graphqlRegistry && ctx.graphqlRegistry.typeComposers) {
      ctx.graphqlRegistry.typeComposers[`${modelName}TC`] = TC;
      ctx.logger?.debug(`[Module Composer] Registered ${modelName}TC in graphql registry`);
    }
    
    ctx.logger?.debug(`[Module Composer] Created TypeComposer: ${modelName}TC`);
  }
  
  return { ...ctx, typeComposers };
};

/**
 * Creates and registers resolvers for a module
 * @param {Function} resolverCreator - Function that creates resolvers
 * @returns {Function} - Higher-order function that takes context and returns updated context
 */
export const withResolvers = (resolverCreator) => (ctx) => {
  const resolvers = resolverCreator(ctx);
  
  ctx.logger?.debug(`[Module Composer] Created resolvers: ${
    Object.keys(resolvers.Query || {}).join(', ')
  }, ${
    Object.keys(resolvers.Mutation || {}).join(', ')
  }`);
  
  return { ...ctx, resolvers };
};

/**
 * Applies hooks to the module's resolvers
 * @param {Function} hookApplier - Function that applies hooks
 * @returns {Function} - Higher-order function that takes context and returns updated context
 */
export const withHooks = (hookApplier) => (ctx) => {
  hookApplier(ctx);
  
  ctx.logger?.debug('[Module Composer] Applied hooks');
  
  return ctx;
};

/**
 * Establishes relations between this module and others
 * @param {Function} relationEstablisher - Function that establishes relations
 * @returns {Function} - Higher-order function that takes context and returns updated context
 */
export const withRelations = (relationEstablisher) => (ctx) => {
  relationEstablisher(ctx, ctx.app?.modules || []);
  
  ctx.logger?.debug('[Module Composer] Established relations');
  
  return ctx;
};

/**
 * Registers the module in the app
 * @param {String} moduleId - The ID of the module
 * @returns {Function} - Higher-order function that takes context and returns updated context
 */
export const registerInApp = (moduleId) => (ctx) => {
  if (ctx.app && typeof ctx.app.registerModule === 'function') {
    ctx.app.registerModule({
      id: moduleId,
      typeComposers: ctx.typeComposers,
      resolvers: ctx.resolvers,
      models: ctx.models,
    });
    
    ctx.logger?.debug(`[Module Composer] Registered module: ${moduleId}`);
  }
  
  return ctx;
};

/**
 * Applies initialization logic to the module
 * @param {Function} initializer - Function that initializes the module
 * @returns {Function} - Higher-order function that takes context and returns updated context
 */
export const withInit = (initializer) => (ctx) => {
  initializer(ctx);
  
  ctx.logger?.debug('[Module Composer] Initialized module');
  
  return ctx;
}; 