import 'module-alias/register'; // Must be the first line

// main.js - ApolloOS Framework Entry Point
import http from 'http';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import mongoose from 'mongoose'; // Import mongoose

// Import ApolloOS Core
import { App } from './core/App.js';
import { createContext } from './core/context/createContext.js';
import { composeModules } from './core/ModuleLoader.js';
import { composeSchema } from './core/ModuleComposer.js';

// Import ApolloOS Utility Plugins (Example)
import { createBasicLoggerPlugin } from '@apolloos/plugin-utils';

// --- Configuration (Move to .env or config file later) ---
const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/apolloos_dev'; // Example URI

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

    // 3. Connect to Database (Example using Mongoose)
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    ctx.mongoose = mongoose; // Ensure mongoose instance is in context if not already added
    ctx.logger.info(`[Main] Connected to MongoDB: ${MONGODB_URI}`);
    // You could emit a 'db:connected' hook here if using the hooks package
    // ctx.app.hooks?.emit(HOOK_EVENTS.DB_CONNECTED, ctx);

    // 4. Load Modules
    // Dynamically import module definitions (adjust paths as needed)
    // We'll add real modules here later
    const userModuleDef = () => ({ id: 'user', onLoad: () => ctx.logger.info('User module loaded (placeholder)') }); // Placeholder
    // const profileModuleDef = await import('./modules/profile/index.js').then(m => m.default);
    // const journalModuleDef = await import('./modules/journal/index.js').then(m => m.default);

    const modulesToLoad = [
        userModuleDef, // Add real module imports here later
        // profileModuleDef, 
        // journalModuleDef,
    ];
    composeModules(ctx, modulesToLoad);
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
    await new Promise((resolve) => httpServer.listen({ port: PORT }, resolve));
    ctx.logger.info(`🚀 ApolloOS Server ready at http://localhost:${PORT}/graphql`);

    // Optional: Emit app:ready hook
    // ctx.app.hooks?.emit(HOOK_EVENTS.APP_READY, ctx);

  } catch (error) {
    // Log critical startup errors
    const logger = ctx?.logger || console; // Use context logger if available
    logger.error('[Main] 💥 Critical error during ApolloOS startup:', error);
    process.exit(1); // Exit if startup fails
  }
}

// Start the application
startApolloOS();