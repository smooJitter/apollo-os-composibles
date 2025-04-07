import { schemaComposer } from 'graphql-compose';
import { composeMongoose } from 'graphql-compose-mongoose';
import { UnifiedRecsAndNotifs } from './schemas.js';
import { 
  TYPE_ENUMS, 
  STATUS_ENUMS, 
  CONTENT_TYPE_ENUMS,
  PRIORITY_ENUMS,
  CHANNEL_ENUMS,
  RECOMMENDATION_REASONS,
  NOTIFICATION_REASONS
} from './constants.js';
import mongoose from 'mongoose';

// Create an object to hold all type composers
const typeComposers = {};

// Initialize type composers for the module
export const initTypeComposers = () => {
  if (Object.keys(typeComposers).length > 0) {
    return typeComposers;
  }

  try {
    // Create the main type composer for Unified Recommendations and Notifications
    const UnifiedRecsAndNotifsTC = composeMongoose(UnifiedRecsAndNotifs, { 
      removeFields: ['__v'],
      name: 'UnifiedRecsAndNotifs'
    });
    
    // Add computed fields
    UnifiedRecsAndNotifsTC.addFields({
      isNew: {
        type: 'Boolean',
        description: 'Whether this entry is new (unseen)',
        resolve: (entry) => entry.status === 'Sent'
      },
      isActionable: {
        type: 'Boolean',
        description: 'Whether this entry requires an action',
        resolve: (entry) => entry.metadata?.requiresAction === true
      },
      formattedDate: {
        type: 'String',
        description: 'Formatted creation date',
        resolve: (entry) => {
          const date = entry.createdAt || new Date();
          return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        }
      },
      relativeTime: {
        type: 'String',
        description: 'Relative time since creation (e.g., "2 hours ago")',
        resolve: (entry) => {
          const date = entry.createdAt || new Date();
          const now = new Date();
          const diffInSeconds = Math.floor((now - date) / 1000);
          
          if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
          if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
          if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
          if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
          if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)} weeks ago`;
          
          return `${Math.floor(diffInSeconds / 2592000)} months ago`;
        }
      },
      contentLink: {
        type: 'String',
        description: 'URL to the related content',
        resolve: (entry) => {
          if (!entry.contentType || !entry.contentId) return null;
          
          // Construct URLs based on content type
          switch (entry.contentType) {
            case 'Immersion':
              return `/immersions/${entry.contentId}`;
            case 'Manifestation':
              return `/manifestations/${entry.contentId}`;
            case 'Milestone':
              return `/milestones/${entry.contentId}`;
            case 'Habit':
              return `/habits/${entry.contentId}`;
            case 'Affirmation':
              return `/affirmations/${entry.contentId}`;
            case 'JournalEntry':
              return `/journal/${entry.contentId}`;
            default:
              return null;
          }
        }
      },
      contentDetails: {
        type: 'JSON',
        description: 'Details about the related content',
        resolve: async (entry) => {
          if (!entry.contentType || !entry.contentId || !entry.contentModel) return null;
          
          try {
            // Try to retrieve the related content
            const model = mongoose.model(entry.contentModel);
            const content = await model.findById(entry.contentId);
            
            if (!content) return null;
            
            // Return basic content information based on content type
            const baseInfo = {
              id: content._id,
              title: content.title,
              type: entry.contentType
            };
            
            switch (entry.contentType) {
              case 'Immersion':
                return {
                  ...baseInfo,
                  immersionType: content.type,
                  duration: content.metadata?.recommendedDuration
                };
              case 'Manifestation':
                return {
                  ...baseInfo,
                  progress: content.progressPercentage,
                  targetDate: content.targetDate
                };
              case 'Milestone':
                return {
                  ...baseInfo,
                  dueDate: content.targetDate,
                  status: content.status
                };
              case 'Habit':
                return {
                  ...baseInfo,
                  streak: content.currentStreak,
                  frequency: content.frequency
                };
              default:
                return baseInfo;
            }
          } catch (error) {
            console.error(`Error retrieving content details for ${entry.contentType}:`, error);
            return null;
          }
        }
      },
      priorityLevel: {
        type: 'Int',
        description: 'Numeric priority level for sorting (4=urgent, 3=high, 2=medium, 1=low)',
        resolve: (entry) => {
          switch (entry.metadata?.priority) {
            case 'Urgent': return 4;
            case 'High': return 3;
            case 'Medium': return 2;
            case 'Low': 
            default: return 1;
          }
        }
      }
    });
    
    // Create enum TCs
    const TypeEnumTC = schemaComposer.createEnumTC({
      name: 'EntryTypeEnum',
      values: {
        RECOMMENDATION: { value: 'Recommendation' },
        NOTIFICATION: { value: 'Notification' }
      }
    });
    
    const StatusEnumTC = schemaComposer.createEnumTC({
      name: 'EntryStatusEnum',
      values: {
        SENT: { value: 'Sent' },
        SEEN: { value: 'Seen' },
        ACTED_UPON: { value: 'Acted Upon' },
        DISMISSED: { value: 'Dismissed' }
      }
    });
    
    const ContentTypeEnumTC = schemaComposer.createEnumTC({
      name: 'ContentTypeEnum',
      values: CONTENT_TYPE_ENUMS.reduce((acc, type) => {
        acc[type.toUpperCase().replace(/\s+/g, '_')] = { value: type };
        return acc;
      }, {})
    });
    
    const PriorityEnumTC = schemaComposer.createEnumTC({
      name: 'PriorityEnum',
      values: {
        LOW: { value: 'Low' },
        MEDIUM: { value: 'Medium' },
        HIGH: { value: 'High' },
        URGENT: { value: 'Urgent' }
      }
    });
    
    const DeliveryChannelEnumTC = schemaComposer.createEnumTC({
      name: 'DeliveryChannelEnum',
      values: {
        IN_APP: { value: 'In-App' },
        EMAIL: { value: 'Email' },
        PUSH: { value: 'Push Notification' },
        SMS: { value: 'SMS' }
      }
    });
    
    // Create input types for creating and updating entries
    const MetadataInputTC = schemaComposer.createInputTC({
      name: 'EntryMetadataInput',
      fields: {
        priority: PriorityEnumTC,
        category: 'String',
        tags: ['String'],
        expiresAt: 'Date',
        deliveryChannels: [DeliveryChannelEnumTC],
        requiresAction: 'Boolean',
        actionText: 'String',
        actionUrl: 'String',
        iconUrl: 'String',
        color: 'String'
      }
    });
    
    const CreateEntryInputTC = schemaComposer.createInputTC({
      name: 'CreateUnifiedEntryInput',
      fields: {
        userId: 'MongoID!',
        type: TypeEnumTC.getTypeNonNull(),
        contentType: ContentTypeEnumTC,
        contentId: 'MongoID',
        contentModel: 'String',
        title: 'String!',
        message: 'String!',
        reason: 'String!',
        status: StatusEnumTC,
        additionalDetails: 'JSON',
        metadata: MetadataInputTC,
        scheduledFor: 'Date',
        recurrencePattern: 'String',
        relatedEntries: ['MongoID']
      }
    });
    
    const UpdateEntryInputTC = schemaComposer.createInputTC({
      name: 'UpdateUnifiedEntryInput',
      fields: {
        title: 'String',
        message: 'String',
        reason: 'String',
        status: StatusEnumTC,
        additionalDetails: 'JSON',
        metadata: MetadataInputTC,
        scheduledFor: 'Date',
        recurrencePattern: 'String',
        relatedEntries: ['MongoID'],
        isActive: 'Boolean'
      }
    });
    
    const FilterInputTC = schemaComposer.createInputTC({
      name: 'UnifiedEntryFilterInput',
      fields: {
        type: TypeEnumTC,
        status: StatusEnumTC,
        contentType: ContentTypeEnumTC,
        isActive: 'Boolean',
        priority: PriorityEnumTC,
        createdAtGte: {
          type: 'Date',
          description: 'Created at greater than or equal to'
        },
        createdAtLte: {
          type: 'Date',
          description: 'Created at less than or equal to'
        }
      }
    });
    
    // Save all composers to the typeComposers object
    typeComposers.UnifiedRecsAndNotifsTC = UnifiedRecsAndNotifsTC;
    typeComposers.TypeEnumTC = TypeEnumTC;
    typeComposers.StatusEnumTC = StatusEnumTC;
    typeComposers.ContentTypeEnumTC = ContentTypeEnumTC;
    typeComposers.PriorityEnumTC = PriorityEnumTC;
    typeComposers.DeliveryChannelEnumTC = DeliveryChannelEnumTC;
    typeComposers.MetadataInputTC = MetadataInputTC;
    typeComposers.CreateEntryInputTC = CreateEntryInputTC;
    typeComposers.UpdateEntryInputTC = UpdateEntryInputTC;
    typeComposers.FilterInputTC = FilterInputTC;
    
    return typeComposers;
  } catch (error) {
    console.error('[Unified Registry] Error initializing type composers:', error);
    throw error;
  }
};

// Getter functions for type composers
export const getUnifiedRecsAndNotifsTC = () => {
  if (!typeComposers.UnifiedRecsAndNotifsTC) {
    initTypeComposers();
  }
  return typeComposers.UnifiedRecsAndNotifsTC;
};

export const getCreateEntryInputTC = () => {
  if (!typeComposers.CreateEntryInputTC) {
    initTypeComposers();
  }
  return typeComposers.CreateEntryInputTC;
};

export const getUpdateEntryInputTC = () => {
  if (!typeComposers.UpdateEntryInputTC) {
    initTypeComposers();
  }
  return typeComposers.UpdateEntryInputTC;
};

export const getFilterInputTC = () => {
  if (!typeComposers.FilterInputTC) {
    initTypeComposers();
  }
  return typeComposers.FilterInputTC;
};

export default {
  initTypeComposers,
  getUnifiedRecsAndNotifsTC,
  getCreateEntryInputTC,
  getUpdateEntryInputTC,
  getFilterInputTC
}; 