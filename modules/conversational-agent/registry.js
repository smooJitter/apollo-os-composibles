import { schemaComposer } from 'graphql-compose';
import { composeMongoose } from 'graphql-compose-mongoose';
import { ConversationalAgent } from './schemas.js';
import {
  AGENT_TYPE_ENUMS,
  AGENT_STATUS_ENUMS,
  ACTION_STATUS_ENUMS,
  AGENT_ACTION_TYPE_ENUMS,
  AGENT_PERMISSION_ENUMS,
  AGENT_CAPABILITY_ENUMS,
  PERSONALITY_TRAIT_ENUMS
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
    // Create the main type composer for Conversational Agents
    const ConversationalAgentTC = composeMongoose(ConversationalAgent, {
      removeFields: ['__v'],
      name: 'ConversationalAgent'
    });
    
    // Add computed fields
    ConversationalAgentTC.addFields({
      actionCount: {
        type: 'Int',
        description: 'Total number of actions performed by the agent',
        resolve: (agent) => agent.actions?.length || 0
      },
      goalCount: {
        type: 'Int',
        description: 'Total number of goals for the agent',
        resolve: (agent) => agent.goals?.length || 0
      },
      activeGoalCount: {
        type: 'Int',
        description: 'Number of incomplete goals for the agent',
        resolve: (agent) => agent.goals?.filter(g => !g.isCompleted)?.length || 0
      },
      memoryCount: {
        type: 'Int',
        description: 'Total number of memory entries for the agent',
        resolve: (agent) => agent.memories?.length || 0
      },
      isActive: {
        type: 'Boolean',
        description: 'Whether the agent is currently active',
        resolve: (agent) => agent.status === 'Active'
      },
      lastActiveRelative: {
        type: 'String',
        description: 'Relative time since agent was last active',
        resolve: (agent) => {
          const date = agent.lastActive || new Date();
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
      pendingActionCount: {
        type: 'Int',
        description: 'Number of pending actions for the agent',
        resolve: (agent) => agent.actions?.filter(a => a.status === 'Pending' || a.status === 'AwaitingApproval')?.length || 0
      }
    });
    
    // Create enum TCs
    const AgentTypeEnumTC = schemaComposer.createEnumTC({
      name: 'AgentTypeEnum',
      values: AGENT_TYPE_ENUMS.reduce((acc, type) => {
        acc[type.toUpperCase().replace(/\s+/g, '_')] = { value: type };
        return acc;
      }, {})
    });
    
    const AgentStatusEnumTC = schemaComposer.createEnumTC({
      name: 'AgentStatusEnum',
      values: AGENT_STATUS_ENUMS.reduce((acc, status) => {
        acc[status.toUpperCase()] = { value: status };
        return acc;
      }, {})
    });
    
    const ActionStatusEnumTC = schemaComposer.createEnumTC({
      name: 'ActionStatusEnum',
      values: ACTION_STATUS_ENUMS.reduce((acc, status) => {
        acc[status.toUpperCase()] = { value: status };
        return acc;
      }, {})
    });
    
    const AgentActionTypeEnumTC = schemaComposer.createEnumTC({
      name: 'AgentActionTypeEnum',
      values: AGENT_ACTION_TYPE_ENUMS.reduce((acc, type) => {
        acc[type.toUpperCase()] = { value: type };
        return acc;
      }, {})
    });
    
    const AgentPermissionEnumTC = schemaComposer.createEnumTC({
      name: 'AgentPermissionEnum',
      values: AGENT_PERMISSION_ENUMS.reduce((acc, permission) => {
        acc[permission.toUpperCase()] = { value: permission };
        return acc;
      }, {})
    });
    
    const AgentCapabilityEnumTC = schemaComposer.createEnumTC({
      name: 'AgentCapabilityEnum',
      values: AGENT_CAPABILITY_ENUMS.reduce((acc, capability) => {
        acc[capability.toUpperCase().replace(/\s+/g, '_')] = { value: capability };
        return acc;
      }, {})
    });
    
    const PersonalityTraitEnumTC = schemaComposer.createEnumTC({
      name: 'PersonalityTraitEnum',
      values: PERSONALITY_TRAIT_ENUMS.reduce((acc, trait) => {
        acc[trait.toUpperCase()] = { value: trait };
        return acc;
      }, {})
    });
    
    // Create input types for creating and updating agents
    const AgentConfigInputTC = schemaComposer.createInputTC({
      name: 'AgentConfigInput',
      fields: {
        prompt: 'String!',
        systemInstructions: 'String!',
        systemMessage: {
          type: 'String',
          description: 'System message for AI model initialization'
        },
        capabilities: [AgentCapabilityEnumTC],
        permissions: [AgentPermissionEnumTC],
        personalityTraits: [PersonalityTraitEnumTC],
        autonomyLevel: 'Int',
        model: {
          type: 'String',
          description: 'AI model to use for this agent'
        },
        modelParameters: 'JSON',
        contextWindow: 'Int',
        maxActionsPerDay: 'Int',
        allowedActionTypes: [AgentActionTypeEnumTC]
      }
    });
    
    const CreateAgentInputTC = schemaComposer.createInputTC({
      name: 'CreateAgentInput',
      fields: {
        name: 'String!',
        description: 'String',
        type: AgentTypeEnumTC,
        avatar: 'String',
        isDefault: 'Boolean',
        configuration: AgentConfigInputTC
      }
    });
    
    const UpdateAgentInputTC = schemaComposer.createInputTC({
      name: 'UpdateAgentInput',
      fields: {
        name: 'String',
        description: 'String',
        type: AgentTypeEnumTC,
        avatar: 'String',
        status: AgentStatusEnumTC,
        isDefault: 'Boolean',
        configuration: AgentConfigInputTC
      }
    });
    
    const CreateGoalInputTC = schemaComposer.createInputTC({
      name: 'CreateAgentGoalInput',
      fields: {
        description: 'String!',
        metrics: 'JSON',
        targetDate: 'Date',
        relatedEntityType: 'String',
        relatedEntityId: 'MongoID'
      }
    });
    
    const MemoryInputTC = schemaComposer.createInputTC({
      name: 'AgentMemoryInput',
      fields: {
        key: 'String!',
        value: 'JSON!',
        context: 'String',
        importance: 'Int',
        expiresAt: 'Date'
      }
    });
    
    const ActionInputTC = schemaComposer.createInputTC({
      name: 'AgentActionInput',
      fields: {
        type: AgentActionTypeEnumTC,
        description: 'String!',
        data: 'JSON!',
        reasoning: 'String',
        conversationId: 'MongoID',
        interactionId: 'MongoID',
        autoExecute: 'Boolean',
        entityType: 'String',
        entityId: 'MongoID'
      }
    });
    
    const UpdateActionInputTC = schemaComposer.createInputTC({
      name: 'UpdateAgentActionInput',
      fields: {
        status: ActionStatusEnumTC,
        result: 'JSON',
        error: 'String'
      }
    });
    
    const FilterAgentInputTC = schemaComposer.createInputTC({
      name: 'FilterAgentInput',
      fields: {
        type: AgentTypeEnumTC,
        status: AgentStatusEnumTC,
        isDefault: 'Boolean',
        searchQuery: 'String'
      }
    });
    
    // Create the input type for the message processor
    const ProcessMessageInputTC = schemaComposer.createInputTC({
      name: 'ProcessMessageInput',
      fields: {
        agentId: 'MongoID!',
        message: 'String!',
        conversationId: 'MongoID',
        messageType: 'String'
      }
    });
    
    // Save all composers to the typeComposers object
    typeComposers.ConversationalAgentTC = ConversationalAgentTC;
    typeComposers.AgentTypeEnumTC = AgentTypeEnumTC;
    typeComposers.AgentStatusEnumTC = AgentStatusEnumTC;
    typeComposers.ActionStatusEnumTC = ActionStatusEnumTC;
    typeComposers.AgentActionTypeEnumTC = AgentActionTypeEnumTC;
    typeComposers.AgentPermissionEnumTC = AgentPermissionEnumTC;
    typeComposers.AgentCapabilityEnumTC = AgentCapabilityEnumTC;
    typeComposers.PersonalityTraitEnumTC = PersonalityTraitEnumTC;
    typeComposers.AgentConfigInputTC = AgentConfigInputTC;
    typeComposers.CreateAgentInputTC = CreateAgentInputTC;
    typeComposers.UpdateAgentInputTC = UpdateAgentInputTC;
    typeComposers.CreateGoalInputTC = CreateGoalInputTC;
    typeComposers.MemoryInputTC = MemoryInputTC;
    typeComposers.ActionInputTC = ActionInputTC;
    typeComposers.UpdateActionInputTC = UpdateActionInputTC;
    typeComposers.FilterAgentInputTC = FilterAgentInputTC;
    typeComposers.ProcessMessageInputTC = ProcessMessageInputTC;
    
    return typeComposers;
  } catch (error) {
    console.error('[Conversational Agent Registry] Error initializing type composers:', error);
    throw error;
  }
};

// Getter functions for type composers
export const getConversationalAgentTC = () => {
  if (!typeComposers.ConversationalAgentTC) {
    initTypeComposers();
  }
  return typeComposers.ConversationalAgentTC;
};

export const getCreateAgentInputTC = () => {
  if (!typeComposers.CreateAgentInputTC) {
    initTypeComposers();
  }
  return typeComposers.CreateAgentInputTC;
};

export const getUpdateAgentInputTC = () => {
  if (!typeComposers.UpdateAgentInputTC) {
    initTypeComposers();
  }
  return typeComposers.UpdateAgentInputTC;
};

export const getCreateGoalInputTC = () => {
  if (!typeComposers.CreateGoalInputTC) {
    initTypeComposers();
  }
  return typeComposers.CreateGoalInputTC;
};

export const getMemoryInputTC = () => {
  if (!typeComposers.MemoryInputTC) {
    initTypeComposers();
  }
  return typeComposers.MemoryInputTC;
};

export const getActionInputTC = () => {
  if (!typeComposers.ActionInputTC) {
    initTypeComposers();
  }
  return typeComposers.ActionInputTC;
};

export const getUpdateActionInputTC = () => {
  if (!typeComposers.UpdateActionInputTC) {
    initTypeComposers();
  }
  return typeComposers.UpdateActionInputTC;
};

export const getFilterAgentInputTC = () => {
  if (!typeComposers.FilterAgentInputTC) {
    initTypeComposers();
  }
  return typeComposers.FilterAgentInputTC;
};

export const getProcessMessageInputTC = () => {
  if (!typeComposers.ProcessMessageInputTC) {
    initTypeComposers();
  }
  return typeComposers.ProcessMessageInputTC;
};

export default {
  initTypeComposers,
  getConversationalAgentTC,
  getCreateAgentInputTC,
  getUpdateAgentInputTC,
  getCreateGoalInputTC,
  getMemoryInputTC,
  getActionInputTC,
  getUpdateActionInputTC,
  getFilterAgentInputTC,
  getProcessMessageInputTC
}; 