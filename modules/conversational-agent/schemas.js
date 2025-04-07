import mongoose from 'mongoose';
import { timestampsPlugin } from '../../config/shared-mongoose/plugins/timestamps.js';
import { taggableFlexWeightedPlugin } from '../../config/shared-mongoose/plugins/taggableFlexWeighted.js';
import {
  AGENT_TYPE_ENUMS,
  AGENT_STATUS_ENUMS,
  ACTION_STATUS_ENUMS,
  AGENT_ACTION_TYPE_ENUMS,
  AGENT_PERMISSION_ENUMS,
  AGENT_CAPABILITY_ENUMS,
  PERSONALITY_TRAIT_ENUMS
} from './constants.js';

const { Schema } = mongoose;

/**
 * Agent Configuration Schema
 * Stores the agent's configuration settings
 */
const agentConfigSchema = new Schema({
  prompt: {
    type: String,
    required: true
  },
  systemInstructions: {
    type: String,
    required: true
  },
  systemMessage: {
    type: String,
    description: "System message for AI model initialization"
  },
  capabilities: [{
    type: String,
    enum: AGENT_CAPABILITY_ENUMS
  }],
  permissions: [{
    type: String,
    enum: AGENT_PERMISSION_ENUMS
  }],
  personalityTraits: [{
    type: String,
    enum: PERSONALITY_TRAIT_ENUMS
  }],
  autonomyLevel: {
    type: Number,
    min: 0,
    max: 10,
    default: 5
  },
  model: {
    type: String,
    enum: ['GPT-3', 'GPT-4', 'Claude', 'Apollo Base', 'Apollo Advanced', 'Custom'],
    default: 'Apollo Advanced'
  },
  modelParameters: {
    type: Schema.Types.Mixed,
    default: {}
  },
  contextWindow: {
    type: Number,
    default: 10
  },
  maxActionsPerDay: {
    type: Number,
    default: 10
  },
  allowedActionTypes: [{
    type: String,
    enum: AGENT_ACTION_TYPE_ENUMS
  }]
}, { _id: false });

/**
 * Agent Goal Schema
 * Tracks goals set for or by the agent
 */
const agentGoalSchema = new Schema({
  description: {
    type: String,
    required: true
  },
  metrics: {
    type: Schema.Types.Mixed,
    default: {}
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  targetDate: {
    type: Date
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  relatedEntityType: {
    type: String,
    enum: ['Manifestation', 'Habit', 'Milestone', 'Immersion', 'None']
  },
  relatedEntityId: {
    type: Schema.Types.ObjectId
  }
});

/**
 * Agent Action Schema
 * Records actions suggested or performed by the agent
 */
const agentActionSchema = new Schema({
  type: {
    type: String,
    enum: AGENT_ACTION_TYPE_ENUMS,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ACTION_STATUS_ENUMS,
    default: 'Pending'
  },
  data: {
    type: Schema.Types.Mixed,
    required: true
  },
  reasoning: {
    type: String
  },
  conversationId: {
    type: Schema.Types.ObjectId,
    ref: 'AIConversation'
  },
  interactionId: {
    type: Schema.Types.ObjectId
  },
  result: {
    type: Schema.Types.Mixed
  },
  error: {
    type: String
  },
  autoExecute: {
    type: Boolean,
    default: false
  },
  executedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  entityType: {
    type: String,
    enum: ['Manifestation', 'Habit', 'Milestone', 'Immersion', 'Affirmation', 'None']
  },
  entityId: {
    type: Schema.Types.ObjectId
  }
});

/**
 * Agent Memory Schema
 * Stores long-term memory for the agent beyond conversation history
 */
const agentMemorySchema = new Schema({
  key: {
    type: String,
    required: true
  },
  value: {
    type: Schema.Types.Mixed,
    required: true
  },
  context: {
    type: String
  },
  importance: {
    type: Number,
    min: 1,
    max: 10,
    default: 5
  },
  lastAccessed: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date
  }
});

/**
 * Agent Performance Schema
 * Tracks agent effectiveness metrics
 */
const agentPerformanceSchema = new Schema({
  actionSuccessRate: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  userSatisfactionScore: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  totalActions: {
    type: Number,
    default: 0
  },
  successfulActions: {
    type: Number,
    default: 0
  },
  failedActions: {
    type: Number,
    default: 0
  },
  totalConversations: {
    type: Number,
    default: 0
  },
  totalGoals: {
    type: Number,
    default: 0
  },
  completedGoals: {
    type: Number,
    default: 0
  },
  averageResponseTime: {
    type: Number,
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

/**
 * Conversational Agent Schema
 * Main schema for agent entities
 */
const conversationalAgentSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  type: {
    type: String,
    enum: AGENT_TYPE_ENUMS,
    default: 'Assistant',
    index: true
  },
  avatar: {
    type: String
  },
  status: {
    type: String,
    enum: AGENT_STATUS_ENUMS,
    default: 'Active',
    index: true
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  configuration: {
    type: agentConfigSchema,
    default: () => ({})
  },
  currentConversationId: {
    type: Schema.Types.ObjectId,
    ref: 'AIConversation'
  },
  conversations: [{
    type: Schema.Types.ObjectId,
    ref: 'AIConversation'
  }],
  actions: [agentActionSchema],
  goals: [agentGoalSchema],
  memories: [agentMemorySchema],
  performance: {
    type: agentPerformanceSchema,
    default: () => ({})
  },
  lastActive: {
    type: Date,
    default: Date.now
  }
});

// Apply core plugins
conversationalAgentSchema.plugin(timestampsPlugin);

// Apply tagging with weights
conversationalAgentSchema.plugin(taggableFlexWeightedPlugin, {
  field: 'weightedTags',
  allowedTypes: ['category', 'interest', 'specialty', 'skill'],
  weightRange: { min: 0, max: 10 }
});

// Add instance methods
conversationalAgentSchema.methods.addAction = function(actionData) {
  const action = {
    ...actionData,
    createdAt: new Date()
  };
  
  this.actions.push(action);
  return this.actions[this.actions.length - 1];
};

conversationalAgentSchema.methods.updateActionStatus = async function(actionId, status, result = null, error = null) {
  const action = this.actions.id(actionId);
  if (!action) return null;
  
  action.status = status;
  
  if (status === 'Completed') {
    action.result = result;
    action.executedAt = new Date();
    
    // Update performance metrics
    this.performance.totalActions += 1;
    this.performance.successfulActions += 1;
    this.performance.actionSuccessRate = (this.performance.successfulActions / this.performance.totalActions) * 100;
    this.performance.lastUpdated = new Date();
  } else if (status === 'Failed') {
    action.error = error;
    
    // Update performance metrics
    this.performance.totalActions += 1;
    this.performance.failedActions += 1;
    this.performance.actionSuccessRate = (this.performance.successfulActions / this.performance.totalActions) * 100;
    this.performance.lastUpdated = new Date();
  }
  
  await this.save();
  return action;
};

conversationalAgentSchema.methods.addGoal = function(goalData) {
  const goal = {
    ...goalData,
    isCompleted: false
  };
  
  this.goals.push(goal);
  
  // Update performance metrics
  this.performance.totalGoals += 1;
  this.performance.lastUpdated = new Date();
  
  return this.goals[this.goals.length - 1];
};

conversationalAgentSchema.methods.completeGoal = async function(goalId) {
  const goal = this.goals.id(goalId);
  if (!goal) return null;
  
  goal.isCompleted = true;
  goal.progress = 100;
  
  // Update performance metrics
  this.performance.completedGoals += 1;
  this.performance.lastUpdated = new Date();
  
  await this.save();
  return goal;
};

conversationalAgentSchema.methods.addMemory = function(memoryData) {
  const memory = {
    ...memoryData,
    createdAt: new Date(),
    lastAccessed: new Date()
  };
  
  this.memories.push(memory);
  return this.memories[this.memories.length - 1];
};

conversationalAgentSchema.methods.getMemory = function(key) {
  const memory = this.memories.find(m => m.key === key);
  if (memory) {
    memory.lastAccessed = new Date();
    return memory.value;
  }
  return null;
};

conversationalAgentSchema.methods.updateActivity = async function() {
  this.lastActive = new Date();
  await this.save();
};

// Add static methods
conversationalAgentSchema.statics.findByUserId = function(userId) {
  return this.find({ userId, status: { $ne: 'Inactive' } });
};

conversationalAgentSchema.statics.findDefaultAgent = function(userId) {
  return this.findOne({ userId, isDefault: true });
};

conversationalAgentSchema.statics.findByType = function(userId, type) {
  return this.find({ userId, type, status: { $ne: 'Inactive' } });
};

conversationalAgentSchema.statics.findByConversation = function(conversationId) {
  return this.findOne({ 
    $or: [
      { currentConversationId: conversationId },
      { conversations: conversationId }
    ]
  });
};

// Create and export the model
export const ConversationalAgent = mongoose.model('ConversationalAgent', conversationalAgentSchema);

// Export schemas for use in other modules
export const schemas = {
  agentConfigSchema,
  agentGoalSchema,
  agentActionSchema,
  agentMemorySchema,
  agentPerformanceSchema,
  conversationalAgentSchema
};

export default { ConversationalAgent, schemas }; 