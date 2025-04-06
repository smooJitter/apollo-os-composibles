import { requireUser, requireRoleWrapper } from '@apolloos/resolver-utils';

/**
 * Applies security and other standard wrappers to UserTC resolvers.
 * This function will be called during the module's 'hooks' lifecycle phase.
 * @param {object} ctx - The ApolloOS context.
 */
export const userHooks = (ctx) => {
  // Try to get UserTC from module or directly from the app.modules
  const userModule = ctx.app?.getModule('user');
  let UserTC = userModule?.typeComposers?.UserTC;
  
  // If not found there, try to get it from schemaComposer
  if (!UserTC && ctx.graphqlRegistry?.typeComposers?.UserTC) {
    UserTC = ctx.graphqlRegistry.typeComposers.UserTC;
  }
  
  const logger = ctx.logger;

  if (!UserTC) {
    logger?.warn('[userHooks] UserTC not found. Cannot apply user resolver hooks.');
    return;
  }

  logger?.debug(`[userHooks] Applying hooks to UserTC resolvers.`);

  // Check if TC supports the wrapResolve method
  if (!UserTC.wrapResolve || typeof UserTC.wrapResolve !== 'function') {
    logger?.warn(
      '[userHooks] UserTC does not support wrapResolve method. This may be due to using mock implementations or initialization issues.'
    );
    return;
  }

  // --- Apply Wrappers ---

  // Secure standard CRUD operations
  // Only admins can list all users
  if (UserTC.hasResolver('findMany')) {
    UserTC.wrapResolve('findMany', requireRoleWrapper('admin'));
    logger?.debug(`[userHooks] Applied 'requireRole("admin")' to UserTC.findMany`);
  }

  // Users can only find themselves or admins can find anyone by ID
  if (UserTC.hasResolver('findById')) {
    UserTC.wrapResolve('findById', (next) => (rp) => {
      const { context, args } = rp;
      // Allow admin access or if user is requesting their own ID
      if (context.user?.role === 'admin' || context.user?.id === args._id?.toString()) {
        return next(rp);
      }
      throw ctx.errors.createForbiddenError(
        'You can only view your own profile or require admin privileges.'
      );
    });
    logger?.debug(`[userHooks] Applied custom access control to UserTC.findById`);
  }

  // Users can only update their own record (unless admin)
  if (UserTC.hasResolver('updateById')) {
    UserTC.wrapResolve('updateById', requireUser);
    UserTC.wrapResolve('updateById', (next) => (rp) => {
      const { context, args } = rp;
      if (context.user?.role === 'admin' || context.user?.id === args.record?._id?.toString()) {
        // Prevent changing role unless admin
        if (args.record?.role && context.user?.role !== 'admin') {
          throw ctx.errors.createForbiddenError('You cannot change your own role.');
        }
        return next(rp);
      }
      throw ctx.errors.createForbiddenError(
        'You can only update your own profile or require admin privileges.'
      );
    });
    logger?.debug(`[userHooks] Applied 'requireUser' and custom update logic to UserTC.updateById`);
  }

  // Only admins can delete users
  if (UserTC.hasResolver('removeById')) {
    UserTC.wrapResolve('removeById', requireRoleWrapper('admin'));
    logger?.debug(`[userHooks] Applied 'requireRole("admin")' to UserTC.removeById`);
  }

  // Secure the 'me' query
  if (UserTC.hasResolver('me')) {
    UserTC.wrapResolve('me', requireUser);
    logger?.debug(`[userHooks] Applied 'requireUser' to UserTC.me`);
  }
};

// Exporting the function directly as expected by the module lifecycle
export default userHooks;
