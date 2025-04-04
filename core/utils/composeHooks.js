// core/utils/composeHooks.js
export function composeHooks(modules) {
    return {
      init: modules.filter(m => m.onInit).map(m => m.onInit),
      ready: modules.filter(m => m.onReady).map(m => m.onReady),
      destroy: modules.filter(m => m.onDestroy).map(m => m.onDestroy)
    };
  }
  