import mongoose from 'mongoose';
import { timestampsPlugin } from '../../config/shared-mongoose/plugins/timestamps.js';
import { timetrackablePlugin } from '../../config/shared-mongoose/plugins/timetrackable.js';
import { taggableFlexWeightedPlugin } from '../../config/shared-mongoose/plugins/taggableFlexWeighted.js';
import { milestoneStatusPlugin } from './plugins/statusTrackableAdapter.js';
import { TYPE_ENUMS } from './constants.js';

const { Schema } = mongoose;

/**
 * Metadata Schema
 * Additional metadata for milestones
 */
const metadataSchema = new Schema({
  color: {
    type: String,
    default: '#4285F4'
  },
  icon: {
    type: String,
    default: 'flag'
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  },
  category: {
    type: String,
    enum: ['Health', 'Work', 'Personal', 'Learning', 'Finance', 'Social', 'Other'],
    default: 'Personal'
  },
  tags: [String],
  privacy: {
    type: String,
    enum: ['Private', 'Public', 'Shared'],
    default: 'Private'
  }
}, { _id: false });

/**
 * Sub-Milestone Schema
 * For smaller steps within a milestone
 */
const subMilestoneSchema = new Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  completed: {
    type: Boolean,
    default: false
  },
  completedDate: {
    type: Date
  },
  order: {
    type: Number
  }
}, { _id: true });

/**
 * Milestone Schema
 * Main schema for user milestones
 */
const milestoneSchema = new Schema({
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
  milestoneType: {
    type: String,
    enum: TYPE_ENUMS,
    default: 'achievement'
  },
  parentGoalId: {
    type: Schema.Types.ObjectId,
    ref: 'Goal',
    index: true
  },
  startDate: { 
    type: Date, 
    default: Date.now 
  },
  targetDate: {
    type: Date
  },
  completedDate: {
    type: Date
  },
  progressPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  // For Threshold type milestones
  thresholdValue: {
    type: Number
  },
  currentValue: {
    type: Number,
    default: 0
  },
  unit: {
    type: String
  },
  // For Habit-Based type milestones
  habitStreak: {
    type: Number
  },
  relatedHabits: [{
    type: Schema.Types.ObjectId,
    ref: 'Habit'
  }],
  // For Custom type milestones
  customTypeName: {
    type: String
  },
  subMilestones: [subMilestoneSchema],
  celebrationPlan: {
    type: String
  },
  evidenceUrl: {
    type: String
  },
  metadata: {
    type: metadataSchema,
    default: () => ({})
  }
});

// Apply core plugins
milestoneSchema.plugin(timestampsPlugin);

// Apply status tracking (automatically adds status field with transitions)
milestoneSchema.plugin(milestoneStatusPlugin, {
  field: 'status',
  userField: 'updatedBy',
  trackHistory: true
});

// Apply timeline tracking
milestoneSchema.plugin(timetrackablePlugin, {
  allowedEvents: [
    'created',
    'updated',
    'started',
    'progress_update',
    'blocked',
    'at_risk',
    'completed',
    'abandoned',
    'sub_milestone_added',
    'sub_milestone_completed'
  ]
});

// Apply tagging with weights
milestoneSchema.plugin(taggableFlexWeightedPlugin, {
  field: 'weightedTags',
  allowedTypes: ['category', 'life_area', 'focus', 'feeling'],
  weightRange: { min: 0, max: 10 }
});

// Add pre-save middleware
milestoneSchema.pre('save', function(next) {
  // Auto-calculate progress percentage based on sub-milestones if present
  if (this.subMilestones && this.subMilestones.length > 0) {
    const totalItems = this.subMilestones.length;
    const completedItems = this.subMilestones.filter(sub => sub.completed).length;
    this.progressPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  }
  
  // For threshold type, calculate progress based on current/threshold values
  if (this.milestoneType === 'threshold' && this.thresholdValue) {
    this.progressPercentage = this.thresholdValue > 0 
      ? Math.min(Math.round((this.currentValue / this.thresholdValue) * 100), 100)
      : 0;
  }
  
  // If achieved but completedDate not set, set it
  if (this.status === 'achieved' && !this.completedDate) {
    this.completedDate = new Date();
  }
  
  next();
});

// Static method for calculating completion deadline
milestoneSchema.methods.getDaysRemaining = function() {
  if (!this.targetDate) return null;
  if (this.status === 'achieved') return 0;
  
  const today = new Date();
  const target = new Date(this.targetDate);
  const timeDiff = target.getTime() - today.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
};

// Static method for getting progress by type
milestoneSchema.methods.calculateProgress = function() {
  switch (this.milestoneType) {
    case 'threshold':
      return this.thresholdValue ? (this.currentValue / this.thresholdValue) : 0;
    case 'habit_based':
      // Could connect to habits module to get current streak vs required streak
      return 0;
    default:
      return this.progressPercentage / 100;
  }
};

// Create and export the Mongoose model
export const Milestone = mongoose.model('Milestone', milestoneSchema);

// Export a function that will apply plugins that require context
export const applyContextPlugins = (ctx) => {
  if (ctx && ctx.plugins) {
    // Add any context-dependent plugins here
    if (ctx.plugins.taggableSchema) {
      milestoneSchema.plugin(ctx.plugins.taggableSchema, { path: 'metadata.tags' });
    }
  }
  return { Milestone };
};

export default {
  Milestone,
  applyContextPlugins
}; 