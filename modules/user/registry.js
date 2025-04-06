/**
 * Minimal TypeComposer Registry for the User module
 */

// Create a simple registry with only the essentials
export const TCRegistry = {
  // Internal registry state
  _store: new Map(),
  _initialized: false,
  
  // Register a TypeComposer
  register(name, tc) {
    console.log(`[Registry] Registering TypeComposer: ${name}`);
    this._store.set(name, tc);
    return this;
  },
  
  // Get a TypeComposer
  get(name) {
    console.log(`[Registry] Getting TypeComposer: ${name}`);
    if (!this._store.has(name)) {
      console.warn(`[Registry] TypeComposer '${name}' not found`);
      return null;
    }
    return this._store.get(name);
  },
  
  // Get all TypeComposers
  getAll() {
    console.log('[Registry] Getting all TypeComposers');
    return Array.from(this._store.entries()).reduce((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {});
  },
  
  // Check if initialized
  isInitialized() {
    return this._initialized;
  },
  
  // Mark as initialized
  setInitialized() {
    console.log('[Registry] Setting registry as initialized');
    this._initialized = true;
    return this;
  },
  
  // Reset registry
  reset() {
    console.log('[Registry] Resetting registry');
    this._store = new Map();
    this._initialized = false;
    return this;
  }
};

// Initialize with empty dummy TypeComposers
export const initializeTypeComposers = () => {
  console.log('[Registry] Initializing with dummy TypeComposers');
  
  if (TCRegistry.isInitialized()) {
    return TCRegistry;
  }
  
  // Register dummy TCs so nothing breaks
  TCRegistry
    .register('UserTC', { name: 'User', dummy: true })
    .register('AuthTokenTC', { name: 'AuthToken', dummy: true })
    .setInitialized();
  
  return TCRegistry;
};

// Getter for UserTC
export const getUserTC = () => TCRegistry.get('UserTC');

// Getter for AuthTokenTC
export const getAuthTokenTC = () => TCRegistry.get('AuthTokenTC'); 