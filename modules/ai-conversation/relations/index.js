import { getAIConversationTC } from '../registry.js';
import mongoose from 'mongoose';

export const initRelations = (ctx) => {
  const logger = ctx.logger.child({ module: 'ai-conversation-relations' });
  
  try {
    const AIConversationTC = getAIConversationTC();
    
    // Relation to User
    if (ctx.models?.User) {
      try {
        const UserTC = ctx.getModelTC('User');
        
        if (UserTC) {
          // Add relation from User to their conversations
          UserTC.addRelation('aiConversations', {
            resolver: () => AIConversationTC.getResolver('findMany'),
            prepareArgs: {
              filter: (source) => ({
                userId: source._id,
                isActive: true,
                isArchived: { $ne: true }
              }),
              sort: '-lastInteraction'
            },
            projection: { _id: 1 }
          });
          
          // Add relation for recent conversations
          UserTC.addRelation('recentAIConversations', {
            resolver: () => AIConversationTC.getResolver('findMany'),
            prepareArgs: {
              filter: (source) => ({
                userId: source._id,
                isActive: true,
                isArchived: { $ne: true }
              }),
              sort: '-lastInteraction',
              limit: 5
            },
            projection: { _id: 1 }
          });
          
          // Add conversation count field
          UserTC.addFields({
            aiConversationCount: {
              type: 'Int',
              resolve: async (user) => {
                if (!user._id) return 0;
                try {
                  const AIConversation = mongoose.model('AIConversation');
                  const count = await AIConversation.countDocuments({
                    userId: user._id,
                    isActive: true
                  });
                  return count;
                } catch (error) {
                  logger.error('Error counting AI conversations:', error);
                  return 0;
                }
              }
            }
          });
        }
      } catch (error) {
        logger.warn('Could not set up user-to-conversation relation:', error.message);
      }
    } else {
      logger.warn('User model not available for relations');
    }
    
    // Relations to content models
    
    // Manifestation relations
    if (ctx.models?.Manifestation) {
      try {
        const ManifestationTC = ctx.getModelTC('Manifestation');
        
        if (ManifestationTC) {
          // Add relation from Manifestation to related conversations
          ManifestationTC.addRelation('relatedConversations', {
            resolver: () => AIConversationTC.getResolver('findMany'),
            prepareArgs: {
              filter: (source) => ({
                'metadata.relevantEntities.entityType': 'Manifestation',
                'metadata.relevantEntities.entityId': source._id,
                isActive: true
              }),
              sort: '-lastInteraction'
            },
            projection: { _id: 1 }
          });
        }
      } catch (error) {
        logger.warn('Could not set up manifestation relations:', error.message);
      }
    }
    
    // Habit relations
    if (ctx.models?.Habit) {
      try {
        const HabitTC = ctx.getModelTC('Habit');
        
        if (HabitTC) {
          // Add relation from Habit to related conversations
          HabitTC.addRelation('relatedConversations', {
            resolver: () => AIConversationTC.getResolver('findMany'),
            prepareArgs: {
              filter: (source) => ({
                'metadata.relevantEntities.entityType': 'Habit',
                'metadata.relevantEntities.entityId': source._id,
                isActive: true
              }),
              sort: '-lastInteraction'
            },
            projection: { _id: 1 }
          });
        }
      } catch (error) {
        logger.warn('Could not set up habit relations:', error.message);
      }
    }
    
    // Milestone relations
    if (ctx.models?.Milestone) {
      try {
        const MilestoneTC = ctx.getModelTC('Milestone');
        
        if (MilestoneTC) {
          // Add relation from Milestone to related conversations
          MilestoneTC.addRelation('relatedConversations', {
            resolver: () => AIConversationTC.getResolver('findMany'),
            prepareArgs: {
              filter: (source) => ({
                'metadata.relevantEntities.entityType': 'Milestone',
                'metadata.relevantEntities.entityId': source._id,
                isActive: true
              }),
              sort: '-lastInteraction'
            },
            projection: { _id: 1 }
          });
        }
      } catch (error) {
        logger.warn('Could not set up milestone relations:', error.message);
      }
    }
    
    // Immersion relations
    if (ctx.models?.Immersion) {
      try {
        const ImmersionTC = ctx.getModelTC('Immersion');
        
        if (ImmersionTC) {
          // Add relation from Immersion to related conversations
          ImmersionTC.addRelation('relatedConversations', {
            resolver: () => AIConversationTC.getResolver('findMany'),
            prepareArgs: {
              filter: (source) => ({
                'metadata.relevantEntities.entityType': 'Immersion',
                'metadata.relevantEntities.entityId': source._id,
                isActive: true
              }),
              sort: '-lastInteraction'
            },
            projection: { _id: 1 }
          });
        }
      } catch (error) {
        logger.warn('Could not set up immersion relations:', error.message);
      }
    }
    
    // Add relations for entity content to conversations
    addContentRelationsToConversation(AIConversationTC, 'Manifestation', logger);
    addContentRelationsToConversation(AIConversationTC, 'Habit', logger);
    addContentRelationsToConversation(AIConversationTC, 'Milestone', logger);
    addContentRelationsToConversation(AIConversationTC, 'Immersion', logger);
    
    return ctx;
  } catch (error) {
    logger.error('Error initializing ai-conversation relations:', error);
    throw error;
  }
};

/**
 * Helper function to add content relation to the AI Conversation TC
 */
function addContentRelationsToConversation(AIConversationTC, contentType, logger) {
  try {
    const fieldName = `related${contentType}s`;
    
    AIConversationTC.addFields({
      [fieldName]: {
        type: '[JSON]',
        description: `Related ${contentType} entities referenced in the conversation`,
        resolve: async (conversation) => {
          if (!conversation.metadata?.relevantEntities) {
            return [];
          }
          
          try {
            // Get relevant entities of this type
            const relevantIds = conversation.metadata.relevantEntities
              .filter(entity => entity.entityType === contentType)
              .map(entity => entity.entityId);
            
            if (relevantIds.length === 0) {
              return [];
            }
            
            // Get the entities from DB
            const ContentModel = mongoose.model(contentType);
            const entities = await ContentModel.find({
              _id: { $in: relevantIds }
            });
            
            return entities.map(entity => ({
              _id: entity._id,
              title: entity.title,
              relevanceScore: conversation.metadata.relevantEntities.find(
                re => re.entityId.toString() === entity._id.toString()
              )?.relevanceScore || 0.5
            }));
          } catch (error) {
            logger.error(`Error resolving related ${contentType} entities:`, error);
            return [];
          }
        }
      }
    });
  } catch (error) {
    logger.error(`Error adding ${contentType} relations:`, error);
  }
}

export default initRelations; 