/**
 * Defines relations originating from the User module's TypeComposers.
 * This function is called during the module's 'relations' lifecycle phase.
 * @param {object} ctx - The ApolloOS context.
 * @param {Array<object>} modules - Array of all loaded module definition objects.
 */
export const userRelations = (ctx, modules) => {
  const { UserTC } = ctx.app.getModule('user')?.typeComposers || {};
  const logger = ctx.logger;

  if (!UserTC) {
    logger?.warn('[userRelations] UserTC not found. Cannot define user relations.');
    return;
  }

  logger?.debug(`[userRelations] Defining relations for UserTC.`);

  // --- Define Relations --- 

  // Example: Link User to UserProfile (assuming profile module exists)
  const ProfileTC = modules.find(m => m.id === 'profile')?.typeComposers?.UserProfileTC;
  
  if (ProfileTC) {
      if (!UserTC.hasField('profile')) {
          UserTC.addRelation('profile', {
              resolver: () => ProfileTC.getResolver('findOne'), // Assumes ProfileTC has findOne
              prepareArgs: {
                  // Find the profile where the profile's userId field matches the user's _id
                  filter: (source) => ({
                      userId: source._id 
                  }),
                  // Alternatively, if profile stores user _id directly:
                  // filter: (source) => ({ user: source._id })
              },
              projection: { _id: 1 }, // Need the user's _id to find the profile
              description: 'The profile associated with this user account.'
          });
          logger?.debug(`[userRelations] Added 'profile' relation from UserTC to ProfileTC.`);
      } else {
          logger?.debug(`[userRelations] Relation 'profile' already exists on UserTC.`);
      }
  } else {
      logger?.info('[userRelations] Profile module or UserProfileTC not found. Skipping User-Profile relation.');
  }

  // Example: Link User to their AuthTokens
  const AuthTokenTC = ctx.app.getModule('user')?.typeComposers?.AuthTokenTC;
  if (AuthTokenTC) {
      if (!UserTC.hasField('authTokens')) {
          UserTC.addRelation('authTokens', {
              resolver: () => AuthTokenTC.getResolver('findMany'), // Assumes findMany exists (might need custom)
              prepareArgs: {
                  filter: (source) => ({
                      user: source._id // Find tokens where the user field matches this user's ID
                  }),
                  // Add sorting, limiting if needed
                  // sort: { createdAt: -1 }
              },
              projection: { _id: 1 },
              description: 'Authentication tokens associated with this user.'
          });
          logger?.debug(`[userRelations] Added 'authTokens' relation from UserTC to AuthTokenTC.`);
      } else {
           logger?.debug(`[userRelations] Relation 'authTokens' already exists on UserTC.`);
      }
  }

  // Add other relations originating from UserTC here
};

// Exporting the function directly as expected by the module lifecycle
export default userRelations; 