import { schemaComposer } from 'graphql-compose';
import { 
  getManifestationTC, 
  getManifestationInputTC,
  getEvidenceInputTC,
  getAffirmationInputTC
} from './registry.js';
import { Manifestation } from './schemas.js';
import { STATE_ENUMS, TYPE_ENUMS, TIMEFRAME_ENUMS } from './constants.js';

// Initialize resolvers
export const initResolvers = (ctx) => {
  const logger = ctx.logger.child({ module: 'manifestation-resolvers' });
  const ManifestationTC = getManifestationTC();

  try {
    // ---- QUERY RESOLVERS ----
    
    // Get manifestation by ID
    schemaComposer.Query.addFields({
      manifestationById: ManifestationTC.getResolver('findById')
    });
    
    // Get all manifestations for current user
    schemaComposer.Query.addFields({
      myManifestations: {
        type: [ManifestationTC],
        args: {
          state: ['String'],
          type: ['String'],
          timeframe: ['String'],
          lifeAreas: ['String'],
          tags: ['String'],
          isFeatured: 'Boolean',
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
            if (args.state && args.state.length > 0) {
              filter.state = { $in: args.state };
            }
            
            if (args.type && args.type.length > 0) {
              filter.manifestationType = { $in: args.type };
            }
            
            if (args.timeframe && args.timeframe.length > 0) {
              filter.timeframe = { $in: args.timeframe };
            }
            
            if (args.lifeAreas && args.lifeAreas.length > 0) {
              filter['metadata.lifeAreas'] = { $in: args.lifeAreas };
            }
            
            if (args.tags && args.tags.length > 0) {
              filter['metadata.tags'] = { $in: args.tags };
            }
            
            if (args.isFeatured !== undefined) {
              filter['metadata.isFeatured'] = args.isFeatured;
            }
            
            // Text search
            if (args.search) {
              filter.$or = [
                { title: { $regex: args.search, $options: 'i' } },
                { description: { $regex: args.search, $options: 'i' } },
                { 'intention.statement': { $regex: args.search, $options: 'i' } }
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
            
            return await Manifestation.find(filter, null, options);
          } catch (error) {
            logger.error('Error getting myManifestations:', error);
            throw error;
          }
        }
      }
    });
    
    // Get statistics about user's manifestations
    schemaComposer.Query.addFields({
      manifestationStats: {
        type: 'JSON',
        resolve: async (_, args, context) => {
          try {
            if (!context.user || !context.user._id) {
              throw new Error('Authentication required');
            }
            
            const userId = context.user._id;
            
            // Get counts by state
            const stateCounts = await Promise.all(
              STATE_ENUMS.map(async (state) => {
                const count = await Manifestation.countDocuments({
                  userId,
                  state
                });
                return { state, count };
              })
            );
            
            // Get counts by type
            const typeCounts = await Promise.all(
              TYPE_ENUMS.map(async (type) => {
                const count = await Manifestation.countDocuments({
                  userId,
                  manifestationType: type
                });
                return { type, count };
              })
            );
            
            // Get counts by timeframe
            const timeframeCounts = await Promise.all(
              TIMEFRAME_ENUMS.map(async (timeframe) => {
                const count = await Manifestation.countDocuments({
                  userId,
                  timeframe
                });
                return { timeframe, count };
              })
            );
            
            // Get manifestation rate
            const totalManifestations = await Manifestation.countDocuments({ userId });
            const manifestedCount = await Manifestation.countDocuments({ 
              userId, 
              state: { $in: ['manifested', 'evolving'] }
            });
            const manifestationRate = totalManifestations > 0 
              ? (manifestedCount / totalManifestations) * 100 
              : 0;
            
            return {
              total: totalManifestations,
              manifested: manifestedCount,
              manifestationRate: Math.round(manifestationRate * 10) / 10,
              featured: await Manifestation.countDocuments({ 
                userId, 
                'metadata.isFeatured': true 
              }),
              byState: stateCounts,
              byType: typeCounts,
              byTimeframe: timeframeCounts
            };
          } catch (error) {
            logger.error('Error getting manifestationStats:', error);
            throw error;
          }
        }
      }
    });
    
    // Get featured manifestations for daily focus
    schemaComposer.Query.addFields({
      featuredManifestations: {
        type: [ManifestationTC],
        args: {
          limit: 'Int'
        },
        resolve: async (_, args, context) => {
          try {
            if (!context.user || !context.user._id) {
              throw new Error('Authentication required');
            }
            
            const filter = { 
              userId: context.user._id,
              'metadata.isFeatured': true,
              state: { $nin: ['manifested', 'released'] }
            };
            
            const options = {
              limit: args.limit || 5,
              sort: { createdAt: -1 }
            };
            
            return await Manifestation.find(filter, null, options);
          } catch (error) {
            logger.error('Error getting featuredManifestations:', error);
            throw error;
          }
        }
      }
    });
    
    // Get daily affirmations from all manifestations
    schemaComposer.Query.addFields({
      dailyAffirmations: {
        type: ['String'],
        args: {
          limit: 'Int'
        },
        resolve: async (_, args, context) => {
          try {
            if (!context.user || !context.user._id) {
              throw new Error('Authentication required');
            }
            
            // Get active manifestations with affirmations
            const manifestations = await Manifestation.find({ 
              userId: context.user._id,
              state: { $nin: ['released'] },
              affirmations: { $exists: true, $ne: [] }
            });
            
            // Extract primary affirmations first
            const affirmations = [];
            manifestations.forEach(m => {
              const primary = m.affirmations.find(a => a.isPrimary);
              if (primary) {
                affirmations.push(primary.text);
              } else if (m.affirmations.length > 0) {
                // Use first affirmation if no primary
                affirmations.push(m.affirmations[0].text);
              }
            });
            
            // Limit to requested number
            const limit = args.limit || 5;
            return affirmations.slice(0, limit);
          } catch (error) {
            logger.error('Error getting dailyAffirmations:', error);
            throw error;
          }
        }
      }
    });
    
    // ---- MUTATION RESOLVERS ----
    
    // Create manifestation
    schemaComposer.Mutation.addFields({
      createManifestation: {
        type: ManifestationTC,
        args: {
          input: getManifestationInputTC()
        },
        resolve: async (_, { input }, context) => {
          try {
            if (!context.user || !context.user._id) {
              throw new Error('Authentication required');
            }
            
            logger.debug('Creating manifestation with input:', input);
            
            const manifestationData = {
              ...input,
              userId: context.user._id,
              state: input.state || 'visioning'
            };
            
            const manifestation = new Manifestation(manifestationData);
            await manifestation.save();
            
            // Emit event
            ctx.events.emit('manifestation:created', {
              userId: context.user._id,
              manifestationId: manifestation._id,
              manifestation
            });
            
            return manifestation;
          } catch (error) {
            logger.error('Error creating manifestation:', error);
            throw error;
          }
        }
      }
    });
    
    // Update manifestation
    schemaComposer.Mutation.addFields({
      updateManifestation: {
        type: ManifestationTC,
        args: {
          id: 'MongoID!',
          input: getManifestationInputTC()
        },
        resolve: async (_, { id, input }, context) => {
          try {
            if (!context.user || !context.user._id) {
              throw new Error('Authentication required');
            }
            
            const manifestation = await Manifestation.findOne({
              _id: id,
              userId: context.user._id
            });
            
            if (!manifestation) {
              throw new Error('Manifestation not found or access denied');
            }
            
            // Update fields
            Object.keys(input).forEach(key => {
              manifestation[key] = input[key];
            });
            
            await manifestation.save();
            
            // Emit update event
            ctx.events.emit('manifestation:updated', {
              userId: context.user._id,
              manifestationId: manifestation._id,
              manifestation
            });
            
            return manifestation;
          } catch (error) {
            logger.error('Error updating manifestation:', error);
            throw error;
          }
        }
      }
    });
    
    // Update manifestation state
    schemaComposer.Mutation.addFields({
      updateManifestationState: {
        type: ManifestationTC,
        args: {
          id: 'MongoID!',
          state: 'String!',
          stateNote: 'String'
        },
        resolve: async (_, { id, state, stateNote }, context) => {
          try {
            if (!context.user || !context.user._id) {
              throw new Error('Authentication required');
            }
            
            const manifestation = await Manifestation.findOne({
              _id: id,
              userId: context.user._id
            });
            
            if (!manifestation) {
              throw new Error('Manifestation not found or access denied');
            }
            
            // Check if state is valid
            if (!STATE_ENUMS.includes(state)) {
              throw new Error(`Invalid state: ${state}`);
            }
            
            // Check if transition is allowed
            if (!manifestation.canTransitionTo(state)) {
              throw new Error(`Cannot transition from ${manifestation.state} to ${state}`);
            }
            
            // Update state
            await manifestation.setState(state, stateNote);
            
            // If manifested, set manifestedDate
            if (state === 'manifested' && !manifestation.manifestedDate) {
              manifestation.manifestedDate = new Date();
            }
            
            await manifestation.save();
            
            // Emit state change event
            ctx.events.emit('manifestation:stateChanged', {
              userId: context.user._id,
              manifestationId: manifestation._id,
              previousState: manifestation.state,
              newState: state,
              stateNote
            });
            
            return manifestation;
          } catch (error) {
            logger.error('Error updating manifestation state:', error);
            throw error;
          }
        }
      }
    });
    
    // Add evidence to manifestation
    schemaComposer.Mutation.addFields({
      addManifestationEvidence: {
        type: ManifestationTC,
        args: {
          manifestationId: 'MongoID!',
          evidence: getEvidenceInputTC()
        },
        resolve: async (_, { manifestationId, evidence }, context) => {
          try {
            if (!context.user || !context.user._id) {
              throw new Error('Authentication required');
            }
            
            const manifestation = await Manifestation.findOne({
              _id: manifestationId,
              userId: context.user._id
            });
            
            if (!manifestation) {
              throw new Error('Manifestation not found or access denied');
            }
            
            // Use the method we defined in the schema
            const result = manifestation.addEvidence({
              ...evidence,
              date: new Date()
            });
            
            await manifestation.save();
            
            // Emit evidence added event
            ctx.events.emit('manifestation:evidenceAdded', {
              userId: context.user._id,
              manifestationId: manifestation._id,
              evidence
            });
            
            // If the method suggests a state change, emit additional event
            if (result && result.suggestStateChange) {
              ctx.events.emit('manifestation:stateChangeSuggested', {
                userId: context.user._id,
                manifestationId: manifestation._id,
                currentState: manifestation.state,
                suggestedState: result.suggestStateChange,
                reason: result.message
              });
            }
            
            return manifestation;
          } catch (error) {
            logger.error('Error adding manifestation evidence:', error);
            throw error;
          }
        }
      }
    });
    
    // Add affirmation to manifestation
    schemaComposer.Mutation.addFields({
      addManifestationAffirmation: {
        type: ManifestationTC,
        args: {
          manifestationId: 'MongoID!',
          affirmation: getAffirmationInputTC()
        },
        resolve: async (_, { manifestationId, affirmation }, context) => {
          try {
            if (!context.user || !context.user._id) {
              throw new Error('Authentication required');
            }
            
            const manifestation = await Manifestation.findOne({
              _id: manifestationId,
              userId: context.user._id
            });
            
            if (!manifestation) {
              throw new Error('Manifestation not found or access denied');
            }
            
            // Use the method we defined in the schema
            manifestation.addAffirmation(
              affirmation.text, 
              affirmation.isPrimary || false
            );
            
            await manifestation.save();
            
            // Emit affirmation added event
            ctx.events.emit('manifestation:affirmationAdded', {
              userId: context.user._id,
              manifestationId: manifestation._id,
              affirmation: affirmation.text,
              isPrimary: affirmation.isPrimary
            });
            
            return manifestation;
          } catch (error) {
            logger.error('Error adding manifestation affirmation:', error);
            throw error;
          }
        }
      }
    });
    
    // Link milestones to manifestation
    schemaComposer.Mutation.addFields({
      linkMilestonesToManifestation: {
        type: ManifestationTC,
        args: {
          manifestationId: 'MongoID!',
          milestoneIds: ['MongoID!']
        },
        resolve: async (_, { manifestationId, milestoneIds }, context) => {
          try {
            if (!context.user || !context.user._id) {
              throw new Error('Authentication required');
            }
            
            const manifestation = await Manifestation.findOne({
              _id: manifestationId,
              userId: context.user._id
            });
            
            if (!manifestation) {
              throw new Error('Manifestation not found or access denied');
            }
            
            // Initialize related milestones array if not exists
            if (!manifestation.relatedMilestones) {
              manifestation.relatedMilestones = [];
            }
            
            // Add new milestone IDs (avoid duplicates)
            milestoneIds.forEach(milestoneId => {
              if (!manifestation.relatedMilestones.some(id => id.toString() === milestoneId.toString())) {
                manifestation.relatedMilestones.push(milestoneId);
              }
            });
            
            await manifestation.save();
            
            // Emit event
            ctx.events.emit('manifestation:milestonesLinked', {
              userId: context.user._id,
              manifestationId: manifestation._id,
              milestoneIds
            });
            
            return manifestation;
          } catch (error) {
            logger.error('Error linking milestones to manifestation:', error);
            throw error;
          }
        }
      }
    });
    
    // Link habits to manifestation
    schemaComposer.Mutation.addFields({
      linkHabitsToManifestation: {
        type: ManifestationTC,
        args: {
          manifestationId: 'MongoID!',
          habitIds: ['MongoID!']
        },
        resolve: async (_, { manifestationId, habitIds }, context) => {
          try {
            if (!context.user || !context.user._id) {
              throw new Error('Authentication required');
            }
            
            const manifestation = await Manifestation.findOne({
              _id: manifestationId,
              userId: context.user._id
            });
            
            if (!manifestation) {
              throw new Error('Manifestation not found or access denied');
            }
            
            // Initialize related habits array if not exists
            if (!manifestation.relatedHabits) {
              manifestation.relatedHabits = [];
            }
            
            // Add new habit IDs (avoid duplicates)
            habitIds.forEach(habitId => {
              if (!manifestation.relatedHabits.some(id => id.toString() === habitId.toString())) {
                manifestation.relatedHabits.push(habitId);
              }
            });
            
            await manifestation.save();
            
            // Emit event
            ctx.events.emit('manifestation:habitsLinked', {
              userId: context.user._id,
              manifestationId: manifestation._id,
              habitIds
            });
            
            return manifestation;
          } catch (error) {
            logger.error('Error linking habits to manifestation:', error);
            throw error;
          }
        }
      }
    });
    
    // Toggle featured status for a manifestation
    schemaComposer.Mutation.addFields({
      toggleManifestationFeatured: {
        type: ManifestationTC,
        args: {
          id: 'MongoID!'
        },
        resolve: async (_, { id }, context) => {
          try {
            if (!context.user || !context.user._id) {
              throw new Error('Authentication required');
            }
            
            const manifestation = await Manifestation.findOne({
              _id: id,
              userId: context.user._id
            });
            
            if (!manifestation) {
              throw new Error('Manifestation not found or access denied');
            }
            
            // Initialize metadata if doesn't exist
            if (!manifestation.metadata) {
              manifestation.metadata = {};
            }
            
            // Toggle featured status
            manifestation.metadata.isFeatured = !manifestation.metadata.isFeatured;
            
            await manifestation.save();
            
            return manifestation;
          } catch (error) {
            logger.error('Error toggling manifestation featured status:', error);
            throw error;
          }
        }
      }
    });
    
    // Delete manifestation
    schemaComposer.Mutation.addFields({
      deleteManifestation: {
        type: 'Boolean',
        args: {
          id: 'MongoID!'
        },
        resolve: async (_, { id }, context) => {
          try {
            if (!context.user || !context.user._id) {
              throw new Error('Authentication required');
            }
            
            const result = await Manifestation.deleteOne({
              _id: id,
              userId: context.user._id
            });
            
            // Emit event if deleted
            if (result.deletedCount > 0) {
              ctx.events.emit('manifestation:deleted', {
                userId: context.user._id,
                manifestationId: id
              });
            }
            
            return result.deletedCount > 0;
          } catch (error) {
            logger.error('Error deleting manifestation:', error);
            throw error;
          }
        }
      }
    });
    
    // The returning ctx for the next pipe
    return ctx;
  } catch (error) {
    logger.error('Error in manifestation resolvers initialization:', error);
    throw error;
  }
};

export default initResolvers; 