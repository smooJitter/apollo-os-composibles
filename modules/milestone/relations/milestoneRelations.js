import { getMilestoneTC } from '../registry.js';
import { Milestone } from '../schemas.js';

/**
 * Initialize relations between Milestone and User
 * @param {Object} ctx - Application context containing models and other dependencies
 * @returns {Object} ctx - Updated application context
 */
export const milestoneRelations = (ctx) => {
  const logger = ctx.logger.child({ module: 'milestone-relations' });
  
  try {
    logger.debug('Initializing milestone relations');
    
    const MilestoneTC = getMilestoneTC();
    const UserTC = ctx.typeComposers.UserTC;
    
    if (!UserTC) {
      throw new Error('UserTC not found in context');
    }
    
    // Add User to Milestone
    MilestoneTC.addRelation('user', {
      resolver: () => UserTC.getResolver('findById'),
      prepareArgs: {
        _id: (source) => source.userId
      },
      projection: { userId: true }
    });
    
    // Add Milestones to User
    UserTC.addRelation('milestones', {
      resolver: () => MilestoneTC.getResolver('findMany'),
      prepareArgs: {
        filter: (source) => ({ userId: source._id })
      },
      projection: { _id: true }
    });
    
    // Add Milestone stats to User
    UserTC.addFields({
      milestoneStats: {
        type: 'JSON',
        description: 'Statistics about user milestones',
        resolve: async (user) => {
          try {
            const userId = user._id;
            
            // Get total counts
            const total = await Milestone.countDocuments({ userId });
            const achieved = await Milestone.countDocuments({ 
              userId, 
              status: 'achieved' 
            });
            const inProgress = await Milestone.countDocuments({ 
              userId, 
              status: 'in_progress' 
            });
            
            // Get upcoming milestones (due in next 7 days)
            const today = new Date();
            const nextWeek = new Date();
            nextWeek.setDate(today.getDate() + 7);
            
            const upcoming = await Milestone.countDocuments({
              userId,
              targetDate: { $gte: today, $lte: nextWeek },
              status: { $nin: ['achieved', 'abandoned'] }
            });
            
            // Calculate completion rate
            const completionRate = total > 0 ? Math.round((achieved / total) * 100) : 0;
            
            return {
              total,
              achieved,
              inProgress,
              upcoming,
              completionRate
            };
          } catch (error) {
            logger.error('Error computing milestone stats for user:', error);
            return {
              total: 0,
              achieved: 0,
              inProgress: 0,
              upcoming: 0,
              completionRate: 0
            };
          }
        }
      }
    });
    
    // Add relation to query user's active milestones
    UserTC.addRelation('activeMilestones', {
      resolver: () => MilestoneTC.getResolver('findMany'),
      prepareArgs: {
        filter: (source) => ({ 
          userId: source._id,
          status: { $in: ['in_progress', 'at_risk', 'nearly_complete'] }
        }),
        sort: { targetDate: 1 }
      },
      projection: { _id: true }
    });
    
    // Add relation to get milestones related to habits
    UserTC.addRelation('habitMilestones', {
      resolver: () => MilestoneTC.getResolver('findMany'),
      prepareArgs: {
        filter: (source) => ({ 
          userId: source._id,
          milestoneType: 'habit_based'
        }),
        sort: { createdAt: -1 }
      },
      projection: { _id: true }
    });
    
    logger.debug('Milestone relations initialized successfully');
    return ctx;
  } catch (error) {
    logger.error('Error initializing milestone relations:', error);
    throw error;
  }
};

export default milestoneRelations; 