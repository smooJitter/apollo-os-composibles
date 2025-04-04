// config/graphql/index.js
import { composeWithMongoose } from 'graphql-compose-mongoose';
import { customScalars } from './scalars.js';
import { withTimestamps } from './typeWrappers.js'; // Import specific wrappers
import { registerGlobalRelations } from './globalRelations.js';

export {
  composeWithMongoose,
  customScalars,
  withTimestamps, // Export specific wrappers
  registerGlobalRelations,
};

// You can add more exports here as needed, like custom directives
