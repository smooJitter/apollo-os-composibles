/**
 * User Module Resolvers - Simplified
 */

import * as R from 'ramda';
import { getUserTC, getAuthPayloadTC } from './typeComposer/userTC.js';
import { getRoleTC } from './typeComposer/roleTC.js';
import { createSafeResolver } from './lib/resolverHelpers.js';

/**
 * Initialize GraphQL resolvers for the User module
 * @param {Object} params - Parameters object
 * @returns {Object} - Object containing query and mutation resolvers
 */
export const createUserResolvers = (params = {}) => {
  try {
    console.log('[User Module] Creating user GraphQL resolvers', params);

    // Get the type composers
    const UserTC = getUserTC();
    const AuthPayloadTC = getAuthPayloadTC();

    // Define resolvers
    const queries = {
      me: UserTC.getResolver('me'),
      userById: UserTC.getResolver('findById'),
      users: UserTC.getResolver('findMany'),
    };

    const mutations = {
      register: UserTC.getResolver('register'),
      login: UserTC.getResolver('login'),
    };

    return {
      Query: { ...queries },
      Mutation: { ...mutations },
    };
  } catch (error) {
    console.error('[User Module] Error creating resolvers:', error);
    return {
      Query: {},
      Mutation: {},
    };
  }
};

/**
 * Create GraphQL resolvers for the User module
 * 
 * @param {Object} param0 - Dependencies
 * @returns {Object} - GraphQL resolvers
 */
export const userResolvers = ({ models, actions, validators }) => {
  console.log('[User Module] Creating user GraphQL resolvers', { 
    hasModels: !!models, 
    modelKeys: Object.keys(models || {}),
    actionKeys: Object.keys(actions || {})
  });
  
  // Get TypeComposers from registry
  const UserTC = getUserTC();
  let AuthPayloadTC, RoleTC;
  
  try {
    AuthPayloadTC = getAuthPayloadTC();
  } catch (error) {
    console.warn(`[User Resolvers] Error getting AuthPayloadTC: ${error.message}`);
    AuthPayloadTC = null;
  }
  
  try {
    RoleTC = getRoleTC();
  } catch (error) {
    console.warn(`[User Resolvers] Error getting RoleTC: ${error.message}`);
    RoleTC = null;
  }
  
  // Define resolvers
  return {
    Query: {
      // Simple boolean health check
      isUserModuleHealthy: {
        type: 'Boolean!',
        description: 'Simple boolean check if the user module is healthy',
        resolve: () => true
      },
      
      // JSON health check information
      userHealth: {
        type: 'JSON',
        description: 'Check if the user module is healthy with detailed information',
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
            const user = await models.User.findById(id).populate('role');
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
            const user = await models.User.findOne({ username }).populate('role');
            if (!user) throw new Error('User not found');
            return user;
          },
          'Error fetching user by username'
        )
      },
      
      me: UserTC.getResolver('me'),
      
      // Role resolvers
      roles: RoleTC?.getResolver('roles') || null,
      roleById: RoleTC?.getResolver('roleById') || null,
      roleByName: RoleTC?.getResolver('roleByName') || null,
    },
    
    Mutation: {
      // Authentication mutations
      register: UserTC.getResolver('register'),
      login: UserTC.getResolver('login'),
      
      // User mutations
      assignRole: UserTC.getResolver('assignRole'),
      
      // Role mutations
      createRole: RoleTC?.getResolver('createRole') || null,
      updateRole: RoleTC?.getResolver('updateRole') || null,
      deleteRole: RoleTC?.getResolver('deleteRole') || null,
      
      // System initialization
      initializeDefaultRoles: RoleTC?.getResolver('initializeDefaultRoles') || null,
      
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
          async (_, args, ctx) => {
            // Initialize the register function with our models
            const registerFn = actions.registerAction({ models });
            const user = await registerFn(args);
            console.log(`User created: ${user.username}`);
            return user;
          },
          'Error creating user'
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
}; 