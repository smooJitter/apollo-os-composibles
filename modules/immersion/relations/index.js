import { getImmersionTC } from '../registry.js';
import mongoose from 'mongoose';

export const initRelations = (ctx) => {
  const logger = ctx.logger.child({ module: 'immersion-relations' });
  
  try {
    const ImmersionTC = getImmersionTC();
    
    // Relation to manifestations
    if (ctx.models.Manifestation) {
      // Add relation from Immersion to Manifestations
      ImmersionTC.addRelation('manifestations', {
        resolver: () => ctx.getModelTC('Manifestation').getResolver('findByIds'),
        prepareArgs: {
          _ids: (source) => source.relatedManifestations || []
        },
        projection: { relatedManifestations: 1 }
      });
      
      // Add relation from Manifestation to Immersions
      try {
        const ManifestationTC = ctx.getModelTC('Manifestation');
        if (ManifestationTC) {
          ManifestationTC.addRelation('relatedImmersions', {
            resolver: () => ImmersionTC.getResolver('findMany'),
            prepareArgs: {
              filter: (source) => ({
                relatedManifestations: source._id
              })
            },
            projection: { _id: 1 }
          });
        }
      } catch (error) {
        logger.warn('Could not set up manifestation-to-immersion relation:', error.message);
      }
    } else {
      logger.warn('Manifestation model not available for relations');
    }
    
    // Relation to milestones
    if (ctx.models.Milestone) {
      // Add relation from Immersion to Milestones
      ImmersionTC.addRelation('milestones', {
        resolver: () => ctx.getModelTC('Milestone').getResolver('findByIds'),
        prepareArgs: {
          _ids: (source) => source.relatedMilestones || []
        },
        projection: { relatedMilestones: 1 }
      });
      
      // Add relation from Milestone to Immersions
      try {
        const MilestoneTC = ctx.getModelTC('Milestone');
        if (MilestoneTC) {
          MilestoneTC.addRelation('relatedImmersions', {
            resolver: () => ImmersionTC.getResolver('findMany'),
            prepareArgs: {
              filter: (source) => ({
                relatedMilestones: source._id
              })
            },
            projection: { _id: 1 }
          });
        }
      } catch (error) {
        logger.warn('Could not set up milestone-to-immersion relation:', error.message);
      }
    } else {
      logger.warn('Milestone model not available for relations');
    }
    
    // Relation to users
    if (ctx.models.User) {
      try {
        const UserTC = ctx.getModelTC('User');
        if (UserTC) {
          // Add relation from User to their Immersions
          UserTC.addRelation('immersions', {
            resolver: () => ImmersionTC.getResolver('findMany'),
            prepareArgs: {
              filter: (source) => ({
                userId: source._id
              })
            },
            projection: { _id: 1 }
          });
          
          // Add relation from User to completed Immersions
          UserTC.addRelation('completedImmersions', {
            resolver: () => ImmersionTC.getResolver('findMany'),
            prepareArgs: {
              filter: (source) => ({
                userId: source._id,
                userProgress: {
                  $elemMatch: {
                    userId: source._id,
                    isCompleted: true
                  }
                }
              })
            },
            projection: { _id: 1 }
          });
        }
      } catch (error) {
        logger.warn('Could not set up user-to-immersion relation:', error.message);
      }
    } else {
      logger.warn('User model not available for relations');
    }
    
    // Add creator information to immersion (as a computed field)
    try {
      if (ctx.models.User) {
        ImmersionTC.addFields({
          creator: {
            type: 'JSON',
            resolve: async (immersion) => {
              if (!immersion.userId) return null;
              
              try {
                const User = mongoose.model('User');
                const user = await User.findById(immersion.userId);
                
                if (!user) return null;
                
                return {
                  _id: user._id,
                  name: user.name || user.username || 'Anonymous',
                  username: user.username,
                  avatar: user.avatar
                };
              } catch (error) {
                logger.error('Error resolving immersion creator:', error);
                return null;
              }
            }
          }
        });
      }
    } catch (error) {
      logger.warn('Could not add creator field to immersion:', error.message);
    }
    
    return ctx;
  } catch (error) {
    logger.error('Error initializing immersion relations:', error);
    throw error;
  }
};

export default initRelations; 