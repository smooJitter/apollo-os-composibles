/**
 * Promise Utilities
 * 
 * Helper functions for working with promises, particularly Bluebird promises.
 */
import Promise from 'bluebird';
import { pipe, compose } from './helpers.js';

/**
 * Promise-based pipe function for asynchronous function composition
 * Functions are executed in order, with each receiving the output of the previous one
 * 
 * @param {...Function} fns - Functions to compose (can return Promise or value)
 * @returns {Function} - Function that applies the composition
 */
export const promisePipe = (...fns) => (initialValue) => {
  // Use Bluebird's Promise.reduce to chain the functions in sequence
  return Promise.reduce(
    fns,
    // For each function in our pipe, apply it to the accumulated value
    (value, fn) => Promise.resolve(fn(value)),
    // Start with the initial value
    initialValue
  );
};

/**
 * Create a function that runs multiple async operations in parallel and combines results
 * 
 * @param {Object} asyncFnMap - Object mapping keys to async functions
 * @returns {Function} - Function that runs all async operations and returns combined results
 */
export const allProps = (asyncFnMap) => async (value) => {
  // Create an object of promises by calling each function with the value
  const promiseMap = Object.entries(asyncFnMap).reduce(
    (acc, [key, fn]) => {
      acc[key] = Promise.resolve(fn(value));
      return acc;
    },
    {}
  );
  
  // Resolve all promises and return an object with the same keys
  return Promise.props(promiseMap);
};

/**
 * Run an async function with timeout
 * 
 * @param {Function} fn - Async function to run
 * @param {number} ms - Timeout in milliseconds
 * @returns {Function} - Function that runs the original function with timeout
 */
export const withTimeout = (fn, ms = 5000) => (...args) => {
  return Promise.resolve(fn(...args))
    .timeout(ms, `Operation timed out after ${ms}ms`);
};

/**
 * Retry an async function on failure
 * 
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry options
 * @returns {Function} - Function that runs the original function with retries
 */
export const withRetry = (fn, options = {}) => (...args) => {
  const { maxRetries = 3, delay = 300, backoff = 2 } = options;
  
  return Promise.resolve(fn(...args))
    .catch((error) => {
      if (maxRetries <= 0) throw error;
      
      return Promise.delay(delay)
        .then(() => withRetry(fn, {
          maxRetries: maxRetries - 1,
          delay: delay * backoff,
          backoff
        })(...args));
    });
};

/**
 * Creates a cancelable promise
 * 
 * @param {Function} fn - Async function to make cancelable
 * @returns {Object} - Object with promise and cancel method
 */
export const makeCancelable = (fn) => {
  let hasCanceled = false;
  
  const wrappedPromise = (...args) => {
    return new Promise((resolve, reject) => {
      Promise.resolve(fn(...args))
        .then(val => hasCanceled ? reject({ isCanceled: true }) : resolve(val))
        .catch(error => hasCanceled ? reject({ isCanceled: true }) : reject(error));
    });
  };
  
  return {
    promise: wrappedPromise,
    cancel() {
      hasCanceled = true;
    }
  };
};

/**
 * Wrap a function to always return a promise
 * @param {Function} fn - Function to promisify
 * @returns {Function} - Promisified function
 */
export const promisify = fn => (...args) => 
  Promise.try(() => fn(...args));

/**
 * Execute promises in parallel with a concurrency limit
 * @param {Array} items - Items to process
 * @param {Function} fn - Function to apply to each item
 * @param {Object} options - Options for parallel execution
 * @returns {Promise<Array>} - Promise for results
 */
export const mapConcurrent = (items, fn, options = {}) => {
  const { concurrency = 3, timeout = 30000 } = options;
  
  return Promise.map(items, item => 
    Promise.try(() => fn(item))
      .timeout(timeout)
      .catch(Promise.TimeoutError, err => ({
        error: 'Operation timed out',
        item
      }))
      .catch(err => ({
        error: err.message,
        item
      })),
    { concurrency }
  );
};

/**
 * Create a function that handles common promise patterns
 * @param {Function} fn - Function to enhance
 * @param {Object} options - Options for the enhanced function
 * @returns {Function} - Enhanced function
 */
export const enhancedPromise = (fn, options = {}) => {
  const { 
    timeout = 5000,
    retry = false,
    retryOptions = {},
    cacheResults = false,
    cacheTime = 60000
  } = options;
  
  // Cache for results if caching is enabled
  const cache = new Map();
  
  return (...args) => {
    // Create cache key from args if caching is enabled
    const cacheKey = cacheResults ? JSON.stringify(args) : null;
    
    // Check cache first if caching is enabled
    if (cacheResults && cache.has(cacheKey)) {
      const { timestamp, result } = cache.get(cacheKey);
      
      // If cache entry is still valid, return it
      if (Date.now() - timestamp < cacheTime) {
        return Promise.resolve(result);
      }
      
      // Otherwise, remove expired entry
      cache.delete(cacheKey);
    }
    
    // Create base promise with timeout
    let promise = Promise.try(() => fn(...args)).timeout(timeout);
    
    // Add retry logic if enabled
    if (retry) {
      promise = withRetry(() => fn(...args), retryOptions);
    }
    
    // Add caching if enabled
    if (cacheResults) {
      promise = promise.tap(result => {
        cache.set(cacheKey, {
          timestamp: Date.now(),
          result
        });
      });
    }
    
    return promise;
  };
};

/**
 * Clean up a promise chain result for API responses
 * @param {Function} fn - Promise-returning function to wrap
 * @returns {Function} - Wrapped function
 */
export const apiResponse = fn => (...args) => 
  Promise.try(() => fn(...args))
    .then(result => ({
      success: true,
      data: result,
      timestamp: Date.now()
    }))
    .catch(error => ({
      success: false,
      error: error.message,
      code: error.code || 'UNKNOWN_ERROR',
      timestamp: Date.now()
    }));

/**
 * Create a single caching layer for promises
 * @returns {Object} - Cache utility
 */
export const createPromiseCache = () => {
  const cache = new Map();
  
  return {
    /**
     * Execute a function with caching
     * @param {string} key - Cache key
     * @param {Function} fn - Function to execute
     * @param {number} ttl - Time to live in ms
     * @returns {Promise} - Result promise
     */
    execute: (key, fn, ttl = 60000) => {
      if (cache.has(key)) {
        const { timestamp, promise } = cache.get(key);
        
        if (Date.now() - timestamp < ttl) {
          return promise;
        }
        
        cache.delete(key);
      }
      
      const promise = Promise.try(fn);
      
      cache.set(key, {
        timestamp: Date.now(),
        promise
      });
      
      return promise;
    },
    
    /**
     * Clear a specific key from cache
     * @param {string} key - Cache key
     */
    invalidate: key => {
      cache.delete(key);
    },
    
    /**
     * Clear the entire cache
     */
    clear: () => {
      cache.clear();
    }
  };
}; 