// core/utils/normalizeModuleMeta.js
export function normalizeModuleMeta(mod) {
    return {
      id: mod.id,
      version: mod.version || '0.1.0',
      scope: mod.scope || 'app',
      description: mod.description || '',
      enabled: mod.enabled !== false
    };
  }
  