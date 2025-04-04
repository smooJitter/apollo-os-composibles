export default function createAuthTokenTC(AuthTokenModel, ctx) {
  const { composeWithMongoose, applyStandardTCConfig } = ctx.graphqlConfig;

  const AuthTokenTC = composeWithMongoose(AuthTokenModel, {
    // Only expose necessary fields
    fields: {
        only: ['_id', 'user', 'expiresAt', 'createdAt'], // Keep 'token' field private
    },
    // By default, remove standard CRUD resolvers for security
    // We will add specific resolvers/mutations for token management manually if needed
    removeFields: ['__v'],
    resolvers: {
        createOne: false,
        createMany: false,
        updateById: false,
        updateOne: false,
        updateMany: false,
        removeById: false,
        removeOne: false,
        removeMany: false,
        findById: false, // Maybe expose findById for admin/owner checks later
        findOne: false,
        findMany: false,
        count: false,
        pagination: false,
        connection: false,
    }
  });

  // Apply standard configurations
  applyStandardTCConfig?.(AuthTokenTC);

  // Add relation back to the User
  // Requires UserTC to be available in the schema composer
  AuthTokenTC.addRelation('owner', {
      resolver: () => ctx.graphqlRegistry?.typeComposers?.UserTC?.getResolver('findById'), // Use registry
      prepareArgs: {
          _id: (source) => source.user, // user field holds the ObjectId
      },
      projection: { user: true }, // Need the user field from AuthToken
  });

  // Add custom resolvers for token management if required, e.g., revokeToken
  // AuthTokenTC.addResolver({ ... });

  return AuthTokenTC;
} 