import mongoose from 'mongoose';
import { ConversationalAgent } from '../schemas.js';
import {
  AGENT_TYPE_ENUMS,
  AGENT_STATUS_ENUMS,
  ACTION_STATUS_ENUMS,
  AGENT_ACTION_TYPE_ENUMS,
  AGENT_MEMORY_KEY_ENUMS,
  DEFAULT_AGENT_CONFIGURATIONS
} from '../constants.js';

export const initActions = (context = {}) => {
  const { logger = console, emitEvent, validateUser, verifyOwnership } = context;
  
  const actions = {
    /**
     * Create a new conversational agent
     */
    async createAgent({ userId, agent }) {
      try {
        validateUser(userId);
        
        const {
          name,
          description = '',
          type = AGENT_TYPE_ENUMS[0],
          avatar = '',
          isDefault = false,
          configuration
        } = agent;
        
        // Validate required fields
        if (!name) {
          throw new Error('Agent name is required');
        }
        
        if (!configuration?.prompt) {
          throw new Error('Agent prompt is required');
        }
        
        if (!configuration?.systemInstructions) {
          throw new Error('Agent system instructions are required');
        }
        
        // Apply default system message if not provided
        if (!configuration.systemMessage && DEFAULT_AGENT_CONFIGURATIONS && DEFAULT_AGENT_CONFIGURATIONS[type]) {
          configuration.systemMessage = DEFAULT_AGENT_CONFIGURATIONS[type].systemMessage;
        }
        
        // If this is set as default, unset any existing default agent
        if (isDefault) {
          await ConversationalAgent.updateMany(
            { userId: mongoose.Types.ObjectId(userId), isDefault: true },
            { $set: { isDefault: false } }
          );
        }
        
        const newAgent = new ConversationalAgent({
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
        
        await newAgent.save();
        
        // Emit event for agent creation
        if (emitEvent) {
          emitEvent('agent:created', {
            userId,
            agentId: newAgent._id,
            agentType: type,
            timestamp: new Date()
          });
        }
        
        logger.info(`[Agent Actions] Created agent ${newAgent._id} for user ${userId}`);
        
        return newAgent;
      } catch (error) {
        logger.error('[Agent Actions] Error creating agent:', error);
        throw error;
      }
    },
    
    /**
     * Get an agent by ID
     */
    async getAgentById({ userId, agentId }) {
      try {
        validateUser(userId);
        
        const agent = await ConversationalAgent.findById(agentId);
        
        if (!agent) {
          throw new Error(`Agent with ID ${agentId} not found`);
        }
        
        verifyOwnership(agent, userId);
        
        return agent;
      } catch (error) {
        logger.error('[Agent Actions] Error fetching agent by ID:', error);
        throw error;
      }
    },
    
    /**
     * Update an existing agent
     */
    async updateAgent({ userId, agentId, updates }) {
      try {
        validateUser(userId);
        
        const agent = await ConversationalAgent.findById(agentId);
        
        if (!agent) {
          throw new Error(`Agent with ID ${agentId} not found`);
        }
        
        verifyOwnership(agent, userId);
        
        // If setting as default, unset any existing default agents
        if (updates.isDefault) {
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
        Object.keys(updates).forEach(key => {
          if (updates[key] !== undefined) {
            if (key === 'configuration' && agent.configuration) {
              // Merge configuration objects instead of replacing
              agent.configuration = {
                ...agent.configuration,
                ...updates.configuration
              };
            } else {
              agent[key] = updates[key];
            }
          }
        });
        
        await agent.save();
        
        // Emit event for agent update
        if (emitEvent) {
          emitEvent('agent:updated', {
            userId,
            agentId: agent._id,
            updatedFields: Object.keys(updates),
            timestamp: new Date()
          });
        }
        
        logger.info(`[Agent Actions] Updated agent ${agentId} for user ${userId}`);
        
        return agent;
      } catch (error) {
        logger.error('[Agent Actions] Error updating agent:', error);
        throw error;
      }
    },
    
    /**
     * Delete an agent
     */
    async deleteAgent({ userId, agentId }) {
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
        
        logger.info(`[Agent Actions] Deleted agent ${agentId} for user ${userId}`);
        
        return true;
      } catch (error) {
        logger.error('[Agent Actions] Error deleting agent:', error);
        throw error;
      }
    },
    
    /**
     * Get all agents for a user with optional filtering
     */
    async getUserAgents({ userId, filter = {}, pagination = {} }) {
      try {
        validateUser(userId);
        
        const { limit = 20, skip = 0, sort = '-createdAt' } = pagination;
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
        
        const agents = await ConversationalAgent.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit);
          
        const total = await ConversationalAgent.countDocuments(query);
        
        return {
          agents,
          pagination: {
            total,
            limit,
            skip,
            hasMore: skip + agents.length < total
          }
        };
      } catch (error) {
        logger.error('[Agent Actions] Error fetching user agents:', error);
        throw error;
      }
    },
    
    /**
     * Get the default agent for a user
     */
    async getDefaultAgent({ userId }) {
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
        logger.error('[Agent Actions] Error fetching default agent:', error);
        throw error;
      }
    },
    
    /**
     * Set an agent as the default for a user
     */
    async setDefaultAgent({ userId, agentId }) {
      try {
        validateUser(userId);
        
        const agent = await ConversationalAgent.findById(agentId);
        
        if (!agent) {
          throw new Error(`Agent with ID ${agentId} not found`);
        }
        
        verifyOwnership(agent, userId);
        
        // Unset any existing default agents
        await ConversationalAgent.updateMany(
          { 
            userId: mongoose.Types.ObjectId(userId), 
            isDefault: true,
            _id: { $ne: mongoose.Types.ObjectId(agentId) }
          },
          { $set: { isDefault: false } }
        );
        
        // Set this agent as default
        agent.isDefault = true;
        await agent.save();
        
        logger.info(`[Agent Actions] Set agent ${agentId} as default for user ${userId}`);
        
        return agent;
      } catch (error) {
        logger.error('[Agent Actions] Error setting default agent:', error);
        throw error;
      }
    },
    
    /**
     * Add a goal to an agent
     */
    async addGoal({ userId, agentId, goal }) {
      try {
        validateUser(userId);
        
        const agent = await ConversationalAgent.findById(agentId);
        
        if (!agent) {
          throw new Error(`Agent with ID ${agentId} not found`);
        }
        
        verifyOwnership(agent, userId);
        
        const {
          description,
          metrics = {},
          targetDate,
          relatedEntityType,
          relatedEntityId
        } = goal;
        
        if (!description) {
          throw new Error('Goal description is required');
        }
        
        const newGoal = {
          description,
          metrics,
          targetDate,
          createdAt: new Date(),
          isCompleted: false,
          completedAt: null
        };
        
        if (relatedEntityType && relatedEntityId) {
          newGoal.relatedEntityType = relatedEntityType;
          newGoal.relatedEntityId = mongoose.Types.ObjectId(relatedEntityId);
        }
        
        agent.goals.push(newGoal);
        await agent.save();
        
        const goalId = agent.goals[agent.goals.length - 1]._id;
        
        // Emit event for goal addition
        if (emitEvent) {
          emitEvent('agent:goal:added', {
            userId,
            agentId: agent._id,
            goalId,
            timestamp: new Date()
          });
        }
        
        logger.info(`[Agent Actions] Added goal ${goalId} to agent ${agentId}`);
        
        return { agent, goalId };
      } catch (error) {
        logger.error('[Agent Actions] Error adding goal:', error);
        throw error;
      }
    },
    
    /**
     * Complete a goal
     */
    async completeGoal({ userId, agentId, goalId }) {
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
        
        logger.info(`[Agent Actions] Completed goal ${goalId} for agent ${agentId}`);
        
        return agent;
      } catch (error) {
        logger.error('[Agent Actions] Error completing goal:', error);
        throw error;
      }
    },
    
    /**
     * Add a memory to an agent
     */
    async addMemory({ userId, agentId, memory }) {
      try {
        validateUser(userId);
        
        const agent = await ConversationalAgent.findById(agentId);
        
        if (!agent) {
          throw new Error(`Agent with ID ${agentId} not found`);
        }
        
        verifyOwnership(agent, userId);
        
        const {
          key,
          value,
          context,
          importance = 1,
          expiresAt
        } = memory;
        
        if (!key) {
          throw new Error('Memory key is required');
        }
        
        if (value === undefined) {
          throw new Error('Memory value is required');
        }
        
        const newMemory = {
          key,
          value,
          createdAt: new Date(),
          importance,
          expiresAt
        };
        
        if (context) {
          newMemory.context = context;
        }
        
        // Check if memory with this key already exists
        const existingIndex = agent.memories.findIndex(m => m.key === key);
        
        if (existingIndex !== -1) {
          // Update existing memory
          agent.memories[existingIndex] = {
            ...agent.memories[existingIndex],
            ...newMemory
          };
        } else {
          // Add new memory
          agent.memories.push(newMemory);
        }
        
        await agent.save();
        
        const memoryId = existingIndex !== -1 
          ? agent.memories[existingIndex]._id 
          : agent.memories[agent.memories.length - 1]._id;
        
        // Emit event for memory addition
        if (emitEvent) {
          emitEvent('agent:memory:added', {
            userId,
            agentId: agent._id,
            memoryId,
            key,
            importance,
            timestamp: new Date()
          });
        }
        
        logger.info(`[Agent Actions] Added memory ${key} to agent ${agentId}`);
        
        return { agent, memoryId };
      } catch (error) {
        logger.error('[Agent Actions] Error adding memory:', error);
        throw error;
      }
    },
    
    /**
     * Create an action for an agent
     */
    async createAction({ userId, agentId, action }) {
      try {
        validateUser(userId);
        
        const agent = await ConversationalAgent.findById(agentId);
        
        if (!agent) {
          throw new Error(`Agent with ID ${agentId} not found`);
        }
        
        verifyOwnership(agent, userId);
        
        const {
          type,
          description,
          data,
          reasoning,
          conversationId,
          interactionId,
          autoExecute = false,
          entityType,
          entityId
        } = action;
        
        if (!type) {
          throw new Error('Action type is required');
        }
        
        if (!description) {
          throw new Error('Action description is required');
        }
        
        if (!data) {
          throw new Error('Action data is required');
        }
        
        // Make sure agent has permission for this action type
        const allowedActionTypes = agent.configuration?.allowedActionTypes || [];
        
        if (!allowedActionTypes.includes(type)) {
          throw new Error(`Agent does not have permission to perform ${type} actions`);
        }
        
        // Check if agent has reached its daily action limit
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const actionsToday = agent.actions.filter(a => {
          const actionDate = new Date(a.createdAt);
          return actionDate >= today;
        }).length;
        
        const maxActionsPerDay = agent.configuration?.maxActionsPerDay || 100;
        
        if (actionsToday >= maxActionsPerDay) {
          throw new Error(`Agent has reached its daily action limit of ${maxActionsPerDay}`);
        }
        
        const newAction = {
          type,
          description,
          data,
          reasoning,
          status: autoExecute ? ACTION_STATUS_ENUMS[0] : ACTION_STATUS_ENUMS[1], // Active or AwaitingApproval
          createdAt: new Date(),
          completedAt: null,
          result: null,
          error: null
        };
        
        if (conversationId) {
          newAction.conversationId = mongoose.Types.ObjectId(conversationId);
        }
        
        if (interactionId) {
          newAction.interactionId = mongoose.Types.ObjectId(interactionId);
        }
        
        if (entityType && entityId) {
          newAction.entityType = entityType;
          newAction.entityId = mongoose.Types.ObjectId(entityId);
        }
        
        agent.actions.push(newAction);
        agent.lastActive = new Date();
        await agent.save();
        
        const actionId = agent.actions[agent.actions.length - 1]._id;
        
        // Emit event for action creation
        if (emitEvent) {
          emitEvent('agent:action:created', {
            userId,
            agentId: agent._id,
            actionId,
            actionType: type,
            status: newAction.status,
            timestamp: new Date()
          });
        }
        
        logger.info(`[Agent Actions] Created action ${actionId} for agent ${agentId}`);
        
        return { agent, actionId };
      } catch (error) {
        logger.error('[Agent Actions] Error creating action:', error);
        throw error;
      }
    },
    
    /**
     * Update an action's status and result
     */
    async updateAction({ userId, agentId, actionId, updates }) {
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
        
        if (updates.status) {
          action.status = updates.status;
          
          if (updates.status === 'Completed' || updates.status === 'Failed') {
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
            
            // Calculate response time in seconds
            const responseTime = Math.floor(
              (action.completedAt.getTime() - action.createdAt.getTime()) / 1000
            );
            
            // Update success rate and action counts
            if (updates.status === 'Completed') {
              agent.performance.completedActionCount += 1;
            } else if (updates.status === 'Failed') {
              agent.performance.failedActionCount += 1;
            }
            
            const totalActions = 
              agent.performance.completedActionCount + 
              agent.performance.failedActionCount;
              
            agent.performance.successRate = totalActions > 0 
              ? (agent.performance.completedActionCount / totalActions) * 100
              : 0;
              
            // Update average response time
            const oldAvg = agent.performance.averageResponseTime || 0;
            const oldTotal = totalActions > 1 ? totalActions - 1 : 0;
            
            agent.performance.averageResponseTime = 
              (oldAvg * oldTotal + responseTime) / totalActions;
              
            agent.performance.lastEvaluatedAt = new Date();
          }
        }
        
        if (updates.result !== undefined) {
          action.result = updates.result;
        }
        
        if (updates.error) {
          action.error = updates.error;
        }
        
        agent.lastActive = new Date();
        await agent.save();
        
        // Emit event for action update
        if (emitEvent) {
          emitEvent('agent:action:updated', {
            userId,
            agentId: agent._id,
            actionId,
            newStatus: updates.status,
            timestamp: new Date()
          });
        }
        
        logger.info(`[Agent Actions] Updated action ${actionId} for agent ${agentId}`);
        
        return agent;
      } catch (error) {
        logger.error('[Agent Actions] Error updating action:', error);
        throw error;
      }
    },
    
    /**
     * Process a message with an agent
     */
    async processMessage({ userId, agentId, message, conversationId, messageType = 'text' }) {
      try {
        validateUser(userId);
        
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
        // using the systemMessage for initialization
        // For now, we'll return a placeholder response
        
        const response = {
          agentId: agent._id,
          agentName: agent.name,
          message: `This is a placeholder response from ${agent.name}. In a real implementation, this would process "${message}" using an AI model with the following system message: ${systemMessage?.substring(0, 50)}...`,
          timestamp: new Date(),
          conversationId: conversationId || null,
          messageType: 'text',
          systemMessageUsed: !!agent.configuration?.systemMessage
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
        
        logger.info(`[Agent Actions] Processed message for agent ${agentId}`);
        
        return response;
      } catch (error) {
        logger.error('[Agent Actions] Error processing message:', error);
        throw error;
      }
    },
    
    /**
     * Get agent statistics
     */
    async getAgentStats({ userId }) {
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
        
        // Get agents with highest success rate
        const highestSuccessRateAgents = await ConversationalAgent.aggregate([
          { $match: { 
            userId: mongoose.Types.ObjectId(userId),
            'performance.completedActionCount': { $gt: 0 }
          }},
          { $project: {
            name: 1,
            type: 1,
            successRate: '$performance.successRate'
          }},
          { $sort: { successRate: -1 } },
          { $limit: 3 }
        ]);
        
        const stats = {
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
          highestSuccessRateAgents,
          totalAgents: await ConversationalAgent.countDocuments({ 
            userId: mongoose.Types.ObjectId(userId) 
          })
        };
        
        logger.info(`[Agent Actions] Retrieved stats for user ${userId}`);
        
        return stats;
      } catch (error) {
        logger.error('[Agent Actions] Error getting agent stats:', error);
        throw error;
      }
    }
  };
  
  return actions;
};

export default {
  initActions
}; 