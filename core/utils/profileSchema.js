// core/utils/profileSchema.js
export async function profileSchema(buildFn) {
    const start = performance.now();
    const schema = await buildFn();
    const duration = (performance.now() - start).toFixed(2);
    console.log(`🔬 Schema composed in ${duration}ms`);
    return schema;
  }
  