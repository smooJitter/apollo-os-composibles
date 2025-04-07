import { schemaComposer } from 'graphql-compose';
import { ConversationalAgent } from './schemas.js';
import {
  getConversationalAgentTC,
  getCreateAgentInputTC,
  getUpdateAgentInputTC,
  getCreateGoalInputTC,
  getMemoryInputTC,
  getActionInputTC,
  getUpdateActionInputTC,
  getFilterAgentInputTC,
  getProcessMessageInputTC
} from './registry.js';
import { 
  AGENT_TYPE_ENUMS, 
  AGENT_STATUS_ENUMS, 
  ACTION_STATUS_ENUMS,
  DEFAULT_AGENT_CONFIGURATIONS
} from './constants.js';
import mongoose from 'mongoose';

export const initResolvers = (context = {}) => {
  const { logger = console, emitEvent, validateUser, verifyOwnership } = context;

  // Initialize all type composers
  const ConversationalAgentTC = getConversationalAgentTC();
  
  // ===== Query Resolvers =====
  
  // Get agent by ID
  schemaComposer.Query.addFields({
    conversationalAgentById: {
      type: ConversationalAgentTC,
      args: {
        agentId: 'MongoID!'
      },
      resolve: async (_, { agentId }, { userId }) => {
        try {
          validateUser(userId);
          const agent = await ConversationalAgent.findById(agentId);
          
          if (!agent) {
            throw new Error(`Agent with ID ${agentId} not found`);
          }
          
          if (agent.userId.toString() !== userId) {
            throw new Error('You do not have permission to access this agent');
          }
          
          return agent;
        } catch (error) {
          logger.error('[Agent Query] Error fetching agent by ID:', error);
          throw error;
        }
      }
    }
  });
  
  // Get agents for the current user
  schemaComposer.Query.addFields({
    myConversationalAgents: {
      type: [ConversationalAgentTC],
      args: {
        filter: getFilterAgentInputTC(),
        limit: 'Int',
        skip: 'Int',
        sort: 'String'
      },
      resolve: async (_, { filter = {}, limit = 20, skip = 0, sort = '-createdAt' }, { userId }) => {
        try {
          validateUser(userId);
          
          const query = { userId: mongoose.Types.ObjectId(userId) };
          
          // Apply filters
          if (filter.type) query.type = filter.type;
          if (filter.status) query.status = filter.status;
          if (filter.isDefault !== undefined) query.isDefault = filter.isDefault;
          
          // Apply search query if provided
          if (filter.searchQuery) {
            const searchRegex = new RegExp(filter.searchQuery, 'i');
            query.$or = [
              { name: searchRegex },
              { description: searchRegex }
            ];
          }
          
          return await ConversationalAgent.find(query)
            .sort(sort)
            .skip(skip)
            .limit(limit);
        } catch (error) {
          logger.error('[Agent Query] Error fetching user agents:', error);
          throw error;
        }
      }
    }
  });
  
  // Get agent by conversation ID
  schemaComposer.Query.addFields({
    conversationalAgentByConversation: {
      type: ConversationalAgentTC,
      args: {
        conversationId: 'MongoID!'
      },
      resolve: async (_, { conversationId }, { userId }) => {
        try {
          validateUser(userId);
          
          // Find agent with actions that have this conversation ID
          const agent = await ConversationalAgent.findOne({
            userId: mongoose.Types.ObjectId(userId),
            'actions.conversationId': mongoose.Types.ObjectId(conversationId)
          });
          
          if (!agent) {
            throw new Error(`No agent found for conversation ${conversationId}`);
          }
          
          return agent;
        } catch (error) {
          logger.error('[Agent Query] Error fetching agent by conversation:', error);
          throw error;
        }
      }
    }
  });
  
  // Get default agent
  schemaComposer.Query.addFields({
    defaultConversationalAgent: {
      type: ConversationalAgentTC,
      resolve: async (_, __, { userId }) => {
        try {
          validateUser(userId);
          
          const defaultAgent = await ConversationalAgent.findOne({
            userId: mongoose.Types.ObjectId(userId),
            isDefault: true
          });
          
          if (!defaultAgent) {
            // If no default agent, get the most recently created one
            const agent = await ConversationalAgent.findOne({
              userId: mongoose.Types.ObjectId(userId)
            }).sort('-createdAt');
            
            return agent;
          }
          
          return defaultAgent;
        } catch (error) {
          logger.error('[Agent Query] Error fetching default agent:', error);
          throw error;
        }
      }
    }
  });
  
  // Get agent dashboard stats
  schemaComposer.Query.addFields({
    conversationalAgentStats: {
      type: 'JSON',
      resolve: async (_, __, { userId }) => {
        try {
          validateUser(userId);
          
          // Get basic counts of different agent types
          const agentCounts = await ConversationalAgent.aggregate([
            { $match: { userId: mongoose.Types.ObjectId(userId) } },
            { $group: { _id: '$type', count: { $sum: 1 } } }
          ]);
          
          // Get action counts by status
          const actionCounts = await ConversationalAgent.aggregate([
            { $match: { userId: mongoose.Types.ObjectId(userId) } },
            { $unwind: '$actions' },
            { $group: { _id: '$actions.status', count: { $sum: 1 } } }
          ]);
          
          // Get goal counts
          const goalCounts = await ConversationalAgent.aggregate([
            { $match: { userId: mongoose.Types.ObjectId(userId) } },
            { $unwind: '$goals' },
            { $group: { 
              _id: '$goals.isCompleted', 
              count: { $sum: 1 } 
            }}
          ]);
          
          // Get most active agent
          const mostActiveAgent = await ConversationalAgent.aggregate([
            { $match: { userId: mongoose.Types.ObjectId(userId) } },
            { $project: { 
              name: 1, 
              type: 1,
              actionCount: { $size: { $ifNull: ['$actions', []] } } 
            }},
            { $sort: { actionCount: -1 } },
            { $limit: 1 }
          ]);
          
          return {
            agentCounts: agentCounts.reduce((acc, { _id, count }) => {
              acc[_id] = count;
              return acc;
            }, {}),
            actionCounts: actionCounts.reduce((acc, { _id, count }) => {
              acc[_id] = count;
              return acc;
            }, {}),
            goalCounts: {
              completed: goalCounts.find(g => g._id === true)?.count || 0,
              pending: goalCounts.find(g => g._id === false)?.count || 0
            },
            mostActiveAgent: mostActiveAgent[0] || null,
            totalAgents: await ConversationalAgent.countDocuments({ 
              userId: mongoose.Types.ObjectId(userId) 
            })
          };
        } catch (error) {
          logger.error('[Agent Query] Error fetching agent stats:', error);
          throw error;
        }
      }
    }
  });
  
  // ===== Mutation Resolvers =====
  
  // Create a new conversational agent
  schemaComposer.Mutation.addFields({
    createConversationalAgent: {
      type: ConversationalAgentTC,
      args: {
        input: getCreateAgentInputTC()
      },
      resolve: async (_, { input }, { userId }) => {
        try {
          validateUser(userId);
          
          const {
            name,
            description = '',
            type = AGENT_TYPE_ENUMS[0],
            avatar = '',
            isDefault = false,
            configuration
          } = input;
          
          // If this is set as default, unset any existing default agent
          if (isDefault) {
            await ConversationalAgent.updateMany(
              { userId: mongoose.Types.ObjectId(userId), isDefault: true },
              { $set: { isDefault: false } }
            );
          }
          
          // Apply default system message if not provided
          if (configuration && !configuration.systemMessage) {
            const defaultConfig = DEFAULT_AGENT_CONFIGURATIONS && DEFAULT_AGENT_CONFIGURATIONS[type];
            if (defaultConfig && defaultConfig.systemMessage) {
              configuration.systemMessage = defaultConfig.systemMessage;
            }
          }
          
          const agent = new ConversationalAgent({
            userId: mongoose.Types.ObjectId(userId),
            name,
            description,
            type,
            avatar,
            status: AGENT_STATUS_ENUMS[0], // Default to first status (likely 'Active')
            isDefault,
            configuration,
            goals: [],
            memories: [],
            actions: [],
            performance: {
              successRate: 0,
              averageResponseTime: 0,
              completedActionCount: 0,
              failedActionCount: 0,
              lastEvaluatedAt: new Date()
            },
            lastActive: new Date()
          });
          
          await agent.save();
          
          // Emit event for agent creation
          if (emitEvent) {
            emitEvent('agent:created', {
              userId,
              agentId: agent._id,
              agentType: type,
              timestamp: new Date()
            });
          }
          
          return agent;
        } catch (error) {
          logger.error('[Agent Mutation] Error creating agent:', error);
          throw error;
        }
      }
    }
  });
  
  // Update an existing agent
  schemaComposer.Mutation.addFields({
    updateConversationalAgent: {
      type: ConversationalAgentTC,
      args: {
        agentId: 'MongoID!',
        input: getUpdateAgentInputTC()
      },
      resolve: async (_, { agentId, input }, { userId }) => {
        try {
          validateUser(userId);
          
          const agent = await ConversationalAgent.findById(agentId);
          if (!agent) {
            throw new Error(`Agent with ID ${agentId} not found`);
          }
          
          verifyOwnership(agent, userId);
          
          // If setting as default, unset any existing default agents
          if (input.isDefault) {
            await ConversationalAgent.updateMany(
              { 
                userId: mongoose.Types.ObjectId(userId), 
                isDefault: true,
                _id: { $ne: mongoose.Types.ObjectId(agentId) }
              },
              { $set: { isDefault: false } }
            );
          }
          
          // Update agent properties
          Object.keys(input).forEach(key => {
            if (input[key] !== undefined) {
              agent[key] = input[key];
            }
          });
          
          await agent.save();
          
          // Emit event for agent update
          if (emitEvent) {
            emitEvent('agent:updated', {
              userId,
              agentId: agent._id,
              updatedFields: Object.keys(input),
              timestamp: new Date()
            });
          }
          
          return agent;
        } catch (error) {
          logger.error('[Agent Mutation] Error updating agent:', error);
          throw error;
        }
      }
    }
  });
  
  // Delete an agent
  schemaComposer.Mutation.addFields({
    deleteConversationalAgent: {
      type: 'Boolean',
      args: {
        agentId: 'MongoID!'
      },
      resolve: async (_, { agentId }, { userId }) => {
        try {
          validateUser(userId);
          
          const agent = await ConversationalAgent.findById(agentId);
          if (!agent) {
            throw new Error(`Agent with ID ${agentId} not found`);
          }
          
          verifyOwnership(agent, userId);
          
          await ConversationalAgent.deleteOne({ _id: mongoose.Types.ObjectId(agentId) });
          
          // Emit event for agent deletion
          if (emitEvent) {
            emitEvent('agent:deleted', {
              userId,
              agentId,
              timestamp: new Date()
            });
          }
          
          return true;
        } catch (error) {
          logger.error('[Agent Mutation] Error deleting agent:', error);
          throw error;
        }
      }
    }
  });
  
  // Add a goal to an agent
  schemaComposer.Mutation.addFields({
    addGoalToAgent: {
      type: ConversationalAgentTC,
      args: {
        agentId: 'MongoID!',
        input: getCreateGoalInputTC()
      },
      resolve: async (_, { agentId, input }, { userId }) => {
        try {
          validateUser(userId);
          
          const agent = await ConversationalAgent.findById(agentId);
          if (!agent) {
            throw new Error(`Agent with ID ${agentId} not found`);
          }
          
          verifyOwnership(agent, userId);
          
          const goal = {
            description: input.description,
            metrics: input.metrics || {},
            targetDate: input.targetDate,
            createdAt: new Date(),
            isCompleted: false,
            completedAt: null
          };
          
          if (input.relatedEntityType && input.relatedEntityId) {
            goal.relatedEntityType = input.relatedEntityType;
            goal.relatedEntityId = mongoose.Types.ObjectId(input.relatedEntityId);
          }
          
          agent.goals.push(goal);
          await agent.save();
          
          // Emit event for goal addition
          if (emitEvent) {
            emitEvent('agent:goal:added', {
              userId,
              agentId: agent._id,
              goalId: agent.goals[agent.goals.length - 1]._id,
              timestamp: new Date()
            });
          }
          
          return agent;
        } catch (error) {
          logger.error('[Agent Mutation] Error adding goal:', error);
          throw error;
        }
      }
    }
  });
  
  // Complete a goal
  schemaComposer.Mutation.addFields({
    completeAgentGoal: {
      type: ConversationalAgentTC,
      args: {
        agentId: 'MongoID!',
        goalId: 'MongoID!'
      },
      resolve: async (_, { agentId, goalId }, { userId }) => {
        try {
          validateUser(userId);
          
          const agent = await ConversationalAgent.findById(agentId);
          if (!agent) {
            throw new Error(`Agent with ID ${agentId} not found`);
          }
          
          verifyOwnership(agent, userId);
          
          const goalIndex = agent.goals.findIndex(g => g._id.toString() === goalId);
          if (goalIndex === -1) {
            throw new Error(`Goal with ID ${goalId} not found`);
          }
          
          agent.goals[goalIndex].isCompleted = true;
          agent.goals[goalIndex].completedAt = new Date();
          
          await agent.save();
          
          // Emit event for goal completion
          if (emitEvent) {
            emitEvent('agent:goal:completed', {
              userId,
              agentId: agent._id,
              goalId,
              timestamp: new Date()
            });
          }
          
          return agent;
        } catch (error) {
          logger.error('[Agent Mutation] Error completing goal:', error);
          throw error;
        }
      }
    }
  });
  
  // Add a memory to an agent
  schemaComposer.Mutation.addFields({
    addMemoryToAgent: {
      type: ConversationalAgentTC,
      args: {
        agentId: 'MongoID!',
        input: getMemoryInputTC()
      },
      resolve: async (_, { agentId, input }, { userId }) => {
        try {
          validateUser(userId);
          
          const agent = await ConversationalAgent.findById(agentId);
          if (!agent) {
            throw new Error(`Agent with ID ${agentId} not found`);
          }
          
          verifyOwnership(agent, userId);
          
          const memory = {
            key: input.key,
            value: input.value,
            createdAt: new Date(),
            importance: input.importance || 1,
            expiresAt: input.expiresAt
          };
          
          if (input.context) {
            memory.context = input.context;
          }
          
          agent.memories.push(memory);
          await agent.save();
          
          // Emit event for memory addition
          if (emitEvent) {
            emitEvent('agent:memory:added', {
              userId,
              agentId: agent._id,
              memoryId: agent.memories[agent.memories.length - 1]._id,
              key: input.key,
              importance: input.importance || 1,
              timestamp: new Date()
            });
          }
          
          return agent;
        } catch (error) {
          logger.error('[Agent Mutation] Error adding memory:', error);
          throw error;
        }
      }
    }
  });
  
  // Create an action for an agent
  schemaComposer.Mutation.addFields({
    createAgentAction: {
      type: ConversationalAgentTC,
      args: {
        agentId: 'MongoID!',
        input: getActionInputTC()
      },
      resolve: async (_, { agentId, input }, { userId }) => {
        try {
          validateUser(userId);
          
          const agent = await ConversationalAgent.findById(agentId);
          if (!agent) {
            throw new Error(`Agent with ID ${agentId} not found`);
          }
          
          verifyOwnership(agent, userId);
          
          // Make sure agent has permission for this action type
          const actionType = input.type;
          const allowedActionTypes = agent.configuration?.allowedActionTypes || [];
          if (!allowedActionTypes.includes(actionType)) {
            throw new Error(`Agent does not have permission to perform ${actionType} actions`);
          }
          
          const action = {
            type: actionType,
            description: input.description,
            data: input.data,
            reasoning: input.reasoning,
            status: input.autoExecute ? ACTION_STATUS_ENUMS[0] : ACTION_STATUS_ENUMS[1], // Active or AwaitingApproval
            createdAt: new Date(),
            completedAt: null,
            result: null,
            error: null
          };
          
          if (input.conversationId) {
            action.conversationId = mongoose.Types.ObjectId(input.conversationId);
          }
          
          if (input.interactionId) {
            action.interactionId = mongoose.Types.ObjectId(input.interactionId);
          }
          
          if (input.entityType && input.entityId) {
            action.entityType = input.entityType;
            action.entityId = mongoose.Types.ObjectId(input.entityId);
          }
          
          agent.actions.push(action);
          agent.lastActive = new Date();
          await agent.save();
          
          // Emit event for action creation
          if (emitEvent) {
            emitEvent('agent:action:created', {
              userId,
              agentId: agent._id,
              actionId: agent.actions[agent.actions.length - 1]._id,
              actionType,
              status: action.status,
              timestamp: new Date()
            });
          }
          
          return agent;
        } catch (error) {
          logger.error('[Agent Mutation] Error creating action:', error);
          throw error;
        }
      }
    }
  });
  
  // Update an action's status and result
  schemaComposer.Mutation.addFields({
    updateAgentAction: {
      type: ConversationalAgentTC,
      args: {
        agentId: 'MongoID!',
        actionId: 'MongoID!',
        input: getUpdateActionInputTC()
      },
      resolve: async (_, { agentId, actionId, input }, { userId }) => {
        try {
          validateUser(userId);
          
          const agent = await ConversationalAgent.findById(agentId);
          if (!agent) {
            throw new Error(`Agent with ID ${agentId} not found`);
          }
          
          verifyOwnership(agent, userId);
          
          const actionIndex = agent.actions.findIndex(a => a._id.toString() === actionId);
          if (actionIndex === -1) {
            throw new Error(`Action with ID ${actionId} not found`);
          }
          
          const action = agent.actions[actionIndex];
          
          if (input.status) {
            action.status = input.status;
            if (input.status === 'Completed' || input.status === 'Failed') {
              action.completedAt = new Date();
              
              // Update agent performance metrics
              if (!agent.performance) {
                agent.performance = {
                  successRate: 0,
                  averageResponseTime: 0,
                  completedActionCount: 0,
                  failedActionCount: 0,
                  lastEvaluatedAt: new Date()
                };
              }
              
              if (input.status === 'Completed') {
                agent.performance.completedActionCount += 1;
              } else if (input.status === 'Failed') {
                agent.performance.failedActionCount += 1;
              }
              
              const totalActions = agent.performance.completedActionCount + agent.performance.failedActionCount;
              agent.performance.successRate = totalActions > 0 
                ? (agent.performance.completedActionCount / totalActions) * 100
                : 0;
                
              agent.performance.lastEvaluatedAt = new Date();
            }
          }
          
          if (input.result !== undefined) {
            action.result = input.result;
          }
          
          if (input.error) {
            action.error = input.error;
          }
          
          agent.lastActive = new Date();
          await agent.save();
          
          // Emit event for action update
          if (emitEvent) {
            emitEvent('agent:action:updated', {
              userId,
              agentId: agent._id,
              actionId,
              newStatus: input.status,
              timestamp: new Date()
            });
          }
          
          return agent;
        } catch (error) {
          logger.error('[Agent Mutation] Error updating action:', error);
          throw error;
        }
      }
    }
  });
  
  // Process a message with an agent
  schemaComposer.Mutation.addFields({
    processAgentMessage: {
      type: 'JSON',
      args: {
        input: getProcessMessageInputTC()
      },
      resolve: async (_, { input }, { userId }) => {
        try {
          validateUser(userId);
          
          const { agentId, message, conversationId, messageType = 'text' } = input;
          
          const agent = await ConversationalAgent.findById(agentId);
          if (!agent) {
            throw new Error(`Agent with ID ${agentId} not found`);
          }
          
          verifyOwnership(agent, userId);
          
          // Update lastActive timestamp
          agent.lastActive = new Date();
          await agent.save();
          
          // Get system message if available, or fall back to prompt
          const systemMessage = agent.configuration?.systemMessage || agent.configuration?.prompt;
          
          // In a real implementation, this would call an AI service to process the message
          // For now, we'll return a placeholder response
          
          const response = {
            agentId: agent._id,
            agentName: agent.name,
            message: `This is a placeholder response from ${agent.name}. In a real implementation, this would process "${message}" using an AI model.`,
            timestamp: new Date(),
            conversationId: conversationId || null,
            messageType: 'text',
            systemMessageUsed: !!agent.configuration?.systemMessage,
            systemMessagePreview: systemMessage ? systemMessage.substring(0, 50) + '...' : null
          };
          
          // Emit event for message processing
          if (emitEvent) {
            emitEvent('agent:message:processed', {
              userId,
              agentId: agent._id,
              conversationId: conversationId || null,
              timestamp: new Date()
            });
          }
          
          return response;
        } catch (error) {
          logger.error('[Agent Mutation] Error processing message:', error);
          throw error;
        }
      }
    }
  });
};

export default {
  initResolvers
}; 