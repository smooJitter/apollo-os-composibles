// config/fx/injectors.js
export const assignToCtx = (key, val) => ctx => {
  ctx[key] = val;
  return ctx;
};

export const withModels = (schemas) => (ctx) => ({
  ...ctx,
  models: Object.entries(schemas).reduce((acc, [name, factory]) => {
    acc[name] = factory(ctx.mongoose, ctx);
    return acc;
  }, {})
});

export const withTypeComposers = (options = {}) => (ctx) => ({
  ...ctx,
  typeComposers: Object.entries(ctx.models || {}).reduce((acc, [name, model]) => {
    acc[name] = ctx.graphqlConfig.composeWithMongoose(model, options[name] || {});
    return acc;
  }, {})
});

export const withResolvers = (resolverFactory) => (ctx) => ({
  ...ctx,
  resolvers: resolverFactory(ctx.typeComposers, ctx)
});
