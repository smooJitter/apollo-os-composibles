// modules/affirmation/schemas.js
import mongoose from 'mongoose';
import { timestampsPlugin } from '../../config/shared-mongoose/plugins/timestamps.js';

const { Schema } = mongoose;

/**
 * Affirmation Schema
 * Represents a user's affirmation for daily motivation
 */
const affirmationSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  text: {
    type: String,
    required: true,
    trim: true
  },
  scheduledTime: {
    type: String, // Format: "HH:MM" in 24-hour format
    default: "09:00"
  },
  isActive: {
    type: Boolean,
    default: true
  },
  category: {
    type: String,
    enum: ['health', 'career', 'relationships', 'personal', 'other'],
    default: 'personal'
  },
  reminderFrequency: {
    type: String,
    enum: ['daily', 'weekdays', 'weekends', 'weekly', 'monthly'],
    default: 'daily'
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
});

// Apply plugins
affirmationSchema.plugin(timestampsPlugin);

// Create Model
export const Affirmation = mongoose.model('Affirmation', affirmationSchema);

// Export a function that will apply plugins that require context
export const applyContextPlugins = (ctx) => {
  if (ctx && ctx.plugins && ctx.plugins.taggableSchema) {
    affirmationSchema.plugin(ctx.plugins.taggableSchema, { path: 'tags' });
  }
  return { Affirmation };
};

export default {
  Affirmation,
  applyContextPlugins
}; 