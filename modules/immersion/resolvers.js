import { schemaComposer } from 'graphql-compose';
import { 
  getImmersionTC, 
  getImmersionInputTC,
  getUserProgressInputTC,
  getMediaItemInputTC 
} from './registry.js';
import { Immersion } from './schemas.js';
import { TYPE_ENUMS } from './constants.js';
import mongoose from 'mongoose';

// Initialize resolvers
export const initResolvers = (ctx) => {
  const logger = ctx.logger.child({ module: 'immersion-resolvers' });
  const ImmersionTC = getImmersionTC();

  try {
    // ---- QUERY RESOLVERS ----
    
    // Get immersion by ID
    schemaComposer.Query.addFields({
      immersionById: ImmersionTC.getResolver('findById')
    });
    
    // Get all immersions for current user
    schemaComposer.Query.addFields({
      myImmersions: {
        type: [ImmersionTC],
        args: {
          type: ['String'],
          tags: ['String'],
          lifeAreas: ['String'],
          isFeatured: 'Boolean',
          isCompleted: 'Boolean',
          search: 'String',
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
            
            // Apply filtering criteria
            if (args.type && args.type.length > 0) {
              filter.type = { $in: args.type };
            }
            
            if (args.tags && args.tags.length > 0) {
              filter['tags.name'] = { $in: args.tags };
            }
            
            if (args.lifeAreas && args.lifeAreas.length > 0) {
              filter['metadata.lifeAreas'] = { $in: args.lifeAreas };
            }
            
            if (args.isFeatured !== undefined) {
              filter['metadata.isFeatured'] = args.isFeatured;
            }
            
            // Filtering by completion status requires more complex logic
            if (args.isCompleted !== undefined) {
              filter['userProgress'] = {
                $elemMatch: {
                  userId: context.user._id,
                  isCompleted: args.isCompleted
                }
              };
            }
            
            // Text search
            if (args.search) {
              filter.$or = [
                { title: { $regex: args.search, $options: 'i' } },
                { description: { $regex: args.search, $options: 'i' } },
                { 'tags.name': { $regex: args.search, $options: 'i' } }
              ];
            }
            
            // Pagination and sorting
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
            
            return await Immersion.find(filter, null, options);
          } catch (error) {
            logger.error('Error getting myImmersions:', error);
            throw error;
          }
        }
      }
    });
    
    // Get public immersions
    schemaComposer.Query.addFields({
      publicImmersions: {
        type: [ImmersionTC],
        args: {
          type: ['String'],
          targetAudience: ['String'],
          difficulty: ['String'],
          search: 'String',
          limit: 'Int',
          skip: 'Int',
          sortBy: 'String'
        },
        resolve: async (_, args) => {
          try {
            const filter = { 'metadata.isPublic': true };
            
            // Apply filtering criteria
            if (args.type && args.type.length > 0) {
              filter.type = { $in: args.type };
            }
            
            if (args.targetAudience && args.targetAudience.length > 0) {
              filter.targetAudience = { $in: args.targetAudience };
            }
            
            if (args.difficulty && args.difficulty.length > 0) {
              filter['metadata.difficulty'] = { $in: args.difficulty };
            }
            
            // Text search
            if (args.search) {
              filter.$or = [
                { title: { $regex: args.search, $options: 'i' } },
                { description: { $regex: args.search, $options: 'i' } }
              ];
            }
            
            // Pagination and sorting
            const options = {
              limit: args.limit || 20,
              skip: args.skip || 0
            };
            
            if (args.sortBy === 'rating') {
              options.sort = { 'engagementMetrics.userRatings.average': -1 };
            } else if (args.sortBy === 'popular') {
              options.sort = { 'engagementMetrics.completedCount': -1 };
            } else {
              options.sort = { createdAt: -1 }; // default to newest
            }
            
            return await Immersion.find(filter, null, options);
          } catch (error) {
            logger.error('Error getting publicImmersions:', error);
            throw error;
          }
        }
      }
    });
    
    // Get immersions by type
    schemaComposer.Query.addFields({
      immersionsByType: {
        type: [ImmersionTC],
        args: {
          type: 'String!',
          limit: 'Int'
        },
        resolve: async (_, args, context) => {
          try {
            if (!context.user || !context.user._id) {
              throw new Error('Authentication required');
            }
            
            const filter = { 
              type: args.type,
              $or: [
                { userId: context.user._id },
                { 'metadata.isPublic': true }
              ]
            };
            
            const options = {
              limit: args.limit || 10,
              sort: { createdAt: -1 }
            };
            
            return await Immersion.find(filter, null, options);
          } catch (error) {
            logger.error('Error getting immersionsByType:', error);
            throw error;
          }
        }
      }
    });
    
    // Get featured immersions for current user
    schemaComposer.Query.addFields({
      featuredImmersions: {
        type: [ImmersionTC],
        args: {
          limit: 'Int'
        },
        resolve: async (_, args, context) => {
          try {
            if (!context.user || !context.user._id) {
              throw new Error('Authentication required');
            }
            
            const filter = { 
              $or: [
                { 
                  userId: context.user._id,
                  'metadata.isFeatured': true
                },
                {
                  'metadata.isPublic': true,
                  'metadata.isFeatured': true
                }
              ]
            };
            
            const options = {
              limit: args.limit || 5,
              sort: { createdAt: -1 }
            };
            
            return await Immersion.find(filter, null, options);
          } catch (error) {
            logger.error('Error getting featuredImmersions:', error);
            throw error;
          }
        }
      }
    });
    
    // Get immersion statistics
    schemaComposer.Query.addFields({
      immersionStats: {
        type: 'JSON',
        resolve: async (_, args, context) => {
          try {
            if (!context.user || !context.user._id) {
              throw new Error('Authentication required');
            }
            
            const userId = context.user._id;
            
            // Get counts by type
            const typeCounts = await Promise.all(
              TYPE_ENUMS.map(async (type) => {
                const count = await Immersion.countDocuments({
                  userId,
                  type
                });
                return { type, count };
              })
            );
            
            // Get user completion stats
            const userImmersions = await Immersion.find({ userId });
            
            const completedCount = userImmersions.filter(immersion => 
              immersion.userProgress && 
              immersion.userProgress.some(progress => 
                progress.userId.toString() === userId.toString() && 
                progress.isCompleted
              )
            ).length;
            
            // Calculate total session time across all immersions
            let totalSessionTime = 0;
            let totalSessions = 0;
            
            userImmersions.forEach(immersion => {
              const userProgress = immersion.userProgress && 
                immersion.userProgress.find(progress => 
                  progress.userId.toString() === userId.toString()
                );
              
              if (userProgress && userProgress.sessionDurations) {
                userProgress.sessionDurations.forEach(session => {
                  if (session.duration) {
                    totalSessionTime += session.duration;
                    totalSessions++;
                  }
                });
              }
            });
            
            // Get total created by this user
            const createdCount = userImmersions.length;
            
            // Get public immersions count
            const publicCount = await Immersion.countDocuments({
              'metadata.isPublic': true
            });
            
            return {
              created: createdCount,
              started: userImmersions.filter(immersion => 
                immersion.userProgress && 
                immersion.userProgress.some(progress => 
                  progress.userId.toString() === userId.toString()
                )
              ).length,
              completed: completedCount,
              completionRate: createdCount > 0 ? Math.round((completedCount / createdCount) * 100) : 0,
              totalSessionTime,
              averageSessionTime: totalSessions > 0 ? Math.round(totalSessionTime / totalSessions) : 0,
              sessionCount: totalSessions,
              byType: typeCounts,
              publicCount
            };
          } catch (error) {
            logger.error('Error getting immersionStats:', error);
            throw error;
          }
        }
      }
    });
    
    // Get recommended immersions based on user activity
    schemaComposer.Query.addFields({
      recommendedImmersions: {
        type: [ImmersionTC],
        args: {
          limit: 'Int'
        },
        resolve: async (_, args, context) => {
          try {
            if (!context.user || !context.user._id) {
              throw new Error('Authentication required');
            }
            
            const userId = context.user._id;
            const limit = args.limit || 5;
            
            // Find immersions the user has completed and rated highly
            const userProgressData = await Immersion.aggregate([
              {
                $match: {
                  userProgress: {
                    $elemMatch: {
                      userId: mongoose.Types.ObjectId(userId),
                      isCompleted: true,
                      rating: { $gte: 4 }
                    }
                  }
                }
              },
              {
                $project: {
                  _id: 1,
                  type: 1,
                  tags: 1,
                  'metadata.lifeAreas': 1
                }
              }
            ]);
            
            // If the user hasn't completed any immersions, return popular public ones
            if (userProgressData.length === 0) {
              return await Immersion.find({
                'metadata.isPublic': true
              })
              .sort({
                'engagementMetrics.userRatings.average': -1
              })
              .limit(limit);
            }
            
            // Extract types, tags, and life areas the user has shown interest in
            const preferredTypes = new Set();
            const preferredTags = new Set();
            const preferredLifeAreas = new Set();
            
            userProgressData.forEach(immersion => {
              preferredTypes.add(immersion.type);
              
              if (immersion.tags) {
                immersion.tags.forEach(tag => {
                  preferredTags.add(tag.name);
                });
              }
              
              if (immersion.metadata && immersion.metadata.lifeAreas) {
                immersion.metadata.lifeAreas.forEach(area => {
                  preferredLifeAreas.add(area);
                });
              }
            });
            
            // Find immersions matching the user's preferences
            // that they haven't started yet
            const completedImmersionIds = userProgressData.map(i => i._id);
            
            const filter = {
              _id: { $nin: completedImmersionIds },
              $or: [
                { userId: userId },
                { 'metadata.isPublic': true }
              ],
              $or: [
                { type: { $in: Array.from(preferredTypes) } },
                { 'tags.name': { $in: Array.from(preferredTags) } },
                { 'metadata.lifeAreas': { $in: Array.from(preferredLifeAreas) } }
              ]
            };
            
            return await Immersion.find(filter)
              .sort({ createdAt: -1 })
              .limit(limit);
          } catch (error) {
            logger.error('Error getting recommendedImmersions:', error);
            throw error;
          }
        }
      }
    });
    
    // ---- MUTATION RESOLVERS ----
    
    // Create immersion
    schemaComposer.Mutation.addFields({
      createImmersion: {
        type: ImmersionTC,
        args: {
          input: getImmersionInputTC()
        },
        resolve: async (_, { input }, context) => {
          try {
            if (!context.user || !context.user._id) {
              throw new Error('Authentication required');
            }
            
            logger.debug('Creating immersion with input:', input);
            
            const immersionData = {
              ...input,
              userId: context.user._id
            };
            
            const immersion = new Immersion(immersionData);
            await immersion.save();
            
            // Emit event
            if (ctx.events) {
              ctx.events.emit('immersion:created', {
                userId: context.user._id,
                immersionId: immersion._id,
                immersion
              });
            }
            
            return immersion;
          } catch (error) {
            logger.error('Error creating immersion:', error);
            throw error;
          }
        }
      }
    });
    
    // Update immersion
    schemaComposer.Mutation.addFields({
      updateImmersion: {
        type: ImmersionTC,
        args: {
          id: 'MongoID!',
          input: getImmersionInputTC()
        },
        resolve: async (_, { id, input }, context) => {
          try {
            if (!context.user || !context.user._id) {
              throw new Error('Authentication required');
            }
            
            const immersion = await Immersion.findOne({
              _id: id,
              userId: context.user._id
            });
            
            if (!immersion) {
              throw new Error('Immersion not found or access denied');
            }
            
            // Update fields
            Object.keys(input).forEach(key => {
              immersion[key] = input[key];
            });
            
            await immersion.save();
            
            // Emit update event
            if (ctx.events) {
              ctx.events.emit('immersion:updated', {
                userId: context.user._id,
                immersionId: immersion._id,
                immersion
              });
            }
            
            return immersion;
          } catch (error) {
            logger.error('Error updating immersion:', error);
            throw error;
          }
        }
      }
    });
    
    // Update user progress
    schemaComposer.Mutation.addFields({
      updateImmersionProgress: {
        type: ImmersionTC,
        args: {
          immersionId: 'MongoID!',
          progress: getUserProgressInputTC()
        },
        resolve: async (_, { immersionId, progress }, context) => {
          try {
            if (!context.user || !context.user._id) {
              throw new Error('Authentication required');
            }
            
            const immersion = await Immersion.findById(immersionId);
            
            if (!immersion) {
              throw new Error('Immersion not found');
            }
            
            // Use the schema method to update progress
            immersion.addUserProgress(context.user._id, progress);
            
            await immersion.save();
            
            // Emit progress update event
            if (ctx.events) {
              ctx.events.emit('immersion:progressUpdated', {
                userId: context.user._id,
                immersionId: immersion._id,
                progress
              });
              
              // If the immersion was completed, emit completed event
              if (progress.isCompleted) {
                ctx.events.emit('immersion:completed', {
                  userId: context.user._id,
                  immersionId: immersion._id,
                  rating: progress.rating,
                  effectiveness: progress.effectiveness,
                  feedback: progress.feedback
                });
              }
            }
            
            return immersion;
          } catch (error) {
            logger.error('Error updating immersion progress:', error);
            throw error;
          }
        }
      }
    });
    
    // Add media to immersion
    schemaComposer.Mutation.addFields({
      addImmersionMedia: {
        type: ImmersionTC,
        args: {
          immersionId: 'MongoID!',
          media: getMediaItemInputTC()
        },
        resolve: async (_, { immersionId, media }, context) => {
          try {
            if (!context.user || !context.user._id) {
              throw new Error('Authentication required');
            }
            
            const immersion = await Immersion.findOne({
              _id: immersionId,
              userId: context.user._id
            });
            
            if (!immersion) {
              throw new Error('Immersion not found or access denied');
            }
            
            // Add media using schema method
            immersion.addMediaItem(media);
            
            await immersion.save();
            
            // Emit event
            if (ctx.events) {
              ctx.events.emit('immersion:mediaAdded', {
                userId: context.user._id,
                immersionId: immersion._id,
                media
              });
            }
            
            return immersion;
          } catch (error) {
            logger.error('Error adding immersion media:', error);
            throw error;
          }
        }
      }
    });
    
    // Link to manifestation
    schemaComposer.Mutation.addFields({
      linkImmersionToManifestation: {
        type: ImmersionTC,
        args: {
          immersionId: 'MongoID!',
          manifestationId: 'MongoID!'
        },
        resolve: async (_, { immersionId, manifestationId }, context) => {
          try {
            if (!context.user || !context.user._id) {
              throw new Error('Authentication required');
            }
            
            const immersion = await Immersion.findOne({
              _id: immersionId,
              $or: [
                { userId: context.user._id },
                { 'metadata.isPublic': true }
              ]
            });
            
            if (!immersion) {
              throw new Error('Immersion not found or access denied');
            }
            
            // Check if user owns the manifestation
            const Manifestation = ctx.models.Manifestation;
            if (!Manifestation) {
              throw new Error('Manifestation module not available');
            }
            
            const manifestation = await Manifestation.findOne({
              _id: manifestationId,
              userId: context.user._id
            });
            
            if (!manifestation) {
              throw new Error('Manifestation not found or access denied');
            }
            
            // Link immersion to manifestation
            immersion.linkToManifestation(manifestationId);
            
            await immersion.save();
            
            // Emit event
            if (ctx.events) {
              ctx.events.emit('immersion:linkedToManifestation', {
                userId: context.user._id,
                immersionId: immersion._id,
                manifestationId
              });
            }
            
            return immersion;
          } catch (error) {
            logger.error('Error linking immersion to manifestation:', error);
            throw error;
          }
        }
      }
    });
    
    // Toggle featured status
    schemaComposer.Mutation.addFields({
      toggleImmersionFeatured: {
        type: ImmersionTC,
        args: {
          id: 'MongoID!'
        },
        resolve: async (_, { id }, context) => {
          try {
            if (!context.user || !context.user._id) {
              throw new Error('Authentication required');
            }
            
            const immersion = await Immersion.findOne({
              _id: id,
              userId: context.user._id
            });
            
            if (!immersion) {
              throw new Error('Immersion not found or access denied');
            }
            
            // Initialize metadata if doesn't exist
            if (!immersion.metadata) {
              immersion.metadata = {};
            }
            
            // Toggle featured status
            immersion.metadata.isFeatured = !immersion.metadata.isFeatured;
            
            await immersion.save();
            
            return immersion;
          } catch (error) {
            logger.error('Error toggling immersion featured status:', error);
            throw error;
          }
        }
      }
    });
    
    // Delete immersion
    schemaComposer.Mutation.addFields({
      deleteImmersion: {
        type: 'Boolean',
        args: {
          id: 'MongoID!'
        },
        resolve: async (_, { id }, context) => {
          try {
            if (!context.user || !context.user._id) {
              throw new Error('Authentication required');
            }
            
            const result = await Immersion.deleteOne({
              _id: id,
              userId: context.user._id
            });
            
            // Emit event if deleted
            if (result.deletedCount > 0 && ctx.events) {
              ctx.events.emit('immersion:deleted', {
                userId: context.user._id,
                immersionId: id
              });
            }
            
            return result.deletedCount > 0;
          } catch (error) {
            logger.error('Error deleting immersion:', error);
            throw error;
          }
        }
      }
    });
    
    // Return the context for the next pipe
    return ctx;
  } catch (error) {
    logger.error('Error in immersion resolvers initialization:', error);
    throw error;
  }
};

export default initResolvers; 