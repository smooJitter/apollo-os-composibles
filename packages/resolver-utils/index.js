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

  return resolver.wrapResolve(next => async (rp) => {
    // rp = resolveParams = { source, args, context, info }
    if (!rp.context.user) {
      throw createAuthenticationError('Authentication required to access this resource.');
    }
    // Check if user is active (example)
    // if (!rp.context.user.active) {
    //   throw createForbiddenError('Account is inactive.');
    // }
    return next(rp);
  });
};

/**
 * Wraps a resolver to ensure the authenticated user has one of the specified roles.
 * Throws AuthenticationError if no user, ForbiddenError if role mismatch.
 * @param {string | string[]} roles - A single role or array of allowed roles.
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

  return resolver.wrapResolve(next => async (rp) => {
    const user = rp.context.user;
    if (!user) {
      throw createAuthenticationError('Authentication required.');
    }

    const userRole = user.role; // Assuming user object has a 'role' property
    if (!userRole || !requiredRoles.includes(userRole)) {
      throw createForbiddenError(`Forbidden. User role '${userRole || 'none'}' does not have permission. Required roles: ${requiredRoles.join(', ')}`);
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
    
    return resolver.wrapResolve(next => async (rp) => {
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
