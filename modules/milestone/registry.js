import { schemaComposer } from 'graphql-compose';
import { composeMongoose } from 'graphql-compose-mongoose';
import { Milestone } from './schemas.js';
import { TYPE_ENUMS, STATUS_ENUMS, MILESTONE_TYPE_META, MILESTONE_STATUS_META } from './constants.js';

// Create and register type composers
const typeComposers = {};

// Initialize Milestone type composers
export const initTypeComposers = () => {
  if (Object.keys(typeComposers).length > 0) {
    return typeComposers;
  }

  try {
    // Create type composer for Milestone
    const MilestoneTC = composeMongoose(Milestone, { 
      removeFields: ['__v'] 
    });
    
    // Add computed fields
    MilestoneTC.addFields({
      daysRemaining: {
        type: 'Int',
        description: 'Days remaining until the target date',
        resolve: (milestone) => milestone.getDaysRemaining()
      },
      isActive: {
        type: 'Boolean',
        description: 'Whether the milestone is currently active',
        resolve: (milestone) => milestone.isActive ? milestone.isActive() : false
      },
      isCompleted: {
        type: 'Boolean',
        description: 'Whether the milestone is completed',
        resolve: (milestone) => milestone.isCompleted ? milestone.isCompleted() : milestone.status === 'achieved'
      },
      statusInfo: {
        type: 'JSON',
        description: 'Rich status metadata including color and description',
        resolve: (milestone) => {
          const status = milestone.status || 'planned';
          return MILESTONE_STATUS_META[status] || { label: status, color: '#999999' };
        }
      },
      typeInfo: {
        type: 'JSON',
        description: 'Rich milestone type metadata',
        resolve: (milestone) => {
          const type = milestone.milestoneType || 'achievement';
          return MILESTONE_TYPE_META[type] || { label: type, icon: 'flag' };
        }
      },
      progressFormatted: {
        type: 'String',
        description: 'Formatted progress string based on milestone type',
        resolve: (milestone) => {
          if (milestone.milestoneType === 'threshold' && milestone.thresholdValue && milestone.unit) {
            return `${milestone.currentValue || 0}/${milestone.thresholdValue} ${milestone.unit}`;
          }
          return `${milestone.progressPercentage || 0}%`;
        }
      },
      subMilestoneCount: {
        type: 'Int',
        description: 'Total number of sub-milestones',
        resolve: (milestone) => milestone.subMilestones ? milestone.subMilestones.length : 0
      },
      completedSubMilestoneCount: {
        type: 'Int',
        description: 'Number of completed sub-milestones',
        resolve: (milestone) => milestone.subMilestones ? 
          milestone.subMilestones.filter(sm => sm.completed).length : 0
      },
      weightedTags: {
        type: 'JSON',
        description: 'Tags with weights attached to this milestone',
        resolve: (milestone) => milestone.weightedTags || []
      },
      timeline: {
        type: 'JSON',
        description: 'Timeline of events related to this milestone',
        resolve: (milestone) => milestone.getTimeline ? milestone.getTimeline() : (milestone.timeline || [])
      },
      statusHistory: {
        type: 'JSON',
        description: 'History of status changes',
        resolve: (milestone) => milestone.getStatusHistory ? milestone.getStatusHistory() : (milestone.statusHistory || [])
      }
    });
    
    // Add status and type enums
    const MilestoneStatusEnumTC = schemaComposer.createEnumTC({
      name: 'MilestoneStatusEnum',
      values: STATUS_ENUMS.reduce((values, status) => {
        values[status.toUpperCase()] = { value: status };
        return values;
      }, {})
    });
    
    const MilestoneTypeEnumTC = schemaComposer.createEnumTC({
      name: 'MilestoneTypeEnum',
      values: TYPE_ENUMS.reduce((values, type) => {
        values[type.toUpperCase()] = { value: type };
        return values;
      }, {})
    });
    
    // Create Input Type for Sub-Milestone
    const SubMilestoneInputTC = schemaComposer.createInputTC({
      name: 'SubMilestoneInput',
      fields: {
        _id: 'MongoID',
        title: 'String!',
        description: 'String',
        completed: 'Boolean',
        order: 'Int'
      }
    });
    
    // Create Input Type for Metadata
    const MetadataInputTC = schemaComposer.createInputTC({
      name: 'MilestoneMetadataInput',
      fields: {
        color: 'String',
        icon: 'String',
        priority: 'String',
        category: 'String',
        tags: '[String]',
        privacy: 'String'
      }
    });
    
    // Create Input Type for milestone creation
    const MilestoneInputTC = schemaComposer.createInputTC({
      name: 'MilestoneInput',
      fields: {
        title: 'String!',
        description: 'String',
        milestoneType: MilestoneTypeEnumTC,
        parentGoalId: 'MongoID',
        status: MilestoneStatusEnumTC,
        startDate: 'Date',
        targetDate: 'Date',
        progressPercentage: 'Float',
        thresholdValue: 'Float',
        currentValue: 'Float',
        unit: 'String',
        habitStreak: 'Int',
        relatedHabits: ['MongoID'],
        customTypeName: 'String',
        subMilestones: [SubMilestoneInputTC],
        celebrationPlan: 'String',
        evidenceUrl: 'String',
        metadata: MetadataInputTC
      }
    });
    
    // Register all composers
    typeComposers.MilestoneTC = MilestoneTC;
    typeComposers.MilestoneInputTC = MilestoneInputTC;
    typeComposers.SubMilestoneInputTC = SubMilestoneInputTC;
    typeComposers.MetadataInputTC = MetadataInputTC;
    typeComposers.MilestoneStatusEnumTC = MilestoneStatusEnumTC;
    typeComposers.MilestoneTypeEnumTC = MilestoneTypeEnumTC;
    
    return typeComposers;
  } catch (error) {
    console.error('[Milestone Registry] Error initializing type composers:', error);
    throw error;
  }
};

// Getter functions for type composers
export const getMilestoneTC = () => {
  if (!typeComposers.MilestoneTC) {
    initTypeComposers();
  }
  return typeComposers.MilestoneTC;
};

export const getMilestoneInputTC = () => {
  if (!typeComposers.MilestoneInputTC) {
    initTypeComposers();
  }
  return typeComposers.MilestoneInputTC;
};

export const getSubMilestoneInputTC = () => {
  if (!typeComposers.SubMilestoneInputTC) {
    initTypeComposers();
  }
  return typeComposers.SubMilestoneInputTC;
};

export default {
  initTypeComposers,
  getMilestoneTC,
  getMilestoneInputTC,
  getSubMilestoneInputTC
}; 