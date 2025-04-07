// ApolloOS Framework Entry Point
import express from 'express';
import http from 'http';
import bodyParser from 'body-parser';
import cors from 'cors';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Bluebird from 'bluebird';
// Import ApolloOS Core
import { App } from './core/App.js';
import createContext, { setGlobalAppInstance } from './core/context/createContext.js';
import { composeModules } from './core/ModuleLoader.js';
import { composeSchema } from './core/ModuleComposer.js';
import setupMongoose from './config/db/mongoose.js';
import { isProduction, config } from './config/environment.js';

// Import ApolloOS Utility Plugins (Example)
import { createBasicLoggerPlugin } from '@apolloos/plugin-utils';

// --- Import Application Modules ---
import userModule from './modules/user/index.js'; // Using relative path instead of alias
import userProfileModule from './modules/user-profile/index.js';
import subscriptionModule from './modules/subscription/index.js';
import journalModule from './modules/journal/index.js';
import journalEntryModule from './modules/journal-entry/index.js';
import affirmationModule from './modules/affirmation/index.js'; // Added affirmation module
import visionBoardModule from './modules/vision-board/index.js'; // Added vision board module
import habitModule from './modules/habit/index.js'; // Added habit module
import milestoneModule from './modules/milestone/index.js'; // Added milestone module
import manifestationModule from './modules/manifestation/index.js'; // Added manifestation module
import immersionModule from './modules/immersion/main.js'; // Added immersion module
import unifiedRecommendationsModule from './modules/unified-recommendations/main.js'; // Added unified recommendations module
import aiConversationModule from './modules/ai-conversation/main.js'; // Added AI conversation module
// import profileModule from '@modules/profile/index.js'; // Placeholder for later

// Load environment variables
dotenv.config();

// --- Configuration (Move to .env or config file later) ---
const PORT = parseInt(process.env.PORT || '4001', 10);
// Try alternative ports if main port is busy
const USE_ALTERNATIVE_PORT = process.env.USE_ALTERNATIVE_PORT === 'true' || true;
// To be safe, we keep this here for reference but use it in setupMongoose
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/apolloos_dev';
const USE_MOCK_DB = process.env.USE_MOCK_DB === 'true' || false;

// --- Main Application Bootstrap ---
async function startApolloOS() {
  let ctx;
  try {
    // 1. Create Application Context
    // Context creation might involve async operations (e.g., fetching initial config)
    ctx = await Bluebird.resolve(createContext());
    ctx.logger.info('[Main] Application context created.');

    // 2. Initialize App Instance
    // The App constructor now injects itself into the context (ctx.app)
    const appInstance = new App(ctx);
    setGlobalAppInstance(appInstance); // Set the app instance globally
    ctx.app = appInstance; // Ensure it's directly in this context
    ctx.logger.info('[Main] ApolloOS App initialized.');

    // 3. Connect to Database using the new module
    try {
      await Bluebird.resolve(setupMongoose(ctx));
    } catch (err) {
      if (!USE_MOCK_DB) {
        // Only rethrow if we're not in mock mode
        throw err;
      } else {
        ctx.logger.warn('[DB] Using mock database mode');
      }
    }

    // 4. Load Modules
    const modulesToLoad = ['user', 'user-profile', 'subscription', 'journal', 'journal-entry', 'affirmation', 'vision-board', 'habit', 'milestone', 'manifestation', 'immersion', 'unified-recommendations', 'ai-conversation'];
    // debug what modules are about to be loaded 
    console.log('[Main] Attempting to load modules:', modulesToLoad);

    try {
      for (const moduleId of modulesToLoad) {
        try {
          console.log(`[Main] Loading module ${moduleId}...`);
          const modulePath = `./modules/${moduleId}/index.js`;
          const moduleImport = await import(modulePath);
          const moduleInitializer = moduleImport.default;
          
          if (typeof moduleInitializer === 'function') {
            console.log(`[Main] ${moduleId} is a function, initializing...`);
            const module = moduleInitializer(ctx);
            
            // Register module's models to the global context if not already registered
            if (module.models) {
              console.log(`[Main] Registering models for module ${moduleId}:`, Object.keys(module.models));
              if (!ctx.models) ctx.models = {};
              Object.entries(module.models).forEach(([name, model]) => {
                ctx.models[name] = model;
              });
            }

            // Log the module's resolvers if available
            if (module.resolvers) {
              console.log(`[Main] Module ${moduleId} has resolvers:`, 
                Object.keys(module.resolvers.Query || {}), 
                Object.keys(module.resolvers.Mutation || {}));
            }
            
            ctx.app.modules.push(module);
          } else if (typeof moduleInitializer === 'object') {
            console.log(`[Main] ${moduleId} is an object, pushing directly...`);
            
            // Register module's models to the global context if not already registered
            if (moduleInitializer.models) {
              console.log(`[Main] Registering models for module ${moduleId}:`, Object.keys(moduleInitializer.models));
              if (!ctx.models) ctx.models = {};
              Object.entries(moduleInitializer.models).forEach(([name, model]) => {
                ctx.models[name] = model;
              });
            }
            
            ctx.app.modules.push(moduleInitializer);
          } else {
            console.error(`[Main] Module ${moduleId} has an invalid export type: ${typeof moduleInitializer}`);
          }
        } catch (moduleError) {
          console.error(`[Main] Error loading module ${moduleId}:`, moduleError);
        }
      }
      
      console.log('[Main] Loaded modules:', ctx.app.modules.map(m => m.id));
      console.log('[Main] Available models:', Object.keys(ctx.models || {}));

      // --- Manually add the subscription module ---
      // Update the approach for handling the subscription module
      try {
        // Initialize subscription module schema components
        console.log('[Main] Manually initializing subscription module schema components');
        
        // First ensure the subscription module is loaded
        const subscriptionModule = ctx.app.modules.find(m => m.id === 'subscription');
        
        if (!subscriptionModule) {
          console.warn('[Main] Subscription module not found in loaded modules');
        } else {
          console.log('[Main] Subscription module found, registering schemas');
          
          // Register the subscription module's schema components using the registry pattern
          if (ctx.graphqlRegistry && !ctx.graphqlRegistry.resolvers.subscription) {
            const { initResolvers } = await import('./modules/subscription/resolvers.js');
            const subscriptionResolvers = initResolvers();
            ctx.graphqlRegistry.resolvers.subscription = subscriptionResolvers;
            console.log('[Main] Registered subscription resolvers via registry pattern');
          }
        }
      } catch (subscriptionError) {
        console.error('[Main] Error registering subscription module:', subscriptionError);
      }
      
      // 5. Run Post-Load Lifecycle
      await Bluebird.resolve(appInstance.postLoad());
      ctx.logger.info('[Main] Module postLoad phase completed.');
      
      // 6. Compose GraphQL Schema
      const schema = composeSchema(ctx);
      
      // Manually register the subscription module's resolvers
      try {
        console.log('[Main] Setting up simplified subscription schema integration');
        
        // Import simplified schema
        const { typeDefs, resolvers } = await import('./modules/subscription/simpleSchema.js');
        
        // Merge simplified schema with main schema
        console.log('[Main] Adding subscription queries from simplified schema');
        
        // We'll integrate this schema directly with the Apollo server
        const subscriptionTypeDefs = typeDefs;
        const subscriptionResolvers = resolvers;
        
        console.log('[Main] Successfully prepared simplified subscription schema');
        
        // This will be added to the Apollo server configuration below
      } catch (error) {
        console.error('[Main] Error setting up simplified subscription schema:', error);
      }
      
      // 7. Setup Express and Apollo Server
      const expressApp = express();
      const httpServer = http.createServer(expressApp);

      // Setup Apollo Server
      const server = new ApolloServer({
        schema,
        typeDefs: [
          // Add the subscription typeDefs 
          (await import('./modules/subscription/simpleSchema.js')).typeDefs
        ],
        resolvers: [
          // Add the subscription resolvers
          (await import('./modules/subscription/simpleSchema.js')).resolvers
        ],
        plugins: [
          ApolloServerPluginDrainHttpServer({ httpServer }),
          // Add custom ApolloOS plugins
          createBasicLoggerPlugin({ logger: ctx.logger }), // Example logger plugin
          // Add other plugins (e.g., auth, tracing) here
        ],
        // You might want to customize introspection based on NODE_ENV
        introspection: process.env.NODE_ENV !== 'production',
      });

      await Bluebird.resolve(server.start());
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
            return await Bluebird.resolve(createContext({ req })); // Create context with the request
          },
        })
      );

      // Health check endpoint
      expressApp.get('/health', (req, res) => {
        res.status(200).json({ status: 'ok' });
      });

      // Development route
      expressApp.get('/', (req, res) => {
        res.send(`
          <html>
            <body>
              <h1>ApolloOS Framework</h1>
              <p>GraphQL endpoint: <a href="/graphql">/graphql</a></p>
            </body>
          </html>
        `);
      });

      // Start the HTTP server
      let actualPort = PORT;
      let maxPortAttempts = USE_ALTERNATIVE_PORT ? 10 : 1;
      let attempts = 0;

      while (attempts < maxPortAttempts) {
        try {
          await Bluebird.fromCallback((cb) => {
            const server = httpServer.listen({ port: actualPort }, cb);
            server.on('error', (err) => {
              if (err.code === 'EADDRINUSE' && USE_ALTERNATIVE_PORT) {
                actualPort++;
                cb(err);
              } else {
                cb(err);
              }
            });
          });

          // If we reach here, the server started successfully
          ctx.logger.info(`🚀 ApolloOS Server ready at http://localhost:${actualPort}/graphql`);
          console.log(`[Server] 🚀 GraphQL server running at http://localhost:${actualPort}/graphql`);
          console.log(`[Server] Environment: ${isProduction ? 'production' : 'development'}`);
          break;
        } catch (err) {
          if (err.code === 'EADDRINUSE' && USE_ALTERNATIVE_PORT) {
            attempts++;
            ctx.logger.warn(`Port ${actualPort - 1} is in use. Trying port ${actualPort}...`);
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
  } catch (error) {
    // Log critical startup errors
    const logger = ctx?.logger || console; // Use context logger if available
    logger.error('[Main] 💥 Critical error during ApolloOS startup:', error);
    process.exit(1); // Exit if startup fails
  }
}

// Start the server
startApolloOS();


