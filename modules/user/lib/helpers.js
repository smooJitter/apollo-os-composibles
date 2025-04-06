/**
 * Functional Programming Helpers
 * 
 * This file contains utility functions for functional programming patterns
 * used throughout the user module.
 */
import Promise from 'bluebird';

/**
 * Compose functions from right to left
 * compose(f, g, h)(x) is the same as f(g(h(x)))
 * 
 * @param {...Function} fns - Functions to compose
 * @returns {Function} - Composed function
 */
export const compose = (...fns) => {
  if (fns.length === 0) return (x) => x;
  if (fns.length === 1) return fns[0];
  
  return fns.reduce((a, b) => (...args) => a(b(...args)));
};

/**
 * Pipe functions from left to right
 * pipe(f, g, h)(x) is the same as h(g(f(x)))
 * 
 * @param {...Function} fns - Functions to pipe
 * @returns {Function} - Piped function
 */
export const pipe = (...fns) => {
  if (fns.length === 0) return (x) => x;
  if (fns.length === 1) return fns[0];
  
  return fns.reduce((a, b) => (...args) => b(a(...args)));
};

/**
 * Compose async functions from right to left using Bluebird promises
 * 
 * @param {...Function} fns - Async functions to compose
 * @returns {Function} - Composed async function
 */
export const composeAsync = (...fns) => {
  if (fns.length === 0) return (x) => Promise.resolve(x);
  if (fns.length === 1) return (x) => Promise.try(() => fns[0](x));
  
  return fns.reduce((a, b) => (...args) => 
    Promise.try(() => b(...args)).then(result => a(result))
  );
};

/**
 * Pipe async functions from left to right using Bluebird promises
 * 
 * @param {...Function} fns - Async functions to pipe
 * @returns {Function} - Piped async function
 */
export const pipeAsync = (...fns) => {
  if (fns.length === 0) return (x) => Promise.resolve(x);
  if (fns.length === 1) return (x) => Promise.try(() => fns[0](x));
  
  return fns.reduce((a, b) => (...args) => 
    Promise.try(() => a(...args)).then(result => b(result))
  );
};

/**
 * Curry a function with specified arity
 * 
 * @param {Function} fn - Function to curry
 * @param {number} arity - Number of arguments the function takes
 * @returns {Function} - Curried function
 */
export const curry = (fn, arity = fn.length) => {
  return function curried(...args) {
    if (args.length >= arity) return fn(...args);
    return (...more) => curried(...args, ...more);
  };
};

/**
 * Curry an async function with specified arity using Bluebird
 * 
 * @param {Function} fn - Async function to curry
 * @param {number} arity - Number of arguments the function takes
 * @returns {Function} - Curried async function
 */
export const curryAsync = (fn, arity = fn.length) => {
  return function curried(...args) {
    if (args.length >= arity) return Promise.try(() => fn(...args));
    return (...more) => curried(...args, ...more);
  };
};

/**
 * Partially apply a function from left to right
 * 
 * @param {Function} fn - Function to partially apply
 * @param {...any} args - Arguments to apply
 * @returns {Function} - Partially applied function
 */
export const partial = (fn, ...args) => {
  return (...moreArgs) => fn(...args, ...moreArgs);
};

/**
 * Create a memoized version of a function
 * Caches results based on arguments for performance
 * 
 * @param {Function} fn - Function to memoize
 * @returns {Function} - Memoized function
 */
export const memoize = (fn) => {
  const cache = new Map();
  
  return (...args) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key);
    
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
};

/**
 * Create a memoized version of an async function using Bluebird
 * Caches promise results based on arguments for performance
 * 
 * @param {Function} fn - Async function to memoize
 * @param {number} ttl - Cache time to live in ms (optional)
 * @returns {Function} - Memoized async function
 */
export const memoizeAsync = (fn, ttl = null) => {
  const cache = new Map();
  
  return (...args) => {
    const key = JSON.stringify(args);
    
    if (cache.has(key)) {
      const { result, timestamp } = cache.get(key);
      // If TTL is set and not expired, return cached result
      if (!ttl || Date.now() - timestamp < ttl) {
        return result;
      }
      // Remove expired entry
      cache.delete(key);
    }
    
    const result = Promise.try(() => fn(...args));
    
    // Cache the promise to avoid multiple executions
    cache.set(key, { 
      result, 
      timestamp: Date.now() 
    });
    
    // If the promise rejects, remove it from cache
    result.catch(() => cache.delete(key));
    
    return result;
  };
};

/**
 * Create a debounced version of a function
 * Only executes the function after a specified delay has passed
 * 
 * @param {Function} fn - Function to debounce
 * @param {number} wait - Time in milliseconds to wait
 * @returns {Function} - Debounced function
 */
export const debounce = (fn, wait) => {
  let timeout;
  
  return function debounced(...args) {
    const later = () => {
      clearTimeout(timeout);
      fn(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Create a throttled version of a function
 * Limits the rate at which a function can be called
 * 
 * @param {Function} fn - Function to throttle
 * @param {number} limit - Time in milliseconds to limit calls
 * @returns {Function} - Throttled function
 */
export const throttle = (fn, limit) => {
  let lastCall = 0;
  
  return function throttled(...args) {
    const now = Date.now();
    if (now - lastCall < limit) return;
    
    lastCall = now;
    return fn(...args);
  };
}; 