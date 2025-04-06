// modules/user/schemas.js
import createUserModel from './models/userModel.js';
import createAuthTokenModel from './models/authTokenModel.js';

export const userSchemas = {
  User: (ctx) => createUserModel({
    enums: { roles: ctx.enums.roles },
    sharedMongoose: { plugins: ctx.sharedMongoose.plugins }
  }),
  
  AuthToken: (ctx) => createAuthTokenModel({
    enums: { roles: ctx.enums.roles },
    sharedMongoose: { plugins: ctx.sharedMongoose.plugins }
  })
}; 