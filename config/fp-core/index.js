// config/fp-core/index.js
import * as R from 'ramda';
import $ from 'sanctuary-def';
import pkg from 'sanctuary';
const { create, env } = pkg;

// Create a properly configured Sanctuary instance
const S = create({
  checkTypes: process.env.NODE_ENV !== 'production',
  env: env,
});

// Common functional patterns
export const pipe = R.pipe;
export const map = R.map;
export const filter = R.filter;
export const reduce = R.reduce;

// Safe accessors using Sanctuary
export const safeProp = S.prop;
export const safeGet = S.get;
export const maybeToNullable = S.maybeToNullable;

// Create a simpler type checker for basic JS types
// This will help with the Function type checking
export const is = (type) => (value) => {
  if (type === Function) return typeof value === 'function';
  if (type === Object) return typeof value === 'object' && value !== null;
  if (type === String) return typeof value === 'string';
  if (type === Number) return typeof value === 'number' && !isNaN(value);
  if (type === Boolean) return typeof value === 'boolean';
  if (type === Array) return Array.isArray(value);
  return value instanceof type;
};

// Composition helpers
export { R, S };
