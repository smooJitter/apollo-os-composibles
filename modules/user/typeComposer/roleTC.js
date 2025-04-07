import { schemaComposer } from 'graphql-compose';
import { composeWithMongoose } from 'graphql-compose-mongoose';
import { getUserTC } from './userTC.js';

// Keep track of the RoleTC
let RoleTC;

/**
 * Creates and initializes the Role type composer
 * @param {Object} ctx - Application context
 * @returns {Object} - The initialized RoleTC
 */
export const createRoleTC = (ctx) => {
  if (RoleTC) return RoleTC;
  
  // Get the Role model from context
  const RoleModel = ctx.models.Role;
  if (!RoleModel) {
    throw new Error('Role model not available in context');
  }
  
  // Create the TypeComposer for Role
  RoleTC = composeWithMongoose(RoleModel, {
    name: 'Role',
    fields: {
      remove: ['__v'],
    }
  });
  
  // Add Resolvers for Role
  
  // Get all roles
  RoleTC.addResolver({
    name: 'roles',
    type: [RoleTC],
    resolve: async () => {
      return await RoleModel.find();
    }
  });
  
  // Get role by ID
  RoleTC.addResolver({
    name: 'roleById',
    type: RoleTC,
    args: { id: 'MongoID!' },
    resolve: async ({ args }) => {
      const role = await RoleModel.findById(args.id);
      if (!role) throw new Error('Role not found');
      return role;
    }
  });
  
  // Get role by name
  RoleTC.addResolver({
    name: 'roleByName',
    type: RoleTC,
    args: { name: 'String!' },
    resolve: async ({ args }) => {
      const role = await RoleModel.findOne({ name: args.name });
      if (!role) throw new Error('Role not found');
      return role;
    }
  });
  
  // Create role
  RoleTC.addResolver({
    name: 'createRole',
    type: RoleTC,
    args: {
      name: 'String!',
      description: 'String',
      permissions: ['String']
    },
    resolve: async ({ args }) => {
      const existingRole = await RoleModel.findOne({ name: args.name });
      if (existingRole) {
        throw new Error(`Role with name "${args.name}" already exists`);
      }
      
      const role = new RoleModel(args);
      await role.save();
      return role;
    }
  });
  
  // Update role
  RoleTC.addResolver({
    name: 'updateRole',
    type: RoleTC,
    args: {
      id: 'MongoID!',
      name: 'String',
      description: 'String',
      permissions: ['String']
    },
    resolve: async ({ args }) => {
      const { id, ...updates } = args;
      
      // Check if name is being updated to a name that already exists
      if (updates.name) {
        const existingRole = await RoleModel.findOne({ 
          name: updates.name,
          _id: { $ne: id }
        });
        
        if (existingRole) {
          throw new Error(`Role with name "${updates.name}" already exists`);
        }
      }
      
      const role = await RoleModel.findByIdAndUpdate(
        id,
        updates,
        { new: true, runValidators: true }
      );
      
      if (!role) throw new Error('Role not found');
      return role;
    }
  });
  
  // Delete role
  RoleTC.addResolver({
    name: 'deleteRole',
    type: 'Boolean',
    args: { id: 'MongoID!' },
    resolve: async ({ args }) => {
      // Prevent deletion of built-in roles
      const role = await RoleModel.findById(args.id);
      if (!role) throw new Error('Role not found');
      
      if (['admin', 'user'].includes(role.name)) {
        throw new Error(`Cannot delete built-in role: ${role.name}`);
      }
      
      const result = await RoleModel.deleteOne({ _id: args.id });
      return result.deletedCount > 0;
    }
  });
  
  // Initialize default roles
  RoleTC.addResolver({
    name: 'initializeDefaultRoles',
    type: [RoleTC],
    resolve: async () => {
      return await RoleModel.initializeDefaultRoles();
    }
  });
  
  // Add a resolver for assigning a role to a user
  RoleTC.addResolver({
    name: 'assignRole',
    type: () => getUserTC(),
    args: {
      userId: 'MongoID!',
      roleId: 'MongoID!'
    },
    resolve: async ({ args, context }) => {
      const { userId, roleId } = args;
      
      // Find the user and role
      const UserModel = context.models.User;
      const user = await UserModel.findById(userId);
      if (!user) throw new Error('User not found');
      
      const role = await RoleModel.findById(roleId);
      if (!role) throw new Error('Role not found');
      
      // Assign the role to the user
      user.role = role._id;
      await user.save();
      
      return user;
    }
  });
  
  return RoleTC;
};

/**
 * Helper function to get the RoleTC
 * @returns {Object} The Role TypeComposer
 */
export const getRoleTC = () => {
  if (!RoleTC) {
    throw new Error('RoleTC is not yet initialized. Call createRoleTC first.');
  }
  return RoleTC;
};

export default createRoleTC; 