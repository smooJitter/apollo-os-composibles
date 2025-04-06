// modules/user/index.js
import { GraphQLString, GraphQLBoolean, GraphQLID, GraphQLList, GraphQLNonNull } from 'graphql';
import * as R from 'ramda';
import { schemaComposer } from 'graphql-compose';
import { userSchemas } from './schemas.js';
import { initializeTypeComposers, getAll as getAllTypeComposers, getUserTC, getAuthPayloadTC } from './registry.js';
import { userActions } from './actions/index.js';

// Helper to attach resolvers directly to schemaComposer
const attachResolvers = (resolvers) => {
  const { Query, Mutation } = resolvers;
  
  // Process query resolvers
  if (Query && schemaComposer.has('Query')) {
    const QueryTC = schemaComposer.get('Query');
    Object.entries(Query).forEach(([name, config]) => {
      QueryTC.addFields({ [name]: config });
    });
  }
  
  // Process mutation resolvers
  if (Mutation && schemaComposer.has('Mutation')) {
    const MutationTC = schemaComposer.get('Mutation');
    Object.entries(Mutation).forEach(([name, config]) => {
      MutationTC.addFields({ [name]: config });
    });
  }
  
  return resolvers;
};

// Helper for creating async resolvers with composition
const composeAsyncResolver = (...fns) => async (...args) => {
  let result = args;
  for (const fn of fns) {
    result = await fn(...result);
  }
  return result;
};

// User module export - function that creates module components
export default function (ctx) {
  console.log('[User Module] Creating user module with functional programming patterns');
  
  // Initialize models
  const models = {
    User: userSchemas.User
  };
  
  // Initialize TypeComposers - must happen before resolvers are defined
  initializeTypeComposers();
  const typeComposers = getAllTypeComposers();
  const UserTC = getUserTC();
  const AuthPayloadTC = getAuthPayloadTC();
  
  // Initialize actions with models using dependency injection
  const actions = R.map(
    actionFn => actionFn({ models }),
    userActions
  );
  
  // Define GraphQL resolvers
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
        resolve: async (_, { id }) => {
          const user = await models.User.findById(id);
          if (!user) {
            throw new Error('User not found');
          }
          return user;
        }
      },
      
      userByUsername: {
        type: UserTC,
        args: { username: 'String!' },
        resolve: async (_, { username }) => {
          const user = await models.User.findOne({ username });
          if (!user) {
            throw new Error('User not found');
          }
          return user;
        }
      },
      
      users: {
        type: [UserTC],
        resolve: async () => {
          const users = await models.User.find({});
          return users || [];
        }
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
        resolve: async (_, args) => {
          const user = await actions.registerUser(args);
          console.log(`User created: ${user.username}`);
          return user;
        }
      },
      
      loginUser: {
        type: AuthPayloadTC,
        args: {
          username: 'String!',
          password: 'String!'
        },
        resolve: async (_, args) => {
          const result = await actions.loginUser(args);
          console.log(`User logged in: ${result.user.username}`);
          return result;
        }
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
        resolve: async (_, { id, ...updates }) => {
          const user = await models.User.findByIdAndUpdate(
            id, 
            updates, 
            { new: true, runValidators: true }
          );
          
          if (!user) {
            throw new Error('User not found');
          }
          
          return user;
        }
      },
      
      deleteUser: {
        type: 'Boolean',
        args: { id: 'ID!' },
        resolve: async (_, { id }) => {
          const result = await models.User.findByIdAndDelete(id);
          return !!result;
        }
      }
    }
  };
  
  // Attach resolvers to schema
  attachResolvers(resolvers);
  
  // Define type definitions - minimal now since we're using schemaComposer
  const typeDefs = `
    scalar JSON
    
    extend type Query {
      userHealth: JSON!
    }
  `;
  
  // Return module definition using functional programming
  return R.applySpec({
    id: R.always('user'),
    meta: R.always({
      description: 'User management module with FP patterns',
      version: '1.0.0',
      dependsOn: [],
    }),
    
    // Core properties
    models: R.always(models),
    resolvers: R.always(resolvers),
    typeDefs: R.always(typeDefs),
    typeComposers: R.always(typeComposers),
    actions: R.always(actions),
    
    // Lifecycle method
    onLoad: R.always(() => ({
      models,
      resolvers,
      typeDefs,
      typeComposers,
      actions
    }))
  })();
}







