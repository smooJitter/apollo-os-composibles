// config/graphql/typeWrappers.js
import { GraphQLNonNull, GraphQLObjectType } from 'graphql';
import { GraphQLDateTime } from 'graphql-scalars';

export const typeWrappers = {
  createdAt: {
    type: 'DateTime',
    description: 'Time of creation',
  },
  updatedAt: {
    type: 'DateTime',
    description: 'Last update time',
  },
};

/**
 * Example: Wrap fields with standard audit timestamps.
 */
export const withTimestamps = (tc) => {
  if (!tc || !(tc instanceof GraphQLObjectType)) return;

  if (!tc.hasField('createdAt')) {
    tc.addFields({
      createdAt: {
        type: new GraphQLNonNull(GraphQLDateTime),
        description: 'Timestamp when the record was created',
        resolve: (source) => source.createdAt || new Date(), // Example resolver
      },
    });
  }

  if (!tc.hasField('updatedAt')) {
    tc.addFields({
      updatedAt: {
        type: new GraphQLNonNull(GraphQLDateTime),
        description: 'Timestamp when the record was last updated',
        resolve: (source) => source.updatedAt || new Date(), // Example resolver
      },
    });
  }
};

// Add more common type wrappers here (e.g., withSoftDelete, withOwner)
