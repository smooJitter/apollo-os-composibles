import mongoose from 'mongoose';
import { timestampsPlugin } from '../../config/shared-mongoose/plugins/timestamps.js';
import { taggableFlexWeightedPlugin } from '../../config/shared-mongoose/plugins/taggableFlexWeighted.js';
import { 
  CONVERSATION_TYPE_ENUMS, 
  INTERACTION_CATEGORY_ENUMS, 
  AI_MODEL_ENUMS,
  SENTIMENT_TYPE_ENUMS,
  INTERACTION_STATUS_ENUMS
} from './constants.js';
import { v4 as uuidv4 } from 'uuid';

const { Schema } = mongoose;

/**
 * Metadata Schema
 * Additional metadata for AI conversations
 */
const metadataSchema = new Schema({
  purpose: {
    type: String
  },
  context: {
    type: String
  },
  modelSettings: {
    type: Schema.Types.Mixed,
    default: {}
  },
  theme: {
    type: String
  },
  sentiment: {
    type: String,
    enum: SENTIMENT_TYPE_ENUMS,
    default: 'Neutral'
  },
  relevantEntities: [{
    entityType: {
      type: String,
      enum: ['Manifestation', 'Habit', 'Milestone', 'Immersion', 'Affirmation', 'Other']
    },
    entityId: {
      type: Schema.Types.ObjectId
    },
    relevanceScore: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.5
    }
  }],
  tags: [{
    type: String
  }],
  userFeedback: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comments: {
      type: String
    },
    submittedAt: {
      type: Date
    }
  },
  intent: {
    type: String
  }
}, { _id: false });

/**
 * Interaction Schema
 * Individual interaction within a conversation
 */
const interactionSchema = new Schema({
  message: {
    type: String,
    required: true
  },
  messageType: {
    type: String,
    enum: INTERACTION_CATEGORY_ENUMS,
    default: 'Statement'
  },
  response: {
    type: String
  },
  responseMetadata: {
    model: {
      type: String,
      enum: AI_MODEL_ENUMS,
      default: 'Apollo Base'
    },
    tokens: {
      prompt: { type: Number, default: 0 },
      completion: { type: Number, default: 0 },
      total: { type: Number, default: 0 }
    },
    processingTime: { type: Number, default: 0 }, // in milliseconds
    aiSettings: { type: Schema.Types.Mixed, default: {} }
  },
  status: {
    type: String,
    enum: INTERACTION_STATUS_ENUMS,
    default: 'Completed'
  },
  sentiment: {
    type: String,
    enum: SENTIMENT_TYPE_ENUMS
  },
  entities: [{
    entity: { type: String },
    category: { type: String }
  }],
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

/**
 * AI Conversation Schema
 * Manages dialogues between users and AI
 */
const aiConversationSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  sessionId: {
    type: String,
    default: () => uuidv4(),
    index: true
  },
  title: {
    type: String,
    default: 'New Conversation'
  },
  type: {
    type: String,
    enum: CONVERSATION_TYPE_ENUMS,
    default: 'General',
    index: true
  },
  start: {
    type: Date,
    default: Date.now,
    index: true
  },
  lastInteraction: {
    type: Date,
    default: Date.now,
    index: true
  },
  interactions: [interactionSchema],
  summary: {
    type: String
  },
  keyPoints: [{
    type: String
  }],
  model: {
    type: String,
    enum: AI_MODEL_ENUMS,
    default: 'Apollo Base'
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isArchived: {
    type: Boolean,
    default: false,
    index: true
  },
  metadata: {
    type: metadataSchema,
    default: () => ({})
  }
});

// Apply core plugins
aiConversationSchema.plugin(timestampsPlugin);

// Apply tagging with weights
aiConversationSchema.plugin(taggableFlexWeightedPlugin, {
  field: 'weightedTags',
  allowedTypes: ['category', 'interest', 'topic', 'intent'],
  weightRange: { min: 0, max: 10 }
});

// Virtual for conversation length
aiConversationSchema.virtual('interactionCount').get(function() {
  return this.interactions ? this.interactions.length : 0;
});

// Virtual for conversation duration
aiConversationSchema.virtual('duration').get(function() {
  if (!this.start || !this.lastInteraction) return 0;
  return this.lastInteraction - this.start;
});

// Add custom instance methods
aiConversationSchema.methods.addInteraction = function(message, messageType = 'Statement') {
  const interaction = {
    message,
    messageType,
    timestamp: new Date(),
    status: 'Pending'
  };
  
  this.interactions.push(interaction);
  this.lastInteraction = interaction.timestamp;
  return interaction;
};

aiConversationSchema.methods.completeInteraction = function(interactionId, response, responseMetadata = {}) {
  const interaction = this.interactions.id(interactionId);
  if (!interaction) return null;
  
  interaction.response = response;
  interaction.responseMetadata = {
    ...interaction.responseMetadata,
    ...responseMetadata
  };
  interaction.status = 'Completed';
  this.lastInteraction = new Date();
  
  return interaction;
};

aiConversationSchema.methods.archive = function() {
  this.isArchived = true;
  return this.save();
};

aiConversationSchema.methods.unarchive = function() {
  this.isArchived = false;
  return this.save();
};

aiConversationSchema.methods.addFeedback = function(rating, comments) {
  if (!this.metadata) this.metadata = {};
  this.metadata.userFeedback = {
    rating,
    comments,
    submittedAt: new Date()
  };
  return this.save();
};

aiConversationSchema.methods.generateSummary = async function() {
  // This would typically call an AI service to summarize the conversation
  // For now, we'll just create a basic summary
  const messageCount = this.interactions.length;
  
  if (messageCount === 0) {
    this.summary = 'Empty conversation';
    return this.save();
  }
  
  const firstMessage = this.interactions[0].message;
  const lastMessage = this.interactions[messageCount - 1].message;
  
  this.summary = `Conversation with ${messageCount} interactions, starting with "${firstMessage.substring(0, 50)}${firstMessage.length > 50 ? '...' : ''}" and ending with "${lastMessage.substring(0, 50)}${lastMessage.length > 50 ? '...' : ''}"`;
  
  return this.save();
};

// Add static methods for finding and filtering
aiConversationSchema.statics.findActiveForUser = function(userId, options = {}) {
  const { type, limit = 20, skip = 0, sort = '-lastInteraction' } = options;
  
  const query = {
    userId,
    isActive: true,
    isArchived: { $ne: true }
  };
  
  // Filter by type if specified
  if (type) {
    query.type = type;
  }
  
  return this.find(query)
    .sort(sort)
    .skip(skip)
    .limit(limit);
};

aiConversationSchema.statics.findBySessionId = function(sessionId) {
  return this.findOne({ sessionId, isActive: true });
};

aiConversationSchema.statics.findRecentConversations = function(userId, limit = 10) {
  return this.find({
    userId,
    isActive: true,
    isArchived: { $ne: true }
  })
  .sort('-lastInteraction')
  .limit(limit);
};

aiConversationSchema.statics.findConversationsByType = function(userId, type, limit = 10) {
  return this.find({
    userId,
    type,
    isActive: true
  })
  .sort('-lastInteraction')
  .limit(limit);
};

aiConversationSchema.statics.searchConversations = function(userId, searchQuery, options = {}) {
  const { limit = 20, skip = 0 } = options;
  
  return this.find({
    userId,
    isActive: true,
    $or: [
      { title: { $regex: searchQuery, $options: 'i' } },
      { 'interactions.message': { $regex: searchQuery, $options: 'i' } },
      { 'interactions.response': { $regex: searchQuery, $options: 'i' } },
      { summary: { $regex: searchQuery, $options: 'i' } }
    ]
  })
  .sort('-lastInteraction')
  .skip(skip)
  .limit(limit);
};

// Create and export the model
export const AIConversation = mongoose.model('AIConversation', aiConversationSchema);

// Export schemas for use in other modules
export const schemas = {
  metadataSchema,
  interactionSchema,
  aiConversationSchema
};

export default { AIConversation, schemas }; 