import { schemaComposer } from 'graphql-compose';
import { composeMongoose } from 'graphql-compose-mongoose';
import { Manifestation } from './schemas.js';
import { 
  TYPE_ENUMS, 
  STATE_ENUMS, 
  TIMEFRAME_ENUMS,
  MANIFESTATION_TYPE_META, 
  MANIFESTATION_STATE_META,
  MANIFESTATION_CATEGORIES
} from './constants.js';

// Create and register type composers
const typeComposers = {};

// Initialize Manifestation type composers
export const initTypeComposers = () => {
  if (Object.keys(typeComposers).length > 0) {
    return typeComposers;
  }

  try {
    // Create type composer for Manifestation
    const ManifestationTC = composeMongoose(Manifestation, { 
      removeFields: ['__v'] 
    });
    
    // Add computed fields
    ManifestationTC.addFields({
      timeToTarget: {
        type: 'Int',
        description: 'Days remaining until the target date',
        resolve: (manifestation) => {
          if (!manifestation.targetDate) return null;
          
          const today = new Date();
          const target = new Date(manifestation.targetDate);
          const timeDiff = target.getTime() - today.getTime();
          return Math.ceil(timeDiff / (1000 * 3600 * 24));
        }
      },
      isActive: {
        type: 'Boolean',
        description: 'Whether the manifestation is currently active',
        resolve: (manifestation) => manifestation.isActive ? manifestation.isActive() : false
      },
      isManifested: {
        type: 'Boolean',
        description: 'Whether the manifestation is fully manifested',
        resolve: (manifestation) => manifestation.isManifested ? manifestation.isManifested() : false
      },
      stateInfo: {
        type: 'JSON',
        description: 'Rich state metadata including color and description',
        resolve: (manifestation) => {
          const state = manifestation.state || 'visioning';
          return MANIFESTATION_STATE_META[state] || { label: state, color: '#9e9e9e' };
        }
      },
      typeInfo: {
        type: 'JSON',
        description: 'Rich manifestation type metadata',
        resolve: (manifestation) => {
          const type = manifestation.manifestationType || 'goal';
          return MANIFESTATION_TYPE_META[type] || { label: type, icon: 'star' };
        }
      },
      primaryAffirmation: {
        type: 'String',
        description: 'Primary affirmation statement',
        resolve: (manifestation) => {
          const primary = manifestation.getPrimaryAffirmation ? 
            manifestation.getPrimaryAffirmation() : 
            (manifestation.affirmations?.find(a => a.isPrimary) || manifestation.affirmations?.[0]);
          
          return primary ? primary.text : null;
        }
      },
      presentTenseStatement: {
        type: 'String',
        description: 'Present tense statement of this manifestation',
        resolve: (manifestation) => {
          if (manifestation.getPresentTenseStatement) {
            return manifestation.getPresentTenseStatement();
          }
          return manifestation.intention?.statement || `I am manifesting ${manifestation.title}`;
        }
      },
      evidenceCount: {
        type: 'Int',
        description: 'Number of evidence items recorded',
        resolve: (manifestation) => manifestation.evidence ? manifestation.evidence.length : 0
      },
      milestoneCount: {
        type: 'Int',
        description: 'Number of connected milestones',
        resolve: (manifestation) => manifestation.relatedMilestones ? manifestation.relatedMilestones.length : 0
      },
      habitCount: {
        type: 'Int',
        description: 'Number of connected habits',
        resolve: (manifestation) => manifestation.relatedHabits ? manifestation.relatedHabits.length : 0
      },
      weightedTags: {
        type: 'JSON',
        description: 'Tags with weights attached to this manifestation',
        resolve: (manifestation) => manifestation.weightedTags || []
      },
      timeline: {
        type: 'JSON',
        description: 'Timeline of events related to this manifestation',
        resolve: (manifestation) => manifestation.getTimeline ? manifestation.getTimeline() : (manifestation.timeline || [])
      },
      stateHistory: {
        type: 'JSON',
        description: 'History of state changes',
        resolve: (manifestation) => manifestation.getStateHistory ? manifestation.getStateHistory() : (manifestation.stateHistory || [])
      }
    });
    
    // Add state and type enums
    const ManifestationStateEnumTC = schemaComposer.createEnumTC({
      name: 'ManifestationStateEnum',
      values: STATE_ENUMS.reduce((values, state) => {
        values[state.toUpperCase()] = { value: state };
        return values;
      }, {})
    });
    
    const ManifestationTypeEnumTC = schemaComposer.createEnumTC({
      name: 'ManifestationTypeEnum',
      values: TYPE_ENUMS.reduce((values, type) => {
        values[type.toUpperCase()] = { value: type };
        return values;
      }, {})
    });
    
    const ManifestationTimeframeEnumTC = schemaComposer.createEnumTC({
      name: 'ManifestationTimeframeEnum',
      values: TIMEFRAME_ENUMS.reduce((values, timeframe) => {
        values[timeframe.toUpperCase()] = { value: timeframe };
        return values;
      }, {})
    });
    
    const LifeAreaEnumTC = schemaComposer.createEnumTC({
      name: 'LifeAreaEnum',
      values: MANIFESTATION_CATEGORIES.reduce((values, category) => {
        values[category.toUpperCase().replace(/\s+/g, '_')] = { value: category };
        return values;
      }, {})
    });
    
    // Create Input Type for Evidence
    const EvidenceInputTC = schemaComposer.createInputTC({
      name: 'EvidenceInput',
      fields: {
        title: 'String!',
        description: 'String',
        mediaUrl: 'String',
        mediaType: {
          type: schemaComposer.createEnumTC({
            name: 'MediaTypeEnum',
            values: {
              IMAGE: { value: 'image' },
              VIDEO: { value: 'video' },
              DOCUMENT: { value: 'document' },
              LINK: { value: 'link' },
              TEXT: { value: 'text' }
            }
          })
        }
      }
    });
    
    // Create Input Type for Affirmation
    const AffirmationInputTC = schemaComposer.createInputTC({
      name: 'AffirmationInput',
      fields: {
        text: 'String!',
        isPrimary: 'Boolean'
      }
    });
    
    // Create Input Type for Intention
    const IntentionInputTC = schemaComposer.createInputTC({
      name: 'IntentionInput',
      fields: {
        statement: 'String!',
        whyItMatters: 'String',
        howItFeels: 'String',
        isPresentTense: 'Boolean',
        isPhraseAsCompleted: 'Boolean'
      }
    });
    
    // Create Input Type for Metadata
    const MetadataInputTC = schemaComposer.createInputTC({
      name: 'ManifestationMetadataInput',
      fields: {
        color: 'String',
        icon: 'String',
        priority: 'String',
        lifeAreas: ['String'],
        tags: ['String'],
        privacy: 'String',
        isFeatured: 'Boolean'
      }
    });
    
    // Create Input Type for Reminder
    const ReminderInputTC = schemaComposer.createInputTC({
      name: 'ReminderInput',
      fields: {
        frequency: 'String',
        time: 'String', 
        isEnabled: 'Boolean',
        customPattern: 'String'
      }
    });
    
    // Create Input Type for manifestation creation
    const ManifestationInputTC = schemaComposer.createInputTC({
      name: 'ManifestationInput',
      fields: {
        title: 'String!',
        description: 'String',
        manifestationType: ManifestationTypeEnumTC,
        customTypeName: 'String',
        state: ManifestationStateEnumTC,
        timeframe: ManifestationTimeframeEnumTC,
        targetDate: 'Date',
        progressPercentage: 'Float',
        vision: 'String',
        intention: IntentionInputTC,
        affirmations: [AffirmationInputTC],
        evidence: [EvidenceInputTC],
        relatedMilestones: ['MongoID'],
        relatedHabits: ['MongoID'],
        reminder: ReminderInputTC,
        metadata: MetadataInputTC
      }
    });
    
    // Register all composers
    typeComposers.ManifestationTC = ManifestationTC;
    typeComposers.ManifestationInputTC = ManifestationInputTC;
    typeComposers.ManifestationStateEnumTC = ManifestationStateEnumTC;
    typeComposers.ManifestationTypeEnumTC = ManifestationTypeEnumTC;
    typeComposers.ManifestationTimeframeEnumTC = ManifestationTimeframeEnumTC;
    typeComposers.LifeAreaEnumTC = LifeAreaEnumTC;
    typeComposers.EvidenceInputTC = EvidenceInputTC;
    typeComposers.AffirmationInputTC = AffirmationInputTC;
    typeComposers.IntentionInputTC = IntentionInputTC;
    typeComposers.MetadataInputTC = MetadataInputTC;
    typeComposers.ReminderInputTC = ReminderInputTC;
    
    return typeComposers;
  } catch (error) {
    console.error('[Manifestation Registry] Error initializing type composers:', error);
    throw error;
  }
};

// Getter functions for type composers
export const getManifestationTC = () => {
  if (!typeComposers.ManifestationTC) {
    initTypeComposers();
  }
  return typeComposers.ManifestationTC;
};

export const getManifestationInputTC = () => {
  if (!typeComposers.ManifestationInputTC) {
    initTypeComposers();
  }
  return typeComposers.ManifestationInputTC;
};

export const getEvidenceInputTC = () => {
  if (!typeComposers.EvidenceInputTC) {
    initTypeComposers();
  }
  return typeComposers.EvidenceInputTC;
};

export const getAffirmationInputTC = () => {
  if (!typeComposers.AffirmationInputTC) {
    initTypeComposers();
  }
  return typeComposers.AffirmationInputTC;
};

export default {
  initTypeComposers,
  getManifestationTC,
  getManifestationInputTC,
  getEvidenceInputTC,
  getAffirmationInputTC
}; 