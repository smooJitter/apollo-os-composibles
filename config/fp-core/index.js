// config/fp-core/index.js
import * as R from 'ramda';
import S from 'sanctuary';

// Common functional patterns
export const pipe = R.pipe;
export const map = R.map;
export const filter = R.filter;
export const reduce = R.reduce;

// Safe accessors using Sanctuary
export const safeProp = S.prop;
export const safeGet = S.get;
export const maybeToNullable = S.maybeToNullable;

// Composition helpers
export { R, S };
