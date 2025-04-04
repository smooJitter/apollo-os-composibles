// main.js - ApolloOS Framework Entry Point
import express from 'express';
import http from 'http';
import bodyParser from 'body-parser';
import cors from 'cors';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import ApolloOS Core
import { App } from './core/App.js';
import { createContext } from './core/context/createContext.js';
import { composeModules } from './core/ModuleLoader.js';
import { composeSchema } from './core/ModuleComposer.js';

// Import ApolloOS Utility Plugins (Example)
import { createBasicLoggerPlugin } from '@apolloos/plugin-utils';

// --- Import Application Modules ---
import userModule from './modules/user/index.js'; // Using relative path instead of alias
// import profileModule from '@modules/profile/index.js'; // Placeholder for later
// import journalModule from '@modules/journal/index.js'; // Placeholder for later

// --- Configuration (Move to .env or config file later) ---
const PORT = parseInt(process.env.PORT || '4000', 10);
// Try alternative ports if main port is busy
const USE_ALTERNATIVE_PORT = process.env.USE_ALTERNATIVE_PORT === 'true' || false;
// To be safe, we keep this here for reference but use it in setupMongoose
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/apolloos_dev';
const USE_MOCK_DB = process.env.USE_MOCK_DB === 'true' || false;

// --- Database ---
import setupMongoose from './config/db/mongoose.js';

// --- Main Application Bootstrap ---
async function startApolloOS() {
  let ctx;
  try {
    // 1. Create Application Context
    // Context creation might involve async operations (e.g., fetching initial config)
    ctx = await createContext();
    ctx.logger.info('[Main] Application context created.');

    // 2. Initialize App Instance
    // The App constructor now injects itself into the context (ctx.app)
    const appInstance = new App(ctx);
    ctx.logger.info('[Main] ApolloOS App initialized.');

    // 3. Connect to Database using the new module
    try {
      await setupMongoose(ctx);
    } catch (err) {
      if (!USE_MOCK_DB) {
        // Only rethrow if we're not in mock mode
        throw err;
      }
    }

    // 4. Load Modules
    const modulesToLoad = [
        userModule, // Use the imported user module
        // profileModule, // Add profile module here when ready
        // journalModule, // Add journal module here when ready
    ];
    composeModules(ctx, modulesToLoad); // Load modules via the core loader
    ctx.logger.info(`[Main] ${modulesToLoad.length} modules loaded.`);

    // 5. Run Post-Load Lifecycle
    await appInstance.postLoad();
    ctx.logger.info('[Main] Module postLoad phase completed.');

    // 6. Compose GraphQL Schema
    const schema = composeSchema(ctx);
    ctx.logger.info('[Main] GraphQL schema composed.');
    // Optional: Print schema in dev
    // if (process.env.NODE_ENV === 'development') {
    //    const { printComposedSchema } = await import('@apolloos/devtools');
    //    printComposedSchema(schema);
    // }

    // 7. Setup Express and Apollo Server
    const expressApp = express();
    const httpServer = http.createServer(expressApp);

    // Setup Apollo Server
    const server = new ApolloServer({
      schema,
      plugins: [
        ApolloServerPluginDrainHttpServer({ httpServer }),
        // Add custom ApolloOS plugins
        createBasicLoggerPlugin({ logger: ctx.logger }), // Example logger plugin
        // Add other plugins (e.g., auth, tracing) here
      ],
      // You might want to customize introspection based on NODE_ENV
      introspection: process.env.NODE_ENV !== 'production',
    });

    await server.start();
    ctx.logger.info('[Main] Apollo Server started.');

    // Apply middleware
    expressApp.use(
      '/graphql', // Your GraphQL endpoint path
      cors(), // Configure CORS appropriately for production
      bodyParser.json(),
      // Apollo Server 4 requires context integration with the middleware
      expressMiddleware(server, {
        context: async ({ req }) => {
           // Return the request-specific context. We might create a request-scoped
           // version of our main context here if needed, e.g., adding req.user.
           // For now, just returning the already created context.
           // If context needs to be truly request-scoped, createContext might need refactoring.
           return await createContext({ req }); // Re-create context per request OR pass existing + req
        },
      }),
    );

    // Start the HTTP server
    let actualPort = PORT;
    let maxPortAttempts = USE_ALTERNATIVE_PORT ? 10 : 1;
    let attempts = 0;
    
    while (attempts < maxPortAttempts) {
      try {
        await new Promise((resolve, reject) => {
          const server = httpServer.listen({ port: actualPort }, resolve);
          server.on('error', (err) => {
            if (err.code === 'EADDRINUSE' && USE_ALTERNATIVE_PORT) {
              actualPort++;
              reject(err);
            } else {
              reject(err);
            }
          });
        });
        
        // If we reach here, the server started successfully
        ctx.logger.info(`🚀 ApolloOS Server ready at http://localhost:${actualPort}/graphql`);
        break;
      } catch (err) {
        if (err.code === 'EADDRINUSE' && USE_ALTERNATIVE_PORT) {
          attempts++;
          ctx.logger.warn(`Port ${actualPort-1} is in use. Trying port ${actualPort}...`);
        } else {
          throw err;
        }
      }
    }
    
    if (attempts >= maxPortAttempts) {
      throw new Error(`Could not find an available port after ${maxPortAttempts} attempts.`);
    }

    // Optional: Emit app:ready hook
    // ctx.app.hooks?.emit(HOOK_EVENTS.APP_READY, ctx);

  } catch (error) {
    // Log critical startup errors
    const logger = ctx?.logger || console; // Use context logger if available
    logger.error('[Main] 💥 Critical error during ApolloOS startup:', error);
    process.exit(1); // Exit if startup fails
  }
}

// Start the server
startApolloOS();