import { pipe } from 'ramda';
import { VisionBoard, Media, applyContextPlugins } from './schemas.js';
import { initTypeComposers } from './registry.js';
import { initResolvers } from './resolvers.js';
import visionBoardHooks from './hooks/visionBoardHooks.js';
import visionBoardRelations from './relations/visionBoardRelations.js';
import { visionBoardInit } from './init.js';
import { createVisionBoard, addVisionBoardItem } from './actions/index.js';

// Import functional composers
import {
  withModels,
  withTypeComposers,
  withResolvers,
  withHooks,
  withRelations,
  withInit,
  withActions
} from '../../config/module/composers.js';

// Static models (no context required)
const models = {
  VisionBoard,
  Media
};

// Static actions (no context required)
const actions = {
  createVisionBoard,
  addVisionBoardItem
};

/**
 * Creates the vision board module following functional composition pattern
 * @param {Object} ctx - Context object
 * @returns {Object} - Vision board module
 */
export default function (ctx) {
  const moduleId = 'vision-board';
  
  // Apply context plugins first
  const contextModels = applyContextPlugins(ctx);
  
  // Register models in context immediately
  if (!ctx.models) ctx.models = {};
  ctx.models.VisionBoard = VisionBoard;
  ctx.models.Media = Media;
  
  // Apply functional composition pattern
  const composed = pipe(
    withModels(() => ({ ...models, ...contextModels })),
    withTypeComposers(() => initTypeComposers()),
    withResolvers(() => initResolvers()),
    withHooks(visionBoardHooks),
    withRelations(visionBoardRelations),
    withInit(visionBoardInit),
    withActions(() => actions)
  )(ctx);

  return {
    id: moduleId,
    meta: {
      description: 'Handles user vision boards for goal visualization',
      version: '1.0.0',
      dependsOn: ['user'] 
    },
    // Assets from functional composition
    typeComposers: composed.typeComposers,
    resolvers: composed.resolvers,
    models: composed.models,
    actions: composed.actions,
    
    // Lifecycle functions (delegates to composers)
    onLoad: () => composed,
    hooks: visionBoardHooks,
    relations: visionBoardRelations,
    init: visionBoardInit
  };
} 