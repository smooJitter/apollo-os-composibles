// packages/resolver-utils/index.js
import { createAuthenticationError, createForbiddenError } from '@apolloos/error-utils';

/**
 * Wraps a resolver to ensure the user is authenticated.
 * Throws AuthenticationError if ctx.user is not present.
 * @param {Resolver} resolver - The graphql-compose resolver to wrap.
 * @returns {Resolver} The wrapped resolver.
 */
export const requireUser = (resolver) => {
  if (!resolver) return resolver; // Return unmodified if resolver is null/undefined

  return resolver.wrapResolve((next) => async (rp) => {
    // rp = resolveParams = { source, args, context, info }
    if (!rp.context.user) {
      throw createAuthenticationError('Authentication required to access this resource.');
    }
    // Check if user is active (example)
    if (!rp.context.user.active) {
      throw createForbiddenError('Account is inactive.');
    }
    return next(rp);
  });
};

/**
 * Wraps a resolver to ensure the authenticated user has one of the specified roles by name.
 * Throws AuthenticationError if no user, ForbiddenError if role mismatch.
 * @param {string | string[]} roles - A single role name or array of allowed role names.
 * @param {Resolver} resolver - The graphql-compose resolver to wrap.
 * @returns {Resolver} The wrapped resolver.
 */
export const requireRole = (roles, resolver) => {
  if (!resolver) return resolver;

  const requiredRoles = Array.isArray(roles) ? roles : [roles];
  if (requiredRoles.length === 0) {
    console.warn('[requireRole] No roles specified. This check will always pass.');
    return resolver; // Or throw an error if roles must be specified
  }

  return resolver.wrapResolve((next) => async (rp) => {
    const user = rp.context.user;
    if (!user) {
      throw createAuthenticationError('Authentication required.');
    }

    // Populate role if not already populated
    if (!user.role || (user.role && typeof user.role === 'string')) {
      await user.populate('role');
    }
    
    // Check if user has any of the required roles
    let hasRequiredRole = false;
    for (const roleName of requiredRoles) {
      if (await user.hasRole(roleName)) {
        hasRequiredRole = true;
        break;
      }
    }
    
    if (!hasRequiredRole) {
      throw createForbiddenError(
        `Forbidden. User does not have required role. Required roles: ${requiredRoles.join(', ')}`
      );
    }

    return next(rp);
  });
};

/**
 * Wraps a resolver to ensure the authenticated user has the specified permission.
 * Throws AuthenticationError if no user, ForbiddenError if permission missing.
 * @param {string | string[]} permissions - A single permission or array of permissions in format "module:action".
 * @param {Resolver} resolver - The graphql-compose resolver to wrap.
 * @returns {Resolver} The wrapped resolver.
 */
export const requirePermission = (permissions, resolver) => {
  if (!resolver) return resolver;

  const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];
  if (requiredPermissions.length === 0) {
    console.warn('[requirePermission] No permissions specified. This check will always pass.');
    return resolver;
  }

  return resolver.wrapResolve((next) => async (rp) => {
    const user = rp.context.user;
    if (!user) {
      throw createAuthenticationError('Authentication required.');
    }

    // Check if user has any of the required permissions
    for (const permission of requiredPermissions) {
      const hasPermission = await user.hasPermission(permission);
      if (!hasPermission) {
        throw createForbiddenError(
          `Forbidden. Missing required permission: ${permission}`
        );
      }
    }

    return next(rp);
  });
};

/**
 * Wraps a resolver to ensure the authenticated user is the owner of the resource.
 * @param {Function} getResourceOwnerId - Function to extract owner ID from resolve params.
 * @param {Resolver} resolver - The graphql-compose resolver to wrap.
 * @returns {Resolver} The wrapped resolver.
 */
export const requireOwnership = (getResourceOwnerId, resolver) => {
  if (!resolver) return resolver;
  if (typeof getResourceOwnerId !== 'function') {
    throw new Error('getResourceOwnerId must be a function');
  }

  return resolver.wrapResolve((next) => async (rp) => {
    const user = rp.context.user;
    if (!user) {
      throw createAuthenticationError('Authentication required.');
    }

    const ownerId = await getResourceOwnerId(rp);
    if (!ownerId) {
      throw createForbiddenError('Resource owner could not be determined.');
    }

    const userId = user.id || user._id.toString();
    if (ownerId.toString() !== userId) {
      throw createForbiddenError('You can only access your own resources.');
    }

    return next(rp);
  });
};

/**
 * Chains multiple resolver wrappers together.
 * Example: chainResolverWrappers(resolver, requireUser, requireRole('admin'))
 * @param {Resolver} resolver - The initial resolver.
 * @param  {...Function} wrappers - Functions that take a resolver and return a wrapped resolver.
 * @returns {Resolver} The final wrapped resolver.
 */
export const chainResolverWrappers = (resolver, ...wrappers) => {
  if (!resolver) return resolver;
  return wrappers.reduce((accResolver, wrapperFn) => {
    if (typeof wrapperFn !== 'function') {
      console.warn('[chainResolverWrappers] Encountered non-function wrapper, skipping.');
      return accResolver;
    }
    return wrapperFn(accResolver);
  }, resolver);
};

// Example: Higher-order function to create a role check wrapper
// This makes the usage slightly cleaner: requireRoleWrapper('admin')(resolver)
export const requireRoleWrapper = (roles) => (resolver) => {
  return requireRole(roles, resolver);
};

// --- Add more resolver utilities below ---
// E.g., logging, rate limiting (could use external libs), input validation integration

/**
 * Example: Logs resolver execution time.
 * @param {Resolver} resolver
 * @returns {Resolver}
 */
export const logResolverTime = (resolver) => {
  if (!resolver) return resolver;
  const resolverName = resolver.name || 'anonymousResolver';

  return resolver.wrapResolve((next) => async (rp) => {
    const start = Date.now();
    try {
      const result = await next(rp);
      const duration = Date.now() - start;
      rp.context.logger?.debug(`[Resolver Timer] ${resolverName} executed in ${duration}ms`);
      return result;
    } catch (err) {
      const duration = Date.now() - start;
      rp.context.logger?.error(`[Resolver Timer] ${resolverName} failed after ${duration}ms`, err);
      throw err;
    }
  });
};
