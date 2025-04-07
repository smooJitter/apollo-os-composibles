import jwt from 'jsonwebtoken';

/**
 * Authentication middleware for Express
 * Validates JWT tokens and attaches user data to request
 * 
 * @param {Object} ctx - Application context with models
 * @returns {Function} Express middleware function
 */
export const createAuthMiddleware = (ctx) => {
  const UserModel = ctx.models.User;
  
  return async (req, res, next) => {
    try {
      // Get token from header
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        // No token, continue as unauthenticated
        return next();
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-key');
      
      // Get user from database with populated role
      const user = await UserModel.findById(decoded.id)
        .select('-password')
        .populate('role');

      if (!user || !user.active) {
        // Invalid user, continue as unauthenticated
        return next();
      }

      // Add user to request
      req.user = user;
      next();
    } catch (error) {
      // Any error means request continues as unauthenticated
      console.error(`[Auth Middleware] Error: ${error.message}`);
      next();
    }
  };
};

/**
 * Express middleware to require authentication
 * 
 * @param {Object} options - Configuration options
 * @returns {Function} Express middleware function
 */
export const requireAuth = (options = {}) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      });
    }
    next();
  };
};

/**
 * Express middleware to require a permission
 * 
 * @param {String} permission - Required permission in format "module:action"
 * @returns {Function} Express middleware function
 */
export const requirePermission = (permission) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      });
    }
    
    // Check user's permissions
    const hasPermission = await req.user.hasPermission(permission);
    
    if (!hasPermission) {
      return res.status(403).json({ 
        error: `Permission denied: ${permission}`,
        code: 'FORBIDDEN'
      });
    }
    
    next();
  };
};

/**
 * Express middleware to require a role by name
 * 
 * @param {String} roleName - Required role name
 * @returns {Function} Express middleware function
 */
export const requireRole = (roleName) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      });
    }
    
    // Check user's role
    const hasRole = await req.user.hasRole(roleName);
    
    if (!hasRole) {
      return res.status(403).json({ 
        error: `Role required: ${roleName}`,
        code: 'FORBIDDEN'
      });
    }
    
    next();
  };
};

export default createAuthMiddleware; 