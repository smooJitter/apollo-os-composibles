/**
 * Defines relations originating from the User module's TypeComposers.
 * This function is called during the module's 'relations' lifecycle phase.
 * @param {object} ctx - The ApolloOS context.
 * @param {Array<object>} modules - Array of all loaded module definition objects.
 */
export const userRelations = (ctx, modules) => {
  // Try to get UserTC from module or directly from the app.modules
  const userModule = ctx.app?.getModule('user');
  let UserTC = userModule?.typeComposers?.UserTC;
  
  // If not found there, try to get it from schemaComposer
  if (!UserTC && ctx.graphqlRegistry?.typeComposers?.UserTC) {
    UserTC = ctx.graphqlRegistry.typeComposers.UserTC;
  }
  
  const logger = ctx.logger;

  if (!UserTC) {
    logger?.warn('[userRelations] UserTC not found. Cannot define user relations.');
    return;
  }

  logger?.debug(`[userRelations] Defining relations for UserTC.`);

  // --- Define Relations ---

  // Link User to UserProfile (assuming profile module exists)
  const ProfileTC = modules.find((m) => m.id === 'profile')?.typeComposers?.UserProfileTC;

  if (ProfileTC) {
    if (!UserTC.hasField('profile')) {
      UserTC.addRelation('profile', {
        resolver: () => ProfileTC.getResolver('findOne'),
        prepareArgs: {
          filter: (source) => ({
            userId: source._id,
          }),
        },
        projection: { _id: 1 },
        description: 'The profile associated with this user account.',
      });
      logger?.debug(`[userRelations] Added 'profile' relation from UserTC to ProfileTC.`);
    } else {
      logger?.debug(`[userRelations] Relation 'profile' already exists on UserTC.`);
    }
  } else {
    logger?.info(
      '[userRelations] Profile module or UserProfileTC not found. Skipping User-Profile relation.'
    );
  }
};

// Exporting the function directly as expected by the module lifecycle
export default userRelations;
