import { AIConversation } from '../schemas.js';
import { CONVERSATION_EVENTS } from '../constants.js';
import mongoose from 'mongoose';

export const initHooks = (ctx) => {
  const { eventBus, logger } = ctx;
  const log = logger.child({ module: 'ai-conversation-hooks' });
  
  if (eventBus) {
    // Listen for conversation created events
    eventBus.on(CONVERSATION_EVENTS.CONVERSATION_CREATED, async ({ conversation, userId }) => {
      try {
        if (!conversation || !userId) return;
        
        // Log the event
        log.info(`New conversation created: ${conversation._id} for user ${userId}`);
        
        // Additional processing could happen here
        // For example, updating analytics, or triggering AI suggestions
      } catch (error) {
        log.error(`Error processing conversation created event: ${error.message}`, { error });
      }
    });
    
    // Listen for interaction added events
    eventBus.on(CONVERSATION_EVENTS.INTERACTION_ADDED, async ({ conversation, interaction, userId }) => {
      try {
        if (!conversation || !interaction || !userId) return;
        
        // Log the event
        log.info(`New interaction added to conversation ${conversation._id}`);
        
        // Process message entities or trigger AI response here
        await processMessageForEntities(conversation, interaction, ctx);
        
      } catch (error) {
        log.error(`Error processing interaction added event: ${error.message}`, { error });
      }
    });
    
    // Listen for user feedback events
    eventBus.on(CONVERSATION_EVENTS.USER_FEEDBACK_ADDED, async ({ conversation, feedback, userId }) => {
      try {
        if (!conversation || !feedback || !userId) return;
        
        // Log the event
        log.info(`Feedback added to conversation ${conversation._id}: Rating ${feedback.rating}`);
        
        // If the rating is low, we might want to flag it for review
        if (feedback.rating <= 2) {
          log.info(`Low rating received for conversation ${conversation._id}, flagging for review`);
          
          // You could send notifications or update analytics here
        }
        
      } catch (error) {
        log.error(`Error processing feedback added event: ${error.message}`, { error });
      }
    });
    
    // Integrate with other modules when a conversation is completed
    eventBus.on(CONVERSATION_EVENTS.CONVERSATION_COMPLETED, async ({ conversation, userId }) => {
      try {
        if (!conversation || !userId) return;
        
        // Log the event
        log.info(`Conversation ${conversation._id} completed`);
        
        // Check if the conversation has relevantEntities in metadata
        const relevantEntities = conversation.metadata?.relevantEntities || [];
        
        for (const entity of relevantEntities) {
          if (!entity.entityId || !entity.entityType) continue;
          
          // Based on entity type, we might want to update the related entity
          switch (entity.entityType) {
            case 'Manifestation':
              if (ctx.models?.Manifestation) {
                // Update manifestation with insights from conversation
                log.info(`Updating manifestation ${entity.entityId} based on conversation`);
                // Implementation would go here
              }
              break;
              
            case 'Habit':
              if (ctx.models?.Habit) {
                // Update habit with insights from conversation
                log.info(`Updating habit ${entity.entityId} based on conversation`);
                // Implementation would go here
              }
              break;
              
            case 'Milestone':
              if (ctx.models?.Milestone) {
                // Update milestone with insights from conversation
                log.info(`Updating milestone ${entity.entityId} based on conversation`);
                // Implementation would go here
              }
              break;
            
            case 'Immersion':
              if (ctx.models?.Immersion) {
                // Create recommendation based on conversation
                log.info(`Creating immersion recommendation based on conversation ${conversation._id}`);
                // Implementation would go here
              }
              break;
          }
        }
        
      } catch (error) {
        log.error(`Error processing conversation completed event: ${error.message}`, { error });
      }
    });
    
    // Create recommendations based on conversations
    eventBus.on(CONVERSATION_EVENTS.CONVERSATION_ARCHIVED, async ({ conversation, userId }) => {
      try {
        if (!conversation || !userId) return;
        
        // Only create recommendations for conversations with feedback
        if (!conversation.metadata?.userFeedback?.rating) return;
        
        // Only create recommendations for positive experiences
        if (conversation.metadata.userFeedback.rating < 4) return;
        
        // Check if we have the unified recommendations module
        if (ctx.actions?.unifiedRecommendations) {
          // Create a recommendation for similar conversations
          log.info(`Creating conversation recommendation for user ${userId}`);
          
          await ctx.actions.unifiedRecommendations.createRecommendation({
            title: `${conversation.type} Conversation`,
            message: `Based on your positive feedback, you might want to continue your journey with another ${conversation.type.toLowerCase()} conversation.`,
            contentType: 'AIConversation',
            contentId: conversation._id,
            reason: 'Based on your feedback',
            metadata: {
              priority: 'Medium',
              icon: 'chat',
              actionText: 'Start New Conversation',
              actionUrl: `/conversations/new?type=${conversation.type}`
            }
          }, userId);
        }
        
      } catch (error) {
        log.error(`Error processing conversation archived event: ${error.message}`, { error });
      }
    });
  }
  
  return ctx;
};

/**
 * Process a message to identify entities and update the conversation metadata
 */
async function processMessageForEntities(conversation, interaction, ctx) {
  try {
    // This could be replaced with a real NLP service 
    // For now, we'll do a simple keyword detection
    const message = interaction.message.toLowerCase();
    
    // Simple detection of entity types in the message
    const entityTypes = {
      Manifestation: ['manifest', 'manifestation', 'desire', 'goal', 'intention'],
      Habit: ['habit', 'routine', 'daily', 'practice', 'consistent'],
      Milestone: ['milestone', 'achievement', 'target', 'goal', 'objective'],
      Immersion: ['immersion', 'visualization', 'experience', 'journey', 'meditation']
    };
    
    const detectedTypes = [];
    for (const [type, keywords] of Object.entries(entityTypes)) {
      if (keywords.some(keyword => message.includes(keyword))) {
        detectedTypes.push(type);
      }
    }
    
    // If we detected entities, update the conversation
    if (detectedTypes.length > 0) {
      // If this is one of the first few interactions, update the conversation type
      if (conversation.interactions.length <= 3 && detectedTypes[0]) {
        // Map entity type to conversation type
        const typeMapping = {
          Manifestation: 'Manifestation',
          Habit: 'Habit Formation',
          Milestone: 'Goal Setting',
          Immersion: 'Meditation'
        };
        
        if (typeMapping[detectedTypes[0]] && conversation.type === 'General') {
          conversation.type = typeMapping[detectedTypes[0]];
          await conversation.save();
        }
      }
      
      // We could fetch related entities here and add them to the conversation
      // This would involve querying the database for entities matching keywords
    }
    
  } catch (error) {
    ctx.logger.error(`Error processing message for entities: ${error.message}`, { error });
  }
}

export default initHooks; 