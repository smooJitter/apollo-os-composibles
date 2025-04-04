// config/fx/safeAccessors.js
import S from 'sanctuary';

export const getModel = (ctx, moduleId, modelName) =>
  S.pipe([
    S.toMaybe,
    S.chain(S.get('models')),
    S.chain(S.get(modelName)),
  ])(ctx.app.getModule(moduleId));

export const getService = (ctx, moduleId, serviceName) =>
  S.pipe([
    S.toMaybe,
    S.chain(S.get('services')),
    S.chain(S.get(serviceName)),
  ])(ctx.app.getModule(moduleId));

// Direct unsafe accessors
export const getModel$ = (ctx, moduleId, modelName) =>
  ctx.app.getModule(moduleId)?.models?.[modelName];

export const getService$ = (ctx, moduleId, serviceName) =>
  ctx.app.getModule(moduleId)?.services?.[serviceName];
