import { getManifestationTC } from '../registry.js';
import { Habit } from '../../habit/schemas.js';
import { Milestone } from '../../milestone/schemas.js';
import { VisionBoard } from '../../vision-board/schemas.js';

export const initRelations = (ctx) => {
  const logger = ctx.logger.child({ module: 'manifestation-relations' });
  
  try {
    const ManifestationTC = getManifestationTC();
    
    // Relation to habits
    ManifestationTC.addRelation('habits', {
      resolver: () => Habit.getResolver('findByIds'),
      prepareArgs: {
        _ids: (source) => source.relatedHabits || []
      },
      projection: { relatedHabits: 1 }
    });
    
    // Relation to milestones
    ManifestationTC.addRelation('milestones', {
      resolver: () => Milestone.getResolver('findByIds'),
      prepareArgs: {
        _ids: (source) => source.relatedMilestones || []
      },
      projection: { relatedMilestones: 1 }
    });
    
    // Relation to vision boards
    ManifestationTC.addRelation('visionBoards', {
      resolver: () => VisionBoard.getResolver('findMany'),
      prepareArgs: {
        filter: (source) => ({
          'items.relatedManifestationId': source._id
        })
      },
      projection: { _id: 1 }
    });
    
    // Add to Habit relation to manifestations
    try {
      const HabitTC = ctx.getModelTC('Habit');
      if (HabitTC) {
        HabitTC.addRelation('manifestations', {
          resolver: () => ManifestationTC.getResolver('findMany'),
          prepareArgs: {
            filter: (source) => ({
              relatedHabits: source._id
            })
          },
          projection: { _id: 1 }
        });
      }
    } catch (error) {
      logger.warn('Could not set up habit-to-manifestation relation', error.message);
    }
    
    // Add to Milestone relation to manifestations
    try {
      const MilestoneTC = ctx.getModelTC('Milestone');
      if (MilestoneTC) {
        MilestoneTC.addRelation('manifestations', {
          resolver: () => ManifestationTC.getResolver('findMany'),
          prepareArgs: {
            filter: (source) => ({
              relatedMilestones: source._id
            })
          },
          projection: { _id: 1 }
        });
      }
    } catch (error) {
      logger.warn('Could not set up milestone-to-manifestation relation', error.message);
    }
    
    // Add to VisionBoard relation to linked manifestations
    try {
      const VisionBoardTC = ctx.getModelTC('VisionBoard');
      if (VisionBoardTC) {
        VisionBoardTC.addRelation('linkedManifestations', {
          resolver: () => ManifestationTC.getResolver('findMany'),
          prepareArgs: {
            filter: (source) => {
              const manifestationIds = source.items
                .filter(item => item.relatedManifestationId)
                .map(item => item.relatedManifestationId);
              
              return { _id: { $in: manifestationIds } };
            }
          },
          projection: { items: 1 }
        });
      }
    } catch (error) {
      logger.warn('Could not set up visionboard-to-manifestation relation', error.message);
    }
    
    return ctx;
  } catch (error) {
    logger.error('Error initializing manifestation relations:', error);
    throw error;
  }
};

export default initRelations; 