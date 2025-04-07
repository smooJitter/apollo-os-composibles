import mongoose from 'mongoose';
import { ConversationalAgent } from '../schemas.js';

export const initRelations = (context = {}) => {
  const { logger = console, validateUser, verifyOwnership, getModuleActions } = context;
  
  // Get actions from other modules if needed
  const manifestationActions = getModuleActions ? getModuleActions('manifestation') : null;
  const immersionActions = getModuleActions ? getModuleActions('immersion') : null;
  const habitActions = getModuleActions ? getModuleActions('habit') : null;
  const milestoneActions = getModuleActions ? getModuleActions('milestone') : null;
  
  const relations = {
    /**
     * Link an agent to a manifestation
     */
    async linkAgentToManifestation({ userId, agentId, manifestationId, relationship = 'assist' }) {
      try {
        validateUser(userId);
        
        const agent = await ConversationalAgent.findById(agentId);
        
        if (!agent) {
          throw new Error(`Agent with ID ${agentId} not found`);
        }
        
        verifyOwnership(agent, userId);
        
        // Verify the manifestation exists and is accessible to the user
        if (manifestationActions) {
          const manifestation = await manifestationActions.getManifestationById({
            userId,
            manifestationId
          });
          
          if (!manifestation) {
            throw new Error(`Manifestation with ID ${manifestationId} not found or not accessible`);
          }
        }
        
        // Check if the relationship already exists
        const existingLinkIndex = agent.relatedEntities 
          ? agent.relatedEntities.findIndex(
              rel => rel.entityType === 'manifestation' && 
              rel.entityId.toString() === manifestationId
            )
          : -1;
        
        if (existingLinkIndex === -1) {
          // If the agent doesn't have relatedEntities array, create it
          if (!agent.relatedEntities) {
            agent.relatedEntities = [];
          }
          
          // Add the new relationship
          agent.relatedEntities.push({
            entityType: 'manifestation',
            entityId: mongoose.Types.ObjectId(manifestationId),
            relationship,
            linkedAt: new Date()
          });
        } else {
          // Update the existing relationship
          agent.relatedEntities[existingLinkIndex].relationship = relationship;
          agent.relatedEntities[existingLinkIndex].updatedAt = new Date();
        }
        
        // Add a goal for the agent related to this manifestation
        if (relationship === 'assist') {
          const goal = {
            description: 'Assist user with manifestation progress',
            metrics: { priority: 'high' },
            targetDate: null, // Ongoing goal
            createdAt: new Date(),
            isCompleted: false,
            relatedEntityType: 'manifestation',
            relatedEntityId: mongoose.Types.ObjectId(manifestationId)
          };
          
          agent.goals.push(goal);
        }
        
        await agent.save();
        
        logger.info(`[Agent Relations] Linked agent ${agentId} to manifestation ${manifestationId}`);
        
        return agent;
      } catch (error) {
        logger.error('[Agent Relations] Error linking agent to manifestation:', error);
        throw error;
      }
    },
    
    /**
     * Unlink an agent from a manifestation
     */
    async unlinkAgentFromManifestation({ userId, agentId, manifestationId }) {
      try {
        validateUser(userId);
        
        const agent = await ConversationalAgent.findById(agentId);
        
        if (!agent) {
          throw new Error(`Agent with ID ${agentId} not found`);
        }
        
        verifyOwnership(agent, userId);
        
        // Remove the relationship
        if (agent.relatedEntities && agent.relatedEntities.length > 0) {
          agent.relatedEntities = agent.relatedEntities.filter(
            rel => !(rel.entityType === 'manifestation' && rel.entityId.toString() === manifestationId)
          );
        }
        
        // Remove any goals related to this manifestation
        if (agent.goals && agent.goals.length > 0) {
          agent.goals = agent.goals.filter(
            goal => !(goal.relatedEntityType === 'manifestation' && goal.relatedEntityId.toString() === manifestationId)
          );
        }
        
        await agent.save();
        
        logger.info(`[Agent Relations] Unlinked agent ${agentId} from manifestation ${manifestationId}`);
        
        return agent;
      } catch (error) {
        logger.error('[Agent Relations] Error unlinking agent from manifestation:', error);
        throw error;
      }
    },
    
    /**
     * Link an agent to a habit
     */
    async linkAgentToHabit({ userId, agentId, habitId, relationship = 'monitor' }) {
      try {
        validateUser(userId);
        
        const agent = await ConversationalAgent.findById(agentId);
        
        if (!agent) {
          throw new Error(`Agent with ID ${agentId} not found`);
        }
        
        verifyOwnership(agent, userId);
        
        // Verify the habit exists and is accessible to the user
        if (habitActions) {
          const habit = await habitActions.getHabitById({
            userId,
            habitId
          });
          
          if (!habit) {
            throw new Error(`Habit with ID ${habitId} not found or not accessible`);
          }
        }
        
        // Check if the relationship already exists
        const existingLinkIndex = agent.relatedEntities 
          ? agent.relatedEntities.findIndex(
              rel => rel.entityType === 'habit' && 
              rel.entityId.toString() === habitId
            )
          : -1;
        
        if (existingLinkIndex === -1) {
          // If the agent doesn't have relatedEntities array, create it
          if (!agent.relatedEntities) {
            agent.relatedEntities = [];
          }
          
          // Add the new relationship
          agent.relatedEntities.push({
            entityType: 'habit',
            entityId: mongoose.Types.ObjectId(habitId),
            relationship,
            linkedAt: new Date()
          });
        } else {
          // Update the existing relationship
          agent.relatedEntities[existingLinkIndex].relationship = relationship;
          agent.relatedEntities[existingLinkIndex].updatedAt = new Date();
        }
        
        // Add a goal for the agent related to this habit
        if (relationship === 'monitor') {
          const goal = {
            description: 'Monitor and encourage habit consistency',
            metrics: { priority: 'medium' },
            targetDate: null, // Ongoing goal
            createdAt: new Date(),
            isCompleted: false,
            relatedEntityType: 'habit',
            relatedEntityId: mongoose.Types.ObjectId(habitId)
          };
          
          agent.goals.push(goal);
        }
        
        await agent.save();
        
        logger.info(`[Agent Relations] Linked agent ${agentId} to habit ${habitId}`);
        
        return agent;
      } catch (error) {
        logger.error('[Agent Relations] Error linking agent to habit:', error);
        throw error;
      }
    },
    
    /**
     * Unlink an agent from a habit
     */
    async unlinkAgentFromHabit({ userId, agentId, habitId }) {
      try {
        validateUser(userId);
        
        const agent = await ConversationalAgent.findById(agentId);
        
        if (!agent) {
          throw new Error(`Agent with ID ${agentId} not found`);
        }
        
        verifyOwnership(agent, userId);
        
        // Remove the relationship
        if (agent.relatedEntities && agent.relatedEntities.length > 0) {
          agent.relatedEntities = agent.relatedEntities.filter(
            rel => !(rel.entityType === 'habit' && rel.entityId.toString() === habitId)
          );
        }
        
        // Remove any goals related to this habit
        if (agent.goals && agent.goals.length > 0) {
          agent.goals = agent.goals.filter(
            goal => !(goal.relatedEntityType === 'habit' && goal.relatedEntityId.toString() === habitId)
          );
        }
        
        await agent.save();
        
        logger.info(`[Agent Relations] Unlinked agent ${agentId} from habit ${habitId}`);
        
        return agent;
      } catch (error) {
        logger.error('[Agent Relations] Error unlinking agent from habit:', error);
        throw error;
      }
    },
    
    /**
     * Link an agent to an immersion
     */
    async linkAgentToImmersion({ userId, agentId, immersionId, relationship = 'guide' }) {
      try {
        validateUser(userId);
        
        const agent = await ConversationalAgent.findById(agentId);
        
        if (!agent) {
          throw new Error(`Agent with ID ${agentId} not found`);
        }
        
        verifyOwnership(agent, userId);
        
        // Verify the immersion exists and is accessible to the user
        if (immersionActions) {
          const immersion = await immersionActions.getImmersionById({
            userId,
            immersionId
          });
          
          if (!immersion) {
            throw new Error(`Immersion with ID ${immersionId} not found or not accessible`);
          }
        }
        
        // Check if the relationship already exists
        const existingLinkIndex = agent.relatedEntities 
          ? agent.relatedEntities.findIndex(
              rel => rel.entityType === 'immersion' && 
              rel.entityId.toString() === immersionId
            )
          : -1;
        
        if (existingLinkIndex === -1) {
          // If the agent doesn't have relatedEntities array, create it
          if (!agent.relatedEntities) {
            agent.relatedEntities = [];
          }
          
          // Add the new relationship
          agent.relatedEntities.push({
            entityType: 'immersion',
            entityId: mongoose.Types.ObjectId(immersionId),
            relationship,
            linkedAt: new Date()
          });
        } else {
          // Update the existing relationship
          agent.relatedEntities[existingLinkIndex].relationship = relationship;
          agent.relatedEntities[existingLinkIndex].updatedAt = new Date();
        }
        
        // Add a goal for the agent related to this immersion
        if (relationship === 'guide') {
          const goal = {
            description: 'Guide user through immersive experience',
            metrics: { priority: 'high' },
            targetDate: null, // Ongoing goal
            createdAt: new Date(),
            isCompleted: false,
            relatedEntityType: 'immersion',
            relatedEntityId: mongoose.Types.ObjectId(immersionId)
          };
          
          agent.goals.push(goal);
        }
        
        await agent.save();
        
        logger.info(`[Agent Relations] Linked agent ${agentId} to immersion ${immersionId}`);
        
        return agent;
      } catch (error) {
        logger.error('[Agent Relations] Error linking agent to immersion:', error);
        throw error;
      }
    },
    
    /**
     * Unlink an agent from an immersion
     */
    async unlinkAgentFromImmersion({ userId, agentId, immersionId }) {
      try {
        validateUser(userId);
        
        const agent = await ConversationalAgent.findById(agentId);
        
        if (!agent) {
          throw new Error(`Agent with ID ${agentId} not found`);
        }
        
        verifyOwnership(agent, userId);
        
        // Remove the relationship
        if (agent.relatedEntities && agent.relatedEntities.length > 0) {
          agent.relatedEntities = agent.relatedEntities.filter(
            rel => !(rel.entityType === 'immersion' && rel.entityId.toString() === immersionId)
          );
        }
        
        // Remove any goals related to this immersion
        if (agent.goals && agent.goals.length > 0) {
          agent.goals = agent.goals.filter(
            goal => !(goal.relatedEntityType === 'immersion' && goal.relatedEntityId.toString() === immersionId)
          );
        }
        
        await agent.save();
        
        logger.info(`[Agent Relations] Unlinked agent ${agentId} from immersion ${immersionId}`);
        
        return agent;
      } catch (error) {
        logger.error('[Agent Relations] Error unlinking agent from immersion:', error);
        throw error;
      }
    },
    
    /**
     * Get all agents linked to a specific entity
     */
    async getAgentsLinkedToEntity({ userId, entityType, entityId }) {
      try {
        validateUser(userId);
        
        // Verify entity type is valid
        const validEntityTypes = ['manifestation', 'habit', 'immersion', 'milestone'];
        
        if (!validEntityTypes.includes(entityType)) {
          throw new Error(`Invalid entity type: ${entityType}`);
        }
        
        // Find all agents linked to this entity
        const agents = await ConversationalAgent.find({
          userId: mongoose.Types.ObjectId(userId),
          'relatedEntities.entityType': entityType,
          'relatedEntities.entityId': mongoose.Types.ObjectId(entityId)
        });
        
        logger.info(`[Agent Relations] Found ${agents.length} agents linked to ${entityType} ${entityId}`);
        
        return agents;
      } catch (error) {
        logger.error('[Agent Relations] Error getting agents linked to entity:', error);
        throw error;
      }
    },
    
    /**
     * Get all entities linked to a specific agent
     */
    async getEntitiesLinkedToAgent({ userId, agentId, entityType = null }) {
      try {
        validateUser(userId);
        
        const agent = await ConversationalAgent.findById(agentId);
        
        if (!agent) {
          throw new Error(`Agent with ID ${agentId} not found`);
        }
        
        verifyOwnership(agent, userId);
        
        if (!agent.relatedEntities || agent.relatedEntities.length === 0) {
          return [];
        }
        
        // Filter by entity type if provided
        let relatedEntities = agent.relatedEntities;
        
        if (entityType) {
          relatedEntities = relatedEntities.filter(rel => rel.entityType === entityType);
        }
        
        logger.info(`[Agent Relations] Found ${relatedEntities.length} entities linked to agent ${agentId}`);
        
        return relatedEntities;
      } catch (error) {
        logger.error('[Agent Relations] Error getting entities linked to agent:', error);
        throw error;
      }
    }
  };
  
  return relations;
};

export default {
  initRelations
}; 