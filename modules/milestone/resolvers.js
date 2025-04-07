import { schemaComposer } from 'graphql-compose';
import { getMilestoneTC, getMilestoneInputTC, getSubMilestoneInputTC } from './registry.js';
import { Milestone } from './schemas.js';
import { STATUS_ENUMS, TYPE_ENUMS } from './constants.js';

// Initialize resolvers
export const initResolvers = (ctx) => {
  const logger = ctx.logger.child({ module: 'milestone-resolvers' });
  const MilestoneTC = getMilestoneTC();

  try {
    // ---- QUERY RESOLVERS ----
    
    // Get milestone by ID
    schemaComposer.Query.addFields({
      milestoneById: MilestoneTC.getResolver('findById')
    });
    
    // Get all milestones for current user
    schemaComposer.Query.addFields({
      myMilestones: {
        type: [MilestoneTC],
        args: {
          status: ['String'],
          type: ['String'],
          tags: ['String'],
          limit: 'Int',
          skip: 'Int',
          sortBy: 'String',
          sortOrder: 'String'
        },
        resolve: async (_, args, context) => {
          try {
            if (!context.user || !context.user._id) {
              throw new Error('Authentication required');
            }
            
            const filter = { userId: context.user._id };
            
            if (args.status && args.status.length > 0) {
              filter.status = { $in: args.status };
            }
            
            if (args.type && args.type.length > 0) {
              filter.milestoneType = { $in: args.type };
            }
            
            if (args.tags && args.tags.length > 0) {
              filter['metadata.tags'] = { $in: args.tags };
            }
            
            const options = {
              limit: args.limit || 100,
              skip: args.skip || 0
            };
            
            if (args.sortBy) {
              options.sort = {
                [args.sortBy]: args.sortOrder === 'desc' ? -1 : 1
              };
            } else {
              options.sort = { createdAt: -1 };
            }
            
            return await Milestone.find(filter, null, options);
          } catch (error) {
            logger.error('Error getting myMilestones:', error);
            throw error;
          }
        }
      }
    });
    
    // Get milestone statistics for user
    schemaComposer.Query.addFields({
      milestoneStats: {
        type: 'JSON',
        resolve: async (_, args, context) => {
          try {
            if (!context.user || !context.user._id) {
              throw new Error('Authentication required');
            }
            
            const userId = context.user._id;
            
            // Get counts by status
            const statusCounts = await Promise.all(
              STATUS_ENUMS.map(async (status) => {
                const count = await Milestone.countDocuments({
                  userId,
                  status
                });
                return { status, count };
              })
            );
            
            // Get counts by type
            const typeCounts = await Promise.all(
              TYPE_ENUMS.map(async (type) => {
                const count = await Milestone.countDocuments({
                  userId,
                  milestoneType: type
                });
                return { type, count };
              })
            );
            
            // Get completion rate
            const totalMilestones = await Milestone.countDocuments({ userId });
            const completedMilestones = await Milestone.countDocuments({ 
              userId, 
              status: 'achieved' 
            });
            const completionRate = totalMilestones > 0 
              ? (completedMilestones / totalMilestones) * 100 
              : 0;
            
            // Get milestones due soon
            const today = new Date();
            const nextWeek = new Date();
            nextWeek.setDate(today.getDate() + 7);
            
            const dueSoon = await Milestone.countDocuments({
              userId,
              targetDate: { $gte: today, $lte: nextWeek },
              status: { $nin: ['achieved', 'abandoned'] }
            });
            
            return {
              total: totalMilestones,
              completed: completedMilestones,
              completionRate: Math.round(completionRate * 10) / 10,
              dueSoon,
              byStatus: statusCounts,
              byType: typeCounts
            };
          } catch (error) {
            logger.error('Error getting milestoneStats:', error);
            throw error;
          }
        }
      }
    });
    
    // ---- MUTATION RESOLVERS ----
    
    // Create milestone
    schemaComposer.Mutation.addFields({
      createMilestone: {
        type: MilestoneTC,
        args: {
          input: getMilestoneInputTC()
        },
        resolve: async (_, { input }, context) => {
          try {
            if (!context.user || !context.user._id) {
              throw new Error('Authentication required');
            }
            
            logger.debug('Creating milestone with input:', input);
            
            const milestoneData = {
              ...input,
              userId: context.user._id,
              status: input.status || 'planned'
            };
            
            // Initialize progressPercentage if submilestones exist
            if (input.subMilestones && input.subMilestones.length > 0) {
              const completedCount = input.subMilestones.filter(sm => sm.completed).length;
              milestoneData.progressPercentage = 
                (completedCount / input.subMilestones.length) * 100;
            }
            
            const milestone = new Milestone(milestoneData);
            await milestone.save();
            
            return milestone;
          } catch (error) {
            logger.error('Error creating milestone:', error);
            throw error;
          }
        }
      }
    });
    
    // Update milestone
    schemaComposer.Mutation.addFields({
      updateMilestone: {
        type: MilestoneTC,
        args: {
          id: 'MongoID!',
          input: getMilestoneInputTC()
        },
        resolve: async (_, { id, input }, context) => {
          try {
            if (!context.user || !context.user._id) {
              throw new Error('Authentication required');
            }
            
            const milestone = await Milestone.findOne({
              _id: id,
              userId: context.user._id
            });
            
            if (!milestone) {
              throw new Error('Milestone not found or access denied');
            }
            
            // Update fields
            Object.keys(input).forEach(key => {
              milestone[key] = input[key];
            });
            
            await milestone.save();
            return milestone;
          } catch (error) {
            logger.error('Error updating milestone:', error);
            throw error;
          }
        }
      }
    });
    
    // Update milestone status
    schemaComposer.Mutation.addFields({
      updateMilestoneStatus: {
        type: MilestoneTC,
        args: {
          id: 'MongoID!',
          status: 'String!',
          statusNote: 'String'
        },
        resolve: async (_, { id, status, statusNote }, context) => {
          try {
            if (!context.user || !context.user._id) {
              throw new Error('Authentication required');
            }
            
            const milestone = await Milestone.findOne({
              _id: id,
              userId: context.user._id
            });
            
            if (!milestone) {
              throw new Error('Milestone not found or access denied');
            }
            
            // Check if status is valid
            if (!STATUS_ENUMS.includes(status)) {
              throw new Error(`Invalid status: ${status}`);
            }
            
            // Check if transition is allowed
            if (!milestone.canTransitionTo(status)) {
              throw new Error(`Cannot transition from ${milestone.status} to ${status}`);
            }
            
            // Set status with note
            await milestone.setStatus(status, statusNote);
            
            // If milestone achieved, set completedDate
            if (status === 'achieved' && !milestone.completedDate) {
              milestone.completedDate = new Date();
            }
            
            await milestone.save();
            return milestone;
          } catch (error) {
            logger.error('Error updating milestone status:', error);
            throw error;
          }
        }
      }
    });
    
    // Update sub-milestone
    schemaComposer.Mutation.addFields({
      updateSubMilestone: {
        type: MilestoneTC,
        args: {
          milestoneId: 'MongoID!',
          subMilestoneId: 'MongoID!',
          input: getSubMilestoneInputTC()
        },
        resolve: async (_, { milestoneId, subMilestoneId, input }, context) => {
          try {
            if (!context.user || !context.user._id) {
              throw new Error('Authentication required');
            }
            
            const milestone = await Milestone.findOne({
              _id: milestoneId,
              userId: context.user._id
            });
            
            if (!milestone) {
              throw new Error('Milestone not found or access denied');
            }
            
            const subMilestoneIdx = milestone.subMilestones.findIndex(
              sm => sm._id.toString() === subMilestoneId.toString()
            );
            
            if (subMilestoneIdx === -1) {
              throw new Error('Sub-milestone not found');
            }
            
            // Update sub-milestone
            Object.keys(input).forEach(key => {
              milestone.subMilestones[subMilestoneIdx][key] = input[key];
            });
            
            // Recalculate progress
            const completedCount = milestone.subMilestones.filter(sm => sm.completed).length;
            milestone.progressPercentage = 
              (completedCount / milestone.subMilestones.length) * 100;
            
            await milestone.save();
            return milestone;
          } catch (error) {
            logger.error('Error updating sub-milestone:', error);
            throw error;
          }
        }
      }
    });
    
    // Add sub-milestone
    schemaComposer.Mutation.addFields({
      addSubMilestone: {
        type: MilestoneTC,
        args: {
          milestoneId: 'MongoID!',
          input: getSubMilestoneInputTC()
        },
        resolve: async (_, { milestoneId, input }, context) => {
          try {
            if (!context.user || !context.user._id) {
              throw new Error('Authentication required');
            }
            
            const milestone = await Milestone.findOne({
              _id: milestoneId,
              userId: context.user._id
            });
            
            if (!milestone) {
              throw new Error('Milestone not found or access denied');
            }
            
            if (!milestone.subMilestones) {
              milestone.subMilestones = [];
            }
            
            // Add sub-milestone
            milestone.subMilestones.push({
              ...input,
              completed: input.completed || false,
              order: input.order || milestone.subMilestones.length
            });
            
            // Recalculate progress
            const completedCount = milestone.subMilestones.filter(sm => sm.completed).length;
            milestone.progressPercentage = 
              (completedCount / milestone.subMilestones.length) * 100;
            
            await milestone.save();
            return milestone;
          } catch (error) {
            logger.error('Error adding sub-milestone:', error);
            throw error;
          }
        }
      }
    });
    
    // Delete milestone
    schemaComposer.Mutation.addFields({
      deleteMilestone: {
        type: 'Boolean',
        args: {
          id: 'MongoID!'
        },
        resolve: async (_, { id }, context) => {
          try {
            if (!context.user || !context.user._id) {
              throw new Error('Authentication required');
            }
            
            const result = await Milestone.deleteOne({
              _id: id,
              userId: context.user._id
            });
            
            return result.deletedCount > 0;
          } catch (error) {
            logger.error('Error deleting milestone:', error);
            throw error;
          }
        }
      }
    });
    
    // The returning ctx for the next pipe
    return ctx;
  } catch (error) {
    logger.error('Error in milestone resolvers initialization:', error);
    throw error;
  }
};

export default initResolvers; 