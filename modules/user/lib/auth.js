/**
 * Authentication and Authorization Utilities
 * 
 * This module provides helper functions for dealing with authentication
 * and authorization in a functional way.
 */
import { curry } from './helpers.js';

/**
 * Create an error with a specific authentication error code
 * 
 * @param {string} message - Error message
 * @param {string} code - Error code
 * @returns {Error} - Error object with code
 */
export const createAuthError = (message, code) => {
  const error = new Error(message);
  error.code = code;
  error.isAuthError = true;
  return error;
};

// Predefined auth errors
export const AUTH_ERRORS = {
  // Authentication errors
  NOT_AUTHENTICATED: () => createAuthError('You must be authenticated to perform this action', 'NOT_AUTHENTICATED'),
  INVALID_CREDENTIALS: () => createAuthError('Invalid email or password', 'INVALID_CREDENTIALS'),
  ACCOUNT_INACTIVE: () => createAuthError('Your account is inactive', 'ACCOUNT_INACTIVE'),
  TOKEN_EXPIRED: () => createAuthError('Your session has expired, please log in again', 'TOKEN_EXPIRED'),
  INVALID_TOKEN: () => createAuthError('Invalid authentication token', 'INVALID_TOKEN'),
  
  // Authorization errors
  NOT_AUTHORIZED: (action) => createAuthError(`You are not authorized to ${action || 'perform this action'}`, 'NOT_AUTHORIZED'),
  INSUFFICIENT_ROLE: (role) => createAuthError(`You need ${role} permissions to perform this action`, 'INSUFFICIENT_ROLE'),
};

/**
 * Higher-order function to require authentication
 * 
 * @param {Function} fn - Function to protect with authentication
 * @returns {Function} - Protected function that checks authentication
 */
export const requireAuth = (fn) => async (source, args, context, info) => {
  if (!context.user) {
    throw AUTH_ERRORS.NOT_AUTHENTICATED();
  }
  return fn(source, args, context, info);
};

/**
 * Higher-order function to require a specific user role
 * Curried to allow partial application
 * 
 * @param {string|Array} requiredRoles - Required role(s)
 * @param {Function} fn - Function to protect
 * @returns {Function} - Protected function that checks roles
 */
export const requireRole = curry((requiredRoles, fn) => {
  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  
  return requireAuth(async (source, args, context, info) => {
    const userRoles = context.user.roles || [context.user.role];
    
    const hasRequiredRole = roles.some(role => 
      userRoles.includes(role) || 
      (role === 'OWNER' && isResourceOwner(context.user, args))
    );
    
    if (!hasRequiredRole) {
      throw AUTH_ERRORS.INSUFFICIENT_ROLE(roles.join(' or '));
    }
    
    return fn(source, args, context, info);
  });
});

/**
 * Check if a user is the owner of a resource
 * Implement based on your resource ownership model
 * 
 * @param {Object} user - User object
 * @param {Object} args - Resolver arguments containing resource ID
 * @returns {boolean} - True if user is the resource owner
 */
export const isResourceOwner = (user, args) => {
  // Implement based on your resource ownership model
  // This is a placeholder implementation
  const resourceId = args.id || args.userId || (args.input && args.input.id);
  const userId = user.id || user._id;
  
  return resourceId && userId && String(resourceId) === String(userId);
};

/**
 * Create a resolver that combines multiple authorization checks
 * 
 * @param {...Function} authChecks - Authentication/authorization checks to apply
 * @returns {Function} - Function that applies all checks
 */
export const combineAuthChecks = (...authChecks) => (fn) => {
  return authChecks.reduceRight((acc, check) => check(acc), fn);
};

/**
 * Higher-order function to validate a JWT token from request headers
 * 
 * @param {Object} options - Options for token validation
 * @returns {Function} - Middleware function for token validation
 */
export const validateToken = (options = {}) => {
  return async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // Skip if no token (will result in unauthenticated request)
        return next();
      }
      
      const token = authHeader.split(' ')[1];
      
      // Get JWT utility from options or app
      const jwtUtil = options.jwt || req.app.jwt;
      if (!jwtUtil) {
        throw new Error('JWT utility not available');
      }
      
      // Verify token
      const decoded = jwtUtil.verify(
        token, 
        options.secret || process.env.JWT_SECRET || 'dev-secret-key'
      );
      
      // Attach user data to request
      req.user = decoded;
      
      next();
    } catch (error) {
      // Log but don't throw to allow unauthenticated access
      console.error('Token validation error:', error.message);
      next();
    }
  };
}; 