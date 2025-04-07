import { pipe } from 'ramda';
import { Habit, applyContextPlugins } from './schemas.js';
import { initTypeComposers } from './registry.js';
import { initResolvers } from './resolvers.js';
import habitHooks from './hooks/habitHooks.js';
import habitRelations from './relations/habitRelations.js';
import { habitInit } from './init.js';
import { 
  createHabit, 
  markHabitCompleted, 
  getHabitStats, 
  getHabitsDueToday,
  addHabitTag,
  removeHabitTag,
  getHabitsByTag,
  getHabitTimeline,
  toggleHabitActiveStatus
} from './actions/index.js';

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
  Habit
};

// Static actions (no context required)
const actions = {
  createHabit,
  markHabitCompleted,
  getHabitStats,
  getHabitsDueToday,
  addHabitTag,
  removeHabitTag,
  getHabitsByTag,
  getHabitTimeline,
  toggleHabitActiveStatus
};

/**
 * Creates the habit module following functional composition pattern
 * @param {Object} ctx - Context object
 * @returns {Object} - Habit module
 */
export default function (ctx) {
  const moduleId = 'habit';
  
  // Apply context plugins first
  const contextModels = applyContextPlugins(ctx);
  
  // Register models in context immediately
  if (!ctx.models) ctx.models = {};
  ctx.models.Habit = Habit;
  
  // Apply functional composition pattern
  const composed = pipe(
    withModels(() => ({ ...models, ...contextModels })),
    withTypeComposers(() => initTypeComposers()),
    withResolvers(() => initResolvers()),
    withHooks(habitHooks),
    withRelations(habitRelations),
    withInit(habitInit),
    withActions(() => actions)
  )(ctx);

  return {
    id: moduleId,
    meta: {
      description: 'Manages user habits and tracking for habit formation',
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
    hooks: habitHooks,
    relations: habitRelations,
    init: habitInit
  };
} 