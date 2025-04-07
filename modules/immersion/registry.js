import { schemaComposer } from 'graphql-compose';
import { composeMongoose } from 'graphql-compose-mongoose';
import { Immersion } from './schemas.js';
import { 
  TYPE_ENUMS, 
  IMMERSION_TYPE_META,
  AI_MODULE_ENUMS, 
  TARGET_AUDIENCES
} from './constants.js';

// Create an object to hold all type composers
const typeComposers = {};

// Initialize type composers for the Immersion module
export const initTypeComposers = () => {
  if (Object.keys(typeComposers).length > 0) {
    return typeComposers;
  }

  try {
    // Create the main type composer for Immersion
    const ImmersionTC = composeMongoose(Immersion, { 
      removeFields: ['__v'] 
    });
    
    // Add computed fields
    ImmersionTC.addFields({
      typeInfo: {
        type: 'JSON',
        description: 'Rich metadata about the immersion type',
        resolve: (immersion) => {
          const type = immersion.type || 'Visualization';
          return IMMERSION_TYPE_META[type] || { 
            label: type, 
            icon: 'visibility',
            description: 'Immersive experience'
          };
        }
      },
      hasCompleted: {
        type: 'Boolean',
        description: 'Whether the current user has completed this immersion',
        resolve: (immersion, _, context) => {
          if (!context.user || !context.user._id) return false;
          
          const userProgress = immersion.userProgress && immersion.userProgress.find(
            progress => progress.userId.toString() === context.user._id.toString()
          );
          
          return userProgress ? userProgress.isCompleted : false;
        }
      },
      completionCount: {
        type: 'Int',
        description: 'Number of times this immersion has been completed',
        resolve: (immersion) => {
          return immersion.engagementMetrics?.completedCount || 0;
        }
      },
      userRating: {
        type: 'Float',
        description: 'Current user\'s rating of this immersion',
        resolve: (immersion, _, context) => {
          if (!context.user || !context.user._id) return null;
          
          const userProgress = immersion.userProgress && immersion.userProgress.find(
            progress => progress.userId.toString() === context.user._id.toString()
          );
          
          return userProgress ? userProgress.rating : null;
        }
      },
      duration: {
        type: 'String',
        description: 'Recommended duration for this immersion',
        resolve: (immersion) => {
          return immersion.metadata?.recommendedDuration || 
            IMMERSION_TYPE_META[immersion.type]?.recommendedDuration ||
            '15 minutes';
        }
      },
      tagList: {
        type: ['String'],
        description: 'List of tag names associated with this immersion',
        resolve: (immersion) => {
          return immersion.tags ? immersion.tags.map(tag => tag.name) : [];
        }
      },
      weightedTags: {
        type: 'JSON',
        description: 'Tags with weights attached to this immersion',
        resolve: (immersion) => immersion.weightedTags || []
      },
      progressStats: {
        type: 'JSON',
        description: 'User progress statistics for this immersion',
        resolve: (immersion) => {
          const stats = {
            started: immersion.engagementMetrics?.startedCount || 0,
            completed: immersion.engagementMetrics?.completedCount || 0,
            completion_rate: immersion.engagementMetrics?.completionRate || 0,
            average_rating: immersion.engagementMetrics?.userRatings?.average || 0,
            rating_count: immersion.engagementMetrics?.userRatings?.count || 0,
            average_session_time: immersion.engagementMetrics?.averageSessionTime || 0
          };
          return stats;
        }
      },
      currentUserProgress: {
        type: 'JSON',
        description: 'Current user\'s progress for this immersion',
        resolve: (immersion, _, context) => {
          if (!context.user || !context.user._id) return null;
          
          const userProgress = immersion.userProgress && immersion.userProgress.find(
            progress => progress.userId.toString() === context.user._id.toString()
          );
          
          if (!userProgress) return null;
          
          return {
            started: true,
            startedAt: userProgress.startedAt,
            completed: userProgress.isCompleted,
            completedAt: userProgress.completedAt,
            rating: userProgress.rating,
            feedback: userProgress.feedback,
            effectiveness: userProgress.effectiveness,
            notes: userProgress.notes,
            sessionCount: userProgress.sessionDurations ? userProgress.sessionDurations.length : 0,
            totalTime: userProgress.sessionDurations ? 
              userProgress.sessionDurations.reduce((sum, session) => sum + (session.duration || 0), 0) : 0
          };
        }
      }
    });
    
    // Create enum for immersion types
    const ImmersionTypeEnumTC = schemaComposer.createEnumTC({
      name: 'ImmersionTypeEnum',
      values: TYPE_ENUMS.reduce((values, type) => {
        values[type.toUpperCase().replace(/\s+/g, '_')] = { value: type };
        return values;
      }, {})
    });
    
    // Create enum for AI modules
    const AIModuleEnumTC = schemaComposer.createEnumTC({
      name: 'AIModuleEnum',
      values: AI_MODULE_ENUMS.reduce((values, module) => {
        values[module.toUpperCase()] = { value: module };
        return values;
      }, {})
    });
    
    // Create enum for target audiences
    const TargetAudienceEnumTC = schemaComposer.createEnumTC({
      name: 'TargetAudienceEnum',
      values: TARGET_AUDIENCES.reduce((values, audience) => {
        values[audience.toUpperCase().replace(/\s+/g, '_')] = { value: audience };
        return values;
      }, {})
    });
    
    // Create input type for media items
    const MediaItemInputTC = schemaComposer.createInputTC({
      name: 'MediaItemInput',
      fields: {
        type: {
          type: schemaComposer.createEnumTC({
            name: 'MediaTypeEnum',
            values: {
              IMAGE: { value: 'image' },
              AUDIO: { value: 'audio' },
              VIDEO: { value: 'video' },
              DOCUMENT: { value: 'document' }
            }
          }),
          description: 'Type of media'
        },
        url: 'String!',
        title: 'String',
        description: 'String',
        duration: 'Int',
        isGeneratedByAI: 'Boolean',
        aiPromptUsed: 'String'
      }
    });
    
    // Create input type for tags
    const TagInputTC = schemaComposer.createInputTC({
      name: 'TagInput',
      fields: {
        name: 'String!',
        category: {
          type: schemaComposer.createEnumTC({
            name: 'TagCategoryEnum',
            values: {
              THEME: { value: 'Theme' },
              TECHNIQUE: { value: 'Technique' },
              GOAL: { value: 'Goal' },
              CUSTOM: { value: 'Custom' }
            }
          }),
          defaultValue: 'Custom'
        }
      }
    });
    
    // Create input type for metadata
    const MetadataInputTC = schemaComposer.createInputTC({
      name: 'ImmersionMetadataInput',
      fields: {
        color: 'String',
        icon: 'String',
        isFeatured: 'Boolean',
        recommendedDuration: 'String',
        difficulty: {
          type: schemaComposer.createEnumTC({
            name: 'DifficultyEnum',
            values: {
              EASY: { value: 'Easy' },
              MODERATE: { value: 'Moderate' },
              CHALLENGING: { value: 'Challenging' }
            }
          })
        },
        lifeAreas: ['String'],
        isPublic: 'Boolean',
        requiredResources: 'String',
        relatedManifestationTypes: ['String']
      }
    });
    
    // Create input type for structured content
    const StructuredContentInputTC = schemaComposer.createInputTC({
      name: 'StructuredContentInput',
      fields: {
        sections: ['JSON'],
        steps: ['JSON'],
        variables: 'JSON',
        configuration: 'JSON'
      }
    });
    
    // Create input type for user progress
    const UserProgressInputTC = schemaComposer.createInputTC({
      name: 'UserProgressInput',
      fields: {
        isCompleted: 'Boolean',
        sessionDuration: 'Int',
        sessionStartedAt: 'Date',
        rating: 'Int',
        feedback: 'String',
        effectiveness: 'Int',
        notes: 'String'
      }
    });
    
    // Create input type for immersion creation
    const ImmersionInputTC = schemaComposer.createInputTC({
      name: 'ImmersionInput',
      fields: {
        title: 'String!',
        description: 'String',
        type: ImmersionTypeEnumTC,
        content: 'String!',
        structuredContent: 'JSON',
        aiModuleUsed: AIModuleEnumTC,
        aiPromptUsed: 'String',
        isGeneratedByAI: 'Boolean',
        targetAudience: TargetAudienceEnumTC,
        metadata: MetadataInputTC,
        tags: [TagInputTC],
        media: [MediaItemInputTC],
        relatedManifestations: ['MongoID'],
        relatedMilestones: ['MongoID']
      }
    });
    
    // Save all composers to the typeComposers object
    typeComposers.ImmersionTC = ImmersionTC;
    typeComposers.ImmersionTypeEnumTC = ImmersionTypeEnumTC;
    typeComposers.AIModuleEnumTC = AIModuleEnumTC;
    typeComposers.TargetAudienceEnumTC = TargetAudienceEnumTC;
    typeComposers.MediaItemInputTC = MediaItemInputTC;
    typeComposers.TagInputTC = TagInputTC;
    typeComposers.MetadataInputTC = MetadataInputTC;
    typeComposers.StructuredContentInputTC = StructuredContentInputTC;
    typeComposers.UserProgressInputTC = UserProgressInputTC;
    typeComposers.ImmersionInputTC = ImmersionInputTC;
    
    return typeComposers;
  } catch (error) {
    console.error('[Immersion Registry] Error initializing type composers:', error);
    throw error;
  }
};

// Getter functions for type composers
export const getImmersionTC = () => {
  if (!typeComposers.ImmersionTC) {
    initTypeComposers();
  }
  return typeComposers.ImmersionTC;
};

export const getImmersionInputTC = () => {
  if (!typeComposers.ImmersionInputTC) {
    initTypeComposers();
  }
  return typeComposers.ImmersionInputTC;
};

export const getUserProgressInputTC = () => {
  if (!typeComposers.UserProgressInputTC) {
    initTypeComposers();
  }
  return typeComposers.UserProgressInputTC;
};

export const getMediaItemInputTC = () => {
  if (!typeComposers.MediaItemInputTC) {
    initTypeComposers();
  }
  return typeComposers.MediaItemInputTC;
};

export default {
  initTypeComposers,
  getImmersionTC,
  getImmersionInputTC,
  getUserProgressInputTC,
  getMediaItemInputTC
}; 