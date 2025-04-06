// modules/user/index.js
import {
  withModels,
  withTypeComposers,
  withResolvers,
  withHooks,
  withRelations,
  withInit
} from '../../config/module/composers.js';

import { userSchemas } from './schemas.js';
import { userResolvers } from './resolvers.js';
import { userHooks } from './hooks/userHooks.js';
import { userRelations } from './relations/userRelations.js';
import * as actions from './actions/index.js';
import * as validators from './validators/index.js';

import { pipe } from 'ramda';

const userInit = (ctx) => {
  ctx.logger?.info(`[User Module] Initialization complete.`);
};

export default function (ctx) {
  const moduleId = 'user';

  const composed = pipe(
    withModels(userSchemas),
    withTypeComposers(),
    withResolvers(userResolvers),
    withHooks(userHooks),
    withRelations(userRelations),
    withInit(userInit)
  )(ctx);

  return {
    id: moduleId,
    meta: {
      description: 'Handles user accounts, authentication, and authorization.',
      version: '1.0.0',
      dependsOn: [], // Add dependencies like 'profile' if needed
    },
    // Assets from functional composition
    typeComposers: composed.typeComposers,
    resolvers: composed.resolvers,
    models: composed.models,
    
    // Additional assets
    actions: actions,
    validators: validators,
    
    // Lifecycle functions (delegates to composers)
    onLoad: () => composed,
    hooks: userHooks,
    relations: userRelations,
    init: userInit
  };
}







