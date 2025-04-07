import mongoose from 'mongoose';
import { timestampsPlugin } from '../../config/shared-mongoose/plugins/timestamps.js';
import { timetrackablePlugin } from '../../config/shared-mongoose/plugins/timetrackable.js';
import { taggableFlexWeightedPlugin } from '../../config/shared-mongoose/plugins/taggableFlexWeighted.js';
import { manifestationStatePlugin } from './plugins/stateTrackableAdapter.js';
import { 
  TYPE_ENUMS, 
  TIMEFRAME_ENUMS, 
  MANIFESTATION_CATEGORIES
} from './constants.js';

const { Schema } = mongoose;

/**
 * Metadata Schema
 * Additional metadata for manifestations
 */
const metadataSchema = new Schema({
  color: {
    type: String,
    default: '#673ab7' // Default purple for manifestations
  },
  icon: {
    type: String,
    default: 'star'
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  },
  lifeAreas: [{
    type: String,
    enum: MANIFESTATION_CATEGORIES
  }],
  tags: [String],
  privacy: {
    type: String,
    enum: ['Private', 'Public', 'Shared'],
    default: 'Private'
  },
  isFeatured: {
    type: Boolean,
    default: false
  }
}, { _id: false });

/**
 * Affirmation Schema
 * Affirmations connected to this manifestation
 */
const affirmationSchema = new Schema({
  text: {
    type: String,
    required: true
  },
  isPrimary: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

/**
 * Evidence Schema
 * Evidence of manifestation progress
 */
const evidenceSchema = new Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  date: {
    type: Date,
    default: Date.now
  },
  mediaUrl: {
    type: String
  },
  mediaType: {
    type: String,
    enum: ['image', 'video', 'document', 'link', 'text'],
    default: 'text'
  }
}, { _id: true });

/**
 * Intention Schema
 * Core component of a manifestation - the actual intent
 */
const intentionSchema = new Schema({
  isPresentTense: {
    type: Boolean,
    default: true
  },
  isPhraseAsCompleted: {
    type: Boolean,
    default: true
  },
  statement: {
    type: String,
    required: true
  },
  whyItMatters: {
    type: String
  },
  howItFeels: {
    type: String
  }
}, { _id: false });

/**
 * Reminder Schema
 * Scheduled reminders for manifestation
 */
const reminderSchema = new Schema({
  frequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'custom'],
    default: 'daily'
  },
  time: {
    type: String
  },
  isEnabled: {
    type: Boolean,
    default: true
  },
  lastSent: {
    type: Date
  },
  customPattern: {
    type: String
  }
}, { _id: false });

/**
 * Manifestation Schema
 * Main schema for user manifestations
 */
const manifestationSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String,
    default: ''
  },
  manifestationType: {
    type: String,
    enum: TYPE_ENUMS,
    default: 'goal'
  },
  customTypeName: {
    type: String
  },
  timeframe: {
    type: String,
    enum: TIMEFRAME_ENUMS,
    default: 'medium_term'
  },
  targetDate: {
    type: Date
  },
  manifestedDate: {
    type: Date
  },
  progressPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  intention: {
    type: intentionSchema,
    default: () => ({})
  },
  vision: {
    type: String
  },
  visionBoardItems: [{
    type: Schema.Types.ObjectId,
    ref: 'Media'
  }],
  affirmations: [affirmationSchema],
  evidence: [evidenceSchema],
  relatedMilestones: [{
    type: Schema.Types.ObjectId,
    ref: 'Milestone'
  }],
  relatedHabits: [{
    type: Schema.Types.ObjectId,
    ref: 'Habit'
  }],
  reminder: {
    type: reminderSchema,
    default: () => ({})
  },
  metadata: {
    type: metadataSchema,
    default: () => ({})
  }
});

// Apply core plugins
manifestationSchema.plugin(timestampsPlugin);

// Apply state tracking (using our adapter plugin)
manifestationSchema.plugin(manifestationStatePlugin, {
  trackHistory: true,
  trackFields: ['title', 'description', 'progressPercentage']
});

// Apply timeline tracking
manifestationSchema.plugin(timetrackablePlugin, {
  allowedEvents: [
    'created',
    'updated',
    'state_changed',
    'evidence_added',
    'milestone_connected',
    'habit_connected',
    'affirmed',
    'journal_connected',
    'manifested',
    'visualization'
  ]
});

// Apply tagging with weights
manifestationSchema.plugin(taggableFlexWeightedPlugin, {
  field: 'weightedTags',
  allowedTypes: ['life_area', 'feeling', 'value', 'theme'],
  weightRange: { min: 0, max: 10 }
});

// Add pre-save middleware
manifestationSchema.pre('save', function(next) {
  // Auto-calculate progress percentage based on connected milestones if any
  if (this.isModified('relatedMilestones') && this.relatedMilestones.length > 0) {
    // Note: this will be a placeholder until we can populate the actual milestone data
    // In the real implementation, we'll need to account for milestone states
    this.progressPercentage = 0; // To be calculated when we have milestone data
  }
  
  // If manifested but manifestedDate not set, set it
  if (this.state === 'manifested' && !this.manifestedDate) {
    this.manifestedDate = new Date();
  }
  
  next();
});

// Method to add evidence
manifestationSchema.methods.addEvidence = function(evidenceData) {
  if (!this.evidence) {
    this.evidence = [];
  }
  this.evidence.push(evidenceData);
  
  // If evidence is added, should consider updating state to manifesting
  // if in in_progress state
  if (this.state === 'in_progress' && this.evidence.length >= 3) {
    // Only suggest state change, don't force it
    // The actual change should be done explicitly via setState
    return { 
      evidenceAdded: true, 
      suggestStateChange: 'manifesting',
      message: 'Consider updating state to "manifesting" based on evidence collected'
    };
  }
  
  return { evidenceAdded: true };
};

// Method to add affirmation
manifestationSchema.methods.addAffirmation = function(affirmationText, isPrimary = false) {
  if (!this.affirmations) {
    this.affirmations = [];
  }
  
  // If this is primary, remove primary flag from any others
  if (isPrimary) {
    this.affirmations.forEach(aff => {
      aff.isPrimary = false;
    });
  }
  
  this.affirmations.push({
    text: affirmationText,
    isPrimary,
    createdAt: new Date()
  });
  
  return { affirmationAdded: true };
};

// Method to calculate progress based on milestones
manifestationSchema.methods.calculateProgress = async function() {
  // This is a more complex method that would need to be implemented when
  // we have access to the Milestone model and can query for associated milestones
  // For now, just return the current progressPercentage
  return this.progressPercentage;
};

// Method to get primary affirmation
manifestationSchema.methods.getPrimaryAffirmation = function() {
  if (!this.affirmations || this.affirmations.length === 0) {
    return null;
  }
  
  const primary = this.affirmations.find(aff => aff.isPrimary);
  return primary || this.affirmations[0]; // Return first if no primary
};

// Method to format into present tense statement
manifestationSchema.methods.getPresentTenseStatement = function() {
  if (this.intention && this.intention.statement) {
    return this.intention.statement;
  }
  return `I am manifesting ${this.title}`;
};

// Create and export the Mongoose model
export const Manifestation = mongoose.model('Manifestation', manifestationSchema);

// Export a function that will apply plugins that require context
export const applyContextPlugins = (ctx) => {
  if (ctx && ctx.plugins) {
    // Add any context-dependent plugins here
    if (ctx.plugins.taggableSchema) {
      manifestationSchema.plugin(ctx.plugins.taggableSchema, { 
        path: 'metadata.tags'
      });
    }
  }
  return { Manifestation };
};

export default {
  Manifestation,
  applyContextPlugins
}; 