import mongoose from 'mongoose';
import { ConversationalAgent } from '../schemas.js';
import {
  AGENT_TYPE_ENUMS,
  AGENT_STATUS_ENUMS,
  ACTION_STATUS_ENUMS,
  AGENT_MEMORY_KEY_ENUMS
} from '../constants.js';

// Define module-specific events
export const AGENT_EVENTS = {
  AGENT_CREATED: 'agent:created',
  AGENT_UPDATED: 'agent:updated',
  AGENT_DELETED: 'agent:deleted',
  GOAL_ADDED: 'agent:goal:added',
  GOAL_COMPLETED: 'agent:goal:completed',
  MEMORY_ADDED: 'agent:memory:added',
  ACTION_CREATED: 'agent:action:created',
  ACTION_UPDATED: 'agent:action:updated',
  MESSAGE_PROCESSED: 'agent:message:processed'
};

export const initHooks = (context = {}) => {
  const { 
    logger = console, 
    eventBus, 
    validateUser, 
    verifyOwnership,
    getModuleActions 
  } = context;
  
  if (!eventBus) {
    logger.warn('[Agent Hooks] Event bus not provided, hooks will not be registered');
    return;
  }
  
  // Get actions from other modules if needed
  const immersionActions = getModuleActions ? getModuleActions('immersion') : null;
  const manifestationActions = getModuleActions ? getModuleActions('manifestation') : null;
  const conversationActions = getModuleActions ? getModuleActions('conversation') : null;
  const notificationsActions = getModuleActions ? getModuleActions('unified-recommendations') : null;
  
  try {
    // Listen for agent creation events
    eventBus.on(AGENT_EVENTS.AGENT_CREATED, async (data) => {
      try {
        const { userId, agentId, agentType, timestamp } = data;
        
        logger.info(`[Agent Hooks] Agent created: ${agentId} of type ${agentType}`);
        
        // For Personal Assistant type, automatically create some initial goals
        if (agentType === 'Personal Assistant') {
          const agent = await ConversationalAgent.findById(agentId);
          
          if (agent) {
            // Add initial goals
            const initialGoals = [
              {
                description: 'Help user organize and prioritize tasks',
                metrics: { priority: 'high' },
                createdAt: new Date(),
                isCompleted: false
              },
              {
                description: 'Provide timely reminders for important events',
                metrics: { priority: 'medium' },
                createdAt: new Date(),
                isCompleted: false
              },
              {
                description: 'Learn user preferences over time',
                metrics: { priority: 'medium', longTerm: true },
                createdAt: new Date(),
                isCompleted: false
              }
            ];
            
            agent.goals.push(...initialGoals);
            await agent.save();
            
            logger.info(`[Agent Hooks] Added initial goals to Personal Assistant agent ${agentId}`);
          }
        }
        
        // Create initial memory for the agent
        if (notificationsActions) {
          // Send welcome notification to user
          try {
            await notificationsActions.createNotification({
              userId,
              notification: {
                title: "Agent Created",
                description: `Your new agent "${agentType}" is ready to assist you!`,
                priority: "medium",
                category: "system",
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
              }
            });
            logger.info(`[Agent Hooks] Sent notification for new agent ${agentId}`);
          } catch (error) {
            logger.error('[Agent Hooks] Failed to send notification for new agent:', error);
          }
        }
      } catch (error) {
        logger.error('[Agent Hooks] Error processing agent creation:', error);
      }
    });
    
    // Listen for agent action creation events
    eventBus.on(AGENT_EVENTS.ACTION_CREATED, async (data) => {
      try {
        const { userId, agentId, actionId, actionType, status, timestamp } = data;
        
        logger.info(`[Agent Hooks] Agent action created: ${actionId} of type ${actionType}`);
        
        // If action is a query about immersions, automatically get information
        if (actionType === 'QueryImmersions' && immersionActions) {
          try {
            const agent = await ConversationalAgent.findById(agentId);
            
            if (agent) {
              // Find the action
              const actionIndex = agent.actions.findIndex(a => a._id.toString() === actionId);
              
              if (actionIndex !== -1) {
                const action = agent.actions[actionIndex];
                
                // If action data contains a query, use it to search immersions
                if (action.data && action.data.query) {
                  // Get immersions matching the query
                  const immersions = await immersionActions.searchImmersions({
                    userId,
                    searchQuery: action.data.query,
                    limit: 5
                  });
                  
                  // Update the action with the results
                  agent.actions[actionIndex].result = {
                    immersions: immersions.map(i => ({
                      id: i._id,
                      title: i.title,
                      type: i.type,
                      description: i.description
                    })),
                    totalFound: immersions.length
                  };
                  agent.actions[actionIndex].status = 'Completed';
                  agent.actions[actionIndex].completedAt = new Date();
                  
                  await agent.save();
                  
                  logger.info(`[Agent Hooks] Auto-processed QueryImmersions action ${actionId}`);
                }
              }
            }
          } catch (error) {
            logger.error('[Agent Hooks] Error processing immersion query action:', error);
          }
        }
        
        // If the action requires learning user preferences, store data in agent memory
        if (actionType === 'LearnPreference') {
          try {
            const agent = await ConversationalAgent.findById(agentId);
            
            if (agent) {
              const actionIndex = agent.actions.findIndex(a => a._id.toString() === actionId);
              
              if (actionIndex !== -1) {
                const action = agent.actions[actionIndex];
                
                if (action.data && action.data.preferenceType && action.data.preferenceValue) {
                  // Add to agent's memory
                  const memoryKey = `user_preference_${action.data.preferenceType}`;
                  
                  // Check if memory already exists
                  const memoryIndex = agent.memories.findIndex(m => m.key === memoryKey);
                  
                  if (memoryIndex !== -1) {
                    // Update existing memory
                    agent.memories[memoryIndex].value = action.data.preferenceValue;
                    agent.memories[memoryIndex].updatedAt = new Date();
                  } else {
                    // Add new memory
                    agent.memories.push({
                      key: memoryKey,
                      value: action.data.preferenceValue,
                      importance: 3, // Higher importance for user preferences
                      createdAt: new Date()
                    });
                  }
                  
                  // Update action status
                  agent.actions[actionIndex].status = 'Completed';
                  agent.actions[actionIndex].completedAt = new Date();
                  agent.actions[actionIndex].result = { 
                    stored: true, 
                    memoryKey 
                  };
                  
                  await agent.save();
                  
                  logger.info(`[Agent Hooks] Stored user preference in agent memory for ${agentId}`);
                }
              }
            }
          } catch (error) {
            logger.error('[Agent Hooks] Error processing learn preference action:', error);
          }
        }
      } catch (error) {
        logger.error('[Agent Hooks] Error processing action creation:', error);
      }
    });
    
    // Listen for goal completion events
    eventBus.on(AGENT_EVENTS.GOAL_COMPLETED, async (data) => {
      try {
        const { userId, agentId, goalId, timestamp } = data;
        
        logger.info(`[Agent Hooks] Agent goal completed: ${goalId} for agent ${agentId}`);
        
        const agent = await ConversationalAgent.findById(agentId);
        
        if (agent) {
          // Find the goal
          const goal = agent.goals.find(g => g._id.toString() === goalId);
          
          if (goal && goal.relatedEntityType && goal.relatedEntityId) {
            // If goal is related to a manifestation, update manifestation progress
            if (goal.relatedEntityType === 'manifestation' && manifestationActions) {
              try {
                await manifestationActions.logProgress({
                  userId,
                  manifestationId: goal.relatedEntityId,
                  progress: {
                    value: 1,
                    note: `Completed by agent: ${agent.name}`,
                    timestamp: new Date()
                  }
                });
                
                logger.info(`[Agent Hooks] Updated manifestation progress for ${goal.relatedEntityId}`);
              } catch (error) {
                logger.error('[Agent Hooks] Error updating manifestation progress:', error);
              }
            }
          }
          
          // Check if all goals are completed
          const allGoalsCompleted = agent.goals.every(g => g.isCompleted);
          
          if (allGoalsCompleted && agent.goals.length > 0) {
            // Send notification to user
            if (notificationsActions) {
              try {
                await notificationsActions.createNotification({
                  userId,
                  notification: {
                    title: "All Agent Goals Completed",
                    description: `Your agent "${agent.name}" has completed all assigned goals!`,
                    priority: "medium",
                    category: "achievement",
                    expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days
                  }
                });
                logger.info(`[Agent Hooks] Sent notification for all goals completed for agent ${agentId}`);
              } catch (error) {
                logger.error('[Agent Hooks] Failed to send notification for goals completion:', error);
              }
            }
          }
        }
      } catch (error) {
        logger.error('[Agent Hooks] Error processing goal completion:', error);
      }
    });
    
    // Listen for agent message processing events to analyze conversations
    eventBus.on(AGENT_EVENTS.MESSAGE_PROCESSED, async (data) => {
      try {
        const { userId, agentId, conversationId, timestamp } = data;
        
        // Only process if we have a conversation ID
        if (!conversationId) return;
        
        logger.info(`[Agent Hooks] Agent processed message in conversation: ${conversationId}`);
        
        const agent = await ConversationalAgent.findById(agentId);
        
        if (agent && conversationActions) {
          try {
            // Get the latest messages from the conversation
            const conversationData = await conversationActions.getConversation({
              userId,
              conversationId,
              limit: 5
            });
            
            if (!conversationData || !conversationData.messages || conversationData.messages.length === 0) {
              return;
            }
            
            // Store conversation summary in agent memory
            const latestMessages = conversationData.messages;
            const summary = latestMessages.map(m => `${m.sender}: ${m.content}`).join(' | ');
            
            // Add to agent's memory
            const memoryKey = `conversation_${conversationId}_summary`;
            
            // Check if memory already exists
            const memoryIndex = agent.memories.findIndex(m => m.key === memoryKey);
            
            if (memoryIndex !== -1) {
              // Update existing memory
              agent.memories[memoryIndex].value = summary;
              agent.memories[memoryIndex].updatedAt = new Date();
            } else {
              // Add new memory
              agent.memories.push({
                key: memoryKey,
                value: summary,
                importance: 2,
                context: 'conversation',
                createdAt: new Date()
              });
            }
            
            await agent.save();
            
            logger.info(`[Agent Hooks] Updated conversation memory for agent ${agentId}`);
          } catch (error) {
            logger.error('[Agent Hooks] Error updating conversation memory:', error);
          }
        }
      } catch (error) {
        logger.error('[Agent Hooks] Error processing message event:', error);
      }
    });
    
    // Listen for agent deletion events
    eventBus.on(AGENT_EVENTS.AGENT_DELETED, async (data) => {
      try {
        const { userId, agentId, timestamp } = data;
        
        logger.info(`[Agent Hooks] Agent deleted: ${agentId}`);
        
        // If this was the default agent, set a new default agent
        const deletedAgentWasDefault = await ConversationalAgent.countDocuments({
          userId: mongoose.Types.ObjectId(userId),
          isDefault: true
        }) === 0;
        
        if (deletedAgentWasDefault) {
          // Find the most recently created agent
          const newDefaultAgent = await ConversationalAgent.findOne({
            userId: mongoose.Types.ObjectId(userId)
          }).sort('-createdAt');
          
          if (newDefaultAgent) {
            newDefaultAgent.isDefault = true;
            await newDefaultAgent.save();
            
            logger.info(`[Agent Hooks] Set new default agent ${newDefaultAgent._id} after deletion`);
          }
        }
      } catch (error) {
        logger.error('[Agent Hooks] Error processing agent deletion:', error);
      }
    });
    
    logger.info('[Agent Hooks] Successfully registered event hooks for conversational agents');
  } catch (error) {
    logger.error('[Agent Hooks] Error registering hooks:', error);
  }
};

export default {
  initHooks,
  AGENT_EVENTS
}; 