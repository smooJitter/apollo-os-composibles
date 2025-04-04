import { requireUser, requireRoleWrapper } from '@packages/resolver-utils'; // Use alias

/**
 * Applies security and other standard wrappers to UserTC resolvers.
 * This function will be called during the module's 'hooks' lifecycle phase.
 * @param {object} ctx - The ApolloOS context.
 * @param {Array<object>} modules - Array of all loaded module definition objects (rarely needed here).
 */
export const userHooks = (ctx) => {
  const { UserTC, AuthTokenTC } = ctx.app.getModule('user')?.typeComposers || {};
  const logger = ctx.logger;

  if (!UserTC) {
    logger?.warn('[userHooks] UserTC not found. Cannot apply user resolver hooks.');
    return;
  }
  
  logger?.debug(`[userHooks] Applying hooks to UserTC resolvers.`);

  // --- Apply Wrappers --- 

  // Secure standard CRUD operations
  // Example: Only admins can list all users
  if (UserTC.hasResolver('findMany')) {
      UserTC.wrapResolve('findMany', requireRoleWrapper('admin')); // Using the HOF version
      logger?.debug(`[userHooks] Applied 'requireRole("admin")' to UserTC.findMany`);
  }
  
  // Example: Users can only find themselves or admins can find anyone by ID
  if (UserTC.hasResolver('findById')) {
      UserTC.wrapResolve('findById', next => rp => {
          const { context, args } = rp;
          // Allow admin access or if user is requesting their own ID
          if (context.user?.role === 'admin' || context.user?.id === args._id?.toString()) {
              return next(rp);
          }
          throw ctx.errors.createForbiddenError('You can only view your own profile or require admin privileges.');
      });
       logger?.debug(`[userHooks] Applied custom access control to UserTC.findById`);
  }
  
  // Example: Users can only update their own record (unless admin)
  if (UserTC.hasResolver('updateById')) {
      UserTC.wrapResolve('updateById', requireUser); // Must be logged in
      UserTC.wrapResolve('updateById', next => rp => {
          const { context, args } = rp;
          if (context.user?.role === 'admin' || context.user?.id === args.record?._id?.toString()) {
              // Add logic here to prevent changing role unless admin
              if (args.record?.role && context.user?.role !== 'admin') {
                  throw ctx.errors.createForbiddenError('You cannot change your own role.');
              }
              return next(rp);
          }
          throw ctx.errors.createForbiddenError('You can only update your own profile or require admin privileges.');
      });
      logger?.debug(`[userHooks] Applied 'requireUser' and custom update logic to UserTC.updateById`);
  }
  
  // Example: Only admins can delete users
  if (UserTC.hasResolver('removeById')) {
      UserTC.wrapResolve('removeById', requireRoleWrapper('admin'));
      logger?.debug(`[userHooks] Applied 'requireRole("admin")' to UserTC.removeById`);
  }
  
  // Secure the 'me' query (redundant if resolver already checks, but good practice)
  if (UserTC.hasResolver('me')) {
      UserTC.wrapResolve('me', requireUser);
      logger?.debug(`[userHooks] Applied 'requireUser' to UserTC.me`);
  }

  // Secure AuthToken resolvers if needed (usually done via user ownership)
  if (AuthTokenTC) {
      // Example: Secure a hypothetical 'myTokens' resolver
      // if (AuthTokenTC.hasResolver('findManyByUser')) {
      //     AuthTokenTC.wrapResolve('findManyByUser', requireUser);
      // }
  }
};

// Exporting the function directly as expected by the module lifecycle
export default userHooks; 