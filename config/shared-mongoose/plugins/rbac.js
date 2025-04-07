/**
 * Role-Based Access Control (RBAC) Mongoose Plugin
 * 
 * This plugin adds robust role and permission management to schemas.
 * It supports:
 * - Multiple roles per user
 * - Permission inheritance
 * - Granular permission checking
 * - Module-specific permissions
 */

import mongoose from 'mongoose';
const { Schema } = mongoose;

/**
 * Role schema - Should be registered separately as a model
 */
export const roleSchema = new Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true 
  },
  description: { 
    type: String,
    default: '' 
  },
  // Permissions are stored as strings in format "module:action"
  // e.g., "user:read", "journal:write", "admin:*"
  permissions: [{ 
    type: String,
    validate: {
      validator: (value) => /^[a-zA-Z0-9-_]+:[a-zA-Z0-9-_*]+$/.test(value) || value === '*',
      message: 'Permission must be in format "module:action" or "*" for all permissions'
    }
  }],
  // Role metadata for UI display
  metadata: {
    label: String,
    color: String,
    icon: String,
    sortOrder: Number
  },
  // System roles can't be modified or deleted
  isSystem: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

/**
 * Role-based access control plugin for mongoose schemas
 * 
 * @param {Schema} schema - Mongoose schema to apply the plugin to
 * @param {Object} options - Plugin options
 * @param {Boolean} options.singleRole - Whether users can have only one role (default: false)
 * @param {String} options.roleRefPath - Path for role references (default: 'roles')
 * @param {Boolean} options.populateRoles - Whether to automatically populate roles on find (default: false)
 * @param {String} options.defaultRole - Default role for new documents (default: null)
 */
export function rbacPlugin(schema, options = {}) {
  // Set default options
  const {
    singleRole = false,
    roleRefPath = 'roles',
    populateRoles = false,
    defaultRole = null
  } = options;

  // Add roles field to schema based on configuration
  if (singleRole) {
    schema.add({
      [roleRefPath]: {
        type: Schema.Types.ObjectId,
        ref: 'Role',
        default: defaultRole
      }
    });
  } else {
    schema.add({
      [roleRefPath]: [{
        type: Schema.Types.ObjectId,
        ref: 'Role',
        default: defaultRole ? [defaultRole] : []
      }]
    });
  }
  
  // Add methods to check permissions
  
  /**
   * Check if entity has a specific permission
   * @param {String} permission - Permission to check in "module:action" format
   * @returns {Boolean} - Whether the entity has the permission
   */
  schema.methods.hasPermission = async function(permission) {
    const roleField = this[roleRefPath];
    
    // If roles aren't populated, populate them now
    let roles;
    if (!Array.isArray(roleField) && typeof roleField !== 'object') {
      // Need to populate first
      if (singleRole) {
        await this.populate(roleRefPath);
        roles = [this[roleRefPath]];
      } else {
        await this.populate(roleRefPath);
        roles = this[roleRefPath];
      }
    } else {
      // Already populated
      roles = singleRole ? [roleField] : roleField;
    }
    
    // Filter out any null/undefined roles
    roles = roles.filter(r => r);
    
    // Check for wildcard permission
    for (const role of roles) {
      if (role.permissions && (role.permissions.includes('*') || role.permissions.includes(permission))) {
        return true;
      }
      
      // Check for module-wide permission
      if (permission.includes(':')) {
        const [module] = permission.split(':');
        const moduleWildcard = `${module}:*`;
        if (role.permissions && role.permissions.includes(moduleWildcard)) {
          return true;
        }
      }
    }
    
    return false;
  };
  
  /**
   * Check if entity has all of the specified permissions
   * @param {String[]} permissions - Permissions to check
   * @returns {Boolean} - Whether the entity has all permissions
   */
  schema.methods.hasAllPermissions = async function(permissions) {
    for (const permission of permissions) {
      const hasPermission = await this.hasPermission(permission);
      if (!hasPermission) return false;
    }
    return true;
  };
  
  /**
   * Check if entity has any of the specified permissions
   * @param {String[]} permissions - Permissions to check
   * @returns {Boolean} - Whether the entity has any permission
   */
  schema.methods.hasAnyPermission = async function(permissions) {
    for (const permission of permissions) {
      const hasPermission = await this.hasPermission(permission);
      if (hasPermission) return true;
    }
    return false;
  };
  
  /**
   * Assign a role to the entity
   * @param {String|ObjectId} roleId - ID of the role to assign
   */
  schema.methods.assignRole = async function(roleId) {
    if (singleRole) {
      this[roleRefPath] = roleId;
    } else {
      if (!this[roleRefPath].includes(roleId)) {
        this[roleRefPath].push(roleId);
      }
    }
    return this.save();
  };
  
  /**
   * Remove a role from the entity
   * @param {String|ObjectId} roleId - ID of the role to remove
   */
  schema.methods.removeRole = async function(roleId) {
    if (singleRole) {
      if (String(this[roleRefPath]) === String(roleId)) {
        this[roleRefPath] = null;
      }
    } else {
      this[roleRefPath] = this[roleRefPath].filter(r => String(r) !== String(roleId));
    }
    return this.save();
  };
  
  /**
   * Set the entity's roles (replacing any existing ones)
   * @param {String|ObjectId|Array} roles - Role ID(s) to set
   */
  schema.methods.setRoles = async function(roles) {
    if (singleRole) {
      this[roleRefPath] = roles;
    } else {
      this[roleRefPath] = Array.isArray(roles) ? roles : [roles];
    }
    return this.save();
  };
  
  // Add hook to auto-populate roles if configured
  if (populateRoles) {
    schema.pre(['find', 'findOne'], function() {
      this.populate(roleRefPath);
    });
  }
}

export default rbacPlugin; 