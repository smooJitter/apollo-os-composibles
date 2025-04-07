import { schemaComposer } from 'graphql-compose';
import { composeMongoose } from 'graphql-compose-mongoose';
import { AIConversation } from './schemas.js';
import { 
  CONVERSATION_TYPE_ENUMS, 
  INTERACTION_CATEGORY_ENUMS, 
  AI_MODEL_ENUMS,
  SENTIMENT_TYPE_ENUMS,
  INTERACTION_STATUS_ENUMS
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
    // Create the main type composer for AI Conversations
    const AIConversationTC = composeMongoose(AIConversation, { 
      removeFields: ['__v'],
      name: 'AIConversation'
    });
    
    // Add computed fields
    AIConversationTC.addFields({
      interactionCount: {
        type: 'Int',
        description: 'Number of interactions in the conversation',
        resolve: (conversation) => conversation.interactions?.length || 0
      },
      durationMinutes: {
        type: 'Float',
        description: 'Duration of the conversation in minutes',
        resolve: (conversation) => {
          if (!conversation.start || !conversation.lastInteraction) return 0;
          return (conversation.lastInteraction - conversation.start) / 60000; // milliseconds to minutes
        }
      },
      userFeedbackRating: {
        type: 'Int',
        description: 'User feedback rating for the conversation',
        resolve: (conversation) => conversation.metadata?.userFeedback?.rating || null
      },
      formattedStart: {
        type: 'String',
        description: 'Formatted start date of the conversation',
        resolve: (conversation) => {
          const date = conversation.start || new Date();
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
        description: 'Relative time since conversation started',
        resolve: (conversation) => {
          const date = conversation.start || new Date();
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
      lastSpeaker: {
        type: 'String',
        description: 'Whether the user or AI was the last to interact',
        resolve: (conversation) => {
          if (!conversation.interactions || conversation.interactions.length === 0) {
            return 'None';
          }
          
          const lastInteraction = conversation.interactions[conversation.interactions.length - 1];
          if (!lastInteraction.response) {
            return 'User';
          }
          
          return 'AI';
        }
      }
    });
    
    // Create enum TCs
    const ConversationTypeEnumTC = schemaComposer.createEnumTC({
      name: 'ConversationTypeEnum',
      values: CONVERSATION_TYPE_ENUMS.reduce((acc, type) => {
        acc[type.toUpperCase().replace(/\s+/g, '_')] = { value: type };
        return acc;
      }, {})
    });
    
    const InteractionCategoryEnumTC = schemaComposer.createEnumTC({
      name: 'InteractionCategoryEnum',
      values: INTERACTION_CATEGORY_ENUMS.reduce((acc, type) => {
        acc[type.toUpperCase()] = { value: type };
        return acc;
      }, {})
    });
    
    const AIModelEnumTC = schemaComposer.createEnumTC({
      name: 'AIModelEnum',
      values: AI_MODEL_ENUMS.reduce((acc, model) => {
        acc[model.toUpperCase().replace(/\s+|-/g, '_')] = { value: model };
        return acc;
      }, {})
    });
    
    const SentimentEnumTC = schemaComposer.createEnumTC({
      name: 'SentimentEnum',
      values: SENTIMENT_TYPE_ENUMS.reduce((acc, sentiment) => {
        acc[sentiment.toUpperCase().replace(/\s+/g, '_')] = { value: sentiment };
        return acc;
      }, {})
    });
    
    const InteractionStatusEnumTC = schemaComposer.createEnumTC({
      name: 'InteractionStatusEnum',
      values: INTERACTION_STATUS_ENUMS.reduce((acc, status) => {
        acc[status.toUpperCase()] = { value: status };
        return acc;
      }, {})
    });
    
    // Create input types for creating and updating conversations
    const RelevantEntityInputTC = schemaComposer.createInputTC({
      name: 'RelevantEntityInput',
      fields: {
        entityType: 'String!',
        entityId: 'MongoID!',
        relevanceScore: 'Float'
      }
    });
    
    const MetadataInputTC = schemaComposer.createInputTC({
      name: 'ConversationMetadataInput',
      fields: {
        purpose: 'String',
        context: 'String',
        modelSettings: 'JSON',
        theme: 'String',
        sentiment: SentimentEnumTC,
        relevantEntities: [RelevantEntityInputTC],
        tags: ['String'],
        intent: 'String'
      }
    });
    
    const CreateConversationInputTC = schemaComposer.createInputTC({
      name: 'CreateConversationInput',
      fields: {
        userId: 'MongoID!',
        title: 'String',
        type: ConversationTypeEnumTC,
        model: AIModelEnumTC,
        metadata: MetadataInputTC,
        initialMessage: 'String'
      }
    });
    
    const UpdateConversationInputTC = schemaComposer.createInputTC({
      name: 'UpdateConversationInput',
      fields: {
        title: 'String',
        type: ConversationTypeEnumTC,
        isArchived: 'Boolean',
        metadata: MetadataInputTC
      }
    });
    
    const AddInteractionInputTC = schemaComposer.createInputTC({
      name: 'AddInteractionInput',
      fields: {
        message: 'String!',
        messageType: InteractionCategoryEnumTC
      }
    });
    
    const CompleteInteractionInputTC = schemaComposer.createInputTC({
      name: 'CompleteInteractionInput',
      fields: {
        interactionId: 'MongoID!',
        response: 'String!',
        model: AIModelEnumTC,
        promptTokens: 'Int',
        completionTokens: 'Int',
        processingTime: 'Int',
        aiSettings: 'JSON'
      }
    });
    
    const FeedbackInputTC = schemaComposer.createInputTC({
      name: 'ConversationFeedbackInput',
      fields: {
        rating: 'Int!',
        comments: 'String'
      }
    });
    
    const FilterInputTC = schemaComposer.createInputTC({
      name: 'ConversationFilterInput',
      fields: {
        type: ConversationTypeEnumTC,
        isArchived: 'Boolean',
        hasUserFeedback: 'Boolean',
        searchQuery: 'String',
        startDate: 'Date',
        endDate: 'Date'
      }
    });
    
    // Save all composers to the typeComposers object
    typeComposers.AIConversationTC = AIConversationTC;
    typeComposers.ConversationTypeEnumTC = ConversationTypeEnumTC;
    typeComposers.InteractionCategoryEnumTC = InteractionCategoryEnumTC;
    typeComposers.AIModelEnumTC = AIModelEnumTC;
    typeComposers.SentimentEnumTC = SentimentEnumTC;
    typeComposers.InteractionStatusEnumTC = InteractionStatusEnumTC;
    typeComposers.MetadataInputTC = MetadataInputTC;
    typeComposers.CreateConversationInputTC = CreateConversationInputTC;
    typeComposers.UpdateConversationInputTC = UpdateConversationInputTC;
    typeComposers.AddInteractionInputTC = AddInteractionInputTC;
    typeComposers.CompleteInteractionInputTC = CompleteInteractionInputTC;
    typeComposers.FeedbackInputTC = FeedbackInputTC;
    typeComposers.FilterInputTC = FilterInputTC;
    
    return typeComposers;
  } catch (error) {
    console.error('[AI Conversation Registry] Error initializing type composers:', error);
    throw error;
  }
};

// Getter functions for type composers
export const getAIConversationTC = () => {
  if (!typeComposers.AIConversationTC) {
    initTypeComposers();
  }
  return typeComposers.AIConversationTC;
};

export const getCreateConversationInputTC = () => {
  if (!typeComposers.CreateConversationInputTC) {
    initTypeComposers();
  }
  return typeComposers.CreateConversationInputTC;
};

export const getUpdateConversationInputTC = () => {
  if (!typeComposers.UpdateConversationInputTC) {
    initTypeComposers();
  }
  return typeComposers.UpdateConversationInputTC;
};

export const getAddInteractionInputTC = () => {
  if (!typeComposers.AddInteractionInputTC) {
    initTypeComposers();
  }
  return typeComposers.AddInteractionInputTC;
};

export const getCompleteInteractionInputTC = () => {
  if (!typeComposers.CompleteInteractionInputTC) {
    initTypeComposers();
  }
  return typeComposers.CompleteInteractionInputTC;
};

export const getFeedbackInputTC = () => {
  if (!typeComposers.FeedbackInputTC) {
    initTypeComposers();
  }
  return typeComposers.FeedbackInputTC;
};

export const getFilterInputTC = () => {
  if (!typeComposers.FilterInputTC) {
    initTypeComposers();
  }
  return typeComposers.FilterInputTC;
};

export default {
  initTypeComposers,
  getAIConversationTC,
  getCreateConversationInputTC,
  getUpdateConversationInputTC,
  getAddInteractionInputTC,
  getCompleteInteractionInputTC,
  getFeedbackInputTC,
  getFilterInputTC
}; 