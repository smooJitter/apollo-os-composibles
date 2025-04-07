// packages/hooks/index.js

/**
 * A simple event registry for application-wide lifecycle hooks.
 * Modules or the core system can register listeners for specific events.
 */
class LifecycleHookRegistry {
  constructor(logger = console) {
    this.hooks = new Map();
    this.logger = logger;
    this.logger.info('[LifecycleHooks] Registry initialized.');
  }

  /**
   * Registers a listener function for a specific hook event.
   * @param {string} eventName - The name of the lifecycle event (e.g., 'app:start', 'db:connected', 'app:shutdown').
   * @param {Function} listener - The async function to execute when the event is triggered.
   * @param {object} [options={}] - Options for the listener.
   * @param {number} [options.priority=0] - Execution priority (lower numbers run first).
   * @param {string} [options.description=''] - Optional description for logging/debugging.
   */
  on(eventName, listener, options = {}) {
    if (typeof listener !== 'function') {
      this.logger.error(
        `[LifecycleHooks] Attempted to register non-function listener for event: ${eventName}`
      );
      return;
    }
    if (!this.hooks.has(eventName)) {
      this.hooks.set(eventName, []);
    }
    const listeners = this.hooks.get(eventName);
    listeners.push({
      fn: listener,
      priority: options.priority || 0,
      description: options.description || listener.name || 'anonymous',
    });
    // Sort listeners by priority (lower first)
    listeners.sort((a, b) => a.priority - b.priority);
    this.logger.debug(
      `[LifecycleHooks] Registered listener for '${eventName}': ${options.description || listener.name}`
    );
  }

  /**
   * Triggers all registered listeners for a specific hook event sequentially.
   * @param {string} eventName - The name of the event to trigger.
   * @param {...any} args - Arguments to pass to the listener functions.
   */
  async emit(eventName, ...args) {
    const listeners = this.hooks.get(eventName);
    if (!listeners || listeners.length === 0) {
      this.logger.debug(`[LifecycleHooks] No listeners registered for event: ${eventName}`);
      return;
    }

    this.logger.info(
      `[LifecycleHooks] Emitting event: ${eventName} (${listeners.length} listeners)`
    );
    for (const listener of listeners) {
      try {
        this.logger.debug(
          `[LifecycleHooks] Executing listener '${listener.description}' for event '${eventName}'`
        );
        await listener.fn(...args);
      } catch (err) {
        this.logger.error(
          `[LifecycleHooks] Error executing listener '${listener.description}' for event ${eventName}:`,
          err
        );
        // Optionally decide if an error in one listener should stop others
        // throw err; // Uncomment to stop execution on error
      }
    }
    this.logger.info(`[LifecycleHooks] Finished emitting event: ${eventName}`);
  }

  /**
   * Removes a specific listener for an event.
   * @param {string} eventName - The event name.
   * @param {Function} listenerToRemove - The listener function to remove.
   */
  off(eventName, listenerToRemove) {
    const listeners = this.hooks.get(eventName);
    if (!listeners) return;

    const initialLength = listeners.length;
    this.hooks.set(
      eventName,
      listeners.filter((listener) => listener.fn !== listenerToRemove)
    );
    if (listeners.length < initialLength) {
      this.logger.debug(`[LifecycleHooks] Removed listener for event: ${eventName}`);
    }
  }

  /**
   * Removes all listeners for a specific event or all events.
   * @param {string} [eventName] - Optional event name. If omitted, clears all listeners.
   */
  removeAllListeners(eventName) {
    if (eventName) {
      if (this.hooks.has(eventName)) {
        this.hooks.delete(eventName);
        this.logger.debug(`[LifecycleHooks] Removed all listeners for event: ${eventName}`);
      }
    } else {
      this.hooks.clear();
      this.logger.info(`[LifecycleHooks] Cleared all listeners.`);
    }
  }
}

// Export a single instance or the class itself depending on desired usage
// Option 1: Export a singleton instance (usually preferred for global hooks)
// export const lifecycleHooks = new LifecycleHookRegistry();

// Option 2: Export the class for instantiation where needed
export { LifecycleHookRegistry };

// Example predefined hook names (optional)
export const HOOK_EVENTS = {
  APP_START: 'app:start',
  APP_READY: 'app:ready', // After modules loaded and postLoad complete
  APP_SHUTDOWN_START: 'app:shutdown:start',
  APP_SHUTDOWN_COMPLETE: 'app:shutdown:complete',
  DB_CONNECTED: 'db:connected',
  DB_DISCONNECTED: 'db:disconnected',
  // Add more specific events
};
