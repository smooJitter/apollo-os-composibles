// config/configContext.js
import path from 'path';
import { fileURLToPath } from 'url';
import * as R from 'ramda';
import S from 'sanctuary';

import * as Roles from './enums/roles.js';
import * as FP from './fp-core/index.js';
import * as Accessors from './fx/safeAccessors.js';
import * as Injectors from './fx/injectors.js';

import * as graphqlConfig from './graphql/index.js';
import * as sharedMongoose from './shared-mongoose/index.js';
import logger from './logger.js'; // Import our Winston logger

import jwt from 'jsonwebtoken';












/**
 * Creates the configuration context used across the application.
 * This is a common base for both boot and request contexts.
 */
export function createConfigContext({ req } = {}) {
  const ctx = {};

  // Meta for internal traceability (e.g., __dirname)
  const __filename = fileURLToPath(import.meta.url);
  ctx.meta = {
    rootDir: path.resolve(path.dirname(__filename), '../'),
    bootTime: Date.now(),
  };

  // Attach our Winston logger
  ctx.logger = logger;
  
  // Add JWT utility for auth
  ctx.jwt = {
    sign: (payload, options = {}) => jwt.sign(
      payload, 
      process.env.JWT_SECRET || 'dev-secret-key',
      { expiresIn: '1d', ...options }
    ),
    verify: (token) => jwt.verify(
      token, 
      process.env.JWT_SECRET || 'dev-secret-key'
    )
  };

  // Enums (roles, statuses, etc.)
  ctx.enums = {
    roles: Roles,
  };

  // Functional utilities
  ctx.fp = {
    ...FP,
    R,
    S,
  };

  // Utility accessors/injectors
  ctx.fx = {
    accessors: Accessors,
    injectors: Injectors,
  };

  // Shared Mongoose plugins, schemas, etc.
  ctx.sharedMongoose = sharedMongoose;

  // GraphQL config registry (typeMappers, scalars, relations)
  ctx.graphqlConfig = graphqlConfig;

  // Placeholder lifecycle registry (optional)
  ctx.lifecycleHooks = {
    init: [],
    ready: [],
    destroy: [],
  };

  // If there's a request, add request-specific stuff
  if (req) {
    ctx.req = req;
    
    // Extract auth token from headers if present
    const authHeader = req.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      // Special handling for test tokens in mock mode
      if (process.env.USE_MOCK_DB === 'true' && token.includes('test-token')) {
        // Admin test token
        if (token.includes('admin-test-token')) {
          ctx.user = {
            id: 'admin-id-123',
            email: 'admin@example.com',
            role: 'admin'
          };
          ctx.logger.debug('Admin test token detected');
        } 
        // Regular test token
        else {
          ctx.user = {
            id: 'test-id-123',
            email: 'test@example.com',
            role: 'user'
          };
          ctx.logger.debug('User test token detected');
        }
      } 
      // Regular JWT verification
      else {
        try {
          ctx.user = ctx.jwt.verify(token);
        } catch (error) {
          ctx.logger.debug('Invalid token provided in request');
        }
      }
    }
  }

  return ctx;
}

export default createConfigContext;
