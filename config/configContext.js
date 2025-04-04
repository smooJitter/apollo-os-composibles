// config/configContext.js
import mongoose from 'mongoose'; // Assuming mongoose is installed and configured

import * as rolesEnum from './enums/roles.js';
import createFpCore from './fp-core/index.js';
import * as accessors from './fx/safeAccessors.js';
import * as injectors from './fx/injectors.js';
import * as sharedMongooseConfig from './shared-mongoose/index.js';
import * as graphqlConfig from './graphql/index.js';

/**
 * Creates and configures the application context (ctx).
 * This object is passed to all modules and throughout the application.
 */
export function createConfigContext({ req } = {}) {
  const ctx = {};

  // --- Core Dependencies ---
  // TODO: Add proper Mongoose connection logic here
  ctx.mongoose = mongoose;

  // --- Enums ---
  ctx.enums = {
    roles: rolesEnum,
    // Add other enums here
  };

  // --- Functional Programming Core ---
  ctx.fp = createFpCore();

  // --- Functional Effects (Accessors, Injectors) ---
  ctx.fx = {
    accessors,
    injectors,
  };

  // --- Shared Mongoose Config ---
  ctx.sharedMongoose = sharedMongooseConfig;

  // --- GraphQL Configuration ---
  ctx.graphqlConfig = graphqlConfig;

  // --- Request Specific Context (Optional) ---
  ctx.req = req;
  ctx.user = req?.user ?? null; // Example: Assuming user is attached by auth middleware

  // --- Placeholder for App instance (to be added later) ---
  // ctx.app = null;

  // --- Logger (Example - Replace with your preferred logger) ---
  ctx.logger = console; // Replace with Pino, Winston, etc.

  return ctx;
}

// Exporting the function directly for clarity
export default createConfigContext;
