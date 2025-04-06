// modules/user/index.js
import { GraphQLString, GraphQLBoolean, GraphQLID } from 'graphql';
import * as R from 'ramda';
import { schemaComposer } from 'graphql-compose';
import { userSchemas } from './schemas.js';
import { initializeTypeComposers, getAll as getAllTypeComposers, getUserTC, getAuthPayloadTC } from './registry.js';
import { userActions } from './actions/index.js';

// Helper to attach resolvers directly to schemaComposer
const attachResolversToSchema = resolvers => {
  const { Query = {}, Mutation = {} } = resolvers;
  
  const attachFields = (typeComposer, fields) => {
    Object.entries(fields).forEach(([name, config]) => {
      typeComposer.addFields({ [name]: config });
    });
    return typeComposer;
  };
  
  if (Object.keys(Query).length && schemaComposer.has('Query')) {
    attachFields(schemaComposer.get('Query'), Query);
  }
  
  if (Object.keys(Mutation).length && schemaComposer.has('Mutation')) {
    attachFields(schemaComposer.get('Mutation'), Mutation);
  }
  
  return resolvers;
};

// Create user module - main factory function
const createUserModule = ctx => {
  console.log('[User Module] Creating user module with functional patterns');
  
  // Initialize models
  const models = {
    User: userSchemas.User
  };
  
  // Initialize TypeComposers and actions
  const initializeComponents = () => {
    // Initialize TypeComposers
    initializeTypeComposers();
    const typeComposers = getAllTypeComposers();
    const UserTC = getUserTC();
    const AuthPayloadTC = getAuthPayloadTC();
    
    // Initialize actions with dependency injection
    const actions = R.map(
      actionFn => actionFn({ models }),
      userActions
    );
    
    return { typeComposers, UserTC, AuthPayloadTC, actions };
  };
  
  // Create a resolver with proper error handling
  const createSafeResolver = (resolver, errorMessage = 'An error occurred') => 
    async (...args) => {
      try {
        return await resolver(...args);
      } catch (error) {
        console.error(`[User Resolver] ${errorMessage}:`, error);
        throw new Error(error.message || errorMessage);
      }
    };
  
  // Build GraphQL resolvers
  const buildResolvers = ({ UserTC, AuthPayloadTC, actions }) => {
    const resolvers = {
      Query: {
        // Health check resolver
        userHealth: {
          type: 'JSON',
          description: 'Check if the user module is healthy',
          resolve: () => ({
            status: 'ok',
            message: 'User module is running',
            timestamp: new Date().toISOString()
          })
        },
        
        // User resolvers
        userById: {
          type: UserTC,
          args: { id: 'ID!' },
          resolve: createSafeResolver(
            async (_, { id }) => {
              const user = await models.User.findById(id);
              if (!user) throw new Error('User not found');
              return user;
            },
            'Error fetching user by ID'
          )
        },
        
        userByUsername: {
          type: UserTC,
          args: { username: 'String!' },
          resolve: createSafeResolver(
            async (_, { username }) => {
              const user = await models.User.findOne({ username });
              if (!user) throw new Error('User not found');
              return user;
            },
            'Error fetching user by username'
          )
        },
        
        users: {
          type: [UserTC],
          resolve: createSafeResolver(
            async () => {
              const users = await models.User.find({});
              return users || [];
            },
            'Error fetching users'
          )
        }
      },
      
      Mutation: {
        // User mutations
        createUser: {
          type: UserTC,
          args: {
            username: 'String!',
            email: 'String!',
            password: 'String!',
            firstName: 'String',
            lastName: 'String',
            role: 'String'
          },
          resolve: createSafeResolver(
            async (_, args) => {
              const user = await actions.registerUser(args);
              console.log(`User created: ${user.username}`);
              return user;
            },
            'Error creating user'
          )
        },
        
        loginUser: {
          type: AuthPayloadTC,
          args: {
            username: 'String!',
            password: 'String!'
          },
          resolve: createSafeResolver(
            async (_, args) => {
              const result = await actions.loginUser(args);
              console.log(`User logged in: ${result.user.username}`);
              return result;
            },
            'Error during login'
          )
        },
        
        updateUser: {
          type: UserTC,
          args: {
            id: 'ID!',
            username: 'String',
            email: 'String',
            firstName: 'String',
            lastName: 'String',
            role: 'String',
            isActive: 'Boolean'
          },
          resolve: createSafeResolver(
            async (_, { id, ...updates }) => {
              const user = await models.User.findByIdAndUpdate(
                id, 
                updates, 
                { new: true, runValidators: true }
              );
              
              if (!user) throw new Error('User not found');
              return user;
            },
            'Error updating user'
          )
        },
        
        deleteUser: {
          type: 'Boolean',
          args: { id: 'ID!' },
          resolve: createSafeResolver(
            async (_, { id }) => {
              const result = await models.User.findByIdAndDelete(id);
              return !!result;
            },
            'Error deleting user'
          )
        }
      }
    };
    
    // Attach resolvers to schema
    attachResolversToSchema(resolvers);
    
    return resolvers;
  };
  
  // Build module configuration
  const buildModule = ({ typeComposers, actions }) => {
    // Define type definitions - minimal now since we're using schemaComposer
    const typeDefs = `
      scalar JSON
      
      extend type Query {
        userHealth: JSON!
      }
    `;
    
    return {
      id: 'user',
      meta: {
        description: 'User management module with functional patterns',
        version: '1.0.0',
        dependsOn: [],
      },
      
      // Core properties
      models,
      resolvers: buildResolvers({ UserTC: getUserTC(), AuthPayloadTC: getAuthPayloadTC(), actions }),
      typeDefs,
      typeComposers,
      actions,
      
      // Lifecycle method
      onLoad: () => ({
        models,
        resolvers: buildResolvers({ UserTC: getUserTC(), AuthPayloadTC: getAuthPayloadTC(), actions }),
        typeDefs,
        typeComposers,
        actions
      })
    };
  };
  
  // Compose the module using function composition
  return R.pipe(
    initializeComponents,
    buildModule
  )();
};

// Export the module factory
export default createUserModule;







