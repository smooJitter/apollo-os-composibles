import { mergeSchemas } from '@graphql-tools/merge';
import { printSchema } from 'graphql';

/**
 * Merges multiple GraphQL schema strings or Schema objects using graphql-tools.
 * Note: ModuleComposer currently uses graphql-compose directly, but this utility
 * could be useful for other scenarios like stitching or schema federation.
 * @param {Array<GraphQLSchema | string>} schemas - An array of schemas to merge.
 * @returns {GraphQLSchema} The merged schema.
 */
export function mergeGraphSchemas(schemas = []) {
  if (!schemas || schemas.length === 0) {
    throw new Error('[mergeGraphSchemas] No schemas provided for merging.');
  }
  try {
    // Filter out null/undefined schemas
    const validSchemas = schemas.filter(s => s);
    if (validSchemas.length === 0) {
        throw new Error('[mergeGraphSchemas] No valid schemas remaining after filtering.');
    }
    return mergeSchemas({ schemas: validSchemas });
  } catch (err) {
    console.error('[mergeGraphSchemas] Error merging schemas:', err);
    // Optionally print schemas for debugging
    // schemas.forEach((s, i) => console.error(`Schema ${i}:`, s ? printSchema(s) : 'null/undefined'));
    throw err;
  }
}

// Example placeholder if not using graphql-tools merge directly
// export const mergeGraphSchemas = (schemas) => schemas[0];
