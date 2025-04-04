// config/graphql/globalRelations.js

/**
 * Optional: Define global relations between TypeComposers.
 * This function is called by ModuleComposer after all module TCs are registered.
 * @param {object} args
 * @param {SchemaComposer} args.schemaComposer - The global SchemaComposer instance.
 * @param {object} args.ctx - The application context.
 */
export function registerGlobalRelations({ schemaComposer, ctx }) {
  // Example:
  // const UserTC = schemaComposer.getOTC('UserTC');
  // const ProfileTC = schemaComposer.getOTC('ProfileTC');
  // if (UserTC && ProfileTC) {
  //   // Define relation logic here using UserTC.addRelation(...)
  // }

  // ctx.logger?.info('[GraphQL] Global relations registered.');
}
