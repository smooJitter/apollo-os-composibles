// modules/user/index.js
import { GraphQLString, GraphQLBoolean } from 'graphql';

// Ultra-minimal module export
export default function (ctx) {
  console.log('[User Module] Creating ultra-minimal module');
  
  // Proper GraphQL resolvers with type definitions
  const resolvers = {
    Query: {
      userHealth: {
        type: 'JSON',
        description: 'Check if the user module is healthy',
        resolve: () => ({
          status: 'ok',
          message: 'User module is running',
          timestamp: new Date().toISOString()
        })
      }
    }
  };
  
  // Define type definitions
  const typeDefs = `
    scalar JSON
    
    extend type Query {
      userHealth: JSON!
    }
  `;
  
  // Return minimal module definition
  return {
    id: 'user',
    meta: {
      description: 'User management module',
      version: '1.0.0',
      dependsOn: [],
    },
    
    // Core properties
    resolvers,
    models: ctx.models || {},
    typeDefs,
    
    // Lifecycle method
    onLoad: () => ({
      resolvers,
      models: ctx.models || {},
      typeDefs
    })
  };
}







