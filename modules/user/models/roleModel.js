import mongoose from 'mongoose';
import { roleSchema } from '../../../config/shared-mongoose/plugins/rbac.js';

/**
 * Create and export the Role model
 * @param {Object} ctx - Application context
 * @returns {Object} Mongoose Role model
 */
export default function createRoleModel(ctx) {
  const { timestamps } = ctx.sharedMongoose.plugins;
  
  // Apply additional plugins
  roleSchema.plugin(timestamps);
  
  // Define static methods for the Role model
  
  /**
   * Create a new role with the specified permissions
   * @param {String} name - Role name
   * @param {Array<String>} permissions - Array of permissions
   * @param {Object} metadata - Role metadata (label, color, icon)
   * @returns {Promise<Object>} - The created role
   */
  roleSchema.statics.createRole = async function(name, permissions = [], metadata = {}, isSystem = false) {
    return this.create({
      name,
      permissions,
      metadata,
      isSystem
    });
  };
  
  /**
   * Get or create a role by name
   * @param {String} name - Role name
   * @param {Array<String>} permissions - Default permissions if created
   * @returns {Promise<Object>} - The role
   */
  roleSchema.statics.getOrCreate = async function(name, permissions = [], metadata = {}) {
    let role = await this.findOne({ name });
    if (!role) {
      role = await this.createRole(name, permissions, metadata);
    }
    return role;
  };
  
  /**
   * Initialize default system roles
   * @returns {Promise<Array>} - Array of created roles
   */
  roleSchema.statics.initializeDefaultRoles = async function() {
    const defaultRoles = [
      {
        name: 'admin',
        permissions: ['*'], // Admin has all permissions
        metadata: {
          label: 'Administrator',
          color: '#e53935',
          icon: '🛡️',
          sortOrder: 100
        },
        isSystem: true
      },
      {
        name: 'user',
        permissions: [
          'user:read',
          'user-profile:read',
          'user-profile:write',
          'journal:read',
          'journal:write',
          'journal-entry:read',
          'journal-entry:write'
        ],
        metadata: {
          label: 'User',
          color: '#1e88e5',
          icon: '👤',
          sortOrder: 10
        },
        isSystem: true
      },
      {
        name: 'moderator',
        permissions: [
          'user:read',
          'user-profile:read',
          'journal:read',
          'journal-entry:read',
          'moderation:*'
        ],
        metadata: {
          label: 'Moderator',
          color: '#7cb342',
          icon: '👮',
          sortOrder: 50
        },
        isSystem: true
      },
      {
        name: 'developer',
        permissions: ['*', 'debug:*'],
        metadata: {
          label: 'Developer',
          color: '#6200ea',
          icon: '👨‍💻',
          sortOrder: 200
        },
        isSystem: true
      }
    ];
    
    // Use Promise.all to create all roles concurrently
    return Promise.all(
      defaultRoles.map(async (roleData) => {
        const { name, permissions, metadata, isSystem } = roleData;
        return this.getOrCreate(name, permissions, metadata, isSystem);
      })
    );
  };
  
  // Create the model (or get existing)
  return mongoose.models.Role || mongoose.model('Role', roleSchema);
} 