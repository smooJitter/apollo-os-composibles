import { pipe } from 'ramda';
import { Milestone } from './schemas.js';
import { initTypeComposers } from './registry.js';
import { initResolvers } from './resolvers.js';
import { milestoneRelations } from './relations/milestoneRelations.js';
import { milestoneHooks } from './hooks/milestoneHooks.js';
import milestoneInit from './init.js';
import * as milestoneActions from './actions/index.js';

// Static models and schemas
export { Milestone };

// Static actions
export const {
  createMilestone,
  updateMilestoneStatus,
  addSubMilestone,
  toggleSubMilestoneCompletion,
  updateMilestoneProgress,
  linkHabitsToMilestone
} = milestoneActions;

/**
 * MilestoneModule - Functional composition of milestone module components
 * @param {Object} options - Module options
 * @returns {Object} - Module interface
 */
export default function MilestoneModule(options = {}) {
  // Initialize contextPlugins with base context
  const contextPlugins = [
    // Register models
    (ctx) => {
      if (ctx.registerModel) {
        ctx.registerModel('Milestone', Milestone);
      }
      return ctx;
    }
  ];
  
  // Pipeline of module functionality
  const applyModule = pipe(
    // Initialize type composers
    (ctx) => {
      initTypeComposers();
      return ctx;
    },
    // Apply GraphQL resolvers
    initResolvers,
    // Apply relations
    milestoneRelations,
    // Apply hooks
    milestoneHooks,
    // Initialize module
    milestoneInit,
    // Add actions to context
    (ctx) => {
      ctx.actions = {
        ...ctx.actions,
        milestone: milestoneActions
      };
      return ctx;
    }
  );
  
  // Return module interface
  return {
    id: 'milestone',
    description: 'Milestone tracking and management module',
    version: '1.0.0',
    dependencies: ['user', 'habit'],
    contextPlugins,
    apply: applyModule,
    // Lifecycle hooks
    onStart: async (ctx) => {
      const logger = ctx.logger.child({ module: 'milestone-lifecycle' });
      logger.info('Milestone module starting');
      return ctx;
    },
    onStop: async (ctx) => {
      const logger = ctx.logger.child({ module: 'milestone-lifecycle' });
      logger.info('Milestone module stopping');
      return ctx;
    }
  };
} 