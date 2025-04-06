/**
 * User Module Role Configuration
 * 
 * Defines roles and role-related utilities specific to the user module.
 * This configuration can extend or override project-wide role definitions.
 */

// Import project-wide roles (allowing for override if needed)
import { ROLES as BASE_ROLES, ROLE_VALUES as BASE_ROLE_VALUES } from '../../../config/enums/roles.js';

// Module-specific roles (extend the base roles if needed)
export const ROLES = {
  ...BASE_ROLES,
  // Module-specific extensions
  // Example: GUEST: 'guest'
};

// All role values as an array
export const ROLE_VALUES = Object.values(ROLES);

/**
 * Check if a given role is valid
 * @param {string} role - Role to check
 * @returns {boolean} - Whether the role is valid
 */
export const isValidRole = (role) => ROLE_VALUES.includes(role);

/**
 * Get all roles at or above a certain permission level
 * @param {string} minRole - Minimum role level
 * @returns {Array<string>} - Array of role values
 */
export const getRolesAtOrAbove = (minRole) => {
  const roleHierarchy = [
    ROLES.USER,
    ROLES.MODERATOR,
    ROLES.ADMIN,
    ROLES.DEVELOPER
  ];
  
  const minIndex = roleHierarchy.indexOf(minRole);
  if (minIndex === -1) return [];
  
  return roleHierarchy.slice(minIndex);
};

/**
 * Check if a role meets minimum role requirement
 * @param {string} role - Role to check
 * @param {string} minRequiredRole - Minimum required role
 * @returns {boolean} - Whether role meets requirement
 */
export const meetsRoleRequirement = (role, minRequiredRole) => {
  return getRolesAtOrAbove(minRequiredRole).includes(role);
};

export default {
  ROLES,
  ROLE_VALUES,
  isValidRole,
  getRolesAtOrAbove,
  meetsRoleRequirement
}; 