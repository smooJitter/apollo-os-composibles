// index.js placeholder
import { schemaComposer } from 'graphql-compose';
import { createUserInputError } from '@apolloos/error-utils'; // For potential validation errors

/**
 * Creates or retrieves an Enum TypeComposer.
 * @param {string} name - The name for the Enum type.
 * @param {object | string[]} values - Enum values (object map or string array).
 * @param {SchemaComposer} [composer=schemaComposer] - Optional SchemaComposer instance.
 * @returns {EnumTypeComposer}
 */
export const getOrCreateEnumTC = (name, values, composer = schemaComposer) => {
  if (composer.has(name)) {
    return composer.getETC(name);
  }
  return composer.createEnumTC({ name, values });
};

/**
 * Creates or retrieves an Input TypeComposer (for input types).
 * @param {string} name - The name for the Input type.
 * @param {object} fields - Field configuration object.
 * @param {SchemaComposer} [composer=schemaComposer] - Optional SchemaComposer instance.
 * @returns {InputTypeComposer}
 */
export const getOrCreateITC = (name, fields, composer = schemaComposer) => {
  if (composer.has(name)) {
    return composer.getITC(name);
  }
  return composer.createInputTC({ name, fields });
};

/**
 * Helper to add a standard relation between two TypeComposers.
 * Simplifies common relation patterns.
 * @param {object} options
 * @param {TypeComposer} options.sourceTC - The source TypeComposer.
 * @param {TypeComposer} options.targetTC - The target TypeComposer.
 * @param {string} options.fieldName - The name of the relation field on the sourceTC.
 * @param {string} options.resolverName - The name of the resolver on the targetTC (e.g., 'findById', 'findOne').
 * @param {object | Function} options.prepareArgs - Arguments mapping for the resolver.
 * @param {object} [options.projection] - Fields to project.
 * @param {string} [options.description] - Description for the relation field.
 */
export const addSimpleRelation = ({
  sourceTC,
  targetTC,
  fieldName,
  resolverName,
  prepareArgs,
  projection = { _id: true }, // Default projection
  description,
}) => {
  if (!sourceTC || !targetTC) {
    console.warn(
      `[addSimpleRelation] Missing sourceTC or targetTC for relation '${fieldName}'. Skipping.`
    );
    return;
  }

  const resolver = targetTC.getResolver(resolverName);
  if (!resolver) {
    console.warn(
      `[addSimpleRelation] Resolver '${resolverName}' not found on targetTC '${targetTC.getTypeName()}' for relation '${fieldName}'. Skipping.`
    );
    return;
  }

  sourceTC.addRelation(fieldName, {
    resolver: () => resolver,
    prepareArgs,
    projection,
    description: description || `Related ${targetTC.getTypeName()}(s)`,
  });
};

// --- Add more schema utilities below ---
// E.g., helpers for common input types, field manipulation, directive application

/**
 * Example: Function to standardize pagination arguments for resolvers.
 * @param {Resolver} resolver - The resolver to add pagination args to.
 * @param {object} [defaultPagination={ limit: 10, skip: 0 }] - Default pagination values.
 * @returns {Resolver}
 */
export const withPaginationArgs = (resolver, defaultPagination = { limit: 20, skip: 0 }) => {
  if (!resolver) return resolver;

  resolver.addArgs({
    limit: {
      type: 'Int',
      description: 'Number of records to return',
      defaultValue: defaultPagination.limit,
    },
    skip: {
      type: 'Int',
      description: 'Number of records to skip',
      defaultValue: defaultPagination.skip,
    },
    // You could add cursor-based pagination args here too
  });

  // Optional: Add validation logic
  resolver.wrapArgs((args) => {
    if (args.limit < 1 || args.limit > 100) {
      // Example limits
      throw createUserInputError('Limit must be between 1 and 100.', {
        invalidArgs: { limit: args.limit },
      });
    }
    if (args.skip < 0) {
      throw createUserInputError('Skip must be a non-negative number.', {
        invalidArgs: { skip: args.skip },
      });
    }
    return args;
  });

  return resolver;
};
