/**
 * Register module models to the context
 * @param {Object} ctx - Application context
 * @param {Object} models - Models to register
 */
export const registerModels = (ctx, models) => {
  if (!ctx) return;
  if (!ctx.models) ctx.models = {};
  
  if (models && typeof models === 'object') {
    Object.entries(models).forEach(([name, model]) => {
      if (model) {
        ctx.models[name] = model;
      }
    });
  }
};

export default {
  registerModels
}; 