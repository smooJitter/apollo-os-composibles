import mongoose from 'mongoose';
import { timestampsPlugin } from '../../config/shared-mongoose/plugins/timestamps.js';
import { timetrackablePlugin } from '../../config/shared-mongoose/plugins/timetrackable.js';
import { taggableFlexWeightedPlugin } from '../../config/shared-mongoose/plugins/taggableFlexWeighted.js';

const { Schema } = mongoose;

/**
 * Status Schema
 * Tracks the status of a habit
 */
const statusSchema = new Schema({
  active: {
    type: Boolean,
    default: true
  },
  completedToday: {
    type: Boolean,
    default: false
  },
  streak: {
    type: Number,
    default: 0
  },
  completionHistory: [{
    date: { type: Date },
    completed: { type: Boolean },
    notes: { type: String }
  }]
}, { _id: false });

/**
 * Metadata Schema
 * Additional metadata for habits
 */
const metadataSchema = new Schema({
  color: {
    type: String,
    default: '#4285F4'
  },
  icon: {
    type: String,
    default: 'star'
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium'
  },
  category: {
    type: String,
    enum: ['Health', 'Work', 'Personal', 'Learning', 'Finance', 'Social', 'Other'],
    default: 'Personal'
  },
  tags: [String]
}, { _id: false });

/**
 * Habit Schema
 * Main schema for user habits
 */
const habitSchema = new Schema({
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
  startDate: { 
    type: Date, 
    default: Date.now 
  },
  frequency: { 
    type: String, 
    enum: ['Daily', 'Weekly', 'Monthly'],
    default: 'Daily'
  },
  daysOfWeek: {
    type: [Number], // 0 = Sunday, 1 = Monday, etc.
    default: [0, 1, 2, 3, 4, 5, 6] // Default to every day
  },
  reminderTime: { 
    type: Date
  },
  status: {
    type: statusSchema,
    default: () => ({})
  },
  metadata: {
    type: metadataSchema,
    default: () => ({})
  },
  targetValue: {
    type: Number,
    default: 1 // Default target is 1 completion
  },
  currentValue: {
    type: Number,
    default: 0
  },
  unit: {
    type: String,
    default: 'times' // e.g., 'times', 'minutes', 'miles', etc.
  }
});

// Apply plugins
habitSchema.plugin(timestampsPlugin);
habitSchema.plugin(timetrackablePlugin, {
  allowedEvents: ['created', 'updated', 'deleted', 'completed', 'missed', 'paused', 'resumed', 'streak_broken', 'streak_milestone']
});

// Apply taggable plugin with advanced weighting for smart habit categorization
habitSchema.plugin(taggableFlexWeightedPlugin, {
  field: 'weightedTags',
  allowedTypes: ['category', 'difficulty', 'motivation', 'goal', 'timeframe'],
  weightRange: { min: 0, max: 10 } // Use 0-10 scale for more intuitive weighting
});

// Create Model
export const Habit = mongoose.model('Habit', habitSchema);

// Export a function that will apply plugins that require context
export const applyContextPlugins = (ctx) => {
  if (ctx && ctx.plugins) {
    // Add any context-dependent plugins here
    if (ctx.plugins.taggableSchema) {
      habitSchema.plugin(ctx.plugins.taggableSchema, { path: 'metadata.tags' });
    }
  }
  return { Habit };
};

export default {
  Habit,
  applyContextPlugins
}; 