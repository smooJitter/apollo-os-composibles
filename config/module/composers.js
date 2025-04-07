import { schemaComposer } from 'graphql-compose';

/**
 * Creates and registers models for a module
 * @param {Object} schemaCreators - Functions that create models or model objects
 * @returns {Function} - Higher-order function that takes context and returns updated context
 */
export const withModels = (schemaCreators) => (ctx) => {
  const models = {};
  
  if (!schemaCreators) {
    ctx.logger?.warn('[Module Composer] No schema creators provided');
    return { ...ctx, models };
  }
  
  // Create all models in the schema map
  for (const [modelName, modelOrCreator] of Object.entries(schemaCreators)) {
    // Handle both direct model objects and creator functions
    if (typeof modelOrCreator === 'function' && !modelOrCreator.modelName) {
      // It's a creator function
      models[modelName] = modelOrCreator(ctx);
    } else {
      // It's already a model
      models[modelName] = modelOrCreator;
    }
    ctx.logger?.debug(`[Module Composer] Added model: ${modelName}`);
  }
  
  return { ...ctx, models };
};

/**
 * Creates TypeComposers for all models in the context
 * @returns {Function} - Higher-order function that takes context and returns updated context
 */
export const withTypeComposers = () => (ctx) => {
  const { models } = ctx;
  const typeComposers = {};
  
  if (!models) {
    ctx.logger?.warn('[Module Composer] No models found to create TypeComposers');
    return { ...ctx, typeComposers };
  }
  
  // Use composeWithMongoose from context if available
  const composeWithMongoose = ctx.composeWithMongoose || (
    ctx.graphqlRegistry && ctx.graphqlRegistry.composeWithMongoose
  );
  
  // Create a TypeComposer for each model
  for (const [modelName, model] of Object.entries(models)) {
    // Skip if model is falsy
    if (!model) continue;
    
    try {
      // Check if we need to compose with mongoose or if we're using schemaComposer directly
      if (model.schema && typeof composeWithMongoose === 'function') {
        // Use mongoose composer
        const TC = composeWithMongoose(model);
        typeComposers[`${modelName}TC`] = TC;
        
        // Register in schema
        if (!schemaComposer.has(TC.getTypeName())) {
          schemaComposer.add(TC);
          ctx.logger?.debug(`[Module Composer] Added ${modelName} TypeComposer to schema`);
        }
      } else if (ctx.typeComposers && ctx.typeComposers[`${modelName}TC`]) {
        // Use existing TypeComposer if available
        typeComposers[`${modelName}TC`] = ctx.typeComposers[`${modelName}TC`];
        ctx.logger?.debug(`[Module Composer] Using existing TypeComposer: ${modelName}TC`);
      } else {
        // Skip this model if we can't compose it
        ctx.logger?.warn(`[Module Composer] Couldn't create TypeComposer for ${modelName}`);
        continue;
      }
      
      // Register in registry if available
      if (ctx.graphqlRegistry && ctx.graphqlRegistry.typeComposers) {
        ctx.graphqlRegistry.typeComposers[`${modelName}TC`] = typeComposers[`${modelName}TC`];
        ctx.logger?.debug(`[Module Composer] Registered ${modelName}TC in graphql registry`);
      }
      
      ctx.logger?.debug(`[Module Composer] Created TypeComposer: ${modelName}TC`);
    } catch (error) {
      ctx.logger?.error(`[Module Composer] Error creating TypeComposer for ${modelName}: ${error.message}`);
    }
  }
  
  return { ...ctx, typeComposers };
};

/**
 * Creates and registers resolvers for a module
 * @param {Function} resolverCreator - Function that creates resolvers
 * @returns {Function} - Higher-order function that takes context and returns updated context
 */
export const withResolvers = (resolverCreator) => (ctx) => {
  if (typeof resolverCreator !== 'function') {
    ctx.logger?.warn('[Module Composer] No resolver creator provided or not a function');
    return { ...ctx, resolvers: {} };
  }
  
  try {
    const resolvers = resolverCreator(ctx);
    
    // Log resolvers for debugging
    console.log(`[Module Composer] Created resolvers with keys:`, Object.keys(resolvers));
    if (resolvers.Query) {
      console.log(`[Module Composer] Query resolvers:`, Object.keys(resolvers.Query));
    }
    if (resolvers.Mutation) {
      console.log(`[Module Composer] Mutation resolvers:`, Object.keys(resolvers.Mutation));
    }
    
    // Store resolvers in context
    ctx.resolvers = resolvers;
    
    // Register resolvers in graphqlRegistry if available
    if (ctx.graphqlRegistry && ctx.graphqlRegistry.resolvers && ctx.app && ctx.app.modules) {
      const currentModule = ctx.app.modules.find(m => m.id === ctx.currentModuleId);
      if (currentModule) {
        ctx.graphqlRegistry.resolvers[currentModule.id] = resolvers;
        console.log(`[Module Composer] Registered resolvers for module ${currentModule.id} in graphql registry`);
      }
    }
    
    return { ...ctx, resolvers };
  } catch (error) {
    ctx.logger?.error(`[Module Composer] Error creating resolvers: ${error.message}`);
    return { ...ctx, resolvers: {} };
  }
};

/**
 * Applies hooks to the module's resolvers
 * @param {Function} hookApplier - Function that applies hooks
 * @returns {Function} - Higher-order function that takes context and returns updated context
 */
export const withHooks = (hookApplier) => (ctx) => {
  if (typeof hookApplier !== 'function') {
    ctx.logger?.warn('[Module Composer] No hook applier provided or not a function');
    return ctx;
  }
  
  try {
    hookApplier(ctx);
    ctx.logger?.debug('[Module Composer] Applied hooks');
  } catch (error) {
    ctx.logger?.error(`[Module Composer] Error applying hooks: ${error.message}`);
  }
  
  return ctx;
};

/**
 * Establishes relations between this module and others
 * @param {Function} relationEstablisher - Function that establishes relations
 * @returns {Function} - Higher-order function that takes context and returns updated context
 */
export const withRelations = (relationEstablisher) => (ctx) => {
  if (typeof relationEstablisher !== 'function') {
    ctx.logger?.warn('[Module Composer] No relation establisher provided or not a function');
    return ctx;
  }
  
  try {
    relationEstablisher(ctx, ctx.app?.modules || []);
    ctx.logger?.debug('[Module Composer] Established relations');
  } catch (error) {
    ctx.logger?.error(`[Module Composer] Error establishing relations: ${error.message}`);
  }
  
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
  if (typeof initializer !== 'function') {
    ctx.logger?.warn('[Module Composer] No initializer provided or not a function');
    return ctx;
  }
  
  try {
    initializer(ctx);
    ctx.logger?.debug('[Module Composer] Initialized module');
  } catch (error) {
    ctx.logger?.error(`[Module Composer] Error initializing module: ${error.message}`);
  }
  
  return ctx;
}; 