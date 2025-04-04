import S from 'sanctuary';

/**
 * Safely retrieve a deeply nested prop from an object.
 * Usage: safeGet(['foo', 'bar'], obj)
 */
export const safeGet = (pathArr, obj) =>
  S.get(S.propPath(pathArr)(obj));
