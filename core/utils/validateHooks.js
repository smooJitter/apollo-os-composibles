import S from 'sanctuary';

/**
 * Validates that a module has an `id` and is object-shaped.
 */
export function isValidModule(mod) {
  return S.is(Object)(mod) && typeof mod.id === 'string' && mod.id.length > 0;
}
